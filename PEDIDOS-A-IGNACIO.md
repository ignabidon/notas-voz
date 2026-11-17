# Pedidos a Ignacio

> **Nombre fijo: este archivo no cambia de lugar ni de nombre.** Acá se anota **todo lo que una IA le pidió a Ignacio que haga** (probar en el celular, decidir algo, tocar una configuración de GitHub). Ignacio no necesita saber de informática: cada pedido está escrito paso a paso.
> Última actualización: 17/11/2026 (Claude Sonnet 5.5).

## Reglas para las IA

1. **Si le pedís algo a Ignacio, anotalo acá en el mismo cambio** (PR o commit) donde se lo pedís. Un pedido que está solo en el chat se pierde.
2. Cada pedido tiene: número (`P-nn`, no se reutilizan), fecha, quién lo pide, **qué** hacer, **para qué**, **pasos en lenguaje simple**, **cómo avisar el resultado** y **estado**.
3. Escribí como si Ignacio no supiera nada técnico: nada de «commit», «PR», «caché» sin explicarlo. Un paso = una acción. Decí qué tendría que ver en pantalla, y qué hacer si ve otra cosa.
4. **Datos inventados siempre.** Nunca datos reales de pacientes (nombres, voces, casos). Usá «Persona Inventada Uno», código `X-901`, o un texto cualquiera leído en voz alta.
5. Estados posibles: **Pendiente** · **Ignacio respondió** (poner fecha y resultado tal como lo dijo) · **Cumplido** · **No se puede** (con el motivo) · **Reemplazado por P-nn**.
6. **Solo Ignacio confirma que algo se probó en el Motorola.** Ninguna IA marca «Cumplido» una prueba física por su cuenta ni la da por hecha por inferencia.

### Para la IA que controla el cumplimiento

- Revisá este archivo cada vez que empieces una sesión. Por cada pedido **Pendiente**, fijate si hay respuesta de Ignacio en el chat o en la documentación (`CAMBIOS.md`, `SEGURIDAD.md`, `CONTINUAR-AQUI.md`).
- Si Ignacio ya respondió, pasá el pedido a **Cumplido** o **Ignacio respondió** y copiá su resultado en «Resultado», con fecha. Si faltan datos, preguntale solo lo que falta.
- Si pasaron varios días y sigue Pendiente, **recordáselo a Ignacio** al empezar la próxima conversación, en una línea, sin repetir todos los pasos.
- No cierres un pedido por falta de noticias. «Sin respuesta» no es «cumplido».
- Cuando un pedido de prueba revele un fallo, abrí el seguimiento en `CAMBIOS.md` y en el documento del tema, y enlazalo desde «Resultado».

## Resumen (de un vistazo)

| Pedido | Qué | Quién lo pidió | Fecha | Estado |
|---|---|---|---|---|
| **P-01** | Decidir qué pasa con el PR #47 (audios cifrados) | Claude | 17/11/2026 | Pendiente |
| **P-02** | Probar en Brave del celular los audios cifrados (E2) | Claude | 17/11/2026 | Pendiente (se hace después de P-01) |
| **P-03** | Prueba general de la app en el Motorola (la guía larga) | Claude (Fable 5.2) | 16/11/2026 | Pendiente |
| **P-04** | Proteger la rama `main` en GitHub | Claude / ChatGPT | 15/11/2026 | Pendiente |
| **P-05** | Decidir si se guarda una copia propia del motor Whisper | Claude | 15/11/2026 | Pendiente |
| **P-06** | Probar la app en Firefox de la computadora (opcional) | Claude | 15/11/2026 | Pendiente |

---

## P-01 · Decidir qué pasa con el PR #47 (audios cifrados)

