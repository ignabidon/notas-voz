# DictaNota · Tus pendientes y la prueba en el Motorola (16/11/2026)

> ## ▶ Actualización del 17/11/2026, 9:19 (Claude)
> **Lo que ya está hecho** (unido a `main`, sin que tengas que hacer nada más): el PR #41 (Etapa A), la Etapa N (Dictar / Cuadernos), E1, E2 (audios cifrados), K1 (copia cifrada: crear y verificar), B3 (menú ⋯ de las notas) y **E3 (reproductor y panel de espacio)**. Lo de «Todavía no se pueden escuchar los audios desde la app» más abajo **ya no vale**: se escuchan desde la nota.
> **Aviso:** tenés limitaciones técnicas para probar en el Motorola, así que las IA evitan pedirte pruebas que se puedan hacer en laboratorio.
> **Lo que probaste hoy en el Motorola** está en [PRUEBA-CORTA-MOTOROLA.md](PRUEBA-CORTA-MOTOROLA.md), con el estado de cada paso. Esa es ahora la lista vigente de lo que falta; **esta prueba larga queda para otro día** (Whisper Small, MP3, huella, grabaciones largas).
> **Tus pendientes hoy:**
> 1. **Cerrar el PR #54** (lo reemplazó el #55, ya unido) y decidir qué hacer con los viejos: #49 (guía del propietario y feedback del Motorola), #37 (decisiones del motor), #52 (visión DictaVoz) y los borradores #22 y #1. Ninguna IA los cierra sin que lo pidas.
> 2. **Proteger `main`** (sección 2): al 16/11 seguía sin protección; hoy no lo verifiqué.
> 3. **Nombre: decidido el 17/11 → DictaVoz.** Ya se cambió dentro de la app; el repositorio, las claves y la extensión `.dictanota` no cambian. Te queda verificar que el nombre no esté tomado. Detalle en la prueba corta.
> 4. **Ajustes**: tiene demasiado texto y opciones. **Rediseño en marcha (17/11)**: primero se te muestra una maqueta y esperás a aprobarla.
> 5. **Dos pedidos tuyos sin resolver** del uso en el Motorola: elegir cuaderno y nombre desde Dictar, y que «querés» no salga como «queréis». Y uno nuevo: **deshacer una edición ya guardada** (hoy no existe).
> 6. **Próximo paso técnico: K2** (restaurar una copia cifrada). Es el que puede borrar datos: la IA te consulta antes de empezar.
>
> *Las secciones 1 a 5 de abajo son de la versión del 16/11 y se conservan como referencia.*

> **Para:** Ignacio. **Responsable de este documento:** Claude. Solo documentación.
> **Ninguna IA puede hacer estos pasos por vos**: son del celular y de tu cuenta de GitHub.
> **Regla de oro:** usá **solo datos inventados**. El repositorio es público y nada de lo que pruebes debe ser de un paciente real.

## Orden recomendado

1. Revisar las capturas de la Etapa A y decidir si se une el **PR #41** (5 min).
2. Proteger la rama `main` en GitHub (5 min, una sola vez).
3. Probar la versión publicada en el Motorola con Brave (30–40 min).
4. Contarme (o contarle a ChatGPT) el resultado, paso por paso.

---

## 1. Revisar y decidir el PR #41 (Etapa A) — *hecho: ya está unido*

- Mirá las capturas «antes y después» (360 y 412 px) que te mandé en el chat.
- Qué cambió, en lenguaje simple: se quitó la palabra vieja «Texto» de algunos mensajes; los dos botones de Audio se ven iguales; Ajustes está más ordenado (íconos propios, botón (i) junto al título, el selector de modelo no corta el texto); el punto de grabación es rojo al grabar y ámbar al pausar; «Procesamiento local» se ve también en el celular; Audio no repite frases ni muestra un botón «Descargar audio» de más.
- Si te gusta: decime **«uní el PR #41»** (hago un merge normal, sin squash). Si no, decime qué cambiar.
- Los cambios no se ven en el celular hasta que se unen a `main` (el sitio se publica desde `main`). Si algo no te gusta, se puede deshacer fácil: es un solo merge.
- El **PR #37** (solo documentación, decisiones del motor Whisper propio) sigue abierto: decime si lo querés unir.

## 2. Proteger `main` en GitHub

