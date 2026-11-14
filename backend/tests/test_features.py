"""Variables del modelo: ventanas, etiquetas y que NO usen información del futuro."""

from datetime import date, timedelta

import numpy as np

from app.ml.features import FEATURES, assemble, build_cells, dry_days, labels, neighbors, trailing_sum


def test_trailing_sum_excludes_current_day():
    a = np.arange(1, 11, dtype=np.float32)[:, None]
    s = trailing_sum(a, 3)[:, 0]
    assert s[3] == 1 + 2 + 3  # días 0..2, no incluye el día 3
    assert s[0] == 0


def test_labels_cover_next_72h():
    f = np.zeros((10, 1), dtype=np.float32)
    f[4] = 1
    y = labels(f)[:, 0]
    assert list(y[:8]) == [0, 0, 1, 1, 1, 0, 0, 0]
    assert np.isnan(y[-2:]).all()  # futuro desconocido


def test_dry_days():
    p = np.array([[0], [2], [0], [0], [1.5], [0]], dtype=np.float32)
    assert dry_days(p)[:, 0].tolist() == [1, 0, 1, 2, 0, 1]


def test_grid():
    cells = build_cells()
    assert 300 < len(cells) < 450
    nb = neighbors(cells)
    assert all(len(n) <= 8 for n in nb)


def _random_inputs(days, n_cells, rng):
    F = (rng.random((len(days), n_cells)) < 0.05).astype(np.float32)
    weather = {
        "tmax": rng.uniform(5, 40, (len(days), n_cells)).astype(np.float32),
        "rh": rng.uniform(5, 90, (len(days), n_cells)).astype(np.float32),
        "wind": rng.uniform(0, 50, (len(days), n_cells)).astype(np.float32),
        "precip": rng.exponential(1, (len(days), n_cells)).astype(np.float32),
        "soil_wet": rng.uniform(0.05, 0.6, (len(days), n_cells)).astype(np.float32),
    }
    ndvi = rng.uniform(0, 0.8, (len(days), n_cells)).astype(np.float32)
    return F, weather, ndvi


def test_no_future_leakage():
    """Cambiar todo lo que pasa DESPUÉS del día t no debe cambiar ninguna variable del día t."""
    rng = np.random.default_rng(0)
    days = [date(2020, 1, 1) + timedelta(days=i) for i in range(900)]
    cells = build_cells()[:40]
    nb = [[j for j in range(max(0, i - 2), min(40, i + 3)) if j != i] for i in range(40)]
    elev = rng.uniform(500, 2500, 40).astype(np.float32)
    F, weather, ndvi = _random_inputs(days, 40, rng)
    base = assemble(days, F, weather, ndvi, elev, nb)

    t = 800
    F2, w2, n2 = F.copy(), {k: v.copy() for k, v in weather.items()}, ndvi.copy()
    F2[t:] = 1 - F2[t:]  # el día t y posteriores cambian por completo
    for k in w2:
        w2[k][t:] = rng.permutation(w2[k][t:])
    n2[t + 1 :] = 0.99
    changed = assemble(days, F2, w2, n2, elev, nb)
    for name in FEATURES:
        if name == "ndvi":  # ndvi[t] ya viene alineado a ≤ t-30 desde fuera
            continue
        np.testing.assert_allclose(base[name][t], changed[name][t], err_msg=f"{name} usa información del día t o posterior")
