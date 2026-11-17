# DictaNota — Guía del propietario

**Para qué sirve:** consultar cómo usar DictaNota y cómo seguir su desarrollo sin tener que leer código. Está escrita para su propietario, no para las IA que programan.

**Revisada y actualizada con una prueba del propietario:** 16 de noviembre de 2026, contra la rama `main` de `ignabidon/notas-voz` (commit `aab2b903`). **Es una fotografía de esa versión:** si se une un PR, algunas funciones pueden cambiar. Lo que está en un PR abierto **no** debe tratarse como publicado.

> **Importante:** DictaNota sigue siendo experimental, especialmente para información sensible. Hacé las pruebas con nombres y situaciones inventadas. No cargues datos reales de pacientes hasta completar las revisiones de seguridad, copias de respaldo y pruebas en tu Motorola.

## 1. Dónde abrir la aplicación

- **Sitio oficial:** https://ignabidon.github.io/notas-voz/
- **Repositorio:** https://github.com/ignabidon/notas-voz
- **Versión que se publica:** la rama `main`. Las ramas de trabajo y los PR abiertos no cambian por sí solos el sitio oficial.
- **Dispositivo previsto:** Motorola G56 5G, principalmente en Brave. Algunas funciones también se usan desde Firefox o Chrome en computadora.

Para tener un acceso desde la pantalla principal del celular, abrí la dirección en Brave y buscá en el menú del navegador **Agregar a pantalla principal** o **Instalar aplicación** (el nombre puede variar). Es un acceso a la web; **todavía no es una aplicación Android independiente**.

## 2. Tres ideas para entenderla

- **Nota:** un texto que escribiste o que se transcribió de una grabación.
- **Cuaderno:** un conjunto de notas. Se puede renombrar y cada nota muestra la fecha y hora en que se guardó.
- **Audio:** la grabación original de voz. No es lo mismo que la transcripción, y **no se conserva automáticamente** si no elegís hacerlo.

Las cuatro pantallas visibles son **Dictar**, **Cuadernos**, **Anonimizar** y **Ajustes**. DictaNota no envía los cuadernos a un chat ni los sincroniza automáticamente entre dispositivos.

**Novedad del 16/11/2026:** el propietario probó el flujo básico en el Motorola. Los resultados y las mejoras pendientes están en [Devolución de uso real](docs/FEEDBACK-MOTOROLA-2026-11-16.md).

## 3. Hacer una grabación y guardarla como nota

1. Abrí **Dictar**. Si querés conservar la voz, activá **Conservar audio** **antes** de comenzar. Si solo necesitás el texto, podés dejarlo apagado.
2. Tocá **Grabar** y permití el uso del micrófono si Brave lo solicita.
3. Podés tocar **Pausar** y después **Reanudar**. Los controles de la grabación se mantienen en una barra inferior al navegar.
4. Tocá **Detener grabación**. Esperá a que Whisper complete las partes pendientes: el texto puede tardar más que la propia grabación.
5. Revisá la transcripción en **Cuadernos**; corregí nombres, fechas, negaciones, números y cualquier palabra importante.
6. Tocá **Guardar** para incorporar el texto como una nota. **Guardar no descarga automáticamente un archivo:** lo añade a un cuaderno dentro de DictaNota.

**Comprobación del propietario (16/11):** informó que completó este flujo y vio la nota guardada en el chat. La transcripción mostró una forma peninsular («si queréis») donde dictó voseo («si querés»). Falta comprobar la fidelidad completa de la transcripción, la persistencia tras recargar y controles individuales no detallados.

**Atención:** mantené la pantalla encendida y evitá pasar a otra aplicación mientras grabás. Todavía no está garantizada una grabación larga con la pantalla apagada.

### ¿Qué modelo de transcripción elegir?

En **Ajustes → Modelo de Whisper** están **Tiny** (más liviano), **Base** (equilibrado) y **Small** (más preciso, pero más lento y exigente). Para probar rendimiento en el Motorola, conviene empezar por Base y comparar con Small usando un audio inventado similar. La primera carga de un modelo puede necesitar internet y demorar por la descarga. La transcripción con Whisper se procesa localmente; la descarga de librerías y modelos sí requiere conexiones externas.

