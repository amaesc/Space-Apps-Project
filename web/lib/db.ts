import { Pool } from "pg";

// Conexión a la base de datos compartida del equipo (Postgres en la Raspberry Pi).
// Configurada con POSTGRES_* (o DATABASE_URL) en web/.env.local.

declare global {
  var __fuegodataPool: Pool | undefined;
}

function createPool(): Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return new Pool({
    host: process.env.POSTGRES_HOST || "127.0.0.1",
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    max: 5,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  });
}

// Reutiliza el pool entre recargas en desarrollo.
export const db: Pool = globalThis.__fuegodataPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__fuegodataPool = db;
