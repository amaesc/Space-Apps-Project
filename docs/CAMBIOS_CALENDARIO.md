# Registro de cambios del Calendario de Quema Armonizado

Documento de referencia con todos los cambios implementados sobre el componente del calendario en [`web/app/page.tsx`](../web/app/page.tsx) (rama `main`, commit actual `49d18ce`).

---

## 1. Historial de commits en Git

| Commit | Mensaje | Archivo modificado | Resumen |
| :--- | :--- | :--- | :--- |
| `18f37be` | `Calendario agregado` | `web/app/page.tsx` (+160 / -5) | Integración inicial del calendario de quema armonizado y rango de fechas en el panel lateral. |
| `9e52434` | `Cambio calendario 1` | `web/app/page.tsx` (+36 / -8) | **Opción 1:** Celdas clicables conectadas al mapa (`onSelectMonth`, `selectedMonth`). |
| `5bb099a` | `Cambio 2` | `web/app/page.tsx` (+53 / -23) | **Opción 2:** Selector de fuente dentro del modal (`in_calendar = 1` vs. `Live API (GIBS)`). |
| `4101343` | `Change calendario 3` | `web/app/page.tsx` (+68 / -26) | **Opción 3:** Columna `Total` anual, toggle `Show counts` y leyenda de escala `0 → máx`. |
| `6ef4f18` | `Cambios de calendario impresión de excel` | `web/app/page.tsx` (+36 / -4) | **Opción 4:** Corrección de recorte superior en `Modal` y exportación a CSV (`exportCalendarCsv`). |
| `9e2f772` / `149feac` | `Cambios de web` / `update backend-mass push` | `web/app/page.tsx` | Adaptación de `CalendarHeatmap` a la API nacional/estatal (`region`: `"Mexico"` o estado, ya unificada en `in_calendar = 1`). |

---

## 2. Detalle de funcionalidades implementadas

### A. Celdas clicables conectadas al mapa (`onSelectMonth` / `selectedMonth`)
- Cada celda con datos en `CalendarHeatmap` funciona como un `<button>` interactivo (`aria-label="Load ... on map"`).
- Al hacer clic en cualquier mes (por ejemplo `May 2011`), `FireMapPage`:
  1. Actualiza `historyMonth` al formato `YYYY-MM` correspondiente.
  2. Limpia `historyStartDate` y `historyEndDate` para evitar conflictos con rangos previos.
  3. Activa la capa **Historical fires (harmonized)** (`fire.history = true`).
  4. Cierra el modal automáticamente para mostrar ese mes en el mapa.
- El mes actualmente seleccionado en el mapa se resalta dentro de la matriz con un contorno dorado (`ring-1 ring-[#f5c518]`).

### B. Columna `Total`, conteos en celda (`Show counts`) y leyenda de escala
- **Columna `Total`:** Se añadió una columna al final de la tabla con la suma anual de detecciones por fila y la suma de medianas mensuales en la fila `Median` (en la fila `kₘ` muestra `—`).
- **Toggle `Show counts`:** Checkbox en la esquina superior derecha del calendario que muestra u oculta el valor numérico dentro de cada celda (cambiando la altura de celda entre `h-4` y `h-5` para mantener legibilidad).
- **Leyenda `0 → máx`:** Barra de gradiente debajo de la tabla indicando el valor máximo mensual de la vista actual (`{max.toLocaleString()} detections/mo`).

### C. Corrección del recorte del `Modal`
- En `Modal`, el contenedor principal pasó a usar `flex max-h-full w-full flex-col overflow-hidden`.
- La barra superior roja (título + botón `Close`) lleva `shrink-0` y el desplazamiento (`overflow-y-auto`) se aplica únicamente al cuerpo interno (`p-4`), evitando que el encabezado se recorte en pantallas de menor altura.

### D. Exportación de la matriz a CSV (`exportCalendarCsv`)
- Se agregó el botón **`Export CSV`** debajo de la tabla del calendario.
- Genera y descarga un archivo `burn_calendar_<region>_in_calendar_1.csv` con:
  - Encabezado: `year,sensor_source,Jan,...,Dec,total`
  - Todas las filas anuales disponibles (`2002–2026`)
  - Fila `Median` (con su total)
  - Fila `k_m` (factores mensuales con 2 decimales)

### E. Adaptación actual en `main` (nivel México / estado)
- Tras los commits `9e2f772` y `149feac`, la API de calendario ya entrega directamente la serie armonizada (`in_calendar = 1`) filtrada por `region` (`"*"` mostrado como `"Mexico"`, o el estado seleccionado), por lo que en `HEAD` (`49d18ce`) se simplificó el selector de fuente duplicado (`sourceMode`) y el checkbox de offset `÷1.1`.

---

## 3. Verificación rápida para sincronizar en otra máquina

Si otro integrante del equipo necesita confirmar que tiene exactamente estos cambios en `main`:

```bash
git remote -v
git fetch origin
git checkout main
git pull origin main
git log -n 5 --oneline
```

El historial debe incluir el commit `49d18ce` (y los anteriores `6ef4f18`, `4101343`, `5bb099a`, `9e52434`, `18f37be`). Si ya tiene el archivo actualizado pero no lo ve en el navegador, reiniciar `npm run dev` en `web/` y recargar con `Ctrl + Shift + R`.
