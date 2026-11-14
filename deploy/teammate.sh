#!/usr/bin/env bash
# Alta / baja de compañeros en la Raspberry Pi (requiere sudo).
#
#   sudo bash ~/fuegodata/deploy/teammate.sh add <usuario> "<llave pública ssh-ed25519 ...>"
#   sudo bash ~/fuegodata/deploy/teammate.sh remove <usuario>
#   sudo bash ~/fuegodata/deploy/teammate.sh list
#
# Cada compañero recibe su propio usuario Linux:
#  - sin contraseña (solo entra con su llave SSH; nadie puede adivinarla),
#  - sin sudo,
#  - dentro del grupo "fuegodata" para trabajar en archivos compartidos.
set -euo pipefail

GROUP="fuegodata"

[[ $EUID -eq 0 ]] || { echo "Ejecuta con sudo." >&2; exit 1; }

cmd="${1:-}"
user="${2:-}"

valid_user() {
  [[ "$1" =~ ^[a-z][a-z0-9_-]{1,30}$ ]] || {
    echo "Usuario inválido: usa minúsculas, números, - o _ (ej. ana_lopez)." >&2
    exit 1
  }
}

case "$cmd" in
  add)
    valid_user "$user"
    key="${3:-}"
    if [[ ! "$key" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+|sk-ssh-ed25519@openssh.com)\ [A-Za-z0-9+/=]+ ]]; then
      echo "Pasa la llave PÚBLICA completa entre comillas (empieza con ssh-ed25519 ...)." >&2
      exit 1
    fi

    getent group "$GROUP" >/dev/null || groupadd "$GROUP"

    if id "$user" &>/dev/null; then
      echo "El usuario $user ya existe; solo se agrega la llave."
    else
      adduser --disabled-password --gecos "" "$user" >/dev/null
      echo "Usuario $user creado."
    fi
    usermod -aG "$GROUP" "$user"

    home="$(getent passwd "$user" | cut -d: -f6)"
    install -d -m 700 -o "$user" -g "$user" "$home/.ssh"
    touch "$home/.ssh/authorized_keys"
    grep -qxF "$key" "$home/.ssh/authorized_keys" || echo "$key" >> "$home/.ssh/authorized_keys"
    chown "$user:$user" "$home/.ssh/authorized_keys"
    chmod 600 "$home/.ssh/authorized_keys"

    echo "Listo. $user puede entrar con:  ssh $user@raspi.taile2c6bf.ts.net"
    ;;

  remove)
    valid_user "$user"
    [[ "$user" != "undefined_club" ]] || { echo "No se puede borrar la cuenta principal." >&2; exit 1; }
    id "$user" &>/dev/null || { echo "No existe $user." >&2; exit 1; }
    pkill -u "$user" || true
    deluser --remove-home "$user" >/dev/null
    echo "Usuario $user eliminado (con su carpeta personal)."
    ;;

  list)
    getent group "$GROUP" | cut -d: -f4 | tr ',' '\n' | sed '/^$/d' || true
    ;;

  *)
    sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
