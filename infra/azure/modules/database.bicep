// database.bicep — Azure Database for PostgreSQL Flexible Server with PostGIS

@description('Deployment environment')
param environment string

@description('PostgreSQL flexible server name')
param serverName string = 'sbtm-pg-${environment}'

@description('Azure region')
param location string

@description('PostgreSQL administrator login')
param adminLogin string = 'sbtmadmin'

@description('PostgreSQL administrator password — stored in Key Vault after provisioning')
@secure()
param adminPassword string

@description('PostgreSQL SKU name')
param postgresSkuName string = 'Standard_B2ms'

@description('PostgreSQL SKU tier')
param postgresSkuTier string = 'Burstable'

@description('PostgreSQL storage in GB')
param postgresStorageGB int = 32

@description('Services subnet ID for private endpoint')
param servicesSubnetId string

@description('Use delegated subnet + private DNS for PostgreSQL networking')
param usePrivateNetwork bool = true

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: postgresSkuName
    tier: postgresSkuTier
  }
  properties: union({
    administratorLogin: adminLogin
    administratorLoginPassword: adminPassword
    version: '15'
    storage: {
      storageSizeGB: postgresStorageGB
    }
    backup: {
      backupRetentionDays: environment == 'production' ? 35 : 7
      geoRedundantBackup: environment == 'production' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'production' ? 'ZoneRedundant' : 'Disabled'
    }
  }, usePrivateNetwork ? {
    network: {
      delegatedSubnetResourceId: servicesSubnetId
      privateDnsZoneArmResourceId: privateDnsZone.id
    }
  } : {})
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'sbms'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Enable PostGIS and other extensions
resource postgresConfig 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-06-01-preview' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'POSTGIS,UUID-OSSP,PG_STAT_STATEMENTS'
    source: 'user-override'
  }
}

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = if (usePrivateNetwork) {
  name: 'sbtm-pg-${environment}.private.postgres.database.azure.com'
  location: 'global'
}

resource postgresFirewallAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = if (!usePrivateNetwork) {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

@description('PostgreSQL server FQDN')
output serverFqdn string = postgresServer.properties.fullyQualifiedDomainName

@description('PostgreSQL server name')
output serverName string = postgresServer.name

@description('Database name')
output databaseName string = postgresDatabase.name
