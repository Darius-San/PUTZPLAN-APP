<#
PowerShell helper: start Vite dev server (background), wait for it to respond, run Playwright e2e spec, then kill server.
Usage (PowerShell):
  cd <repo>/putzplan-app
  .\scripts\run-e2e.ps1
#>

$port = 5173
$baseUrl = "http://127.0.0.1:$port/"
$serverCmd = "npm run dev"

Write-Host "Starting dev server (port $port)..."
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "cmd.exe"
$startInfo.Arguments = "/c $serverCmd"
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $startInfo
$proc.Start() | Out-Null
Start-Sleep -Seconds 1

# Wait for the server to respond
$maxWait = 60
$ready = $false
for ($i=0; $i -lt $maxWait; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Error "Dev server did not start within timeout. Check logs."
    if ($proc -and !$proc.HasExited) { $proc.Kill() }
    exit 1
}

Write-Host "Dev server ready at $baseUrl"

# Run Playwright spec with env
$env:PUTZPLAN_BASE_URL = $baseUrl.TrimEnd('/')
Write-Host "Running Playwright e2e..."

# Use call operator to invoke npx directly with argument array to avoid quoting issues
try {
    & npx playwright test 'e2e/period-flow.spec.ts' -g 'Period flow end-to-end' --reporter=list --timeout=180000
    $exitCode = $LASTEXITCODE
} catch {
    Write-Error "Playwright run failed: $_"
    $exitCode = 1
}

Write-Host "Playwright finished with exit code $exitCode"

# Kill server
if ($proc -and !$proc.HasExited) {
    Write-Host "Stopping dev server (PID $($proc.Id))"
    try { $proc.Kill() } catch { }
}

exit $exitCode
