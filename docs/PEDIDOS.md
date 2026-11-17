# DictaVoz · Pedidos para copiar y pegar (iguales para cualquier IA)

> **Un solo lugar.** Estos pedidos reemplazan a los que había en el tablero y a los archivos `PROMPT-*.txt` de `docs/` (históricos). Sirven igual para Claude y para ChatGPT: cambia solo el paso. Creado el 17/11/2026 (Claude, solo documentación).
> **Para qué:** que las dos IA lean **el mismo conjunto de documentos, en el mismo orden**, y trabajen sobre el mismo estado.
> **⚠ Mientras el PR #62 no esté unido a `main`:** `docs/INDICE.md`, `docs/DECISIONES.md`, este archivo y el `CONTINUAR-AQUI.md` nuevo existen **solo en la rama `docs/ordenar-documentacion-2026-11-17`**. Agregá al final de cualquier pedido: «Los documentos nuevos están en la rama docs/ordenar-documentacion-2026-11-17 (PR #62); leelos de ahí». Cuando se una, esta advertencia se borra.

## 1. Pedido base (el que se usa casi siempre)

Reemplazá `[PASO]` por lo que corresponda (ver la tabla de la sección 2).

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Antes de hacer nada:
1) Revisá el último main y los PR abiertos.
2) Leé en este orden: AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md y docs/PLAN-ALMACENAMIENTO-CIFRADO.md. El código de main manda sobre cualquier documento.
Te toca SOLO este paso: [PASO].
Si ese paso ya tiene dueño en el tablero, o depende de algo que todavía no está unido a main, frená y avisame. No toques la rama ni el PR de otra IA.
Contame el plan en lenguaje simple antes de programar. Si el paso es T, esperá mi permiso explícito (K2 ya lo autoricé: docs/DECISIONES.md, A4 y A5).
Al terminar, en el mismo PR: entrada en CAMBIOS.md, fila del tablero, reescribí CONTINUAR-AQUI.md (sin apilar carteles) y anotá en DECISIONES.md solo lo que yo haya decidido. Informame en tres niveles separados: código guardado · pruebas técnicas · probado en el Motorola. Nada de datos reales de pacientes.
```

## 2. Qué poner en `[PASO]`

| Si querés… | `[PASO]` | Modelo sugerido (Claude / ChatGPT) | Notas |
|---|---|---|---|
| Que revise lo que hizo la otra IA | `Revisión cruzada del PR #__` (usar el pedido de la sección 3) | El más capaz / el más capaz, razonamiento alto | La revisión la hace **una IA distinta de la que programó** |
| Seguir la cadena de la Entrega 2 | `Revisión cruzada de #59, después #60 y #61, en ese orden` (pedidos en la sección 4) | El más capaz | Están apilados: se unen en orden o no se unen |
| Resolver el bloqueante de K2 | `Candado universal de escritura sin bóveda (bloqueante del PR #61)` | El más capaz | Solo la IA dueña de #61, o la que Ignacio designe. K2 está autorizado (A4) |
| K2 de reemplazo | `K2 (reemplazar datos existentes)` | El más capaz | **Autorizado por Ignacio el 17/11** (A4), con respaldo verificado previo y doble confirmación. Sin PR todavía; puede borrar datos |
| Mudar el texto | `T (mudar el texto al depósito grande)` | El más capaz | **Con permiso explícito.** Es la única migración del plan. Texto en la misma base que los audios (A9). Antes: K2 terminado |
| Original recuperable | `AO (anonimización con original recuperable)` | Intermedio o el más capaz | Después de T. Antes: reglas de AO (Q2) sin decidir |
| Flujo de Whisper fallido | `U14: reintentar la transcripción desde el audio de una nota (Whisper falló)` | El más capaz | Depende de #59 unido |
| Elegir cuaderno y nombre desde Dictar | `U12: elegir cuaderno y nombre desde Dictar` | Intermedio | Solo interfaz. **Prioridad de Ignacio (U16)** |
| Rediseño de Ajustes | `Rediseño de Ajustes: primero una maqueta con capturas, sin tocar index.html` | Intermedio | **Prioridad de Ignacio (U16).** Esperar su aprobación de la maqueta antes de programar |
| Deshacer una edición guardada | `Deshacer una edición de nota ya guardada` | Intermedio | Toca el modelo de notas: plan antes |
| Ordenar el repositorio | `Limpieza de ramas y PR viejos (#1, #22, #37)` | Intermedio | **Solo proponer la lista; borrar solo con pedido de Ignacio** |

