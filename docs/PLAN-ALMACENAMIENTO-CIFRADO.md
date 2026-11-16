# DictaNota · Plan de trabajo del almacenamiento cifrado (tablero)

> **Este archivo no cambia de nombre.** Los pedidos que Ignacio copia y pega apuntan acá. Es el tablero: dice qué paso toca, qué hay que hacer en cada uno y en qué estado está.
> **El diseño completo** (el porqué de cada cosa) está en [DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md](DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md). Si este tablero y el diseño no coinciden, vale el diseño; si el diseño y el código no coinciden, vale el código, y avisale a Ignacio.
> Última actualización: 16/11/2026 (Claude Opus 5.5). **E1 unido a `main` (PR #45, `aab2b90`), con permiso de Ignacio. E2 programado, en PR abierto, sin unir.** Próximo paso, una vez unido E2: **K1**. La Etapa N ya está en `main`.

## Si sos la IA a la que le pidieron un paso, empezá acá

1. Leé, en este orden: `SEGURIDAD.md`, `AGENTS.md`, `DISENO-CIFRADO.md`, `CONTINUAR-AQUI.md`, **este archivo** y el diseño completo. Después, el código real que vas a tocar en `/index.html`.
2. Buscá tu paso en la tabla de abajo. **Hacé solo ese paso.** Si su estado no es «Pendiente» o alguno de los pasos de los que depende no está «Unido a `main`», frená y avisale a Ignacio.
3. **Antes de programar, mostrale a Ignacio un plan corto en lenguaje simple y esperá su permiso explícito.** Todos estos pasos tocan almacenamiento.
4. Trabajá en una rama nueva desde el `main` actualizado. No uses la rama de otra IA. Revisá los PR abiertos antes de empezar.
5. Al terminar: pruebas, registro en `CAMBIOS.md`, PR, y **actualizá la columna «Estado» de este archivo en el mismo PR**. No unas a `main`: lo autoriza Ignacio (merge normal, sin squash).
6. Informá siempre en tres niveles: código guardado · pruebas técnicas · probado en el Motorola.

### Reglas que valen para todos los pasos

- Una sola app: `/index.html`. Sin servicios externos, telemetría, orígenes ni dependencias nuevas.
- **Nunca datos reales de pacientes** (el repositorio es público). Usá «Persona Inventada Uno», código `X-901`, «madre de X-901» y audios sintéticos.
- No renombrar claves históricas («gamma»). Datos protegidos solo con `vaultStore` o cifrados con una clave derivada de la clave de datos.
- No cambiar el formato de `notasvoz.boveda.v1` ni de los registros, salvo lo que el diseño indica para el paso T.
- No prometer en la interfaz «cifrado seguro» ni «sin nube». Ignacio es psicólogo, no programador: explicale en español rioplatense, claro y sin relleno.
- No adelantes otro paso «de paso». Si encontrás algo fuera de tu alcance, anotalo en el PR.

## Antes de empezar con estos pasos

El orden general del proyecto es **Etapa N → B → E → C → D**. Estos pasos son la Etapa E y lo que cuelga de ella.

| Etapa previa | Estado al 16/11/2026, 18:40 |
|---|---|
| **N** (pestañas «Dictar» y «Cuadernos») | **Unida a `main`** (PR #43 de ChatGPT, commit de merge `4d3cd01`), con permiso de Ignacio. Publicada. **Sin probar en el Motorola** |
| Documentación de continuidad | **Unida a `main`** (PR #42 de ChatGPT, `8a7ecb8`) |
| Este diseño y este tablero | **Unidos a `main`** (PR #44 de Claude), con permiso de Ignacio |
| **B** (jerarquía y densidad: B1, B2, B3) | Sin empezar |

- **Ignacio indicó (16/11/2026, 18:06) que la próxima IA retome desde E1.** E1, E2, K1 y K2 no tocan la burbuja y pueden ir antes de la Etapa B. **E3 espera a B3** (el reproductor vive en la burbuja ya limpia).
- Eso no reemplaza la regla de cada paso: plan corto y permiso explícito de Ignacio antes de programar.
- **Vocabulario:** desde la Etapa N, en la interfaz «hoja» se llama **«cuaderno»** y las pestañas son Dictar / Cuadernos / Anonimizar / Ajustes. Los ids internos, las claves y los nombres de funciones (`conv…`) no cambiaron. El diseño se escribió antes de esa unión y dice «hoja»: es lo mismo.
- El diseño cita líneas de `index.html` de `3383584`. La Etapa N cambió textos en el lugar (59 líneas), así que las referencias siguen sirviendo de guía; confirmá siempre en el código actual.
- Para resolver un cruce en `CAMBIOS.md` y `CONTINUAR-AQUI.md`, Claude unió `main` dentro de la rama del PR #43 (solo esos dos archivos, conservando ambos textos) antes de unirlo. `index.html` y las pruebas de ChatGPT no se tocaron; el CI volvió a pasar.
- `main` sigue **sin protección** en GitHub (verificado el 16/11). Lo activa Ignacio.
- Otros PR abiertos, ajenos a este plan: #37 (decisiones del mediodía, documentación), #22 y #1 (viejos).

## Tablero de pasos

Orden decidido por Ignacio: **E1 → E2 → K1 → E3 → K2 → T → AO**.

| Paso | Qué es | Depende de | Claude | ChatGPT (Codex) | Estado |
|---|---|---|---|---|---|
| **E1** | Base nueva de audios por nota, sin activar | — | Sonnet 5.5 | Modelo estándar, razonamiento medio | Unido a `main` (`aab2b90`, PR #45) |
| **E2** | Cifrado de audios y guardado por nota | E1 | Opus 5.5 | El más capaz de tu plan, razonamiento alto | PR abierto (n.º en el historial) |
| **K1** | Copia cifrada: exportar y verificar | E2 | Opus 5.5 | El más capaz de tu plan, razonamiento alto | Pendiente |
| **E3** | Reproductor en la burbuja, espacio en Ajustes | E2, K1 y Etapa B3 | Sonnet 5.5 | Modelo estándar, razonamiento medio | Pendiente |
| **K2** | Restaurar una copia cifrada | K1 | Opus 5.5 | El más capaz de tu plan, razonamiento alto | Pendiente |
| **T** | Mudar el texto al depósito grande | K1 y K2 | Opus 5.5 | El más capaz de tu plan, razonamiento alto | Pendiente |
| **AO** | Anonimización con original recuperable | T y Etapa C1 | Sonnet 5.5 u Opus 5.5 | Cualquiera de los dos niveles | Pendiente |

Estados posibles: Pendiente · Plan aprobado · PR abierto (n.º) · Unido a `main` (commit) · Probado en el Motorola (fecha).

**Sobre los modelos.** Los pasos de cifrado y de migración (E2, K1, K2, T) van con el modelo más capaz; los de interfaz y estructura, con uno intermedio. No usar modelos chicos (Claude Haiku, o los «mini» de ChatGPT) en nada de este tablero. Los nombres de los modelos de ChatGPT cambian seguido y dependen del plan: al 16/11/2026 la ayuda de OpenAI lista GPT-6 Astra y GPT-5.6 Sol para Codex; elegí el más capaz que te aparezca para los pasos delicados.

**Revisión cruzada.** En E2, K1, K2 y T, conviene que una IA programe y la otra revise el PR antes de unir (pedido de revisión al final).

## Pedidos para copiar y pegar

Cada pedido sirve igual para Claude y para ChatGPT. Solo cambia el paso.

**E1**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso E1. Antes de programar, mostrame el plan en lenguaje simple y esperá mi permiso.
```

**E2**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso E2. Antes de programar, mostrame el plan en lenguaje simple y esperá mi permiso.
```

**K1**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso K1. Antes de programar, mostrame el plan en lenguaje simple y esperá mi permiso.
```

**E3**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso E3. Antes de programar, mostrame el plan en lenguaje simple, con un boceto o captura del reproductor, y esperá mi permiso.
```

**K2**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso K2. Es el paso que puede borrar datos: antes de programar, mostrame el plan en lenguaje simple, con las confirmaciones que va a ver el usuario, y esperá mi permiso.
```

**T**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso T. Es una migración de datos ya guardados: antes de programar, mostrame el plan en lenguaje simple, qué pasa si se corta a la mitad y cómo se vuelve atrás, y esperá mi permiso.
```

**AO**
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y seguí sus instrucciones. Te toca SOLO el paso AO. Antes de programar, mostrame el plan en lenguaje simple y esperá mi permiso.
```

**Revisión de un paso hecho por otra IA** (cambiá el número de PR y el paso)
```
Trabajás en DictaNota (repo github.com/ignabidon/notas-voz). Leé docs/PLAN-ALMACENAMIENTO-CIFRADO.md y el diseño que enlaza. Revisá el PR #__, que implementa el paso __. No cambies código: decime en lenguaje simple si cumple el diseño, qué riesgos ves para los datos guardados y qué pruebas faltan. Separá lo grave de lo menor.
```

## Qué incluye cada paso

Las secciones entre paréntesis son del diseño completo.

### E1 · Base nueva de audios por nota, sin activar
- **Hacer:** módulo de la IndexedDB nueva `notasvoz-dictanota-audio` (almacenes `meta` y `chunks`), funciones puras para partes, estados y revisión de consistencia, y el candado de una sola pestaña (2.3 y 2.5).
- **No hacer:** nada visible para el usuario. La base no se crea en el celular todavía. No tocar `notasvoz-gamma-audio`. Nada de cifrado ni de interfaz.
- **Listo cuando:** las pruebas de Node y Chrome cubren estados, mover y borrar, y demuestran que los datos de Delta 11 quedan intactos.
- **Vuelta atrás:** total.

### E2 · Cifrado de audios y guardado por nota
- **Hacer:** clave `K_audio` derivada de la clave de datos, clave propia por audio, fragmentos cifrados (2.4); activar el guardado por nota para grabaciones y archivos cargados, solo con la protección abierta y «Conservar audio» encendido (2.5 y 2.8); poner en cero la clave en bruto tras usarla; marcar como «ocupado» el cifrado de un archivo; **bajar el tope de carga a 30 MB** (2.7).
- **Decisiones de Ignacio que aplican:** D1, D2, D4, D7, D8. Con la protección apagada, «Conservar audio» sigue como hoy.
- **No hacer:** reproductor, panel de espacio, copia cifrada.
- **Listo cuando:** un audio grabado y uno cargado se guardan cifrados y se recuperan idénticos; ningún fragmento queda en claro; con «Conservar audio» apagado la base nueva queda vacía; los cortes dejan los estados de la tabla de 2.5.
- **Actualizar:** `SEGURIDAD.md` (regla 7 y hallazgo 1), `AGENTS.md` (frase «un audio cargado nunca se guarda»), `DISENO-CIFRADO.md`, y los textos de la interfaz que dicen que los audios no se cifran.
- **Vuelta atrás:** el código sí; los audios ya guardados quedan cifrados y sin usar, no se pierden.

### K1 · Copia cifrada: exportar y verificar
- **Hacer:** archivo `.dictanota` formato 1 (2.6), con opción «Completa» o «Solo texto» (D5); botón «Verificar copia»; archivo de ejemplo fijo con datos inventados en `tests/`.
- **No hacer:** restaurar. No recifrar nada: los registros y fragmentos se copian como están.
- **Listo cuando:** la copia se arma, se verifica, y se rechaza si está cortada, alterada o es de un formato más nuevo.
- **Sin probar todavía:** descarga de un archivo de cientos de MB en Brave/Android. Si falla, plan B del diseño (volúmenes).
- **Vuelta atrás:** total; solo agrega.

### E3 · Reproductor, persistencia y espacio
- **Hacer:** reproductor en la burbuja (según la Etapa E de `docs/PROPUESTA-ESTETICA-2026-11-16.md`, sin resaltar palabras), `navigator.storage.persist()`, panel de espacio en Ajustes, lista de audios sin nota (D8), aviso del audio suelto viejo (D7).
- **Decisión de Ignacio que aplica:** **D11: la reproducción no frena el autobloqueo.** A los 15 minutos sin tocar la pantalla la app se bloquea aunque suene un audio.
- **Listo cuando:** se reproduce, pausa y adelanta; suena un solo audio a la vez; al bloquear no queda ningún audio descifrado accesible.
- **Actualizar:** la frase de `AGENTS.md` «Audio solo a pedido, fuera de las burbujas».
- **Vuelta atrás:** total (interfaz).

### K2 · Restaurar una copia cifrada
- **Hacer:** restaurar en una app vacía o reemplazando todo, con doble confirmación (D6). Dos recorridos: validar todo, después escribir; la cabecera se escribe al final (2.6).
- **No hacer:** mezclar con lo existente.
- **Listo cuando:** exportar → borrar → restaurar devuelve lo mismo, y una restauración cortada a propósito no deja la app a medias.
- **Vuelta atrás:** el código sí; un reemplazo ya hecho, no. Es el paso que puede borrar datos.

### T · Mudar el texto al depósito grande
- **Hacer:** los registros cifrados pasan de `localStorage` a IndexedDB (2.13), con los cuatro pasos de migración y su punto de confirmación. De paso, que el guardado de notas confirme recién cuando llegó a disco.
- **Condición:** exigir una copia cifrada verificada antes de migrar, o confirmación explícita de seguir sin ella.
- **Listo cuando:** datos de Delta 11 sembrados migran y quedan idénticos; un corte en cada paso no pierde nada.
- **Vuelta atrás:** difícil. Una versión anterior de la app no vería las notas. Es la única migración de datos del plan.

### AO · Anonimización con original recuperable
- **Hacer:** registro nuevo «originales» en `VAULT_KEYS`, ver el original manteniendo apretada la burbuja, «volver al original», diálogo de exportación con «Anonimizada» preseleccionada (2.3); comportamiento al quitar la protección (D3).
- **Decisiones de Ignacio que aplican:** D1, D3, D9.
- **Listo cuando:** guardar, cerrar y reabrir conserva el original; anonimizar dos veces no pierde el primero; ver el original no cambia el sello de guardado.
- **Vuelta atrás:** total; una versión anterior ignora el registro.

## Decisiones de Ignacio (resumen)

Tomadas el 16/11/2026. Detalle y opciones descartadas, en el diseño completo.

| # | Decisión |
|---|---|
| D1–D2 | Originales y audios por nota, solo con la protección cifrada activa |
| D3 | Al quitar la protección: ofrecer copia, borrar audios por nota y preguntar por los originales |
| D4 | Tope de 30 MB para cargar un archivo |
| D5 | Copia cifrada: elegir cada vez «Completa» o «Solo texto» |
| D6 | Restaurar solo en app vacía o reemplazando todo |
| D7 | El audio suelto viejo no se migra; aviso con Descargar y Borrar |
| D8 | Los audios sin nota no se borran solos |
| D9 | Exportar «anonimizada» con notas sin anonimizar: avisar cuántas son |
| D10 | El código de recuperación es único; cambia solo a pedido, con contraseña |
| D11 | La app se bloquea a los 15 minutos aunque suene un audio |
| D12 | La copia cifrada va antes del reproductor |
| D13 | El texto se muda al depósito grande antes de los originales |

**Descartado:** entrar con una cuenta (Gmail u otra), ligar la huella a la cuenta de Google, copia en Google Drive y botón directo a Google Docs.
**App de Android:** después de este plan. Distribución entre conocidos, como experimental, pasando el archivo de instalación.

## Historial de este tablero

- 16/11/2026, 18:10 · Claude (Fable 5.2): creado junto con el diseño. Ningún paso empezado. Nada probado en el Motorola.
- 16/11/2026, 18:40 · Claude (Fable 5.2): con permiso de Ignacio se unieron a `main` los PR #42, #43 (Etapa N) y #44. Próximo paso: **E1**.
- 16/11/2026 · Claude (Sonnet 5.5): E1 programado con permiso de Ignacio (bloque apagado, sin cifrado, candado sin conectar). PR #45 unido a `main` (`aab2b90`) con permiso de Ignacio, merge normal. Motorola: sin probar.
- 16/11/2026, 18:40 · Claude (Opus 5.5): E2 programado con permiso de Ignacio. Decisiones del plan: **1a** (con la protección abierta, el audio se guarda solo cifrado; hasta E3 no se escucha desde la app) y **2a** (candado de una pestaña conectado para los audios). PR #46 cerrado a pedido de Ignacio (su cambio va acá). Detalle, casos aceptados y lo que no incluye: `CAMBIOS.md`. Motorola: sin probar. Conviene revisión cruzada de ChatGPT antes de unir.
