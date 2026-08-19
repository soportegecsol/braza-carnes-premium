// Hashing de contraseñas con scrypt (nativo de Node, sin dependencias externas).
// scrypt es una función de derivación de clave diseñada para ser costosa de
// fuerza-bruteear — es una alternativa razonable a bcrypt sin instalar nada.

const crypto = require("crypto");

const KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { hashPassword, verifyPassword };
