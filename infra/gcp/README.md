# GCP Infrastructure README

This directory contains Terraform configuration for deploying SBTM infrastructure on Google Cloud Platform.

## Directory Structure

```
infra/gcp/
├── main.tf                 # Root module - orchestrates all resources
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── backend.tf.example      # Backend configuration template
├── environments/
│   ├── demo.tfvars        # Demo environment configuration
│   └── production.tfvars  # Production environment configuration
└── modules/
    ├── networking/        # VPC, subnets, Cloud NAT
    ├── gke/              # GKE Autopilot cluster
    ├── database/         # Cloud SQL PostgreSQL
    ├── redis/            # Memorystore for Redis
    ├── storage/          # Cloud Storage buckets
    ├── artifact-registry/ # Container registry
    ├── secrets/          # Secret Manager
    ├── dns/              # Cloud DNS (optional)
    ├── monitoring/       # Cloud Operations
    └── k8s-addons/       # Kubernetes add-ons (Helm)
```

## Quick Start

1. **Setup GCP Project**:
   ```bash
   bash scripts/gcp/setup-gcp-project.sh <project-id>
   ```

2. **Configure Variables**:
   - Edit `environments/demo.tfvars` or `environments/production.tfvars`
   - Update `project_id` with your GCP project ID

3. **Initialize Terraform**:
   ```bash
   cd infra/gcp
   terraform init
   ```

4. **Plan and Apply**:
   ```bash
   terraform plan -var-file="environments/demo.tfvars" -var="project_id=<your-project-id>"
   terraform apply -var-file="environments/demo.tfvars" -var="project_id=<your-project-id>"
   ```

## GCP Features Leveraged

### GKE Autopilot
- Fully managed Kubernetes
- Automatic node provisioning and scaling
- Built-in security best practices
- Pay only for pod resources

### Cloud SQL
- Automated backups and point-in-time recovery
- High availability with regional configuration
- Query insights for performance tuning
- Private IP networking

### Memorystore for Redis
- Fully managed Redis
- High availability (Standard tier)
- Automatic failover
- Sub-millisecond latency

### Cloud Storage
- Object versioning
- Lifecycle management
- Multi-regional storage
- IAM-based access control

### Artifact Registry
- Native Docker registry
- Vulnerability scanning
- IAM integration
- Regional replication

### Secret Manager
- Centralized secrets management
- Automatic secret rotation
- Audit logging
- Workload Identity integration

## Best Practices Implemented

1. **Security**:
   - Private GKE nodes
   - Workload Identity for service authentication
   - Secret Manager for sensitive data
   - Network policies
   - Shielded GKE nodes

2. **High Availability**:
   - Regional GKE cluster
   - Cloud SQL high availability (production)
   - Memorystore Standard tier (production)
   - Multiple replicas for services

3. **Cost Optimization**:
   - GKE Autopilot for right-sizing
   - Appropriate tier selection per environment
   - Storage lifecycle policies
   - Preemptible instances (where applicable)

4. **Operations**:
   - Cloud Operations integration
   - Automated backups
   - Maintenance windows
   - Resource labeling for cost tracking

## Cost Estimates

### Demo Environment (~$200-250/month)
- GKE Autopilot: $100
- Cloud SQL (db-custom-1-3840): $40
- Memorystore (1GB BASIC): $15
- Cloud Storage: $10
- Artifact Registry: $5
- Networking: $20
- Other: $10-30

### Production Environment (~$400-500/month)
- GKE Autopilot: $180
- Cloud SQL (db-custom-2-8192, HA): $120
- Memorystore (5GB STANDARD_HA): $60
- Cloud Storage: $20
- Artifact Registry: $10
- Networking: $40
- Other: $20-50

## Terraform State Management

State is stored in Google Cloud Storage:
```hcl
terraform {
  backend "gcs" {
    bucket = "PROJECT_ID-tfstate"
    prefix = "sbtm/ENVIRONMENT"
  }
}
```

## Module Documentation

Each module has its own README:
- [Networking Module](modules/networking/README.md)
- [GKE Module](modules/gke/README.md)
- [Database Module](modules/database/README.md)
- [Redis Module](modules/redis/README.md)
- [Storage Module](modules/storage/README.md)

## Maintenance

### Updating Terraform Version
Update the required version in `main.tf`:
```hcl
terraform {
  required_version = ">= 1.7.0"  # Update this
}
```

### Updating GCP Provider
Update the provider version:
```hcl
required_providers {
  google = {
    source  = "hashicorp/google"
    version = "~> 5.10"  # Update this
  }
}
```

## Comparison with Azure Deployment

| Aspect | Azure (Bicep) | GCP (Terraform) |
|--------|---------------|-----------------|
| IaC Tool | Bicep (Azure-native) | Terraform (multi-cloud) |
| K8s | AKS (managed) | GKE Autopilot (fully managed) |
| Database | PostgreSQL Flexible Server | Cloud SQL |
| Secrets | Key Vault with CSI driver | Secret Manager with External Secrets |
| Auto-scaling | Manual configuration | Built-in with Autopilot |
| Cost Model | Per-node pricing | Per-pod pricing (Autopilot) |
| Networking | Azure VNet | Google VPC |
| Registry | ACR | Artifact Registry |

## Azure Deployment Unchanged

The Azure deployment in `../azure/` remains completely unchanged and continues to work as before. Both deployments are independent and can coexist.

## Support

For questions or issues:
1. Check [GCP Documentation](https://cloud.google.com/docs)
2. Review Terraform module documentation
3. Create an issue in the GitHub repository
