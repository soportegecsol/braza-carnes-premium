const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../db");
const bold = require("../services/bold");

const router = express.Router();

// POST /api/checkout
// body: { customerId, suscripcionId, metodoPago }
router.post("/", async (req, res) => {
  const { customerId, suscripcionId, metodoPago } = req.body || {};

  if (!customerId || !suscripcionId || !metodoPago) {
    return res.status(400).json({
      error: "Faltan campos requeridos: customerId, suscripcionId, metodoPago",
    });
  }

  const suscripcion = db
    .prepare(
      `SELECT s.id, s.estado, s.proxima_entrega, s.plan_id, p.precio_cop
       FROM suscripciones s JOIN planes p ON p.id = s.plan_id
       WHERE s.id = ? AND s.customer_id = ?`
    )
    .get(suscripcionId, customerId);

  if (!suscripcion) {
    return res.status(404).json({ error: "Suscripción no encontrada para este cliente" });
  }

  let cobro;
  try {
    cobro = await bold.charge({
      amountCop: suscripcion.precio_cop,
      method: metodoPago,
      reference: suscripcionId,
    });
  } catch (err) {
    return res.status(502).json({ error: "Error al procesar el pago: " + err.message });
  }

  const pedidoId = uuid();
  db.prepare(
    `INSERT INTO pedidos
       (id, suscripcion_id, customer_id, plan_id, monto_cop, metodo_pago, estado_pago,
        bold_reference, fecha_entrega_estimada, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    pedidoId,
    suscripcionId,
    customerId,
    suscripcion.plan_id,
    suscripcion.precio_cop,
    metodoPago,
    cobro.ok ? "aprobado" : "rechazado",
    cobro.transactionId,
    suscripcion.proxima_entrega,
    new Date().toISOString()
  );

  if (cobro.ok) {
    db.prepare("UPDATE suscripciones SET estado = 'activa' WHERE id = ?").run(suscripcionId);
  }

  res.status(201).json({
    pedido: {
      id: pedidoId,
      estadoPago: cobro.ok ? "aprobado" : "rechazado",
      montoCop: suscripcion.precio_cop,
      metodoPago,
      fechaEntregaEstimada: suscripcion.proxima_entrega,
      pago: cobro,
    },
  });
});

module.exports = router;
