#!/bin/sh
set -eu
cd "$(dirname "$0")"
docker info >/dev/null
docker compose version >/dev/null
docker load -i bargenerator-1.0.0-linux-amd64.tar.gz
docker compose up -d --wait --wait-timeout 90
docker compose ps
