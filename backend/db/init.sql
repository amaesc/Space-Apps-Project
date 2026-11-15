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

-- Métricas adicionales de la estaca (idempotente: se puede aplicar varias veces).
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS pressure_hpa DOUBLE PRECISION;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS noise_db DOUBLE PRECISION;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS rssi_dbm INTEGER;
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS link_type VARCHAR(16);
ALTER TABLE iot_readings ADD COLUMN IF NOT EXISTS luminosity_pct DOUBLE PRECISION;

