# UNDEFINED — Calendario Armonizado de Quema y Riesgo de Incendio

> **NASA Space Apps Challenge 2026** · Caso piloto: **Sierra de Chihuahua, México**

Plataforma web geoespacial que unifica más de dos décadas de puntos calientes satelitales **MODIS** (1 km) y **VIIRS** (375 m) en un **calendario consistente de actividad de quema**, acoplado con telemetría **IoT en campo** y estimación probabilística del **origen probable** de los incendios.

---

## 1. El Problema

Los sensores satelitales **MODIS** (a bordo de Terra y Aqua, desde el año 2000) y **VIIRS** (desde 2012, con mayor resolución espacial y sensibilidad) no son comparables de forma directa: difieren en tamaño de píxel, sensibilidad térmica y horarios de paso. Esto impide a brigadistas, científicos y gestores territoriales comparar el mes actual contra la mediana histórica o detectar anomalías reales sin sesgo de sensor.

## 2. Propuesta de Solución (**UNDEFINED**)

Nuestra arquitectura acopla **tres módulos**:

1. **Armonización MODIS → VIIRS ($k_m$)**:
   - Calibración mensual mediante un factor $k_m$ en la ventana de traslape (2012–2026) con intervalos de confianza por _bootstrap_ y validación _leave-year-out_.
   - Permite visualizar una serie temporal continua (2000–2026) donde el sensor de origen deja de distorsionar las tendencias y anomalías.
2. **Estación IoT en campo + Fallback automático**:
   - Nodo autónomo con **ESP32 (WiFi / LoRa)**, **BME280** (temperatura y humedad relativa), sensores de viento y lluvia, detector de rayos **AS3935**, pantalla local con 5 LEDs de alerta y panel solar.
   - Si no hay cobertura IoT en una zona, el sistema cambia automáticamente a respaldo satelital/meteorológico (**Open-Meteo** + **GOES-GLM**).
3. **Estimación de origen probable**:
   - Clasificación probabilística por zona (`Humano`, `Rayo`, `Forestal`, `Indeterminado`) cruzando detecciones térmicas con descargas eléctricas (**GOES-GLM**), registros de **CONAFOR** y polígonos de **CONANP**.
   - _Nota: Estimaciones orientadas a priorizar inspecciones preventivas; no constituyen prueba legal._

---

## 3. Estado Actual Implementado (`web/`)

Stack: **Next.js 16 (App Router)** · **React 19** · **TypeScript** · **Tailwind CSS v4** · **Leaflet + OpenStreetMap** · **Bun**.

| Ruta          | Descripción                                                                                                                                                                                                                                                         |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`           | Landing principal con demo interactiva de armonización (`Sin armonizar` vs `Armonizado` + matriz años × meses), arquitectura de 3 módulos, roadmap de 6 vistas y sección de equipo.                                                                                 |
| `/login`      | Acceso con pestañas **Iniciar sesión / Crear cuenta** y flujo real de **Google OAuth 2.0** con cookies HTTP-only firmadas (HMAC-SHA256).                                                                                                                            |
| `/dashboard`  | Centro de mando geoespacial: mapa oscuro de **OpenStreetMap** centrado en Sierra de Chihuahua, feed de detecciones sincronizado, filtros por origen probable, KPIs de 28 días, gráfica de distribución por origen, serie diaria armonizada y **descarga CSV** real. |
| `/api/auth/*` | Endpoints de autenticación (`/api/auth/google`, `/api/auth/google/callback`, `/api/auth/session`, `/api/auth/logout`).                                                                                                                                              |

---

## 4. Cómo ejecutar en local

```bash
cd web
bun install
cp .env.example .env.local
# Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y AUTH_SECRET en web/.env.local
bun run dev


## 5. Mejoras propuestas sobre `web/` (alineadas al documento de proyecto)

Para cubrir al 100 % la propuesta técnica de **UNDEFINED** y los objetivos del reto NASA Space Apps:

1. **Ficha explicable + alerta de posible uso irregular**:
   - Mostrar las razones principales de cada predicción (ej. *sin rayos GOES-GLM en 5 días, a 400 m de un camino, sábado 15:00 h, terreno forestal, FWI alto*).
   - Etiquetar con **"Posible uso de fuego irregular, requiere verificación"** cuando coincida origen humano probable con áreas naturales protegidas (**CONANP**), terreno forestal o riesgo muy alto/extremo (referencia **NOM-015-SEMARNAT/SAGARPA**).
2. **Pestañas con las 6 vistas en `/dashboard`**:
   - **Mapa y Resumen 28d**: Vista geoespacial actual con detecciones recientes y KPIs.
   - **Calendario 2000–2026**: Matriz completa años × meses filtrable por **Total / Natural / Humano**, comparando el **mes actual contra la mediana histórica** ($\Delta\%$).
   - **Estación IoT y Metodología**: Telemetría en campo (BME280, viento/lluvia, AS3935, 5 niveles de riesgo, fallback Open-Meteo), validación *leave-year-out* y curvas de calibración (Regresión Logística / LightGBM).
3. **Capas en OpenStreetMap (Leaflet)**:
   - Mostrar nodos de estaciones **ESP32** con su semáforo de riesgo y toggle para polígonos **CONANP** / áreas de interés (AOI por polígono o `lat, lon` + radio).
4. **Exportación CSV enriquecida y rampas accesibles**:
   - Incluir `sensor_origen`, `conteo_armonizado_km`, `origen_probable`, `probabilidad_pct`, `razones` y `alerta_uso_irregular`, además de paletas accesibles (*Viridis / Cividis*).
5. **Conexión con datos reales de NASA FIRMS**:
   - Ingestar históricos y recientes de **MODIS C6.1** y **VIIRS (S-NPP, NOAA-20, NOAA-21)** junto con registros de **CONAFOR** y **GOES-GLM**.

---

## 6. Guion de Demostración (3 minutos)

1. **El reto (`/`)**: Mostrar en `#preview` la diferencia entre las series **Sin armonizar** y **Armonizado ($k_m$)** en Sierra de Chihuahua.
2. **Acceso (`/login`)**: Iniciar sesión con **Google OAuth 2.0** hacia el centro de mando.
3. **Operación (`/dashboard`)**: Filtrar puntos por origen probable en **OpenStreetMap**, inspeccionar un punto humano con sus razones y alerta de verificación, revisar la telemetría **ESP32** y descargar el **CSV**.

---

## 7. Plan de Trabajo por Fases

- **Fase 1 (MVP Hackathon — Actual)**: Landing explicativa + demo interactiva, autenticación Google OAuth, dashboard geoespacial con OpenStreetMap, filtros por origen y descarga CSV con datos piloto de Sierra de Chihuahua.
- **Fase 2 (Integración de Datos y Hardware)**: Calendario completo 2000–2026 con datos reales de NASA FIRMS, entrenamiento de modelo de origen con histórico CONAFOR + GOES-GLM y conexión en vivo de la estación **ESP32**.

---

## 8. Alcances y Limitaciones

- La atribución de origen es una **probabilidad estadística** para priorizar inspecciones preventivas; en ningún caso señala predios ni personas ni constituye prueba legal.
- Fuera del radio de cobertura de la estación IoT en campo, el sistema utiliza respaldo modelado de **Open-Meteo** y **GOES-GLM**.
- El modelo de riesgo estima peligro según condiciones meteorológicas y estacionales; no predice el punto ni la hora exacta de inicio de un incendio.
```
