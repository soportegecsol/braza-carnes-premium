const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { init } = require("./db");
const { seed } = require("./db/seed");

const planesRoutes = require("./routes/planes");
const cortesRoutes = require("./routes/cortes");
const authRoutes = require("./routes/auth");
const suscripcionesRoutes = require("./routes/suscripciones");
const checkoutRoutes = require("./routes/checkout");
const pedidosRoutes = require("./routes/pedidos");
const adminRoutes = require("./routes/admin");
const asistenteRoutes = require("./routes/asistente");
const { requireAuth } = require("./middleware/auth");

// Límite de intentos en registro/login — mitiga fuerza bruta y scraping de
// cuentas. 20 intentos cada 15 minutos por IP es holgado para uso real y
// corta un ataque automatizado. No requiere ningún servicio de pago.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos — espera unos minutos e inténtalo de nuevo" },
});

function createApp() {
  init();
  seed();

  const app = express();
  app.set("trust proxy", 1);
  // Cabeceras de seguridad estándar (HSTS, X-Content-Type-Options, etc.).
  // CSP se desactiva porque el frontend usa <script> inline; si se separa
  // el JS a archivos externos en el futuro, se puede activar una política
  // estricta.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "braza-backend" }));

  app.use("/api/planes", planesRoutes);
  app.use("/api/cortes", cortesRoutes);
  app.use("/api/auth/registro", authLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth", authRoutes);
  // Rutas protegidas: requieren Authorization: Bearer <token> (ver middleware/auth.js)
  app.use("/api/suscripciones", requireAuth, suscripcionesRoutes);
  app.use("/api/checkout", requireAuth, checkoutRoutes);
  app.use("/api/pedidos", requireAuth, pedidosRoutes);
  app.use("/api/asistente", requireAuth, asistenteRoutes);
  // Rutas de administración: requireAuth + requireAdmin/requireSuperadmin
  // se aplican dentro de cada endpoint en routes/admin.js
  app.use("/api/admin", requireAuth, adminRoutes);

  // Sirve el frontend estático desde el mismo servidor —
  // así "npm start" levanta backend + frontend en un solo puerto.
  const frontendDir = path.join(__dirname, "..", "..", "frontend");
  app.use(express.static(frontendDir));

  return app;
}

module.exports = { createApp };
