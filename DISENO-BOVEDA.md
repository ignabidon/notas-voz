# Bóveda opcional de DictaNota — propuesta v1

Fecha: 15/11/2026. Base revisada: `63bc33bd99d75e6b6bf681c6cc23cc6f4bf9e86f`.

**Estado: diseño, sin cifrado implementado ni migración.** El usuario permite avanzar condicionado a mantener fluidez y funcionamiento. Esa condición exige mediciones: no se interpreta como autorización para migrar datos reales o promesa de costo cero. La siguiente etapa será un prototipo aislado con datos ficticios, sin activar almacenamiento protegido en la app publicada.

## 1. Decisión de producto

Una bóveda, una contraseña y protección elegida por nota. Las notas comunes siguen disponibles sin desbloquear. No pedir contraseña para usar Whisper o abrir la aplicación normalmente. La bóveda cerrada no revela títulos, etiquetas, extractos ni fechas de sus notas.

| Acción | Resultado propuesto |
| --- | --- |
| Anonimizar transcripción | Sustituye datos identificatorios, requiere revisión; no cifra. |
| Proteger nota | Lleva el texto y sus copias de trabajo a la bóveda mediante una operación verificable. No anonimiza. |
| Nueva nota protegida | Desbloquea antes de escribir/grabar; el borrador nace protegido. |
| Guardar en bóveda | Guarda cifrado; nunca descarga TXT automáticamente. |
| Bloquear bóveda | Guarda lo pendiente, oculta contenido protegido y descarta referencias a claves y texto. |
| Exportar texto / Compartir / Copiar | Saca contenido sin cifrar, con aviso explícito para notas protegidas. |

Conservar «Anonimizar» como botón independiente. Añadir «Proteger nota» en el mismo grupo Privacidad, sin sobrecargar la barra inferior. Selector visible «Nota común / Nota protegida» antes de grabar y estado textual persistente junto al editor. En la barra inferior, Guardar adapta su rótulo al destino; Grabar, Pausar y Detener mantienen ubicación y tamaño. La lista separa comunes y Bóveda; cerrada solo ofrece Desbloquear.

El modo acompaña a la nota y a su sesión de captura, no a una preferencia global mutable. Nueva nota común debe elegirse expresamente al salir de una protegida; no degradar protección por limpiar el editor, deshacer o cambiar de vista. Una captura protegida nueva no mezcla texto previo común sin resolver antes qué conservar. Cambiar de nota, convertirla o cambiar protección durante grabación/inferencia queda bloqueado hasta finalizar/cancelar y resolver resultados pendientes. Navegar entre las tres pantallas sigue permitido.

## 2. Hallazgos del código actual

- `KEY` conserva notas con título/texto/etiquetas/fecha en localStorage. `DRAFT` conserva también `baseline`; `UNDO` otra copia del editor. `saveDraft()` se ejecuta cada 1,5 s y al ocultar/cerrar la página. Algunos fallos se silencian y el error de lectura inicial puede interpretarse como lista vacía.
- `#save` hace `persist()` y solicita además `download(makeTxt())`. Es obligatorio separar esas rutas para notas protegidas.
- `stash`, abrir nota, borrar, nueva nota, anonimizar/deshacer y correcciones comparten estado. Cifrar solo `notes` dejaría copias expuestas.
- Personas/códigos y diccionario tienen claves globales propias. El audio tiene una base IndexedDB separada, con principal y anterior. No existe asociación fiable uno-a-uno entre nota y audio.
- Las claves históricas gamma se conservan. No cambiar repositorio, URL ni arquitectura de Whisper para introducir la bóveda.

## 3. Alcance de protección

Primera versión: texto, título, etiquetas, fechas, borrador, baseline y deshacer de notas protegidas. Nunca pasar esos objetos por persistencia común, registros, mensajes entre pestañas o índices sin cifrar. La memoria y el DOM contienen texto mientras se usa; no prometer borrado físico verificable de memoria JavaScript.

