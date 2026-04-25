// dns.bicep — Azure DNS public zone for the SBTM custom domain
// Conditional: only created when manageDnsZone is true. The user must delegate
// the domain at their registrar to the four NS records emitted as outputs.

@description('Public DNS zone name (e.g. sbtm.ca). Empty string disables the zone.')
param zoneName string

@description('Whether to create the zone (false = skip; outputs will be empty)')
param manageDnsZone bool = true

@description('Common tags applied to the zone')
param tags object = {}

resource zone 'Microsoft.Network/dnsZones@2018-05-01' = if (manageDnsZone && !empty(zoneName)) {
  name: zoneName
  location: 'global'
  tags: tags
  properties: {
    zoneType: 'Public'
  }
}

@description('Name servers to delegate at the domain registrar (4 entries)')
output nameServers array = (manageDnsZone && !empty(zoneName)) ? zone!.properties.nameServers : []

@description('Resource name of the DNS zone (or empty string when not managed)')
output zoneResourceName string = (manageDnsZone && !empty(zoneName)) ? zone!.name : ''
