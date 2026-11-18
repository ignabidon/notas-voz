# DictaVoz — Entrega 2, implementación incremental de arquitectura B (17/11/2026)

> Responsable de esta entrega: **ChatGPT**. Rama: `feature/entrega2-arquitectura-b-p1-audio-solo-2026-11-17`. Base inspeccionada de `main`: `7171650e43cc4a91934cbd2526195b36a239149d`.
>
> **Estado: PR para revisión, NO arquitectura completa ni publicada.** Autoriza la ejecución el propietario en el encargo «DictaVoz — Entrega 2». El PR #58 (auditoría) sigue abierto y en borrador; se leyó el informe desde su rama `docs/auditoria-almacenamiento-definitivo-2026-11-17`. El PR #52 es diseño de experiencia **no incorporado**. No fusionar este PR automáticamente ni confundir código en rama con código publicado.

## Decisión de arquitectura

El propietario **aprobó la alternativa B**: biblioteca única de audio de cara al futuro, sobre la infraestructura `notasvoz-dictanota-audio` (IndexedDB, `meta`, `chunks`) y sus garantías de cifrado, relación con notas y recuperación. Aprobó también retener audio sin bóveda **con advertencia inequívoca de ausencia de cifrado**; sin embargo, el formato de copia actual no contiene ese audio. **No habilitar ese nuevo recorrido de escritura sin poder respaldarlo y restaurarlo íntegramente.** El diseño aprobado y esta restricción no se contradicen: se implementa por etapas.

## Qué incorpora este PR

### P1 — Confirmación y recuperación de borradores

- En `saveDraft`, la marca `lastDraft` avanza solamente tras verificar la escritura. Con bóveda abierta se espera el volcado de `vault.flush()` y se verifica `vault.saved(DRAFT)`; sin bóveda se comprueba por relectura. Los errores de cuota o de otra pestaña ya no se disimulan como éxito.
- Se serializan las escrituras de borrador para que un snapshot atrasado no sobrescriba uno más nuevo. Si una escritura falla, el borrador queda pendiente de reintento; no se inventa persistencia ni se borra el editor.
- Antes de bloquear o activar protección se espera la preparación del borrador. Al confirmar una nota, la interfaz no afirma que se haya limpiado el borrador anterior si esa limpieza no se pudo verificar.
- Se mantiene el `localStorage` protegido por `vaultStore` según estado existente. **No se realizó T** ni se cambió ninguna clave persistente.

### P4 parcial — Una nota puede contener solo audio

- La acción Guardar admite texto vacío **solo cuando existe un audio por nota**, cerrado y confirmado. Antes de aceptar una nota solo audio se verifica ficha, cantidad de partes, detalles, secuencia, cifrado/integridad de fragmentos con `anAudioHealth`. Un audio dañado o todavía no cerrado se conserva sin declarar éxito.
- El botón se presenta como **«Guardar solo audio»** al tener audio pero no texto; la nota mantiene el `audioId`, `audioParts`, duración conocida y estado de transcripción. No se fabrica ninguna frase para el contenido.
- Una captura de Whisper fallida conserva el borrador parcial y avisa con honestidad sobre la preferencia «Conservar audio». Al cambiar de nota se evita perder de vista un borrador con audio.
- En E3, «Preparar nota» con un audio huérfano **crea un borrador sin confirmar**. El usuario revisa y toca Guardar; no se crea una nota definitiva sin esa confirmación. Se respeta el borrador que ya estuviera abierto.

## Pruebas añadidas

- `tests/entrega2.test.mjs` (integrada al CI): cuota agotada/reintento, validación del volcado cifrado, cola de snapshots, nota solo audio, comprobaciones de invariantes.
- `tests/audio-cifrado-browser.mjs`: recorrido real en Chrome de guardar audio únicamente, pérdida de espacio al guardar la nota, fragmento corrupto que no se confirma.
- `tests/e3-browser.mjs`: una recuperación de huérfano queda como borrador, requiere Guardar y no introduce texto ficticio.
- Se mantienen todas las suites anteriores de Node y Chrome, y la prueba fija `tests/copia-formato-1.dictanota` **sin cambios**.

