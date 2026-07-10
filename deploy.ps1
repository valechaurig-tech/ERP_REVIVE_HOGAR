# Deploy Revive Hogar - cuentas valechaurig-tech
# Uso: .\deploy.ps1 -Message "descripcion del cambio"

param(
    [string]$Message = "Actualizacion Revive Hogar"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$SecretsFile = Join-Path $Root "secrets.revive.env"

if (-not (Test-Path $SecretsFile)) {
    Write-Host "Falta secrets.revive.env" -ForegroundColor Red
    exit 1
}

Get-Content $SecretsFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value) { Set-Item -Path "env:$name" -Value $value }
    }
}

if (-not $env:GH_TOKEN) {
    Write-Host "GH_TOKEN vacio en secrets.revive.env" -ForegroundColor Red
    exit 1
}

$gitExe = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $gitExe)) {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) { $gitExe = $gitCmd.Source } else {
        Write-Host "Git no instalado." -ForegroundColor Red
        exit 1
    }
}

Set-Location $Root

$remote = "https://$($env:GH_TOKEN)@github.com/valechaurig-tech/ERP_REVIVE_HOGAR.git"

if (-not (Test-Path ".git")) {
    & $gitExe init
    & $gitExe branch -M main
}

& $gitExe config user.email "valechaurig@gmail.com"
& $gitExe config user.name "valechaurig-tech"

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& $gitExe remote remove origin 2>$null
$ErrorActionPreference = $prevEap
& $gitExe remote add origin $remote

& $gitExe add -A
$status = & $gitExe status --porcelain
if ($status) {
    & $gitExe commit -m $Message
    & $gitExe push -u origin main
    Write-Host "Push a GitHub OK." -ForegroundColor Green
} else {
    Write-Host "Sin cambios para subir." -ForegroundColor Yellow
}

if ($env:VERCEL_TOKEN) {
    $vercel = Get-Command vercel -ErrorAction SilentlyContinue
    if ($vercel) {
        Remove-Item -Recurse -Force ".vercel" -ErrorAction SilentlyContinue
        npx vercel link --yes --token $env:VERCEL_TOKEN 2>$null
        npx vercel deploy --prod --yes --token $env:VERCEL_TOKEN
        Write-Host "Deploy Vercel OK." -ForegroundColor Green
    } else {
        Write-Host "Vercel CLI no instalado. El push a GitHub basta si Git esta conectado." -ForegroundColor Yellow
    }
}
