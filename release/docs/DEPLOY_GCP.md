# Complete GCP Deployment Guide

This guide provides detailed step-by-step instructions for deploying SBTM to Google Cloud Platform using Google Kubernetes Engine (GKE) Autopilot.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Manual Deployment Steps](#manual-deployment-steps)
4. [Automated Deployment](#automated-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring and Management](#monitoring-and-management)
7. [Troubleshooting](#troubleshooting)
8. [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Required Tools

```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize gcloud
gcloud init

# Install kubectl
gcloud components install kubectl

# Install gke-gcloud-auth-plugin
gcloud components install gke-gcloud-auth-plugin
```

### GCP Account Requirements

- **Active GCP Project**: With billing enabled
- **Required Permissions**: Editor or Owner role
- **APIs to Enable**:
  - Kubernetes Engine API
  - Cloud SQL Admin API
  - Cloud Memorystore (Redis) API
  - Cloud Storage API
  - Cloud Logging API

### Verify Prerequisites

```bash
# Login to GCP
gcloud auth login

# Set project
gcloud config set project sbtm-494923

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable logging.googleapis.com

# Check available regions
gcloud compute regions list
```

---

## Architecture Overview

### GCP Resources Created

```
SBTM GCP Deployment
├── GKE Autopilot Cluster (sbtm-gke-cluster)
│   ├── Auto-managed nodes
│   ├── System Services
│   └── SBTM Services (namespace: sbtm)
├── Cloud SQL for PostgreSQL
│   ├── Database: sbtm_db
│   ├── Private IP enabled
│   └── Automatic backups
├── Memorystore for Redis (Standard Tier)
│   ├── High availability enabled
│   └── Redis 7.0
├── Cloud Storage Bucket
│   ├── Videos (coldline storage)
│   └── Documents (standard storage)
├── Cloud Load Balancer (auto-created by GKE)
└── VPC Network
    ├── Default subnet
    └── Private service connection
```

### Estimated Costs

| Environment | Monthly Cost (USD) |
|-------------|-------------------|
| Development | $100 - $200 |
| Staging | $250 - $400 |
| Production | $400 - $800 |

*GKE Autopilot typically costs 20-30% less than Azure AKS for similar workloads*

---

## Manual Deployment Steps

### Step 1: Set Environment Variables

```bash
# Define variables
PROJECT_ID="sbtm-494923"
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="sbtm-gke-cluster"

# Set project and region
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE
```

### Step 2: Create GKE Autopilot Cluster

```bash
# Create GKE Autopilot cluster
gcloud container clusters create-auto $CLUSTER_NAME \
  --region=$REGION \
  --enable-autoscaling \
  --enable-stackdriver-kubernetes \
  --release-channel=regular

# Get credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Verify connection
kubectl get nodes
```

**Why Autopilot?**
- Fully managed nodes (no manual patching/upgrades)
- Pay only for pods, not idle nodes
- Auto-scaling built-in
- Best security practices by default

### Step 3: Create Cloud SQL Instance

```bash
INSTANCE_NAME="sbtm-db-instance"
DB_NAME="sbtm_db"
DB_USER="sbtmadmin"
DB_PASSWORD="$(openssl rand -base64 32)"

# Store password securely
echo "Database password: $DB_PASSWORD" > ~/sbtm-db-password.txt
chmod 600 ~/sbtm-db-password.txt

# Create Cloud SQL instance
gcloud sql instances create $INSTANCE_NAME \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4

# Create database
gcloud sql databases create $DB_NAME --instance=$INSTANCE_NAME

# Set root password
gcloud sql users set-password postgres \
  --instance=$INSTANCE_NAME \
  --password="$DB_PASSWORD"

# Create application user
gcloud sql users create $DB_USER \
  --instance=$INSTANCE_NAME \
  --password="$DB_PASSWORD"

# Enable private IP (recommended for production)
gcloud sql instances patch $INSTANCE_NAME \
  --network=default \
  --no-assign-ip

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)')

echo "Cloud SQL Connection Name: $CONNECTION_NAME"
```

### Step 4: Create Memorystore Redis Instance

```bash
REDIS_INSTANCE="sbtm-redis"

# Create Redis instance
gcloud redis instances create $REDIS_INSTANCE \
  --size=1 \
  --region=$REGION \
  --redis-version=redis_7_0 \
  --tier=standard \
  --enable-auth

# Get Redis connection details
REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE \
  --region=$REGION \
  --format='value(host)')

REDIS_PORT=$(gcloud redis instances describe $REDIS_INSTANCE \
  --region=$REGION \
  --format='value(port)')

REDIS_AUTH=$(gcloud redis instances get-auth-string $REDIS_INSTANCE \
  --region=$REGION)

echo "Redis Host: $REDIS_HOST"
echo "Redis Port: $REDIS_PORT"
```

### Step 5: Create Cloud Storage Buckets

```bash
BUCKET_NAME="sbtm-storage-${PROJECT_ID}"

# Create bucket for videos (coldline for cost savings)
gsutil mb -c COLDLINE -l $REGION gs://${BUCKET_NAME}-videos/

# Create bucket for documents (standard storage)
gsutil mb -c STANDARD -l $REGION gs://${BUCKET_NAME}-docs/

# Set lifecycle rules (auto-delete old files)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://${BUCKET_NAME}-videos/

echo "Storage buckets created: ${BUCKET_NAME}-videos, ${BUCKET_NAME}-docs"
```

### Step 6: Install Cloud SQL Proxy in Kubernetes

```bash
# Create namespace
kubectl create namespace sbtm

# Install Cloud SQL Proxy using Workload Identity
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cloudsql-proxy
  namespace: sbtm
  annotations:
    iam.gke.io/gcp-service-account: cloudsql-proxy@${PROJECT_ID}.iam.gserviceaccount.com
EOF

# Create GCP service account
gcloud iam service-accounts create cloudsql-proxy \
  --display-name="Cloud SQL Proxy"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloudsql-proxy@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Bind Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  cloudsql-proxy@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[sbtm/cloudsql-proxy]"
```

### Step 7: Create Kubernetes Secrets

```bash
# Create database secret
kubectl create secret generic db-credentials \
  --namespace=sbtm \
  --from-literal=connection_name=$CONNECTION_NAME \
  --from-literal=username=$DB_USER \
  --from-literal=password=$DB_PASSWORD \
  --from-literal=database=$DB_NAME

# Create Redis secret
kubectl create secret generic redis-credentials \
  --namespace=sbtm \
  --from-literal=host=$REDIS_HOST \
  --from-literal=port=$REDIS_PORT \
  --from-literal=auth=$REDIS_AUTH

# Create storage secret (use service account key)
gcloud iam service-accounts create sbtm-storage \
  --display-name="SBTM Storage Access"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:sbtm-storage@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud iam service-accounts keys create ~/sbtm-storage-key.json \
  --iam-account=sbtm-storage@${PROJECT_ID}.iam.gserviceaccount.com

kubectl create secret generic storage-credentials \
  --namespace=sbtm \
  --from-file=key.json=~/sbtm-storage-key.json

# Clean up local key file
rm ~/sbtm-storage-key.json
```

### Step 8: Deploy SBTM Services

```bash
# Clone deployment manifests
cd /home/runner/work/SBTM/SBTM/release

# Update manifests for GCP (add Cloud SQL Proxy sidecar)
# Deploy all services
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  --all \
  --namespace=sbtm \
  --timeout=600s
```

### Step 9: Configure Load Balancer and Ingress

```bash
# Install ingress-nginx for GKE
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Wait for load balancer IP
kubectl get service ingress-nginx-controller \
  --namespace ingress-nginx \
  --watch

# Get external IP
EXTERNAL_IP=$(kubectl get service ingress-nginx-controller \
  --namespace ingress-nginx \
  --output jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "SBTM is accessible at: http://$EXTERNAL_IP"
```

---

## Automated Deployment

Use our automated script for faster deployment:

```bash
cd /home/runner/work/SBTM/SBTM/release/deploy/gcp
./quick-deploy.sh
```

The script will:
1. Verify all prerequisites
2. Enable required APIs
3. Create all GCP resources
4. Deploy SBTM services
5. Configure networking and ingress
6. Output access URLs and credentials

**Deployment time**: ~20-25 minutes

---

## Post-Deployment Configuration

### Configure Cloud DNS (Optional)

```bash
# Create DNS zone
gcloud dns managed-zones create sbtm-zone \
  --description="SBTM DNS Zone" \
  --dns-name=sbtm.yourdomain.com

# Add A record
gcloud dns record-sets create sbtm.yourdomain.com. \
  --zone=sbtm-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=$EXTERNAL_IP
```

### Enable HTTPS with Google-Managed Certificates

```bash
# Create managed certificate
gcloud compute ssl-certificates create sbtm-cert \
  --domains=sbtm.yourdomain.com

# Update ingress to use certificate
kubectl annotate ingress sbtm-ingress \
  --namespace=sbtm \
  networking.gke.io/managed-certificates=sbtm-cert
```

### Seed Demo Data

```bash
cd /home/runner/work/SBTM/SBTM/release/scripts/demo
./seed-demo.sh
```

---

## Monitoring and Management

### View Logs in Cloud Logging

```bash
# View logs for a specific service
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=sbtm" \
  --limit 50 \
  --format json

# Or use kubectl
kubectl logs -n sbtm deployment/api-gateway --tail=100 -f
```

### Enable GKE Monitoring

```bash
# Monitoring is enabled by default in GKE Autopilot
# View in Google Cloud Console: Kubernetes Engine → Clusters → Monitoring

# Or use gcloud
gcloud container clusters describe $CLUSTER_NAME \
  --region=$REGION \
  --format="value(monitoringService)"
```

### Scale Services

```bash
# GKE Autopilot automatically scales nodes
# You control pod replicas

# Scale a deployment
kubectl scale deployment api-gateway \
  --namespace=sbtm \
  --replicas=5

# Enable horizontal pod autoscaling
kubectl autoscale deployment api-gateway \
  --namespace=sbtm \
  --min=2 \
  --max=10 \
  --cpu-percent=70
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n sbtm

# Describe pod for events
kubectl describe pod <pod-name> -n sbtm

# Check logs
kubectl logs <pod-name> -n sbtm

# Check Cloud SQL Proxy logs
kubectl logs <pod-name> -n sbtm -c cloud-sql-proxy
```

### Cloud SQL Connection Issues

```bash
# Verify Cloud SQL instance is running
gcloud sql instances list

# Check connection name
gcloud sql instances describe $INSTANCE_NAME \
  --format='value(connectionName)'

# Test connection from Cloud Shell
gcloud sql connect $INSTANCE_NAME --user=postgres
```

### Redis Connection Issues

```bash
# Verify Redis instance is running
gcloud redis instances list --region=$REGION

# Get connection details
gcloud redis instances describe $REDIS_INSTANCE --region=$REGION
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress sbtm-ingress -n sbtm

# Check backend services
kubectl get services -n sbtm
```

---

## Cost Optimization

### Right-Size Cloud SQL

```bash
# Check current usage
gcloud sql instances describe $INSTANCE_NAME

# Change tier (e.g., from db-f1-micro to db-g1-small)
gcloud sql instances patch $INSTANCE_NAME \
  --tier=db-custom-1-3840
```

### Use Committed Use Discounts

Purchase 1-year or 3-year committed use contracts for 25-55% savings.

```bash
# View recommendations
gcloud recommender recommendations list \
  --project=$PROJECT_ID \
  --recommender=google.compute.commitment.UsageCommitmentRecommender
```

### Enable Cloud Storage Lifecycle Management

```bash
# Auto-delete videos older than 1 year
gsutil lifecycle set lifecycle.json gs://${BUCKET_NAME}-videos/

# Move to archive after 90 days
cat > archive-lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set archive-lifecycle.json gs://${BUCKET_NAME}-videos/
```

### Monitor Costs

```bash
# Export billing data to BigQuery (set up in Cloud Console)
# Then query costs:

bq query --use_legacy_sql=false '
SELECT
  service.description,
  SUM(cost) as total_cost
FROM
  `PROJECT_ID.billing_export.gcp_billing_export_v1_XXXXXX`
WHERE
  DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY
  service.description
ORDER BY
  total_cost DESC
'
```

---

## Cleanup

To delete all resources:

```bash
# Delete GKE cluster
gcloud container clusters delete $CLUSTER_NAME --region=$REGION --quiet

# Delete Cloud SQL instance
gcloud sql instances delete $INSTANCE_NAME --quiet

# Delete Redis instance
gcloud redis instances delete $REDIS_INSTANCE --region=$REGION --quiet

# Delete storage buckets
gsutil -m rm -r gs://${BUCKET_NAME}-videos/
gsutil -m rm -r gs://${BUCKET_NAME}-docs/

# Delete service accounts
gcloud iam service-accounts delete cloudsql-proxy@${PROJECT_ID}.iam.gserviceaccount.com --quiet
gcloud iam service-accounts delete sbtm-storage@${PROJECT_ID}.iam.gserviceaccount.com --quiet
```

---

## Comparison: GCP vs Azure

| Feature | GCP | Azure |
|---------|-----|-------|
| **Cluster Management** | GKE Autopilot (fully managed) | AKS (manual node pools) |
| **Database** | Cloud SQL (fully managed) | Azure Database (fully managed) |
| **Redis** | Memorystore (99.9% SLA) | Azure Cache (99.9% SLA) |
| **Storage** | Cloud Storage (multi-class) | Blob Storage (access tiers) |
| **Cost (prod)** | $400-800/mo | $500-1,000/mo |
| **Ease of Use** | ★★★★★ | ★★★★☆ |

**Recommendation**: GCP is typically 15-25% cheaper for Kubernetes workloads due to Autopilot's pay-per-pod model.

---

## Next Steps

- [Configure monitoring and alerts](TROUBLESHOOTING.md#monitoring)
- [Set up backup policies](TROUBLESHOOTING.md#backup)
- [Review security settings](TROUBLESHOOTING.md#security)
- [Plan for high availability](TROUBLESHOOTING.md#high-availability)

---

## Support

- **Documentation**: https://github.com/arvinddhasmana/SBTM_Releases/tree/main/docs
- **Issues**: https://github.com/arvinddhasmana/SBTM_Releases/issues
- **Email**: arvinddhasmana@gmail.com
