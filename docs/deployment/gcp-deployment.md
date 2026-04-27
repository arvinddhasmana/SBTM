# SBTM Deployment on Google Cloud Platform (GCP)

This guide provides instructions for deploying the School Bus Transport Management System (SBTM) on Google Cloud Platform, leveraging GCP's native features and best practices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [GCP Resources](#gcp-resources)
- [Initial Setup](#initial-setup)
- [Infrastructure Provisioning](#infrastructure-provisioning)
- [Application Deployment](#application-deployment)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)
- [Monitoring and Operations](#monitoring-and-operations)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

The GCP deployment uses:
- **GKE Autopilot**: Fully managed Kubernetes with auto-scaling and auto-upgrades
- **Cloud SQL**: Managed PostgreSQL database with automatic backups
- **Memorystore**: Managed Redis cache
- **Cloud Storage**: Object storage for video files
- **Artifact Registry**: Container image registry
- **Secret Manager**: Centralized secrets management
- **Cloud Operations**: Monitoring, logging, and alerting

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GCP Project                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ GKE Autopilot Cluster                              │   │
│  │  - 8 Microservices                                 │   │
│  │  - NGINX Ingress                                   │   │
│  │  - External Secrets Operator                       │   │
│  │  - cert-manager                                    │   │
│  └────────────────────────────────────────────────────┘   │
│                     ↓  ↓  ↓                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Cloud SQL    │ │ Memorystore  │ │ Cloud Storage│      │
│  │ (PostgreSQL) │ │ (Redis)      │ │ (Videos)     │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Secret Mgr   │ │ Artifact Reg │ │ Cloud DNS    │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Local Tools

1. **Google Cloud SDK (gcloud)**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **kubectl**
   ```bash
   gcloud components install kubectl
   ```

3. **Terraform** (v1.6.0+)
   ```bash
   # macOS
   brew install terraform

   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

4. **kustomize**
   ```bash
   # Install via kubectl
   kubectl kustomize version

   # Or standalone
   brew install kustomize  # macOS
   ```

### GCP Account Setup

1. **Create a GCP Account**: Visit [cloud.google.com](https://cloud.google.com)

2. **Create a Project**:
   ```bash
   gcloud projects create sbtm-demo-<unique-id> --name="SBTM Demo"
   gcloud projects create sbtm-production-<unique-id> --name="SBTM Production"
   ```

3. **Enable Billing**: Link a billing account to your projects via the [GCP Console](https://console.cloud.google.com/billing)

## GCP Resources

### Compute Resources

| Resource | Demo | Production | Purpose |
|----------|------|------------|---------|
| GKE Cluster | Autopilot | Autopilot | Kubernetes cluster |
| Cloud SQL | 1 vCPU, 3.75GB | 2 vCPU, 8GB | PostgreSQL database |
| Memorystore | 1GB BASIC | 5GB STANDARD_HA | Redis cache |
| Cloud Storage | STANDARD | STANDARD | Object storage |

### Estimated Monthly Cost

- **Demo**: ~$200-250/month
- **Production**: ~$400-500/month

Use [GCP Pricing Calculator](https://cloud.google.com/products/calculator) for detailed estimates.

## Initial Setup

### 1. Run Setup Script

```bash
# Clone the repository
git clone https://github.com/arvinddhasmana/SBTM.git
cd SBTM

# Run GCP setup script
bash scripts/gcp/setup-gcp-project.sh sbtm-demo-<your-unique-id>
```

This script will:
- Enable required GCP APIs
- Create Terraform state bucket
- Create service account for Terraform
- Generate service account key

### 2. Configure Environment Variables

```bash
# Set your GCP project ID
export GCP_PROJECT_ID="sbtm-demo-<your-unique-id>"

# Set Google Application Credentials
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/terraform-sa-key.json"
```

### 3. Update Configuration Files

Edit `infra/gcp/environments/demo.tfvars`:
```hcl
project_id  = "sbtm-demo-<your-unique-id>"  # Update this
region      = "us-central1"  # Or your preferred region
environment = "demo"
```

## Infrastructure Provisioning

### Using Scripts (Recommended)

```bash
# Plan infrastructure changes
bash scripts/gcp/provision-gcp.sh demo plan

# Apply infrastructure (creates all resources)
bash scripts/gcp/provision-gcp.sh demo apply

# Destroy infrastructure (cleanup)
# bash scripts/gcp/provision-gcp.sh demo destroy
```

### Using Terraform Directly

```bash
cd infra/gcp

# Initialize Terraform
terraform init

# Plan
terraform plan \
  -var-file="environments/demo.tfvars" \
  -var="project_id=${GCP_PROJECT_ID}"

# Apply
terraform apply \
  -var-file="environments/demo.tfvars" \
  -var="project_id=${GCP_PROJECT_ID}"
```

### What Gets Provisioned

1. **VPC Network** with subnets and Cloud NAT
2. **GKE Autopilot Cluster** with Workload Identity
3. **Cloud SQL PostgreSQL** instance with private IP
4. **Memorystore Redis** instance
5. **Cloud Storage** bucket for videos
6. **Artifact Registry** for Docker images
7. **Secret Manager** secrets with database credentials
8. **IAM permissions** for service accounts

Provisioning takes ~15-20 minutes.

## Application Deployment

### 1. Get GKE Credentials

```bash
# Get cluster name from Terraform output
CLUSTER_NAME=$(cd infra/gcp && terraform output -raw gke_cluster_name)
REGION=$(cd infra/gcp && terraform output -raw gke_cluster_location)

# Configure kubectl
gcloud container clusters get-credentials $CLUSTER_NAME \
  --region $REGION \
  --project $GCP_PROJECT_ID
```

### 2. Build and Push Docker Images

```bash
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Build and push images (example for api-gateway)
docker build -t ${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/sbtm-demo-docker/api-gateway:latest \
  ./services/api-gateway
docker push ${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/sbtm-demo-docker/api-gateway:latest

# Repeat for all 8 services or use CI/CD
```

### 3. Update Kustomize Overlay

Edit `infra/k8s/overlays/gcp-demo/kustomization.yaml`:
- Replace `PROJECT_ID` with your GCP project ID
- Replace `us-central1` with your region if different

### 4. Deploy Services

```bash
# Using deployment script
bash scripts/gcp/deploy-services.sh demo

# Or manually with kubectl
kubectl apply -k infra/k8s/overlays/gcp-demo
kubectl get pods -n sbtm-demo-gcp
```

### 5. Get Ingress IP

```bash
kubectl get ingress -n sbtm-demo-gcp

# Example output:
# NAME            CLASS   HOSTS                            ADDRESS        PORTS
# sbtm-ingress    nginx   api.demo-gcp.sbtm.example.com   35.1.2.3       80, 443
```

### 6. Configure DNS

Point your domain to the Ingress IP:
```
api.demo-gcp.sbtm.example.com  →  35.1.2.3
```

## CI/CD with GitHub Actions

### Setup GitHub Secrets

Configure the following secrets in your GitHub repository:

```
GCP_PROJECT_ID: your-gcp-project-id
GCP_REGION: us-central1
GCP_WORKLOAD_IDENTITY_PROVIDER: projects/123456/locations/global/workloadIdentityPools/...
GCP_SERVICE_ACCOUNT: github-actions@project-id.iam.gserviceaccount.com
GCP_TFSTATE_BUCKET: project-id-tfstate
GKE_DEMO_CLUSTER_NAME: sbtm-demo-gke
GKE_PROD_CLUSTER_NAME: sbtm-production-gke
CLOUDSQL_INSTANCE_NAME: sbtm-demo-pg-xxxxx
```

### Workload Identity Setup

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github \
  --location=global \
  --display-name="GitHub Actions"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global \
  --workload-identity-pool=github \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

# Bind service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@${GCP_PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/arvinddhasmana/SBTM"
```

### Workflows

- **`gcp-provision-infra.yml`**: Provision infrastructure with Terraform
- **`gcp-build-images.yml`**: Build and push Docker images to Artifact Registry
- **`gcp-deploy-demo.yml`**: Deploy to GKE demo environment
- **`gcp-deploy-production.yml`**: Deploy to GKE production environment

## Monitoring and Operations

### Cloud Operations

Access logs and metrics:
```bash
# View logs
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=sbtm-demo-gcp" --limit 50

# View GKE cluster
gcloud container clusters list

# View Cloud SQL instance
gcloud sql instances list
```

### Kubernetes Operations

```bash
# View pods
kubectl get pods -n sbtm-demo-gcp

# View logs
kubectl logs -n sbtm-demo-gcp deployment/api-gateway

# Exec into pod
kubectl exec -it -n sbtm-demo-gcp deployment/api-gateway -- /bin/sh

# Port forward for local testing
kubectl port-forward -n sbtm-demo-gcp svc/api-gateway 3000:3000
```

### Database Access

```bash
# Cloud SQL Proxy
cloud_sql_proxy -instances=${GCP_PROJECT_ID}:${REGION}:sbtm-demo-pg-xxxxx=tcp:5432

# Connect with psql
psql "host=127.0.0.1 port=5432 user=sbtm dbname=sbtm"
```

## Cost Optimization

1. **Use GKE Autopilot**: Automatic right-sizing and bin packing
2. **Committed Use Discounts**: Save up to 57% with 1-3 year commitments
3. **Preemptible VMs**: Use for non-critical workloads (up to 80% savings)
4. **Cloud Storage Lifecycle**: Move old videos to Nearline/Coldline storage
5. **Set Budgets**: Configure budget alerts in GCP Console

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod -n sbtm-demo-gcp <pod-name>
kubectl logs -n sbtm-demo-gcp <pod-name>
```

### Database connection errors

Check Secret Manager secrets:
```bash
gcloud secrets list
gcloud secrets versions access latest --secret=sbtm-demo-database-url
```

### Ingress not getting IP

```bash
kubectl describe ingress -n sbtm-demo-gcp sbtm-ingress
kubectl get events -n sbtm-demo-gcp
```

### External Secrets not syncing

```bash
kubectl logs -n external-secrets deployment/external-secrets
kubectl get externalsecret -n sbtm-demo-gcp
```

## Differences from Azure Deployment

| Feature | Azure | GCP |
|---------|-------|-----|
| IaC Tool | Bicep | Terraform |
| Kubernetes | AKS | GKE Autopilot |
| Container Registry | ACR | Artifact Registry |
| Secrets | Key Vault CSI | External Secrets + Secret Manager |
| Database | PostgreSQL Flexible Server | Cloud SQL |
| Cache | Azure Cache for Redis | Memorystore |
| Storage | Blob Storage | Cloud Storage |
| Monitoring | Azure Monitor | Cloud Operations |

## Next Steps

- [ ] Configure custom domain and SSL certificates
- [ ] Set up Cloud Armor for DDoS protection
- [ ] Configure Cloud CDN for static assets
- [ ] Enable GKE Binary Authorization
- [ ] Set up Cloud Build for automated builds
- [ ] Configure alerting policies
- [ ] Implement backup and disaster recovery procedures

## Support

For issues or questions:
- Create an issue in the GitHub repository
- Consult [GCP Documentation](https://cloud.google.com/docs)
- Check [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
