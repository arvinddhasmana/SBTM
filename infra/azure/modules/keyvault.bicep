// keyvault.bicep — Azure Key Vault with access policies for AKS workload identity

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('AKS kubelet managed identity object ID')
param aksKubeletObjectId string

@description('AKS cluster OIDC issuer URL for workload identity federation')
param aksOidcIssuerUrl string

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'sbtm-kv-${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Allow' // Restrict to VNET for production
      bypass: 'AzureServices'
    }
  }
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
