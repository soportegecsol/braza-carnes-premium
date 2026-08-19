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
   ============================================================ */

function brazaCustomerId() {
  let id = localStorage.getItem("braza_customer_id");
  if (!id) {
    id = "cust-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    localStorage.setItem("braza_customer_id", id);
  }
  return id;
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

async function brazaApiCrearSuscripcion(payload) {
  const r = await fetch("/api/suscripciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error creando la suscripción");
  return j.suscripcion;
}

async function brazaApiCheckout(payload) {
  const r = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error procesando el pago");
  return j.pedido;
}

async function brazaApiSuscripcion(customerId) {
  const r = await fetch("/api/suscripciones/" + customerId);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Error consultando la suscripción");
  return (await r.json()).suscripcion;
}

async function brazaApiPedidos(customerId) {
  const r = await fetch("/api/pedidos/" + customerId);
  if (!r.ok) return [];
  return (await r.json()).pedidos;
}

async function brazaApiCancelar(customerId) {
  const r = await fetch("/api/suscripciones/" + customerId + "/cancelar", { method: "POST" });
  return r.ok;
}