Personas y diccionario: mantener los comunes existentes sin conversión automática y añadir un ámbito protegido separado. En modo protegido, nuevas asociaciones/correcciones persistentes van exclusivamente al ámbito de bóveda. Se pueden leer reglas comunes, pero se advierte que esos datos ya están fuera de ella. No copiar automáticamente reglas privadas al diccionario común. Si se decide trasladar asociaciones existentes, aplicar migración y verificación propias. La copia cifrada identifica qué ámbitos incluye.

**Audio original fuera de la primera etapa.** Rotular «Texto protegido; audio no incluido», nunca «voz cifrada». Para una nueva grabación protegida, desactivar persistencia de audio solo en esa sesión y explicar que no habrá recuperación de voz tras cerrar. Mantener captura PCM e inferencia habituales y reintento temporal en memoria con su límite vigente. No sobrescribir la preferencia de audio de las notas comunes ni borrar principal/anterior. Descargar audio requiere aviso de salida sin cifrado. Proteger una transcripción anterior no protege ni elimina su posible audio: informar y permitir revisión manual, sin adivinar asociaciones. Cifrado de audio necesitará otra etapa y mediciones específicas.

## 4. Formato criptográfico propuesto

- Web Crypto API en contexto seguro; si no está disponible, deshabilitar protección con motivo técnico. Notas comunes siguen disponibles; nunca guardar una protegida en claro como fallback.
- AES-GCM de 256 bits, etiqueta de autenticación de 128 bits, IV aleatorio de 96 bits por operación con `crypto.getRandomValues`. No reutilizar IV con una clave; incluir también envolturas de claves y reintentos en esta política. Probar colisiones/rechazo y definir límites de uso en el prototipo.
- Clave aleatoria de datos (DEK), envuelta bajo clave derivada de contraseña (KEK). Contraseña nunca persistida ni registrada. PBKDF2-HMAC-SHA256 con sal aleatoria de al menos 16 bytes y 600.000 iteraciones como punto inicial de ensayo; parámetros versionados, límites de validación al importar. No rebajar automáticamente la resistencia para ganar velocidad. Argon2id requiere otra dependencia y revisión, fuera de este alcance nativo.
- Derivar al desbloquear, no por nota ni por autoguardado. Importar claves de uso como no extraíbles cuando sea posible; justificar en el prototipo la exportación transitoria necesaria para envolver DEK. No guardar claves utilizables en local/sessionStorage, IndexedDB, Service Worker o mensajes.
- Base IndexedDB nueva y versionada: cabecera, registros cifrados y estado de migración. IDs aleatorios; AAD vincula versión, ID de bóveda, tipo, ID de registro y revisión para impedir intercambios inadvertidos. Fechas y etiquetas dentro del contenido cifrado. El número/tamaño de registros y parámetros técnicos pueden ser visibles.
- Cambiar contraseña reenvuelve DEK, con verificación antes de sustituir cabecera. No revoca copias antiguas. Si se comprometió una clave, hace falta rotación de datos; no confundir con cambiar contraseña.
- Recuperación opcional mediante clave aleatoria independiente, guardada fuera del navegador: segunda envoltura de DEK. Comprobar que el usuario pudo conservarla y usarla en un ensayo. No usar preguntas personales ni contraseña maestra del desarrollador. Sin contraseña ni recuperación, no se puede recuperar el contenido.

## 5. Persistencia y estados

Separar repositorio común y protegido mediante una interfaz de almacenamiento que recibe un destino explícito. Nunca añadir objetos descifrados al arreglo global `notes` que `persist()` serializa. Referencias de editor incluyen destino + ID + revisión + generación de sesión; borradores y deshacer mantienen ese origen. Un deshacer protegido no puede restaurarse como nota común.

Estados: cerrada, desbloqueando, abierta, guardando, bloqueando y error recuperable. Para cada nota, cola de escrituras serializadas y revisiones; agrupar cambios frecuentes sin perder el último estado. Confirmar «Guardado» y actualizar `lastDraft` únicamente tras commit de IndexedDB. Nunca convertir fallo de autenticación/corrupción en una bóveda vacía. No borrar editor ni cambiar destino cuando falla un guardado. Errores con etapa y código técnico, sin contenido ni claves.

