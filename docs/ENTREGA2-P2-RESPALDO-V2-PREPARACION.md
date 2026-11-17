# DictaVoz — preparación P2 y respaldo formato 2 (17/11/2026)

**Estado:** implementación de laboratorio, NO activada en la interfaz, NO fusionada. Base: cabeza del PR #59 (`0c26da0`); PR dependiente de #59. Responsable: ChatGPT.

## Autorización y límites

El propietario aprobó continuar con la biblioteca unificada y el nuevo formato de respaldo; **no realizará pruebas físicas en Motorola**. Esto no equivale a verificar Android. Se mantienen las pruebas automáticas Node/Chrome con archivos inventados.

No se aprobó ni ejecutó **K2 (restauración que reemplaza datos)**, **T**, **AO**, ningún borrado o migración de la base histórica, ni cambios a `notasvoz.boveda.v1`, a AES-GCM de E2 o al **formato 1 de copia**. Antes de activar almacenamiento de audio sin bóveda como opción cotidiana, debe existir un recorrido restaurable verificado con los datos sintéticos y compatibilidad retrospectiva.

## Lo añadido, sin publicar para usuarios finales

### P2 — almacenamiento de audio en claro en la misma biblioteca

- `anPlainStageFile(db, archivo, duración)`: escribe en la IndexedDB `notasvoz-dictanota-audio` v1, almacenes existentes `meta` y `chunks`. No crea otra base ni cambia su versión, y **ningún botón llama a esta función**.
- Fichas con `mode: "claro"`, `key: null`, `sealed: null`, detalles y hashes SHA-256 por fragmento. Las fichas E2 previas mantienen AES-GCM y `key`/`sealed`; no se reinterpretan como claras por ausencia de una propiedad.
- El estado `escribiendo` aparece antes de escribir; `cerrado` solo después de que lleguen los fragmentos. Un corte deja evidencia de una operación no confirmada; no se borra automáticamente.
- `anPlainHealth` revisa claves, cantidad, secuencia, longitud y SHA-256 de cada fragmento; `anPlainRead` exige integridad antes de devolver el audio. Un hash sin clave no autentica contra manipulación maliciosa conjunta: solo detecta alteraciones o corrupción no acompañadas por actualización del hash.
- No se tocó `notasvoz-gamma-audio`; no se cambió la lógica actual de capturar/importar/reproducir ni el candado de pestañas en modo sin bóveda.
- Límite de archivo de ensayo: 30 MB. Las grabaciones de micrófono y ampliaciones a múltiples partes quedan para conectar después, cuando exista restauración.

### Nuevo archivo de copia (ensayo de formato 2)

Bloque `COPIA2`, funciones `copia2Writer` y `copia2Verify`, **sin modificar las funciones ni constante de formato 1**:

- Conserva la marca `DICTANOTA-COPIA`, extensión `.dictanota`, la cabecera con `pw` y `rec` y la derivación de claves existente.
- El lector nuevo deriva a `copiaVerify` cuando encuentra versión 1; el lector antiguo rechaza versión 2 como `FormatoNuevo` (comportamiento seguro).
- Tipos `R`, `C`, `M`, `A`: registros, configuración y audio AES-GCM de E2; mismos bloques de carga cifrada existentes.
- Tipos nuevos `P` (ficha de audio claro **cifrada dentro del archivo**), `B` (fragmento originalmente en claro, **cifrado en el archivo**), `I` (inventario cifrado). Bloque `F` autentica cantidades y cadena SHA-256 como en la versión anterior.
- Todo bloque `P/B` se abre con AES-GCM y AAD que incluye el identificador y posición del audio; los fragmentos también se comparan contra sus SHA-256. El manifiesto se compara con la secuencia leída, sin aceptar exclusiones en las copias de ensayo.
- El ensayo no incluye todavía una copia de la base heredada `last/previous` ni implementa una restauración. Por lo tanto, **no hay botón «copia completa» respaldando todos los audios**, ni afirmación de restaurabilidad en la interfaz. El formato 2 no se convierte en predeterminado ni se descarga desde la app.

## Pruebas y condiciones para activar

`tests/p2-biblioteca-browser.mjs` y paso nuevo de GitHub Actions verifican sobre perfil limpio de Chrome: archivo sintético de más de un fragmento, lectura íntegra, alteración de un chunk, comparación de fichas, copia AES-GCM formato 2, rechazo de modificación/corte, rechazo seguro del formato nuevo por el lector 1 y copia «solo texto». La prueba abre además un **ejemplo fijo** de formato 2 (`tests/copia-formato-2.dictanota.base64`) con un fragmento sintético y rechaza una contraseña equivocada.

Antes de presentar esta modalidad como terminada faltan: compatibilidad continua del ejemplo fijo `tests/copia-formato-2.dictanota.base64` (bytes originales en base64), pruebas de exportación desde todas las rutas de captura, **K2/restauración a perfil vacío** con inventario y referencias, bloqueo de pestañas sin bóveda, recorridos de Whisper y reconexión de la interfaz; ensayar cuotas/cortes cada fase. La activación debe ser otra entrega, documentando evidencia y sin depender de Motorola.

El estado aprobado por el propietario es **implementación progresiva**, no permiso para borrar datos existentes, eliminar protecciones o desplegar un respaldo que aún no puede restaurarse.
