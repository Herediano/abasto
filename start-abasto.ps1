$root = $PSScriptRoot
$node = "C:\Users\marti\AppData\Local\Programs\node-v24.21.0-win-x64"
$pgBin = "C:\Users\marti\AppData\Local\Programs\pgsql\bin"
$pgData = "C:\Users\marti\AppData\Local\Programs\postgres-data"

$env:Path = "$node;$pgBin;" + $env:Path

if (-not (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Host "Iniciando PostgreSQL..."
  $pg = Start-Process -FilePath "$pgBin\pg_ctl.exe" -ArgumentList "-D `"$pgData`" -l `"$pgData\server.log`" start" -NoNewWindow -Wait -PassThru
  if ($pg.ExitCode -ne 0) { Write-Error "Fallo al iniciar PostgreSQL. Ver $pgData\server.log" }
} else {
  Write-Host "PostgreSQL ya estaba corriendo."
}

if (-not (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Host "Iniciando backend..." 
  Start-Process -FilePath "$node\node.exe" -ArgumentList "node_modules\tsx\dist\cli.mjs","watch","src/main.ts" -WorkingDirectory "$root\backend" -RedirectStandardOutput "$root\backend\server.log" -RedirectStandardError "$root\backend\server.log.err" -WindowStyle Hidden
} else {
  Write-Host "Backend ya estaba corriendo."
}

if (-not (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) {
  Write-Host "Iniciando frontend..."
  Start-Process -FilePath "$node\node.exe" -ArgumentList "node_modules\vite\bin\vite.js" -WorkingDirectory "$root\frontend" -RedirectStandardOutput "$root\frontend\vite.log" -RedirectStandardError "$root\frontend\vite.log.err" -WindowStyle Hidden
} else {
  Write-Host "Frontend ya estaba corriendo."
}

Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Abasto arriba:"
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  API:      http://localhost:3000/api"
Write-Host "  Health:   http://localhost:3000/api/health"