**Dictado del navegador** es una alternativa experimental y depende del soporte local en español que ofrezca el navegador. Si no está disponible, usá Whisper. No es lo mismo que el micrófono del teclado Android.

## 4. Escribir y organizar notas sin grabar

- Desde **Dictar**, tocá **Escribir una nota**. También podés ir a **Cuadernos → + Nueva nota**.
- Escribí en el editor y tocá **Guardar**. Una nota nueva puede crear un cuaderno independiente. Si abrís un cuaderno existente y escribís o grabás desde allí, la nota se agrega a ese cuaderno.
- En **Cuadernos** podés abrir un cuaderno y usar **Opciones de este cuaderno** para **Renombrar**, **Copiar todo**, **Pasar todo a otro cuaderno** y **Descargar .txt**.
- Las notas ya guardadas tienen acciones propias, como copiar, editar, mover o borrar. Algunas operaciones ofrecen **Deshacer**.
- **Descartar** sirve para abandonar un texto sin guardar y pide confirmación. DictaNota también intenta recuperar borradores si se cierra accidentalmente; **no dependas de ello como única copia**.

Si algo es importante, comprobá que aparece dentro del cuaderno antes de cerrar el navegador.

**Mejora pedida y aún no implementada:** desde la parte superior de **Dictar**, elegir **cuaderno nuevo con nombre editable** o **cuaderno existente** antes de grabar, manteniendo la opción de crear uno nuevo por defecto. No confundir título del cuaderno con título de cada nota.

**Problema confirmado en la prueba del 16/11:** el cuadro de edición resulta demasiado bajo tanto para revisar una transcripción nueva como para editar una burbuja guardada. Antes de implementar cambios, coordinar el **editor ampliado/pantalla completa al editar** con el rediseño de B1/B3 y el PR #48. La barra compacta puede seguir usándose cuando el editor está vacío.

## 5. Corregir una transcripción

1. Seleccioná una palabra o frase incorrecta en la nota.
2. Buscá **Herramientas de la nota → Corregir selección**, o la opción contextual **Corregir palabra** cuando aparezca.
3. Escribí la corrección y revisá la oración completa.
4. DictaNota puede aprender automáticamente determinadas correcciones de palabras parecidas; podés revisar o desactivar esa opción en **Ajustes → Diccionario**.

**Todavía no está implementado como función publicada** el resaltado rojo suave automático de palabras dudosas que se propuso para futuras mejoras. La revisión humana de la transcripción sigue siendo necesaria.

**Voseo argentino:** el propietario observó una transcripción de «si querés» como «si queréis». Whisper usa `language: 'spanish'` y `task: 'transcribe'`; **no está traduciendo a español peninsular por una opción explícita**. Está pendiente investigar cómo preservar fielmente el dialecto de origen sin inventar palabras ni forzar sustituciones.

## 6. Anonimizar antes de compartir

La pantalla **Anonimizar** busca reemplazar posibles datos identificatorios, como nombres, teléfonos, correos o fechas, por etiquetas o códigos. **Personas y códigos** permite definir relaciones y nombres de reemplazo. Usá **Anonimizar transcripción**, leé el resultado y comprobá si quedaron datos identificatorios; **Deshacer anonimizado** permite revertir el cambio en el flujo actual.

**Límite importante:** la detección automática puede equivocarse. **Todavía no está disponible en `main` la conservación permanente del original sin anonimizar junto a la versión anonimizada de cada nota/cuaderno.** Si necesitás conservar ambas versiones, no supongas que vas a poder recuperar el original después de cerrar o guardar: guardá una copia separada, teniendo en cuenta sus riesgos de privacidad.

## 7. Qué pasa con los audios

En **Dictar → Mis grabaciones** están las opciones para los audios conservados: **Descargar audio**, **Convertir a MP3**, **Transcribir este audio**, **Borrar audio** y, si corresponde, **Recuperar audio anterior**.

