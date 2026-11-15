# FuegoData — Wildfire Hotspot Map & Burn Calendar

> **NASA Space Apps Challenge 2026** · Team **UNDEFINED** · Pilot region: **Sierra de Chihuahua, Mexico**

**FuegoData** is a geospatial wildfire intelligence platform that harmonizes **MODIS** (1 km) and **VIIRS** (375 m) satellite hotspots from NASA FIRMS into a consistent **burn calendar**, integrates field **IoT telemetry** (with automatic meteorological fallback), and estimates the **probable origin** of fire detections (_Human_, _Lightning_, _Wildland_, _Undetermined_).

---

## 1. The Problem

Satellite sensors **MODIS** (active since 2000) and **VIIRS** (active since 2012) differ in spatial resolution, thermal sensitivity, and overpass schedules. Comparing raw counts directly introduces artificial jumps across multi-decade records, making it difficult for brigades, researchers, and local communities to separate real wildfire anomalies from sensor changes—or to distinguish natural lightning fires from human-caused ignitions.

---

## 2. Solution Architecture

FuegoData couples satellite harmonization, edge IoT hardware, and probabilistic origin modeling:

1. **MODIS → VIIRS Harmonization ($k_m$)**
   - Monthly calibration using a $k_m$ factor across the overlap window, with confidence intervals and cross-validation.
   - Enables a continuous historical burn calendar (`Años × Meses`) without sensor distortion.
2. **Field IoT Stations + Automatic Fallback**
   - Autonomous solar-powered **ESP32** nodes (WiFi / LoRa) with **BME280** (temperature & relative humidity), wind/rain sensors, **AS3935** lightning detector, local screen, and a 5-LED risk semaphore.
   - In areas without IoT coverage, the platform falls back to gridded weather and satellite data (**Open-Meteo** & **GOES-GLM**).
3. **Probable Origin & Risk Estimation**
   - Combines thermal detections, lightning proximity, weather conditions (FWI), and land context to classify probable origin (`Human`, `Lightning`, `Wildland`, `Undetermined`) and flag potential irregular fire use for preventive inspection.
   - _Note: Probabilistic estimates are intended to prioritize preventive inspections and do not constitute legal proof._

---

## 3. Current Implementation (`web/`)

The frontend is a **static Next.js export** (`output: "export"`) ready for **GitHub Pages**, connected to a live **Raspberry Pi API** exposed via **Tailscale Funnel** (no built-in demo data: if the API is unreachable, the site says so instead of showing invented values).

### Tech Stack

- **Framework:** Next.js 16 (`16.4.6`, Turbopack, static export) · React 19 (`19.3.0`) · TypeScript 5
- **Styling:** Tailwind CSS v4 (`@tailwindcss/turbopack`)
- **Maps:** Leaflet (`1.9.4`) + OpenStreetMap / Satellite basemaps
- **Package Manager / Runtime:** Bun (`bun@1.4.2`)
- **Edge Backend:** Raspberry Pi API via Tailscale Funnel (`NEXT_PUBLIC_API_URL`) with a `/lite` mode for slow rural connections

### Routes

| Route           | Purpose                                                                                                                                                                                                                                                                                                           |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | **Live Wildfire Map (`FireMapPage`)**: Satellite/street basemap, time filters (`24HRS`, `7DAYS`, `ALL`), origin filters, on-demand layers (NASA FIRMS, historical monthly fires, model forecast probability, weather grid, IoT stations), burn calendar modal, CSV export, and slow-connection `/lite` detection. |
| `/data`         | Open data & CSV download center (`DataDownloads`).                                                                                                                                                                                                                                                                |
| `/challenge`    | Background on the MODIS/VIIRS discontinuity and wildfire detection challenge.                                                                                                                                                                                                                                     |
| `/how-it-works` | Detailed architecture, harmonization pipeline, and IoT + fallback design.                                                                                                                                                                                                                                         |
| `/about`        | Platform overview and module breakdown (`AboutTabs`).                                                                                                                                                                                                                                                             |
| `/team`         | Team **UNDEFINED** and NASA Space Apps Challenge 2026 context.                                                                                                                                                                                                                                                    |

### Project Structure

