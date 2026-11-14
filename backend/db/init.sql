CREATE TABLE IF NOT EXISTS iot_readings (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL DEFAULT 'Estación Sierra de Chihuahua',
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    temperature_c DOUBLE PRECISION NOT NULL,
    humidity_pct DOUBLE PRECISION NOT NULL,
    wind_kmh DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    rain_mm DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lightning_strikes INTEGER NOT NULL DEFAULT 0,
    battery_v DOUBLE PRECISION NOT NULL DEFAULT 4.1,
    hdw_score DOUBLE PRECISION NOT NULL,
    risk_level INTEGER NOT NULL,
    risk_label VARCHAR(32) NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'esp32-field',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_readings_station_time
    ON iot_readings (station_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS hotspots (
    id VARCHAR(32) PRIMARY KEY,
    municipality VARCHAR(80) NOT NULL,
    zone VARCHAR(160) NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    sensor VARCHAR(32) NOT NULL,
    harmonized_count DOUBLE PRECISION NOT NULL,
    origin VARCHAR(32) NOT NULL,
    probability INTEGER NOT NULL,
    frp_mw DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    irregular_use_alert BOOLEAN NOT NULL DEFAULT FALSE,
    irregular_use_reason TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    organization VARCHAR(120),
    provider VARCHAR(32) NOT NULL DEFAULT 'local',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO iot_readings (
    station_id, name, lat, lon, temperature_c, humidity_pct, wind_kmh,
    rain_mm, lightning_strikes, battery_v, hdw_score, risk_level, risk_label, source
)
SELECT
    'ESP32-CHIH-04', 'Bocoyna · San Juanito', 27.97, -107.58,
    27.4, 22.0, 24.5, 0.0, 0, 4.12, 68.1, 4, 'Muy Alto', 'esp32-field'
WHERE NOT EXISTS (
    SELECT 1 FROM iot_readings WHERE station_id = 'ESP32-CHIH-04'
);

INSERT INTO iot_readings (
    station_id, name, lat, lon, temperature_c, humidity_pct, wind_kmh,
    rain_mm, lightning_strikes, battery_v, hdw_score, risk_level, risk_label, source
)
SELECT
    'ESP32-CHIH-07', 'Guachochi · Sinforosa', 26.82, -107.07,
    22.8, 41.0, 14.0, 0.0, 3, 3.98, 41.3, 2, 'Moderado', 'esp32-field'
WHERE NOT EXISTS (
    SELECT 1 FROM iot_readings WHERE station_id = 'ESP32-CHIH-07'
);

-- Métricas adicionales de la estaca (idempotente: se puede aplicar varias veces).
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS pressure_hpa DOUBLE PRECISION;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS noise_db DOUBLE PRECISION;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS rssi_dbm INTEGER;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS link_type VARCHAR(16);
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS luminosity_pct DOUBLE PRECISION;

-- Valores de demostración para las estaciones de ejemplo que aún no los tienen.
UPDATE iot_readings SET pressure_hpa = 781.4, noise_db = 38, rssi_dbm = -67, link_type = 'wifi'
WHERE station_id = 'ESP32-CHIH-04' AND pressure_hpa IS NULL;
UPDATE iot_readings SET pressure_hpa = 802.9, noise_db = 44, rssi_dbm = -98, link_type = 'lora'
WHERE station_id = 'ESP32-CHIH-07' AND pressure_hpa IS NULL;
