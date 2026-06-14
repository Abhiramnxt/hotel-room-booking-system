# Sai Nirvana Plaza - Clean Server Restart Script
# Run this anytime you get EADDRINUSE errors

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Sai Nirvana Plaza - Server Start   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Step 1: Kill any lingering node.exe processes
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "[1/3] Killing $($nodeProcs.Count) lingering node process(es)..." -ForegroundColor Yellow
    $nodeProcs | Stop-Process -Force
    Start-Sleep -Milliseconds 800
} else {
    Write-Host "[1/3] No lingering node processes found." -ForegroundColor Green
}

# Step 2: Double-check port 3000 is free
$portInUse = netstat -ano | Select-String ":3000 " | Select-String "LISTENING"
if ($portInUse) {
    $pid = ($portInUse -split "\s+")[-1]
    Write-Host "[2/3] Port 3000 still in use by PID $pid. Force-killing..." -ForegroundColor Yellow
    taskkill /PID $pid /F 2>$null
    Start-Sleep -Milliseconds 500
} else {
    Write-Host "[2/3] Port 3000 is free." -ForegroundColor Green
}

# Step 3: Start the dev server
Write-Host "[3/3] Starting Sai Nirvana Plaza dev server..." -ForegroundColor Cyan
Write-Host ""
npm run dev
