import os
import sys
from pathlib import Path

# Token de estaca para las pruebas (antes de importar la app).
os.environ.setdefault("STATION_TOKEN", "test-token")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
