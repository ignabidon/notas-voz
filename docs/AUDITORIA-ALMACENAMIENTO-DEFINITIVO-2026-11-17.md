# DictaVoz — Entrega 1: auditoría y diseño del almacenamiento definitivo

> **Estado: INFORME DE INVESTIGACIÓN Y PROPUESTA, NO APROBADO PARA IMPLEMENTAR.**
>
> Fecha: **17 de noviembre de 2026**. Autoría del informe: **ChatGPT (auditoría de lectura)**.
> Repositorio: `ignabidon/notas-voz`. Rama auditada: `main`.
> **Commit exacto del código analizado:** `7171650e43cc4a91934cbd2526195b36a239149d`.
>
> La decisión del propietario para esta investigación es que **todos los datos existentes son de prueba y pueden descartarse**, sin que ello autorice borrarlos en esta entrega. **Los datos futuros sí deben protegerse rigurosamente.** Este informe no modifica arquitectura, cifrado, copias, código ni datos. Los cambios aquí descritos requieren autorización y pruebas independientes.
>
> **Lectura recomendada para la próxima IA:** `AGENTS.md`, `SEGURIDAD.md`, `CONTINUAR-AQUI.md`, `docs/PLAN-ALMACENAMIENTO-CIFRADO.md`, `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md`, este documento, el `main` actualizado y los PR abiertos. **El código vigente prevalece sobre descripciones históricas**. No usar este informe como permiso para K2, T, AO o eliminación de datos.

## 1. Alcance, fuentes y límites de verificación

La auditoría fue de **lectura de GitHub**: se consultaron árbol, historial, PR abiertos, documentos, funciones y pruebas de `index.html`. **No se ejecutaron en esta entrega las suites**, no se provocaron errores sobre un navegador, no se manipuló almacenamiento real y no se realizó restauración; se distingue la evidencia del código de los resultados históricos registrados por las otras IA.

Fuentes:

