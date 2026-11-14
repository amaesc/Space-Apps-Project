#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== ESP32 + DHT11 Test (GPIO 4) ===");
  dht.begin();
}

void loop() {
  // DHT11 requiere al menos 2 segundos entre lecturas
  delay(2000);

  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();

  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("[ERROR] No se pudo leer el DHT11 en GPIO 4. Revisa el cableado (VCC, GND, DATA y resistencia pull-up).");
    return;
  }

  float heatIndexC = dht.computeHeatIndex(tempC, humidity, false);

  Serial.print("Temperatura: ");
  Serial.print(tempC, 1);
  Serial.print(" °C | Humedad: ");
  Serial.print(humidity, 1);
  Serial.print(" % | Sensacion termica: ");
  Serial.print(heatIndexC, 1);
  Serial.println(" °C");
}
