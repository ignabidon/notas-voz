# DictaNota — Prueba Delta

> **📌 CONTINUIDAD DEL PROYECTO PARA OTRAS IA:** comenzá por **[CONTINUAR-AQUI.md](CONTINUAR-AQUI.md)** y el [informe de rediseño conversacional](docs/REDISENO-CONVERSACIONAL-2026-11-16.md). Describe el próximo diseño propuesto (Notas / Biblioteca / Ajustes, bitácora y biblioteca multi-audio), **aún sin implementar**. No modificar la aplicación sin autorización explícita.

**Aplicación oficial:** https://ignabidon.github.io/notas-voz/

> **⚠ Seguridad:** hay una revisión de seguridad («pen testing») en curso. Leé [SEGURIDAD.md](SEGURIDAD.md): qué está confirmado, qué no, riesgos abiertos y reglas para editar. Hasta ahora las notas **no están cifradas**: no uses datos reales.

Esta es la **única versión web activa** del repositorio. La etapa vigente es **Delta 11**, con navegación Android de cuatro pantallas (Audio / Texto / Anonimizar / Ajustes), estado global de transcripción y acciones accesibles de audio y texto.

> **Prueba Delta 11 — experimental.** El usuario ya probó en Brave Android la grabación, Whisper, descarga TXT, recuperación del audio anterior y funcionamiento general de la interfaz. Las acciones nuevas de Delta 11 —Descargar audio visible, Compartir texto y accesos directos— **todavía necesitan prueba real en el Motorola**. Las 53 pruebas automáticas y la publicación GitHub Pages fueron satisfactorias. No usar datos reales de pacientes.


## Notas en hojas (16/11/2026 · fase 3, sin probar en el Motorola)

La pestaña **Notas** reemplaza a Texto. Cada hoja es como un chat privado (no se envía nada): sus mensajes muestran la **fecha y hora en que se guardaron**.

- Grabá o escribí: el texto queda en el editor como **mensaje sin guardar**. Tocá **Guardar** para sumarlo a una hoja o **Descartar** para tirarlo (pide confirmación).
- Grabar desde **Audio** crea siempre una hoja nueva. Con una hoja abierta en **Notas**, lo que grabes o escribas se agrega ahí.
- En cada mensaje: Copiar, Editar, Mover, Borrar. En cada hoja: Renombrar, Copiar todo, Pasar todo a otra hoja, Descargar .txt.
- Tus notas anteriores aparecen solas como hojas (una burbuja por nota); las originales se conservan aparte.

**Prueba en el Motorola (datos inventados):** abrir Notas y ver las notas anteriores → escribir algo y Guardar (hoja nueva con fecha y hora) → con esa hoja abierta, Grabar y Guardar (se agrega ahí) → ir a Audio, grabar, volver a Notas y Guardar (hoja nueva) → Editar un mensaje y ver que la fecha no cambia → Mover y Deshacer → Pasar todo a otra hoja → Copiar todo y pegar en otra app → escribir algo, cerrar Brave sin guardar y volver a abrir (debe ofrecer Guardar o Descartar) → probar con letra Grande.

## Protección con contraseña y huella (16/11/2026)

En **Ajustes → Privacidad y almacenamiento → Protección con contraseña y huella** podés cifrar en el celular las notas, el borrador, la copia para deshacer, la tabla de personas y el diccionario.

1. Tocá **Activar protección** y elegí una contraseña de al menos 8 caracteres (mejor una frase).
2. Anotá en papel el **código de recuperación** (o usá «Copiar código» y pegalo en un lugar seguro). Se muestra una sola vez y sirve si olvidás la contraseña. Si lo perdiste, en Ajustes podés crear un **nuevo código de recuperación** con tu contraseña. **Sin la contraseña ni el código, nadie puede recuperar las notas.**
3. Tocá **Activar huella**. El celular crea una llave de acceso «DictaNota» y desde ahí abrís con la huella.