Los nombres de los modelos de ChatGPT cambian seguido: elegí el más capaz que muestre el plan de Ignacio para lo delicado (cifrado, copias, migraciones). No usar modelos chicos para nada de esto.

## 3. Pedidos especiales

**Revisión cruzada de un PR hecho por otra IA** (cambiá el número y el paso). No cambia código.

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Leé AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md y docs/PLAN-ALMACENAMIENTO-CIFRADO.md, y el documento del PR que enlaza su descripción. Revisá el PR #__ (paso: __). No cambies código ni la rama. Decime en lenguaje simple: si cumple el diseño y mis decisiones registradas, qué riesgos ves para los datos guardados, qué pruebas faltan y qué no pudiste verificar. Separá lo grave de lo menor. Cada hallazgo con archivo y línea. Si el PR hace algo que mis decisiones no autorizan (K2, T, AO, borrados, cambios de formato), marcalo primero.
```

**Traspaso al cerrar una sesión** (para no dejar nada solo en la conversación).

```
Antes de terminar: dejá el repo al día. Reescribí CONTINUAR-AQUI.md con el estado de hoy (mové lo viejo a docs/historial/), actualizá la fila de tu paso en el tablero con tu nombre, el PR y el estado, y agregá tu entrada en CAMBIOS.md. Decime en una línea qué quedó hecho, qué quedó a medias y cuál es el próximo paso.
```

**Actualizar una IA que ya venía trabajando** (cuando una conversación vieja sigue abierta).

```
Tu información puede estar vieja. Releé el último main, los PR abiertos, docs/DECISIONES.md y CONTINUAR-AQUI.md, y decime qué cambió desde la última vez que trabajaste. No sigas con tu plan anterior hasta que me lo cuentes.
```

## 4. Revisión cruzada de la Entrega 2 (#59 → #60 → #61)

Los tres PR los programó ChatGPT, así que los revisa **otra IA** (sugerido: Claude Opus 5.5, o el modelo más capaz disponible, con razonamiento alto). **Se revisan en orden y en sesiones separadas**: no se revisa #60 hasta tener el informe de #59, ni #61 hasta el de #60. El revisor **no cambia código ni la rama**: entrega un informe. Quien programó corrige después, en su propio PR.

**Revisión del PR #59** (P1: borradores confirmados · P4 parcial: nota de solo audio)

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Leé AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md y docs/PLAN-ALMACENAMIENTO-CIFRADO.md, y el documento docs/ENTREGA2-ARQUITECTURA-B-IMPLEMENTACION-2026-11-17.md de la rama del PR. Revisá el PR #59 (base: main). NO cambies código ni la rama; entregame un informe. Comprobá en el código, no en la descripción: (1) saveDraft solo marca «guardado» tras verificar la escritura (con bóveda, tras vault.flush y vault.saved), y un fallo de cuota o de otra pestaña no se disimula; (2) un borrador viejo nunca pisa a uno nuevo y no se pierde el editor si falla el guardado; (3) vaultLockNow y la activación de la protección no avanzan si el borrador no se pudo confirmar; (4) restoreDraft no duplica una nota ya confirmada y no descarta un borrador distinto; (5) «Guardar solo audio» exige un audio cerrado e íntegro (anAudioHealth), no inventa texto y no cruza el audio con otra nota; (6) «Preparar nota» desde un audio huérfano crea un borrador sin confirmar, nunca una nota definitiva; (7) no cambian AN_DB_VERSION, el cifrado, el AAD, el formato .dictanota ni claves guardadas; (8) las pruebas nuevas prueban lo que dicen (no pasan por casualidad). Corré node --test y las suites de Chrome que puedas, y decime cuáles no pudiste correr. Informe en lenguaje simple, separando lo grave de lo menor, con archivo y línea de cada hallazgo, y diciendo qué riesgo corren los datos guardados. Marcá primero cualquier cosa que mis decisiones (docs/DECISIONES.md) no autoricen: K2, T, AO, borrados o cambios de formato.
```

