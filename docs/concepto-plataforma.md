# Concepto de negocio — Braza (plataforma de carnes premium)

Fuente: sesión de trabajo GECSOL "GEC REUNION TRABAJO", 18 de agosto de 2026.
Todo lo marcado ⚠ es tentativo o no confirmado — falta validarlo con Julián.

## Propuesta de valor

Venta de cortes de carne premium por suscripción, con selección curada,
entrega geolocalizada y una experiencia de compra asistida por IA.

## Suscripciones

- 3 niveles, **nombres confirmados**: **Clásica / Selecta / Maestra**.
- Cadencia **confirmada: mensual**.
- Nivel de entrada (Clásica) con cortes económicos — falta diseñar bien esa selección.
- Cada nivel debe traer un beneficio/incentivo de suscriptor — sin definir todavía.

## Pasarela de pagos

- **Confirmado**: integración real con **Bold** (pasarela colombiana) para
  procesar los pagos — no se construye una pasarela propia desde cero.
- El checkout debe verse con el estilo visual de Nequi/Daviplata/Bancolombia,
  aunque el procesamiento real corra sobre la API de Bold.

## Geoposicionamiento

- Determinar en qué ciudades se debe hacer entrega.
- Identificar zonas con mayor volumen de ventas (mapa de calor / analítica
  geográfica).

## Agente de IA

- Asiste el proceso de compra del cliente.
- **Confirmado**: alcance limitado a asistente de compra (selección de cortes,
  preguntas del pedido). No incluye ventas ni marketing en esta primera versión.

## Inventario

- Control de stock.
- Ajuste de mermas.
- Manejo de descartes.

## Infraestructura técnica sugerida

- Base de datos: Redis (caché/sesiones) + PostgreSQL (base principal).
- Repositorio en GitHub, con la usuaria como superadministradora y un
  administrador adicional del equipo.

## Responsables asignados en la reunión

- **Carlos**: desarrollar la plataforma (suscripciones, pasarela de pagos,
  inventario) y crear la rama del proyecto en GitHub.
- **Julián**: modelar el proceso de venta y compartirlo como base para el
  desarrollo.

## Contenido visual

- **Confirmado**: en vez de renders 3D, se usa **fotografía profesional** de
  los cortes y de la parrilla — más rápido, más económico y se ve más real
  que un render.
- **Confirmado explícitamente: nada de imágenes generadas por IA.** Deben ser
  fotos reales, tomadas por un fotógrafo — no generación de imágenes con IA,
  porque se nota y le resta credibilidad a la marca.
- Falta contratar al fotógrafo de producto/gastronomía.

## Fuera de alcance de este documento

Este documento no incluye precios, tarifas de suscripción ni datos de
clientes reales — es solo el concepto de producto tal como se discutió.
