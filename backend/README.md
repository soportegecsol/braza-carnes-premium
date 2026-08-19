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
- `GET /api/cortes` — catálogo de cortes + inventario/stock.
- `POST /api/suscripciones` — crea cliente + dirección + suscripción.
- `GET /api/suscripciones/:customerId` — suscripción actual del cliente.
- `POST /api/suscripciones/:customerId/cancelar`
- `POST /api/checkout` — cobra (mock) y crea el pedido.
- `GET /api/pedidos/:customerId` — historial de pedidos.

Todo persiste en una base SQLite real (`backend/data/braza.db`, se crea
sola al arrancar — está en `.gitignore`, no se sube a git).

## Qué NO está implementado todavía (honesto, sin inflar)

- **Pagos con Bold real**: `src/services/bold.js` es un mock. No tengo
  credenciales ni documentación de la API de Bold en este entorno. El
  contrato de la función ya está pensado para que conectar la API real
  sea un cambio aislado a ese archivo.
- **Autenticación real** (login/registro con contraseña): por ahora cada
  navegador tiene un `customerId` anónimo persistente en `localStorage`
  (ver `frontend/js/app.js`, función `brazaCustomerId()`). Suficiente para
  la demo; para producción hay que agregar auth real.
- **Redis**: no se usa. Con JWT/sesión no había necesidad real de caché de
  sesión en este MVP; si se necesita más adelante por volumen, se agrega.
- **Postgres**: el esquema equivalente ya existe en
  `src/db/schema.postgres.sql`, pero no se probó contra un servidor
  Postgres real (no había uno disponible en este entorno). Migrar de
  SQLite a Postgres implica escribir un adaptador en `src/db/index.js`
  que use `pg` en vez de `better-sqlite3` — el resto del código (rutas,
  lógica) no debería cambiar porque las consultas son SQL estándar.
- **Agente de IA de compra**: no implementado, es un marcador de posición
  en el panel del frontend.
- **Geolocalización real** (zonas de cobertura, mapa de calor): no
  implementada — el formulario de suscripción solo guarda ciudad/dirección
  como texto libre.

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
