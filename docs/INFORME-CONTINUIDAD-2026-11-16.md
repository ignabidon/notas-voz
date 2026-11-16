# DictaNota · Informe de continuidad para la próxima IA (16/11/2026, 10:15)

> **Leé esto primero.** Resume qué se hizo hasta ahora en el rediseño conversacional, qué falta y en qué orden seguir.
> Punto de partida verificado: `main` = `bb89314` (PR #34), publicado en GitHub Pages con CI aprobado.
> Fuentes: código de `index.html`, pruebas, `CAMBIOS.md` y la especificación [`REDISENO-CONVERSACIONAL-2026-11-16.md`](REDISENO-CONVERSACIONAL-2026-11-16.md), en especial sus secciones **2.5 y 2.6**, que reemplazan a lo anterior donde choquen.

---

## 1. Lo que el usuario observó al probar (10:12) y por qué

1. **«La estética sigue igual»: es correcto.** La estética **Clínica contemporánea** (clara, blanca, azul petróleo) **se aprobó y se mostró en maquetas, pero NUNCA se implementó.** La app sigue con el tema oscuro original (`<meta name="color-scheme" content="dark">`, `theme-color #090f20`). Las fases 1 a 3 cambiaron datos y comportamiento, no colores. Al usuario no se le dejó claro: **es lo más importante para corregir.**
2. **«Veo una pestaña Notas, pero noto pocos cambios»: es esperable con lo hecho.** La pestaña Notas reutiliza la tarjeta y el editor grande de la antigua pantalla Texto. La lista de hojas y las burbujas aparecen **arriba del mismo editor**, sin el aspecto de chat de las maquetas: sin barra de escritura fija abajo, sin botón global «Nueva nota» y con el editor ocupando mucho espacio. Funciona, pero **no se ve como un chat**.
3. **No es caché ni error del usuario:** lo publicado (`bb89314`) contiene «Tus hojas», «Mensaje sin guardar» y la pestaña Notas. Si en Brave no aparece «Notas» en la barra, recargar.

## 2. Lo que SÍ está hecho (código en `main`, pruebas en CI; sin validar en el Motorola)

| Fase | Qué hace | Dónde |
|---|---|---|
| 1–2 | **Modelo de datos** de hojas y mensajes (funciones puras): sello `savedAt` = hora en que se terminó de guardar, inmutable; editar, renombrar, mover uno o todos con Deshacer, copiar hoja completa, borrar mensaje y hoja vacía, migración de notas viejas (una burbuja por nota), plan de regreso a notas planas | `index.html`, bloque `/*CONV-START*/ … /*CONV-END*/` |
| 2 | **Guardado protegido** en la clave nueva `notasvoz.dictanota.v2`, agregada a `VAULT_KEYS` («conversaciones»): cifrada si la protección está activa; verifica releyendo; con la app bloqueada no lee ni escribe; no sobrescribe datos dañados | `convMakeStore` (bloque CONV) y `VAULT_KEYS` |
| 3 | **Pestaña Notas** (antes Texto, id interno `transcripcion`): lista de hojas, burbujas con fecha y hora, editor = «mensaje sin guardar», **Guardar** (ya no descarga .txt) y **Descartar** con confirmación; destino: captura desde Audio → hoja nueva, hoja abierta en Notas → se agrega ahí; Copiar/Editar/Mover/Borrar por mensaje; Renombrar/Copiar todo/Pasar todo/Descargar .txt/Borrar hoja vacía por hoja; migración automática al abrir; recuperación del borrador con su destino | `index.html`, sección «Notas en hojas (rediseño conversacional, fase 3)» y `convInit()` en `vaultWhenReady` |

- Pruebas: `tests/delta.test.mjs` (**128**), `tests/browser.mjs`, `tests/cifrado-browser.mjs` y la nueva **`tests/notas-browser.mjs`** (flujo completo de Notas en Chrome a 320/360/412 px). Las cuatro corren en `.github/workflows/verificar-delta.yml`.
- `notasvoz.gamma.v1` (notas viejas) **no se modifica**: queda como respaldo.

## 3. Lo que FALTA, en el orden recomendado

### 3.1 Estética Clínica contemporánea — aprobada, pendiente (PRIORIDAD 1)
- Referencia visual: lienzo de diseño «DictaNota · Maquetas Notas, Biblioteca y Ajustes» en la cuenta de Claude del usuario (otra IA **no** puede abrirlo). Valores usados: fondo `#F4F7F8`, tarjetas `#FFFFFF`, texto `#12262C`, texto secundario `#4F646A`, **azul petróleo `#0E5A6B`** (acento y botón principal), bordes `#D6E1E5`, celeste suave `#E6F0F3` (burbujas/áreas), avisos ámbar `#7A4E00` sobre `#FFF4DD`, errores `#9B2C26` sobre `#FBEAEA`; tipografía del sistema o Inter (Inter exigiría un origen nuevo en la CSP: **no agregar sin permiso**; usar la del sistema).
- Dificultad real: el CSS tiene **tres bloques `:root`** (líneas ~15, ~71 y ~158) y **~270 colores fijos** repartidos en reglas. Cambiar solo las variables no alcanza. Sugerencia: definir variables nuevas una sola vez, reemplazar los colores fijos por variables, pasar `color-scheme` y `theme-color` a claro, y revisar contraste (4,5:1) en todos los estados: grabando, pausa, errores, aviso de Whisper, pantalla de bloqueo, diálogos.
- Verificar con capturas a 320/360/412 px, letra Normal y Grande (`tests/browser.mjs` ya recorre esos anchos).

### 3.2 Notas con aspecto de chat (PRIORIDAD 2)
- Separar **lista de hojas** y **hoja abierta** en vistas propias; la hoja ocupa la pantalla con las burbujas.
- **Barra de escritura fija abajo** (campo + micrófono + Guardar/Descartar), como en las maquetas; las herramientas de corrección y exportación del editor actual pasan a un panel o menú, **sin perder** Corregir selección, diccionario, aprendizaje, copiar, compartir ni anonimizar.
- **Botón global «Nueva nota»** visible desde Notas y la lista, que graba en una hoja nueva (hoy eso solo pasa grabando desde la pestaña Audio).
- Cuidar la barra fija de grabación (`#studioDockCapture`), el teclado de Android (`initErgonomics`) y que Pausar/Detener nunca queden tapados.

### 3.3 Navegación final (PRIORIDAD 3)
- Hoy: **Audio / Notas / Anonimizar / Ajustes**. Meta aprobada: **Notas / Biblioteca / Ajustes**.
- Decisión del usuario (09:52): **el audio NO va en las burbujas**; cada mensaje es texto. El audio original **solo se guarda a pedido** («Conservar audio», apagado por defecto). Por eso «Biblioteca» se simplifica: hojas, búsqueda, y los audios que el usuario eligió conservar (hoy el almacenamiento guarda **un audio principal y uno anterior**; el usuario dijo que no hace falta la copia «anterior» y que se puede descartar con confirmación — sin implementar).
- Anonimizar pasa a ser acción de la hoja o del mensaje, no pestaña (sin perder la tabla de personas y códigos, la vista previa ni Deshacer).

### 3.4 Otras funciones pendientes
- **Vista Documento** de una hoja (leer y exportar todo junto; las fechas como encabezados, no dentro del texto).
- **Ajustes reordenado:** Privacidad y protección / Grabación y transcripción / Texto y anonimización / Datos.
- **Búsqueda** en hojas (solo con la app desbloqueada).

### 3.5 Validación y seguridad
- **Motorola (Brave):** nada de las fases 1–3 fue probado en el teléfono. Lista de prueba en `README.md`, sección «Notas en hojas».
- Siguen abiertos (ver `SEGURIDAD.md`): audios sin cifrar, copia cifrada exportable, prueba de CSP/huella MP3 en el Motorola, proteger `main`.
- Documentación con inconsistencias menores: en `SEGURIDAD.md` hay dos secciones antes del título; `CAMBIOS.md` dice 90 minutos para audios importados, pero el código limita a **15** (los 90 son para audios guardados).

## 4. Decisiones del usuario vigentes (no reabrir)

- Estética Clínica contemporánea; móvil primero; pensada para una futura app Android.
- Cada hoja es como un chat privado; **nada se envía**.
- **Guardar explícito:** lo no guardado se descarta (con confirmación). La **recuperación automática** del borrador se mantiene.
- **Sello de cada burbuja = fecha y hora en que se terminó de guardar**; no se edita desde la app; no cambia al corregir, mover, anonimizar o exportar.
- Nota nueva: **título = fecha y hora**; se crea solo si hay texto válido.
- Captura global → hoja nueva; dentro de una hoja → se agrega ahí.
- Por mensaje: transcribir, copiar y llevar a otro lado. Por hoja: **copiar todo y pasar todo a otra hoja**.
- Notas viejas → una burbuja por nota con su fecha de guardado.
- Audio: fuera de las burbujas; se guarda **solo a pedido**. Los datos guardados hasta ahora son **material de prueba**.

## 5. Cómo trabajar (resumen de `AGENTS.md`, que manda)

- Leer `AGENTS.md`, `SEGURIDAD.md` y `DISENO-CIFRADO.md` antes de tocar código.
- Rama propia desde `main` actualizado → pruebas (`node --test tests/delta.test.mjs` y las tres de navegador) → `CAMBIOS.md` → PR → CI → unir **con permiso del usuario**.
- Datos del usuario siempre con `textContent`; sin `eval`/`innerHTML` con datos; sin orígenes nuevos sin permiso (CSP).
- Notas, borrador, deshacer, personas, diccionario y **hojas** solo por `vaultStore`.
- No renombrar claves `gamma`. No usar datos reales de pacientes.
- Informar en tres niveles: **código guardado**, **pruebas técnicas** y **probado en el Motorola**.
- Explicar al usuario en español sencillo y **mostrarle capturas antes de publicar cambios visuales**: el informe anterior prometió «sobre las maquetas» y el usuario esperaba ver la estética nueva.
