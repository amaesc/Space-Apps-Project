"""Entrena y valida el modelo de probabilidad de incendio (72 h, celdas de 0.25°).

Uso:  ml/.venv/bin/python ml/train.py

- Validación "leave-one-year-out" 2020–2025 (entrena con los demás años y evalúa el año fuera).
- Compara contra 3 referencias: climatología de la celda, persistencia (fuego últimos 7 días)
  e índice Hot-Dry-Windy (HDW, el que usa hoy la estaca).
- Calibra la probabilidad (isotónica sobre predicciones fuera de muestra).
- Guarda el modelo final (todos los años) para el servidor:
    backend/models/fire_lgbm.txt  ·  backend/models/fire_model.json
- Reporte: ml/reports/model_report.md y ml/reports/metrics.json
"""

from __future__ import annotations

import json
import time
from datetime import date
from pathlib import Path

import lightgbm as lgb
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "ml" / "data" / "dataset.npz"
MODELS = ROOT / "backend" / "models"
REPORTS = ROOT / "ml" / "reports"

PARAMS = {
    "objective": "binary",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 300,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "lambda_l2": 1.0,
    "verbose": -1,
    "seed": 42,
    "num_threads": 0,
}
ROUNDS = 400
LEVEL_NAMES = ["Low", "Moderate", "High", "Very high", "Extreme"]
# Niveles por percentil de riesgo (todas las celdas-día): top 1 % = Extreme, top 5 % = Very high, …
LEVEL_TOP_SHARE = [None, 0.40, 0.15, 0.05, 0.01]


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def topk_recall(score: np.ndarray, y: np.ndarray, issue: np.ndarray, share: float = 0.10) -> float:
    """% de celdas-día con fuego que caen en el `share` de celdas con mayor puntaje de cada día."""
    caught = total = 0
    for d in np.unique(issue):
        m = issue == d
        yy = y[m]
        if yy.sum() == 0:
            continue
        k = max(1, int(round(share * m.sum())))
        top = np.argsort(-score[m])[:k]
        caught += yy[top].sum()
        total += yy.sum()
    return float(caught / total) if total else float("nan")


def metrics(score: np.ndarray, y: np.ndarray, issue: np.ndarray) -> dict:
    s = np.nan_to_num(score, nan=0.0)
    return {
        "auc": round(float(roc_auc_score(y, s)), 4),
        "ap": round(float(average_precision_score(y, s)), 4),
        "top10_recall": round(topk_recall(s, y, issue), 4),
    }


