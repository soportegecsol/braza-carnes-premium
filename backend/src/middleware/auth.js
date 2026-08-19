// Middleware de autenticación por sesión (token simple, sin dependencias
// externas). El cliente manda el token en el header:
//   Authorization: Bearer <token>
// El middleware busca el token en la tabla sessions, valida que no haya
// expirado, y adjunta req.customerId con el dueño real de la sesión —
// así ninguna ruta protegida confía en un customerId que venga del body.

const { db } = require("../db");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Falta el token de sesión (Authorization: Bearer <token>)" });
  }

  const session = db
    .prepare("SELECT customer_id, expires_at FROM sessions WHERE token = ?")
    .get(token);

  if (!session) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return res.status(401).json({ error: "Sesión expirada, inicia sesión de nuevo" });
  }

  req.customerId = session.customer_id;
  next();
}

module.exports = { requireAuth };
