# Complete Azure Deployment Guide

This guide provides detailed step-by-step instructions for deploying SBTM to Microsoft Azure using Azure Kubernetes Service (AKS).

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
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# kubectl
az aks install-cli

# helm (optional, for advanced deployments)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Azure Account Requirements

- **Active Azure Subscription**: With billing enabled
- **Required Permissions**: Contributor or Owner role
- **Resource Quotas**:
  - vCPUs: At least 8 cores available
  - Public IPs: At least 2 available
  - Storage: 100GB+ available

### Verify Prerequisites

```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription bb2b8549-9693-40f2-9287-3bd5afcc6633

# Verify subscription
az account show

# Check available regions
az account list-locations -o table
```

---

## Architecture Overview

### Azure Resources Created

```
SBTM Azure Deployment
├── Resource Group (sbtm-rg-prod)
├── AKS Cluster (sbtm-aks-cluster)
│   ├── Node Pool (3 nodes, Standard_DS2_v2)
│   ├── System Services
│   └── SBTM Services (namespace: sbtm)
├── Azure Database for PostgreSQL (Flexible Server)
│   ├── Database: sbtm_db
│   └── Connection pooling enabled
├── Azure Cache for Redis (Standard C1)
│   └── SSL enabled
├── Azure Storage Account
│   ├── Blob Storage (videos, documents)
│   └── File Share (shared data)
├── Azure Load Balancer (auto-created by AKS)
└── Virtual Network (10.0.0.0/16)
    ├── AKS Subnet (10.0.1.0/24)
    └── Data Services Subnet (10.0.2.0/24)
```

### Estimated Costs

| Environment | Monthly Cost (USD) |
|-------------|-------------------|
| Development | $150 - $250 |
| Staging | $300 - $500 |
| Production | $500 - $1,000 |

---

## Manual Deployment Steps

### Step 1: Create Resource Group

```bash
# Define variables
RESOURCE_GROUP="sbtm-rg-prod"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Tag resource group
az group update \
  --name $RESOURCE_GROUP \
  --tags Environment=Production Project=SBTM
```

### Step 2: Create Virtual Network

```bash
VNET_NAME="sbtm-vnet"

# Create virtual network
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name $VNET_NAME \
  --address-prefix 10.0.0.0/16 \
  --subnet-name aks-subnet \
  --subnet-prefix 10.0.1.0/24

# Create data services subnet
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --name data-subnet \
  --address-prefix 10.0.2.0/24
```

### Step 3: Create AKS Cluster

```bash
AKS_CLUSTER="sbtm-aks-cluster"

# Create AKS cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER \
  --node-count 3 \
  --node-vm-size Standard_DS2_v2 \
  --enable-managed-identity \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --network-plugin azure \
  --vnet-subnet-id $(az network vnet subnet show \
    --resource-group $RESOURCE_GROUP \
    --vnet-name $VNET_NAME \
    --name aks-subnet \
    --query id -o tsv)

# Get credentials
az aks get-credentials \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER

# Verify connection
kubectl get nodes
```

### Step 4: Create PostgreSQL Database

```bash
DB_SERVER="sbtm-db-server"
DB_ADMIN="sbtmadmin"
DB_PASSWORD="$(openssl rand -base64 32)"

# Store password securely
echo "Database password: $DB_PASSWORD" > ~/sbtm-db-password.txt
chmod 600 ~/sbtm-db-password.txt

# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --location $LOCATION \
  --admin-user $DB_ADMIN \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name sbtm_db

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Get connection string
DB_HOST="${DB_SERVER}.postgres.database.azure.com"
echo "Database connection: postgresql://${DB_ADMIN}:${DB_PASSWORD}@${DB_HOST}:5432/sbtm_db"
```

### Step 5: Create Redis Cache

```bash
REDIS_NAME="sbtm-redis-cache"

# Create Redis cache
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Standard \
  --vm-size c1 \
  --enable-non-ssl-port false

# Get Redis keys
REDIS_KEY=$(az redis list-keys \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query primaryKey -o tsv)

REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"
echo "Redis connection: $REDIS_HOST:6380 (SSL)"
```

### Step 6: Create Storage Account

```bash
STORAGE_ACCOUNT="sbtmstorage$(date +%s)"

# Create storage account
az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Create blob containers
az storage container create \
  --name videos \
  --account-name $STORAGE_ACCOUNT

az storage container create \
  --name documents \
  --account-name $STORAGE_ACCOUNT

# Get storage key
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query '[0].value' -o tsv)

echo "Storage account: $STORAGE_ACCOUNT"
```

