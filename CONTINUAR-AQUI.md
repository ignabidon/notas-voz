# CONTINUAR AQUÍ — DictaNota

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