- El audio original puede contener información sensible **aunque el texto se haya anonimizado**.
- En la versión publicada revisada, los audios guardados **todavía no están cifrados ni asociados de manera nueva a cada nota**. Eso está en desarrollo en el **PR #47 (E2)** y no debe darse por disponible hasta su unión y comprobación.
- **Cargar un audio para transcribir** permite elegir un archivo del teléfono. En esta versión, **no lo incorpora automáticamente a las grabaciones guardadas**. La pantalla indica un límite de 200 MB y 15 minutos; una versión futura puede cambiar ese límite.
- Si querés conservar una grabación importante, verificá que la opción estaba activada y descargá una copia; reproducí el archivo para comprobarlo.

**Prueba real del 16/11:** el propietario confirmó que pudo descargar un archivo de audio de **168 KB**. Queda pendiente confirmar su reproducción y duración completas, además de retranscripción o conversión a MP3; la descarga por sí sola no acredita esas operaciones.

## 8. Privacidad y protección

En **Ajustes → Protección con contraseña y huella** podés activar la protección de los textos guardados, borradores, deshacer, personas y diccionario.

1. Elegí una contraseña de al menos ocho caracteres; es mejor una frase larga.
2. **Anotá el código de recuperación y guardalo fuera del celular.** Se muestra una sola vez. Si perdés contraseña y código, podrías perder el acceso a tus notas.
3. Si el dispositivo y Brave lo admiten, probá **Activar huella**. La huella real **todavía requiere validación en el Motorola G56 5G**: no dependas de ella sin haber comprobado también la contraseña.
4. Podés usar **Bloquear ahora**. Existe un bloqueo automático tras 15 minutos sin uso, con excepciones mientras se graba o transcribe.

La protección **no equivale a una copia de seguridad**. Tampoco cifra los textos que descargues, copies o compartas; en esta versión **los audios siguen sin cifrar**. No protege una sesión abierta, capturas de pantalla o archivos guardados fuera de la aplicación.

**Nunca pegues contraseñas, códigos de recuperación o datos de pacientes en chats, capturas, PR ni informes de errores.**

## 9. Cómo evitar perder información

Las notas y los borradores se guardan en el **almacenamiento de ese navegador**. Eso implica lo siguiente:

- **No borres los datos del sitio** de DictaNota en Brave: podrías perder las notas. No uses el modo privado como lugar permanente para guardarlas.
- No supongas que las notas de Brave aparecen automáticamente en Chrome, Firefox o una futura app Android.
- Desde cada cuaderno podés descargar un **.txt** de su contenido; los audios que conservaste deben descargarse **por separado**. Esos archivos no están cifrados por DictaNota: guardalos en un lugar apropiadamente protegido.
- **Todavía no está publicada una copia de seguridad integral cifrada** que permita exportar todo y restaurarlo de manera comprobada. Está prevista en el plan K1/K2. Descargar un TXT **no** es una copia completa de la aplicación.
- Antes de cambiar de navegador, limpiar el celular, borrar datos, activar migraciones o usar notas sensibles, conviene verificar personalmente qué copias existen y se pueden abrir.

## 10. Si algo falla

| Situación | Qué probar |
| --- | --- |
| No empieza a grabar | Revisá el permiso del micrófono en Brave y volvé a intentar con datos inventados. |
| La transcripción tarda demasiado | Comprobá si aún procesa partes; para la próxima prueba elegí Base o Tiny. |
| La transcripción sale incompleta | Si existe un audio completo guardado, usá **Transcribir este audio**. Reintentarlo puede reemplazar el texto en edición: guardá antes tus correcciones. |
| No aparece una nota | Mirá el cuaderno correcto, comprobá si hay un borrador pendiente y no borres los datos del sitio. |
| Compartir no abre el menú | Usá **Copiar** y pegá el texto en la aplicación de destino, verificando su contenido. |
| La huella no funciona | Intentá desbloquear con tu contraseña; no quites los datos del navegador. |
| Hay un error difícil de explicar | Abrí **Dictar → Detalles técnicos de la última grabación** y compartí el mensaje o una captura **sin datos personales**. |

Para hacer una prueba ordenada de DictaNota con información ficticia, usá [la lista de pruebas del Motorola](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md), teniendo presente que algunas referencias antiguas a PR o nombres de pantallas pueden estar desactualizadas.

