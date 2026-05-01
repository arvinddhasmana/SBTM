# SBTM Troubleshooting Guide

This comprehensive guide helps you diagnose and resolve common issues with SBTM deployments.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Deployment Issues](#deployment-issues)
3. [Service Issues](#service-issues)
4. [Database Issues](#database-issues)
5. [Redis/Cache Issues](#rediscache-issues)
6. [Network and Ingress Issues](#network-and-ingress-issues)
7. [Performance Issues](#performance-issues)
8. [Security and Authentication](#security-and-authentication)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Backup and Recovery](#backup-and-recovery)

---

## Quick Diagnostics

### Run Health Check

```bash
cd /home/runner/work/SBTM/SBTM/release/scripts/verification
./health-check.sh
```

### Check All Resources

```bash
# Check pods status
kubectl get pods -n sbtm

# Check services
kubectl get services -n sbtm

# Check ingress
kubectl get ingress -n sbtm

# Check configmaps and secrets
kubectl get configmaps,secrets -n sbtm
```

### Get Quick Overview

```bash
# See everything in sbtm namespace
kubectl get all -n sbtm

# Check recent events
kubectl get events -n sbtm --sort-by='.lastTimestamp' | tail -20
```

---

## Deployment Issues

### Issue: Deployment Script Fails

#### Symptom
```
ERROR: Azure CLI not found
ERROR: kubectl not found
ERROR: Not logged in to cloud
```

#### Solution
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Or install Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# Install kubectl
az aks install-cli  # Azure
gcloud components install kubectl  # GCP

# Login
az login  # Azure
gcloud auth login  # GCP
```

---

### Issue: Insufficient Permissions

#### Symptom
```
ERROR: The client does not have authorization to perform action
ERROR: User does not have sufficient permissions
```

#### Solution
```bash
# Azure: Verify role
az role assignment list --assignee your@email.com

# Need at least "Contributor" role
# Contact admin or use:
az role assignment create \
  --role "Contributor" \
  --assignee your@email.com \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID

# GCP: Verify role
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:your@email.com"

# Need at least "Editor" role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your@email.com" \
  --role="roles/editor"
```

---

### Issue: Resource Quota Exceeded

#### Symptom
```
ERROR: Quota exceeded for resource 'CORES'
ERROR: Not enough resources available
```

#### Solution
```bash
# Azure: Check quota
az vm list-usage --location eastus -o table

# Request quota increase
# Go to: Azure Portal → Subscriptions → Usage + quotas → Request increase

# GCP: Check quota
gcloud compute regions describe us-central1 --format="table(quotas:format='table(metric,limit,usage)')"

# Request quota increase
# Go to: GCP Console → IAM & Admin → Quotas → Request increase
```

---

## Service Issues

### Issue: Pods in CrashLoopBackOff

#### Symptom
```bash
$ kubectl get pods -n sbtm
NAME                              READY   STATUS             RESTARTS   AGE
api-gateway-xxx                   0/1     CrashLoopBackOff   5          10m
```

#### Diagnosis
```bash
# Check pod logs
kubectl logs api-gateway-xxx -n sbtm

# Check previous logs (if container restarted)
kubectl logs api-gateway-xxx -n sbtm --previous

# Describe pod for events
kubectl describe pod api-gateway-xxx -n sbtm
```

#### Common Causes

**1. Database Connection Failed**
```bash
# Check database secret
kubectl get secret db-credentials -n sbtm -o yaml

# Test database connection
kubectl run -it --rm debug \
  --image=postgres:14 \
  --restart=Never \
  -- psql postgresql://USER:PASS@HOST:5432/DATABASE
```

**2. Missing Environment Variables**
```bash
# Check configmap
kubectl describe configmap sbtm-config -n sbtm

# Update if needed
kubectl edit configmap sbtm-config -n sbtm
kubectl rollout restart deployment/api-gateway -n sbtm
```

**3. Out of Memory**
```bash
# Check resource limits
kubectl describe pod api-gateway-xxx -n sbtm | grep -A 5 Limits

# Increase memory limit
kubectl set resources deployment api-gateway -n sbtm \
  --limits=memory=1Gi \
  --requests=memory=512Mi
```

---

### Issue: Pods Pending

#### Symptom
```bash
$ kubectl get pods -n sbtm
NAME                              READY   STATUS    RESTARTS   AGE
api-gateway-xxx                   0/1     Pending   0          5m
```

#### Diagnosis
```bash
# Check why pod is pending
kubectl describe pod api-gateway-xxx -n sbtm

# Common reasons shown in events:
# - Insufficient CPU
# - Insufficient memory
# - No nodes available
# - PersistentVolumeClaim not bound
```

#### Solutions

**1. Scale cluster (Azure)**
```bash
az aks scale \
  --resource-group RESOURCE_GROUP \
  --name CLUSTER_NAME \
  --node-count 5
```

**2. GKE Autopilot auto-scales**
```bash
# GKE Autopilot automatically adds capacity
# Just wait 2-3 minutes for nodes to provision
```

**3. Reduce resource requests**
```bash
kubectl set resources deployment api-gateway -n sbtm \
  --requests=cpu=100m,memory=256Mi
```

---

### Issue: ImagePullBackOff

#### Symptom
```bash
$ kubectl get pods -n sbtm
NAME                              READY   STATUS             RESTARTS   AGE
api-gateway-xxx                   0/1     ImagePullBackOff   0          2m
```

#### Diagnosis
```bash
kubectl describe pod api-gateway-xxx -n sbtm
# Look for: Failed to pull image "ghcr.io/..."
# Error: unauthorized, manifest unknown, or connection timeout
```

#### Solutions

**1. Check image exists**
```bash
# Verify image in registry
docker pull ghcr.io/arvinddhasmana/sbtm-api-gateway:latest

# If using private registry, create pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=arvinddhasmana \
  --docker-password=ghp_YOUR_PAT \
  --namespace=sbtm

# Update deployment to use secret
kubectl patch deployment api-gateway -n sbtm \
  -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ghcr-secret"}]}}}}'
```

**2. Use correct image tag**
```bash
# Update image tag
kubectl set image deployment/api-gateway \
  api-gateway=ghcr.io/arvinddhasmana/sbtm-api-gateway:v1.0.0 \
  -n sbtm
```

---

## Database Issues

### Issue: Cannot Connect to Database

#### Symptom
```
Error: connect ETIMEDOUT
Error: password authentication failed
Error: database "sbtm_db" does not exist
```

#### Diagnosis
```bash
# Check database secret
kubectl get secret db-credentials -n sbtm -o jsonpath='{.data.host}' | base64 -d
kubectl get secret db-credentials -n sbtm -o jsonpath='{.data.username}' | base64 -d

# Azure: Check PostgreSQL server
az postgres flexible-server show \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER

# GCP: Check Cloud SQL instance
gcloud sql instances describe INSTANCE_NAME
```

#### Solutions

**1. Azure: Fix firewall rules**
```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Or allow AKS subnet
az postgres flexible-server firewall-rule create \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER \
  --rule-name AllowAKS \
  --start-ip-address 10.0.1.0 \
  --end-ip-address 10.0.1.255
```

**2. GCP: Check Cloud SQL Proxy**
```bash
# Verify Cloud SQL Proxy sidecar is running
kubectl describe pod api-gateway-xxx -n sbtm

# Should see container: cloud-sql-proxy
# If missing, add to deployment
```

**3. Test connection**
```bash
# From within cluster
kubectl run -it --rm psql-test \
  --image=postgres:14 \
  --restart=Never \
  --namespace=sbtm \
  -- psql "postgresql://USER:PASS@HOST:5432/sbtm_db" -c "SELECT version();"
```

---

### Issue: Database Disk Full

#### Symptom
```
Error: could not write to file: No space left on device
```

#### Solution

**Azure:**
```bash
# Check storage usage
az postgres flexible-server show \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER \
  --query storageProfile

# Increase storage
az postgres flexible-server update \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER \
  --storage-size 64
```

**GCP:**
```bash
# Check storage
gcloud sql instances describe INSTANCE_NAME \
  --format="value(settings.dataDiskSizeGb)"

# Increase storage (cannot decrease)
gcloud sql instances patch INSTANCE_NAME \
  --storage-size=20GB
```

---

## Redis/Cache Issues

### Issue: Redis Connection Timeout

#### Symptom
```
Error: Redis connection timeout
Error: connect ECONNREFUSED
```

#### Diagnosis
```bash
# Check Redis secret
kubectl get secret redis-credentials -n sbtm -o yaml

# Azure: Check Redis status
az redis show \
  --resource-group RESOURCE_GROUP \
  --name REDIS_NAME

# GCP: Check Memorystore status
gcloud redis instances describe REDIS_INSTANCE --region=REGION
```

#### Solutions

**1. Verify Redis is running**
```bash
# Azure: Check provisioning state
az redis show \
  --resource-group RESOURCE_GROUP \
  --name REDIS_NAME \
  --query provisioningState

# GCP: Check state
gcloud redis instances describe REDIS_INSTANCE \
  --region=REGION \
  --format="value(state)"
```

**2. Test connection**
```bash
# From within cluster
kubectl run -it --rm redis-test \
  --image=redis:7 \
  --restart=Never \
  --namespace=sbtm \
  -- redis-cli -h REDIS_HOST -p REDIS_PORT -a PASSWORD ping
```

**3. Check network connectivity**
```bash
# Azure: Ensure Redis is on same VNet or has public IP
# GCP: Ensure Redis and GKE are in same VPC
```

---

## Network and Ingress Issues

### Issue: Cannot Access Application

#### Symptom
```
ERR_CONNECTION_TIMED_OUT
502 Bad Gateway
504 Gateway Timeout
```

#### Diagnosis
```bash
# Check ingress
kubectl get ingress -n sbtm
kubectl describe ingress sbtm-ingress -n sbtm

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check backend services
kubectl get services -n sbtm
kubectl get endpoints -n sbtm
```

#### Solutions

**1. Verify ingress controller is running**
```bash
# Check status
kubectl get pods -n ingress-nginx

# If not installed, install it
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

**2. Check external IP is assigned**
```bash
kubectl get service ingress-nginx-controller -n ingress-nginx

# If pending, wait 2-5 minutes for cloud provider to assign IP
# If stuck, check cloud provider quotas
```

**3. Verify backend is healthy**
```bash
# Test service directly
kubectl port-forward -n sbtm service/api-gateway 8080:3001

# In another terminal
curl http://localhost:8080/health
```

**4. Check firewall rules**
```bash
# Azure: Verify NSG allows traffic
az network nsg rule list \
  --resource-group RESOURCE_GROUP \
  --nsg-name NSG_NAME \
  --output table

# GCP: Verify firewall rules
gcloud compute firewall-rules list
```

---

### Issue: HTTPS/TLS Not Working

#### Symptom
```
NET::ERR_CERT_AUTHORITY_INVALID
Your connection is not private
```

#### Solutions

**1. Check certificate status**
```bash
# Azure: Check certificate
kubectl describe ingress sbtm-ingress -n sbtm

# GCP: Check managed certificate
gcloud compute ssl-certificates describe sbtm-cert
```

**2. Verify cert-manager (if using)**
```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# Check certificate resource
kubectl get certificates -n sbtm
kubectl describe certificate sbtm-tls -n sbtm
```

**3. Force certificate renewal**
```bash
# Delete and recreate certificate
kubectl delete certificate sbtm-tls -n sbtm
kubectl apply -f ingress.yaml
```

---

## Performance Issues

### Issue: Slow Response Times

#### Diagnosis
```bash
# Check pod resource usage
kubectl top pods -n sbtm

# Check node resource usage
kubectl top nodes

# Check pod logs for slow queries
kubectl logs -n sbtm deployment/api-gateway | grep "slow"
```

#### Solutions

**1. Scale horizontally**
```bash
# Increase replicas
kubectl scale deployment api-gateway -n sbtm --replicas=5

# Enable autoscaling
kubectl autoscale deployment api-gateway -n sbtm \
  --min=2 --max=10 --cpu-percent=70
```

**2. Scale vertically**
```bash
# Increase resources
kubectl set resources deployment api-gateway -n sbtm \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=1,memory=1Gi
```

**3. Optimize database**
```bash
# Check slow queries (PostgreSQL)
kubectl exec -it deployment/api-gateway -n sbtm -- \
  psql "$DATABASE_URL" -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Add indexes if needed
# Increase connection pool size
# Enable query caching in Redis
```

---

### Issue: High Memory Usage

#### Symptom
```
OOMKilled (Out of Memory)
Memory usage: 95%
```

#### Solutions

**1. Increase memory limits**
```bash
kubectl set resources deployment api-gateway -n sbtm \
  --limits=memory=2Gi \
  --requests=memory=1Gi
```

**2. Check for memory leaks**
```bash
# Monitor memory over time
kubectl top pod api-gateway-xxx -n sbtm --watch

# Check logs for memory-related errors
kubectl logs api-gateway-xxx -n sbtm | grep -i "memory\|heap"
```

**3. Enable memory profiling (Node.js)**
```bash
# Add to deployment environment variables
env:
  - name: NODE_OPTIONS
    value: "--max-old-space-size=1024"
```

---

## Security and Authentication

### Issue: Authentication Failed

#### Symptom
```
401 Unauthorized
403 Forbidden
Invalid credentials
```

#### Solutions

**1. Check JWT secret**
```bash
# Verify JWT_SECRET environment variable
kubectl get configmap sbtm-config -n sbtm -o yaml

# Regenerate if needed
kubectl create secret generic jwt-secret -n sbtm \
  --from-literal=secret=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | kubectl apply -f -
```

**2. Reset admin password**
```bash
# Connect to database
kubectl exec -it deployment/api-gateway -n sbtm -- \
  psql "$DATABASE_URL"

# Reset password
UPDATE users SET password = crypt('NewPassword123!', gen_salt('bf')) WHERE email = 'admin@sbtm.demo';
```

---

### Issue: CORS Errors

#### Symptom
```
Access to fetch at '...' has been blocked by CORS policy
```

#### Solution
```bash
# Update API Gateway config
kubectl edit configmap sbtm-config -n sbtm

# Add CORS origins
data:
  CORS_ORIGINS: "http://localhost:3000,https://admin.sbtm.com,https://parent.sbtm.com"

# Restart deployment
kubectl rollout restart deployment/api-gateway -n sbtm
```

---

## Monitoring and Logging

### Enable Detailed Logging

```bash
# Increase log level
kubectl set env deployment/api-gateway -n sbtm LOG_LEVEL=debug

# Stream logs
kubectl logs -f deployment/api-gateway -n sbtm
```

### Azure Monitor

```bash
# Enable Container Insights
az aks enable-addons \
  --resource-group RESOURCE_GROUP \
  --name CLUSTER_NAME \
  --addons monitoring

# Query logs
az monitor log-analytics query \
  --workspace WORKSPACE_ID \
  --analytics-query "ContainerLog | where Namespace == 'sbtm' | limit 100"
```

### GCP Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=sbtm" \
  --limit 50 \
  --format json

# Create log-based alert
gcloud logging metrics create error-rate \
  --description="Error rate metric" \
  --log-filter='resource.type="k8s_container" AND severity="ERROR"'
```

---

## Backup and Recovery

### Database Backup

**Azure:**
```bash
# Manual backup
az postgres flexible-server backup create \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER \
  --backup-name manual-backup-$(date +%Y%m%d)

# List backups
az postgres flexible-server backup list \
  --resource-group RESOURCE_GROUP \
  --name DB_SERVER
```

**GCP:**
```bash
# Manual backup
gcloud sql backups create --instance=INSTANCE_NAME

# List backups
gcloud sql backups list --instance=INSTANCE_NAME

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=INSTANCE_NAME \
  --backup-instance=INSTANCE_NAME
```

### Application State Backup

```bash
# Export data via API
curl http://API_ENDPOINT/api/v1/export > backup-$(date +%Y%m%d).json

# Backup Kubernetes resources
kubectl get all -n sbtm -o yaml > sbtm-k8s-backup.yaml
```

---

## Getting Help

### Collect Diagnostic Information

```bash
# Create diagnostic bundle
kubectl cluster-info dump --namespace sbtm --output-directory=sbtm-diagnostics

# Package logs
tar -czf sbtm-diagnostics-$(date +%Y%m%d).tar.gz sbtm-diagnostics/
```

### Contact Support

- **Community**: https://github.com/arvinddhasmana/SBTM_Releases/discussions
- **Issues**: https://github.com/arvinddhasmana/SBTM_Releases/issues
- **Email**: arvinddhasmana@gmail.com

Include:
- Deployment platform (Azure/GCP)
- Error messages and logs
- Output of health-check.sh
- Diagnostic bundle (if possible)

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `CrashLoopBackOff` | Container exits immediately | Check logs with `kubectl logs` |
| `ImagePullBackOff` | Cannot pull container image | Verify image exists, check registry credentials |
| `Pending` | Pod cannot be scheduled | Check resource requests, node capacity |
| `OOMKilled` | Out of memory | Increase memory limits |
| `ErrImagePull` | Image not found | Check image name and tag |
| `CreateContainerConfigError` | Invalid config | Check environment variables, secrets |
| `Error: ECONNREFUSED` | Cannot connect to service | Check service is running, network policies |

---

**Last Updated**: 2026-04-30