Se bloquea a los 15 minutos sin uso (nunca mientras grabás o transcribís) o con el botón **Bloquear** de arriba. **Los audios guardados todavía no se cifran**, y lo que descargás, copiás o compartís sale sin cifrar. Estado: probado en Chrome de laboratorio con una huella simulada; **falta probarlo en el Motorola**. Detalles en [DISENO-CIFRADO.md](DISENO-CIFRADO.md).

## Funciones
- Grabación de voz, cronómetro, pausa/reanudación, marcas y detención.
- **Cuatro pantallas:** Audio, Texto, **Anonimizar** y Ajustes, accesibles desde la barra inferior. Mientras se graba, mantiene **Pausar/Reanudar** y **Detener** sin importar qué pantalla esté abierta.
- Transcripción local con Whisper. Descargar o cambiar de modelo puede requerir conexión a internet.
- Corrección contextual de palabras o frases. **DictaNota aprende sola de lo que corregís** (se puede apagar en Ajustes → Diccionario) y también podés escribir reglas a mano en el diccionario.
- Edición de texto; pantalla **Anonimizar** (explica para qué sirve, asocia cada nombre con un código y permite deshacer; revisar siempre).
- Borrador, notas y audio guardados en el navegador; el botón Guardar solicita además un archivo TXT descargable; exportación y diagnósticos técnicos.

## Anonimizar, audios y aprendizaje (16/11/2026)

**Barra inferior:** Audio · Texto · **Anonimizar** · Ajustes. La primera pestaña (antes «Grabar») se llama **Audio**: grabás, cargás un audio o abrís tus grabaciones.

**Anonimizar** reemplaza nombres de personas, teléfonos, correos y fechas del texto por etiquetas (`[Persona 1]`, `[número]`…) o por códigos que elegís, para poder guardar o compartir la nota sin mostrar quién es cada persona. En esa pantalla encontrás: ayuda ⓘ sobre qué hace (con un ejemplo inventado), el botón «Anonimizar transcripción», «Deshacer anonimizado», una vista del texto tal como queda y la lista **Personas y códigos**: escribís el nombre (y apodos), quién es (madre, hermano… o vacío si es el paciente) y un código tuyo o generado (`P-001`); debajo se ve cómo se va a escribir (`[madre de P-001]`). Sin lista, los nombres se ocultan como `[Persona 1]`, `[Persona 2]`… La lista se guarda solo en este navegador y **no está cifrada**. La anonimización es automática y puede fallar: revisá siempre el resultado.

**Audios:** en la pestaña Audio, debajo del micrófono, el botón **Mis grabaciones** lleva a «Tus audios guardados» (también hay accesos en Texto y en Ajustes → Audio). Al terminar de guardarse una grabación aparece un **aviso verde «Grabación completa»** con el botón «Descargar audio», y un punto verde en la pestaña Audio si estás en otra pantalla. Cuando termina una transcripción, aparece un punto en la pestaña Texto. **Cargar un audio:** el botón «Cargar un audio para transcribir» transcribe un archivo del celular (hasta 200 MB y 15 minutos inclusive) y **no lo guarda**. Desde ahí descargás, convertís a MP3, transcribís de nuevo, borrás o recuperás el audio anterior.

**Aprendizaje automático:** cuando corregís una palabra del texto, DictaNota la recuerda sola (sin botón) y la usa en próximas transcripciones. Verás el aviso «Aprendí tu corrección…» con **Deshacer**. Solo aprende errores de transcripción parecidos (palabras que se escriben o suenan casi igual), nunca nombres con mayúscula, números ni cambios de contenido, y no aprende de la anonimización. Lo aprendido queda en Ajustes → Diccionario, bajo «Aprendido de tus correcciones», donde podés borrarlo. Se apaga con «Aprender de mis correcciones».