Hoy `main` **no está protegida**: se puede publicar aunque fallen las pruebas. Se arregla desde tu cuenta (ninguna IA lo puede cambiar sin tu pedido).

1. Entrá a **github.com/ignabidon/notas-voz** → pestaña **Settings**.
2. Buscá **Rules → Rulesets → New ruleset → New branch ruleset** (si tu pantalla muestra **Branches → Add branch protection rule**, sirve igual; los nombres pueden variar un poco).
3. Nombre: `proteger-main`. Estado: **Active**. Objetivo: la rama **main** (por defecto, «Default branch»).
4. Activá estas reglas:
   - **Require a pull request before merging** (dejá las aprobaciones requeridas en **0**; si pedís 1, vos mismo no podrías unir tus propios PR).
   - **Require status checks to pass** → agregá **`prueba-estatica`** (es el nombre de la prueba automática; aparece en la lista porque ya corrió).
   - **Block force pushes** y **Restrict deletions** (que nadie reescriba ni borre `main`).
5. **No** marques permisos de excepción («bypass») para nadie, salvo que quieras poder saltarte la regla en una emergencia.
6. Guardá con **Create**. Para comprobar: en un PR nuevo el botón de unir debe esperar a que `prueba-estatica` esté en verde.

Detalles a tener en cuenta:
- A veces `prueba-estatica` falla por un «Chrome timeout» que no es un error del código. Se arregla con **Re-run failed jobs** en la pestaña Actions (o pidiéndoselo a una IA).
- Con la regla activa, nadie sube directo a `main`: todo pasa por PR. Es lo que querés.
- Después de hacerlo, avisame y actualizo `SEGURIDAD.md` (hallazgo 4: de «abierto» a «hecho»).

## 3. Prueba en el Motorola (Brave) — con datos inventados

**Antes de empezar:** abrí https://ignabidon.github.io/notas-voz/ en Brave, con buena batería y wifi. Debe decir «DictaNota» y, abajo, «Delta 11 · versión de prueba». Si ves la versión vieja, cerrá la pestaña y abrila de nuevo. Texto para leer en voz alta (inventado): *«Hoy hablé con Ana Ejemplo y con Pedro Prueba. Ana me dio un teléfono inventado: 11 5555 1234.»*

Anotá cada paso como **✔ bien** o **✘ falló** (y, si falló, sacá una captura y copiá el mensaje que aparece).

### 3.1 Arranque y seguridad del navegador (CSP)
1. ☐ La página abre completa (no queda en blanco ni cortada).
2. ☐ En **Ajustes → Calidad de transcripción** dejá elegido **Base**. El modelo se descarga solo la primera vez que transcribís (hace falta internet y puede tardar un rato).
   - Si en algún momento aparece un mensaje con «etapa: descarga de la librería», «preparación del modelo» o «Content Security Policy», **copiá el texto exacto**: es justo lo que hay que confirmar.

### 3.2 Grabar y transcribir (Base y Small)
3. ☐ En **Audio**, activá **Conservar audio**, tocá **Grabar**, leé el texto de arriba (20–30 s), tocá **Detener**.
4. ☐ Aparece el texto transcripto (la primera vez tarda más porque descarga el modelo). Anotá cuánto tardó, aproximado.
5. ☐ Repetí con **Small** (Ajustes → modelo Small; descarga otro modelo). Anotá si anduvo, si fue más lento y si hubo errores o el celular se puso muy lento.
6. ☐ Durante una grabación, **Pausar** y **Reanudar** funcionan; la barra de abajo sigue visible. (El punto de estado es **rojo** al grabar y **ámbar** al pausar solo si ya se unió la Etapa A; antes era ámbar en los dos casos.)

### 3.3 Audio guardado y MP3
7. ☐ En «Tus audios guardados»: **Descargar audio** descarga un archivo y podés reproducirlo. Probá también **Transcribir este audio**.
8. ☐ **Convertir a MP3** termina y descarga el archivo (esto confirma la «huella» de la librería MP3 en el celular).
9. ☐ Grabá un segundo audio; después tocá **Recuperar audio anterior** (si el botón aparece) y comprobá que vuelve el primero.

