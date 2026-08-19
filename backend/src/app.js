const path = require("path");
const express = require("express");
const cors = require("cors");

const { init } = require("./db");
const { seed } = require("./db/seed");

const planesRoutes = require("./routes/planes");
const cortesRoutes = require("./routes/cortes");
const authRoutes = require("./routes/auth");
const suscripcionesRoutes = require("./routes/suscripciones");
const checkoutRoutes = require("./routes/checkout");
const pedidosRoutes = require("./routes/pedidos");
const { requireAuth } = require("./middleware/auth");

function createApp() {
  init();
  seed();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "braza-backend" }));

  app.use("/api/planes", planesRoutes);
  app.use("/api/cortes", cortesRoutes);
  app.use("/api/auth", authRoutes);
  // Rutas protegidas: requieren Authorization: Bearer <token> (ver middleware/auth.js)
  app.use("/api/suscripciones", requireAuth, suscripcionesRoutes);
  app.use("/api/checkout", requireAuth, checkoutRoutes);
  app.use("/api/pedidos", requireAuth, pedidosRoutes);

  // Sirve el frontend estático desde el mismo servidor —
  // así "npm start" levanta backend + frontend en un solo puerto.
  const frontendDir = path.join(__dirname, "..", "..", "frontend");
  app.use(express.static(frontendDir));

  return app;
}

module.exports = { createApp };