No depender de `pagehide` para completar cifrado asíncrono: autoguardar durante el uso con plazo máximo, y hacer flush al guardar/cambiar nota/bloquear. Medir ventana de cambios pendientes. Un cierre forzado puede perder cambios no confirmados; no prometer lo contrario. Bloqueo manual o por inactividad configurable (propuesta inicial: 5 min, ajustar tras prueba) espera capturas/inferencia/guardados pendientes y muestra por qué sigue abierta. Ocultar la página puede cubrir texto visualmente, pero eso no equivale a destruir claves ni detener micrófono.

En la primera versión permitir un solo escritor protegido por origen mediante Web Locks si está disponible; pestañas adicionales no editan la bóveda. Notificaciones sin contenido mediante BroadcastChannel son auxiliares, no el bloqueo. No inventar un mutex inseguro en localStorage como fallback. Si falta exclusión fiable, deshabilitar operaciones protegidas concurrentes y explicar limitación. Versiones antiguas de la aplicación requieren cierre/recarga antes de migrar: el código viejo no obedece bloqueos nuevos.

## 6. Búsqueda, copias y salidas

Comunes se filtran como hasta ahora. Protegidas se filtran por etiquetas/buscan en memoria después de desbloquear. Descifrar bajo demanda y con concurrencia acotada; no abrir todos los cuerpos de una colección grande al inicio ni persistir índices en claro.

Backup cifrado versionado con cabecera, registros y manifiesto autenticado de IDs/revisiones: detectar registros faltantes o duplicados, validar tipos, tamaños, parámetros y versiones antes de derivar/reservar memoria. La autenticación no evita volver a una copia antigua válida sin un ancla externa. Importar en base temporal, verificar todos los registros y mostrar conteos antes de combinar/reemplazar. No mezclar IDs de otra bóveda ni sobrescribir por coincidencia silenciosa. Restaurar usa la credencial de esa copia; una contraseña nueva no modifica backups antiguos.

Exportación inicial «Copia cifrada de la bóveda» incluye solo ámbito protegido y declara exclusión de notas comunes/audio. Un backup cifrado de todo el contenido textual se diseñará como acción explícita distinta. TXT/Word/copiar/compartir siguen disponibles con aviso en notas protegidas; no existe revocación de archivos que salieron. No se cambia la exportación habitual de notas comunes en esta etapa.

## 7. Trasladar una nota existente

1. Finalizar captura/inferencia; exigir cerrar pestañas antiguas y adquirir exclusión. Inventariar nota y copias de trabajo asociadas, sin registrar contenido. No trasladar toda la colección automáticamente.
2. Crear y verificar backup cifrado recuperable. Crear en staging copia cifrada de nota, borrador y deshacer aplicables; descifrar y comparar contenido exacto. Hasta aquí conservar originales, marcar «Preparando protección», no «Protegida».
3. Registrar estado durable de transferencia con identificadores opacos/revisiones; activar copia verificada. localStorage e IndexedDB no comparten transacción: usar fases reanudables e idempotentes y detectar conflicto, nunca asumir atomicidad entre ambas.
4. Antes de borrar origen, releer y comprobar que no cambió. Retirar solo esa nota de KEY y las copias asociadas en DRAFT/UNDO, preservando comunes ajenas. Si una copia no se puede atribuir con seguridad, pedir revisión y mantener advertencia; no borrarla por semejanza de texto.
5. Verificar ausencia lógica de copias pendientes y confirmar destino. Si se interrumpe/falla limpieza, mostrar «Copia cifrada creada; quedan copias sin cifrar» y reanudar sin pérdida/duplicación silenciosa. No sobrescribir original más nuevo con staging antiguo.

La acción «Proteger» debe explicar y autorizar el retiro de las copias comunes de esa nota después de verificarla; no es limpieza general. No es borrado forense y no elimina Descargas, backups del sistema, audio, reglas o asociaciones previas. La conversión inversa queda fuera del primer prototipo; exportar en claro sigue siendo explícito. Nada de esto se ejecuta con datos reales en esta etapa de diseño.

