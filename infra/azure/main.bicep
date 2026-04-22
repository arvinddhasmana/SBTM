// main.bicep — SBTM Azure infrastructure orchestrator
// Deploys all modules in dependency order for a complete AKS-based deployment

@description('Deployment environment: demo or production')
@allowed(['demo', 'production'])
param environment string = 'demo'

@description('Azure region for all resources')
param location string = 'eastus'

@description('Initial AKS app node pool count')
param aksNodeCount int = 2

@description('AKS app node pool VM SKU')
param aksNodeSize string = 'Standard_D2s_v3'

@description('PostgreSQL SKU name')
param postgresSkuName string = 'Standard_B2ms'

@description('PostgreSQL SKU tier')
param postgresSkuTier string = 'Burstable'

@description('PostgreSQL storage in GB')
param postgresStorageGB int = 32

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string

@description('Redis SKU name')
param redisSkuName string = 'Basic'

@description('Redis SKU family')
param redisSkuFamily string = 'C'

@description('Redis capacity code')
param redisSkuCapacity int = 0

@description('Storage account replication SKU')
param storageSkuName string = 'Standard_LRS'

@description('ACR SKU')
param acrSkuName string = 'Basic'

// ── 1. Networking ──────────────────────────────────────────────────────────
module network 'modules/network.bicep' = {
  name: 'network'
  params: {
    environment: environment
    location: location
  }
}

// ── 2. Monitoring (Log Analytics must exist before AKS) ───────────────────
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    environment: environment
    location: location
  }
}

// ── 3. Container Registry (must exist before AKS for role assignment) ─────
module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    environment: environment
    location: location
    acrSkuName: acrSkuName
  }
}

// ── 4. AKS (depends on network, monitoring, ACR) ──────────────────────────
module aks 'modules/aks.bicep' = {
  name: 'aks'
  params: {
    environment: environment
    location: location
    aksSubnetId: network.outputs.aksSubnetId
    acrId: acr.outputs.acrId
    logAnalyticsWorkspaceId: monitoring.outputs.workspaceId
    aksNodeCount: aksNodeCount
    aksNodeSize: aksNodeSize
  }
}

// ── 5. Key Vault (depends on AKS for workload identity federation) ─────────
module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    environment: environment
    location: location
    aksKubeletObjectId: aks.outputs.kubeletIdentityObjectId
    aksOidcIssuerUrl: aks.outputs.oidcIssuerUrl
  }
}

// ── 6. Database ────────────────────────────────────────────────────────────
module database 'modules/database.bicep' = {
  name: 'database'
  params: {
    environment: environment
    location: location
    adminPassword: postgresAdminPassword
    postgresSkuName: postgresSkuName
    postgresSkuTier: postgresSkuTier
    postgresStorageGB: postgresStorageGB
    servicesSubnetId: network.outputs.servicesSubnetId
  }
}

// ── 7. Redis ───────────────────────────────────────────────────────────────
module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    environment: environment
    location: location
    redisSkuName: redisSkuName
    redisSkuFamily: redisSkuFamily
    redisSkuCapacity: redisSkuCapacity
  }
}

// ── 8. Blob Storage ────────────────────────────────────────────────────────
module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    environment: environment
    location: location
    storageSkuName: storageSkuName
  }
}

// ── Outputs ────────────────────────────────────────────────────────────────
@description('AKS cluster name — use with: az aks get-credentials --name <clusterName>')
output aksClusterName string = aks.outputs.clusterName

@description('ACR login server URL')
output acrLoginServer string = acr.outputs.loginServer

@description('Key Vault URI')
output keyVaultUri string = keyvault.outputs.vaultUri

@description('Key Vault name — needed for setup-keyvault.sh')
output keyVaultName string = keyvault.outputs.vaultName

@description('Workload identity client ID — add to pod annotations')
output workloadIdentityClientId string = keyvault.outputs.workloadIdentityClientId

@description('PostgreSQL FQDN')
output postgresFqdn string = database.outputs.serverFqdn

@description('Redis hostname')
output redisHostname string = redis.outputs.hostName

@description('Blob Storage account name')
output storageAccountName string = storage.outputs.accountName

@description('Application Insights connection string — add to Key Vault as sbtm-appinsights-connection-string')
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
