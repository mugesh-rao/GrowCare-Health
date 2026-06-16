$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Header {
    Clear-Host
    Write-Host "==============================================="
    Write-Host "  GrowCare Launcher"
    Write-Host "==============================================="
    Write-Host "1. Run Client"
    Write-Host "2. Run Server"
    Write-Host "3. Run All"
    Write-Host "4. Exit"
    Write-Host ""
}

function Test-PathOrWarn {
    param(
        [Parameter(Mandatory = $true)][string]$PathToCheck,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (-not (Test-Path -Path $PathToCheck)) {
        Write-Host "[ERROR] $Label not found: $PathToCheck" -ForegroundColor Red
        return $false
    }

    return $true
}

function Start-Client {
    $clientDir = Join-Path $root "client"
    $clientPkg = Join-Path $clientDir "package.json"

    if (-not (Test-PathOrWarn -PathToCheck $clientPkg -Label "Client")) { return }

    Write-Host "Starting Client..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd `"$clientDir`"; npm run dev") -WorkingDirectory $clientDir -WindowStyle Normal | Out-Null
    Write-Host "Client started." -ForegroundColor Green
}

function Start-Server {
    $serverDir = Join-Path $root "server"
    $serverPkg = Join-Path $serverDir "package.json"

    if (-not (Test-PathOrWarn -PathToCheck $serverPkg -Label "Server")) { return }

    Write-Host "Starting Server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", "cd `"$serverDir`"; npm start") -WorkingDirectory $serverDir -WindowStyle Normal | Out-Null
    Write-Host "Server started." -ForegroundColor Green
}

function Start-All {
    Start-Client
    Start-Server
}

while ($true) {
    Write-Header
    $choice = Read-Host "Choose an option (1-4)"

    switch ($choice) {
        "1" {
            Start-Client
            Pause
        }
        "2" {
            Start-Server
            Pause
        }
        "3" {
            Start-All
            Pause
        }
        "4" {
            Write-Host "Exiting launcher."
            break
        }
        default {
            Write-Host "Invalid selection. Enter 1, 2, 3, or 4." -ForegroundColor Yellow
            Start-Sleep -Milliseconds 900
        }
    }
}