def main() -> None:
    d = np.load(DATA, allow_pickle=False)
    X, y, issue, cell = d["X"], d["y"], d["issue"], d["cell"]
    features = [str(f) for f in d["features"]]
    keep = np.isfinite(y)
    X, y, issue, cell = X[keep], y[keep].astype(np.int8), issue[keep], cell[keep]
    years = np.array([date.fromordinal(int(o)).year for o in issue])
    log(f"{len(y):,} filas · {len(features)} variables · tasa de fuego {y.mean():.2%}")

    fi = {f: i for i, f in enumerate(features)}
    baselines = {
        "climatology": X[:, fi["clim"]],
        "persistence_7d": X[:, fi["fire_7d"]] + 0.1 * X[:, fi["fire_nb_7d"]],
        "hdw_index": X[:, fi["hdw"]],
    }

    oof = np.full(len(y), np.nan, dtype=np.float64)
    per_year = []
    for yr in sorted(set(years)):
        tr, te = years != yr, years == yr
        booster = lgb.train(PARAMS, lgb.Dataset(X[tr], y[tr], feature_name=features), num_boost_round=ROUNDS)
        oof[te] = booster.predict(X[te])
        row = {"year": int(yr), "fire_rate": round(float(y[te].mean()), 4), "model": metrics(oof[te], y[te], issue[te])}
        for name, s in baselines.items():
            row[name] = metrics(s[te], y[te], issue[te])
        per_year.append(row)
        log(f"{yr}: modelo AUC {row['model']['auc']} AP {row['model']['ap']} top10 {row['model']['top10_recall']} · "
            f"HDW AUC {row['hdw_index']['auc']} · clim AUC {row['climatology']['auc']} · persist AUC {row['persistence_7d']['auc']}")

    overall = {"model": metrics(oof, y, issue)}
    for name, s in baselines.items():
        overall[name] = metrics(s, y, issue)

    # Calibración isotónica sobre predicciones fuera de muestra.
    iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(oof, y)
    cal = iso.predict(oof)
    overall["model"]["brier_calibrated"] = round(float(brier_score_loss(y, cal)), 5)
    overall["model"]["brier_climatology_rate"] = round(float(brier_score_loss(y, np.full_like(cal, y.mean()))), 5)

    # Umbrales de nivel por percentil del riesgo calibrado + tasa real de fuego por nivel.
    thresholds = [0.0] + [float(np.quantile(cal, 1 - s)) for s in LEVEL_TOP_SHARE[1:]]
    level = np.searchsorted(np.array(thresholds[1:]), cal, side="right") + 1
    level_stats = []
    for lv in range(1, 6):
        m = level == lv
        level_stats.append({
            "level": lv,
            "name": LEVEL_NAMES[lv - 1],
            "min_probability": round(thresholds[lv - 1], 4),
            "share_of_cells": round(float(m.mean()), 4),
            "observed_fire_rate": round(float(y[m].mean()), 4) if m.any() else None,
            "share_of_fires": round(float(y[m].sum() / y.sum()), 4),
        })
    log("niveles: " + " · ".join(f"{s['name']} {s['observed_fire_rate']:.1%}" for s in level_stats))

    # Modelo final con todos los años.
    final = lgb.train(PARAMS, lgb.Dataset(X, y, feature_name=features), num_boost_round=ROUNDS)
    gain = final.feature_importance(importance_type="gain")
    importance = sorted(
        ({"feature": f, "gain_share": round(float(g / gain.sum()), 4)} for f, g in zip(features, gain)),
        key=lambda r: -r["gain_share"],
    )

    MODELS.mkdir(parents=True, exist_ok=True)
    final.save_model(str(MODELS / "fire_lgbm.txt"))
    meta = {
        "version": date.today().isoformat(),
        "target": "≥1 VIIRS NOAA-20 detection (nominal/high confidence) in the 0.25° cell within 72 h",
        "training_period": [str(date.fromordinal(int(issue.min()))), str(date.fromordinal(int(issue.max())))],
        "features": features,
        "rounds": ROUNDS,
        "base_rate": round(float(y.mean()), 5),
        "isotonic": {"x": iso.X_thresholds_.tolist(), "y": iso.y_thresholds_.tolist()},
        "level_thresholds": thresholds,
        "levels": level_stats,
        "validation": {"scheme": "leave-one-year-out", "overall": overall, "per_year": per_year},
        "importance": importance,
    }
    (MODELS / "fire_model.json").write_text(json.dumps(meta, indent=2))
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "metrics.json").write_text(json.dumps({"overall": overall, "per_year": per_year, "levels": level_stats, "importance": importance}, indent=2))

    def row(name: str, m: dict) -> str:
        return f"| {name} | {m['auc']:.3f} | {m['ap']:.3f} | {m['top10_recall']:.1%} |"

    lines = [
        "# FuegoData — fire probability model (v1)",
        "",
        f"Target: {meta['target']}. Training period {meta['training_period'][0]} → {meta['training_period'][1]} "
        f"({len(y):,} cell-days, fire rate {y.mean():.2%}). Validation: leave-one-year-out.",
        "",
        "## Overall (out-of-sample)",
        "",
        "| Method | ROC AUC | Avg. precision | Fires caught in top 10 % cells/day |",
        "|---|---|---|---|",
        row("**FuegoData model (LightGBM)**", overall["model"]),
        row("Climatology of the cell", overall["climatology"]),
        row("Persistence (fire last 7 days)", overall["persistence_7d"]),
        row("Hot-Dry-Windy index", overall["hdw_index"]),
        "",
        f"Brier score (calibrated): {overall['model']['brier_calibrated']} vs {overall['model']['brier_climatology_rate']} for a constant base rate.",
        "",
        "## Risk levels",
        "",
        "| Level | Min. probability (72 h) | Share of cells | Observed fire rate | Share of all fires |",
        "|---|---|---|---|---|",
        *[f"| {s['name']} | {s['min_probability']:.1%} | {s['share_of_cells']:.0%} | {s['observed_fire_rate']:.1%} | {s['share_of_fires']:.0%} |" for s in level_stats],
        "",
        "## Per year (ROC AUC)",
        "",
        "| Year | Fire rate | Model | Climatology | Persistence | HDW |",
        "|---|---|---|---|---|---|",
        *[f"| {r['year']} | {r['fire_rate']:.2%} | {r['model']['auc']:.3f} | {r['climatology']['auc']:.3f} | {r['persistence_7d']['auc']:.3f} | {r['hdw_index']['auc']:.3f} |" for r in per_year],
        "",
        "## Most important variables (gain)",
        "",
        *[f"- {r['feature']}: {r['gain_share']:.1%}" for r in importance[:10]],
        "",
    ]
    (REPORTS / "model_report.md").write_text("\n".join(lines))
    log(f"modelo → {MODELS / 'fire_lgbm.txt'} · reporte → {REPORTS / 'model_report.md'}")


if __name__ == "__main__":
    main()
