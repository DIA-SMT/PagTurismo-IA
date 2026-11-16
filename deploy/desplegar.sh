#!/usr/bin/env bash
# Despliega el portal de turismo en la VPS municipal, como root:
#
#   /srv/portalturismo/desplegar.sh            la última versión de main
#   /srv/portalturismo/desplegar.sh Agustin    otra rama
#
# Cada despliegue es una carpeta nueva en versiones/ (fecha y commit) y `actual` apunta a la
# viva: si algo sale mal, volver atrás es reapuntar `actual` y `pm2 reload` (ver deploy/README.md).
# Aplica las migraciones pendientes ANTES de pasar a la versión nueva, y deja las 3 últimas.
set -euo pipefail

APP=portalturismo
REPO=https://github.com/DIA-SMT/PagTurismo-IA.git
RAMA="${1:-main}"
RAIZ=/srv/$APP

cd "$RAIZ"
SHA=$(git ls-remote "$REPO" "refs/heads/$RAMA" | cut -c1-7)
[ -n "$SHA" ] || { echo "No existe la rama $RAMA en $REPO"; exit 1; }
VER=versiones/$(date +%Y%m%d-%H%M%S)-$SHA
echo "== Desplegando $RAMA ($SHA) en $VER"

sudo -u "$APP" git clone --quiet --depth 1 --branch "$RAMA" "$REPO" "$VER"
cd "$VER"
sudo -u "$APP" ln -s ../../compartido/.env .env
sudo -u "$APP" npm ci --no-audit --no-fund
sudo -u "$APP" npm run build
sudo -u "$APP" npm run db:migrar

cd "$RAIZ"
ln -sfn "$RAIZ/$VER" actual
sudo -u "$APP" pm2 reload "$APP" --update-env
echo "== Listo: $(readlink actual)"

# Solo las 3 últimas versiones (la viva y dos para volver atrás).
ls -t versiones | tail -n +4 | xargs -r -I{} rm -rf "versiones/{}"
