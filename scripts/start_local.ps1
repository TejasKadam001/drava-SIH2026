# Drava - local launcher for Windows PowerShell.
# Order: tests -> inference service (background) -> React console (foreground).

function Write-Banner($text, $color) {
    Write-Host ("=" * 65) -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor $color
    Write-Host ("=" * 65) -ForegroundColor Cyan
}

Write-Banner "Drava local stack (SIH26120 demo mode) | Baghewala, Oil India Ltd" Green

Write-Host "`n[1/3] Physics and ML tests..." -ForegroundColor Cyan
python scripts/check_all.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Tests failed - not starting the stack." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Starting inference service on :8000..." -ForegroundColor Cyan
Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn twin_api.main:app --host 127.0.0.1 --port 8000" `
    -WindowStyle Minimized
Start-Sleep -Seconds 2   # give uvicorn a moment to bind

Write-Host "`n[3/3] Starting operator console (Vite dev server)..." -ForegroundColor Cyan
Set-Location frontend
npm run dev
