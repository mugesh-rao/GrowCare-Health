# PowerShell menu script to run frontend, backend, or both

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "=== Project Menu ===" -ForegroundColor Cyan
    Write-Host "1. Run Frontend (Client) - http://localhost:5173"
    Write-Host "2. Run Backend (Server) - http://localhost:5000"
    Write-Host "3. Run Both"
    Write-Host "4. Stop All Servers"
    Write-Host "5. Exit"
    Write-Host ""
}

function Start-Frontend {
    Write-Host "Starting Frontend..." -ForegroundColor Green
    Set-Location (Join-Path $rootDir "client")
    npm run dev
}

function Start-Backend {
    Write-Host "Starting Backend..." -ForegroundColor Green
    Set-Location (Join-Path $rootDir "server")
    npm run dev
}

function Start-Both {
    Write-Host "Starting Both Frontend and Backend..." -ForegroundColor Green
    Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
    Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
    Start-Job -ScriptBlock { 
        Set-Location "C:\Users\muges\Desktop\Project_AI\WA-Automation\client"
        npm run dev
    }
    Start-Job -ScriptBlock { 
        Set-Location "C:\Users\muges\Desktop\Project_AI\WA-Automation\server"
        npm run dev
    }
    Write-Host "Frontend and Backend started in background jobs." -ForegroundColor Yellow
    Write-Host "Use 'jobs' to view jobs, 'receive-job <id>' to see output."
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Stop-All {
    Write-Host "Stopping all servers..." -ForegroundColor Yellow
    Get-Job | Remove-Job -Force
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "All servers stopped." -ForegroundColor Green
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

do {
    Show-Menu
    $choice = Read-Host "Enter choice (1-5)"
    
    switch ($choice) {
        "1" { Start-Frontend }
        "2" { Start-Backend }
        "3" { Start-Both }
        "4" { Stop-All }
        "5" { 
            Write-Host "Exiting..." -ForegroundColor Yellow
            return
        }
        default { 
            Write-Host "Invalid choice. Please enter 1-5." -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($true)