### Step 7: Create Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace sbtm

# Create database secret
kubectl create secret generic db-credentials \
  --namespace=sbtm \
  --from-literal=host=$DB_HOST \
  --from-literal=username=$DB_ADMIN \
  --from-literal=password=$DB_PASSWORD \
  --from-literal=database=sbtm_db

# Create Redis secret
kubectl create secret generic redis-credentials \
  --namespace=sbtm \
  --from-literal=host=$REDIS_HOST \
  --from-literal=port=6380 \
  --from-literal=password=$REDIS_KEY

# Create storage secret
kubectl create secret generic storage-credentials \
  --namespace=sbtm \
  --from-literal=account=$STORAGE_ACCOUNT \
  --from-literal=key=$STORAGE_KEY
```

### Step 8: Deploy SBTM Services

```bash
# Clone deployment manifests (or use from release)
cd /home/runner/work/SBTM/SBTM/release

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
  --timeout=300s
```

### Step 9: Configure Ingress

```bash
# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Wait for external IP
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
cd /home/runner/work/SBTM/SBTM/release/deploy/azure
./quick-deploy.sh
```

The script will:
1. Verify all prerequisites
2. Prompt for configuration
3. Create all Azure resources
4. Deploy SBTM services
5. Configure networking and ingress
6. Output access URLs and credentials

---

## Post-Deployment Configuration

### Configure DNS (Optional)

```bash
# Create DNS zone
az network dns zone create \
  --resource-group $RESOURCE_GROUP \
  --name sbtm.yourdomain.com

# Add A record
az network dns record-set a add-record \
  --resource-group $RESOURCE_GROUP \
  --zone-name sbtm.yourdomain.com \
  --record-set-name @ \
  --ipv4-address $EXTERNAL_IP
```

### Enable HTTPS with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: arvinddhasmana@gmail.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress to use TLS
kubectl annotate ingress sbtm-ingress \
  --namespace=sbtm \
  cert-manager.io/cluster-issuer=letsencrypt-prod
```

### Seed Demo Data

```bash
cd /home/runner/work/SBTM/SBTM/release/scripts/demo
./seed-demo.sh
```

---

## Monitoring and Management

### Enable Azure Monitor

```bash
# Enable Container Insights
az aks enable-addons \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER \
  --addons monitoring
```

### View Logs

```bash
# View all pods
kubectl get pods -n sbtm

# View logs for a specific service
kubectl logs -n sbtm deployment/api-gateway --tail=100 -f

# View logs for all pods
kubectl logs -n sbtm --all-containers=true --tail=50
```

### Scale Services

```bash
# Scale a deployment
kubectl scale deployment api-gateway \
  --namespace=sbtm \
  --replicas=5

# Enable autoscaling
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
```

### Database Connection Issues

```bash
# Test database connectivity from within cluster
kubectl run -it --rm debug \
  --image=postgres:14 \
  --restart=Never \
  -- psql postgresql://${DB_ADMIN}:${DB_PASSWORD}@${DB_HOST}:5432/sbtm_db
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress sbtm-ingress -n sbtm

# Check service endpoints
kubectl get endpoints -n sbtm
```

---

## Cost Optimization

### Right-Size Resources

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n sbtm

# Adjust based on actual usage
kubectl set resources deployment api-gateway \
  --namespace=sbtm \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=250m,memory=256Mi
```

### Use Azure Reserved Instances

For production, purchase 1-year or 3-year reserved instances to save 30-70%.

### Enable Auto-Shutdown for Non-Production

```bash
# Stop AKS cluster (non-production only)
az aks stop --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER

# Start AKS cluster
az aks start --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER
```

### Monitor Costs

```bash
# View cost analysis
az consumption usage list \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --query "[?contains(instanceName, 'sbtm')]"
```

---

## Cleanup

To delete all resources:

```bash
# Delete entire resource group (WARNING: irreversible)
az group delete --name $RESOURCE_GROUP --yes --no-wait

# Or delete individual resources
az aks delete --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --yes --no-wait
az postgres flexible-server delete --resource-group $RESOURCE_GROUP --name $DB_SERVER --yes
az redis delete --resource-group $RESOURCE_GROUP --name $REDIS_NAME --yes
az storage account delete --resource-group $RESOURCE_GROUP --name $STORAGE_ACCOUNT --yes
```

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
