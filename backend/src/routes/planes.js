const express = require("express");
const { db } = require("../db");

const router = express.Router();

// GET /api/planes — catálogo de planes activos
router.get("/", (req, res) => {
  const planes = db
    .prepare("SELECT id, slug, nombre, descripcion, precio_cop FROM planes WHERE activo = 1")
    .all();
  res.json({ planes });
});

module.exports = router;
