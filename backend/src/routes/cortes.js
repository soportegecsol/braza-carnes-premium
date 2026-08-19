const express = require("express");
const { db } = require("../db");

const router = express.Router();

// GET /api/cortes — catálogo de cortes con inventario
router.get("/", (req, res) => {
  const cortes = db
    .prepare(
      `SELECT c.id, c.nombre, c.descripcion, c.sku,
              COALESCE(i.stock, 0) AS stock, COALESCE(i.merma, 0) AS merma
       FROM cortes c
       LEFT JOIN inventario i ON i.corte_id = c.id
       WHERE c.activo = 1`
    )
    .all();
  res.json({ cortes });
});

module.exports = router;
