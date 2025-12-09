# PowerShell script to start and maintain Vite dev server
param([int]$Port = 5173)

Set-Location "d:\Daten\3-PROJECTS\5-PUTZPLAN\putzplan-app"

Write-Host "Starting Vite dev server on port $Port..."
Write-Host "Press Ctrl+C to stop the server"

# Start the server with proper host binding
Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--host", "--port", $Port -NoNewWindow -Wait

Write-Host "Vite dev server stopped."