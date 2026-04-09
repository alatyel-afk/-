# Запуск приложения на Windows: сервер Next.js + открытие в браузере по умолчанию.
# Использование:
#   .\Start-Protocol.ps1          — production (npm run start), при отсутствии сборки — npm run build
#   .\Start-Protocol.ps1 -Dev     — режим разработки (next dev / Turbopack; при занятом порте — следующий свободный)
#   .\Start-Protocol.ps1 -Port 3001

param(
    [switch]$Dev,
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $repoRoot "frontend"

if (-not (Test-Path $frontend)) {
    Write-Error "Не найден каталог frontend. Ожидается: $frontend"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Не найден npm. Установите Node.js LTS с https://nodejs.org/"
}

function Test-PortOpen {
    param([int]$P)
    return [bool](Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction SilentlyContinue)
}

# В режиме разработки не выходим при занятом порте — подбираем свободный (иначе EADDRINUSE).
if (-not $Dev) {
    if (Test-PortOpen -P $Port) {
        Write-Host "Порт $Port уже занят — открываю браузер." -ForegroundColor Green
        Start-Process "http://localhost:$Port/today"
        exit 0
    }
}

function Get-ListenPortDev {
    param([int]$Preferred)
    $p = $Preferred
    $max = $Preferred + 30
    while ($p -le $max -and (Test-PortOpen -P $p)) {
        $p++
    }
    if ($p -gt $max) {
        Write-Error "Не найден свободный порт в диапазоне $Preferred–$max."
    }
    if ($p -ne $Preferred) {
        Write-Host "Порт $Preferred занят — запуск на http://localhost:$p" -ForegroundColor Yellow
    }
    return $p
}

Push-Location $frontend
try {
    if ($Dev) {
        $listenPort = Get-ListenPortDev -Preferred $Port
        # Один вызов с явным портом — без конфликта с занятым 3000 и без зависимости от && в PowerShell
        $inner = "Set-Location -LiteralPath '$frontend'; npx next dev -H 0.0.0.0 -p $listenPort --turbo"
        Start-Process powershell.exe -ArgumentList @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $inner)
        $Port = $listenPort
    }
    else {
        $buildId = Join-Path $frontend ".next\BUILD_ID"
        if (-not (Test-Path $buildId)) {
            Write-Host "Первая сборка (npm run build) — подождите…" -ForegroundColor Yellow
            npm run build
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        }
        $cmd = "Set-Location -LiteralPath '$frontend'; npm run start"
        Start-Process powershell.exe -ArgumentList @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd)
    }

    Write-Host "Ожидание запуска сервера на http://localhost:$Port …" -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -P $Port) { break }
        Start-Sleep -Milliseconds 400
    }

    if (-not (Test-PortOpen -P $Port)) {
        Write-Warning "Сервер не ответил за 90 с. Проверьте окно PowerShell с логами npm."
        exit 1
    }

    Start-Process "http://localhost:$Port/today"
}
finally {
    Pop-Location
}
