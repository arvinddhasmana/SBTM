// redis.bicep — Azure Cache for Redis

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

@description('Redis SKU name (Basic | Standard | Premium)')
param redisSkuName string = 'Basic'

@description('Redis SKU family (C for Basic/Standard, P for Premium)')
param redisSkuFamily string = 'C'

@description('Redis capacity code (0=250MB, 1=1GB, 2=6GB, 3=13GB)')
param redisSkuCapacity int = 0

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'sbtm-redis-${environment}'
  location: location
  properties: {
    sku: {
      name: redisSkuName
      family: redisSkuFamily
      capacity: redisSkuCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: environment == 'production' ? {
      'aof-backup-enabled': 'true'
      'rdb-backup-enabled': 'true'
      'rdb-backup-frequency': '60'
    } : {}
  }
}

@description('Redis hostname')
output hostName string = redisCache.properties.hostName

@description('Redis SSL port')
output sslPort int = redisCache.properties.sslPort

@description('Redis resource ID')
output redisId string = redisCache.id
