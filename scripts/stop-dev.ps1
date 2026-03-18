<#
.SYNOPSIS
Stop JW Progress Tracker development servers.

.DESCRIPTION
Stops any running Vite and API server processes, and cleans up background jobs.

.PARAMETER KillPorts
Also kill processes using common dev ports (5173-5176, 3009).

.EXAMPLES
.\stop-dev.ps1
Stop servers started via start-dev.ps1 background job.

.\stop-dev.ps1 -KillPorts
Force kill any processes using dev ports (useful if servers were started manually).
#>

param(
    [switch]$KillPorts
)

$ErrorActionPreference = "Stop"

# Get the project root directory
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

Write-Host "Stopping JW Progress Tracker development servers..." -ForegroundColor Yellow

# 1. Clean up background job if exists
$jobFile = "..\dev-job.json"
if (Test-Path $jobFile) {
    $jobInfo = Get-Content $jobFile | ConvertFrom-Json
    $jobId = $jobInfo.JobId
    
    Write-Host "Found background job ID: $jobId" -ForegroundColor Cyan
    
    $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
    if ($job) {
        Write-Host "Stopping job..." -ForegroundColor Cyan
        Stop-Job -Id $jobId
        Remove-Job -Id $jobId
        Write-Host "Job stopped and removed." -ForegroundColor Green
    } else {
        Write-Host "Job not found (may have already finished)." -ForegroundColor Gray
    }
    
    Remove-Item $jobFile -Force
    Write-Host "Job info file removed." -ForegroundColor Green
} else {
    Write-Host "No background job info file found." -ForegroundColor Gray
}

# 2. Kill processes on dev ports if requested
if ($KillPorts) {
    $ports = @(5173, 5174, 5175, 5176, 3009)
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            if ($pid) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Killing process $pid ($($proc.Name)) on port $port..." -ForegroundColor Red
                    Stop-Process -Id $pid -Force
                }
            }
        }
    }
    Write-Host "Port cleanup completed." -ForegroundColor Green
}

# 3. Kill any npm/vite processes started from this directory (optional)
$processes = Get-Process node -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*vite*" -or $_.CommandLine -like "*simple-api-server*" }
foreach ($proc in $processes) {
    Write-Host "Stopping process $($proc.Id) ($($proc.Name)): $($proc.CommandLine)" -ForegroundColor Cyan
    Stop-Process -Id $proc.Id -Force
}

Write-Host "Cleanup complete." -ForegroundColor Green