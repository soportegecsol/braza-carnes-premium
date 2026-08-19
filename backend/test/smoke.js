// Prueba de humo end-to-end: levanta el servidor real (en memoria, con un
// archivo SQLite temporal) y recorre el flujo completo de un cliente:
// ver planes -> crear suscripción -> pagar (checkout) -> ver panel/pedidos.
//
// Uso: npm run smoke   (desde backend/)

const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.SQLITE_FILE = path.join(os.tmpdir(), `braza-smoke-${Date.now()}.db`);

const { createApp } = require("../src/app");

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;

let failed = false;

function check(label, cond) {
  console.log((cond ? "✔ " : "✘ ") + label);
  if (!cond) failed = true;
}

async function main() {
  const app = createApp();
  const server = app.listen(PORT);

  try {
    // 1. health
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    check("GET /api/health responde ok", health.ok === true);

    // 2. planes
    const planesRes = await fetch(`${BASE}/api/planes`).then((r) => r.json());
    check("GET /api/planes devuelve 3 planes", planesRes.planes.length === 3);
    const selecta = planesRes.planes.find((p) => p.slug === "selecta");
    check("Plan 'selecta' existe con precio > 0", selecta && selecta.precio_cop > 0);

    // 3. cortes
    const cortesRes = await fetch(`${BASE}/api/cortes`).then((r) => r.json());
    check("GET /api/cortes devuelve catálogo con stock", cortesRes.cortes.length === 4 && cortesRes.cortes[0].stock >= 0);

    // 4. crear suscripción
    const customerId = "smoke-customer-" + Date.now();
    const susRes = await fetch(`${BASE}/api/suscripciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        nombre: "Cliente de prueba",
        telefono: "3000000000",
        ciudad: "Bogotá",
        direccion: "Calle 123 #45-67",
        planSlug: "selecta",
      }),
    });
    const sus = await susRes.json();
    check("POST /api/suscripciones crea suscripción (201)", susRes.status === 201);
    check("Suscripción queda 'pendiente_pago'", sus.suscripcion && sus.suscripcion.estado === "pendiente_pago");

    // 5. leer suscripción
    const getSus = await fetch(`${BASE}/api/suscripciones/${customerId}`).then((r) => r.json());
    check("GET /api/suscripciones/:id devuelve la suscripción creada", getSus.suscripcion.plan.slug === "selecta");

    // 6. checkout (pago mock)
    const checkoutRes = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        suscripcionId: sus.suscripcion.id,
        metodoPago: "nequi",
      }),
    });
    const checkoutBody = await checkoutRes.json();
    check("POST /api/checkout responde 201", checkoutRes.status === 201);
    check("Pago queda 'aprobado' (mock Bold)", checkoutBody.pedido.estadoPago === "aprobado");

    // 7. suscripción ahora activa
    const getSus2 = await fetch(`${BASE}/api/suscripciones/${customerId}`).then((r) => r.json());
    check("Suscripción pasa a 'activa' tras el pago", getSus2.suscripcion.estado === "activa");

    // 8. pedidos
    const pedidosRes = await fetch(`${BASE}/api/pedidos/${customerId}`).then((r) => r.json());
    check("GET /api/pedidos/:id devuelve 1 pedido", pedidosRes.pedidos.length === 1);

    // 9. cancelar
    const cancelRes = await fetch(`${BASE}/api/suscripciones/${customerId}/cancelar`, { method: "POST" });
    check("POST cancelar responde ok", cancelRes.status === 200);
    const getSus3 = await fetch(`${BASE}/api/suscripciones/${customerId}`).then((r) => r.json());
    check("Suscripción queda 'cancelada'", getSus3.suscripcion.estado === "cancelada");

    // 10. frontend servido estáticamente
    const frontendRes = await fetch(`${BASE}/index.html`);
    check("GET /index.html sirve el frontend estático", frontendRes.status === 200);
  } catch (err) {
    console.error("ERROR durante el smoke test:", err);
    failed = true;
  } finally {
    server.close();
    if (fs.existsSync(process.env.SQLITE_FILE)) fs.unlinkSync(process.env.SQLITE_FILE);
    for (const ext of ["-wal", "-shm"]) {
      const p = process.env.SQLITE_FILE + ext;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  console.log(failed ? "\n❌ SMOKE TEST FALLÓ" : "\n✅ SMOKE TEST OK — flujo completo probado end-to-end");
  process.exit(failed ? 1 : 0);
}

main();
