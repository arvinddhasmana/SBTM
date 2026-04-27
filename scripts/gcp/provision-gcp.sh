#!/usr/bin/env bash
# scripts/gcp/provision-gcp.sh
# Provision GCP infrastructure using Terraform

set -euo pipefail

ENVIRONMENT="${1:-demo}"
ACTION="${2:-plan}"

if [[ "${ENVIRONMENT}" != "demo" ]] && [[ "${ENVIRONMENT}" != "production" ]]; then
  echo "Usage: $0 [demo|production] [plan|apply|destroy]"
  exit 1
fi

if [[ "${ACTION}" != "plan" ]] && [[ "${ACTION}" != "apply" ]] && [[ "${ACTION}" != "destroy" ]]; then
  echo "Usage: $0 [demo|production] [plan|apply|destroy]"
  exit 1
fi

# Check required environment variables
if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  echo "ERROR: GCP_PROJECT_ID environment variable is not set"
  exit 1
fi

# Production confirmation
if [[ "${ENVIRONMENT}" == "production" ]] && [[ "${ACTION}" == "apply" || "${ACTION}" == "destroy" ]]; then
  echo ""
  echo "  ⚠️  You are about to ${ACTION} PRODUCTION infrastructure on GCP."
  echo "  Project: ${GCP_PROJECT_ID}"
  echo "  Environment: ${ENVIRONMENT}"
  echo ""
  read -r -p "  Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

cd "$(dirname "$0")/../../infra/gcp"

echo "==> [1/4] Setting up Terraform backend"
if [[ ! -f backend.tf ]]; then
  cat > backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "${GCP_PROJECT_ID}-tfstate"
    prefix = "sbtm/${ENVIRONMENT}"
  }
}
EOF
  echo "    Created backend.tf"
else
  echo "    backend.tf already exists"
fi

echo "==> [2/4] Initializing Terraform"
terraform init

echo "==> [3/4] Running terraform ${ACTION}"
case "${ACTION}" in
  plan)
    terraform plan \
      -var-file="environments/${ENVIRONMENT}.tfvars" \
      -var="project_id=${GCP_PROJECT_ID}"
    ;;
  apply)
    terraform apply \
      -var-file="environments/${ENVIRONMENT}.tfvars" \
      -var="project_id=${GCP_PROJECT_ID}" \
      -auto-approve
    ;;
  destroy)
    terraform destroy \
      -var-file="environments/${ENVIRONMENT}.tfvars" \
      -var="project_id=${GCP_PROJECT_ID}" \
      -auto-approve
    ;;
esac

if [[ "${ACTION}" == "apply" ]]; then
  echo "==> [4/4] Getting outputs"
  terraform output

  echo ""
  echo "==> Infrastructure provisioning complete!"
  echo ""
  echo "Next steps:"
  echo "1. Get GKE credentials:"
  CLUSTER_NAME=$(terraform output -raw gke_cluster_name)
  REGION=$(terraform output -raw gke_cluster_location)
  echo "   gcloud container clusters get-credentials ${CLUSTER_NAME} --region ${REGION} --project ${GCP_PROJECT_ID}"
  echo ""
  echo "2. Deploy SBTM services:"
  echo "   bash scripts/gcp/deploy-services.sh ${ENVIRONMENT}"
fi