- `AGENTS.md`; `SEGURIDAD.md`; `CONTINUAR-AQUI.md`; `CAMBIOS.md`; `README.md`; `DISENO-CIFRADO.md`.
- `docs/PLAN-ALMACENAMIENTO-CIFRADO.md` y `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md`.
- PR [#52](https://github.com/ignabidon/notas-voz/pull/52), en borrador, y sus documentos `docs/VISION-EXPERIENCIA-DICTAVOZ.md` y `docs/PROPUESTA-ESTETICA-2026-11-16.md`, leídos desde la cabeza de ese PR (`6b1e033dd07d69faa3d53016fb29df8fbde4a7b8`), **no desde main**.
- Código: `index.html`, y pruebas `tests/delta.test.mjs`, `tests/audio-nota-browser.mjs`, `tests/audio-cifrado-browser.mjs`, `tests/e2-correcciones-browser.mjs`, `tests/e2-revision2-browser.mjs`, `tests/e3-browser.mjs`, `tests/copia-browser.mjs`, `tests/cifrado-browser.mjs`.
- CI de `main` del commit auditado: [ejecución exitosa](https://github.com/ignabidon/notas-voz/actions/runs/44086051985); CI verde **no demuestra por sí solo todos los escenarios críticos de restauración**.

**PR abiertos a la fecha de consulta:** #52 (visión/experiencia, borrador), #49 (guía y prueba Motorola), #37 (decisiones del usuario), #22 (diseño antiguo de bóveda opcional, borrador), #1 (beta antigua, borrador). No confundir documentos no fusionados con funcionalidades existentes.

**Estado integrado según código, historial y tablero:**

| Etapa | Estado observado en `main` | Evidencia |
|---|---|---|
| E1, base de audio por nota | Integrada | PR #45; `anOpen`, `anReview`, `anTx` |
| E2, audio cifrado por nota | Integrada | PR #50, que integró trabajo de #47; `anSealChunk`, `anBeginRecording`, `anSaveFile` |
| K1, crear/verificar copia | Integrada | PR #51; `copiaWriter`, `copiaVerify`, `copiaCreate` |
| B3, menús de nota | Integrada | PR #53 |
| E3, reproductor, espacio, audios huérfanos | Integrada | PR #55; `e3Player`, `e3Recover`, `e3RefreshSpace` |
| K2, restauración | **Pendiente** | No hay recorrido de restauración publicado |
| T, traslado del texto | **Pendiente** | Texto cifrado sigue en `localStorage` |
| AO, original recuperable | **Pendiente** | Se mantiene como diseño, sin implementación completa |

La documentación registra **166/166 pruebas Node y diez suites Chrome aprobadas** en el cierre de E3 (`CAMBIOS.md`), además de pruebas parciales en Motorola reportadas después. **Esta auditoría no ejecutó esos ensayos ni verificó personalmente el Motorola.** La publicación de Pages y el CI de `main` resultaron exitosos al consultarlos.

## 2. Mapa del almacenamiento actual

**Existen dos tecnologías persistentes —`localStorage` e IndexedDB—, pero hay dos bases de audio separadas, varios registros de texto, una capa de cifrado y memoria temporal.** No son «dos copias idénticas», sino dos rutas con capacidades distintas.

| Lugar | Contenido | Protección y comportamiento |
|---|---|---|
| `localStorage`: `notasvoz.dictanota.v2` | Cuadernos, notas, sellos, estado de transcripción, `audioId`, `audioParts`, `durationMs` | Bajo `vaultStore`: en claro con bóveda apagada; cifrado como registro de bóveda con protección encendida |
| `localStorage`: `notasvoz.gamma.v1` | Notas planas históricas | Sigue existiendo por compatibilidad; hay funciones de conversión a cuadernos |
| `localStorage`: `notasvoz.gamma.draft.v1` | Borrador de texto, destino, edición y audio pendiente | `vaultStore`; autoguardado periódico y al ocultar/cerrar la página |
| `localStorage`: `notasvoz.gamma.undo.v1`, `people`, `dict` | Deshacer, personas y diccionario | `vaultStore` |
| `localStorage`: `notasvoz.gamma.cfg.v1` y `generator.v1` | Ajustes, modelo, retención de audio, generador de códigos | En claro; incluidos en K1 bajo cifrado del archivo |
| `localStorage`: `notasvoz.boveda.v1` y `notasvoz.boveda.v1.r.*` | Cabecera y registros cifrados | AES-GCM; textos se cifran como registros completos, con memoria caché |
| IndexedDB `notasvoz-gamma-audio` | Última grabación y anterior; `meta` y `chunks` | **Sin cifrar**, no asociada a notas; usada con retención activada y bóveda apagada |
| IndexedDB `notasvoz-dictanota-audio` | Audio por identificador: `meta` y `chunks`, partes, claves, estados | **Cifrado** por fragmentos; usado con bóveda abierta y retención activada |
| RAM, `retryAudio` | Muestras temporales para volver a intentar Whisper | No sobreviven a cerrar o recargar y no son una copia persistente |

**Evidencias del código:** `VAULT_KEYS` y `createVault`, `index.html` L1375–1655; `CONV_KEY`, `convCleanEntry` y `convValid`, L2234–2285; `convMakeStore`, L2452–2493; estado de compositor L2552–2588; `snap`/`saveDraft`/`restoreDraft`, L5752–5786; base nueva L4173–4309 y L4311–4422; base antigua L5263–5390.

### Según «Conservar audio» y la bóveda

| Retención | Protección | Resultado comprobado en las rutas de código |
|---|---|---|
| Apagada | Cualquiera | No crea audio permanente de esa grabación para la biblioteca de notas |
| Encendida | Activada y abierta | `startAudioSave` → `startAudioNota`: fragmentos cifrados en base nueva; `anLinkPending` lo asocia al borrador y `convSave` a la nota |
| Encendida | Desactivada | `startAudioSave`: grabación sin cifrar en base histórica «last/previous», sin vínculo de nota |
| Encendida | Desactivada, archivo cargado | Se puede transcribir, pero `anSaveFile` no lo guarda en la base nueva, al requerir `anUsable()` |
| Encendida | Activada y abierta, archivo cargado | `transcribeBlob` dispara `anSaveFile`, cifrado por bloques de 1 MB, y enlace posterior a la nota |

Evidencia: `index.html` `startAudioSave` L5346–5390; `anSaveFile` L4813–4858; `transcribeBlob` L5571–5608; `loadCfg`/`saveCfg` L5728–5749. El control HTML no aparece marcado por defecto en `index.html`; el valor guardado lo puede activar.

### Relación, integridad y recuperación hoy

- Una nota lleva el `audioId`; la ficha del audio no guarda qué nota lo usa. `convAudioInUse` evita reutilizar/borrar un audio compartido; `convCtx` evita vincular una tarea tardía a otra nota (`index.html` L2361–2372, L4662–4678).
- El grabador protegido cifra fragmentos aproximadamente cada diez segundos, y la primera parte se guarda junto con su ficha mediante transacción (`anStart`/`anPutChunkMeta`, L4271–4295; `anRecChunk` L4766–4777). Lo recibido y confirmado puede sobrevivir al corte; no se garantiza recuperar lo que el navegador aún no entregó.
- Al detenerse se cierra la ficha (`anRecFinish` L4780–4794). Al reabrir, `anReviewOnOpen` L4906–4950 intenta cerrar grabaciones interrumpidas, revisar referencias y preservar audios dañados. También puede descartar archivos importados que quedaron en `escribiendo`: el diseño presupone que el usuario conserva el archivo original.
- Se confirma el guardado cifrado de una nota con `vault.flush()` y `vault.saved(CONV_KEY)` antes de limpiar el editor (`convSave` L2847–2893).
- `e3Recover` L4566–4582 recupera manualmente un audio sin nota, **creando texto de relleno** «Audio recuperado (sin transcripción).». `e3RefreshSpace` L4591–4628 muestra audios sin nota y espacio aproximado.
- El audio cifrado se reproduce a pedido, liberando material descifrado al detener o bloquear; E3 y el control de una sola pestaña son piezas aprovechables.
- El límite de importación es 30 MB y 15 minutos (`validateImport` L5498–5503); la estimación del almacenamiento y `persist()` existen en E3. No garantizan disponibilidad indefinida.

**Duplicación:** coexisten el modelo de notas plano y cuadernos; `notasvoz-gamma-audio` y `notasvoz-dictanota-audio`; y existen métodos de reintento distintos para muestras en memoria, grabación histórica y audio cifrado. Los nombres «gamma» heredados **no son un defecto técnico por sí solos**. El problema es mantener rutas de comportamiento que el futuro usuario no debería distinguir.

## 3. Problemas comprobados y riesgos pendientes

### Graves para considerarla arquitectura definitiva (no implica pérdidas ya observadas)

1. **Retención inconsistente según protección.** Código `startAudioSave` y `anSaveFile`: la misma opción de conservar produce una biblioteca cifrada por nota o solamente «última/anterior» en claro; archivos cargados tampoco tienen la misma conservación sin bóveda. Es una diferencia funcional real, incompatible con la experiencia unificada deseada.
2. **Falla de Whisper sin «Guardar solo audio» en el flujo habitual.** `convHasContent` (L2254) y `convAddEntry` permiten una entrada con audio y sin texto, pero `convSave` L2848 rechaza texto vacío. `fail()` L3983–3989 informa el error, pero no abre el recorrido propuesto. `e3Recover` es recuperación manual en Ajustes, no la confirmación normal desde el cuaderno.
3. **No hay restauración implementada.** K1 sabe generar y verificar; **K2 sigue pendiente**. Una copia que pasa comprobación criptográfica no es aún una copia cuya restauración completa se haya demostrado. Además, `copiaAudios` L5143–5165 omite audios dañados o sin cerrar, avisa e igualmente permite descargar una copia válida de lo que sí incluyó (L5168–5202). Esto es un riesgo de **completitud** que una futura restauración debe detectar; no equivale a corrupción criptográfica de la copia.

### Moderados

4. **Vínculo y audio en depósitos diferentes.** Guardar audio y nota son operaciones separadas. Si hay corte entre ambas puede quedar audio sin nota. El sistema prevé recuperación y, por lo tanto, **no es una pérdida automáticamente**; debe ensayarse la recuperación extremo a extremo.
5. **Borrador con confirmación insuficiente.** `saveDraft` L5753–5757 memoriza `lastDraft` antes de comprobar la escritura y atrapa los errores; al cifrar, `vaultStore` programa el volcado más tarde. Con cuota agotada puede quedar un borrador no persistido aunque el mecanismo considere que el texto no cambió. Es una **vulnerabilidad lógica observable en el código**; no se ejecutó prueba de pérdida física en esta auditoría.
6. **Con bóveda apagada no existe igual exclusión de pestañas.** `vaultTakeTabLock` protege las escrituras bajo bóveda; `vaultStore` con protección apagada pasa a `localStorage`. Potenciales sobrescrituras concurrentes requieren una prueba específica antes de declararlas fallo reproducido.
7. **Cuello de botella del texto.** Registro cifrado completo en `localStorage`, espacio limitado, expansión al codificarlo y escritura diferida. T estaba diseñada para resolverlo. No se midió el límite real de Brave/Motorola en esta investigación.
8. **Reintento cifrado desde una nota pendiente.** Hay reintento desde `retryAudio` temporal (`index.html` L5484–5494) y desde la grabación histórica (`transcribeSaved` L5561–5568), pero falta un recorrido de reintento sobre el audio cifrado de cualquier nota, preservando sus vínculos y texto editado.
9. **Copias que dependen de varias piezas.** El respaldo 1 conserva referencias, audios y registros; K2 debe validar que forman un conjunto coherente. El tamaño y la descarga de copias grandes en Brave/Android no están plenamente probados.

### Menores / mantenimiento

- Nombres y claves históricos, aunque no conviene renombrarlos por motivos estéticos.
- Código y controles para dos bibliotecas de grabaciones, con mensajes distintos.
- Documentos históricos que todavía contienen estados antiguos, subordinados al tablero y a `main`.

### Lo que funciona y debe mantenerse

AES-GCM autenticado, clave de datos y clave individual por audio; escritura de fragmentos en IndexedDB; estados y revisión; `anAudioHealth` antes de recortar/ampliar; protección contra vínculos cruzados y borradores viejos (`audioParts`); `vault.flush` al confirmar notas; una sola pestaña escritora bajo bóveda; recuperación de huérfanos; E3; estructura de copia versionada K1 y sus pruebas. **No se encontró motivo para reescribir estos componentes desde cero.**

## 4. Comparación de arquitecturas

| Criterio | A. Mantener y simplificar | B. Unificar biblioteca de audio | C. Depósito nuevo integral |
|---|---|---|---|
| Pérdida futura | Medio: permanecen dos comportamientos | Bajo si se hace por etapas y con recuperación | Riesgo inicial medio/alto por reescritura |
| Seguridad | Conserva límites actuales | Política única, con distinción explícita por modo | Podría ser excelente, pero requiere nueva auditoría |
| Complejidad | Baja al implementar, alta al mantener | Moderada y decreciente | Alta inicialmente |
| Rendimiento/espacio | Repite estructuras y límites | Reutiliza IndexedDB y fragmentos | Podría optimizar todo |
| Android | Utilizable con adaptaciones | Favorable a Capacitor/WebView | Depende de elección de motor |
| Copia/restauración | Muchas excepciones | Debe definirse respaldo de ambos modos | Nuevo formato y lector desde cero |
| Recuperar interrupciones | Principalmente ruta cifrada | Misma lógica para todas las grabaciones | Hay que reconstruirla |
| Mantenimiento | Mayor carga permanente | Menos caminos y estados compartidos | Más desarrollo y regresiones iniciales |

**Alternativa A:** aceptable temporalmente, no recomendada como final: los usuarios tendrán experiencias distintas según la bóveda.

**Alternativa B — RECOMENDADA COMO PROPUESTA:** una sola base `notasvoz-dictanota-audio` para audios futuros, mismo sistema de identificadores, estados, recuperación y reproductor, sin límite «last/previous». Cifrado según la política elegida explícitamente; textos y borradores inicialmente siguen donde están hasta T. Evita desarmar partes probadas.

**Alternativa C:** una IndexedDB nueva que reúna cuadernos, borradores, audios y metadatos con transacciones comunes. Ventaja potencial de integridad; costo alto de reemplazo, auditoría, retrocompatibilidad de copias y validación Android. Puede ser una dirección estructural a largo plazo, pero no hay evidencia suficiente de que sea mejor hoy.

**No se da por aprobada la alternativa B.**

## 5. Arquitectura objetivo propuesta (B)

1. **Un único catálogo de audio:** `audioId` estable por grabación o conjunto de partes, ficha y fragmentos en una biblioteca IndexedDB. Nunca conservar una segunda copia histórica automática.
2. **Audio independiente de Whisper:** la grabación se almacena por fragmentos en paralelo; el resultado de transcripción no determina su supervivencia.
3. **Nota y borrador con referencia al audio:** un borrador puede tener `audioId` y texto vacío; cuando el usuario confirma, la nota toma esa referencia. Una nota ya confirmada debe protegerse contra un borrador atrasado.
4. **Estados explícitos:** grabando, cerrando, interrumpida, lista para confirmar, confirmada, incompleta, dañada. La distinción entre estados de grabación y estados de transcripción debe modelarse sin falsas equivalencias.
5. **Una escritora en todos los modos:** extender el bloqueo y la comprobación de lectura/escritura al uso sin bóveda; evitar dos pestañas que reemplacen datos.
6. **Confirmación real:** afirmar «guardado» solo cuando ficha, fragmentos y vínculo aplicable están confirmados. Si algo falla, no descartar borrador ni material recuperable. Al evolucionar T, considerar transacciones comunes de texto/audio si comparten IndexedDB.
7. **No borrar huérfanos automáticamente:** ofrecer asociar a cuaderno, reproducir y eliminar bajo confirmación.
8. **Mantener cifrado vigente:** con bóveda activa, reutilizar derivación `K_audio`, CEK y AES-GCM. No cambiar `notasvoz.boveda.v1` ni el formato de copia 1 en esta fase.
9. **Modo sin protección: decisión pendiente:** (a) conservar en esa misma biblioteca sin cifrar, con advertencias visibles, o (b) exigir la bóveda para retención permanente. La recomendación de producto es permitirlo solo con información explícita; para datos confidenciales, recomendar la bóveda. Si se elige (a), no publicar hasta resolver respaldos completos también para ese audio.
10. **Retirar la base histórica solo tras pruebas y autorización.** Los datos actuales descartables permiten no construir una migración compleja, pero no habilitan borrarlos desde este informe.

IndexedDB ya está utilizada y probada técnicamente en la web; **no recomiendo sumar OPFS como segunda tecnología de audio**. Para Android, es preferible mantener el formato de datos independiente de la interfaz nativa.

## 6. Recorrido propuesto cuando Whisper falla

### «Conservar audio» activado

1. Al iniciar se fija la preferencia para **esa captura**. Se almacena audio por fragmentos independientemente de Whisper.
2. Al parar, se confirma qué fragmentos quedaron y se cierra o marca la grabación incompleta.
3. Whisper produce texto completo, parcial, vacío o error. No debe eliminar el audio por fallar.
4. Se muestra el cuaderno con un **borrador sin confirmar**, audio reproducible si está sano y texto parcial si existe.
5. Acciones: **«Guardar solo audio»**, **«Reintentar transcripción»**, **«Escribir nota»**. No agregar texto ficticio para satisfacer la validación.
6. El usuario confirma manualmente. Guardar espera la confirmación persistente, conserva el vínculo y el estado de transcripción. Al regresar se recupera el borrador si aún no fue confirmado.
7. El reintento sobre audio ya guardado jamás debe borrar texto editado sin consentimiento, cruzar audios entre notas ni alterar el `savedAt` original de una nota existente.

### «Conservar audio» desactivado

No se crea audio persistente ni excepción oculta aunque Whisper falle. Se conserva únicamente el **texto que pudo guardarse** y se ofrece escribir una nota manual. La aplicación debe decir que ese audio **no se puede recuperar** tras cerrar, sin prometer lo contrario. Material temporal en RAM no equivale a una grabación guardada.

### Matriz de falla exigida

| Falla | Resultado necesario |
|---|---|
| Whisper no inicia / falla completamente | Audio guardado según preferencia; nota solo audio permitida |
| Fallo de un segmento | Conservar texto útil y marcar tramo faltante |
| Navegador se cierra | Recuperar solo lo efectivamente escrito; jamás prometer segundos no confirmados |
| Grabador se interrumpe | Audio incompleto identificable y reproducible si su formato lo permite |
| Falta cuota | Avisar qué se confirmó, no cifrar en claro por error, no limpiar borrador sin confirmar |
| Falla de cifrado o ficha | No declarar éxito; conservar fragmentos y error para revisión segura |
| Audio sin nota | Lista de recuperación y vínculo manual |
| Borrador antiguo | No recortar ni borrar partes ya confirmadas |
| Dos pestañas | Una sola escritora; segunda con aviso de solo lectura |
| Fragmento alterado/ausente | Marcar dañado, no sobrescribir ni descartar en automático |

**Situación actual:** `convHasContent` admite audio sin texto y `transcriptionStatus` existe en el modelo (`index.html` L2254–2264), pero `convSave` bloquea guardar con texto vacío; `fail()` no ofrece el recorrido y `e3Recover` funciona solo desde gestión manual. Por lo tanto, el comportamiento nuevo **no está implementado**.

## 7. Preferencias y privacidad

**Propuesta — pendiente de autorización:** «Conservar audio» encendido **en instalaciones nuevas**, control principal en Ajustes e indicador siempre visible en Dictar, con enlace rápido al ajuste antes de grabar. Mantenerlo bloqueado durante la captura.

Primera desactivación, advertencia recomendada:

> «Si desactivás esta opción, DictaVoz no guardará la grabación. Si Whisper falla, no podrás recuperar el audio. Las grabaciones que ya guardaste no se borran».

Consecuencias:

- **Privacidad:** una voz almacenada puede contener nombres reales incluso si el texto se anonimiza. No prometer anonimato del audio. Si no hay cifrado, decirlo claramente.
- **Espacio:** más grabaciones ocupan almacenamiento; el panel E3 debe explicar uso, espacio estimado y si `navigator.storage.persist()` fue concedido, sin llamarlo «copia de seguridad». La limpieza manual de datos del sitio sigue siendo destructiva.
- **Instalaciones existentes:** no modificar silenciosamente preferencias previas. Distinguir instalación nueva de configuración guardada.
- **Borrador:** confirmar persistencia real; conservar el texto como mensaje **no enviado/no confirmado**, abrir el destino correcto y exigir Guardar manual para agregarlo al cuaderno.

## 8. Copias, K2, T, AO y Android

### K1 y formato publicado

Conservar el **formato 1 de `.dictanota`** (marca, cabecera, registros R, configuración C, metas M, fragmentos A, cierre F), la autenticación por AES-GCM, la cadena de integridad de F y el archivo fijo `tests/copia-formato-1.dictanota`. Véanse `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md` `2.6` y `index.html` `copiaWriter`/`copiaVerify` L4964–5118.

**Qué no confundir:** `copiaVerify` asegura autenticidad/estructura de los bloques presentes; el recorrido `copiaAudios` puede **omitir audios dañados** y aun así crear una copia de los elementos restantes con advertencia. Una copia verificable puede ser **incompleta respecto de la biblioteca original**. El nuevo modelo debe llevar inventario y estado explícito de exclusiones; «completa» solo cuando incluya lo esperado o el usuario acepte conscientemente la exclusión.

### K2 — restaurar

**Pendiente. Necesita permiso expreso.** Debe validar primero la copia entera, sus referencias, su inventario y los casos de datos dañados; escribir en un espacio/lote aislado y activar el resultado **solo tras comprobarlo**. El diseño anterior de «cabecera al final» es una buena idea pero no prueba, por sí solo, que un **reemplazo** del conjunto anterior sea atómico. Ensayar cortes antes, durante y después de cada fase, y confirmar que una copia que «parece válida» realmente puede restaurarse.

### Formatos y cambio eventual

Si la biblioteca unificada permite audios **sin cifrar** mientras la bóveda esté apagada, el formato 1 actual (copias sin bóveda solo de texto y audios cifrados dentro de la bóveda) **no los representa como respaldo completo**. Se debe decidir entre exigir bóveda para audio permanente o diseñar **formato 2** cifrado de respaldo con manifiesto de modos y relaciones. **No cambiar ahora el formato 1 ni sus archivos fijos.** Lectores futuros deben continuar admitiéndolo.

### T — migrar texto

**Pendiente. Necesita permiso expreso.** El plan vigente traslada registros cifrados de `localStorage` a una IndexedDB `notasvoz-dictanota-datos`, con copia verificada antes y marca de confirmación. Se propone evaluar si alojarlos en la misma IndexedDB que los audios reduciría bases y permitiría transacciones comunes. Es una **revisión a considerar de D13**, no un cambio autorizado. No ejecutar T hasta poder restaurar las copias y probar cortes de migración.

### AO — original recuperable

**Pendiente.** Conservar el original antes de anonimizar, nunca sobrescribirlo al anonimizar de nuevo, permitir volver al original y decidir explícitamente qué se copia o exporta. El audio no se anonimiza automáticamente. Integrarlo con el mismo mecanismo de confirmación, privacidad y respaldo, después de T según el plan vigente.

### Android

La futura app Android mediante Capacitor/WebView tendrá almacenamiento diferente del Brave del teléfono: la **copia cifrada restaurable** debe ser el camino oficial de traslado. Reusar la estructura, los fragmentos y el formato versionado; estudiar Keystore/`BiometricPrompt` para desbloqueo local en lugar de depender de WebAuthn en WebView. Verificar en dispositivo físico: persistencia y cuotas, grabación al bloquear pantalla, micrófono en segundo plano, reproducción, selector de archivos, exportación/importación grande y recuperación tras cierre forzado. Estas capacidades **no quedan garantizadas** por las pruebas de Chrome de escritorio.

## 9. Etapas pequeñas de implementación propuestas

| Fase | Alcance | Criterio de terminación |
|---|---|---|
| P0 | Aprobar arquitectura B y política de audio sin bóveda | Decisiones explícitas, sin contradicciones con K2/T/AO |
| P1 | Confirmación y recuperabilidad de borradores | Fallas de cuota, cierre, recarga y cifrado no se silencian |
| P2 | Biblioteca única para nuevas grabaciones, inicialmente no publicada | Pruebas de ambos modos, interrupciones, fragmentos, huérfanos, dos pestañas |
| P3 | Definir compatibilidad de copia y completar K2 con autorización | Exportación + restauración en perfil vacío, comparación integral, cortes forzados |
| P4 | Audio ante error total/parcial de Whisper y reintento cifrado | Audio solo sin relleno, borrador recuperable, no sobrescritura de texto |
| P5 | Valor predeterminado e indicador de privacidad | Preferencias existentes conservadas, advertencia inicial, controles bloqueados grabando |
| P6 | Retiro de rutas históricas de escritura | Regresión completa, sin dependencias ocultas, borrado solo si se autoriza |
| P7 | T, AO y adaptación Android, por etapas separadas | Recuperación, compatibilidad y pruebas específicas de dispositivo |

**Restricción de publicación:** no habilitar producción de audios en un modo que una copia y restauración disponibles no puedan cubrir.

### Pruebas mínimas antes de cerrar fases críticas

- Micrófono sintético y archivos ficticios; grabar, detener, recargar, desbloquear, reproducir, comparar audio y asociaciones.
- Whisper falla al iniciar, a mitad y al final; comparar preferencia activada/desactivada; reintentar sin perder edición.
- Cortes forzados al guardar cada fragmento, al cerrar ficha, al guardar borrador, al confirmar nota, al exportar y al restaurar.
- Fallo `QuotaExceededError` en IndexedDB y `localStorage`; fallos de cifrado; cabecera/fragmento dañado; audio huérfano y borrador viejo.
- Dos pestañas en ambos modos; pérdida de candado; no cruzar audio A con nota B.
- Copia completa con múltiples cuadernos, un audio sin nota, audio incompleto y borrador; comparar inventario antes/después.
- Alterar, truncar, reordenar y mezclar bloques de copia: rechazar antes de escribir.
- Restituir copias de formato 1 en versiones futuras; si hay formato nuevo, archivo fijo adicional.
- Android real: abrir, bloquear, grabar, cerrar forzosamente, importar y restaurar; separar resultado real de prueba simulada.

## 10. Decisiones reservadas al propietario

**Todas pendientes, no inferir aprobación:**

1. Adoptar arquitectura **B** como objetivo definitivo.
2. Política de «Conservar audio» con bóveda apagada: audio local sin cifrar pero claramente advertido, o bóveda obligatoria para guardarlo permanentemente.
3. Activar retención por defecto **solo en instalaciones nuevas** y trasladar control principal a Ajustes.
4. Permitir retirar compatibilidad con estructuras y datos de prueba históricos.
5. Aprobar de forma separada **K2**, cualquier ajuste de su diseño, y después **T**.
6. Decidir si se requiere formato **2** para respaldar audios de ambos modos; **formato 1 permanece intocable** hasta aprobación y versionado.
7. Autorizar explícitamente cualquier borrado de bases antiguas o reinicio de almacenamiento.
8. Precisar AO y reglas de exportación de versiones originales y anonimizadas.

## Conclusión operativa

**Recomendación concreta: alternativa B.** Aprovechar E1/E2/E3/K1, unificar la biblioteca futura de audio en IndexedDB, separar retención de transcripción, garantizar que Whisper fallido no borre el audio elegido, asegurar la confirmación real de borradores y completar **copias restaurables antes de publicar nuevos modos**. No reescribir desde cero ni sostener indefinidamente la base «última/anterior». La prioridad es confiabilidad comprobable, no compatibilidad con datos de prueba.

> **Este documento es la auditoría de diseño y NO autoriza ningún paso.** No sustituye `docs/PLAN-ALMACENAMIENTO-CIFRADO.md` ni `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md` hasta que el propietario apruebe cambios. Si la próxima IA encuentra que `main` avanzó desde `7171650`, debe actualizar su lectura del código antes de actuar.
