# CONTINUAR AQUÍ — DictaVoz

> **Una sola página, un solo estado.** Quien termina un paso **reescribe esta página** (no agrega carteles arriba) y mueve lo viejo a `docs/historial/`. Si algo de acá contradice al código de `main`, vale el código; si contradice a `docs/DECISIONES.md`, vale ese registro.
> **Última actualización: 18/11/2026 (Claude).** Unidos a `main`: #62 (documentación), la cadena #59 → #60 → #61 y la capa de registros (#64). **K2 de reemplazo programado y entregado como `.patch` + descripción (sin PR; falta revisión cruzada).**

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
| Documentación ordenada (índice, decisiones únicas, pedidos) | #62 |
| Entrega 2: borradores confirmados y notas de solo audio (P1, P4 parcial) | #59 |
| Biblioteca en claro y copia formato 2 (**ensayo, sin activar**) | #60 |
| K2: restaurar en instalación **vacía** (experimental; rechaza copias incompletas y con audio en claro) | #61 |

**Revisiones del 17/11 a la noche.** Una revisión externa de seguridad (IA de un amigo de Ignacio, solo lectura) encontró un hallazgo grave en «Quitar la protección» (si fallaba a mitad de camino quedaba texto en claro) y un riesgo en K2 (copias incompletas). Se corrigieron en `4e7758d` y `c4cb29f`, con pruebas nuevas. Una segunda revisión externa de esos dos commits no encontró hallazgos graves: con eso se cumplió A5 y se unió K2.

## Qué está en curso (PR abiertos)

| PR | Qué es | Dueño | Depende de |
|---|---|---|---|
| #58 | Auditoría y propuesta de almacenamiento definitivo (solo documentación) | ChatGPT | — |
| #52 | Visión de la experiencia y guía estética (solo documentación) | ChatGPT | — |
| #49, #37 | Guía del propietario y feedback del Motorola; decisiones del 16/11 (solo documentación) | Claude | — |
| #65 | K2 de reemplazo: respaldo previo, comparación y doble confirmación, borrado con diario, A11 | Claude | #64 |
| #22, #1 | Borradores viejos de otras etapas | sin dueño vigente | — |

## Pasos a seguir (en este orden)

1. **Capa única de registros:** hecha y unida (#64).
2. **K2 de reemplazo:** **programado** (respaldo previo comprobado → comparación y doble confirmación → marca propia «restauración en curso» → borrado guiado con diario reanudable → restauración; espacio comprobado; audios sin protección cifrados al restaurar, A11; código de recuperación nuevo al final). Entregado como `.patch` sobre `main`. **Falta:** revisión cruzada, unirlo y probarlo en el Motorola (confirmaciones en pantalla chica, descarga del respaldo previo, audios reales, un corte real). Sigue siendo experimental. Pregunta para Ignacio (Q1): si el respaldo previo tiene que cubrir también los audios sin cifrar, hay que habilitar el formato 2 para el usuario.
3. **Mejoras de uso** (U16): elegir cuaderno y nombre desde Dictar (U12) y la maqueta del rediseño de Ajustes.
4. **«Conservar audio» activado de entrada** en instalaciones nuevas (A6), cuando la restauración cubra el audio sin protección (paso 2).
5. **Retirar el audio suelto viejo** y borrar sus datos de prueba (A7, A8).
6. **T**, con permiso explícito de Ignacio (cabecera v:2, durabilidad estricta, borrar `localStorage` recién en el desbloqueo siguiente). Después, AO.
7. **Pendiente de Ignacio:** proteger `main` en GitHub (sigue sin protección), sobre todo antes de dar permisos de escritura a otra persona.

**Todavía sin decidir:** cuándo se publica el formato 2 de copia (Q1), las reglas de AO (Q2) y el orden de los pendientes menores (Q3: deshacer una edición guardada, reintentar Whisper, mensaje de «otra pestaña», voseo).

## Estado de las pruebas (tres niveles, siempre separados)

- **Código guardado:** lo de `main` está publicado; lo de los PR está solo en sus ramas.
- **Pruebas técnicas:** 187 en Node (más 11 de la capa de registros) y diez suites de Chrome en verde para `main` (CAMBIOS.md, 17/11). Los PR traen las suyas en el CI.
- **Probado en el Motorola:** grabar, guardar, reproducir, editar, protección con contraseña, quitar audio y panel de espacio. **Sin probar:** copia cifrada, adelantar/pausar el audio, «Ver nota» y todo lo de los PR abiertos. Ignacio tiene limitaciones técnicas para probar: las IA hacen todo lo posible en laboratorio y piden solo lo que únicamente se ve en el teléfono (`docs/PRUEBA-CORTA-MOTOROLA.md`).

## Pendientes de producto sin prioridad

Deshacer una edición ya guardada · reintentar Whisper desde el audio guardado · mensaje de «otra pestaña» más claro · «querés» transcripto como «queréis» · modo oscuro opcional · autoría en Ajustes · motor Whisper propio dentro del repositorio. Los dos que sí tienen prioridad (elegir cuaderno desde Dictar y rediseño de Ajustes) están en «Pasos a seguir». Detalle: `docs/DECISIONES.md`.

## Historia

Los carteles de estado anteriores de esta página están en [docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md](docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md). La bitácora técnica detallada es `CAMBIOS.md`.
