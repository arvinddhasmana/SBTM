// acr.bicep — Azure Container Registry

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('ACR SKU (Basic | Standard)')
param acrSkuName string = 'Basic'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'sbtmacr${environment}'
  location: location
  sku: {
    name: acrSkuName
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: 'Disabled'
  }
}

@description('ACR resource ID')
output acrId string = acr.id

@description('ACR login server URL')
output loginServer string = acr.properties.loginServer
