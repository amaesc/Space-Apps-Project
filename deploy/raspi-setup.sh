#!/usr/bin/env bash
# Configuración única de la Raspberry Pi para FuegoData (requiere sudo).
#   ssh -t raspi 'sudo bash ~/fuegodata/deploy/raspi-setup.sh'
#
# - Instala PostgreSQL y crea el usuario/base con las credenciales de
#   ~/fuegodata/web/.env.production (POSTGRES_USER/PASSWORD/DB).
# - Postgres solo acepta conexiones locales y del tailnet (100.64.0.0/10).
# - Permite que los servicios de usuario arranquen sin sesión (linger).
# - Permite al usuario gestionar Tailscale Serve/Funnel sin sudo.
set -euo pipefail

APP_USER="${SUDO_USER:-undefined_club}"
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
ENV_FILE="$APP_HOME/fuegodata/web/.env.production"

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con sudo." >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "No encuentro $ENV_FILE" >&2
  exit 1
fi

# Lee solo las variables que necesitamos, sin ejecutar el archivo.
get_var() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/'; }
PG_USER="$(get_var POSTGRES_USER)"
PG_PASS="$(get_var POSTGRES_PASSWORD)"
PG_DB="$(get_var POSTGRES_DB)"

for v in PG_USER PG_DB; do
  if [[ ! "${!v}" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "$v tiene caracteres no válidos." >&2
    exit 1
  fi
done
[[ -n "$PG_PASS" ]] || { echo "POSTGRES_PASSWORD vacío." >&2; exit 1; }

echo "==> Instalando PostgreSQL"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib

PG_CONF_DIR="$(ls -d /etc/postgresql/*/main | sort -V | tail -1)"

echo "==> Configurando acceso (local + tailnet)"
sed -i -E "s/^#?listen_addresses\s*=.*/listen_addresses = '*'/" "$PG_CONF_DIR/postgresql.conf"
HBA="$PG_CONF_DIR/pg_hba.conf"
if ! grep -q "fuegodata-tailnet" "$HBA"; then
  cat >> "$HBA" <<EOF
# fuegodata-tailnet: solo dispositivos del tailnet de Tailscale
host    $PG_DB    $PG_USER    100.64.0.0/10    scram-sha-256
EOF
fi
systemctl enable --now postgresql
systemctl restart postgresql

echo "==> Creando usuario y base de datos"
sudo -u postgres psql -v ON_ERROR_STOP=1 -q \
  -v usr="$PG_USER" -v pass="$PG_PASS" -v db="$PG_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'usr', :'pass')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usr') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'usr', :'pass') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'usr')
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db') \gexec
SQL

echo "==> Servicios de usuario sin sesión iniciada"
loginctl enable-linger "$APP_USER"

echo "==> Permitir a $APP_USER gestionar Tailscale Serve/Funnel"
tailscale set --operator="$APP_USER"

echo
echo "Listo. PostgreSQL $(psql --version | awk '{print $3}') en :5432 (local + tailnet)."