**Cómo probarlo en el celular (datos ficticios):** (1) Abrí Anonimizar y leé la explicación; cargá una persona con código, volvé a Texto con un texto de prueba y anonimizá; deshacé. (2) En Texto corregí una palabra mal transcripta, cerrá el teclado y buscá el aviso «Aprendí…»; revisalo en Ajustes → Diccionario. (3) Grabá con «Conservar audio» y recuperalo desde Audio, Texto y Ajustes. Estado: pruebas automáticas y navegador de laboratorio; **sin prueba en el Motorola todavía**.

## Corrección de bloqueo en Firefox (15/11/2026)

Whisper trabaja localmente con muestras PCM mono a 16 kHz enviadas a un Worker. No se sube el audio a una API de transcripción. Solo se descargan librerías y modelos. MediaRecorder guarda, por separado, el archivo nativo (WebM/Opus u Ogg/Opus según soporte); sus fragmentos se concatenan en orden antes de decodificar el archivo completo para retranscribir.

En Firefox se usa CPU y, sin aislamiento entre orígenes, un hilo WASM; Android conserva su selección de aceleración. La carga del modelo y cada petición de transcripción tienen un límite absoluto de **5 minutos por petición**. Activar AudioContext tiene 10 segundos y preparar AudioWorklet, 15. La preparación PCM tiene 15 segundos; leer el archivo, 15 segundos; decodificarlo, 30 segundos. Un plazo agotado termina el Worker y habilita un nuevo intento. Una descarga muy lenta o Small en un equipo lento pueden superar esos límites: probá Base/Tiny. Los temporizadores pueden demorarse si el navegador suspende la pestaña o el sistema.

Al terminar, fallar o cancelar aparece **Reintentar transcripción del audio en memoria**, si quedó una copia completa de las partes con voz. Pide confirmación y reemplaza el editor; guardá antes cualquier corrección. La copia es temporal, se pierde al recargar o comenzar otra grabación, y se limita a 32 MB para no aumentar sin límite la memoria en Android. Si se supera el límite, se descarta toda esa copia temporal y se informa en los detalles técnicos; nunca se ofrece como si fuese el audio completo. Para grabaciones largas activá **Conservar audio**: podés usar **Transcribir este audio** sobre el archivo guardado, incluso después de volver a abrir la página. No se agregaron nuevos registros de consola con audio o texto.

### Cómo verificar en Firefox y Android

1. Abrí https://ignabidon.github.io/notas-voz/ y recargá para traer el último código. No borres los datos del sitio. En Detalles técnicos debe aparecer «corrección Firefox» al grabar.
2. Elegí Whisper Base y activá Conservar audio. Con internet disponible, grabá 20–30 segundos de una frase ficticia, pausá, reanudá y detené. Comprobá que aparece el texto y desaparece el aviso de transcripción.
3. Descargá y reproducí el audio; luego usá Transcribir este audio. Comprobá que contiene también el final de la frase. En Firefox los detalles deben indicar modo compatible con procesador.
4. Guardá el texto y probá el reintento en memoria: debe completar sin volver a usar el micrófono. Para comprobar recuperación después de una interrupción, iniciá otra transcripción, cancelala y reintentá. Si el modelo ya está en caché, cortar internet puede no causar ningún error.
5. Repetí los pasos en Brave del Motorola, incluyendo cambiar entre Audio / Texto / Anonimizar / Ajustes mientras graba. Anotá versión del navegador, modelo, duración y etapa del error, sin copiar contenido privado. Si falla, copiá los detalles técnicos.

**Estado de validación:** ver CAMBIOS.md. El usuario confirmó después de la publicación que Whisper ya funciona en Firefox. Esto no valida por extensión el dictado del navegador ni las demás funciones; las pruebas del entorno Linux se detallan en CAMBIOS.md.

## Dictado del navegador · solo local (15/11/2026)