**Verificación a completar antes de unir:** resultado efectivo del CI de esta rama y revisión cruzada de regresiones en el manejo de audios, bloqueos, notas con texto y cierre abrupto; en su caso, comprobar físicamente el Motorola. La aparición de un PR no equivale a una prueba superada.

## Lo que deliberadamente NO implementa ni declara terminado

1. **P2, biblioteca única de audio para ambos modos:** con bóveda apagada sigue existiendo la ruta histórica `notasvoz-gamma-audio`; el formato de la biblioteca unificada para audios en claro está aún pendiente. No se migra ni borra nada, ni se elimina la ruta heredada. Este PR no altera `AN_DB_VERSION`.
2. **Copia completa de audio sin bóveda:** formato 1 de `.dictanota` permanece sin cambio y **no cubre** esos futuros audios; se mantiene K1 y sus garantías existentes, pero no se comunica que el respaldo sea completo para una modalidad nueva. Se requiere decisión separada sobre un **formato 2** de copia cifrada, con inventario y distinción de audios cifrados/en claro, integridad y compatibilidad del lector de formato 1. Diseño, autorización y pruebas de ida/vuelta antes de habilitar esa modalidad como definitiva. Ni formato 2 ni K2 se implementan aquí.
3. **P5, «Conservar audio» por defecto:** sigue sin cambiarse el valor inicial en este PR; se respetan sin alteración las configuraciones anteriores. Activar el valor para instalaciones nuevas debe acompañar un aviso de privacidad, especialmente si la bóveda está apagada, y una ruta respaldable.
4. **Reintentar Whisper desde un audio por nota cifrado:** todavía no hay recorrido completo sobre un audio ya confirmado que conserve ediciones y `savedAt`. Este PR prepara el guardado de audio sin texto, no la transcripción diferida total.
5. **Bloqueo de una sola pestaña con bóveda apagada:** el candado vigente protege las operaciones cifradas y de audio; falta aplicar un bloqueo verificable a las escrituras de texto en modo sin bóveda.
6. **K2, T y AO:** expresamente excluidos. No se cambian formatos criptográficos, AAD, nombres de claves, bases existentes, copias versionadas ni extensiones.

## Prioridades pendientes de la arquitectura B

- Completar P1 con pruebas de cierre abrupto, lectura tras recarga, estado de sólo lectura y cuotas simuladas, además de revisar el flujo de restablecimiento de borrador tras una nota confirmada.
- Diseñar y ensayar P2 sin publicar: esquema discriminante para datos de audio en claro vs AES-GCM, integridad comprobable en ambos y unificación de grabaciones/importaciones/reproducción/recuperación sin copiar automáticamente la antigua base. No admitir transición de modo que vuelva ilegible un audio.
- Diseñar compatibilidad de formato 2 y obtener permiso específico del propietario **antes de modificarlo**; acordar y ejecutar K2 por entrega propia, con restauración atómica verificable y compatibilidad hacia atrás. Hasta entonces **no publicitar ni desplegar el audio unificado sin bóveda como modalidad completamente respaldada**.
- Completar flujo ante Whisper fallido y recuperación de audio en el propio borrador (reproducir/reintentar/escribir), bloqueo de pestañas en ambos modos y control de preferencia por instalación, preservando la decisión manual de Guardar.
- Validar matriz real de interrupciones, manipulación de fragmentos, borrador atrasado, varios cuadernos, quota, modo con/sin bóveda y copia incompleta. Diferenciar CI, Chrome y prueba física del Motorola.

## Correcciones posteriores a la revisión independiente del PR #59 (17/11/2026)

La revisión cruzada de ChatGPT identificó tres riesgos de borradores. Se corrigieron **en la misma rama y sin fusionar**:

