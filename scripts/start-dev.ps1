<#
.SYNOPSIS
Start the JW Progress Tracker development environment.

.DESCRIPTION
This script starts the full development environment including:
- Vite dev server (frontend, port 5173 or next available)
- API server (port 3009)

.PARAMETER Background
Run the servers in the background (as a PowerShell job).

.PARAMETER LogFile
Path to log file (default: ../dev.log).

.EXAMPLE
.\start-dev.ps1
Start servers in the foreground (interactive).

.EXAMPLE
.\start-dev.ps1 -Background
Start servers in the background as a job.

.EXAMPLE
.\start-dev.ps1 -Background -LogFile "my.log"
Start servers in background logging to my.log.
#>

param(
    [switch]$Background,
    [string]$LogFile = "..\dev.log"
)

$ErrorActionPreference = "Stop"

# Get the project root directory (parent of scripts folder)
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

Write-Host "JW Progress Tracker - Development Environment" -ForegroundColor Green
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan

# Check for existing processes on common ports
$ports = @(5173, 5174, 5175, 5176, 3009)
foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                Select-Object -First 1
    if ($process) {
        Write-Warning "Port $port is in use (PID: $($process.OwningProcess)). This may cause issues."
    }
}

if ($Background) {
    Write-Host "Starting development servers in the background..." -ForegroundColor Yellow
    Write-Host "Logs will be written to: $LogFile" -ForegroundColor Cyan
    
    # Start npm start as a background job, redirecting output to log file
    $job = Start-Job -Name "jw-dev-servers" -ScriptBlock {
        param($root, $log)
        Set-Location $root
        npm start *> $log
    } -ArgumentList $projectRoot, $LogFile
    
    # Store job ID for reference
    $jobId = $job.Id
    Write-Host "Background job started with ID: $jobId" -ForegroundColor Green
    Write-Host "To view logs: Get-Content '$LogFile' -Tail 20 -Wait" -ForegroundColor Cyan
    Write-Host "To stop servers: Stop-Job -Id $jobId; Remove-Job -Id $jobId" -ForegroundColor Cyan
    
    # Write job info to a file for later reference
    @{ JobId = $jobId; Started = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") } | 
        ConvertTo-Json | Out-File "..\dev-job.json"
    
    # Wait a moment for servers to start, then tail log
    Start-Sleep -Seconds 3
    if (Test-Path $LogFile) {
        Write-Host "--- Last 10 lines of log ---" -ForegroundColor Gray
        Get-Content $LogFile -Tail 10
        Write-Host "--- End of log ---" -ForegroundColor Gray
    }
} else {
    Write-Host "Starting development servers in the foreground..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Cyan
    Write-Host "Logs will be displayed below:" -ForegroundColor Cyan
    Write-Host "------------------------------" -ForegroundColor Gray
    
    # Run npm start in foreground
    npm start
}