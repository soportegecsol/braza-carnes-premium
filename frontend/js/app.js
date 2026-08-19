/* ============================================================
   Braza — lógica de frontend compartida (SOLO DEMO)
   ------------------------------------------------------------
   IMPORTANTE PARA CARLOS:
   Todo lo de este archivo es una simulación en el navegador.
   No hay backend real detrás. Los "pedidos" y el "usuario" se
   guardan en localStorage solo para que el flujo se sienta
   completo en la demo (suscripción → checkout → panel).
   Cuando exista el backend real, esto debe reemplazarse por
   llamadas fetch() a la API que tú definas (ver
   docs/arquitectura.md).
   ============================================================ */

const BRAZA_PLANS = {
  clasica: {
    id: "clasica",
    nombre: "Clásica",
    desc: "Cortes económicos, misma selección cuidada",
    precio: 89000,
  },
  selecta: {
    id: "selecta",
    nombre: "Selecta",
    desc: "Cortes premium curados + rotación mensual",
    precio: 159000,
  },
  maestra: {
    id: "maestra",
    nombre: "Maestra",
    desc: "Cortes de autor, disponibilidad limitada",
    precio: 249000,
  },
};

// Precios de ejemplo — NO confirmados en la reunión del 18/08.
// Ajustar cuando el equipo defina precios reales por nivel.

const BRAZA_STORAGE_KEY = "braza_demo_state_v1";

function brazaFormatCOP(valor) {
  return "$" + valor.toLocaleString("es-CO");
}

function brazaGetState() {
  try {
    const raw = localStorage.getItem(BRAZA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function brazaSetState(patch) {
  const current = brazaGetState();
  const next = Object.assign({}, current, patch);
  localStorage.setItem(BRAZA_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function brazaNextDeliveryDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(5);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

function brazaGenOrderId() {
  return "BRZ-" + Math.floor(100000 + Math.random() * 900000);
}

/* ============================================================
   Modo con backend real (cuando el sitio corre vía "npm start"
   en backend/, sirviendo frontend/ en el mismo origen).
   Si no hay backend disponible (por ejemplo, abriste index.html
   con doble clic desde el explorador de archivos), todas las
   páginas caen automáticamente al modo demo con localStorage
   que ya existía antes.

   Autenticación real: el backend usa un token de sesión
   (Authorization: Bearer <token>) en vez de confiar en un
   customerId enviado por el navegador. El token se guarda en
   localStorage bajo BRAZA_TOKEN_KEY tras registro/login.
   ============================================================ */

const BRAZA_TOKEN_KEY = "braza_session_token";

function brazaCustomerId() {
  // Se mantiene solo para el modo demo sin backend (localStorage puro).
  let id = localStorage.getItem("braza_customer_id");
  if (!id) {
    id = "cust-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("braza_customer_id", id);
  }
  return id;
}

function brazaGetToken() {
  return localStorage.getItem(BRAZA_TOKEN_KEY);
}

function brazaSetToken(token) {
  localStorage.setItem(BRAZA_TOKEN_KEY, token);
}

function brazaClearToken() {
  localStorage.removeItem(BRAZA_TOKEN_KEY);
}

function brazaIsLoggedIn() {
  return !!brazaGetToken();
}

function brazaAuthHeaders() {
  const token = brazaGetToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  return headers;
}

async function brazaApiHealthy() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    if (!r.ok) return false;
    const j = await r.json();
    return j.ok === true;
  } catch (e) {
    return false;
  }
}

async function brazaApiRegistro({ nombre, telefono, email, password }) {
  const r = await fetch("/api/auth/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, telefono, email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error creando la cuenta");
  brazaSetToken(j.token);
  return j.customer;
}

async function brazaApiLogin({ email, password }) {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Correo o contraseña incorrectos");
  brazaSetToken(j.token);
  return j.customer;
}

async function brazaApiMe() {
  const token = brazaGetToken();
  if (!token) return null;
  const r = await fetch("/api/auth/me", { headers: brazaAuthHeaders() });
  if (!r.ok) {
    brazaClearToken();
    return null;
  }
  return (await r.json()).customer;
}

async function brazaApiLogout() {
  const token = brazaGetToken();
  if (token) {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: brazaAuthHeaders() });
    } catch (e) {
      /* ignorar — igual limpiamos el token localmente */
    }
  }
  brazaClearToken();
}

async function brazaApiCrearSuscripcion(payload) {
  const r = await fetch("/api/suscripciones", {
    method: "POST",
    headers: brazaAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error creando la suscripción");
  return j.suscripcion;
}

async function brazaApiCheckout(payload) {
  const r = await fetch("/api/checkout", {
    method: "POST",
    headers: brazaAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error procesando el pago");
  return j.pedido;
}

async function brazaApiSuscripcion() {
  const r = await fetch("/api/suscripciones", { headers: brazaAuthHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Error consultando la suscripción");
  return (await r.json()).suscripcion;
}

async function brazaApiPedidos() {
  const r = await fetch("/api/pedidos", { headers: brazaAuthHeaders() });
  if (!r.ok) return [];
  return (await r.json()).pedidos;
}

async function brazaApiCancelar() {
  const r = await fetch("/api/suscripciones/cancelar", { method: "POST", headers: brazaAuthHeaders() });
  return r.ok;
}

async function brazaApiAsistente(mensaje) {
  const r = await fetch("/api/asistente/recomendar", {
    method: "POST",
    headers: brazaAuthHeaders(),
    body: JSON.stringify({ mensaje }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "El asistente no pudo responder");
  return j;
}

/* ============================================================
   Admin — solo para cuentas con rol admin/superadmin. Todas
   estas llamadas fallan con 403 si la sesión no tiene el rol.
   ============================================================ */

async function brazaAdminResumen() {
  const r = await fetch("/api/admin/resumen", { headers: brazaAuthHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Sin permisos");
  return r.json();
}

async function brazaAdminInventario() {
  const r = await fetch("/api/admin/inventario", { headers: brazaAuthHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Sin permisos");
  return (await r.json()).cortes;
}

async function brazaAdminActualizarInventario(corteId, patch) {
  const r = await fetch("/api/admin/inventario/" + corteId, {
    method: "PATCH",
    headers: brazaAuthHeaders(),
    body: JSON.stringify(patch),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "No se pudo actualizar");
  return j.corte;
}

async function brazaAdminClientes() {
  const r = await fetch("/api/admin/clientes", { headers: brazaAuthHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Sin permisos");
  return (await r.json()).clientes;
}

async function brazaAdminSuscripciones() {
  const r = await fetch("/api/admin/suscripciones", { headers: brazaAuthHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Sin permisos");
  return (await r.json()).suscripciones;
}

async function brazaAdminPedidos() {
  const r = await fetch("/api/admin/pedidos", { headers: brazaAuthHeaders() });
  if (!r.ok) throw new Error((await r.json()).error || "Sin permisos");
  return (await r.json()).pedidos;
}