- **Pedido por:** Claude (Sonnet 5.5), tras revisar el PR. **Fecha:** 17/11/2026.
- **Qué es el PR #47:** el trabajo que guarda los audios cifrados junto a cada nota (paso «E2»). Todavía **no está unido** a la app publicada.
- **Qué encontró la revisión:** nada grave, pero hay que corregir unas pocas cosas antes de unirlo, sobre todo: (1) con la protección apagada, la app puede negarse a guardar notas por error y decir «otra pestaña»; (2) algunos avisos pueden decir «se quitó el audio» cuando no pasó. El detalle, con letra de molde, está en [docs/REVISION-PR47-E2-2026-11-17.md](docs/REVISION-PR47-E2-2026-11-17.md); no hace falta que lo leas entero.
- **Qué te pido:** que le digas a una IA (Claude o ChatGPT) una de estas frases:
  - **«Corregí los hallazgos H-1, A-1 y A-3 del PR #47 según docs/REVISION-PR47-E2-2026-11-17.md»** (recomendado). La IA te va a mostrar un plan corto y te va a pedir permiso antes de tocar el código.
  - o **«Uní el PR #47 así como está»**, sabiendo que esos fallos quedan (no son peligrosos para tus datos, pero son molestos).
  - Mientras no decidas, **no se une nada**.
- **Cómo avisar:** contestame en el chat con la frase que elegiste.
- **Estado:** Pendiente.
- **Resultado:** —

---

## P-02 · Probar en Brave del celular los audios cifrados (paso E2)

