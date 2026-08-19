// Rutas de administración — todas requieren sesión válida (requireAuth,
// montado en app.js) + rol admin/superadmin (requireAdmin, en cada router).
// Pensadas para el panel frontend/admin.html.

const express = require("express");
const { db } = require("../db");
const { requireAdmin, requireSuperadmin } = require("../middleware/admin");

const router = express.Router();

// ---------- Inventario ----------

// GET /api/admin/inventario — catálogo completo con stock/merma
router.get("/inventario", requireAdmin, (req, res) => {
  const cortes = db
    .prepare(
      `SELECT c.id, c.nombre, c.descripcion, c.sku, c.activo,
              COALESCE(i.stock, 0) AS stock, COALESCE(i.merma, 0) AS merma,
              i.updated_at
       FROM cortes c
       LEFT JOIN inventario i ON i.corte_id = c.id
       ORDER BY c.nombre`
    )
    .all();
  res.json({ cortes });
});

// PATCH /api/admin/inventario/:corteId — ajustar stock/merma
// body: { stock?, merma? } — se actualiza lo que venga, el resto queda igual
router.patch("/inventario/:corteId", requireAdmin, (req, res) => {
  const { corteId } = req.params;
  const { stock, merma } = req.body || {};

  const corte = db.prepare("SELECT id FROM cortes WHERE id = ?").get(corteId);
  if (!corte) return res.status(404).json({ error: "Corte no encontrado" });

  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return res.status(400).json({ error: "stock debe ser un entero >= 0" });
  }
  if (merma !== undefined && (!Number.isInteger(merma) || merma < 0)) {
    return res.status(400).json({ error: "merma debe ser un entero >= 0" });
  }

  const existente = db.prepare("SELECT * FROM inventario WHERE corte_id = ?").get(corteId);
  const now = new Date().toISOString();

  if (existente) {
    db.prepare(
      `UPDATE inventario SET stock = ?, merma = ?, updated_at = ? WHERE corte_id = ?`
    ).run(
      stock !== undefined ? stock : existente.stock,
      merma !== undefined ? merma : existente.merma,
      now,
      corteId
    );
  } else {
    const { v4: uuid } = require("uuid");
    db.prepare(
      `INSERT INTO inventario (id, corte_id, stock, merma, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(uuid(), corteId, stock || 0, merma || 0, now);
  }

  const actualizado = db
    .prepare(
      `SELECT c.id, c.nombre, COALESCE(i.stock,0) AS stock, COALESCE(i.merma,0) AS merma, i.updated_at
       FROM cortes c LEFT JOIN inventario i ON i.corte_id = c.id WHERE c.id = ?`
    )
    .get(corteId);

  res.json({ corte: actualizado });
});

// ---------- Clientes ----------

// GET /api/admin/clientes — lista de clientes (sin hash/salt de contraseña)
router.get("/clientes", requireAdmin, (req, res) => {
  const clientes = db
    .prepare(
      `SELECT id, nombre, telefono, email, rol, created_at FROM customers ORDER BY created_at DESC`
    )
    .all();
  res.json({ clientes });
});

// PATCH /api/admin/clientes/:id/rol — solo superadmin puede cambiar roles
// body: { rol: 'cliente' | 'admin' | 'superadmin' }
router.patch("/clientes/:id/rol", requireSuperadmin, (req, res) => {
  const { rol } = req.body || {};
  if (!["cliente", "admin", "superadmin"].includes(rol)) {
    return res.status(400).json({ error: "rol inválido — usa cliente, admin o superadmin" });
  }
  const cliente = db.prepare("SELECT id FROM customers WHERE id = ?").get(req.params.id);
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  db.prepare("UPDATE customers SET rol = ? WHERE id = ?").run(rol, req.params.id);
  res.json({ ok: true });
});

// ---------- Suscripciones y pedidos (vista global) ----------

// GET /api/admin/suscripciones — todas las suscripciones, con datos del cliente y plan
router.get("/suscripciones", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.estado, s.proxima_entrega, s.created_at,
              c.nombre AS cliente_nombre, c.email AS cliente_email,
              p.nombre AS plan_nombre, p.precio_cop,
              d.ciudad, d.direccion
       FROM suscripciones s
       JOIN customers c ON c.id = s.customer_id
       JOIN planes p ON p.id = s.plan_id
       JOIN direcciones d ON d.id = s.direccion_id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json({ suscripciones: rows });
});

// GET /api/admin/pedidos — todos los pedidos, con datos del cliente
router.get("/pedidos", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ped.id, ped.monto_cop, ped.metodo_pago, ped.estado_pago, ped.bold_reference,
              ped.fecha_entrega_estimada, ped.created_at,
              c.nombre AS cliente_nombre, c.email AS cliente_email,
              p.nombre AS plan_nombre
       FROM pedidos ped
       JOIN customers c ON c.id = ped.customer_id
       JOIN planes p ON p.id = ped.plan_id
       ORDER BY ped.created_at DESC`
    )
    .all();
  res.json({ pedidos: rows });
});

// ---------- Resumen (KPIs simples para el panel) ----------

router.get("/resumen", requireAdmin, (req, res) => {
  const clientes = db.prepare("SELECT COUNT(*) n FROM customers").get().n;
  const activas = db.prepare("SELECT COUNT(*) n FROM suscripciones WHERE estado = 'activa'").get().n;
  const pedidosAprobados = db
    .prepare("SELECT COUNT(*) n, COALESCE(SUM(monto_cop),0) total FROM pedidos WHERE estado_pago = 'aprobado'")
    .get();
  const stockBajo = db
    .prepare(
      `SELECT c.nombre, COALESCE(i.stock,0) AS stock
       FROM cortes c LEFT JOIN inventario i ON i.corte_id = c.id
       WHERE c.activo = 1 AND COALESCE(i.stock,0) <= 15
       ORDER BY stock ASC`
    )
    .all();

  res.json({
    clientes,
    suscripcionesActivas: activas,
    pedidosAprobados: pedidosAprobados.n,
    ingresosAprobadosCop: pedidosAprobados.total,
    stockBajo,
  });
});

module.exports = router;
