// storage.bicep — Azure Blob Storage with containers for videos, OSRM data, and exports

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('Storage replication SKU (Standard_LRS | Standard_ZRS)')
param storageSkuName string = 'Standard_LRS'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'sbtmblob${environment}'
  location: location
  sku: {
    name: storageSkuName
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow' // Tighten to VNET-only for production
    }
  }
}

resource videosContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/videos'
  properties: {
    publicAccess: 'None'
  }
}

resource osrmDataContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/osrm-data'
  properties: {
    publicAccess: 'None'
  }
}

resource exportsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/exports'
  properties: {
    publicAccess: 'None'
  }
}

// Lifecycle policy: move videos to Cool after 30 days, delete after 90 days
resource lifecyclePolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'video-lifecycle'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['videos/']
            }
            actions: {
              baseBlob: {
                tierToCool: { daysAfterModificationGreaterThan: 30 }
                delete: { daysAfterModificationGreaterThan: 90 }
              }
            }
          }
        }
      ]
    }
  }
}

@description('Storage account name')
output accountName string = storageAccount.name

@description('Storage account resource ID')
output accountId string = storageAccount.id

@description('Primary blob endpoint')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
