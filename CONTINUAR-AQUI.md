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

## Pasos a seguir (en este orden)

Anotados con las respuestas de Ignacio del 17/11/2026 (detalle en `docs/DECISIONES.md`, grupo A).

1. **Fusionar este PR de orden (#62)** cuando Ignacio lo revise. Mientras tanto, los documentos nuevos viven solo en la rama `docs/ordenar-documentacion-2026-11-17`.
2. **Revisión cruzada de la Entrega 2, en orden y por una IA distinta de ChatGPT:** primero **#59**, después **#60**, después **#61**. Pedidos listos en `docs/PEDIDOS.md`, sección 4. El informe de cada uno vuelve a su dueña para corregir en su rama.
3. **Resolver el bloqueante de #61:** con la protección apagada, otra pestaña todavía puede escribir mientras se restaura. Sin esto, K2 no se une (A5).
4. **K2 está autorizado** (ensayo **y** reemplazo, con respaldo verificado previo y doble confirmación) y **se une sin consultar de nuevo** si tiene revisión cruzada sin hallazgos graves, el CI en verde y el bloqueante resuelto (A4, A5). **El reemplazo todavía no está programado:** hace falta un PR y un dueño aparte; el #61 es solo el ensayo en instalación vacía.
5. **Después de las revisiones, mejoras de uso** (U16): primero **elegir cuaderno y nombre desde Dictar** (U12) y el **rediseño de Ajustes**. El rediseño empieza con una **maqueta** y no se programa hasta que Ignacio la apruebe.
6. **«Conservar audio» activado de entrada** en instalaciones nuevas, con aviso de privacidad (A6), **cuando** la copia y la restauración cubran también el audio sin protección (A2).
7. **Retirar la compatibilidad con el audio suelto viejo** y borrar sus datos de prueba (A7, A8). Es el único borrado autorizado y solo para datos de prueba; cualquier otro se consulta.
8. **T** (mudar el texto a la misma base que los audios, A9): **con permiso explícito de Ignacio** antes de programar y de unir. Después, AO (reglas todavía sin decidir, Q2).
9. **Pendiente de Ignacio:** proteger `main` en GitHub (sigue sin protección; pasos en `docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md`, sección 2).

**Todavía sin decidir:** cuándo se publica el formato 2 de copia (Q1), las reglas de AO (Q2) y el orden de los pendientes menores (Q3: deshacer una edición guardada, reintentar Whisper, mensaje de «otra pestaña», voseo).

## Estado de las pruebas (tres niveles, siempre separados)

- **Código guardado:** lo de `main` está publicado; lo de los PR está solo en sus ramas.
- **Pruebas técnicas:** 166 de 166 en Node y diez suites de Chrome en verde para `main` (CAMBIOS.md, 17/11). Los PR traen las suyas en el CI.
- **Probado en el Motorola:** grabar, guardar, reproducir, editar, protección con contraseña, quitar audio y panel de espacio. **Sin probar:** copia cifrada, adelantar/pausar el audio, «Ver nota» y todo lo de los PR abiertos. Ignacio tiene limitaciones técnicas para probar: las IA hacen todo lo posible en laboratorio y piden solo lo que únicamente se ve en el teléfono (`docs/PRUEBA-CORTA-MOTOROLA.md`).

## Pendientes de producto sin prioridad

Deshacer una edición ya guardada · reintentar Whisper desde el audio guardado · mensaje de «otra pestaña» más claro · «querés» transcripto como «queréis» · modo oscuro opcional · autoría en Ajustes · motor Whisper propio dentro del repositorio. Los dos que sí tienen prioridad (elegir cuaderno desde Dictar y rediseño de Ajustes) están en «Pasos a seguir». Detalle: `docs/DECISIONES.md`.

## Historia

Los carteles de estado anteriores de esta página están en [docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md](docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md). La bitácora técnica detallada es `CAMBIOS.md`.
