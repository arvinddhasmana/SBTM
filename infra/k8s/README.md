# SBTM Kubernetes Manifests

Cloud-agnostic Kustomize-based manifests for all SBTM microservices.

## Structure

```
infra/k8s/
├── base/                    # Environment-agnostic base manifests
│   ├── namespace.yaml — per overlay (demo/ and production/) namespaces
│   ├── api-gateway/         # Deployment, Service, HPA
│   ├── gps-tracking/        # Deployment, Service, HPA
│   ├── emergency-alerts/    # Deployment, Service, HPA
│   ├── student-presence/    # Deployment, Service
│   ├── student-management/  # Deployment, Service
│   ├── compliance-management/ # Deployment, Service
│   ├── video-service/       # Deployment, Service
│   ├── notification-service/# Deployment, Service
│   ├── osrm/               # Deployment (with init container), Service
│   ├── ingress/            # NGINX Ingress values + routing rules
│   └── secrets/            # SecretProviderClass for Azure Key Vault CSI
└── overlays/
    ├── demo/              # 1 replica, debug logging, Always pull, demo domain, sbtm-kv-demo
    └── production/         # 2-3 replicas, HPA, info logging, IfNotPresent pull
```

## Deploy

```bash
# Demo
kubectl apply -k infra/k8s/overlays/demo
kubectl get pods -n sbtm-demo

# Production (use deploy-services.sh for confirmation gate)
bash scripts/azure/deploy-services.sh production
```

## Before applying

1. Update `infra/k8s/base/secrets/keyvault-csi.yaml`:
   - Replace `WORKLOAD_IDENTITY_CLIENT_ID` with the value output from Bicep
   - Replace `AZURE_TENANT_ID` with your tenant ID

2. Update `infra/k8s/base/ingress/ingress-rules.yaml`:
   - Replace `api.sbtm.example.com` with your actual domain
   - Replace `devops@sbtm.example.com` with your email

3. Update image names in both `overlays/*/kustomization.yaml`:
   - Replace `sbtmacrdemo` with actual ACR name from `az acr show`

## Image naming

Images are pushed to ACR by `build-images.yml` as:

```
<acr-login-server>/sbtm/<service-name>:sha-<commit>
<acr-login-server>/sbtm/<service-name>:latest
```

The CI pipeline updates image tags in overlays automatically before applying.
