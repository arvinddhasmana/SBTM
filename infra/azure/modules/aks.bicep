// aks.bicep — AKS cluster with system and app node pools

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('AKS subnet resource ID')
param aksSubnetId string

@description('Azure Container Registry resource ID for ACR pull role assignment')
param acrId string

@description('Log Analytics workspace resource ID for Container Insights')
param logAnalyticsWorkspaceId string

@description('Initial app node pool count')
param aksNodeCount int = 2

@description('App node pool VM SKU')
param aksNodeSize string = 'Standard_D2s_v3'

resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-01-01' = {
  name: 'sbtm-aks-${environment}'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Base'
    tier: 'Standard'
  }
  properties: {
    dnsPrefix: 'sbtm-${environment}'
    kubernetesVersion: '1.29'

    agentPoolProfiles: [
      {
        name: 'systempool'
        count: 1
        vmSize: 'Standard_D2s_v3'
        osType: 'Linux'
        mode: 'System'
        vnetSubnetID: aksSubnetId
        enableAutoScaling: false
        nodeTaints: ['CriticalAddonsOnly=true:NoSchedule']
      }
      {
        name: 'apppool'
        count: aksNodeCount
        vmSize: aksNodeSize
        osType: 'Linux'
        mode: 'User'
        vnetSubnetID: aksSubnetId
        enableAutoScaling: true
        minCount: 1
        maxCount: 5
      }
    ]

    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'azure'
      serviceCidr: '10.1.0.0/16'
      dnsServiceIP: '10.1.0.10'
    }

    addonProfiles: {
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalyticsWorkspaceId
        }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: {
          enableSecretRotation: 'true'
          rotationPollInterval: '2m'
        }
      }
    }

    oidcIssuerProfile: {
      enabled: true
    }

    securityProfile: {
      workloadIdentity: {
        enabled: true
      }
    }
  }
}

// Grant AKS managed identity pull access to ACR
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrId, aksCluster.id, 'acrpull')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: aksCluster.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}

@description('AKS cluster name')
output clusterName string = aksCluster.name

@description('AKS cluster OIDC issuer URL')
output oidcIssuerUrl string = aksCluster.properties.oidcIssuerProfile.issuerURL

@description('AKS kubelet managed identity object ID')
output kubeletIdentityObjectId string = aksCluster.properties.identityProfile.kubeletidentity.objectId
