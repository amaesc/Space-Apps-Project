# Modelo predictivo de incendio (FuegoData)

Probabilidad de que haya **al menos una detección VIIRS (NASA FIRMS)** en cada celda de 0.25° de
Chihuahua durante las **próximas 72 h**.

```bash
python3 -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements.txt
# Detecciones VIIRS (las descarga el servidor de la Raspberry Pi):
rsync -az raspi:fuegodata/backend/data/nasa_fires/viirs_n20/ ml/data/raw/fires_viirs_n20/
ml/.venv/bin/python ml/build_dataset.py   # clima NASA POWER, NDVI de GIBS, altitud → ml/data/dataset.npz
ml/.venv/bin/python ml/train.py           # valida año por año y guarda backend/models/*
```

- Variables compartidas con el servidor: `backend/app/ml/features.py` (mismo cálculo al entrenar y al predecir).
- Solo usa información disponible cada mañana (fuego hasta ayer, clima de hace 3 días, NDVI de hace ≥30 días).
- Resultados de validación: [`reports/model_report.md`](reports/model_report.md).
- Servidor: `GET /api/model/forecast` (mapa) · `GET /api/model/info` (métricas) · la respuesta de
  `POST /api/iot/telemetry` incluye `model_risk` para los 5 LEDs de la estaca.