```text
Space-Apps-Project/
├── Imagen/                     # Source illustrations & visual assets
└── web/                        # Next.js static web application
    ├── app/
    │   ├── page.tsx            # Main interactive wildfire map (/)
    │   ├── data/page.tsx       # Data & CSV downloads (/data)
    │   ├── (landing)/          # Informational pages (/about, /challenge, /how-it-works, /team)
    │   ├── layout.tsx          # Root metadata & Titillium Web font
    │   └── globals.css         # Tailwind v4 & map/animation styles
    ├── components/
    │   ├── ChihuahuaOsmMap.tsx # Leaflet interactive map
    │   ├── LazyMap.tsx         # Client-side lazy map wrapper
    │   ├── SiteHeader.tsx      # Top navigation bar
    │   ├── HeroHarmonizationPreview.tsx
    │   ├── DataDownloads.tsx
    │   ├── AboutTabs.tsx
    │   └── ModelCard.tsx
    ├── lib/
    │   ├── api.ts              # Live Raspberry Pi API hooks + demo fallback
    │   ├── fire-data.ts        # Types, risk scales, CSV/GeoJSON export
    │   ├── layers.ts           # Satellite, weather & historical layer definitions
    │   └── asset.ts            # Base-path helper for GitHub Pages
    └── next.config.ts          # output: "export", PAGES_BASE_PATH, unoptimized images
```

---

## 4. Local Development

### Prerequisites

- [Bun](https://bun.sh/) (`1.4.2+`) or Node.js (`20+`)

### Run locally

```bash
cd web
bun install
bun run dev
```

Open `http://localhost:3000` in your browser.

### Estación IoT ESP32 (DHT11 + Sonido + Flama + Presión)

El sketch `esp32/dht11_wifi/dht11_wifi.ino` está incluido en `.gitignore` porque guarda credenciales estáticas directamente en el archivo (`WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL`, `STATION_TOKEN`).

- **Conexiones (ESP32-WROOM-32)**:
  - `DHT11` (`DATA`) → `GPIO 4`
  - Sensor de sonido `KY-037 / KY-038` (`A0`) → `GPIO 35`
  - Sensor de flama IR `KY-026` (`A0`) → `GPIO 32`
  - Barómetro `BMP280` (I2C) → `GPIO 21` (`SDA`), `GPIO 22` (`SCL`)
- **Referencia de credenciales**: toma como plantilla [secrets.example.h](esp32/dht11_wifi/secrets.example.h) para configurar `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL` (`https://raspi.taile2c6bf.ts.net/api/iot/telemetry` o `http://<IP-local>:8000/api/iot/telemetry`) y `STATION_TOKEN`.
- **Backend local**:
  ```bash
  cd backend
  .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```

---

### Environment Variables (`web/.env.local`)

| Variable              | Description                                                                    | Default                           |
| :-------------------- | :----------------------------------------------------------------------------- | :-------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the Raspberry Pi API (Tailscale Funnel)                            | `https://raspi.taile2c6bf.ts.net` |
| `PAGES_BASE_PATH`     | Optional base path when deploying to GitHub Pages (e.g. `/Space-Apps-Project`) | `""`                              |

### Available Scripts (inside `web/`)

```bash
bun run dev     # Start local development server
bun run build   # Generate static export (out/)
bun run start   # Serve production build
bun run lint    # Run ESLint
```

---

## 5. Harmonized hotspot series and weekly risk model

> Added with AI assistance (see [`AI_DISCLOSURE.md`](AI_DISCLOSURE.md)). Uses NASA FIRMS data only.

**`harmonization/`** builds one consistent hotspot series from the MODIS (Terra + Aqua) and VIIRS (Suomi-NPP) FIRMS archives for northern Chihuahua (2002 to 2026-07).
All 481,029 rows are kept and one flag column, `in_calendar`, marks the 55,902 rows that form the consistent series for counts and the burn calendar
(Aqua before 2012-01-20, then Suomi-NPP cells of at least 15 MW, which is about where MODIS detects half the fires).
`confidence` and `acq_date` get the same type for both sensors, and MODIS `brightness` is mapped onto VIIRS (capped at 367 K).
Validation: S-NPP monthly counts go from 11.7x Aqua to 0.91x (correlation 0.967 to 0.984), and the rule holds on held-out years (threshold fitted on 2012 to 2019, tested on 2020 to 2026).
Known limits: about 10 % residual offset after 2012, the series ends 2026-07-31, parameters were fitted in this region only, night brightness is approximate.
Details, validation tables and the check notebook: [`harmonization/README.md`](harmonization/README.md).
The 40 MB output CSV (`harmonization/harmonized_hotspots.csv`) is stored in git; it can also be rebuilt with the script, and `harmonization/s3_io.py` can move files to the S3 bucket.

**`risk_model_weekly/`** predicts the probability of at least one hotspot per 0.1 degree cell in the next 7, 14 or 28 days from that series (LightGBM, calibrated, time-based validation).
On 2023-01 to 2026-07 (held out), the 7-day model reaches precision-recall AUC 0.118 against 0.070 for cell climatology, and finds 47 % of the burning cells in its top 5 % (climatology: 37 %);
it beat climatology in all 18 yearly backtests. The 28-day model is only slightly better than climatology and the model over-predicts by about 18 % on 2023 to 2026.
It is separate from `ml/` (72 h, weather and NDVI) and is not connected to the backend or the web app. See [`risk_model_weekly/README.md`](risk_model_weekly/README.md).
