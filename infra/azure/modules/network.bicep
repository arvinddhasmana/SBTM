// network.bicep — VNET, subnets, and NSGs for SBTM AKS deployment

@description('Deployment environment (demo | production)')
param environment string

@description('Azure region')
param location string

resource vnet 'Microsoft.Network/virtualNetworks@2023-06-01' = {
  name: 'sbtm-vnet-${environment}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'aks-subnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: { id: aksNsg.id }
        }
      }
      {
        name: 'services-subnet'
        properties: {
          addressPrefix: '10.0.2.0/24'
          networkSecurityGroup: { id: servicesNsg.id }
        }
      }
    ]
  }
}

resource aksNsg 'Microsoft.Network/networkSecurityGroups@2023-06-01' = {
  name: 'sbtm-aks-nsg-${environment}'
  location: location
  properties: {
    securityRules: [
      {
        name: 'allow-https-inbound'
        properties: {
          priority: 100
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        name: 'allow-http-inbound'
        properties: {
          priority: 110
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
    ]
  }
}

resource servicesNsg 'Microsoft.Network/networkSecurityGroups@2023-06-01' = {
  name: 'sbtm-services-nsg-${environment}'
  location: location
  properties: {
    securityRules: [
      {
        name: 'deny-internet-inbound'
        properties: {
          priority: 100
          protocol: '*'
          access: 'Deny'
          direction: 'Inbound'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

@description('AKS subnet resource ID')
output aksSubnetId string = vnet.properties.subnets[0].id

@description('Services subnet resource ID (for PostgreSQL and Redis private endpoints)')
output servicesSubnetId string = vnet.properties.subnets[1].id

@description('VNET resource ID')
output vnetId string = vnet.id
