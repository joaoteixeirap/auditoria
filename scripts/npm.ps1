# Runtime portátil utilizado nesta máquina quando Node.js não está no PATH.
# Com Node.js LTS instalado normalmente, prefira npm diretamente.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtime = Get-ChildItem -LiteralPath (Join-Path $projectRoot '.tools') -Directory -Filter 'node-v24.*-win-x64' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $runtime) {
    throw 'Runtime portátil não encontrado. Instale Node.js 24 LTS e utilize npm diretamente.'
}
$env:PATH = "$($runtime.FullName);$env:PATH"
$env:npm_config_cache = Join-Path $projectRoot '.tools\npm-cache'
Push-Location -LiteralPath $projectRoot
try {
    & (Join-Path $runtime.FullName 'npm.cmd') @args
    $commandExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}
exit $commandExitCode
