const express = require("express");
const { db } = require("../db");

const router = express.Router();

// GET /api/pedidos/:customerId — historial de pedidos del cliente
router.get("/:customerId", (req, res) => {
  const rows = db
    .prepare(
      `SELECT ped.id, ped.monto_cop, ped.metodo_pago, ped.estado_pago,
              ped.fecha_entrega_estimada, ped.created_at,
              p.slug AS plan_slug, p.nombre AS plan_nombre
       FROM pedidos ped
       JOIN planes p ON p.id = ped.plan_id
       WHERE ped.customer_id = ?
       ORDER BY ped.created_at DESC`
    )
    .all(req.params.customerId);

  res.json({
    pedidos: rows.map((r) => ({
      id: r.id,
      montoCop: r.monto_cop,
      metodoPago: r.metodo_pago,
      estadoPago: r.estado_pago,
      fechaEntregaEstimada: r.fecha_entrega_estimada,
      createdAt: r.created_at,
      plan: { slug: r.plan_slug, nombre: r.plan_nombre },
    })),
  });
});

module.exports = router;
