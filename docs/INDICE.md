# DictaVoz · Índice de documentos (qué es cada uno y cuál manda)

> **Para qué sirve:** que cada documento tenga **un solo rol** y que dos IA que lean el mismo conjunto no reciban órdenes distintas. Lo mantiene quien cambie la estructura de la documentación. Creado el 17/11/2026 (Claude, solo documentación).

## 1. Qué manda sobre qué (de mayor a menor)

1. **El código de `main`** (`/index.html` y `tests/`). Si un documento dice otra cosa, el documento está desactualizado.
2. **`docs/DECISIONES.md`**: lo que Ignacio decidió. Ninguna IA decide por él; si algo no está acá, es una pregunta, no una decisión.
3. **`AGENTS.md`** y **`SEGURIDAD.md`**: reglas permanentes para editar el código. Las reglas de seguridad no se saltan por un acuerdo de forma de trabajo.
4. **`docs/PLAN-ALMACENAMIENTO-CIFRADO.md`**: el tablero (qué paso toca, quién lo tiene, en qué estado).
5. **`CONTINUAR-AQUI.md`**: el estado de hoy, en una página.
6. **Diseños, auditorías y propuestas** (el porqué): explican, **no autorizan nada**.
7. **Histórico**: solo para entender cómo se llegó acá.

## 2. Los documentos, uno por uno

