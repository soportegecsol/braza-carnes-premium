// Asistente de compra — alcance confirmado en la reunión del 18/08: SOLO
// acompaña la compra (elegir corte/plan, ver disponibilidad y estado de
// entrega). Sin ventas ni marketing.
//
// IMPORTANTE (honestidad de alcance): esto es un motor de REGLAS
// determinísticas sobre los datos reales de la BD — no es un modelo de
// lenguaje generativo. Conectar un LLM real (Claude, GPT, etc.) requiere
// una API key de pago, así que queda fuera de este entorno hasta que se
// adquiera esa credencial (igual que Bold). Esto ya resuelve la función
// del asistente ("acompañar la elección") sin necesidad de esa compra.

const express = require("express");
const { db } = require("../db");

const router = express.Router();

function cortesDisponibles() {
  return db
    .prepare(
      `SELECT c.nombre, c.descripcion, COALESCE(i.stock,0) AS stock
       FROM cortes c LEFT JOIN inventario i ON i.corte_id = c.id
       WHERE c.activo = 1
       ORDER BY stock DESC`
    )
    .all();
}

function planes() {
  return db.prepare(`SELECT slug, nombre, descripcion, precio_cop FROM planes WHERE activo = 1 ORDER BY precio_cop`).all();
}

function suscripcionActiva(customerId) {
  return db
    .prepare(
      `SELECT s.*, p.slug AS plan_slug, p.nombre AS plan_nombre
       FROM suscripciones s JOIN planes p ON p.id = s.plan_id
       WHERE s.customer_id = ? AND s.estado = 'activa'
       ORDER BY s.created_at DESC LIMIT 1`
    )
    .get(customerId);
}

// POST /api/asistente/recomendar — requiere sesión (montado con requireAuth en app.js)
// body: { mensaje?: string }
router.post("/recomendar", (req, res) => {
  const mensaje = ((req.body && req.body.mensaje) || "").toLowerCase();
  const customerId = req.customerId;

  let respuesta;
  let sugerencia = null;

  if (mensaje.includes("corte") || mensaje.includes("disponib")) {
    const cortes = cortesDisponibles();
    const top = cortes[0];
    respuesta = top
      ? `El corte con más disponibilidad ahora mismo es ${top.nombre} (${top.stock} unidades en stock). ${top.descripcion || ""}`.trim()
      : "No hay cortes activos en el catálogo todavía.";
    sugerencia = { tipo: "corte", cortes };
  } else if (mensaje.includes("plan") || mensaje.includes("suscri")) {
    const activa = suscripcionActiva(customerId);
    const todosPlanes = planes();
    if (!activa) {
      const medio = todosPlanes[Math.floor((todosPlanes.length - 1) / 2)];
      respuesta = medio
        ? `Todavía no tienes una suscripción activa. Para empezar, ${medio.nombre} es un buen punto de partida: ${medio.descripcion}.`
        : "Todavía no hay planes configurados.";
      sugerencia = { tipo: "plan", recomendado: medio, planes: todosPlanes };
    } else {
      const idx = todosPlanes.findIndex((p) => p.slug === activa.plan_slug);
      const siguiente = idx >= 0 && idx < todosPlanes.length - 1 ? todosPlanes[idx + 1] : null;
      respuesta = siguiente
        ? `Ya tienes el plan ${activa.plan_nombre}. Si quieres más variedad, el siguiente nivel es ${siguiente.nombre}: ${siguiente.descripcion}.`
        : `Ya tienes el plan ${activa.plan_nombre}, que es el nivel más alto disponible.`;
      sugerencia = { tipo: "plan", actual: activa.plan_nombre, siguiente };
    }
  } else if (mensaje.includes("entrega") || mensaje.includes("cuando") || mensaje.includes("cuándo")) {
    const activa = suscripcionActiva(customerId);
    respuesta = activa
      ? `Tu próxima entrega (${activa.plan_nombre}) está programada para ${activa.proxima_entrega || "una fecha por confirmar"}.`
      : "No tienes una suscripción activa todavía, así que no hay una entrega programada.";
    sugerencia = { tipo: "entrega", suscripcion: activa || null };
  } else {
    respuesta =
      "Puedo ayudarte a elegir un corte según disponibilidad, recomendarte un plan o decirte cuándo llega tu próxima entrega. Pregúntame, por ejemplo: '¿qué corte tiene más disponibilidad?'";
  }

  res.json({ respuesta, sugerencia, motor: "reglas-deterministico" });
});

module.exports = router;