**Revisión del PR #60** (P2: biblioteca en claro y copia formato 2, sin activar). Solo después del informe de #59.

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Leé AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md, docs/PLAN-ALMACENAMIENTO-CIFRADO.md y docs/ENTREGA2-P2-RESPALDO-V2-PREPARACION.md de la rama del PR. Revisá el PR #60 (apilado sobre #59, no lo modifiques). NO cambies código; entregame un informe. Comprobá: (1) el modo «claro» queda explícito en la ficha del audio y nunca puede confundirse con un audio cifrado ni quedar «aparentemente protegido»; (2) SHA-256 por parte, y qué pasa si un fragmento se altera, falta o se reordena; (3) el formato 2 de copia cifra con AES-GCM el audio que estaba en claro, trae manifiesto e integridad, y el formato 1, K1 y tests/copia-formato-1.dictanota quedan intactos; (4) el lector de formato 1 sigue funcionando; (5) nada de esto está conectado a la interfaz del usuario ni cambia AN_DB_VERSION ni borra o migra bases históricas; (6) el fixture tests/copia-formato-2.dictanota.base64 y su prueba de contraseña incorrecta; (7) qué casos no cubre (audio heredado notasvoz-gamma-audio, cuotas, cortes, dos pestañas). Informe en lenguaje simple, grave vs. menor, con archivo y línea, y qué riesgo corren los datos. Marcá primero lo que docs/DECISIONES.md no autorice (A3 permite el ensayo del formato 2 solo en laboratorio; publicarlo pide permiso aparte).
```

**Revisión del PR #61** (K2: restaurar en instalación vacía, ensayo). Solo después del informe de #60. Ignacio autorizó K2 el 17/11 (ensayo y reemplazo; `docs/DECISIONES.md`, A4 y A5).

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Leé AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md, docs/PLAN-ALMACENAMIENTO-CIFRADO.md y docs/K2-RESTAURACION-VACIA-2026-11-17.md de la rama del PR. Revisá el PR #61 (apilado sobre #60). NO cambies código; entregame un informe. Empezá por esto: yo autoricé K2 el 17/11 (docs/DECISIONES.md, A4 y A5), pero este PR es solo el ensayo en instalación vacía; decime si respeta ese alcance (sin reemplazar ni combinar datos) y si trae algo del reemplazo que no esté revisado. Después comprobá: (1) rechaza antes de escribir si hay notas, ajustes, borradores, audio de la biblioteca nueva o grabaciones antiguas, y lo vuelve a comprobar tras validar; (2) primer recorrido (validar todo: clave, cabecera, bloques, cifrado, integridad, bloque final) y segundo (offsets, sin volcar todo a memoria) antes de modificar nada; (3) la cabecera de la bóveda se escribe al final y es el punto de confirmación; (4) qué pasa si se corta en cada paso y si la limpieza del lote funciona al recargar; (5) rechaza el formato 2 con audio originalmente en claro; (6) no restaura la huella de otro dispositivo; (7) el bloqueante conocido: con la protección apagada otra pestaña puede escribir mientras se restaura. Decime si está realmente resuelto o solo advertido en pantalla, y si por sí solo impide unirlo; (8) cuota llena en localStorage e IndexedDB, dos pestañas, fichas corruptas, lotes parciales. Informe en lenguaje simple, grave vs. menor, con archivo y línea, y qué riesgo corren los datos. No recomiendes unir mientras el bloqueante siga abierto (es condición para unir, A5).
```

**Qué hacer con los informes:** pegarlos (o pasarlos) a la IA dueña de cada PR para que corrija en su rama; no se unen hasta que el informe no tenga hallazgos graves y el CI esté en verde. Para K2 alcanza con eso (A5); para lo demás, dentro de lo que permite `docs/DECISIONES.md` (W2).

## 5. Reglas que valen para todos los pedidos

- **Un paso por pedido.** Si encontrás algo fuera de tu alcance, anotalo en el PR; no lo arregles «de paso».
- **Una rama nueva por paso**, desde el `main` actualizado. Nunca sobre la rama de otra IA.
- **El dueño de un paso es quien tiene su rama o PR abierto.** Para tomar un paso sin dueño: anotá tu nombre y tu PR en el tablero **antes** de programar.
- **La apertura de un PR no autoriza unirlo.** Merge normal, sin squash, con el CI en verde y dentro de lo permitido por `docs/DECISIONES.md` (W2).
- **Si no hay certeza sobre una decisión, preguntá a Ignacio.** No la deduzcas de la descripción de un PR.
- Ignacio es psicólogo, no programador: explicale en español rioplatense, claro y corto.
- Nada de datos reales de pacientes en el repositorio (es público): usá «Persona Inventada Uno», código `X-901` y audios sintéticos.
