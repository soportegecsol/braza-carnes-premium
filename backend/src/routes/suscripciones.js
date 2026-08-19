const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../db");

const router = express.Router();

// Nota: todas las rutas de este router pasan por requireAuth (ver app.js),
// así que req.customerId siempre viene del token verificado, nunca del
// body/params del cliente — evita que alguien consulte o modifique la
// suscripción de otra persona con solo cambiar un customerId.

function nextDeliveryDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(5);
  return d.toISOString().slice(0, 10);
}

function updateCustomerProfile(customerId, nombre, telefono) {
  if (!nombre && !telefono) return;
  db.prepare(
    `UPDATE customers SET
       nombre = COALESCE(?, nombre),
       telefono = COALESCE(?, telefono)
     WHERE id = ?`
  ).run(nombre || null, telefono || null, customerId);
}

// POST /api/suscripciones  (requiere sesión)
// body: { nombre, telefono, ciudad, direccion, planSlug }
router.post("/", (req, res) => {
  const customerId = req.customerId;
  const { nombre, telefono, ciudad, direccion, planSlug } = req.body || {};

  if (!ciudad || !direccion || !planSlug) {
    return res.status(400).json({
      error: "Faltan campos requeridos: ciudad, direccion, planSlug",
    });
  }

  const plan = db.prepare("SELECT * FROM planes WHERE slug = ? AND activo = 1").get(planSlug);
  if (!plan) {
    return res.status(404).json({ error: `Plan '${planSlug}' no existe o no está activo` });
  }

  updateCustomerProfile(customerId, nombre, telefono);

  const direccionId = uuid();
  db.prepare(
    "INSERT INTO direcciones (id, customer_id, ciudad, direccion, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(direccionId, customerId, ciudad, direccion, new Date().toISOString());

  const suscripcionId = uuid();
  const proximaEntrega = nextDeliveryDate();
  db.prepare(
    `INSERT INTO suscripciones (id, customer_id, plan_id, direccion_id, estado, proxima_entrega, created_at)
     VALUES (?, ?, ?, ?, 'pendiente_pago', ?, ?)`
  ).run(suscripcionId, customerId, plan.id, direccionId, proximaEntrega, new Date().toISOString());

  res.status(201).json({
    suscripcion: {
      id: suscripcionId,
      estado: "pendiente_pago",
      proximaEntrega,
      plan: { slug: plan.slug, nombre: plan.nombre, precioCop: plan.precio_cop },
      entrega: { ciudad, direccion },
    },
  });
});

// GET /api/suscripciones — suscripción activa/más reciente del cliente autenticado
router.get("/", (req, res) => {
  const row = db
    .prepare(
      `SELECT s.id, s.estado, s.proxima_entrega, s.created_at,
              p.slug AS plan_slug, p.nombre AS plan_nombre, p.precio_cop,
              d.ciudad, d.direccion,
              c.nombre AS customer_nombre, c.telefono AS customer_telefono
       FROM suscripciones s
       JOIN planes p ON p.id = s.plan_id
       JOIN direcciones d ON d.id = s.direccion_id
       JOIN customers c ON c.id = s.customer_id
       WHERE s.customer_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`
    )
    .get(req.customerId);

  if (!row) return res.status(404).json({ error: "Sin suscripción para este cliente" });

  res.json({
    suscripcion: {
      id: row.id,
      estado: row.estado,
      proximaEntrega: row.proxima_entrega,
      plan: { slug: row.plan_slug, nombre: row.plan_nombre, precioCop: row.precio_cop },
      entrega: { ciudad: row.ciudad, direccion: row.direccion },
      cliente: { nombre: row.customer_nombre, telefono: row.customer_telefono },
    },
  });
});

// POST /api/suscripciones/cancelar
router.post("/cancelar", (req, res) => {
  const row = db
    .prepare(
      `SELECT id FROM suscripciones WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(req.customerId);

  if (!row) return res.status(404).json({ error: "Sin suscripción para este cliente" });

  db.prepare("UPDATE suscripciones SET estado = 'cancelada' WHERE id = ?").run(row.id);
  res.json({ ok: true, suscripcionId: row.id, estado: "cancelada" });
});

module.exports = router;
