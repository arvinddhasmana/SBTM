# =============================================================================
# SBTM Demo Verification
# Verifies seeded users/roles, tenant entities, and login credentials.
# =============================================================================

param(
    [string]$DatabaseUser = "postgres",
    [string]$DatabaseName = "sbms",
    [string]$ApiBase = "http://localhost:3001/api/v1"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "--- SBTM Demo Verification ---" -ForegroundColor Cyan

function Run-Q {
    param(
        [string]$Label,
        [string]$Sql
    )
    Write-Host $Label -ForegroundColor Yellow
    $file = Join-Path $ScriptDir "verify.sql"
    $Sql | Out-File -FilePath $file -Encoding utf8
    docker cp $file "sbtm_antigravity-postgres-1:/tmp/verify.sql" | Out-Null
    docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -t -f /tmp/verify.sql
}

function Test-Login {
    param([string]$Email)
    try {
        $body = @{ email = $Email; password = "Admin123!" } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method POST -Body $body -ContentType "application/json"
        if ($res.accessToken) {
            Write-Host "  OK: $Email" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "  FAIL: $Email -> $($_.Exception.Message)" -ForegroundColor Red
    }
    return $false
}

function Get-AuthHeader {
    param([string]$Email)
    $body = @{ email = $Email; password = "Admin123!" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method POST -Body $body -ContentType "application/json"
    return @{ Authorization = "Bearer $($res.accessToken)" }
}

function Test-ApiList {
    param(
        [string]$Label,
        [string]$Url,
        [hashtable]$Headers
    )
    try {
        $res = Invoke-RestMethod -Uri $Url -Method GET -Headers $Headers
        if ($null -eq $res) {
            Write-Host "  FAIL: $Label -> null" -ForegroundColor Red
            return $false
        }

        if ($res -is [System.Array]) {
            Write-Host "  OK: $Label -> $($res.Count)" -ForegroundColor Green
            return $true
        }

        if ($res.items -and ($res.items -is [System.Array])) {
            Write-Host "  OK: $Label -> $($res.items.Count)" -ForegroundColor Green
            return $true
        }

        Write-Host "  WARN: $Label -> unexpected shape" -ForegroundColor Yellow
        return $true
    }
    catch {
        Write-Host "  FAIL: $Label -> $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ApiGet {
    param(
        [string]$Label,
        [string]$Url,
        [hashtable]$Headers,
        [int]$ExpectedStatus = 200
    )
    try {
        $res = Invoke-RestMethod -Uri $Url -Method GET -Headers $Headers -ErrorAction Stop
        if ($ExpectedStatus -eq 200) {
            Write-Host "  OK: $Label" -ForegroundColor Green
            return $true
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "  OK: $Label (expected $ExpectedStatus)" -ForegroundColor Green
            return $true
        }
        Write-Host "  FAIL: $Label -> $statusCode $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    Write-Host "  WARN: $Label -> unexpected response" -ForegroundColor Yellow
    return $false
}

function Wait-ApiHealth {
    param([string]$Url)
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $health = Invoke-RestMethod -Uri $Url -Method GET
            if ($health) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }
    return $false
}

Run-Q -Label "Tenant entities:" -Sql @"
SELECT 'school_boards', COUNT(*) FROM school_boards;
SELECT 'schools', COUNT(*) FROM schools;
"@

Run-Q -Label "Users by role (expected admins: OSTA_ADMIN and SCHOOL_ADMIN only):" -Sql @"
SELECT role, COUNT(*) FROM users WHERE email LIKE '%@sbtm.demo' GROUP BY role ORDER BY role;
"@

Run-Q -Label "Seeded demo users:" -Sql @"
SELECT email, role, "schoolId", "boardId" FROM users WHERE email LIKE '%@sbtm.demo' ORDER BY email;
"@

Run-Q -Label "Seeded students and references:" -Sql @"
SELECT 'students_reference', COUNT(*) FROM students_reference;
SELECT 'presence_event', COUNT(*) FROM presence_event;
SELECT 'student_tag', COUNT(*) FROM student_tag;
"@

Write-Host "Login verification (Admin123!):" -ForegroundColor Yellow
$isApiReady = Wait-ApiHealth -Url "$ApiBase/health"
if (-not $isApiReady) {
    Write-Host "  FAIL: API gateway is not reachable at $ApiBase" -ForegroundColor Red
    exit 1
}

$emails = @(
    "osta.admin@sbtm.demo",
    "school.admin@sbtm.demo",
    "driver1@sbtm.demo",
    "parent1@sbtm.demo"
)

$allPassed = $true
foreach ($email in $emails) {
    if (-not (Test-Login -Email $email)) {
        $allPassed = $false
    }
}

Write-Host "API demo data checks (as OSTA admin):" -ForegroundColor Yellow
try {
    $headers = Get-AuthHeader -Email "osta.admin@sbtm.demo"
    $okVehicles = Test-ApiList -Label "/vehicles" -Url "$ApiBase/vehicles" -Headers $headers
    $okStudents = Test-ApiList -Label "/students" -Url "$ApiBase/students" -Headers $headers
    if (-not $okVehicles -or -not $okStudents) {
        $allPassed = $false
    }
}
catch {
    Write-Host "  FAIL: API checks -> $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "Authorization checks (live location and students endpoints):" -ForegroundColor Yellow
try {
    # Test OSTA Admin access
    $ostaHeaders = Get-AuthHeader -Email "osta.admin@sbtm.demo"
    $okOstaLive = Test-ApiGet -Label "OSTA Admin: /routes/locations" -Url "$ApiBase/routes/locations" -Headers $ostaHeaders
    $okOstaStudents = Test-ApiGet -Label "OSTA Admin: /routes/ROUTE-A/students" -Url "$ApiBase/routes/ROUTE-A/students" -Headers $ostaHeaders

    # Test Parent access (should succeed for their child's route)
    $parent1Headers = Get-AuthHeader -Email "parent1@sbtm.demo"
    $okParentLive = Test-ApiGet -Label "Parent1: /routes/ROUTE-A/live-location" -Url "$ApiBase/routes/ROUTE-A/live-location" -Headers $parent1Headers

    # Test Parent access to unassigned route (should fail with 403)
    $okParentDenied = Test-ApiGet -Label "Parent1: /routes/ROUTE-B/live-location (expect 403)" -Url "$ApiBase/routes/ROUTE-B/live-location" -Headers $parent1Headers -ExpectedStatus 403

    if (-not ($okOstaLive -and $okOstaStudents -and $okParentLive -and $okParentDenied)) {
        $allPassed = $false
    }
}
catch {
    Write-Host "  FAIL: Authorization checks -> $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}

Write-Host "GPS data storage verification:" -ForegroundColor Yellow
Run-Q -Label "Location points in database:" -Sql @"
SELECT COUNT(*) as location_count FROM location_points;
SELECT route_id, COUNT(*) as points FROM location_points GROUP BY route_id ORDER BY route_id;
"@

if ($allPassed) {
    Write-Host "Verification passed." -ForegroundColor Green
    exit 0
}

Write-Host "Verification found issues." -ForegroundColor Red
exit 1
