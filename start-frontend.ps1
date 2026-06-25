# start-frontend.ps1
# Run this script in a second terminal to start the React dev server.

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\frontend"

Write-Host "Starting PAO Document Search frontend on http://localhost:5173" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

npm run dev
