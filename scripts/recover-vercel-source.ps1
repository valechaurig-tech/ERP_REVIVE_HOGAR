# Recuperación de la fuente original de Vercel CLI (5/oct/2026)
# Requiere Windows PowerShell 5.1+ y Vercel CLI autenticado con "vercel login".
# SOLO LECTURA de Vercel. Archivos locales guardados bajo .vercel/ (ignorados por Git).
# NO hace despliegues, no toca GitHub ni Supabase, no modifica producción.
# Uso desde la raíz de ERP_REVIVE_HOGAR:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\recover-vercel-source.ps1

param(
    [string]$OutputDir = ""
)
$ErrorActionPreference = "Stop"
$TeamSlug = "echauri-apps"
$TeamId = "team_9olIWjnRwmaIH5QgefJZArrK"
$DeploymentId = "dpl_Cmrqr8sR4o77urpBKwHVAAb6FSZm"

# UIDs observados de la lista de archivos original del deployment CLI.
$Files = @(
    @{ Path = "api/archivos.js";         Uid = "95642932d1ed2162b7407ac0b93adcd8dd49adbc" },
    @{ Path = "scripts/setup-storage.js";Uid = "bbb8e025e4adc363b33b8b1555992ae376f55bd2" },
    @{ Path = "api/ia.js";              Uid = "ae84d0856f1ba7649bc84e4db7896f32ec929717" },
    @{ Path = "supabase/schema.sql";    Uid = "5f6ffc1a2bd6beb7f9bb5dd6efcba358ec42d4c0" },
    @{ Path = "deploy.ps1";             Uid = "b02ae9d1fe9e9998114aa785a68579f7524e0780" },
    @{ Path = "PROJECT_LOG.md";         Uid = "04dd83a0787bf9aaad3e11694a9b6a6a5f10cdbd" }
)
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $Root ".vercel\recovered-source-2026-10-05"
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    throw "No se encuentra Vercel CLI. Instalarlo e iniciar sesion: npm install -g vercel ; vercel login"
}

# La autenticación se gestiona en Vercel CLI; no solicitar ni imprimir tokens.
& vercel whoami --scope $TeamSlug --no-color | Out-Null
if ($LASTEXITCODE -ne 0) { throw "La sesion Vercel CLI no esta autorizada. Ejecuta: vercel login" }

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$Report = @()
foreach ($Entry in $Files) {
    $Path = [string]$Entry.Path
    $Uid = [string]$Entry.Uid
    # Fuente completa, descargada en el equipo de la persona autenticada.
    $Endpoint = "/v8/deployments/{0}/files/{1}?teamId={2}" -f $DeploymentId, $Uid, $TeamId
    Write-Host "Recuperando $Path ..."
    $Response = (& vercel api $Endpoint --scope $TeamSlug --no-color | Out-String)
    if ($LASTEXITCODE -ne 0) { throw "Fallo Vercel API al recuperar $Path (no se modifico ningun origen)" }

    try { $Payload = $Response | ConvertFrom-Json }
    catch { throw "Respuesta JSON no valida en $Path. Revisa version de Vercel CLI." }
    $Encoded = $null
    if ($Payload.data) { $Encoded = [string]$Payload.data }
    elseif ($Payload.result -and $Payload.result.data) { $Encoded = [string]$Payload.result.data }
    if (-not $Encoded -or $Encoded.Contains("[truncated]")) {
        throw "Vercel no devolvio contenido completo para $Path"
    }
    try { [byte[]]$Bytes = [Convert]::FromBase64String($Encoded) }
    catch { throw "Archivo base64 incompleto/invalido: $Path" }
    if ($Bytes.Length -eq 0) { throw "Archivo vacio inesperado: $Path" }

    $Target = Join-Path $OutputDir ($Path.Replace("/", [IO.Path]::DirectorySeparatorChar))
    $Dir = Split-Path -Parent $Target
    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    if (Test-Path $Target) {
        $Existing = [IO.File]::ReadAllBytes($Target)
        $OldHash = [Convert]::ToBase64String(
            [Security.Cryptography.SHA256]::Create().ComputeHash($Existing)
        )
        $NewHash = [Convert]::ToBase64String(
            [Security.Cryptography.SHA256]::Create().ComputeHash($Bytes)
        )
        if ($OldHash -ne $NewHash) {
            throw "El destino $Target existe con contenido distinto. No se sobrescribe."
        }
    } else {
        [IO.File]::WriteAllBytes($Target, $Bytes)
    }
    $Sha256 = (Get-FileHash -Algorithm SHA256 -Path $Target).Hash.ToLowerInvariant()
    $Report += [pscustomobject]@{
        path = $Path
        sizeBytes = $Bytes.Length
        sha256 = $Sha256
        deploymentId = $DeploymentId
    }
    Write-Host "  OK: $Path ($($Bytes.Length) bytes) sha256=$Sha256"
}
$Manifest = Join-Path $OutputDir "manifest.sha256.json"
$Report | ConvertTo-Json -Depth 4 | Set-Content -Path $Manifest -Encoding UTF8
Write-Host "Recuperacion completada: $($Report.Count) fuentes."
Write-Host "Destino privado: $OutputDir"
Write-Host "No colocar estas fuentes en un repositorio publico sin auditar secretos y permisos."
