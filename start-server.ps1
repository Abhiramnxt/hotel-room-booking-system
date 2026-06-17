# Sai Nirvana Plaza - Clean Server Restart Script
# Run this anytime you get EADDRINUSE errors on port 3000 or 24678

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Sai Nirvana Plaza - Server Start   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Step 1: Kill any lingering node.exe / tsx processes
$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "[1/3] Killing $($nodeProcs.Count) lingering node process(es)..." -ForegroundColor Yellow
    $nodeProcs | Stop-Process -Force
    Start-Sleep -Milliseconds 800
} else {
    Write-Host "[1/3] No lingering node processes found." -ForegroundColor Green
}

# Step 2: Force-free both ports used by the server
#   - 3000  : Express HTTP server
#   - 24678 : Vite WebSocket / HMR server
$portsToFree = @(3000, 24678)
foreach ($port in $portsToFree) {
    $listening = netstat -ano | Select-String ":$port\s.*LISTENING"
    if ($listening) {
        $procId = ($listening -split '\s+') | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1
        if ($procId) {
            Write-Host "[2/3] Port $port still in use by PID $procId. Force-killing..." -ForegroundColor Yellow
            taskkill /PID $procId /F 2>$null
            Start-Sleep -Milliseconds 400
        }
    } else {
        Write-Host "[2/3] Port $port is free." -ForegroundColor Green
    }
}

# Step 3: Start the dev server
Write-Host "[3/3] Starting Sai Nirvana Plaza dev server..." -ForegroundColor Cyan
Write-Host ""
npm run dev
