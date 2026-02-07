# =============================================================================
# SBTM Simulator (Final)
# =============================================================================

param(
    [string]$Api = "http://localhost:3001/api/v1",
    [int]$Secs = 5,
    [switch]$Board,
    [switch]$Event
)

$ErrorActionPreference = "Continue"

# Auth
$ts = @{}
$us = @("driver1@sbtm.demo", "driver2@sbtm.demo")
foreach ($u in $us) {
    $b = @{ email = $u; password = "Admin123!" } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri "$Api/auth/login" -Method POST -Body $b -ContentType "application/json"
        $ts[$u] = $r.accessToken
    }
    catch { Write-Host "Auth fail: $u" }
}

# Data
$bs = @(
    @{ id = "BUS-001"; r = "ROUTE-A"; d = "driver1@sbtm.demo"; w = @(
            @{ lat = 45.4215; lng = -75.6972; l = "Start" },
            @{ lat = 45.4225; lng = -75.6950; l = "Stop 1"; s = "STUDENT-001" },
            @{ lat = 45.4240; lng = -75.6930; l = "Stop 2"; s = "STUDENT-002" },
            @{ lat = 45.4260; lng = -75.6900; l = "School" }
        )
    },
    @{ id = "BUS-002"; r = "ROUTE-B"; d = "driver2@sbtm.demo"; w = @(
            @{ lat = 45.4500; lng = -75.7500; l = "Start" },
            @{ lat = 45.4510; lng = -75.7520; l = "Stop 1"; s = "STUDENT-003" },
            @{ lat = 45.4525; lng = -75.7550; l = "Stop 2" },
            @{ lat = 45.4550; lng = -75.7600; l = "School" }
        )
    }
)

Write-Host "Simulating... (Ctrl+C)"
$i = 0
while ($true) {
    foreach ($b in $bs) {
        $wp = $b.w[$i % $b.w.Count]
        $n = (Get-Date).ToUniversalTime().ToString("o")
        
        # GPS
        $g = @{ vehicleId = $b.id; routeId = $b.r; timestamp = $n; lat = $wp.lat; lng = $wp.lng; speedKph = 30 } | ConvertTo-Json
        try { Invoke-RestMethod -Uri "http://localhost:3002/api/v1/locations" -Method POST -Body $g -ContentType "application/json" | Out-Null } catch {}
        Write-Host "$($b.id): $($wp.l)"
        
        # Board
        if ($Board -and $wp.s -and $wp.l -match "Stop") {
            $p = @{ studentId = $wp.s; vehicleId = $b.id; routeId = $b.r; eventType = "BOARD"; timestamp = $n; source = "SMART_TAG" } | ConvertTo-Json
            $h = @{ "Authorization" = "Bearer $($ts[$b.d])" }
            try { 
                Invoke-RestMethod -Uri "$Api/presence/events" -Method POST -Headers $h -Body $p -ContentType "application/json" | Out-Null 
                Write-Host "  Board: $($wp.s)" -ForegroundColor Green
            }
            catch {
                Write-Host "  Board FAIL: $($_.Exception.Message)" -ForegroundColor Red
            }
        }

        # Emergency
        if ($Event -and (Get-Random -Minimum 1 -Maximum 5) -eq 3) {
            $p = @{ vehicleId = $b.id; routeId = $b.r; driverId = "driver-001"; timestamp = $n; lat = $wp.lat; lng = $wp.lng; eventType = "PANIC_BUTTON" } | ConvertTo-Json
            $h = @{ "Authorization" = "Bearer $($ts[$b.d])" }
            try {
                Invoke-RestMethod -Uri "$Api/emergency-events" -Method POST -Headers $h -Body $p -ContentType "application/json" | Out-Null
                Write-Host "  PANIC: $($b.id)" -ForegroundColor Yellow
            }
            catch {
                Write-Host "  Panic FAIL: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    $i++
    Start-Sleep -Sec $Secs
}
