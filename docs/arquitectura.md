# Propuesta de arquitectura técnica inicial — Braza

Esto es una **propuesta de punto de partida**, no una decisión final. Carlos y
Julián deben validarla y ajustarla antes de empezar a construir.

## Componentes principales

| Componente | Rol propuesto |
|---|---|
| **Frontend** | Landing page + tienda (suscripciones, checkout) |
| **Backend API** | Lógica de negocio: suscripciones, pedidos, inventario |
| **PostgreSQL** | Base de datos principal — clientes, pedidos, catálogo, inventario |
| **Redis** | Caché y manejo de sesiones (carrito, autenticación) |
| **Pasarela de pagos** | **Confirmado:** integración real con Bold (no pasarela propia) |
| **Servicio de geolocalización** | Zonas de entrega, mapa de calor de demanda |
| **Agente de IA** | Asistente de compra — alcance exacto por definir |

## Estructura de carpetas sugerida para el backend (cuando se inicie desarrollo)

```
backend/
├── src/
│   ├── api/            ← endpoints (suscripciones, pedidos, inventario, pagos)
│   ├── models/          ← modelos de datos (PostgreSQL)
│   ├── services/         ← lógica de negocio (pagos, geolocalización, IA)
│   └── config/           ← configuración de Redis, PostgreSQL, variables de entorno
├── tests/
├── .env.example
└── package.json (o requirements.txt, según el stack que elija Carlos)
```

## Decisiones técnicas pendientes (a definir por Carlos/Julián)

- Lenguaje/framework del backend — **confirmado: lo decide Carlos**, es quien
  va a desarrollar y mantener el código. No es una decisión que le corresponda
  al equipo de negocio.
- Proveedor de hosting/cloud (a definir junto con Carlos, según el stack que elija).
- Si el agente de IA corre como servicio propio o se integra vía API externa.
- Diseño exacto del esquema de base de datos (suscripciones, cortes, pedidos,
  inventario).