- **Pedido por:** Claude (Sonnet 5.5). **Fecha:** 17/11/2026.
- **Cuándo hacerla:** **solo después de que el PR #47 esté unido y publicado** (P-01). Si lo hacés antes, no vas a ver nada de esto, porque la versión publicada todavía no lo tiene. Si no sabés si ya está publicado, preguntale a la IA: «¿ya se publicó el PR #47?».
- **Para qué:** comprobar que lo que pasa en el celular coincide con lo que dicen los avisos. Es lo único que no pueden probar las IA. **Todavía no se pueden escuchar los audios desde la app** (eso llega más adelante); por eso las pruebas miran los **avisos** y que **no se pierda nada**.
- **Qué necesitás:** el celular Motorola, Brave, la dirección de siempre (https://ignabidon.github.io/notas-voz/), 30 minutos y **un texto inventado para leer en voz alta** (por ejemplo, una receta de cocina). Nada de pacientes.
- **Antes de empezar (solo la primera vez):**
  1. Abrí DictaNota en Brave. Andá a **Ajustes**.
  2. Tocá **Activar protección**. Elegí una contraseña de prueba (que no uses en otro lado) y **anotá en un papel el código de recuperación**. Sin esos dos datos, las notas de prueba se pierden (no pasa nada grave, son de prueba).
  3. Fijate que **«Conservar audio»** esté encendido.

**Prueba A · Grabar y guardar**
1. Tocá **Grabar** y leé la receta durante 1 minuto. Tocá **Detener**.
2. Tocá **Guardar**.
- *Tendría que pasar:* aparece un aviso «Guardado…». La nota aparece en Cuadernos.
- Cerrá Brave del todo (deslizá la app hacia arriba), abrila de nuevo, desbloqueá con la contraseña: la nota tiene que estar.

**Prueba B · Cancelar una edición**
1. En Cuadernos abrí esa nota y tocá **Editar**.
2. Grabá 10 segundos más y detené.
3. Tocá **Cancelar edición**.
- *Tendría que pasar:* te pregunta si querés cancelar; después dice que la nota **no cambió** y que **se quitó el audio agregado**.
- **Anotá el aviso exacto que te salió** (sacá captura). Si dice algo distinto, o si no sale ningún aviso, contámelo.

**Prueba C · Dos pestañas a la vez**
1. Con DictaNota abierta y desbloqueada, abrí **otra pestaña** en Brave con la misma dirección y desbloqueá.
- *Tendría que pasar:* arriba de la segunda pestaña aparece un cartel que dice que está abierta en otra pestaña y que **no se guarda nada**.
2. En la segunda pestaña escribí «prueba» y tocá **Guardar**.
- *Tendría que pasar:* te dice que **no se guardó**, y el texto queda en pantalla.
3. Cerrá la primera pestaña, recargá la segunda y desbloqueá. Probá **Guardar** de nuevo.
- *Tendría que pasar:* ahora sí guarda.

**Prueba D · Quitar la protección con audios guardados**
1. Ajustes → **Quitar la protección**.
- *Tendría que pasar:* te explica que **todavía no se puede** porque hay audios guardados, y la protección sigue activa. Si te deja quitarla, avisame **antes** de seguir.

**Prueba E · Cargar un archivo de audio**
1. Cargá un audio inventado (por ejemplo una grabación tuya de otro día con una receta) que pese **menos de 30 MB**. 
- *Tendría que pasar:* se transcribe y avisa que se guardó cifrado.
2. Cargá uno que pese **más de 30 MB**.
- *Tendría que pasar:* lo rechaza y lo explica.

**Prueba F · Grabación larga** (si tenés tiempo)
1. Grabá 10 minutos leyendo. Guardá. Después abrí la nota, tocá **Editar** y **Grabar**: **cronometrá cuánto tarda en empezar a grabar**.
- *Anotá:* si se trabó, si se calentó el celular, y los segundos que tardó.

**Prueba G · Cierre de golpe** (opcional, un poco brusca)
1. Escribí «prueba de corte», tocá **Guardar** y **enseguida** cerrá Brave deslizándolo hacia arriba.
2. Abrí de nuevo y desbloqueá.
- *Tendría que pasar:* la nota está **una sola vez**. Si aparece un aviso de recuperación, copialo.

- **Cómo avisar el resultado:** escribime en el chat, por ejemplo: `A ✔ · B ✔ (dice «se quitó el audio agregado») · C ✘ (la segunda pestaña dejó guardar) · D ✔ · E ✔ · F ✔ (tardó 8 s) · G no lo hice`. Si algo falló, pegá una captura o el texto del aviso. Si una prueba no la podés hacer, decilo: queda «sin probar», sin problema.
- **Estado:** Pendiente.
- **Resultado:** —

---

## P-03 · Prueba general de la app en el Motorola

- **Pedido por:** Claude (Fable 5.2). **Fecha:** 16/11/2026.
- **Qué es:** la guía larga con todo lo que todavía no se probó en el celular (grabar, transcribir, MP3, cuadernos, anonimizar, protección con huella, etc.).
- **Dónde está:** [docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md). Se puede hacer por partes; cada paso dice qué tendría que pasar.
- **Cómo avisar:** como indica la sección 4 de esa guía (`1 ✔ · 2 ✔ · 3 ✘ …`). Con eso la IA actualiza la documentación y marca «probado en el Motorola» solo lo que vos confirmes.
- **Estado:** Pendiente.
- **Resultado:** —

## P-04 · Proteger la rama `main` en GitHub

- **Pedido por:** Claude y ChatGPT (hallazgo 4 de `SEGURIDAD.md`). **Fecha:** 15/11/2026.
- **Qué es:** hoy se puede publicar cambios en la app aunque las pruebas automáticas fallen. Se arregla con una opción de GitHub; **ninguna IA puede ni debe tocarla**.
- **Para qué:** que GitHub no deje unir un cambio si las pruebas no pasaron.
- **Pasos:** los pasos para hacerlo están en [docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md) (sección 2, «Proteger `main` en GitHub», unos 5 minutos). Si preferís, decile a una IA: «guiame paso a paso para proteger main en GitHub».
- **Cómo avisar:** «ya protegí main» (o «no quiero hacerlo»).
- **Estado:** Pendiente.
- **Resultado:** —

## P-05 · Decidir si se guarda una copia propia del motor Whisper

- **Pedido por:** Claude (hallazgo 2 de `SEGURIDAD.md`). **Fecha:** 15/11/2026.
- **Qué es:** hoy el motor que transcribe se descarga de un servicio público (jsDelivr). Si ese servicio fuera vulnerado, podría leer tus notas. Guardar una copia propia lo evita, pero hace la app más pesada y da más trabajo mantenerla.
- **Qué te pido:** que elijas **sí** o **no por ahora**. No es urgente.
- **Cómo avisar:** «sí, hacer copia propia» o «no por ahora».
- **Estado:** Pendiente.
- **Resultado:** —

## P-06 · Probar la app en Firefox de la computadora (opcional)

- **Pedido por:** Claude. **Fecha:** 15/11/2026.
- **Para qué:** en Firefox hubo problemas con el transcriptor; después del último ajuste ya anda, pero no se probó con las protecciones nuevas.
- **Pasos:** abrí https://ignabidon.github.io/notas-voz/ en Firefox, grabá 20 segundos leyendo un texto inventado y comprobá que transcribe. Si activaste la protección, probá desbloquear.
- **Cómo avisar:** «Firefox anda» o pegá el mensaje de error que te salga.
- **Estado:** Pendiente.
- **Resultado:** —