| Documento | Rol (una sola cosa) | Estado | Quién lo toca y cuándo |
|---|---|---|---|
| `CONTINUAR-AQUI.md` | Estado de hoy en una página: qué hay en `main`, qué PR están abiertos y de quién, qué hay que resolver | **Vigente** | Cada IA, **al terminar un paso**: lo **reescribe** (no apila carteles) y manda lo viejo a `docs/historial/` |
| `docs/DECISIONES.md` | Registro único de decisiones de Ignacio, con fecha, fuente y estado | **Vigente** | Solo cuando Ignacio decide o cambia algo, y con su palabra citada |
| `docs/PLAN-ALMACENAMIENTO-CIFRADO.md` | Tablero de pasos con dueño y estado | **Vigente** | La IA que toma o termina un paso, en el mismo PR |
| `docs/PEDIDOS.md` | Pedidos para copiar y pegar, iguales para cualquier IA | **Vigente** | Quien cambie la forma de trabajo |
| `AGENTS.md` | Reglas permanentes del código (qué preservar, cómo cuidar los datos, cómo probar) | **Vigente** | Solo si cambia una **regla permanente**. No lleva estado ni decisiones |
| `CLAUDE.md` | Puntero corto para Claude hacia lo de arriba | **Vigente** | Casi nunca |
| `SEGURIDAD.md` | Reglas y hallazgos de seguridad (CSP, orígenes, huella MP3, pendientes) | **Vigente** | Quien cambie algo de seguridad |
| `DISENO-CIFRADO.md` | Formato de la bóveda cifrada (del que depende la futura app de Android) | **Vigente** | Solo con versión nueva de formato |
| `CAMBIOS.md` | Bitácora técnica: qué se hizo, con qué pruebas y qué falta. **Solo se agrega** | **Vigente** | Cada IA, una entrada por entrega, arriba |
| `README.md` | Qué es la app y cómo se prueba | **Vigente, con textos viejos** (aún dice «Audio / Texto» y «DictaNota» en algunos lugares) | Quien toque la interfaz |
| `docs/PRUEBA-CORTA-MOTOROLA.md` | Lista corta de lo que **solo** se ve en el celular, para Ignacio | **Vigente** | Quien termine un paso que cambie algo visible |
| `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md` | El porqué del almacenamiento cifrado (E, K, T, AO) | **Referencia** | Nadie salvo para corregir errores |
| `docs/PROPUESTA-ESTETICA-2026-11-16.md` | Propuesta de estética por etapas A–E y N. Su sección 6 se pasó a `DECISIONES.md` | **Referencia** | Nadie (el PR #52 le agrega una sección) |
| `docs/CORRECCIONES-PR48-2026-11-16.md` | Detalle de las correcciones de la «Clínica editorial» | **Referencia** | Nadie |
| `docs/REDISENO-CONVERSACIONAL-2026-11-16.md` | Especificación del rediseño en cuadernos y burbujas | **Referencia** (ya implementado en gran parte) | Nadie |
| `docs/INFORME-CONTINUIDAD-2026-11-16.md` | Informe de la mañana del 16/11 | **Histórico** | Nadie |
| `docs/TRASPASO-A-CHATGPT-2026-11-16.md` | Traspaso tras la Etapa A | **Histórico** | Nadie |
| `docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md` | Prueba larga de 23 pasos y cómo proteger `main` | **Histórico**, salvo su sección 2 (proteger `main`) | Nadie |
| `docs/PROMPT-SIGUIENTE-IA-2026-11-16.txt`, `docs/PROMPT-CHATGPT-ESTETICA-2026-11-16.txt` | Pedidos viejos. **No usar**: dan órdenes obsoletas | **Histórico** | Nadie. Los pedidos vigentes están en `docs/PEDIDOS.md` |
| `docs/historial/` | Copias de carteles y estados anteriores | **Histórico** | Solo se agrega |
| `docs/capturas/` | Capturas de laboratorio (datos inventados) | **Referencia** | Quien haga capturas |

**Documentos que existen solo en PR abiertos (todavía no están en `main`):** `docs/AUDITORIA-ALMACENAMIENTO-DEFINITIVO-2026-11-17.md` (#58), `docs/VISION-EXPERIENCIA-DICTAVOZ.md` (#52), `docs/ENTREGA2-…`, `docs/K2-…` (#59 a #61), `GUIA-DEL-PROPIETARIO.md` y `docs/FEEDBACK-MOTOROLA-2026-11-16.md` (#49). Mientras no se unan, valen como **propuesta o trabajo en curso**, no como regla.

## 3. Reglas para que no se superpongan las instrucciones

1. **Cada dato vive en un solo lugar.** Estado → `CONTINUAR-AQUI.md`. Decisiones → `DECISIONES.md`. Reglas del código → `AGENTS.md`. Pasos y dueños → el tablero. Si necesitás mencionarlo en otro lado, **enlazá, no copies**.
2. **No se apilan carteles de «estado actual».** Quien actualiza reescribe y archiva lo viejo en `docs/historial/`.
3. **Una decisión nueva de Ignacio** se anota en `DECISIONES.md` con su fecha y la fuente; los demás documentos solo la enlazan por su número (D1, W2, A1…).
4. **Un documento histórico no se edita** para corregirlo: se agrega arriba un aviso de «histórico» y se enlaza al vigente.
5. **Un PR de otra IA no se toca.** Si hace falta un cambio, se pide a Ignacio que lo coordine y se anota en el tablero.
6. **Al terminar un paso, siempre estas cuatro cosas, en el mismo PR:** entrada en `CAMBIOS.md` · fila del tablero · reescritura de `CONTINUAR-AQUI.md` · `DECISIONES.md` solo si hubo una decisión nueva.
7. **Nombre:** la app se llama **DictaVoz** (antes DictaNota). Las claves internas, el repositorio y la extensión `.dictanota` **no cambian**. En documentos viejos «DictaNota» es la misma app.
8. **Vocabulario:** nota = cada texto; **cuaderno** = conjunto de notas (antes «hoja»). Los ids internos y funciones `conv…` conservan el nombre viejo.

## 4. Pendientes de orden que no se hicieron en esta entrega (a propósito)

- **Mover o renombrar documentos históricos:** se dejaron en su lugar porque el PR #52 edita `PROPUESTA-ESTETICA` y casi todos los demás documentos se enlazan entre sí. Se marcan, no se mueven.
- **`AGENTS.md`** todavía mezcla reglas permanentes con secciones fechadas del 15/11 (Firefox, dictado del navegador, ergonomía). Conviene separarlas en una segunda vuelta, con el código a la vista, para no perder ninguna regla.
- **`README.md`** tiene textos de la interfaz vieja.
- **Ramas:** el repositorio tiene unas 63 ramas. Borrar solo a pedido de Ignacio; conservar `archivo-antes-de-delta-2026-11-15` y `respaldo-delta-07-antes-de-delta-08`.
