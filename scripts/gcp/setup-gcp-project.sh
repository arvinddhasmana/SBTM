#!/usr/bin/env bash
# scripts/gcp/setup-gcp-project.sh
# Initial setup for GCP project

set -euo pipefail

PROJECT_ID="${1:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Usage: $0 <project-id>"
  echo ""
  echo "Example: $0 sbtm-production-12345"
  exit 1
fi

echo "==> Setting up GCP project: ${PROJECT_ID}"
echo ""

# Set default project
gcloud config set project "${PROJECT_ID}"

echo "==> [1/5] Enabling required APIs"
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  dns.googleapis.com \
  cloudresourcemanager.googleapis.com \
  servicenetworking.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudkms.googleapis.com

echo "==> [2/5] Creating Terraform state bucket"
STATE_BUCKET="${PROJECT_ID}-tfstate"
if gsutil ls "gs://${STATE_BUCKET}" 2>/dev/null; then
  echo "    State bucket already exists: ${STATE_BUCKET}"
else
  gsutil mb -p "${PROJECT_ID}" -l us-central1 "gs://${STATE_BUCKET}"
  gsutil versioning set on "gs://${STATE_BUCKET}"
  echo "    Created state bucket: ${STATE_BUCKET}"
fi

echo "==> [3/5] Creating Terraform service account"
SA_NAME="terraform-sbtm"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "${SA_EMAIL}" >/dev/null 2>&1; then
  echo "    Service account already exists: ${SA_EMAIL}"
else
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Terraform Service Account for SBTM"
  echo "    Created service account: ${SA_EMAIL}"
fi

echo "==> [4/5] Granting IAM roles to Terraform service account"
for role in \
  roles/editor \
  roles/iam.serviceAccountAdmin \
  roles/resourcemanager.projectIamAdmin; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}" \
    --quiet
done

echo "==> [5/5] Creating service account key"
KEY_FILE="terraform-sa-key.json"
if [[ -f "${KEY_FILE}" ]]; then
  echo "    Key file already exists: ${KEY_FILE}"
  read -r -p "    Regenerate? (yes/no): " REGEN
  if [[ "${REGEN}" == "yes" ]]; then
    rm "${KEY_FILE}"
    gcloud iam service-accounts keys create "${KEY_FILE}" \
      --iam-account="${SA_EMAIL}"
    echo "    Regenerated key: ${KEY_FILE}"
  fi
else
  gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SA_EMAIL}"
  echo "    Created key: ${KEY_FILE}"
fi

echo ""
echo "==> GCP project setup complete!"
echo ""
echo "Next steps:"
echo "1. Update infra/gcp/environments/*.tfvars with your project ID: ${PROJECT_ID}"
echo "2. Export credentials:"
echo "   export GOOGLE_APPLICATION_CREDENTIALS=\$(pwd)/${KEY_FILE}"
echo "3. Provision infrastructure:"
echo "   export GCP_PROJECT_ID=${PROJECT_ID}"
echo "   bash scripts/gcp/provision-gcp.sh demo plan"
echo ""
echo "⚠️  Store the key file securely and never commit it to git!"
