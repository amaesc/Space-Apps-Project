#!/usr/bin/env bash
# Despliega FuegoData en la Raspberry Pi (vía Tailscale).
#   ./deploy/deploy.sh            # usa el host SSH "raspi"
#   RASPI=otro-host ./deploy/deploy.sh
#
# Copia el código, compila en la Pi (para que los binarios nativos sean ARM64),
# aplica migraciones y reinicia el servicio. No toca .env.production.
set -euo pipefail

RASPI="${RASPI:-raspi}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="fuegodata"

echo "==> Copiando código a $RASPI:~/$REMOTE_DIR"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude '.env*' --exclude .git \
  "$ROOT/web/" "$RASPI:$REMOTE_DIR/web/"
rsync -az "$ROOT/deploy/" "$RASPI:$REMOTE_DIR/deploy/"

echo "==> Compilando en la Pi"
ssh "$RASPI" bash -s <<'REMOTE'
set -euo pipefail
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/fuegodata/web
BUN="npx -y bun@1.4.2"
$BUN install --frozen-lockfile
# next build lee .env.production automáticamente
$BUN run build

# El servidor standalone no incluye estáticos ni public/: se copian junto a él.
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/

echo "==> Migraciones"
node --env-file=.env.production scripts/migrate.mjs

echo "==> Servicio"
mkdir -p ~/.config/systemd/user
cp ~/fuegodata/deploy/fuegodata.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable fuegodata.service >/dev/null
systemctl --user restart fuegodata.service
sleep 3
systemctl --user is-active fuegodata.service
curl -fsS -o /dev/null -w "Inicio: HTTP %{http_code}\n" http://127.0.0.1:3000/
REMOTE

echo "Listo."
