<#
  Levanta todo Abasto de una: Docker + Postgres + backend + frontend.

  Uso:
    .\start-abasto.ps1          # arranca lo que falte
    .\start-abasto.ps1 -Stop    # baja backend, frontend y el contenedor de Postgres
    .\start-abasto.ps1 -Fresh   # recrea el contenedor de Postgres desde cero (BORRA datos)

  Postgres corre en Docker (infra/docker/compose.yml). No hay Postgres nativo
  en esta maquina. El backend y el frontend arrancan en ventanas propias para
  que se vean los logs y se corten con Ctrl+C.
#>
param(
  [switch]$Stop,
  [switch]$Fresh
)

$root = $PSScriptRoot
$compose = Join-Path $root 'infra\docker\compose.yml'
$container = 'abasto-postgres'

function Test-Port($port) {
  [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# Corre un comando nativo en silencio y devuelve $true si termino con exito.
# Via cmd /c para que PowerShell 5.1 no convierta stderr en un error terminante.
function Test-Cmd($line) {
  & cmd /c "$line >nul 2>&1"
  return ($LASTEXITCODE -eq 0)
}

function Wait-For($label, [scriptblock]$check, $timeoutSec = 180) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
    if (& $check) { return }
    Start-Sleep -Seconds 3
    Write-Host "  ...esperando $label ($([int]$sw.Elapsed.TotalSeconds)s)"
  }
  throw "Timeout esperando $label"
}

# ---------------------------------------------------------------- Stop
if ($Stop) {
  Write-Host 'Bajando backend y frontend...'
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -match 'tsx\b.*main\.ts|vite\b' } |
    ForEach-Object { Write-Host "  kill $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Host 'Bajando Postgres...'
  & cmd /c "docker compose -f `"$compose`" down"
  Write-Host 'Listo.'
  return
}

# ---------------------------------------------------------------- Docker engine
if (-not (Test-Cmd 'docker info')) {
  Write-Host 'Docker no responde. Arrancando Docker Desktop...'
  $dd = @(
    "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $dd) { throw 'No encuentro "Docker Desktop.exe".' }
  Start-Process -FilePath $dd
  Wait-For 'el engine de Docker' { Test-Cmd 'docker info' } 240
}
Write-Host 'Docker OK.'

# ---------------------------------------------------------------- Postgres
if ($Fresh) {
  Write-Host 'Recreando Postgres desde cero (se borran los datos)...'
  & cmd /c "docker compose -f `"$compose`" down -v"
}
Write-Host 'Levantando Postgres...'
& cmd /c "docker compose -f `"$compose`" up -d"
if ($LASTEXITCODE -ne 0) { throw 'docker compose up fallo.' }
Wait-For 'que Postgres acepte conexiones' { Test-Cmd "docker exec $container pg_isready -U postgres -d abasto" } 120
Write-Host 'Postgres OK.'

# ---------------------------------------------------------------- Backend
if (Test-Port 3000) {
  Write-Host 'Backend ya estaba corriendo (puerto 3000).'
} else {
  Write-Host 'Aplicando migraciones...'
  Push-Location "$root\backend"
  & cmd /c 'npm run db:migrate'
  Pop-Location
  Write-Host 'Arrancando backend en una ventana nueva...'
  Start-Process powershell -ArgumentList '-NoExit','-Command',"cd '$root\backend'; npm run start:dev"
}

# ---------------------------------------------------------------- Frontend
if (Test-Port 5173) {
  Write-Host 'Frontend ya estaba corriendo (puerto 5173).'
} else {
  Write-Host 'Arrancando frontend en una ventana nueva...'
  Start-Process powershell -ArgumentList '-NoExit','-Command',"cd '$root\frontend'; npm run dev"
}

Write-Host ''
Write-Host 'Abasto arriba:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  API:      http://localhost:3000/api'
Write-Host '  Health:   http://localhost:3000/api/health'