## 8. Rendimiento y puertas de salida

Hipótesis: cifrar texto cuesta mucho menos que Whisper, pero la derivación de contraseña introduce demora deliberada y hay competencia por CPU/memoria. Web Crypto es asíncrono; serialización, DOM e IndexedDB igualmente pueden afectar interfaz. No prometer cero impacto ni batería inalterada.

Prototipo aislado: comparar versión base y candidata con los mismos textos ficticios de 10 KB, 100 KB y 1 MB; colecciones de 100 y 1.000 notas; audio fijo de 1 y 5 minutos, mismo modelo/backend, caché caliente y al menos 5 repeticiones alternadas. Medir derivación/desbloqueo, cifrado+commit p50/p95, latencia de edición y Detener/Pausar, memoria, tiempo de inferencia, errores/pérdida de muestras y temperatura/batería en sesiones físicas más largas. No registrar texto, audio, contraseña ni claves.

Presupuestos propuestos, no resultados: notas de 100 KB con guardado p95 <=250 ms y edición/controles p95 <=100 ms; desbloqueo objetivo <=2 s con estado visible; regresión mediana de inferencia <=5% tras considerar dispersión térmica y cero pérdida de notas/muestras atribuible al cambio. Si no se cumple, investigar/reducir trabajo antes de activar; no debilitar KDF. Con bóveda sin usar, ninguna derivación/cifrado o descifrado de fondo. No recifrar toda la colección ni derivar al grabar. No lanzar backups/migraciones/cambios de contraseña mientras Whisper trabaja.

Puertas: (A) formato, recuperación y fallos con datos ficticios; (B) almacenamiento mixto, aislamiento de copias y concurrencia; (C) interfaz y regresiones de grabación; (D) Firefox escritorio y Brave/Motorola físicos con mediciones; (E) migración real expresamente habilitada tras backup restaurado. Sin D no se declara satisfecha la condición de fluidez del usuario. Batería exige medición física, no deducción de tiempos desktop.

Pruebas negativas obligatorias: contraseña incorrecta, bytes alterados, registro suprimido/intercambiado/duplicado, copia antigua, archivo enorme o KDF abusivo, cuota agotada, cierre en cada fase, escritura fallida/retrasada, pestaña antigua, deshacer y cambiar entre destinos, bloqueo con trabajo pendiente, exportar desde protegida, búsqueda cerrada, recuperación tras recarga. Verificar todos los almacenes con marcadores ficticios para detectar filtraciones y que errores no sobrescriban datos. Mantener suite de regresión vigente.

## 9. Amenazas y límites

Protege el contenido cifrado en reposo frente a quien obtiene almacenamiento/backups sin las credenciales. Contraseña débil permite ataques fuera de línea. AES-GCM detecta modificación autenticada, no borrado ni recuperación de versiones antiguas válidas. No protege sesión desbloqueada, malware, extensiones privilegiadas, capturas, portapapeles, teclado, XSS ni código de la app/dependencias comprometido. Revisar dependencias externas y puntos de inserción DOM antes de habilitar uso protegido; cifrar no corrige XSS. Compartir origen GitHub Pages implica que otras rutas del mismo origen no son otra frontera de seguridad.

Sin transmisión privada ni servicio externo para cifrado/recuperación. Carga habitual de modelos/librerías es una cuestión separada. La bóveda no sustituye backups, bloqueo del dispositivo ni revisión de anonimización.

## Referencias consultadas

- [MDN: parámetros AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams): IV único, AAD y autenticación.
- [OWASP: Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): KDF y costos; PBKDF2-HMAC-SHA256 de 600.000 iteraciones como referencia, no medición del teléfono.

Validación de esta entrega: diseño contrastado con código vigente; app sin cambios. La suite existente verifica regresión de la base, no este diseño todavía no implementado. Rendimiento, recuperación y seguridad del futuro prototipo pendientes; Motorola no probado en esta entrega.
