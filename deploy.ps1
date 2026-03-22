# deploy.ps1 - Pulse Backend Deployment Script
# Usage: .\deploy.ps1
# Optionally set env vars before running or ensure a .env file exists.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Pulse Backend Deployment Script  " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Load .env if present
# ---------------------------------------------------------------------------
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "[1/4] Loading environment from .env ..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*?)\s*$') {
            $key   = $Matches[1]
            $value = $Matches[2] -replace '^"(.*)"$','$1' -replace "^'(.*)'$",'$1'
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "    .env loaded." -ForegroundColor Green
} else {
    Write-Host "[1/4] No .env file found — using existing environment variables." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 2. Check required environment variables
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Checking required environment variables ..." -ForegroundColor Yellow

$required = @(
    "ANTHROPIC_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "JWT_SECRET"
)

$missing = @()
foreach ($var in $required) {
    $val = [System.Environment]::GetEnvironmentVariable($var, "Process")
    if ([string]::IsNullOrWhiteSpace($val) -or $val -match '^your-') {
        $missing += $var
        Write-Host "    MISSING: $var" -ForegroundColor Red
    } else {
        $display = $val.Substring(0, [Math]::Min(8, $val.Length)) + "..."
        Write-Host "    OK: $var = $display" -ForegroundColor Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: The following required variables are not set:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Copy .env.production to .env and fill in real values, then re-run." -ForegroundColor Yellow
    exit 1
}

Write-Host "    All required variables are set." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. Apply Supabase schema
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Applying Supabase schema ..." -ForegroundColor Yellow

$schemaFile = Join-Path $PSScriptRoot "schema.sql"
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($null -ne $supabaseCli) {
    Write-Host "    Supabase CLI found. Attempting to push schema via 'supabase db push' ..." -ForegroundColor Cyan
    try {
        supabase db push --schema-file $schemaFile
        Write-Host "    Schema applied via Supabase CLI." -ForegroundColor Green
    } catch {
        Write-Host "    WARNING: 'supabase db push' failed: $_" -ForegroundColor DarkYellow
        Write-Host "    Apply schema.sql manually in the Supabase Dashboard SQL editor." -ForegroundColor Yellow
    }
} else {
    Write-Host "    Supabase CLI not found. To apply the schema manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    1. Open https://supabase.com/dashboard and select your project." -ForegroundColor White
    Write-Host "    2. Go to SQL Editor (left sidebar)." -ForegroundColor White
    Write-Host "    3. Click 'New query', paste the contents of schema.sql, and run it." -ForegroundColor White
    Write-Host ""
    Write-Host "    (Install the CLI: https://supabase.com/docs/guides/cli)" -ForegroundColor DarkGray
    Write-Host "    Continuing with server startup ..." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 4. Start the backend and verify it responds
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Starting Pulse backend server ..." -ForegroundColor Yellow

# Ensure dependencies are installed
if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "    node_modules not found — running npm install ..." -ForegroundColor Yellow
    Push-Location $PSScriptRoot
    npm install --silent
    Pop-Location
}

$port = [System.Environment]::GetEnvironmentVariable("PORT", "Process")
if ([string]::IsNullOrWhiteSpace($port)) { $port = "3000" }

# Launch server as a background job
$serverJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    node src/index.js
} -ArgumentList $PSScriptRoot

Write-Host "    Server process started (Job ID: $($serverJob.Id)). Waiting for port $port ..." -ForegroundColor Cyan

# Poll /health for up to 15 seconds
$healthy = $false
$healthUrl = "http://localhost:$port/health"
for ($i = 1; $i -le 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        # not ready yet
    }
}

# Flush any server output
$serverOutput = Receive-Job -Job $serverJob 2>&1
if ($serverOutput) {
    Write-Host ""
    Write-Host "--- Server output ---" -ForegroundColor DarkGray
    $serverOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Write-Host "---------------------" -ForegroundColor DarkGray
}

if (-not $healthy) {
    Write-Host ""
    Write-Host "ERROR: Server did not respond on port $port within 15 seconds." -ForegroundColor Red
    Write-Host "Check the output above for errors." -ForegroundColor Yellow
    Stop-Job -Job $serverJob | Out-Null
    Remove-Job -Job $serverJob | Out-Null
    exit 1
}

# Keep server running in foreground — hand off control to node
Stop-Job  -Job $serverJob | Out-Null
Remove-Job -Job $serverJob | Out-Null

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "   Pulse backend is LIVE!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Server URL : http://localhost:$port" -ForegroundColor White
Write-Host "   Health     : $healthUrl" -ForegroundColor White
Write-Host ""
Write-Host "Starting server in foreground (Ctrl+C to stop) ..." -ForegroundColor Cyan
Write-Host ""

Push-Location $PSScriptRoot
node src/index.js
Pop-Location
