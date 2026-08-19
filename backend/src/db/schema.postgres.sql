-- Esquema equivalente para PostgreSQL (producción).
-- No se probó contra un servidor Postgres real en este entorno de desarrollo
-- (no había uno disponible) — sí está probado end-to-end en SQLite
-- (ver ../../test/smoke.js). La estructura es intencionalmente idéntica
-- para que migrar sea un cambio de driver, no de modelo de datos.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS direcciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  ciudad TEXT NOT NULL,
  direccion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_cop INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cortes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  sku TEXT,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_id UUID NOT NULL REFERENCES cortes(id),
  stock INTEGER NOT NULL DEFAULT 0,
  merma INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  plan_id UUID NOT NULL REFERENCES planes(id),
  direccion_id UUID NOT NULL REFERENCES direcciones(id),
  estado TEXT NOT NULL DEFAULT 'pendiente_pago',
  proxima_entrega DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id UUID NOT NULL REFERENCES suscripciones(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  plan_id UUID NOT NULL REFERENCES planes(id),
  monto_cop INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL,
  estado_pago TEXT NOT NULL,
  bold_reference TEXT,
  fecha_entrega_estimada DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