## 11. Cómo controlar el trabajo de ChatGPT y Claude

No necesitás programar para supervisar el proyecto. Te alcanza con distinguir cuatro estados:

1. **Propuesto:** una IA sugirió un cambio, pero no lo programó.
2. **En PR:** el cambio está en una rama separada, esperando revisión o decisión. **No se ve necesariamente en la app publicada.**
3. **Unido a `main`:** quedó incorporado al código oficial. La publicación puede requerir que terminen las verificaciones de GitHub.
4. **Probado en el Motorola:** vos confirmaste que funciona con el teléfono y navegador reales. **Las pruebas automáticas no reemplazan esta comprobación.**

**Dónde mirar:**

- [PR abiertos o en revisión](https://github.com/ignabidon/notas-voz/pulls)
- [Cambios y archivos de `main`](https://github.com/ignabidon/notas-voz/tree/main)
- [Pruebas automáticas y publicaciones](https://github.com/ignabidon/notas-voz/actions)
- [Registro técnico de cambios](CAMBIOS.md)
- [Continuidad entre IA](CONTINUAR-AQUI.md)
- [Plan de almacenamiento cifrado](docs/PLAN-ALMACENAMIENTO-CIFRADO.md)

**Regla recomendada para delegar tareas:** pedí que la IA lea el estado actualizado de `main` y los PR abiertos, se limite a una tarea, trabaje en su propia rama, pruebe lo que modificó, explique riesgos en lenguaje sencillo y abra un PR. **No autorices unirlo a `main` hasta revisarlo.** Las uniones se hacen con merge normal y sin squash, según las reglas del proyecto. La autoría de las IA se registra en la documentación, no en la pantalla de la app.

### Trabajos pendientes al revisar esta guía

- **PR #47:** cifrado y guardado de audio por nota (E2). **Abierto; no confundir con una función publicada.**
- **PR #48:** ajuste visual **Clínica editorial**. **Abierto como borrador; no publicado.**
- **Más adelante:** copia cifrada integral y restauración; reproductor de audio dentro de la nota; original anonimizado recuperable; mejor composición de notas; resaltado de palabras dudosas; y app Android independiente.

Estos estados pueden cambiar. **La lista de PR y el código de `main` prevalecen sobre cualquier estado histórico escrito en un documento.**

## 12. Lista breve de comprobación personal

Probá con una frase ficticia, por ejemplo: «Hoy hablé con Ana Ejemplo sobre una reunión el martes».

- [x] El propietario accedió a **Dictar** y recorrió el flujo general de grabación/transcripción (16/11). No se verificó cada control por separado ni la fidelidad completa.
- [ ] Puedo grabar, pausar, reanudar, detener y obtener una transcripción **completa y fiel**, comprobando cada control en una prueba detallada.
- [ ] Puedo corregir una palabra, guardar la nota y volver a encontrarla en un cuaderno.
- [ ] Puedo descargar un TXT y comprobar que se abre bien.
- [x] Descargué un archivo de audio de **168 KB** (16/11).
- [ ] Puedo reproducir el archivo y comprobar que contiene el audio completo.
- [ ] Puedo anonimizar una nota ficticia y revisar manualmente el resultado.
- [ ] Si activé protección, puedo desbloquear con contraseña; huella solo si pasa la prueba real.
- [ ] Distingo lo publicado de las novedades que todavía están en PR.

**Si falla algo:** anotá el paso, el mensaje que apareció, la versión del navegador y, si corresponde, el modelo Whisper utilizado. No incluyas información privada.

---

**Documentos complementarios:** [README](README.md) para descripción general, [Seguridad](SEGURIDAD.md) para riesgos y límites, [Prueba en el Motorola](docs/PRUEBA-MOTOROLA-Y-PENDIENTES-USUARIO-2026-11-16.md) para una comprobación más extensa, y [Feedback del Motorola](docs/FEEDBACK-MOTOROLA-2026-11-16.md) para ver qué quedó probado y qué cambios se piden. Esta guía se debe actualizar cuando se incorporen cambios de funcionamiento o seguridad.
