# CONTINUAR AQUÍ — DictaVoz

> **Una sola página, un solo estado.** Quien termina un paso **reescribe esta página** (no agrega carteles arriba) y mueve lo viejo a `docs/historial/`. Si algo de acá contradice al código de `main`, vale el código; si contradice a `docs/DECISIONES.md`, vale ese registro.
> **Ordenada el 24/11/2026 (Claude, solo documentación):** se pusieron al día los pasos y la tabla de `main` (hasta #76) y los estados de `docs/DECISIONES.md`. No se tocó código.
> **Estado al 21/11/2026 (ChatGPT):** PR #71 fue revisado por una IA independiente, sus cuatro hallazgos F1/F2/M1/M2 se dieron por resueltos y se **fusionó a `main` sin squash** (merge `8ccc08ac`). El propietario probó en su Motorola G56 5G grabar, guardar/reproducir audio y cerrar/reabrir sin pérdida; también descargó y **verificó** una copia cifrada de **10 cuadernos, 16 notas y 9 audios (aprox. 0,5 MB)**. No probó restaurar. Se detectó un formulario de contraseña oculto al crear la copia; corrección puntual en rama `fix-copias-formulario-visible-2026-11-21`, **sin fusionar** y pendiente de CI y prueba física. PR #72 es visual, permanece en borrador y su rama quedó desfasada respecto del `main` que incluye #71; se debe actualizar/resolver conflictos antes de fusionarlo. Solo datos ficticios hasta completar las validaciones de seguridad.

## Prueba en el celular · 22/11/2026

La opción A llegó a main en #76 (`1cb38a4`). Ignacio observó diferencias en Cuadernos, un aviso prematuro al transcribir y un óvalo en Grabar. ChatGPT implementó las correcciones en `fix/impresiones-movil-dictavoz`. El PR de esa rama contiene los resultados automáticos. Pendiente repetir esos tres puntos en el Motorola.

## Revisión visual · 22/11/2026 (unida)

Ignacio eligió **A · Cuaderno de margen**. Quedó unida a `main` con #75 (revisión estética y de marketing) y #76 (`1cb38a4`). Ignacio la probó el 24/11 y le gusta. **Por comprobar en el Motorola:** letra grande, lectura y copia de una nota, conservación de audio y dictado con una mano. Coordinar cualquier integración de #72 por el solapamiento visual.

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
| Beta de audio claro o cifrado por nota, respaldos formato 2 y correcciones de auditoría F1/F2/M1/M2 | #71 (fusionado 21/11, `8ccc08ac`) |
| Documentación ordenada (índice, decisiones únicas, pedidos) | #62 |
| Entrega 2: borradores confirmados y notas de solo audio (P1, P4 parcial) | #59 |
| Biblioteca en claro y copia formato 2 (**ensayo, sin activar**) | #60 |
| U12: elegir cuaderno y nombre desde Dictar | #67 |
| U5/U18: Clínica serena y apariencia clara/nocturna, unidos en #69 | #69 (main `cfda606`) |
| U19: Dictar simplificado | En `main`; sus pruebas de laboratorio pasan (24/11). Falta probarlo en el Motorola |
| Revisión estética y de marketing; «Cuaderno de margen» | #75, #76 (22/11). Sin probar en el Motorola |
| K2 de reemplazo y capa única de registros | #64, #65 |
| K2: restaurar en instalación **vacía** (experimental; rechaza copias incompletas y con audio en claro) | #61 |

**Revisiones del 17/11 a la noche.** Una revisión externa de seguridad (IA de un amigo de Ignacio, solo lectura) encontró un hallazgo grave en «Quitar la protección» (si fallaba a mitad de camino quedaba texto en claro) y un riesgo en K2 (copias incompletas). Se corrigieron en `4e7758d` y `c4cb29f`, con pruebas nuevas. Una segunda revisión externa de esos dos commits no encontró hallazgos graves: con eso se cumplió A5 y se unió K2.

## Qué está en curso (PR abiertos)

| PR | Qué es | Dueño | Depende de |
|---|---|---|---|
| PR nuevo (rama `fix-copias-formulario-visible-2026-11-21`) | Mostrar contraseña de copias en su pantalla y mensajes honestos de descarga; sin cambios de datos | ChatGPT | #71, ya fusionado |
| #72 | Ajustes visuales derivados del #71; rama anterior a #71 con conflictos respecto de `main` | Trabajo previo en borrador | Reconciliar con #71 y ejecutar CI |
| #58 | Auditoría y propuesta de almacenamiento definitivo (solo documentación) | ChatGPT | — |
| #52 | Visión de la experiencia y guía estética (solo documentación) | ChatGPT | — |
| #49, #37 | Guía del propietario y feedback del Motorola; decisiones del 16/11 (solo documentación) | Claude | — |
| #22, #1 | Borradores viejos de otras etapas | sin dueño vigente | — |

## Pasos a seguir (en este orden)

1. **Probar en el Motorola** lo último de `main` (#75, #76, U5, U17, U18, U12, U19), con datos inventados. Es una prueba corta que solo puede hacer Ignacio.
2. **Copia oculta:** confirmar si el PR de la rama `fix-copias-formulario-visible-2026-11-21` ya se unió; si no, revisarlo con el CI en verde y unirlo sin squash. Comprobar el formulario en el Motorola sin restaurar ni borrar datos.
3. **PR #72 visual:** actualizarlo sobre el `main` actual, retirar aserciones obsoletas, resolver conflictos y probar accesibilidad móvil. No unir directamente la rama atrasada.
4. **Agregar `tests/dictar-simple-browser.mjs` al CI** (`.github/workflows/verificar-delta.yml`): pasa, pero hoy no se ejecuta en cada cambio.
5. **«Conservar audio» activado de entrada** en instalaciones nuevas (A6).
6. **Retirar el audio suelto viejo** y borrar sus datos de prueba (A7, A8, A14).
7. **T** (mudar el texto), con permiso explícito de Ignacio (cabecera v:2, durabilidad estricta, borrar `localStorage` recién en el desbloqueo siguiente). Después, AO.
8. **Pendiente de Ignacio:** proteger `main` en GitHub (sigue sin protección), sobre todo antes de dar permisos de escritura a otra persona.

**Todavía sin decidir:** cuándo se publica el formato 2 de copia (Q1), las reglas de AO (Q2) y el orden de los pendientes menores (Q3: deshacer una edición guardada, mensaje de «otra pestaña»).

## Estado de las pruebas (tres niveles, siempre separados)

- **Código guardado:** lo de `main` está publicado; lo de los PR está solo en sus ramas.
- **Pruebas técnicas:** 187 en Node (más 11 de la capa de registros) y diez suites de Chrome en verde para `main` (CAMBIOS.md, 17/11). Los PR traen las suyas en el CI.
- **Probado en el Motorola:** el 21/11 el propietario confirmó grabar, conservar audio, guardar/reproducir, cerrar/reabrir, recuperar contraseña mediante código y **descargar/verificar** copia completa cifrada de 10 cuadernos/16 notas/9 audios. **Sin probar en esta ronda:** restauración y formulario corregido (aún no integrado), adelantar/pausar el audio, «Ver nota» y los cambios de PR #72. Datos ficticios; no inferir uso clínico habilitado.

## Pendientes de producto sin prioridad

Deshacer una edición ya guardada · mensaje de «otra pestaña» más claro · motor Whisper propio dentro del repositorio. Los dos que tenían prioridad (elegir cuaderno desde Dictar y rediseño de Ajustes) ya están hechos. Detalle: `docs/DECISIONES.md`.

## Historia

Los carteles de estado anteriores de esta página están en [docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md](docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md). La bitácora técnica detallada es `CAMBIOS.md`.
