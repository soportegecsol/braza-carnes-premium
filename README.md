# Braza — Plataforma de suscripción de carnes premium

Repositorio del nuevo negocio de venta de cortes de carne premium por
suscripción, definido en la sesión de trabajo GECSOL del 18 de agosto de 2026.

> ⚠ Nombre "Braza" es una propuesta de trabajo — cámbialo libremente si
> prefieres otro nombre para la marca.

## Estado actual

Full-stack funcional y probado end-to-end (frontend + backend + base de
datos real), listo para seguir desarrollando sobre él:

- **Frontend** (`frontend/`): landing + flujo completo — elegir plan →
  datos de entrega → checkout → confirmación → panel de cuenta.
- **Backend** (`backend/`): API en Node/Express + SQLite, con planes,
  suscripciones, checkout (pago mockeado, ver nota abajo), pedidos y
  catálogo de cortes. Probado con `npm run smoke` (flujo real de punta a
  punta, sin necesidad de abrir el navegador).
- Cuando corres `npm start` en `backend/`, el mismo servidor sirve el
  frontend Y la API en un solo puerto (`http://localhost:3000`) — todo
  conectado de verdad, no solo maquetas sueltas.
- `docs/concepto-plataforma.md` — qué se definió en la reunión del 18/08.
- `docs/arquitectura.md` — decisiones técnicas y lo que falta.

- **Autenticación real** (`backend/src/routes/auth.js` + `middleware/auth.js`):
  registro y login con correo/contraseña (hash con `scrypt`, sin dependencias
  externas), sesión por token (`Authorization: Bearer <token>`, 30 días de
  vigencia). Las rutas de suscripciones, checkout y pedidos ahora requieren
  sesión válida y usan el `customerId` del token, no uno enviado por el
  navegador. Páginas nuevas: `frontend/login.html` y `frontend/registro.html`.
  Probado end-to-end en `npm run smoke` (registro, login, credenciales
  incorrectas, acceso sin token, logout invalida el token, etc.).

**Lo que NO está implementado todavía** (para que no haya sorpresas):
pago real con Bold (está mockeado, ver `backend/README.md`), agente de IA
de compra, geolocalización real, y Postgres en producción (el esquema ya
existe pero no se probó contra un servidor real). Cada uno tiene su nota
explicada en el código y en `backend/README.md`.

## Cómo correrlo

```bash
cd backend
npm install
npm start
```

Abre `http://localhost:3000` — ahí está todo: landing, suscripción,
checkout y panel, ya conectados a la base de datos real.

Si abres `frontend/index.html` directamente con doble clic (sin backend
corriendo), el sitio detecta que no hay servidor y cae automáticamente a
un modo demo con `localStorage` — sigue siendo navegable, pero sin
persistencia real.

## Estructura

```
braza-carnes-premium/
├── README.md
├── .gitignore
├── docs/
│   ├── concepto-plataforma.md
│   └── arquitectura.md
├── frontend/
│   ├── index.html
│   ├── suscripcion.html
│   ├── checkout.html
│   ├── panel.html
│   ├── styles.css
│   └── js/app.js
└── backend/
    ├── README.md            ← detalle técnico completo, qué falta y por qué
    ├── package.json
    ├── .env.example
    ├── src/                 ← server, rutas, base de datos, servicio de Bold
    └── test/smoke.js        ← prueba real end-to-end
```

## Cómo subirlo a GitHub

1. Crea un repositorio nuevo en GitHub llamado `braza-carnes-premium` (o el
   nombre que prefieras), con la usuaria/dueña del negocio como
   superadministradora, tal como se acordó en la reunión.
2. Desde esta carpeta:

```bash
git init
git add .
git commit -m "Braza: frontend + backend funcional, probado end-to-end"
git branch -M main
git remote add origin https://github.com/<usuario-u-organizacion>/braza-carnes-premium.git
git push -u origin main
```

3. Si prefieres trabajar en una rama de desarrollo en vez de `main`:

```bash
git checkout -b feature/plataforma-carne-premium
git push -u origin feature/plataforma-carne-premium
```

`node_modules/` y `backend/data/` (la base SQLite local) están en
`.gitignore` — no se suben, cada quien corre `npm install` y la base se
crea sola al arrancar.

## Decisiones ya tomadas

- Nombres de los 3 niveles de suscripción: **Clásica / Selecta / Maestra**.
- Cadencia de la suscripción: **mensual**.
- Alcance del agente de IA: **solo asistente de compra** (sin ventas/marketing
  por ahora).
- Pasarela de pagos: **integración real con Bold** (pendiente de
  credenciales — por ahora mockeada, ver `backend/README.md`).
- Contenido visual: **actualizado (19/08) — imágenes generadas por IA**,
  buscando el mayor realismo posible (se descarta la fotografía real y el
  render 3D). Falta elegir herramienta y producir el set final.
- Stack del backend: **Node.js/Express + SQLite** (elegido para tener algo
  funcional y probado rápido; migrar a Postgres es un cambio acotado, ver
  `backend/README.md`).

## Pendientes abiertos

- Beneficio/incentivo específico de cada nivel de suscripción — sin definir
  por ahora.
- Credenciales reales de Bold para reemplazar el mock de pagos.
- Proveedor de hosting/cloud para producción.
- Elegir herramienta de generación de imágenes con IA y producir el set final.
- Migrar de SQLite a Postgres si el volumen lo justifica.
