# =============================================================================
# SBTM Live Demo Simulator
# =============================================================================
# This script simulates real-time bus tracking, student boarding, and alerts
# Use this when physical devices are not available for demo
# =============================================================================

param(
    [string]$ApiBaseUrl = "http://localhost:3001/api/v1",
    [string]$DriverEmail = "driver1@sbtm.demo",
    [string]$DriverPassword = "Driver123!",
    [string]$VehicleId = "BUS-001",
    [string]$RouteId = "ROUTE-A",
    [int]$IntervalSeconds = 5,
    [switch]$SimulateBoarding,
    [switch]$SimulateEmergency
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SBTM Live Demo Simulator" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# 1. Authenticate
# =============================================================================

Write-Host "[1/3] Authenticating as driver..." -ForegroundColor Yellow

$loginBody = @{
    email    = $DriverEmail
    password = $DriverPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.accessToken
    Write-Host "  ✓ Authenticated successfully!" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Authentication failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# =============================================================================
# 2. Define Route Simulation Path
# =============================================================================

# Simulated route waypoints (Ottawa area coordinates)
$routeWaypoints = @(
    @{ lat = 45.4215; lng = -75.6972; label = "Start - Depot" },
    @{ lat = 45.4218; lng = -75.6965; label = "Heading to Stop 1" },
    @{ lat = 45.4222; lng = -75.6958; label = "Approaching Stop 1" },
    @{ lat = 45.4225; lng = -75.6950; label = "Stop 1 - Maple Street" },
    @{ lat = 45.4230; lng = -75.6945; label = "Heading to Stop 2" },
    @{ lat = 45.4235; lng = -75.6940; label = "Approaching Stop 2" },
    @{ lat = 45.4240; lng = -75.6930; label = "Stop 2 - Pine Road" },
    @{ lat = 45.4245; lng = -75.6920; label = "Heading to Stop 3" },
    @{ lat = 45.4250; lng = -75.6915; label = "Approaching Stop 3" },
    @{ lat = 45.4260; lng = -75.6900; label = "Stop 3 - School Arrival" }
)

# Students to board at each stop
$studentsAtStops = @{
    "Stop 1 - Maple Street" = "STUDENT-001"  # Emma
    "Stop 2 - Pine Road"    = "STUDENT-002"     # Liam
}

Write-Host ""
Write-Host "[2/3] Route configuration:" -ForegroundColor Yellow
Write-Host "  Vehicle: $VehicleId" -ForegroundColor Gray
Write-Host "  Route: $RouteId" -ForegroundColor Gray
Write-Host "  Waypoints: $($routeWaypoints.Count)" -ForegroundColor Gray
Write-Host "  Update interval: ${IntervalSeconds}s" -ForegroundColor Gray

# =============================================================================
# 3. Run Simulation
# =============================================================================

Write-Host ""
Write-Host "[3/3] Starting simulation..." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$waypointIndex = 0

while ($true) {
    $waypoint = $routeWaypoints[$waypointIndex]
    $timestamp = (Get-Date).ToUniversalTime().ToString("o")
    
    # Calculate simulated speed and heading
    $speed = if ($waypoint.label -match "Stop") { 0 } else { Get-Random -Minimum 25 -Maximum 45 }
    $heading = Get-Random -Minimum 0 -Maximum 360
    
    # Send GPS location
    $locationBody = @{
        vehicleId      = $VehicleId
        routeId        = $RouteId
        timestamp      = $timestamp
        lat            = $waypoint.lat
        lng            = $waypoint.lng
        speedKph       = $speed
        headingDeg     = $heading
        accuracyMeters = 5
    } | ConvertTo-Json

    try {
        # Note: GPS endpoint may be at GPS service directly or via gateway
        $gpsUrl = "http://localhost:3002/api/v1/locations"
        Invoke-RestMethod -Uri $gpsUrl -Method POST -Body $locationBody -ContentType "application/json" | Out-Null
        
        $statusIcon = if ($speed -eq 0) { "⏹" } else { "🚌" }
        Write-Host "$statusIcon [$timestamp] $($waypoint.label) - Speed: ${speed}km/h" -ForegroundColor White
        
    }
    catch {
        Write-Host "  ⚠ GPS update failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Simulate student boarding at stops
    if ($SimulateBoarding -and $waypoint.label -match "^Stop") {
        $stopName = $waypoint.label
        if ($studentsAtStops.ContainsKey($stopName)) {
            $studentId = $studentsAtStops[$stopName]
            
            $presenceBody = @{
                studentId      = $studentId
                vehicleId      = $VehicleId
                routeId        = $RouteId
                eventType      = "BOARD"
                timestamp      = $timestamp
                source         = "SMARTTAG"
                signalStrength = -55
            } | ConvertTo-Json
            
            try {
                Invoke-RestMethod -Uri "$ApiBaseUrl/student-presence-events" -Method POST -Headers $headers -Body $presenceBody | Out-Null
                Write-Host "  👦 Student $studentId BOARDED" -ForegroundColor Green
            }
            catch {
                Write-Host "  ⚠ Presence event failed: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
    
    # Simulate emergency (one time at mid-route)
    if ($SimulateEmergency -and $waypointIndex -eq 5) {
        $emergencyBody = @{
            vehicleId = $VehicleId
            routeId   = $RouteId
            driverId  = "DRV-001"
            eventType = "PANIC_BUTTON"
            timestamp = $timestamp
            lat       = $waypoint.lat
            lng       = $waypoint.lng
        } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Uri "$ApiBaseUrl/emergency-events" -Method POST -Headers $headers -Body $emergencyBody | Out-Null
            Write-Host "  🚨 EMERGENCY ALERT TRIGGERED!" -ForegroundColor Red
            $SimulateEmergency = $false  # Only trigger once
        }
        catch {
            Write-Host "  ⚠ Emergency event failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    # Move to next waypoint
    $waypointIndex++
    if ($waypointIndex -ge $routeWaypoints.Count) {
        $waypointIndex = 0
        Write-Host ""
        Write-Host "  🔄 Route completed! Restarting from depot..." -ForegroundColor Cyan
        Write-Host ""
    }
    
    Start-Sleep -Seconds $IntervalSeconds
}
