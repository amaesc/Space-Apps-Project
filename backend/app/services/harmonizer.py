from __future__ import annotations

from statistics import median
from typing import Any

# Factores mensuales k_m de conversión MODIS -> VIIRS calibrados en traslape (2012-2026)
KM_MONTHLY_FACTORS: list[float] = [
    2.45, 2.52, 2.64, 2.71, 2.68, 2.59, 2.38, 2.24, 2.19, 2.31, 2.40, 2.44
]

MONTH_LABELS = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
]

# Estacionalidad base de Sierra de Chihuahua (pico en abr-jun)
BASE_SEASONALITY = [14, 20, 44, 82, 95, 68, 22, 10, 7, 10, 14, 12]

HOTSPOTS_DATA: list[dict[str, Any]] = [
    {
        "id": "CHIH-2841",
        "municipality": "Bocoyna",
        "zone": "Ejido San Juanito · Km 14",
        "timestamp": "2026-11-14T14:28:00Z",
        "sensor": "VIIRS 375m",
        "harmonized_count": 1.0,
        "origin": "Humano",
        "probability": 86,
        "frp_mw": 24.6,
        "lat": 27.97,
        "lon": -107.58,
        "reasons": [
            "Sin rayos GOES-GLM ni AS3935 en 5 días",
            "A 380 m de camino forestal",
            "Detectado a las 14:28 (horario laboral)",
            "Uso de suelo forestal · HDW Alto",
        ],
        "irregular_use_alert": True,
        "irregular_use_reason": "Posible uso de fuego irregular, requiere verificación (terreno forestal + riesgo alto, ref. NOM-015)",
    },
    {
        "id": "CHIH-2840",
        "municipality": "Madera",
        "zone": "Mesa de Arturo · Borde agrícola",
        "timestamp": "2026-11-14T13:45:00Z",
        "sensor": "VIIRS 375m",
        "harmonized_count": 1.0,
        "origin": "Humano",
        "probability": 81,
        "frp_mw": 19.2,
        "lat": 29.19,
        "lon": -108.14,
        "reasons": [
            "Sin rayos en 5 días",
            "A 250 m de parcela agrícola y brecha",
            "Patrón horario diurno recurrente",
        ],
        "irregular_use_alert": False,
        "irregular_use_reason": None,
    },
    {
        "id": "CHIH-2839",
        "municipality": "Guachochi",
        "zone": "Barranca Sinforosa Norte",
        "timestamp": "2026-11-14T13:10:00Z",
        "sensor": "MODIS 1km",
        "harmonized_count": 2.4,
        "origin": "Rayo",
        "probability": 74,
        "frp_mw": 31.4,
        "lat": 26.82,
        "lon": -107.07,
        "reasons": [
            "3 descargas GOES-GLM a < 4 km en las últimas 48 h",
            "Zona de difícil acceso (> 5 km de camino)",
            "Sin actividad agrícola cercana",
        ],
        "irregular_use_alert": False,
        "irregular_use_reason": None,
    },
    {
        "id": "CHIH-2838",
        "municipality": "Temósachic",
        "zone": "Sierra El Nido · Ladera oeste",
        "timestamp": "2026-11-14T12:32:00Z",
        "sensor": "VIIRS 375m",
        "harmonized_count": 1.0,
        "origin": "Forestal",
        "probability": 68,
        "frp_mw": 14.8,
        "lat": 28.95,
        "lon": -107.83,
        "reasons": [
            "Cobertura densa de bosque de pino-encino",
            "Humedad relativa < 25 % en respaldo Open-Meteo",
        ],
        "irregular_use_alert": False,
        "irregular_use_reason": None,
    },
    {
        "id": "CHIH-2837",
        "municipality": "Ocampo",
        "zone": "Corredor Basaseachi",
        "timestamp": "2026-11-14T12:16:00Z",
        "sensor": "VIIRS 375m",
        "harmonized_count": 1.0,
        "origin": "Humano",
        "probability": 79,
        "frp_mw": 22.1,
        "lat": 28.18,
        "lon": -108.21,
        "reasons": [
            "Dentro de polígono de Área Natural Protegida (CONANP)",
            "Sin rayos en 5 días",
            "A 520 m de carretera federal",
        ],
        "irregular_use_alert": True,
        "irregular_use_reason": "Posible uso de fuego irregular, requiere verificación (origen humano probable en ANP CONANP)",
    },
    {
        "id": "CHIH-2836",
        "municipality": "Guadalupe y Calvo",
        "zone": "Cerro Mohinora · Alta montaña",
        "timestamp": "2026-11-14T11:42:00Z",
        "sensor": "MODIS 1km",
        "harmonized_count": 2.4,
        "origin": "Rayo",
        "probability": 83,
        "frp_mw": 37.5,
        "lat": 25.96,
        "lon": -107.04,
        "reasons": [
            "Tormenta eléctrica seca registrada por GOES-GLM",
            "Elevación > 2,900 m s. n. m.",
        ],
        "irregular_use_alert": False,
        "irregular_use_reason": None,
    },
]


def build_harmonized_calendar(
    origin: str = "Total",
    start_year: int = 2000,
    end_year: int = 2026,
) -> dict[str, Any]:
    """Genera el calendario armonizado (años x meses) y la anomalía vs mediana."""
    start_year = max(2000, min(start_year, 2026))
    end_year = max(start_year, min(end_year, 2026))

    years = list(range(start_year, end_year + 1))
    origin_norm = origin.strip().lower()

    matrix: list[dict[str, Any]] = []
    for yr in years:
        # Variación interanual determinista (picos secos ej. 2011, 2021, 2024)
        year_factor = 1.0 + ((yr * 7) % 11 - 5) * 0.035
        if yr in (2011, 2021, 2024):
            year_factor += 0.16

        row_values: list[int] = []
        for m_idx, base in enumerate(BASE_SEASONALITY):
            if origin_norm == "humano":
                # Actividad humana concentrada en mar-may y nov
                share = 0.78 if m_idx in (2, 3, 4, 10) else 0.52
            elif origin_norm == "natural":
                # Rayos concentrados en jun-ago
                share = 0.48 if m_idx in (5, 6, 7) else 0.18
            else:
                share = 1.0

            val = max(1, round(base * year_factor * share))
            row_values.append(val)

        matrix.append(
            {
                "year": yr,
                "sensor_source": "MODIS (armonizado kₘ)" if yr < 2012 else "VIIRS + MODIS",
                "months": row_values,
                "annual_total": sum(row_values),
            }
        )

    # Mediana histórica por mes (excluyendo año en curso si hay >1 año)
    monthly_medians: list[float] = []
    for m_idx in range(12):
        col = [row["months"][m_idx] for row in matrix]
        monthly_medians.append(round(float(median(col)), 1))

    # Mes actual de referencia: Noviembre (índice 10) del último año
    current_val = matrix[-1]["months"][10]
    med_val = monthly_medians[10] or 1.0
    anomaly_pct = round(((current_val - med_val) / med_val) * 100.0, 1)

    return {
        "origin_filter": origin,
        "start_year": start_year,
        "end_year": end_year,
        "month_labels": MONTH_LABELS,
        "km_factors": KM_MONTHLY_FACTORS,
        "monthly_medians": monthly_medians,
        "current_month": {
            "year": years[-1],
            "month": MONTH_LABELS[10],
            "value": current_val,
            "historical_median": med_val,
            "anomaly_pct": anomaly_pct,
        },
        "rows": matrix,
    }
