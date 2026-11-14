// Copia este archivo como secrets.h (Git lo ignora) y llena tus datos.
// NUNCA subas secrets.h al repositorio: es público.
#pragma once

// Red WiFi 2.4 GHz
#define WIFI_SSID_VALUE "tu_red_wifi"
#define WIFI_PASSWORD_VALUE "tu_contrasena"

// API pública de FuegoData (Raspberry Pi vía Tailscale Funnel, HTTPS)
#define SERVER_URL_VALUE "https://raspi.taile2c6bf.ts.net/api/iot/telemetry"

// Token de estaca: el valor de STATION_TOKEN en ~/fuegodata/backend/.env de la Pi
#define STATION_TOKEN_VALUE "pega_aqui_el_token"
