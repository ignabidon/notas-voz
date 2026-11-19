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

## Comentario del usuario: ausencia del reproductor en Cuadernos (19/11/2026)
- **Diagnóstico en código**: el reproductor E3 se crea en `renderConv()` solamente cuando `entry.audioId` existe. El código guarda y asocia audio a una nota únicamente con la bóveda abierta y `Conservar audio` activado **antes** de grabar. Sin bóveda, conservar audio usa la biblioteca histórica, separada de las notas. Esto ya sucedía en `main`: no es una regresión causada por las reglas visuales de esta beta.
- Se añade en el cuaderno abierto una guía, solo si alguna nota de voz guardada tiene texto pero carece de audio asociado, y un acceso a Ajustes. La descripción de «Conservar audio» explica las dos condiciones. El reproductor existente no se oculta ni se cambia.
- Las notas antiguas sin audio asociado no ganan audio automáticamente. No migrar ni copiar grabaciones históricas, y no afirmar que se pueden recuperar si `Conservar audio` estaba apagado.
- Prueba en `tests/e3-browser.mjs` con datos inventados: muestra/oculta guía, destino del acceso a Ajustes, no interfiere con reproductor de otra nota, mantiene 48 px de superficie táctil.
- Pendiente: validar en Motorola con protección activada, `Conservar audio` activado y una grabación **nueva**. Si tampoco aparece entonces, analizar error real de almacenamiento/candado/cierre de audio sin poner en riesgo los datos.
