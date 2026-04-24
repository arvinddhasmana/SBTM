#!/usr/bin/env bash
# scripts/azure/db-migrate-via-aks.sh
# CHEAPEST way to run database migrations against the private-endpoint
# Postgres flexible server: launch a one-shot postgres-client pod inside the
# existing AKS cluster (already in the VNET). Cost: $0 — uses spare capacity
# on the AKS node you already pay for.
#
# Usage:
#   bash scripts/azure/db-migrate-via-aks.sh [demo|production] [migrate|seed-demo|backup|psql]
#
# Examples:
#   bash scripts/azure/db-migrate-via-aks.sh demo migrate
#   bash scripts/azure/db-migrate-via-aks.sh demo seed-demo
#   bash scripts/azure/db-migrate-via-aks.sh demo psql        # interactive shell
#
# Requirements:
#   - kubectl context already pointing at the target AKS cluster
#     (provision-azure.sh / bootstrap.sh sets this via `az aks get-credentials`)
#   - .env.<env> exists and contains DATABASE_URL
#
# How it works:
#   1. Loads DATABASE_URL from .env.<env>
#   2. Creates a temporary Job running `postgres:16-alpine`
#   3. Mounts the SQL files via a ConfigMap
#   4. Streams logs, then deletes the Job + ConfigMap

set -euo pipefail

ENVIRONMENT="${1:-demo}"
COMMAND="${2:-migrate}"
ENV_FILE=".env.${ENVIRONMENT}"
NAMESPACE="sbtm-${ENVIRONMENT}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

[[ -f "${ENV_FILE}" ]] || { echo "ERROR: ${ENV_FILE} not found"; exit 1; }
command -v kubectl >/dev/null || { echo "ERROR: kubectl not installed"; exit 1; }

# Load DATABASE_URL
set -a; source <(grep -v '^\s*#' "${ENV_FILE}" | grep -v '^\s*$'); set +a
[[ -n "${DATABASE_URL:-}" ]] || { echo "ERROR: DATABASE_URL not set in ${ENV_FILE}"; exit 1; }

# Verify cluster reachable
kubectl get ns "${NAMESPACE}" >/dev/null 2>&1 || \
  kubectl create namespace "${NAMESPACE}" >/dev/null

JOB_NAME="db-migrate-$(date +%s)"
CM_NAME="${JOB_NAME}-sql"

cleanup() {
  echo "==> Cleaning up ${JOB_NAME} / ${CM_NAME}"
  kubectl -n "${NAMESPACE}" delete job "${JOB_NAME}" --ignore-not-found --wait=false >/dev/null 2>&1 || true
  kubectl -n "${NAMESPACE}" delete configmap "${CM_NAME}" --ignore-not-found >/dev/null 2>&1 || true
  kubectl -n "${NAMESPACE}" delete secret "${JOB_NAME}-env" --ignore-not-found >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Creating ConfigMap with SQL scripts"
kubectl -n "${NAMESPACE}" create configmap "${CM_NAME}" \
  --from-file=init-db.sql=scripts/init-db.sql \
  --from-file=rls-policies.sql=scripts/rls-policies.sql \
  --from-file=seed-standard.sql=scripts/seed-standard.sql \
  --from-file=seed-demo.sql=scripts/seed-demo.sql \
  >/dev/null

case "${COMMAND}" in
  migrate)
    SCRIPT='psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/init-db.sql && \
            psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/rls-policies.sql && \
            psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/seed-standard.sql && \
            psql "$DATABASE_URL" -c "\dt"'
    ;;
  seed-demo)
    SCRIPT='psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /sql/seed-demo.sql'
    ;;
  backup)
    SCRIPT='pg_dump "$DATABASE_URL" --clean --if-exists | gzip -c > /tmp/backup.sql.gz && \
            ls -lh /tmp/backup.sql.gz && echo "Backup created inside pod at /tmp/backup.sql.gz"'
    echo "  ⚠  Backup is written inside the pod and lost on cleanup."
    echo "     For a persisted backup, use db-jumpbox.sh and copy via SCP."
    ;;
  psql)
    echo "==> Launching interactive psql pod (Ctrl+D to exit)"
    kubectl -n "${NAMESPACE}" run "psql-${RANDOM}" \
      --rm -it --restart=Never --image=postgres:16-alpine \
      --env="DATABASE_URL=${DATABASE_URL}" \
      --command -- psql "${DATABASE_URL}"
    exit 0
    ;;
  *)
    echo "ERROR: unknown command '${COMMAND}' (expected migrate|seed-demo|backup|psql)"
    exit 1
    ;;
esac

echo "==> Creating Secret with DATABASE_URL"
kubectl -n "${NAMESPACE}" create secret generic "${JOB_NAME}-env" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=RUN_SCRIPT="${SCRIPT}" >/dev/null

echo "==> Submitting Job ${JOB_NAME}"
cat <<YAML | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB_NAME}
  namespace: ${NAMESPACE}
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 60
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: psql
          image: postgres:16-alpine
          envFrom:
            - secretRef:
                name: ${JOB_NAME}-env
          command: ["sh", "-c"]
          args:
            - |
              set -e
              eval "\$RUN_SCRIPT"
          volumeMounts:
            - name: sql
              mountPath: /sql
      volumes:
        - name: sql
          configMap:
            name: ${CM_NAME}
YAML

echo "==> Waiting for pod to start"
# Wait for pod to exist and be scheduled (batch pods don't get 'Ready' condition)
for i in $(seq 1 60); do
  POD_NAME=$(kubectl -n "${NAMESPACE}" get pods -l job-name="${JOB_NAME}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  [[ -n "${POD_NAME}" ]] && break
  sleep 2
done
if [[ -z "${POD_NAME:-}" ]]; then
  echo "==> ✗ Pod never appeared for job ${JOB_NAME}"
  exit 1
fi
echo "    Pod: ${POD_NAME}"

# Wait for pod to reach Running or Completed/Failed
kubectl -n "${NAMESPACE}" wait --for=condition=PodReadyToStartContainers pod/"${POD_NAME}" --timeout=120s 2>/dev/null || \
  kubectl -n "${NAMESPACE}" wait --for=condition=Initialized pod/"${POD_NAME}" --timeout=120s 2>/dev/null || true

echo "==> Streaming logs"
kubectl -n "${NAMESPACE}" logs -f "${POD_NAME}" || true

echo "==> Waiting for completion"
# Job may have already finished by the time we get here; tolerate NotFound (TTL cleanup)
if kubectl -n "${NAMESPACE}" wait --for=condition=complete --timeout=300s job/"${JOB_NAME}" 2>/dev/null; then
  echo "==> ✓ ${COMMAND} succeeded"
elif kubectl -n "${NAMESPACE}" get job "${JOB_NAME}" 2>/dev/null | grep -q "1/1"; then
  echo "==> ✓ ${COMMAND} succeeded (job already complete)"
else
  # Check pod exit code as final arbiter
  EXIT_CODE=$(kubectl -n "${NAMESPACE}" get pod "${POD_NAME}" -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}' 2>/dev/null || echo "1")
  if [[ "${EXIT_CODE}" == "0" ]]; then
    echo "==> ✓ ${COMMAND} succeeded (pod exit 0)"
  else
    echo "==> ✗ ${COMMAND} FAILED (pod exit ${EXIT_CODE}) — check logs above"
    exit 1
  fi
fi
