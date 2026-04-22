// monitoring.bicep — Log Analytics workspace and Application Insights

@description('Deployment environment')
param environment string

@description('Azure region')
param location string

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'sbtm-logs-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: environment == 'production' ? 90 : 30
    workspaceCapping: {
      dailyQuotaGb: environment == 'production' ? 5 : 1
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'sbtm-appinsights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    SamplingPercentage: environment == 'production' ? 50 : 100
  }
}

@description('Log Analytics workspace resource ID')
output workspaceId string = logAnalyticsWorkspace.id

@description('Log Analytics workspace customer ID')
output workspaceCustomerId string = logAnalyticsWorkspace.properties.customerId

@description('Application Insights connection string')
output appInsightsConnectionString string = appInsights.properties.ConnectionString

@description('Application Insights instrumentation key')
output instrumentationKey string = appInsights.properties.InstrumentationKey
