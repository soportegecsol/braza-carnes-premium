// Datos base: los 3 planes confirmados y el catálogo de cortes de ejemplo
// que ya se usan en el frontend (frontend/js/app.js). Los precios son de
// ejemplo — no se confirmaron precios reales en la reunión del 18/08.

const { v4: uuid } = require("uuid");
const { db } = require("./index");

function seed() {
  const countPlanes = db.prepare("SELECT COUNT(*) AS n FROM planes").get().n;
  if (countPlanes === 0) {
    const insert = db.prepare(
      `INSERT INTO planes (id, slug, nombre, descripcion, precio_cop, activo)
       VALUES (?, ?, ?, ?, ?, 1)`
    );
    insert.run(uuid(), "clasica", "Clásica", "Cortes económicos, misma selección cuidada", 89000);
    insert.run(uuid(), "selecta", "Selecta", "Cortes premium curados + rotación mensual", 159000);
    insert.run(uuid(), "maestra", "Maestra", "Cortes de autor, disponibilidad limitada", 249000);
  }

  const countCortes = db.prepare("SELECT COUNT(*) AS n FROM cortes").get().n;
  if (countCortes === 0) {
    const insert = db.prepare(
      `INSERT INTO cortes (id, nombre, descripcion, sku, activo) VALUES (?, ?, ?, ?, 1)`
    );
    const insertInv = db.prepare(
      `INSERT INTO inventario (id, corte_id, stock, merma, updated_at) VALUES (?, ?, ?, 0, ?)`
    );
    const cortes = [
      ["Ribeye", "Marmoleado intenso, sabor profundo", "RIB-001", 40],
      ["Punta de anca", "Corte económico, gran versatilidad", "PAN-001", 60],
      ["Tomahawk", "Pieza de exhibición, edición limitada", "TMH-001", 12],
      ["Short rib", "Cocción lenta, textura de autor", "SHR-001", 35],
    ];
    for (const [nombre, desc, sku, stock] of cortes) {
      const id = uuid();
      insert.run(id, nombre, desc, sku);
      insertInv.run(uuid(), id, stock, new Date().toISOString());
    }
  }
}

module.exports = { seed };