### 3.4 Notas (cuadernos/hojas) y exportación
10. ☐ **Notas**: se ven tus notas anteriores como hojas.
11. ☐ Escribí algo y **Guardar** (hoja nueva con fecha y hora). Con esa hoja abierta, **Grabar** y **Guardar** (se agrega ahí).
12. ☐ **Editar** un mensaje: la fecha **no** cambia. **Mover** y **Deshacer** funcionan.
13. ☐ **Descargar .txt** de una hoja y **Compartir** (o copiar): sale el texto correcto.

### 3.5 Anonimizar
14. ☐ En **Anonimizar**, con el texto de ejemplo, **Anonimizar transcripción**, revisá el resultado y **Deshacer**. Recordá: es automático y puede fallar; siempre revisar.

### 3.6 Protección con huella (opcional pero importante, aún sin probar en el celular)
15. ☐ **Ajustes → Privacidad y almacenamiento → Activar protección**: elegí una contraseña de prueba y **anotá el código de recuperación** (es de prueba; sin él ni la contraseña se pierden las notas de prueba).
16. ☐ **Activar huella** y registrar la huella.
17. ☐ Recargá la página: pide desbloqueo. Desbloqueá **con la huella** y, otra vez, **con la contraseña**.
18. ☐ Bloqueá a mano (**Bloquear ahora** en Ajustes, o el candado de arriba) y comprobá que no se ven las notas. (El autobloqueo a los 15 minutos con la pantalla apagada también se puede mirar si tenés tiempo.)
19. ☐ Al terminar, si querés, **Quitar la protección** con tu contraseña. *(Desde E2: si hay audios guardados con notas, la app no te deja y explica por qué. Es lo esperado.)*

### 3.7 Lo nuevo de la Etapa A (solo si ya se unió el PR #41)
20. ☐ «Procesamiento local» se ve debajo del logo, en el celular.
21. ☐ En Ajustes: íconos distintos por módulo, el botón (i) está junto al título, el selector de modelo no corta el texto.
22. ☐ En Audio: «Conservar audio» está en una fila propia y no se repite la frase «Activá “Conservar audio”…».
23. ☐ No queda ningún mensaje que diga «Texto» como si fuera una pestaña.

### 3.8 Audios cifrados por nota (solo si ya se unió el PR #47, paso E2)
Con la protección activada y «Conservar audio» encendido; leé en voz alta un texto inventado.
24. ☐ Grabá 1 minuto, guardá la nota. Grabá otra de **10 minutos** y, si podés, una de **60**: que no se corte (batería y temperatura razonables).
25. ☐ Cargá un M4A o MP3 inventado de menos de 30 MB (se guarda) y uno de más de 30 MB (lo rechaza).
26. ☐ Editá la nota A, grabale algo, tocá **Cancelar edición**: el aviso dice que se quitó el audio agregado. Intentá editar otra nota B con la edición de A abierta y algo grabado: tiene que pedirte que guardes o canceles.
27. ☐ Abrí DictaNota en **dos pestañas** de Brave y desbloqueá las dos: la segunda muestra arriba «abierta en otra pestaña» y, si tocás Guardar ahí, dice que no se guardó.
28. ☐ Ajustes → **Quitar la protección** con audios guardados: te explica que no se puede todavía y la protección sigue.
(Con E3 los audios ya se escuchan desde la nota: ver la prueba corta, pasos 10 a 14.)

## 4. Cómo contarme el resultado

Pegame en el chat una lista así: `1 ✔ · 2 ✔ · 3 ✔ · 4 ✔ (≈40 s) · 5 ✘ (se trabó al preparar Small) …`, con las capturas o mensajes de los pasos que fallaron. Con eso actualizo `SEGURIDAD.md`, `README.md` y `CAMBIOS.md` y marco **«probado en el Motorola»** solo lo que vos confirmes. Si una parte no la podés probar, decímelo: queda como «sin probar».

## 5. Lo que queda para después (no hace falta que lo hagas hoy)

- Probar en **Firefox** (PC), porque ahí hubo problemas con el Worker de Whisper.
- Decidir si se aloja una **copia propia** del motor Whisper (hallazgo 2 de `SEGURIDAD.md`; el PR #37 documenta tu decisión).
- Permitir o no que ChatGPT retome con la **Etapa N** (pestañas «Dictar» y «Cuadernos»): primero te presentará un plan y esperará tu permiso.
