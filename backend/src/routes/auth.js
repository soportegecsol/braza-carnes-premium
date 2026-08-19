const crypto = require("crypto");
const express = require("express");
const { v4: uuid } = require("uuid");
const { db } = require("../db");
const { hashPassword, verifyPassword } = require("../services/password");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const SESSION_DAYS = 30;

function createSession(customerId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare(
    "INSERT INTO sessions (token, customer_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, customerId, now.toISOString(), expires.toISOString());
  return token;
}

function publicCustomer(row) {
  return { id: row.id, nombre: row.nombre, telefono: row.telefono, email: row.email, rol: row.rol };
}

// Correos que se promueven automáticamente a superadmin al registrarse o
// iniciar sesión. Configurable por .env (SUPERADMIN_EMAILS separados por
// coma); por defecto incluye la cuenta de soporte de GECSOL.
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || "soporte@gecsol.co")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function promoverSiAplica(customer) {
  if (customer.rol === "superadmin") return customer;
  if (SUPERADMIN_EMAILS.includes((customer.email || "").toLowerCase())) {
    db.prepare("UPDATE customers SET rol = 'superadmin' WHERE id = ?").run(customer.id);
    return { ...customer, rol: "superadmin" };
  }
  return customer;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/registro
// body: { nombre, telefono, email, password }
router.post("/registro", (req, res) => {
  const { nombre, telefono, email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan campos requeridos: email, password" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "El correo no tiene un formato válido" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  const existing = db.prepare("SELECT id FROM customers WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
  }

  const { hash, salt } = hashPassword(password);
  const customerId = uuid();
  db.prepare(
    `INSERT INTO customers (id, nombre, telefono, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(customerId, nombre || null, telefono || null, email, hash, salt, new Date().toISOString());

  const token = createSession(customerId);
  let customer = db.prepare("SELECT id, nombre, telefono, email, rol FROM customers WHERE id = ?").get(customerId);
  customer = promoverSiAplica(customer);

  res.status(201).json({ token, customer: publicCustomer(customer) });
});

// POST /api/auth/login
// body: { email, password }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan campos requeridos: email, password" });
  }

  const customer = db.prepare("SELECT * FROM customers WHERE email = ?").get(email);
  if (!customer || !customer.password_hash) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }

  const valid = verifyPassword(password, customer.password_hash, customer.password_salt);
  if (!valid) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }

  const token = createSession(customer.id);
  const promovido = promoverSiAplica(customer);
  res.json({ token, customer: publicCustomer(promovido) });
});

// POST /api/auth/logout — requiere sesión activa
router.post("/logout", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ ok: true });
});

// GET /api/auth/me — requiere sesión activa
router.get("/me", requireAuth, (req, res) => {
  const customer = db
    .prepare("SELECT id, nombre, telefono, email, rol FROM customers WHERE id = ?")
    .get(req.customerId);
  if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
  res.json({ customer: publicCustomer(customer) });
});

module.exports = router;
