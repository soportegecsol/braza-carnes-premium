# Backend — API de Braza

API real en Node.js/Express, probada end-to-end (ver `test/smoke.js`).
Usa SQLite por defecto (archivo local, cero configuración) — no necesitas
instalar Postgres para desarrollar o hacer la demo.

## Cómo correrlo

```bash
cd backend
npm install
npm start
```

Esto levanta el servidor en `http://localhost:3000` y **también sirve el
frontend** desde ahí mismo (`http://localhost:3000/index.html`). No hace
falta un servidor aparte para el frontend.

## Cómo probarlo

```bash
npm run smoke
```

Corre un flujo completo real (crear suscripción → pagar → ver panel →
cancelar) contra el servidor, sin necesidad de abrir el navegador. Si todo
sale bien imprime `✅ SMOKE TEST OK`.

## Qué SÍ está implementado

- `GET /api/planes` — catálogo de los 3 planes.
- `GET /api/cortes` — catálogo de cortes + inventario/stock (público).
- `POST /api/auth/registro`, `/login`, `/logout`, `GET /api/auth/me` —
  autenticación real por sesión (token, 30 días).
- `POST /api/suscripciones`, `GET /api/suscripciones`, `POST /cancelar`.
- `POST /api/checkout` — cobra (mock) y crea el pedido.
- `GET /api/pedidos` — historial de pedidos del cliente autenticado.
- `POST /api/asistente/recomendar` — asistente de compra (ver nota abajo).
- `GET/PATCH /api/admin/inventario`, `GET /api/admin/clientes`,
  `PATCH /api/admin/clientes/:id/rol` (solo superadmin),
  `GET /api/admin/suscripciones`, `GET /api/admin/pedidos`,
  `GET /api/admin/resumen` — panel de administración (ver nota abajo).
- **Roles y superadministrador**: cada cuenta tiene `rol`
  (`cliente` | `admin` | `superadmin`). El correo `soporte@gecsol.co` se
  promueve automáticamente a `superadmin` al registrarse o iniciar sesión
  (configurable por `.env`, variable `SUPERADMIN_EMAILS`, separados por
  coma si hay más de uno). Panel visible en `frontend/admin.html`.
- **Seguridad**: `helmet` (cabeceras de seguridad estándar), rate limiting
  en `/api/auth/registro` y `/api/auth/login` (20 intentos / 15 min por
  IP, mitiga fuerza bruta), validación de formato de correo, contraseñas
  con `scrypt` + salt (ya existía). Todo con paquetes npm gratuitos, sin
  ningún servicio de pago.
- **Inventario**: ya no es solo lectura — el panel admin permite ajustar
  `stock` y `merma` por corte (`PATCH /api/admin/inventario/:corteId`), y
  el resumen (`/api/admin/resumen`) marca los cortes con stock ≤ 15.

Todo persiste en una base SQLite real (`backend/data/braza.db`, se crea
sola al arrancar — está en `.gitignore`, no se sube a git).

## Asistente de compra — alcance real (importante)

El endpoint `/api/asistente/recomendar` responde con **reglas
determinísticas sobre los datos reales** (stock, tu plan actual, tu
próxima entrega) — recomienda el corte con más disponibilidad, sugiere un
plan según si ya tienes suscripción, y dice cuándo llega tu pedido. Cubre
el alcance que se definió en la reunión del 18/08 ("solo asistente de
compra, sin ventas ni marketing") sin depender de ningún servicio externo.

Lo que esto **no** es: un modelo de lenguaje generativo tipo Claude/GPT
que entienda lenguaje natural libre. Conectar un LLM real es un cambio
acotado (un solo archivo, `src/routes/asistente.js`), pero requiere una
API key de pago — igual que Bold, queda pendiente de esa decisión de
compra, no de trabajo de desarrollo.

## Qué NO está implementado todavía (honesto, sin inflar)

- **Pagos con Bold real**: `src/services/bold.js` es un mock. No tengo
  credenciales ni documentación de la API de Bold en este entorno. El
  contrato de la función ya está pensado para que conectar la API real
  sea un cambio aislado a ese archivo.
- **Asistente con LLM real**: ver nota arriba — hoy es un motor de reglas,
  no un modelo generativo. Requiere API key de pago.
- **Redis**: no se usa. Con JWT/sesión no había necesidad real de caché de
  sesión en este MVP; si se necesita más adelante por volumen, se agrega.
- **Postgres**: el esquema equivalente ya existe en
  `src/db/schema.postgres.sql`, pero no se probó contra un servidor
  Postgres real (no había uno disponible en este entorno). Migrar de
  SQLite a Postgres implica escribir un adaptador en `src/db/index.js`
  que use `pg` en vez de `better-sqlite3` — el resto del código (rutas,
  lógica) no debería cambiar porque las consultas son SQL estándar.
- **Geolocalización real** (zonas de cobertura, mapa de calor): no
  implementada — el formulario de suscripción solo guarda ciudad/dirección
  como texto libre.
- **CORS abierto** (`cors()` sin restricción de origen): correcto para
  desarrollo/demo; antes de producción real hay que restringirlo al
  dominio final del sitio.

## Estructura

```
backend/
├── package.json
├── .env.example
├── src/
│   ├── server.js          ← arranca el servidor
│   ├── app.js              ← arma express, monta rutas, sirve el frontend
│   ├── db/
│   │   ├── index.js        ← conexión SQLite (driver activo)
│   │   ├── schema.sqlite.sql
│   │   ├── schema.postgres.sql  ← equivalente para producción (sin probar)
│   │   └── seed.js         ← datos base (planes, cortes)
│   ├── routes/              ← planes, cortes, suscripciones, checkout, pedidos
│   └── services/
│       └── bold.js         ← integración de pagos (mock, ver nota arriba)
└── test/
    └── smoke.js             ← prueba end-to-end real
```
