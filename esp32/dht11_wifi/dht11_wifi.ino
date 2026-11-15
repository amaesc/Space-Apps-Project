#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

// 1. Red WiFi (2.4 GHz para ESP32) - valores estáticos (archivo en .gitignore)
const char *WIFI_SSID = "POCO M7 Pro 5G";
const char *WIFI_PASSWORD = "Kentucky";

// 2. API de FuegoData en la Raspberry Pi (HTTPS público vía Tailscale Funnel).
//    Para pruebas locales puedes poner
//    http://<IP-de-tu-PC>:8000/api/iot/telemetry (nunca "localhost": en el
//    ESP32 apunta al propio ESP32).
const char *SERVER_URL = "https://raspi.taile2c6bf.ts.net/api/iot/telemetry";
const char *STATION_TOKEN = "PEGA_AQUI_TU_TOKEN";
const char *STATION_ID = "ESP32-DHT11-01";
const char *STATION_NAME = "ESP32 DHT11 Prueba";

#define DHTPIN 4
#define DHTTYPE DHT11
// En ESP32-S3/S2, GPIO 7 es ADC1_CH6 (compatible con WiFi).
// En ESP32 clásico (WROOM/DevKit), GPIO 7 es flash SPI interno: usa GPIO 34,
// 35, 32 o 33.
#define LDR_PIN 7
// KY-037 / KY-038 salida analógica A0 conectada a GPIO 35 (ADC1_CH7)
#define SOUND_PIN 35
// KY-026 sensor de flama IR salida analógica A0 conectada a GPIO 32 (ADC1_CH4)
#define FLAME_PIN 32

DHT dht(DHTPIN, DHTTYPE);

float readNoiseDb(uint8_t pin, unsigned long sampleWindowMs = 50) {
  unsigned long startMs = millis();
  int signalMax = 0;
  int signalMin = 4095;

  while (millis() - startMs < sampleWindowMs) {
    int sample = analogRead(pin);
    if (sample > signalMax)
      signalMax = sample;
    if (sample < signalMin)
      signalMin = sample;
  }

  int peakToPeak = signalMax - signalMin;
  if (peakToPeak < 0)
    peakToPeak = 0;
  float db = 30.0f + (peakToPeak / 4095.0f) * 70.0f;
  if (db > 140.0f)
    db = 140.0f;
  return db;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.print("Conectando a WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi conectado. IP ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[ERROR] No se pudo conectar al WiFi. Reintentando en el "
                   "siguiente ciclo...");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== ESP32 + DHT11 + Luminosidad + WiFi -> FastAPI ===");
  analogReadResolution(12);
  dht.begin();
  connectWiFi();
}

void loop() {
  delay(5000);

  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();
  int lightRaw = analogRead(LDR_PIN);
  float luminosityPct = (lightRaw / 4095.0f) * 100.0f;
  float noiseDb = readNoiseDb(SOUND_PIN);
  int flameRaw = analogRead(FLAME_PIN);
  float flameIntensityPct = ((4095 - flameRaw) / 4095.0f) * 100.0f;
  bool flameDetected = (flameRaw < 2500);

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("[ERROR] Fallo lectura del DHT11 en GPIO 4.");
    return;
  }

  Serial.printf("Lectura -> Temp: %.1f °C | Humedad: %.1f %% | Luz: %.1f %% "
                "(raw %d) | Ruido: %.1f dB | Flama: %s (%.1f %%, raw %d)\n",
                tempC, humidity, luminosityPct, lightRaw, noiseDb,
                flameDetected ? "SI" : "NO", flameIntensityPct, flameRaw);

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED)
      return;
  }

  // HTTPS: para el prototipo no se valida el certificado (setInsecure).
  // En producción conviene fijar el certificado raíz de Let's Encrypt.
  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  WiFiClient plainClient;

  HTTPClient http;
  if (strncmp(SERVER_URL, "https://", 8) == 0) {
    http.begin(secureClient, SERVER_URL);
  } else {
    http.begin(plainClient, SERVER_URL);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Station-Token", STATION_TOKEN);

  // rssi_dbm + link_type alimentan la capa de conectividad del mapa.
  char payload[448];
  snprintf(payload, sizeof(payload),
           "{\"station_id\":\"%s\",\"name\":\"%s\",\"temperature_c\":%.2f,"
           "\"humidity_pct\":%.2f,\"luminosity_pct\":%.2f,\"noise_db\":%.1f,"
           "\"flame_detected\":%s,\"flame_intensity_pct\":%.1f,"
           "\"rssi_dbm\":%d,\"link_type\":\"wifi\"}",
           STATION_ID, STATION_NAME, tempC, humidity, luminosityPct, noiseDb,
           flameDetected ? "true" : "false", flameIntensityPct,
           (int)WiFi.RSSI());

  int httpCode = http.POST((uint8_t *)payload, strlen(payload));
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("POST %d -> %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("[ERROR] Fallo HTTP POST: %s\n",
                  http.errorToString(httpCode).c_str());
  }

  http.end();
}
