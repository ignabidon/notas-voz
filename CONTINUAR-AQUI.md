# CONTINUAR AQUÍ — DictaVoz

> **Una sola página, un solo estado.** Quien termina un paso **reescribe esta página** (no agrega carteles arriba) y mueve lo viejo a `docs/historial/`. Si algo de acá contradice al código de `main`, vale el código; si contradice a `docs/DECISIONES.md`, vale ese registro.
> **Última actualización: 17/11/2026, mediodía (Claude, solo documentación).** `main` = `7171650`.

## Cómo está organizada la documentación

Mapa completo, con qué manda sobre qué: [docs/INDICE.md](docs/INDICE.md). Lo que decidió Ignacio, en un solo registro: [docs/DECISIONES.md](docs/DECISIONES.md). Los pedidos para copiar y pegar a cualquier IA: [docs/PEDIDOS.md](docs/PEDIDOS.md). El tablero de pasos con dueño: [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md).

## Qué es la app hoy

DictaVoz (antes DictaNota; solo cambió lo visible): transcribe voz a texto en el celular con Whisper, guarda notas en cuadernos, anonimiza y puede proteger todo con cifrado (huella, contraseña o código de recuperación). Una sola app: `/index.html`. Publicada en https://ignabidon.github.io/notas-voz/ desde `main`.

## Qué está en `main`

| Qué | Pasos / PR |
|---|---|
| Tema claro, chat, pestañas Dictar · Cuadernos · Anonimizar · Ajustes | #36, #41, #43, #48 |
| Almacenamiento cifrado: base de audios, audios cifrados por nota, copia cifrada (crear y verificar), reproductor y panel de espacio | E1 #45, E2 #50, K1 #51, E3 #55 |
| Menú «⋯» de las notas y lista con vista previa | B3 #53 |
| Nombre DictaVoz (solo lo visible) | #57 |

## Qué está en curso (PR abiertos, todos en borrador, **ninguno unido**)

| PR | Qué es | Dueño (según su documento) | Depende de |
|---|---|---|---|
| #58 | Auditoría y propuesta de almacenamiento definitivo (solo documentación) | ChatGPT | — |
| #59 | Entrega 2 · P1 y P4 parcial: borradores confirmados y notas de solo audio | ChatGPT | `main` |
| #60 | Entrega 2 · P2: biblioteca en claro y copia formato 2 (ensayo, sin activar) | ChatGPT | #59 |
| #61 | K2: restaurar en instalación vacía (ensayo) | ChatGPT | #60 |
| #52 | Visión de la experiencia y guía estética (solo documentación) | ChatGPT | — |
| #49, #37 | Guía del propietario y feedback del Motorola; decisiones del 16/11 (solo documentación) | Claude | — |
| #22, #1 | Borradores viejos de otras etapas | sin dueño vigente | — |

**Cadena de PR:** #59 → #60 → #61 están apilados. **Se unen en ese orden o no se unen**; si #59 cambia, los otros dos se rehacen sobre él.

## Lo que hay que resolver antes de seguir (para Ignacio)

1. **¿K2 está autorizado?** El tablero dice que K2 se consulta siempre. El PR #61 implementa un ensayo acotado de K2 (solo instalación vacía) y no cita tu permiso. Confirmalo (sí / no / solo como ensayo) y queda anotado en `docs/DECISIONES.md`.
2. **Bloqueante conocido de #61:** con la protección apagada, otra pestaña todavía puede escribir mientras se restaura. Hasta resolverlo no se une.
3. **Decisiones de la auditoría todavía sin responder** (lista en `docs/DECISIONES.md`, grupo «Pendientes»): retención por defecto, retirar datos de prueba históricos, T, AO, borrado de bases viejas.
4. `main` sigue **sin protección** en GitHub (verificado el 17/11). Lo activa Ignacio; los pasos están en `docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md`, sección 2.

## Próximo paso

Según el tablero: **revisión cruzada de #59** (la hace una IA distinta de la que lo programó), luego #60 y #61 en orden. K2 de reemplazo, T y AO **no empiezan** sin permiso explícito. Pedido listo en [docs/PEDIDOS.md](docs/PEDIDOS.md).

## Estado de las pruebas (tres niveles, siempre separados)

- **Código guardado:** lo de `main` está publicado; lo de los PR está solo en sus ramas.
- **Pruebas técnicas:** 166 de 166 en Node y diez suites de Chrome en verde para `main` (CAMBIOS.md, 17/11). Los PR traen las suyas en el CI.
- **Probado en el Motorola:** grabar, guardar, reproducir, editar, protección con contraseña, quitar audio y panel de espacio. **Sin probar:** copia cifrada, adelantar/pausar el audio, «Ver nota» y todo lo de los PR abiertos. Ignacio tiene limitaciones técnicas para probar: las IA hacen todo lo posible en laboratorio y piden solo lo que únicamente se ve en el teléfono (`docs/PRUEBA-CORTA-MOTOROLA.md`).

## Pendientes de producto anotados (sin decidir ni empezar)

Rediseño de Ajustes (maqueta primero, esperar aprobación) · deshacer una edición ya guardada · mensaje de «otra pestaña» más claro · elegir cuaderno y nombre desde Dictar · «querés» transcripto como «queréis» · modo oscuro opcional · autoría en Ajustes · motor Whisper propio dentro del repositorio. Detalle y estado de cada uno: `docs/DECISIONES.md`.

## Historia

Los carteles de estado anteriores de esta página están en [docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md](docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md). La bitácora técnica detallada es `CAMBIOS.md`.