1. **Cierre de pestaña sin bóveda:** `saveDraft()` escribe y relee `localStorage` en el mismo evento, antes de devolver la promesa. Los cambios de texto/título también se guardan directamente al escribir, sin esperar 1,5 segundos. La cola asíncrona queda para cifrar con bóveda abierta; se evita que una versión en espera sobreescriba una posterior. **Límite:** un cierre forzado puede interrumpir un cifrado ya iniciado; ninguna promesa de JavaScript garantiza ejecutarse tras terminar el proceso del navegador.
2. **Bloqueo y activación:** si no se puede confirmar el borrador, `vaultLockNow()` no recarga ni descarta el editor, y la activación de la bóveda tampoco sigue. Se informa el fallo; no se interpreta una promesa resuelta con `false` como éxito. Si el bloqueo automático falla por falta de espacio, se necesita que el usuario resuelva el problema; no puede afirmarse que la app quedó bloqueada.
3. **Borrador ya confirmado:** `restoreDraft()` coteja el contenido y el audio, más el inicio de la grabación/composición (`recordedAt`) o el identificador de la nota editada, contra los mensajes ya guardados. Si el borrador corresponde exactamente a una nota confirmada, no crea un duplicado y reintenta limpiar ese borrador; si el contenido, el audio o el inicio difieren, no lo descarta. Conserva borradores con títulos o etiquetas pendientes.

Pruebas nuevas en `tests/entrega2.test.mjs`: cierre sin bóveda sin esperar microtareas, no sobrescribir con una cola antigua, guardado fallido antes del bloqueo y conciliación de un borrador ya confirmado, incluyendo casos que **no** deben darse por guardados. Las pruebas de laboratorio y la validación real del Motorola se informan por separado.

**Lo que no cambia:** no se incorporaron K2, T, AO, P2 ni formato nuevo de copia; no se migraron, borraron ni recifraron datos existentes; PR sin merge. La completa compatibilidad de copias sigue pendiente de decisión específica del propietario.

## Coordinación

Se mantiene `main` intacto y el PR sin fusionar. No se editan ramas de otras IA ni los documentos abiertos de los PR #58/#52/#49/#37. La autoría se documenta solo aquí y en el PR, nunca en la interfaz. Todo ensayo usa notas inventadas y audio sintético; no hay datos reales de pacientes.

## Segunda revisión cruzada de seguridad del PR #59 (17/11/2026)

- **Autobloqueo si el borrador no llega al disco:** para no dejar el texto expuesto después de los 15 minutos, ahora se coloca una **cobertura de privacidad** que impide interactuar con la interfaz y pide contraseña. No hay recarga: el borrador y las claves permanecen temporalmente en RAM para evitar pérdida irreparable por cuota agotada. **No es un bloqueo criptográfico y no debe presentarse como tal**. Al autenticar, se recupera el mismo editor y se pide liberar espacio y confirmar el guardado. El bloqueo manual sigue negándose a descartar un borrador no confirmado. Se comprueba el recorrido con contraseña incorrecta/correcta en Chrome, además del caso aislado Node.
- **Notas con texto y audio:** antes de enlazar el audio se ejecuta `anAudioHealth` aun si hay texto transcripto. Un fragmento alterado impide confirmar la nota, y tanto texto como audio quedan disponibles para recuperación. Esto agrega lectura/descifrado al guardar una nota que lleva audio, por lo que su costo con grabaciones largas debe medirse.
- **Texto de recuperación de huérfanos:** no invita a reproducir desde el borrador, donde aún no existe reproductor; indica que se puede escuchar desde la nota confirmada.
- **Pendiente para decisión futura:** una protección con garantía de bloqueo criptográfico incluso ante error de cuota exigiría un mecanismo de persistencia alternativo verificable o permitir descartar expresamente lo no guardado; ninguna de esas decisiones se toma aquí. No se declara K2, biblioteca unificada ni respaldo completo.
- **Pruebas añadidas:** casos Node de autobloqueo fallido, Chrome de cobertura visual/autenticación/recuperación y Chrome de guardado de texto con fragmento de audio alterado. Sin prueba en Motorola; no fusionar automáticamente este PR ni tocar los PR #60/#61.
