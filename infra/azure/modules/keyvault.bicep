// keyvault.bicep — Azure Key Vault with access policies for AKS workload identity

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('AKS kubelet managed identity object ID')
param aksKubeletObjectId string

@description('AKS cluster OIDC issuer URL for workload identity federation')
param aksOidcIssuerUrl string

@description('Optional suffix appended to the Key Vault name (e.g. "-cc") to avoid collisions with soft-deleted vaults of the same base name.')
param kvNameSuffix string = ''

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'sbtm-kv-${environment}${kvNameSuffix}'
  location: location
  properties: union({
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    networkAcls: {
      defaultAction: 'Allow' // Restrict to VNET for production
      bypass: 'AzureServices'
    }
  // Purge protection is required for production (compliance / accidental-delete
  // protection) but actively harmful for ephemeral demo environments because it
  // locks the vault name globally for 7 days after deletion, blocking redeploys.
  // Azure rejects an explicit `enablePurgeProtection: false`, so we OMIT the
  // property entirely for non-production via a conditional union.
  }, environment == 'production' ? { enablePurgeProtection: true } : {})
}

// User-assigned managed identity for AKS pods to read Key Vault secrets
resource aksWorkloadIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'sbtm-workload-identity-${environment}'
  location: location
}

// Federated credential so AKS service account can assume this managed identity.
// The federated subject's namespace is environment-driven so the same identity
// works on the demo cluster (sbtm-demo namespace) and the production cluster
// (sbtm-production namespace).
resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: aksWorkloadIdentity
  name: 'sbtm-aks-federation'
  properties: {
    issuer: aksOidcIssuerUrl
    subject: 'system:serviceaccount:sbtm-${environment}:sbtm-workload-sa'
    audiences: ['api://AzureADTokenExchange']
  }
}

// Grant workload identity Key Vault Secrets User role
resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, aksWorkloadIdentity.id, 'kvsecretsuser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: aksWorkloadIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

@description('Key Vault URI')
output vaultUri string = keyVault.properties.vaultUri

@description('Key Vault name')
output vaultName string = keyVault.name

@description('Workload identity client ID (used in pod annotations)')
output workloadIdentityClientId string = aksWorkloadIdentity.properties.clientId

@description('Workload identity resource ID')
output workloadIdentityId string = aksWorkloadIdentity.id
