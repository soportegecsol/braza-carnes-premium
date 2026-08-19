// Capa de base de datos.
// Por defecto usa SQLite (archivo local, cero configuración) — ideal para
// desarrollo y demo. Si se define DATABASE_URL con una conexión Postgres,
// ese sería el punto para cambiar de driver (ver schema.postgres.sql);
// ese camino todavía no está implementado, solo el de SQLite.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbFile = process.env.SQLITE_FILE || path.join(dataDir, "braza.db");
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function init() {
  const schema = fs.readFileSync(
    path.join(__dirname, "schema.sqlite.sql"),
    "utf8"
  );
  db.exec(schema);
  migrate();
}

// Migraciones defensivas para bases de datos que ya existían antes de un
// cambio de esquema (CREATE TABLE IF NOT EXISTS no agrega columnas nuevas
// a una tabla que ya existe). Cada ALTER va en su propio try/catch porque
// SQLite no soporta "ADD COLUMN IF NOT EXISTS".
function migrate() {
  const columnExists = (table, column) =>
    db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);

  if (!columnExists("customers", "rol")) {
    db.exec("ALTER TABLE customers ADD COLUMN rol TEXT NOT NULL DEFAULT 'cliente'");
  }
}

module.exports = { db, init };
