# CONTINUAR AQUÍ — DictaNota

> **▶ ESTADO AL 17/11/2026 (Claude).** `main` incluye el PR #48 (Clínica editorial y correcciones móviles, unido el 16/11 a la noche) y, con el **PR #50**, el paso **E2** (audios cifrados y guardados con su nota), que integra el PR #47 sobre ese `main` y agrega una revisión independiente. **PRÓXIMO PASO: K1** (copia cifrada: exportar y verificar). Después: B3 → E3 → K2 → T → AO, según el tablero [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md).
> **Forma de trabajo acordada el 17/11** (detalle en AGENTS.md): plan contado al empezar, sin esperar aprobación; unión a `main` con CI en verde, salvo K2 y T; pruebas de laboratorio ampliadas y lista corta para el Motorola; los datos del celular del usuario son de prueba.
> **Pedidos del usuario tras usar la app en el Motorola (PR #49, documentación sin unir):** el editor chico ya se resolvió con el #48; siguen pendientes elegir cuaderno y nombre desde Dictar, y el voseo («querés» transcripto como «queréis»).
> **PR abiertos que no son de este plan:** #49 y #37 (documentación), #22 y #1 (borradores viejos). `main` sigue sin protección en GitHub.
> Nada de E1, E2 ni del #48 está probado en el Motorola. **Los bloques de abajo son anteriores y se conservan como historia**: donde digan que el #48 o E2 no están unidos, vale este.

> **Correcciones del PR #48 autorizadas por el usuario tras la revisión (16/11/2026, Argentina).** Base main `aab2b903`; PR visual inicial `b6ae882`. Rama local `correcciones-clinica-editorial-2026-11-16`, que actualiza el PR #48 (`visual-clinica-editorial-chatgpt-2026-11-16`). Compositor compacto vacío, editor amplio con el mismo `#text`, Volver sin descartar, aviso de Whisper con Detalles, micrófono visible en captura y ajustes de contraste/controles. El alcance ya incluye HTML y JS de presentación; **no es solamente CSS**. No se cambian almacenamiento, cifrado, captura, Worker ni modelos.
>
> Main sigue sin estas correcciones. E2/#47 permanece en `71bb17f`, separado; #49 contiene feedback posterior del Motorola y no se incorpora aquí. B3 (menús de notas) y el reproductor E3 no se adelantan. Pruebas nuevas: `tests/editor-browser.mjs`, añadidas al CI; datos ficticios y estados de captura/teclado simulados. **No fusionar ni publicar sin permiso. Motorola físico pendiente.**


> **▶ ESTADO AL 16/11/2026, 18:40 (Claude Fable 5.2).** En `main` ya están: la **Etapa N** (pestañas Dictar / Cuadernos; PR #43 de ChatGPT), la continuidad (PR #42) y el **diseño del almacenamiento cifrado** (PR #44). Los tres se unieron con permiso del usuario, con merge normal.
> **Actualización 16/11/2026, 19:20 (Claude Opus 5.5):** el PR #47 (E2) se corrigió tras la revisión de ChatGPT sobre `2c88ce1` (quitar la protección con audios, audios cruzados entre notas, Guardar sin confirmar, candado solo para audios, más audio incompleto, cancelar y audio dañado). Está listo para **una nueva revisión independiente**; sigue sin unir. Detalle en `CAMBIOS.md`.
> **E1 está unido a `main` (PR #45, `aab2b90`). E2 (audios cifrados por nota) está programado en el PR #47, a la espera de revisión y del permiso del usuario para unirlo. PRÓXIMO PASO, una vez unido E2: K1.** Nada de E1 ni de E2 está probado en el Motorola. Todo lo necesario está en el tablero de nombre fijo **[docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md)**: qué incluye cada paso (E1 → E2 → K1 → E3 → K2 → T → AO), de qué depende, su estado y las trece decisiones del usuario. Un paso por vez; **plan corto y permiso explícito antes de programar**. La Etapa B sigue pendiente y E3 la espera.
> Nada de lo unido hoy está probado en el Motorola. Los bloques de abajo son anteriores a estas uniones.

> **Etapa N — ChatGPT (Codex), 16/11/2026:** rama `etapa-n-dictar-cuadernos`, base `3383584`. Textos visibles: Dictar / Cuadernos / Anonimizar / Ajustes; hoja pasa a cuaderno. No cambian ids, claves, datos guardados ni motores. PR #36 y #41 ya integrados; PR #42 documental separado. Validación automática en el PR; Motorola pendiente. Merge normal, sin squash, solo con permiso para publicar.

> **Estado verificado por ChatGPT (Codex), 16/11/2026:** main = `3383584`. Los PR #36 (tema claro y chat) y #41 (Etapa A de Claude) ya están unidos. La rama `rediseno-04-clinica-chat-chatgpt` en `95bb587` no tiene trabajo pendiente de integrar. No repetir esas implementaciones.
> Esta actualización es documental, en rama nueva `continuidad-chatgpt-post-41`. No cambia la aplicación.

## Lecturas vigentes

1. [Decisiones del usuario](https://github.com/ignabidon/notas-voz/blob/0961e509505191c93b5afc3dedf21b1ae88660b8/docs/DECISIONES-USUARIO-2026-11-16.md): leídas en el commit de Claude; todavía no están en main. Su PR #37 se mantiene separado.
2. [Propuesta estética](docs/PROPUESTA-ESTETICA-2026-11-16.md), especialmente decisiones posteriores de la sección 6: los nombres **Dictar y Cuadernos** ya están elegidos y reemplazan la decisión parcial anterior.
3. [Traspaso de Claude](docs/TRASPASO-A-CHATGPT-2026-11-16.md): detalle de A y pendientes. Sus frases «#41 sin unir» quedaron superadas por el merge verificado.
4. AGENTS.md, SEGURIDAD.md, DISENO-CIFRADO.md, README.md y CAMBIOS.md antes de editar.

## Estado y próximos cambios

- Implementado en main: tema claro, notas en burbujas, inicio listo para grabar, acceso a hojas, ajustes visuales de la Etapa A. Actualmente las pestañas siguen siendo Audio / Notas / Anonimizar / Ajustes.
- Siguiente etapa N: cambiar textos visibles a **Dictar / Cuadernos / Anonimizar / Ajustes** y «hoja» a «cuaderno», sin renombrar ids internos ni claves. Plan: index.html, pruebas de rótulos y documentación; verificar las suites existentes y capturas a 360/412 px.
- Luego B1/B2/B3: compositor compacto, grabación inferior según visibilidad y menú de burbujas. Un PR por ítem.
- Anonimización: original persistente junto a versión anonimizada, primero por nota y después por cuaderno; elegir versión en cada exportación. El Deshacer actual no satisface persistencia al cerrar/reabrir.
- Audio en burbujas: incluye archivos importados solo con «Conservar audio» activo; cifrado y plan de almacenamiento antes de implementarlo. Sin resaltado de palabra durante reproducción.
- Pendientes también: motor y lamejs alojados en el repositorio, autoría humana en Acerca de, modo oscuro opcional y Android. No confundir decisiones con funcionalidades ya implementadas.
- No modificar PRs de Claude ni activar auto-merge. Nuevas ramas desde main actualizado y **merge normal, sin squash**; la apertura de un PR no autoriza su unión.

## Validación

Código: #36 y #41 integrados, confirmado por historial Git. Esta entrega solo corrige continuidad.
Pruebas técnicas de funcionalidad: consultar CI de cada entrega; esta actualización no modifica código ni agrega resultados de navegador.
Motorola: los cambios nuevos siguen sin validación física confirmada. El usuario hará la prueba conjunta al finalizar los pendientes de la etapa.

Los informes anteriores conservan valor histórico; sus afirmaciones de que falta el tema claro o el chat ya no describen main.
