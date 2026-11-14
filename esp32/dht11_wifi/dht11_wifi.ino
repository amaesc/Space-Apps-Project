#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>

// 1. Configura tu red WiFi (2.4 GHz para ESP32)
const char *WIFI_SSID = "POCO M7 Pro 5G";
const char *WIFI_PASSWORD = "Kentucky";

// 2. Configura la IP local de tu PC donde corre FastAPI (ej. 192.168.1.50)
//    No uses "localhost" o "127.0.0.1" porque en el ESP32 eso apunta al propio
//    ESP32.
const char *SERVER_URL = "http://10.236.41.243:8000/api/iot/telemetry";
const char *STATION_ID = "ESP32-DHT11-01";
const char *STATION_NAME = "ESP32 DHT11 Prueba";

#define DHTPIN 4
#define DHTTYPE DHT11
// En ESP32-S3/S2, GPIO 7 es ADC1_CH6 (compatible con WiFi).
// En ESP32 clásico (WROOM/DevKit), GPIO 7 es flash SPI interno: usa GPIO 34,
// 35, 32 o 33.
#define LDR_PIN 7

DHT dht(DHTPIN, DHTTYPE);

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

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("[ERROR] Fallo lectura del DHT11 en GPIO 4.");
    return;
  }

  Serial.printf(
      "Lectura -> Temp: %.1f °C | Humedad: %.1f %% | Luz: %.1f %% (raw %d)\n",
      tempC, humidity, luminosityPct, lightRaw);

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED)
      return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  char payload[256];
  snprintf(payload, sizeof(payload),
           "{\"station_id\":\"%s\",\"name\":\"%s\",\"temperature_c\":%.2f,"
           "\"humidity_pct\":%.2f,\"luminosity_pct\":%.2f}",
           STATION_ID, STATION_NAME, tempC, humidity, luminosityPct);

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
