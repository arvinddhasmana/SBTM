# =============================================================================
# SBTM Verify (Refined)
# =============================================================================

param(
    [string]$U = "postgres",
    [string]$D = "sbms"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "--- Verify ---" -ForegroundColor Cyan

function Run-Q($l, $s) {
    Write-Host "$l" -ForegroundColor Yellow
    $f = Join-Path $ScriptDir "tmpx.sql"
    $s | Out-File -FilePath $f -Encoding utf8
    docker cp $f "sbtm_antigravity-postgres-1:/tmp/tmpx.sql"
    docker exec sbtm_antigravity-postgres-1 psql -U $U -d $D -t -f /tmp/tmpx.sql
}

Run-Q "GPS Updates (1m):" "SELECT vehicle_id, COUNT(*) FROM location_points WHERE timestamp > NOW() - INTERVAL '1 minute' GROUP BY vehicle_id;"
Run-Q "Students Presence (5m):" "SELECT ""studentId"", ""eventType"" FROM presence_event WHERE timestamp > NOW() - INTERVAL '5 minutes' LIMIT 3;"
Run-Q "Emergency Alerts:" "SELECT ""vehicleId"", ""eventType"", status FROM emergency_alert LIMIT 3;"

Write-Host "Done." -ForegroundColor Green
