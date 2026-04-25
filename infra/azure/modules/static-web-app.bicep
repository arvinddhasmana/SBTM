// static-web-app.bicep — Azure Static Web Apps for admin and parent portals
// SWA is only available in a subset of regions; we pin to centralus regardless of
// the surrounding stack location since SWA content is globally CDN'd anyway.

@description('Deployment environment')
param environment string

@description('Static Web App SKU: Free (demo) or Standard (production)')
@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

@description('Common tags applied to resources')
param tags object = {}

var swaLocation = 'centralus'

resource adminPortal 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'sbtm-admin-${environment}'
  location: swaLocation
  tags: tags
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties: {
    // We deploy via the SWA CLI from bootstrap.sh — no GitHub provider linkage.
    provider: 'None'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

resource parentPortal 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'sbtm-parent-${environment}'
  location: swaLocation
  tags: tags
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties: {
    provider: 'None'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Disabled'
  }
}

@description('Default *.azurestaticapps.net hostname for the admin portal')
output adminPortalDefaultHostname string = adminPortal.properties.defaultHostname

@description('Default *.azurestaticapps.net hostname for the parent portal')
output parentPortalDefaultHostname string = parentPortal.properties.defaultHostname

@description('Resource name of the admin portal Static Web App')
output adminPortalName string = adminPortal.name

@description('Resource name of the parent portal Static Web App')
output parentPortalName string = parentPortal.name

@description('SWA region (pinned to centralus)')
output swaLocation string = swaLocation
