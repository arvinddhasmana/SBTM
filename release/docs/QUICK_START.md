# SBTM Quick Start Guide

**Estimated time**: 30 minutes

This guide will walk you through deploying SBTM to Azure or GCP and verifying the installation.

## Prerequisites

### Required
- **Cloud Account**: Azure or GCP with billing enabled
- **Cloud CLI**: Azure CLI (`az`) or Google Cloud SDK (`gcloud`)
- **kubectl**: Kubernetes command-line tool
- **Git**: For cloning the repository

### Recommended
- **Basic cloud knowledge**: Understanding of cloud services and Kubernetes
- **30 minutes**: Uninterrupted time to complete deployment

## Step 1: Clone the Repository

```bash
git clone https://github.com/arvinddhasmana/SBTM_Releases.git
cd SBTM_Releases
```

## Step 2: Choose Your Cloud Platform

### Option A: Deploy to Azure

```bash
cd deploy/azure
./quick-deploy.sh
```

**What the script does**:
1. Verifies prerequisites (Azure CLI, kubectl)
2. Prompts for configuration (region, resource group)
3. Creates Azure resources (AKS, PostgreSQL, Redis, Storage)
4. Deploys SBTM services to Kubernetes
5. Seeds demo data
6. Outputs access URLs and credentials

**Time**: ~20-25 minutes

### Option B: Deploy to GCP

```bash
cd deploy/gcp
./quick-deploy.sh
```

**What the script does**:
1. Verifies prerequisites (gcloud CLI, kubectl)
2. Prompts for configuration (project, region)
3. Creates GCP resources (GKE, Cloud SQL, Memorystore, Storage)
4. Deploys SBTM services to Kubernetes
5. Seeds demo data
6. Outputs access URLs and credentials

**Time**: ~20-25 minutes

## Step 3: Verify Deployment

After deployment completes, verify all services are healthy:

```bash
cd ../../scripts/verification
./health-check.sh
```

This checks:
- ✅ API Gateway is responding
- ✅ All microservices are running
- ✅ Database connectivity
- ✅ Redis cache is available

## Step 4: Access the Applications

The deployment script outputs three URLs:

### Admin Dashboard
- **URL**: Shown in deployment output
- **Credentials**:
  - Email: `admin@sbtm.demo`
  - Password: `Admin123!`
- **Features**: Manage routes, track buses, view alerts

### Parent Portal
- **URL**: Shown in deployment output
- **Credentials**:
  - Email: `parent1@sbtm.demo`
  - Password: `Admin123!`
- **Features**: Track your children, view alerts, see ETA

### Driver App
- **Platform**: Mobile (iOS/Android)
- **Credentials**:
  - Email: `driver1@sbtm.demo`
  - Password: `Admin123!`
- **Features**: Start routes, log presence, trigger alerts

## Step 5: Explore Demo Data

The system is pre-loaded with demo data including:
- 6 Ottawa schools (OCSB and OCDSB)
- Multiple routes (AM and PM)
- Sample students assigned to routes
- Demo drivers and parent accounts

### Try These Workflows

#### As Admin:
1. Login to Admin Dashboard
2. View live bus locations on map
3. Check route schedules
4. Review system alerts

#### As Parent:
1. Login to Parent Portal
2. View your children's assigned buses
3. Track bus location in real-time
4. Check arrival estimates

#### As Driver:
1. Install Driver App (or use web version)
2. Login with driver credentials
3. Select a route (AM or PM)
4. Start route and simulate GPS updates

## Step 6: Run Simulation (Optional)

To see live GPS updates without a real device:

```bash
cd ../../scripts/demo
./simulate-route.sh
```

This simulates:
- GPS location updates every 5 seconds
- Student boarding/alighting events
- Route progression
- Arrival notifications

## Troubleshooting

### Deployment Fails

**Issue**: "Azure CLI not found"
**Solution**: Install Azure CLI from https://aka.ms/azcli

**Issue**: "Not logged in to cloud"
**Solution**: Run `az login` (Azure) or `gcloud auth login` (GCP)

**Issue**: "Insufficient permissions"
**Solution**: Ensure your account has Contributor/Owner role

### Services Not Starting

**Issue**: Pods in CrashLoopBackOff
**Solution**:
```bash
kubectl get pods -n sbtm
kubectl logs <pod-name> -n sbtm
```

**Issue**: Database connection failed
**Solution**: Check database is provisioned and credentials are correct

### Cannot Access URLs

**Issue**: Connection timeout
**Solution**:
- Check firewall rules allow ingress
- Verify DNS is configured (if using custom domain)
- Use `kubectl port-forward` as temporary workaround

## Next Steps

### Customize Configuration
- Update environment variables
- Configure email/SMS notifications
- Set up custom domains
- Adjust resource limits

### Add Real Data
- Import your school roster
- Define actual routes and stops
- Onboard drivers and parents
- Configure alert preferences

### Integrate Systems
- Connect to student information system
- Integrate with existing authentication
- Set up data exports
- Configure backup policies

### Go to Production
- Review security settings
- Enable monitoring and alerts
- Set up backup procedures
- Configure high availability
- Plan for scaling

## Cost Management

Monitor your cloud costs:

**Azure**:
```bash
az consumption usage list --start-date 2024-01-01 --end-date 2024-01-31
```

**GCP**:
```bash
gcloud billing accounts list
# View in Cloud Console: Billing > Reports
```

**Cost optimization tips**:
- Use auto-shutdown for non-production
- Right-size resources based on usage
- Use reserved instances for production
- Enable budget alerts

## Getting Help

- **Documentation**: See `/docs` folder
- **Issues**: https://github.com/arvinddhasmana/SBTM_Releases/issues
- **Discussions**: https://github.com/arvinddhasmana/SBTM_Releases/discussions
- **Email**: arvinddhasmana@gmail.com

## Cleanup

To delete all resources and avoid charges:

**Azure**:
```bash
az group delete --name <resource-group-name> --yes --no-wait
```

**GCP**:
```bash
gcloud container clusters delete <cluster-name> --region <region> --quiet
# Then delete other resources via console
```

---

**Congratulations!** 🎉 You've successfully deployed SBTM!

**Next**: Explore the [Admin Guide](guides/admin-guide.md) to learn about all features.
