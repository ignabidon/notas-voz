# DictaNota · Decisiones del usuario del 16/11/2026 (mediodía)

> Registrado por Claude a pedido del usuario (12:00–12:30, hora de Buenos Aires). Complementa `CONTINUAR-AQUI.md` y el informe de continuidad de las 10:15; donde choquen, **manda este documento**, siempre por debajo de `AGENTS.md` y `SEGURIDAD.md`.
> **DECISIÓN** = la tomó el usuario. **SUGERENCIA** = propuesta de Claude, todavía sin confirmar.
> Datos siempre ficticios: nunca pacientes reales en pruebas, capturas ni ejemplos.

## 0. Estado de ramas (verificado el 16/11, ~12:20)

- El PR #36 (estética clara y notas en chat, de ChatGPT) **se unió a `main`** con commit de merge normal. `main` = `2f56388`; pruebas y publicación en verde. Se unió para que el usuario pueda verlo en su celular.
- La rama `rediseno-04-clinica-chat-chatgpt` sigue en `95bb587`. ChatGPT retoma ahí, abre un **PR nuevo** (el #36 ya está cerrado) y **no usa squash**, para no romper el historial común.
- `CLAUDE.md` y el comienzo de `CONTINUAR-AQUI.md` todavía dicen que la estética clara «falta»: ya está en `main`. Actualizarlos al retomar.
- El usuario todavía **no vio** la estética en su celular; le gustaron las imágenes que mostró ChatGPT. Una captura real a 412 px mostró que la barra inferior de Notas ocupa casi la mitad de la pantalla: revisar con el teclado abierto.

## 1. Anonimización — DECISIÓN

- El original se guarda **junto** a la versión anonimizada, dentro de la misma nota.
- La versión original se recupera de forma fácil, por ejemplo **manteniendo apretada la burbuja**.
- Exportar: el usuario **elige en cada exportación** si sale anonimizada o no. Es un complemento de la anonimización, **no una regla**.
- Orden: primero la nota, después la hoja completa.
- SUGERENCIA: guardar el original solo mediante `vaultStore`; si la protección cifrada está apagada, exigir activarla o avisar con claridad que los originales quedarían en texto plano junto a las versiones anonimizadas. En el diálogo de exportar mostrar ambas opciones, con la anonimizada preseleccionada. Que ver el original no cambie el sello de guardado.
- No presentarlo como implementado hasta tener pruebas de persistencia (guardar, cerrar y reabrir). El Deshacer actual no lo garantiza.

## 2. Navegación — DECISIÓN parcial

- Se mantienen las **cuatro pestañas** por ahora; **los nombres hay que repensarlos**.
- Idea del usuario, no definida del todo: **Biblioteca** = donde están las notas guardadas; **Notas** = las transcripciones o burbujas.
- SUGERENCIA: en el vocabulario vigente, hoja = contenedor y nota = cada burbuja. Encaja Biblioteca = lista de hojas y Notas = la hoja abierta con sus burbujas. Mostrar al usuario opciones de nombres, con capturas, antes de implementar.

## 3. Motor Whisper propio — DECISIÓN

- Alojar una copia propia del motor (`@huggingface/transformers@3.8.1`) y de `lamejs` dentro del repositorio y de la app, y **sacar `cdn.jsdelivr.net` de la CSP** (script, worker y connect) cuando esté. Versión fija. Actualizar `SEGURIDAD.md` (puntos 2 y 3).
- La app de Android (Capacitor) usará **la misma carpeta**, empaquetada.
- Motivos: no depender de un servidor de terceros, funcionar sin conexión y poder usar más hilos de cálculo. Hoy corre con **un solo hilo** porque la página publicada no está aislada; que en Android funcione con varios **hay que probarlo**, no está asegurado. Alternativa futura: motor nativo de Android.
- Los **modelos** (Hugging Face): sin decidir si van dentro de la app o se descargan una vez. Tenerlos dentro **no acelera** la transcripción; solo evita la descarga.
- Claude no pudo descargar el motor desde su entorno (jsDelivr bloqueado). Hacerlo desde un entorno con red o desde la PC del usuario.
- Cuándo: **después** de cerrar la etapa en curso, porque toca `index.html` y la CSP. Rama propia, pruebas y prueba en el Motorola.

## 4. Protección de `main` — DECISIÓN

- El usuario autorizó proteger `main`: exigir PR y la prueba `prueba-estatica` en verde, sin aprobaciones obligatorias y sin permitir saltarse la regla. Desde la sesión de Claude GitHub no permitió activarla, así que **la activa el usuario** en Settings → Branches. Verificar su estado antes de darla por hecha.
- Ninguna IA debe cambiarla ni desactivarla sin pedido expreso.
- Dato: hoy la publicación en GitHub Pages se dispara al subir a `main` y **no espera** al CI.

## 5. Autoría visible en la app — DECISIÓN

- En **Ajustes**, en una sección de información de la aplicación, debe figurar: **«Psicólogo Ignacio Lasarte · creador de la aplicación»**, junto con el nombre y la versión de la app. Hoy esa sección no existe: crear «Acerca de DictaNota».
- Texto fijo, escrito con `textContent`, sin enlaces ni orígenes nuevos, y sin nombres de IA en la interfaz (regla de `AGENTS.md`).
- Aprovechar el reordenamiento de Ajustes: Privacidad / Grabación y transcripción / Texto y anonimización / Datos / Acerca de. El pie actual («DELTA 11 · VERSIÓN DE PRUEBA») puede quedar.
- Agregar una prueba en `tests/delta.test.mjs`.

## 6. Pruebas en el Motorola — DECISIÓN

- El usuario las hará cuando estén implementados los cambios pendientes de esta etapa, **no fase por fase**. Se sigue informando en tres niveles: código guardado, pruebas técnicas y probado en el Motorola.

## 7. Orden sugerido — SUGERENCIA

1. Mostrar al usuario capturas reales de la estética ya publicada y corregir lo que pida.
2. Anonimización de la nota con original recuperable; después, de la hoja.
3. Nombres de pestañas, Biblioteca y sección «Acerca de» con la autoría.
4. Motor Whisper propio y ajuste de la CSP.
5. App de Android.
