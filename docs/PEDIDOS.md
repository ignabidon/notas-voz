# DictaVoz · Pedidos para copiar y pegar (iguales para cualquier IA)

> **Un solo lugar.** Estos pedidos reemplazan a los que había en el tablero y a los archivos `PROMPT-*.txt` de `docs/` (históricos). Sirven igual para Claude y para ChatGPT: cambia solo el paso. Creado el 17/11/2026 (Claude, solo documentación).
> **Para qué:** que las dos IA lean **el mismo conjunto de documentos, en el mismo orden**, y trabajen sobre el mismo estado.

## 1. Pedido base (el que se usa casi siempre)

Reemplazá `[PASO]` por lo que corresponda (ver la tabla de la sección 2).

```
Trabajás en DictaVoz (repo github.com/ignabidon/notas-voz). Antes de hacer nada:
1) Revisá el último main y los PR abiertos.
2) Leé en este orden: AGENTS.md, SEGURIDAD.md, docs/INDICE.md, CONTINUAR-AQUI.md, docs/DECISIONES.md y docs/PLAN-ALMACENAMIENTO-CIFRADO.md. El código de main manda sobre cualquier documento.
Te toca SOLO este paso: [PASO].
Si ese paso ya tiene dueño en el tablero, o depende de algo que todavía no está unido a main, frená y avisame. No toques la rama ni el PR de otra IA.
Contame el plan en lenguaje simple antes de programar. Si el paso es K2 o T, esperá mi permiso explícito.
Al terminar, en el mismo PR: entrada en CAMBIOS.md, fila del tablero, reescribí CONTINUAR-AQUI.md (sin apilar carteles) y anotá en DECISIONES.md solo lo que yo haya decidido. Informame en tres niveles separados: código guardado · pruebas técnicas · probado en el Motorola. Nada de datos reales de pacientes.
```

## 2. Qué poner en `[PASO]`

| Si querés… | `[PASO]` | Modelo sugerido (Claude / ChatGPT) | Notas |
|---|---|---|---|
| Que revise lo que hizo la otra IA | `Revisión cruzada del PR #__` (usar el pedido de la sección 3) | El más capaz / el más capaz, razonamiento alto | La revisión la hace **una IA distinta de la que programó** |
| Seguir la cadena de la Entrega 2 | `Revisión de #59, después #60 y #61, en ese orden` | El más capaz | Están apilados: se unen en orden o no se unen |
| Resolver el bloqueante de K2 | `Candado universal de escritura sin bóveda (bloqueante del PR #61)` | El más capaz | Solo la IA dueña de #61, o la que Ignacio designe. Requiere P3 respondida |
| K2 de reemplazo | `K2 (reemplazar datos existentes)` | El más capaz | **Con permiso explícito de Ignacio**. Puede borrar datos |
| Mudar el texto | `T (mudar el texto al depósito grande)` | El más capaz | **Con permiso explícito.** Es la única migración del plan. Antes: P7 respondida y K2 terminado |
| Original recuperable | `AO (anonimización con original recuperable)` | Intermedio o el más capaz | Después de T. Antes: P6 respondida |
| Flujo de Whisper fallido | `U14: reintentar la transcripción desde el audio de una nota (Whisper falló)` | El más capaz | Depende de #59 unido |
| Elegir cuaderno y nombre desde Dictar | `U12: elegir cuaderno y nombre desde Dictar` | Intermedio | Solo interfaz |
| Rediseño de Ajustes | `Rediseño de Ajustes: primero una maqueta con capturas, sin tocar index.html` | Intermedio | **Esperar la aprobación de Ignacio antes de programar** |
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

## 4. Reglas que valen para todos los pedidos

- **Un paso por pedido.** Si encontrás algo fuera de tu alcance, anotalo en el PR; no lo arregles «de paso».
- **Una rama nueva por paso**, desde el `main` actualizado. Nunca sobre la rama de otra IA.
- **El dueño de un paso es quien tiene su rama o PR abierto.** Para tomar un paso sin dueño: anotá tu nombre y tu PR en el tablero **antes** de programar.
- **La apertura de un PR no autoriza unirlo.** Merge normal, sin squash, con el CI en verde y dentro de lo permitido por `docs/DECISIONES.md` (W2).
- **Si no hay certeza sobre una decisión, preguntá a Ignacio.** No la deduzcas de la descripción de un PR.
- Ignacio es psicólogo, no programador: explicale en español rioplatense, claro y corto.
- Nada de datos reales de pacientes en el repositorio (es público): usá «Persona Inventada Uno», código `X-901` y audios sintéticos.
