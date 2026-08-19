// Prueba de humo end-to-end: levanta el servidor real (en memoria, con un
// archivo SQLite temporal) y recorre el flujo completo de un cliente:
// registro -> login -> ver planes -> crear suscripción -> pagar (checkout)
// -> ver panel/pedidos -> verificar que las rutas protegidas rechazan
// peticiones sin token.
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

    // 2. planes (público)
    const planesRes = await fetch(`${BASE}/api/planes`).then((r) => r.json());
    check("GET /api/planes devuelve 3 planes", planesRes.planes.length === 3);
    const selecta = planesRes.planes.find((p) => p.slug === "selecta");
    check("Plan 'selecta' existe con precio > 0", selecta && selecta.precio_cop > 0);

    // 3. cortes (público)
    const cortesRes = await fetch(`${BASE}/api/cortes`).then((r) => r.json());
    check("GET /api/cortes devuelve catálogo con stock", cortesRes.cortes.length === 4 && cortesRes.cortes[0].stock >= 0);

    // 4. una ruta protegida sin token debe rechazar con 401
    const sinToken = await fetch(`${BASE}/api/suscripciones`);
    check("GET /api/suscripciones sin token responde 401", sinToken.status === 401);

    // 5. registro
    const email = `smoke-${Date.now()}@braza.test`;
    const password = "clave-de-prueba-123";
    const registroRes = await fetch(`${BASE}/api/auth/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Cliente de prueba", telefono: "3000000000", email, password }),
    });
    const registroBody = await registroRes.json();
    check("POST /api/auth/registro crea la cuenta (201)", registroRes.status === 201);
    check("Registro devuelve token", typeof registroBody.token === "string" && registroBody.token.length > 10);

    // 6. registro duplicado debe rechazar
    const dupRes = await fetch(`${BASE}/api/auth/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    check("Registro con email duplicado responde 409", dupRes.status === 409);

    // 7. login
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginRes.json();
    check("POST /api/auth/login responde 200", loginRes.status === 200);
    const token = loginBody.token;
    const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    // 8. login con clave incorrecta debe rechazar
    const badLoginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "clave-incorrecta" }),
    });
    check("Login con clave incorrecta responde 401", badLoginRes.status === 401);

    // 9. /api/auth/me con token
    const meRes = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders });
    const meBody = await meRes.json();
    check("GET /api/auth/me devuelve el email correcto", meBody.customer && meBody.customer.email === email);

    // 10. crear suscripción (autenticado)
    const susRes = await fetch(`${BASE}/api/suscripciones`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ ciudad: "Bogotá", direccion: "Calle 123 #45-67", planSlug: "selecta" }),
    });
    const sus = await susRes.json();
    check("POST /api/suscripciones crea suscripción (201)", susRes.status === 201);
    check("Suscripción queda 'pendiente_pago'", sus.suscripcion && sus.suscripcion.estado === "pendiente_pago");

    // 11. leer suscripción
    const getSus = await fetch(`${BASE}/api/suscripciones`, { headers: authHeaders }).then((r) => r.json());
    check("GET /api/suscripciones devuelve la suscripción creada", getSus.suscripcion.plan.slug === "selecta");

    // 12. checkout (pago mock)
    const checkoutRes = await fetch(`${BASE}/api/checkout`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ suscripcionId: sus.suscripcion.id, metodoPago: "nequi" }),
    });
    const checkoutBody = await checkoutRes.json();
    check("POST /api/checkout responde 201", checkoutRes.status === 201);
    check("Pago queda 'aprobado' (mock Bold)", checkoutBody.pedido.estadoPago === "aprobado");

    // 13. suscripción ahora activa
    const getSus2 = await fetch(`${BASE}/api/suscripciones`, { headers: authHeaders }).then((r) => r.json());
    check("Suscripción pasa a 'activa' tras el pago", getSus2.suscripcion.estado === "activa");

    // 14. pedidos
    const pedidosRes = await fetch(`${BASE}/api/pedidos`, { headers: authHeaders }).then((r) => r.json());
    check("GET /api/pedidos devuelve 1 pedido", pedidosRes.pedidos.length === 1);

    // 15. otro token (inventado) no debe poder ver estos datos
    const otroTokenRes = await fetch(`${BASE}/api/pedidos`, {
      headers: { Authorization: "Bearer token-que-no-existe" },
    });
    check("Token inválido en /api/pedidos responde 401", otroTokenRes.status === 401);

    // 16. cancelar
    const cancelRes = await fetch(`${BASE}/api/suscripciones/cancelar`, { method: "POST", headers: authHeaders });
    check("POST cancelar responde ok", cancelRes.status === 200);
    const getSus3 = await fetch(`${BASE}/api/suscripciones`, { headers: authHeaders }).then((r) => r.json());
    check("Suscripción queda 'cancelada'", getSus3.suscripcion.estado === "cancelada");

    // 17. logout invalida el token
    const logoutRes = await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: authHeaders });
    check("POST /api/auth/logout responde 200", logoutRes.status === 200);
    const trasLogout = await fetch(`${BASE}/api/suscripciones`, { headers: authHeaders });
    check("Token usado tras logout responde 401", trasLogout.status === 401);

    // 18. frontend servido estáticamente
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

  console.log(failed ? "\n❌ SMOKE TEST FALLÓ" : "\n✅ SMOKE TEST OK — flujo completo probado end-to-end, incluida autenticación");
  process.exit(failed ? 1 : 0);
}

main();
