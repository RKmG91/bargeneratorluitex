$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
docker info
if ($LASTEXITCODE -ne 0) { throw 'Docker indisponível.' }
docker compose version
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose indisponível.' }
docker load -i bargenerator-1.0.0-linux-amd64.tar.gz
if ($LASTEXITCODE -ne 0) { throw 'Falha ao importar imagem.' }
docker compose up -d --wait --wait-timeout 90
if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar serviço. Consulte docker compose logs.' }
docker compose ps
