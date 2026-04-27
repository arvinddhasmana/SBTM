# Quick Start: Deploying SBTM to GCP

This is a quick reference guide. For complete documentation, see [docs/deployment/gcp-deployment.md](docs/deployment/gcp-deployment.md).

## Prerequisites

- GCP account with billing enabled
- gcloud CLI installed
- Terraform 1.6.0+ installed
- kubectl installed

## Step 1: Initial Setup (5 minutes)

```bash
# Clone repository
git clone https://github.com/arvinddhasmana/SBTM.git
cd SBTM

# Run GCP setup
bash scripts/gcp/setup-gcp-project.sh sbtm-demo-<unique-id>

# Set environment variables
export GCP_PROJECT_ID="sbtm-demo-<unique-id>"
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/terraform-sa-key.json"
```

## Step 2: Update Configuration (2 minutes)

Edit `infra/gcp/environments/demo.tfvars`:
```hcl
project_id = "sbtm-demo-<your-unique-id>"  # Change this
region     = "us-central1"
```

## Step 3: Provision Infrastructure (15-20 minutes)

```bash
# Plan (optional - review changes)
bash scripts/gcp/provision-gcp.sh demo plan

# Apply (creates all GCP resources)
bash scripts/gcp/provision-gcp.sh demo apply
```

This creates:
- GKE Autopilot cluster
- Cloud SQL PostgreSQL database
- Memorystore Redis instance
- Cloud Storage bucket
- Artifact Registry
- Secret Manager secrets
- VPC networking

## Step 4: Build and Push Images (10 minutes)

```bash
# Get registry URL from Terraform output
REGISTRY=$(cd infra/gcp && terraform output -raw artifact_registry_url)

# Authenticate Docker
gcloud auth configure-docker ${REGISTRY%%/*}

# Build and push all images
for svc in api-gateway gps-tracking emergency-alerts student-presence \
           student-management compliance-management video-service notification-service; do
  docker build -t ${REGISTRY}/${svc}:latest services/${svc}
  docker push ${REGISTRY}/${svc}:latest
done
```

## Step 5: Deploy Services (5 minutes)

```bash
# Get GKE credentials
CLUSTER=$(cd infra/gcp && terraform output -raw gke_cluster_name)
REGION=$(cd infra/gcp && terraform output -raw gke_cluster_location)
gcloud container clusters get-credentials $CLUSTER --region $REGION

# Update overlay with your project ID
cd infra/k8s/overlays/gcp-demo
sed -i "s/PROJECT_ID/${GCP_PROJECT_ID}/g" *.yaml
sed -i "s/us-central1/${REGION}/g" *.yaml
cd -

# Deploy
bash scripts/gcp/deploy-services.sh demo
```

## Step 6: Get Ingress IP and Configure DNS

```bash
# Get ingress IP
kubectl get ingress -n sbtm-demo-gcp

# Output will show something like:
# NAME            ADDRESS        HOSTS
# sbtm-ingress    35.1.2.3       api.demo-gcp.sbtm.example.com
```

Create DNS A record:
```
api.demo-gcp.sbtm.example.com  →  35.1.2.3
```

## Step 7: Verify Deployment

```bash
# Check pods
kubectl get pods -n sbtm-demo-gcp

# Test health endpoint
curl https://api.demo-gcp.sbtm.example.com/health
```

## Estimated Time: ~40 minutes

- Setup: 5 min
- Configuration: 2 min
- Infrastructure: 15-20 min
- Images: 10 min
- Deployment: 5 min
- DNS propagation: 5-10 min

## Costs

Demo environment: ~$200/month
- GKE Autopilot: $100
- Cloud SQL: $40
- Memorystore: $15
- Other: $45

## Cleanup

To delete everything:
```bash
bash scripts/gcp/provision-gcp.sh demo destroy
```

## Troubleshooting

See [docs/deployment/gcp-deployment.md#troubleshooting](docs/deployment/gcp-deployment.md#troubleshooting)

## Support

- Full documentation: [docs/deployment/gcp-deployment.md](docs/deployment/gcp-deployment.md)
- Infrastructure README: [infra/gcp/README.md](infra/gcp/README.md)
- Create issue: https://github.com/arvinddhasmana/SBTM/issues