Whisper sigue recomendado. «Dictado del navegador» usa SpeechRecognition con `processLocally=true`: **no se habilita dictado remoto automáticamente**. El dictado del teclado Android y el permiso del micrófono son funciones distintas; ninguno demuestra que la web pueda usar un motor local.

Delta mantiene esta opción deshabilitada hasta que el navegador confirme un paquete de español **instalado** mediante `available()`. Consulta es-AR, es-ES y es; prefiere es-AR instalado y, si no está, puede usar otro español instalado. El idioma elegido aparece en Ajustes y al iniciar; usar es-ES puede afectar el reconocimiento del acento argentino. Si falta descargarlo y el navegador admite `install()`, aparece «Preparar dictado local». Solo descarga con confirmación. «Volver a comprobar compatibilidad» permite revisar otra vez sin recargar.

| Navegador | Qué esperar del dictado local de Delta |
| --- | --- |
| Chrome de escritorio con API local | Candidato, sujeto a plataforma, políticas, permisos y paquete español instalado; la consulta de Delta decide. |
| Edge de escritorio con función local habilitada | Candidato; la documentación consultada describe Canary/Dev y paquetes como es-ES. No se garantiza en todas las versiones estables. |
| Firefox de escritorio | Solo si esa versión expone API local y confirma español instalado. Firefox 153/Linux de prueba no ofrece la API; los datos de compatibilidad sitúan soporte más reciente desde 160. Whisper es una opción separada. |
| Brave Android | No se confirma dictado local en español. Brave documenta una implementación inicial en inglés; la existencia de la API por sí sola no basta. Si no verifica español, Delta lo deshabilita. |
| Chrome/Firefox Android, Safari | La documentación consultada no declara soporte para el modo local requerido. Delta informa el motivo y mantiene Whisper. Que otro sitio ofrezca reconocimiento remoto no implica compatibilidad local. |

