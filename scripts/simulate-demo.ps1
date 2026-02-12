# =============================================================================
# SBTM Demo Simulator
# Emits GPS, emergency alerts, late notifications, and route start/complete logs.
# =============================================================================

param(
    [string]$ApiBase = "http://localhost:3001/api/v1",
    [string]$ComplianceApi = "http://localhost:3007",
    [int]$IntervalSeconds = 5,
    [int]$Laps = 3,
    [int]$LateEvery = 2,
    [int]$EmergencyEvery = 3,
    [string]$TrackConfigPath = "$PSScriptRoot\demo-gps-track.json",
    [string]$TrackName = "",
    [switch]$NoPresence,
    [switch]$StrictSeedValidation,
    [switch]$NoAudit,
    [switch]$NoLate,
    [switch]$NoEmergency
)

$ErrorActionPreference = "Continue"

$DefaultBoardId = "b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
$DefaultSchoolId = "c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c"
$SeededRouteIds = @("ROUTE-A", "ROUTE-B", "ROUTE-C")
$SeededVehicleIds = @("BUS-001", "BUS-002", "BUS-003")
$SeededStudentIds = @("STUDENT-001", "STUDENT-002", "STUDENT-003", "STUDENT-004", "STUDENT-005")
$SeededDriverEmails = @("driver1@sbtm.demo", "driver2@sbtm.demo", "driver3@sbtm.demo")
$SeededDriverIds = @("driver-001", "driver-002", "driver-003")

function Invoke-ApiPost {
    param(
        [string]$Url,
        [hashtable]$Body,
        [string]$Token
    )

    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    Invoke-RestMethod -Uri $Url -Method POST -Headers $headers -Body ($Body | ConvertTo-Json) -ContentType "application/json"
}

function Login-User {
    param([string]$Email)
    $body = @{ email = $Email; password = "Admin123!" }
    try {
        return Invoke-ApiPost -Url "$ApiBase/auth/login" -Body $body
    } catch {
        Write-Host "Auth failed for $Email" -ForegroundColor Red
        return $null
    }
}

