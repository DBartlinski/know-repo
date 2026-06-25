# start-backend.ps1
# Run this script to start the PAO Document Search backend.
# Set the DOC_FOLDER environment variable to point to your document library.
#
# Example:
#   $env:DOC_FOLDER = "C:\Users\YourName\Documents\PAO_Library"
#   .\start-backend.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\backend"

if (-not $env:DOC_FOLDER) {
    Write-Warning "DOC_FOLDER is not set. Using default: C:\Documents\PAO_Library"
    Write-Warning "Set it before running: `$env:DOC_FOLDER = 'C:\path\to\your\docs'"
}

Write-Host "Starting PAO Document Search backend on http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
