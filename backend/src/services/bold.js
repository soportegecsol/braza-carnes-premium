// Integración de pagos con Bold — pasarela confirmada para esta plataforma.
//
// IMPORTANTE: esta es una simulación (mock), no la integración real.
// No hay credenciales de Bold ni acceso a su documentación de API en este
// entorno de desarrollo, así que no se puede implementar la llamada real
// todavía. Esta función respeta el contrato que la integración real deberá
// cumplir (mismos parámetros, misma forma de respuesta), para que cuando
// se conecte la API real de Bold el cambio sea solo dentro de este archivo
// — nada más en el proyecto debería tener que cambiar.
//
// Para implementar la integración real:
//   1. Crear una cuenta/comercio en Bold y obtener BOLD_API_KEY.
//   2. Revisar la documentación oficial de la API de Bold (checkout /
//      link de pago / cobro directo, según el flujo que se quiera usar).
//   3. Reemplazar el cuerpo de `charge()` por la llamada HTTP real.

async function charge({ amountCop, method, reference }) {
  if (!amountCop || amountCop <= 0) {
    throw new Error("Monto inválido para el cobro");
  }

  const boldConfigured = Boolean(process.env.BOLD_API_KEY);

  // Simula la latencia de una pasarela real.
  await new Promise((resolve) => setTimeout(resolve, 250));

  return {
    ok: true,
    provider: boldConfigured ? "bold-mock-con-api-key" : "bold-mock",
    transactionId: "MOCKBOLD-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    amountCop,
    method,
    reference,
    note: "Pago simulado — falta implementar la llamada real a la API de Bold",
  };
}

module.exports = { charge };