function Write-AuditLog {
    param(
        [string]$Action,
        [string]$Resource,
        [string]$ResourceId,
        [hashtable]$Details
    )

    if ($NoAudit) { return }

    $payload = @{
        user_id = $adminUser.id
        school_id = $adminUser.schoolId
        action = $Action
        resource = $Resource
        resource_id = $ResourceId
        details = $Details
    }

    try {
        Invoke-ApiPost -Url "$ComplianceApi/audit" -Body $payload | Out-Null
    } catch {
        Write-Host "  Audit log failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

function Get-RouteConfig {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    try {
        $raw = Get-Content -Path $Path -Raw
        return $raw | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse track config at $Path" -ForegroundColor DarkYellow
        return $null
    }
}

function Resolve-TrackRoutes {
    param(
        $config,
        [string]$name
    )

    if (-not $config) {
        return $null
    }

    if ($config.routes -and $config.routes.Count -gt 0) {
        return $config.routes
    }

    if (-not $config.tracks) {
        return $null
    }

    $selectedName = $name
    if (-not $selectedName) {
        $selectedName = $config.defaultTrack
    }

    if (-not $selectedName) {
        $selectedName = ($config.tracks.PSObject.Properties | Select-Object -First 1).Name
    }

    if (-not $selectedName) {
        return $null
    }

    $track = $config.tracks.$selectedName
    if (-not $track) {
        Write-Host "Track '$selectedName' not found in $TrackConfigPath" -ForegroundColor DarkYellow
        return $null
    }

    Write-Host "Using track '$selectedName'" -ForegroundColor DarkGray
    return $track.routes
}

function Validate-TrackRoutes {
    param(
        [array]$Routes
    )

    $issues = @()

    foreach ($route in $Routes) {
        if ($SeededRouteIds -notcontains $route.routeId) {
            $issues += "Unknown routeId '$($route.routeId)'."
        }

        if ($SeededVehicleIds -notcontains $route.vehicleId) {
            $issues += "Unknown vehicleId '$($route.vehicleId)' for route '$($route.routeId)'."
        }

        if ($route.driverEmail -and ($SeededDriverEmails -notcontains $route.driverEmail)) {
            $issues += "Unknown driverEmail '$($route.driverEmail)' for route '$($route.routeId)'."
        }

        if ($route.driverId -and ($SeededDriverIds -notcontains $route.driverId)) {
            $issues += "Unknown driverId '$($route.driverId)' for route '$($route.routeId)'."
        }

        if ($route.students) {
            foreach ($student in $route.students) {
                if ($SeededStudentIds -notcontains $student) {
                    $issues += "Unknown studentId '$student' for route '$($route.routeId)'."
                }
            }
        }

        if ($route.waypoints) {
            foreach ($wp in $route.waypoints) {
                if ($wp.student -and ($SeededStudentIds -notcontains $wp.student)) {
                    $issues += "Unknown waypoint studentId '$($wp.student)' for route '$($route.routeId)'."
                }
            }
        }
    }

    if ($issues.Count -gt 0) {
        Write-Host "Track validation found mismatches with seeded data:" -ForegroundColor Yellow
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }

        if ($StrictSeedValidation) {
            Write-Host "Strict validation enabled. Exiting." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "Authenticating demo users..." -ForegroundColor Cyan
$adminAuth = Login-User -Email "osta.admin@sbtm.demo"
if (-not $adminAuth) { exit 1 }

$adminToken = $adminAuth.accessToken
$adminUser = $adminAuth.user
if (-not $adminUser.schoolId) { $adminUser.schoolId = $DefaultSchoolId }

$driverAuth = @{}
foreach ($email in @("driver1@sbtm.demo", "driver2@sbtm.demo", "driver3@sbtm.demo")) {
    $driverAuth[$email] = Login-User -Email $email
}

$routes = @(
    @{
        routeId = "ROUTE-A"
        vehicleId = "BUS-001"
        driverEmail = "driver1@sbtm.demo"
        driverId = "driver-001"
        students = @("STUDENT-001", "STUDENT-002")
        waypoints = @(
            @{ lat = 45.4215; lng = -75.6972; label = "Start" },
            @{ lat = 45.4230; lng = -75.6950; label = "Stop 1"; student = "STUDENT-001" },
            @{ lat = 45.4250; lng = -75.6900; label = "Stop 2"; student = "STUDENT-002" },
            @{ lat = 45.4280; lng = -75.6880; label = "School" }
        )
    },
    @{
        routeId = "ROUTE-B"
        vehicleId = "BUS-002"
        driverEmail = "driver2@sbtm.demo"
        driverId = "driver-002"
        students = @("STUDENT-003")
        waypoints = @(
            @{ lat = 45.3800; lng = -75.7000; label = "Start" },
            @{ lat = 45.3850; lng = -75.7050; label = "Stop 1"; student = "STUDENT-003" },
            @{ lat = 45.3900; lng = -75.7100; label = "Stop 2" },
            @{ lat = 45.4000; lng = -75.7200; label = "School" }
        )
    },
    @{
        routeId = "ROUTE-C"
        vehicleId = "BUS-003"
        driverEmail = "driver3@sbtm.demo"
        driverId = "driver-003"
        students = @("STUDENT-005")
        waypoints = @(
            @{ lat = 45.4100; lng = -75.7100; label = "Start" },
            @{ lat = 45.4120; lng = -75.7080; label = "Stop 1"; student = "STUDENT-005" },
            @{ lat = 45.4150; lng = -75.7050; label = "School" }
        )
    }
)

$trackConfig = Get-RouteConfig -Path $TrackConfigPath
$resolvedRoutes = Resolve-TrackRoutes -config $trackConfig -name $TrackName
if ($resolvedRoutes -and $resolvedRoutes.Count -gt 0) {
    $routes = $resolvedRoutes
    Write-Host "Loaded track config from $TrackConfigPath" -ForegroundColor DarkGray
} else {
    Write-Host "Using built-in demo track (no config found)." -ForegroundColor DarkGray
}

Validate-TrackRoutes -Routes $routes

$maxSteps = ($routes | ForEach-Object { $_.waypoints.Count } | Measure-Object -Maximum).Maximum
if (-not $maxSteps -or $maxSteps -lt 1) {
    Write-Host "No waypoints configured. Check the track config." -ForegroundColor Red
    exit 1
}

Write-Host "Starting demo simulation..." -ForegroundColor Cyan
Write-Host "GPS interval: $IntervalSeconds sec, laps: $Laps" -ForegroundColor DarkGray
Write-Host "Presence tracking: $(if ($NoPresence) { 'Disabled' } else { 'Enabled (default)' })" -ForegroundColor DarkGray

# Track route start times for schedule-based late detection
$routeStartTimes = @{}
$routeExpectedDurations = @{
    "ROUTE-A" = 30  # minutes from start to finish
    "ROUTE-B" = 35
    "ROUTE-C" = 25
}

for ($lap = 1; $lap -le $Laps; $lap++) {
    Write-Host "Lap $lap/$Laps" -ForegroundColor Magenta

    for ($step = 0; $step -lt $maxSteps; $step++) {
        foreach ($route in $routes) {
            if (-not $route.waypoints -or $route.waypoints.Count -le $step) {
                continue
            }

            $wp = $route.waypoints[$step]
            $timestamp = (Get-Date).ToUniversalTime().ToString("o")
            $driverToken = $driverAuth[$route.driverEmail].accessToken
            $tokenToUse = $driverToken
            if (-not $tokenToUse) { $tokenToUse = $adminToken }

            # Use speedKph from waypoint if available, otherwise default to 30
            $speedKph = if ($wp.speedKph -ne $null) { $wp.speedKph } else { 30 }

            # Track route start time for schedule-based late detection
            if ($lap -eq 1 -and $step -eq 0) {
                $routeStartTimes[$route.routeId] = Get-Date
                Write-AuditLog -Action "ROUTE_STARTED" -Resource "route" -ResourceId $route.routeId -Details @{
                    vehicleId = $route.vehicleId
                    driverId = $route.driverId
                    simulated = $true
                }
            }

            $gpsPayload = @{
                vehicleId = $route.vehicleId
                routeId = $route.routeId
                timestamp = $timestamp
                lat = $wp.lat
                lng = $wp.lng
                speedKph = $speedKph
            }

            try {
                Invoke-ApiPost -Url "$ApiBase/routes/locations" -Body $gpsPayload -Token $tokenToUse | Out-Null
                Write-Host "$($route.vehicleId): $($wp.label)" -ForegroundColor Green
            } catch {
                Write-Host "GPS failed for $($route.vehicleId): $($_.Exception.Message)" -ForegroundColor Red
            }

            # Pause at stop if pauseSeconds is specified
            if ($wp.pauseSeconds -and $wp.pauseSeconds -gt 0) {
                Write-Host "  Pausing for $($wp.pauseSeconds) seconds..." -ForegroundColor DarkGray
                Start-Sleep -Seconds $wp.pauseSeconds
            }

            if (-not $NoPresence -and $wp.student) {
                $presencePayload = @{
                    studentId = $wp.student
                    vehicleId = $route.vehicleId
                    routeId = $route.routeId
                    eventType = "BOARD"
                    timestamp = $timestamp
                    source = "MANUAL"
                }
                try {
                    Invoke-ApiPost -Url "$ApiBase/student-presence-events" -Body $presencePayload -Token $tokenToUse | Out-Null
                    Write-Host "  Presence BOARD: $($wp.student)" -ForegroundColor DarkGreen
                } catch {
                    Write-Host "  Presence failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
                }
            }

            # Schedule-based late detection at labeled stops
            if (-not $NoLate -and $wp.label -and $wp.label -match "Stop" -and $routeStartTimes.ContainsKey($route.routeId)) {
                $elapsedMinutes = ((Get-Date) - $routeStartTimes[$route.routeId]).TotalMinutes
                $expectedMinutes = $routeExpectedDurations[$route.routeId] * ($step / $route.waypoints.Count)
                $delayMinutes = [Math]::Round($elapsedMinutes - $expectedMinutes, 1)

                # Trigger late notification if delay exceeds 5 minutes
                if ($delayMinutes -gt 5) {
                    $latePayload = @{
                        vehicleId = $route.vehicleId
                        routeId = $route.routeId
                        driverId = $route.driverId
                        timestamp = $timestamp
                        lat = $wp.lat
                        lng = $wp.lng
                        eventType = "OTHER"
                    }
                    try {
                        Invoke-ApiPost -Url "$ApiBase/emergency-events" -Body $latePayload -Token $tokenToUse | Out-Null
                        Write-Host "  Late notice: $([Math]::Round($delayMinutes, 0)) min behind schedule" -ForegroundColor Yellow
                        Write-AuditLog -Action "ROUTE_DELAY" -Resource "route" -ResourceId $route.routeId -Details @{
                            vehicleId = $route.vehicleId
                            driverId = $route.driverId
                            stopName = $wp.label
                            delayMinutes = $delayMinutes
                            reason = "Behind schedule"
                            simulated = $true
                        }
                    } catch {
                        Write-Host "  Late notice failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
                    }
                }
            }

            if (-not $NoEmergency -and $EmergencyEvery -gt 0 -and ($lap % $EmergencyEvery -eq 0) -and $wp.label -eq "Stop 1") {
                $panicPayload = @{
                    vehicleId = $route.vehicleId
                    routeId = $route.routeId
                    driverId = $route.driverId
                    timestamp = $timestamp
                    lat = $wp.lat
                    lng = $wp.lng
                    eventType = "PANIC_BUTTON"
                }
                try {
                    Invoke-ApiPost -Url "$ApiBase/emergency-events" -Body $panicPayload -Token $tokenToUse | Out-Null
                    Write-Host "  Emergency PANIC alert sent" -ForegroundColor Red
                } catch {
                    Write-Host "  Emergency failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
                }
            }

            if ($lap -eq $Laps -and $step -eq ($route.waypoints.Count - 1)) {
                Write-AuditLog -Action "ROUTE_COMPLETED" -Resource "route" -ResourceId $route.routeId -Details @{
                    vehicleId = $route.vehicleId
                    driverId = $route.driverId
                    simulated = $true
                }
            }
        }

        Start-Sleep -Seconds $IntervalSeconds
    }
}

Write-Host "Simulation complete." -ForegroundColor Cyan