Fuentes consultadas el 15/11/2026: [compatibilidad de SpeechRecognition](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json), [dictado local en Edge](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/speech-recognition-api), [implementación local de Brave](https://github.com/brave/brave-browser/issues/56487). La detección del dispositivo prevalece sobre esta tabla; no se garantiza compatibilidad universal.

### Prueba desde el celular

1. Recargá https://ignabidon.github.io/notas-voz/ sin borrar los datos del sitio. Abrí **Ajustes → Otras opciones → Cómo transcribir**. Ahora dice «Dictado del navegador · solo local».
2. Si está deshabilitado, leé el motivo y el código entre corchetes. Abrí **Diagnóstico del dictado del navegador** para ver API, paquetes consultados y errores. En ese caso usá Whisper; conceder micrófono no agrega una API o idioma que el navegador no tiene.
3. Si ofrece Preparar, aceptá la descarga solo si querés probarlo. La opción se habilita únicamente después de verificar el paquete instalado. Si el navegador informa downloading, esperá y volvé a comprobar; Delta no promete que la descarga avance.
4. Si está disponible, seleccionalo, volvé a Audio y tocá el botón. Permití el micrófono del sitio y de Brave en Android si se solicitan. Debe aparecer «Escuchando» solo después del evento de inicio. No se borra el editor anterior antes de esa confirmación.
5. Decí una frase ficticia. En **Texto**, el provisional aparece debajo del editor; las frases confirmadas se agregan al editor. El navegador puede no emitir provisionales, aunque Delta los solicite.
6. Probá Pausar/Reanudar y Detener. El cierre espera resultados finales hasta 8 segundos y no reinicia en bucle. Si el navegador termina por su cuenta, hay que volver a tocar Grabar; ante cierre inmediato vuelve a exigir comprobar compatibilidad.
7. Ante un error, conservá el código (por ejemplo `not-allowed`, `service-not-allowed`, `language-not-supported`, `audio-capture`, `no-speech`, `network`, o el nombre de la excepción). El diagnóstico no incluye transcripción ni audio. El inicio tiene un plazo de 20 segundos, consultas de disponibilidad 8 segundos y descarga solicitada 5 minutos; el navegador puede continuar descargando después de un plazo agotado.

**Verificación:** pruebas automáticas y de interfaz con API simulada; bloqueo real de API ausente en Firefox 153/Linux. No se probó dictado real con voz en Brave/Android, Chrome, Edge o Firefox 160. No se puede confirmar la causa exacta de tu cierre en el Motorola sin su código de error; se corrigieron falsos positivos de disponibilidad, idioma y manejo de sesiones encontrados en el código.

## Texto mientras grabás (15/11/2026)

**Whisper entrega frases por fragmentos, no palabra por palabra.** Delta ya procesa partes mientras sigue grabando. El segmentador conserva bloques de audio hasta un corte por pausa tras unos 20 s acumulados, un límite cercano a 29 s, o una acción manual (Pausar/Marcar/Detener). Comprime silencios: esas cifras no son un plazo máximo de espera del reloj. A eso se suman preparación del modelo y tiempo de procesamiento; en una grabación corta el primer texto puede aparecer después de detener. No se cambian modelo, cortes, parámetros de inferencia ni correcciones para adelantar texto.

En Texto, el campo vacío ahora dice **«Grabando audio… Whisper mostrará el texto por fragmentos; en grabaciones cortas, después de detener»**. Una explicación breve aclara el mecanismo. Son indicaciones de interfaz: no se guardan ni exportan dentro de la nota. Al recibir resultados, se agregan como antes y se conserva el texto previo/las correcciones. Tras detener, el campo y el aviso inferior aclaran que falta procesar audio. Los errores y cancelaciones mantienen su estado y las opciones de recuperación.

El aviso inferior único sigue visible incluso si Whisper está preparado pero todavía está reuniendo el primer fragmento. Indica **«Grabación en curso · Whisper por partes»** o pausa; no promete transcripción «en vivo». Cuando no hay partes por procesar, no muestra una barra de inferencia activa ni un spinner girando. El cronómetro y Pausar/Detener siguen siendo los controles de captura. No hay un segundo motor, ni nuevos temporizadores, ni un procesamiento adicional del audio.

El dictado local del navegador mantiene sus provisionales separados del editor y agrega solo resultados finales, cuando el navegador admite esa función. Sigue deshabilitado si el dispositivo no verifica español local; esta mejora no intenta habilitarlo en el celular del usuario.

### Alternativas evaluadas y recursos

| Alternativa | Alcance y consecuencias |
| --- | --- |
| Mantener fragmentos + explicar espera (**implementado**) | Misma cantidad de trabajo de Whisper y mismo mecanismo de calidad. Cambios de texto/estado visual sobre ciclos ya existentes; no se midió consumo de batería. |
| Emitir tokens de Whisper durante la decodificación | Transformers.js ofrece WhisperTextStreamer. Exigiría ampliar mensajes del Worker y separar/reconciliar un borrador provisional. No evita esperar a que se reúna el fragmento ni prepara antes el modelo. No requiere necesariamente repetir inferencia, pero agrega eventos/actualizaciones y complejidad ante reintentos/cancelaciones. No implementado. |
| Ventanas más cortas o solapadas, recalculadas continuamente | Puede adelantar borradores, con más procesamiento si se repite audio, consumo y calor potenciales; exige deduplicar/revisar texto. Acortar el contexto puede afectar precisión. Son riesgos de diseño, no mediciones en el Motorola. No implementado. |
| Provisionales de SpeechRecognition | API pensada para resultados intermedios, pero depende del navegador y su motor/idioma local. No reemplaza a Whisper en dispositivos sin soporte. |

Referencias: [WhisperTextStreamer en Transformers.js 3.8.1](https://huggingface.co/docs/transformers.js/v3.8.1/api/generation/streamers), [interimResults del navegador](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults). Ninguna alternativa permite prometer latencia de palabra por palabra en todos los teléfonos.

### Cómo probar

1. Recargá Delta sin borrar datos. Con Whisper y contenido ficticio, empezá a grabar y abrí Texto inmediatamente: el campo puede seguir vacío, pero debe explicar la espera; abajo debe verse «Grabación en curso · Whisper por partes» aunque aún no haya un fragmento preparado.
2. Grabá 5–10 s y detené. Debe indicar procesamiento y luego mostrar la frase, conservando las advertencias reales si aparecen. El tiempo depende del modelo/dispositivo; no se promete una demora fija.
3. Probá 45–60 s de habla ficticia continua. Si el dispositivo alcanza a procesar cada parte, aparecerán bloques antes de detener; si procesa más lento, pueden llegar después. Las partes nuevas se suman sin reemplazar las anteriores. No se usa otro modelo para una vista previa.
4. Probá Pausar/Reanudar y cambiá entre Audio/Texto/Anonimizar/Ajustes. El mensaje debe seguir el estado; solo aparece barra de procesamiento si hay trabajo pendiente o preparación del modelo. No deben entrar palabras como «Grabando audio» en la nota ni en el TXT.
5. En un navegador que admita dictado local, comprobá provisionales bajo el editor y frases finales sin duplicados. No insistir en esa vía si la opción permanece deshabilitada.

Pruebas automáticas e interfaz en Firefox/Linux con estados simulados satisfactorias. Posteriormente el usuario informó que probó esa nueva versión, sin detallar dispositivo ni cada caso. Esa confirmación no valida por extensión el ajuste ergonómico posterior ni mide batería.

## Lectura y uso con una mano (15/11/2026)

Se conservan Audio / Texto / Anonimizar / Ajustes, los colores oscuros y los mismos comandos de grabación y edición. En **Ajustes → Lectura y comodidad → Tamaño del texto** elegí:

| Tamaño | Transcripción aproximada | Uso |
| --- | --- | --- |
| Compacto | 16,2 px | Más contenido, sin reducir el editor por debajo de 16 px. |
| Normal (predeterminado) | 18 px | Mantiene el tamaño previo del editor y mejora rótulos pequeños. |
| Grande | 21,6 px | Aumenta también menús, ayudas y controles, con espacio para que los rótulos ocupen más de una línea. |

El ajuste se aplica inmediatamente y se guarda en la configuración existente del navegador. No cambia el contenido, el tamaño de letra de TXT/Word ni el zoom del navegador. Si no se permite guardar ajustes se informa; el tamaño elegido sigue aplicado durante la sesión. No se deshabilitó el zoom por gestos.

**Controles al alcance:** Grabar ahora está también en la barra inferior de Texto, junto a Guardar nota .txt. Usa el mismo comando: si tenés «Empezar de cero al grabar» activado se aplica igual que antes; desactivalo si querés agregar a la nota. Durante la captura la barra mantiene Pausar/Reanudar y Detener, aunque cambies de pantalla o desplaces una nota larga. No se agregó otro grabador.

La barra de Corregir selección / Copiar / Seleccionar todo / Compartir queda visible al desplazar la página dentro de Texto cuando hay suficiente espacio vertical. Se aumentan áreas táctiles principales a 48 px como mínimo y separaciones a 10–12 px. Los rótulos pueden ocupar dos líneas antes que quedar recortados.

**Espacio y teclado:** el margen inferior se calcula con la altura real de la barra, incluido texto grande y avisos de Whisper. Así se puede desplazar el final del contenido por encima de los controles. En pantallas táctiles pequeñas, si el navegador informa una reducción compatible con teclado abierto, la barra se compacta y se ubica sobre el teclado: conserva acciones, navegación con rótulos, estado principal y cancelación si corresponde. Solo se omiten iconos/texto secundario del aviso durante esa situación. Los errores y los controles no se ocultan. Para dejar espacio a la escritura, las herramientas superiores dejan de ser flotantes con teclado o en horizontal de poca altura; siguen en su ubicación normal y se conserva la corrección contextual. El cuadro de corrección se limita al área visible y puede desplazarse por dentro.

Se usa VisualViewport cuando está disponible y el navegador puede aceptar `interactive-widget=resizes-content`; si no, se conserva el comportamiento nativo y se aprovechan eventos de tamaño de ventana. No hay una API universal que confirme la presencia del teclado: la detección usa foco editable, reducción de altura y escala, evita confundir zoom por gestos y puede variar con pantalla dividida, teclados flotantes o versiones del navegador. Referencias: [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport), [viewport e interactive-widget](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport).

### Evaluación desde el celular

1. Recargá Delta sin borrar datos. Probá Normal y Grande en Ajustes; volvé a Texto y confirmá legibilidad. Recargá otra vez y comprobá que se conserva la elección.
2. Con una nota ficticia larga, desplazá tanto la página como el interior del editor. Comprobá que podés llegar al final y que Grabar, Anonimizar y Guardar nota .txt siguen accesibles abajo. Probá Copiar, Seleccionar todo y Corregir selección; no uses datos privados.
3. Grabá una frase ficticia desde Audio o desde Texto. Cambiá de vista y desplazá la página: Pausar/Reanudar y Detener deben seguir visibles y responder. Revisá antes la opción Empezar de cero si querés conservar el texto actual.
4. Abrí el teclado tocando la transcripción. Revisá que se vean lo que escribís y los controles; corregí una palabra en el cuadro de corrección. Cerrá el teclado con el botón Atrás de Android y comprobá que se restaura la barra completa sin saltos ni pérdida de texto.
5. Repetí en horizontal y con letra Grande. En computadora comprobá teclado físico, selección con mouse y navegación por Tab. Si hay un solapamiento, informá navegador, orientación, tamaño de letra y si el teclado estaba abierto; evitá capturas con notas reales.

**Verificación disponible:** 79 pruebas Node; interfaz Firefox 153/Linux a 320/360/412/760/1365 px, tres tamaños, persistencia, notas largas, corrección y controles con captura simulada; horizontal 915×412. Teclado simulado en dos modos de redimensionado. No se probó el teclado físico/virtual real del Motorola ni se hizo una nueva grabación física con esta revisión.

## Organización

| Ruta | Para qué sirve |
| --- | --- |
| `index.html` | **Única aplicación web oficial.** Modificarla para mejorar Delta. |
| `README.md` | Esta guía para el usuario. |
| `AGENTS.md` | Reglas comunes para ChatGPT, Claude y otras IA. |
| `CLAUDE.md` | Indicaciones para Claude y referencia a AGENTS.md. |
| `CAMBIOS.md` | Historial de cambios y problemas pendientes. |
| `DISENO-CIFRADO.md` | Cómo funciona la protección cifrada, sus límites y el plan para Android. |
| `tests/cifrado-browser.mjs` | Prueba de la protección cifrada en Chrome con huella simulada. |
| `tests/delta.test.mjs` | Pruebas automáticas básicas sin dependencias. |
| `.github/workflows/verificar-delta.yml` | Ejecuta pruebas en GitHub Actions. |

## Versiones anteriores

Los prototipos web (`gamma-studio`, `gamma-profesional`, `gamma`, `prueba` y la web original), el experimento Android Alfa y su workflow se retiraron de **main**, pero se conservaron en la rama de archivo: [archivo-antes-de-delta-2026-11-15](https://github.com/ignabidon/notas-voz/tree/archivo-antes-de-delta-2026-11-15). También siguen en el historial de Git.

La URL del repositorio permanece como **ignabidon/notas-voz** para no cambiar los enlaces. El nombre visible de la app es **DictaNota**.

## Guardar y descargar

**Conservar audio** mantiene la grabación en este navegador, sin cifrar ni anonimizar. El interruptor está arriba a la derecha en Audio, con Sí/No, sincronizado con Ajustes → Audio. Elegilo antes de grabar: queda bloqueado durante la captura y el procesamiento. Durante la captura, la barra fija muestra la preferencia elegida. Se conserva un audio principal y una sola copia anterior recuperable.

**Descargar audio** solicita un archivo en el dispositivo. No borra la copia del navegador. En Audio → Tus audios guardados también podés convertir a MP3, retranscribir, recuperar el anterior o borrar. Un archivo importado solo se transcribe: nunca se guarda; máximo 200 MB y 15 minutos inclusive.

**Guardar nota .txt** conserva una copia local y solicita descargar título y texto. El borrador también se guarda automáticamente. La web no puede confirmar que el archivo terminó de guardarse: abrilo desde Descargas para verificarlo. El TXT no incluye audio, diccionario ni ajustes. Word y descarga TXT están en Texto → Guardar, organizar y exportar la nota.

**Compartir** usa el menú del dispositivo; si no está disponible intenta copiar, y como última alternativa selecciona el texto. Conserva las advertencias de transcripción incompleta y revisión de datos personales.

## Interfaz y ayudas

Cuatro pantallas: **Audio / Texto / Anonimizar / Ajustes**. Cambiar de pantalla no corta la grabación. En Texto están Corregir selección, Copiar, Seleccionar todo y Compartir; abajo, Grabar y Guardar nota .txt. Anonimizar tiene pantalla propia con vista previa, deshacer y Personas y códigos. Revisá siempre el resultado: puede fallar.

La barra fija muestra **Grabando** con punto amarillo suave, o **En pausa** con punto fijo. Al detener desaparece el indicador de captura; Whisper puede seguir procesando. Con movimiento reducido el punto no parpadea. Los puntos verdes de Audio/Texto indican contenido nuevo y se apagan al entrar a su pantalla.

Los botones **ⓘ** abren la explicación debajo de la opción; otro toque la cierra. Funcionan también con Tab y Enter/Espacio. Nombres, valores, errores, progreso, límites de importación y advertencias de pérdida permanecen visibles. En Ajustes → Lectura y comodidad podés elegir tamaño Compacto, Normal o Grande.

El espacio inferior se mide según la altura real de la barra. Con teclado detectado, las herramientas dejan de ser fijas y el editor reduce su altura para poder desplazar el último renglón. La detección depende de foco y geometría: requiere validación en cada navegador/dispositivo.

## Validación y continuidad

- **Código:** consultar el commit actual de main y el historial de PR; el detalle de cada cambio está en CAMBIOS.md.
- **Pruebas técnicas:** `node --test tests/delta.test.mjs` (99 pruebas). GitHub Actions también ejecuta `node tests/browser.mjs` usando Chrome instalado y CDP nativo, sin dependencias nuevas. Revisa 320/360/412/760/1365 px, letra normal/grande, ayudas, sincronización, bloqueo, captura/pausa/fin, movimiento reducido y teclado simulado. No transcribe voz real en esa prueba.
- **Motorola G56 5G:** las mejoras de claridad visual necesitan prueba física; la revisión visual/de código previa no demuestra funcionamiento real del teléfono. Hay confirmaciones anteriores parciales de grabar/transcribir, descargar TXT y recuperar audio; no se extrapolan a nuevas funciones. CSP y huella MP3 siguen pendientes en el Motorola; consultar SEGURIDAD.md.

Con datos ficticios: elegir Conservar audio → grabar → pausar → reanudar → recorrer las cuatro pantallas → detener → esperar transcripción → editar el último renglón con teclado abierto → anonimizar y revisar → guardar TXT → descargar y reproducir audio. Repetir con letra Grande. No borrar los datos del sitio para actualizar: recargá la página.
