#!/usr/bin/env bash
# Despliega el backend (FastAPI) en la Raspberry Pi vía Tailscale.
#   ./deploy/deploy.sh                 # host SSH "raspi"
#   RASPI=otro-host ./deploy/deploy.sh
#
# Copia backend/, instala dependencias en un venv, aplica el esquema
# (idempotente) y reinicia el servicio. No toca backend/.env de la Pi.
set -euo pipefail

RASPI="${RASPI:-raspi}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Copiando backend a $RASPI:~/fuegodata/backend"
rsync -az --delete \
  --exclude .venv --exclude data --exclude '.env*' --exclude '__pycache__' \
  "$ROOT/backend/" "$RASPI:fuegodata/backend/"
rsync -az "$ROOT/deploy/" "$RASPI:fuegodata/deploy/"

ssh "$RASPI" bash -s <<'REMOTE'
set -euo pipefail
cd ~/fuegodata/backend
[[ -f .env ]] || { echo "Falta ~/fuegodata/backend/.env en la Pi" >&2; exit 1; }

echo "==> Dependencias"
[[ -d .venv ]] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r requirements.txt

echo "==> Esquema (idempotente)"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f db/init.sql

echo "==> Servicio"
mkdir -p ~/.config/systemd/user
cp ~/fuegodata/deploy/fuegodata-api.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable fuegodata-api.service >/dev/null
systemctl --user restart fuegodata-api.service
for i in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:8000/health && break; sleep 1; done
systemctl --user is-active fuegodata-api.service
curl -fsS http://127.0.0.1:8000/health; echo
REMOTE
echo "Listo."
