#include <Adafruit_BMP280.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

// 1. Red WiFi (2.4 GHz para ESP32) - valores estáticos (archivo en .gitignore)
const char *WIFI_SSID = "POCO M7 Pro 5G";
const char *WIFI_PASSWORD = "Kentucky";

// 2. API de FuegoData en la Raspberry Pi (HTTPS público vía Tailscale Funnel).
//    Para pruebas locales puedes poner
//    http://<IP-de-tu-PC>:8000/api/iot/telemetry (nunca "localhost": en el
//    ESP32 apunta al propio ESP32).
const char *SERVER_URL = "https://13-217-192-184.sslip.io/api/iot/telemetry";
const char *STATION_TOKEN = "PEGA_AQUI_TU_TOKEN";
const char *STATION_ID = "ESP32-DHT11-01";
const char *STATION_NAME = "ESP32 DHT11 Prueba";

#define DHTPIN 4
#define DHTTYPE DHT11
// KY-037 / KY-038 salida analógica A0 conectada a GPIO 35 (ADC1_CH7)
#define SOUND_PIN 35
// KY-026 sensor de flama IR salida analógica A0 conectada a GPIO 32 (ADC1_CH4)
#define FLAME_PIN 32

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP280 bmp;
bool bmpReady = false;

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
  Serial.println("=== ESP32 + DHT11 + Sensores + WiFi -> FastAPI ===");
  analogReadResolution(12);
  dht.begin();
  Wire.begin(21, 22);
  bmpReady = bmp.begin(0x76) || bmp.begin(0x77);
  if (!bmpReady) {
    Serial.println("[AVISO] BMP280 no detectado en I2C (SDA=21, SCL=22).");
  }
  connectWiFi();
}

void loop() {
  delay(5000);

  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();
  float noiseDb = readNoiseDb(SOUND_PIN);
  int flameRaw = analogRead(FLAME_PIN);
  float flameIntensityPct = ((4095 - flameRaw) / 4095.0f) * 100.0f;
  bool flameDetected = (flameRaw < 2500);
  char pressureField[16] = "null";
  float pressureHpa = NAN;
  if (bmpReady) {
    pressureHpa = bmp.readPressure() / 100.0f;
    if (!isnan(pressureHpa) && pressureHpa >= 300.0f && pressureHpa <= 1100.0f) {
      snprintf(pressureField, sizeof(pressureField), "%.1f", pressureHpa);
    }
  }

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("[ERROR] Fallo lectura del DHT11 en GPIO 4.");
    return;
  }

  Serial.printf("Lectura -> Temp: %.1f °C | Humedad: %.1f %% | Presion: %s hPa | "
                "Ruido: %.1f dB | Flama: %s (%.1f %%, raw %d)\n",
                tempC, humidity, pressureField, noiseDb,
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
  char payload[512];
  snprintf(payload, sizeof(payload),
           "{\"station_id\":\"%s\",\"name\":\"%s\",\"temperature_c\":%.2f,"
           "\"humidity_pct\":%.2f,\"pressure_hpa\":%s,"
           "\"noise_db\":%.1f,\"flame_detected\":%s,\"flame_intensity_pct\":%.1f,"
           "\"rssi_dbm\":%d,\"link_type\":\"wifi\"}",
           STATION_ID, STATION_NAME, tempC, humidity, pressureField,
           noiseDb, flameDetected ? "true" : "false",
           flameIntensityPct, (int)WiFi.RSSI());

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
