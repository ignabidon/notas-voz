# DictaVoz — Beta visual compacta (19/11/2026)

## Alcance y base
- Base exacta: `main` en `edfacda113833ed871781a16404d79e455743935` (incluye U19, PR #70).
- Implementación: ChatGPT, diseñador visual; rama `beta-diseno-compacto-2026-11-19`.
- Es **una rama alternativa**: no reemplazar `main`, no publicar como aplicación oficial y no fusionar sin decisión expresa del propietario.
- Se modifica la presentación de la misma aplicación (`index.html`), no se crea una segunda aplicación dentro de `main`.

## Cambios
1. Notas: Copiar y Editar usan iconos de 21 px; ⋯ sigue visible. Los tres conservan áreas táctiles de **48 px como mínimo**, nombres accesibles, foco visible y un borde discreto de contraste suficiente.
2. Burbujas más compactas: menos relleno, separaciones y divisores, sin reducir el tamaño de lectura.
3. Cuadernos: tarjetas más sobrias y densas; se conserva el resumen, fecha y vista previa optativa.
4. Ajustes: acceso **Motor y modelo de transcripción** al comienzo (Whisper y modelo vigente, actualizados si el usuario cambia el ajuste). En Calidad de transcripción se muestra primero la elección del motor.
5. Escala y ritmo: opciones de cuaderno a 48 px; filas de Ajustes más ajustadas sin bajar de 48 px.
6. Dictar: accesos secundarios con menos peso, grabar y cronómetro intactos.
7. Aviso de transcripción: menos margen y sombra, los controles de detener o cancelar siguen existiendo.
8. Anonimizar: separaciones y contenedores compactos.
9. Acabado: menos sombras en tarjetas de notas/cuadernos; mismos colores variables para claro/nocturno, sin fuentes nuevas.
10. Marca `BETA` visual al lado del título y nota de prueba en el pie.

## Seguridad y publicación de prueba
- No cambiar `localStorage`, IndexedDB, cifrado, biometría, audios, claves, CSP, orígenes de aplicación, modelos ni dependencias.
- **Usar solo datos ficticios**. La vista previa de rama, si se comparte mediante `raw.githack.com`, es un intermediario **de terceros ajeno a GitHub**. Tiene origen diferente a GitHub Pages y no comparte el almacenamiento del sitio oficial por la política del navegador, pero los datos introducidos en ese origen no deben considerarse resguardados ni adecuados para información clínica.
- `raw.githack.com` es un servicio de vista previa y no un hosting clínico ni una garantía de disponibilidad. No habilitar datos reales ni copias sobre esa URL. Una publicación definitiva requerirá revisar seguridad y probarla en el dominio oficial después de aprobación.

## Comprobaciones que faltan
- Ejecutar CI de GitHub para descartar regresiones; verificar con datos ficticios los controles de las notas, el resumen del modelo y los dos modos de apariencia.
- Prueba física en el Motorola G56 5G aún pendiente. Revisar con 360/412 px y tamaños de texto normal/grande.
- Confirmar que cualquier vista previa abre y renderiza efectivamente en el teléfono; el estado del servicio externo no está garantizado.

## Evolución funcional: audio adjunto sin contraseña (19/11/2026)

**Pedido expreso del usuario (decisión A13):** «Conservar audio» adjunta siempre el audio original a la nota, tanto si la protección está activada como si no. El botón grande de ayuda «¿Por qué no aparece Reproducir?» se **retiró por completo**, porque ocupaba demasiado espacio y no era descartable.

### Diseño de la beta

- Con protección abierta: conserva sin cambios el circuito E2 de audio cifrado y el reproductor E3.
- Sin protección: graba por partes en `notasvoz-dictanota-audio`, con metadatos que indican `mode: 'claro'` y SHA-256 por fragmento. Las cargas de archivos también se vinculan a la nota. El guardado valida ficha completa, número de partes y comprobación de integridad antes de vincular el audio.
- Un mismo reproductor E3 reconoce ambos modos. El audio no se carga hasta tocar Reproducir; no se reproducen varios a la vez y se libera al salir de la nota/pestaña.
- El menú ⋯ permite quitar el audio y conserva el texto. Los audios sin nota se pueden recuperar desde Espacio si están íntegros; los fragmentos dañados o incompletos se conservan sin inventar vínculos.
- Las copias completas de la beta **usan formato 2 si hay audio en claro**; los bytes sin cifrar se cifran dentro del archivo con la contraseña de la copia. Sin audios en claro permanece formato 1. La verificación acepta ambos; K2 ya reconoce formato 2 para restauración en una instalación vacía. No cambiar el archivo fijo ni el formato 1.
- Una copia de solo texto excluye las grabaciones con aviso; una copia completa con fragmentos que no se pueden incluir se señala como incompleta. K2 de reemplazo sigue rechazando un respaldo previo que excluya audios.
- No hay migración automática de audios históricos de la biblioteca «última/anterior» ni unión retrospectiva a una nota. Si se activa la protección teniendo audios de notas previamente guardados sin cifrar, **estos no se cifran automáticamente todavía**. El modo sigue indicado «SIN CIFRAR» en Espacio. Esta migración futura requiere transición verificada de vínculos y respaldo previo, sin borrar originales hasta confirmar.
- La beta se distribuye desde `raw.githack.com` y debe usarse **solo con información ficticia**. El respaldo de formato 2 se habilita únicamente dentro de esta rama experimental; esto no autoriza publicarlo en `main` sin nuevas pruebas y revisión.

### Pruebas

- `tests/beta-audio-claro-browser.mjs`: Chrome aislado, WAV y MediaRecorder sintéticos, audio vinculado, varias partes, reproductor y copia completa de formato 2. Incluido en GitHub Actions.
- Se conservan pruebas cifradas E2/E3, restauración K2 y biblioteca P2; se actualizan únicamente expectativas antiguas expresamente sustituidas por A13.
- Prueba física en Motorola y con varios casos de transición cifrada/sin cifrar pendiente. No usar datos clínicos reales.

