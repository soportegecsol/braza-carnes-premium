// Middleware de autorización por rol. Debe usarse siempre DESPUÉS de
// requireAuth (necesita req.customerId ya resuelto). Acepta 'admin' o
// 'superadmin'; para rutas que solo el superadmin puede tocar, usar
// requireSuperadmin.

const { db } = require("../db");

function getRol(customerId) {
  const row = db.prepare("SELECT rol FROM customers WHERE id = ?").get(customerId);
  return row ? row.rol : null;
}

function requireAdmin(req, res, next) {
  const rol = getRol(req.customerId);
  if (rol !== "admin" && rol !== "superadmin") {
    return res.status(403).json({ error: "Requiere permisos de administrador" });
  }
  req.rol = rol;
  next();
}

function requireSuperadmin(req, res, next) {
  const rol = getRol(req.customerId);
  if (rol !== "superadmin") {
    return res.status(403).json({ error: "Requiere permisos de superadministrador" });
  }
  req.rol = rol;
  next();
}

module.exports = { requireAdmin, requireSuperadmin, getRol };
