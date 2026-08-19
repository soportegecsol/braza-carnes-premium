-- Esquema SQLite — usado por defecto en desarrollo/demo (cero configuración).
-- Ver schema.postgres.sql para el equivalente de producción.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  telefono TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS direcciones (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  ciudad TEXT NOT NULL,
  direccion TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_cop INTEGER NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cortes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  sku TEXT,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS inventario (
  id TEXT PRIMARY KEY,
  corte_id TEXT NOT NULL REFERENCES cortes(id),
  stock INTEGER NOT NULL DEFAULT 0,
  merma INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  plan_id TEXT NOT NULL REFERENCES planes(id),
  direccion_id TEXT NOT NULL REFERENCES direcciones(id),
  estado TEXT NOT NULL DEFAULT 'pendiente_pago', -- pendiente_pago | activa | cancelada
  proxima_entrega TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  suscripcion_id TEXT NOT NULL REFERENCES suscripciones(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  plan_id TEXT NOT NULL REFERENCES planes(id),
  monto_cop INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL,
  estado_pago TEXT NOT NULL, -- aprobado | rechazado | pendiente
  bold_reference TEXT,
  fecha_entrega_estimada TEXT,
  created_at TEXT NOT NULL
);
