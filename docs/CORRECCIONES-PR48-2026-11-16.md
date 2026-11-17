# Correcciones de Clínica editorial — PR #48

**16/11/2026 (Argentina) · ChatGPT (Codex).** Autorizadas por el usuario después de la revisión independiente: «continua con esas correcciones entonces». Main verificado en `aab2b903`; versión revisada de #48 `b6ae882`. Rama local `correcciones-clinica-editorial-2026-11-16`; entrega en la rama existente de #48. Sin unión a main ni publicación.

## Resultado para quien usa DictaNota

- **Leer:** al abrir un cuaderno, el compositor vacío queda en una línea con acceso a escribir y grabar. La barra ocupa alrededor de 138 px de 740 en el caso normal de 360 px; antes rondaba 364 px. Las acciones de la nota quedan accesibles.
- **Escribir y corregir:** se amplía el mismo editor al iniciar una nota, tocar Editar, recuperar un borrador o recibir una transcripción. No se crea otra copia del texto. **Volver** minimiza sin guardar ni descartar; **Guardar** confirma la edición y **Cancelar edición** conserva la nota guardada y su sello. Un editor normal a 360 px pasa de unos 90 px a casi 500 px; con 360 px de altura visible y teclado simulado, de 76 a unos 140 px. Cuando hay transcripción pendiente, parte del espacio se reserva para estado y cancelación.
- **Capturar:** aviso único de Whisper resumido con **Detalles** ampliables. No hay otro motor ni temporizadores nuevos. Se reducen espacios/títulos secundarios en pantallas cortas y, si además son estrechas, el reloj pasa al lado del micrófono para que ambos queden completos. Los textos indican Grabando, Grabación en pausa o Transcribiendo. Pausar/Reanudar y Detener mantienen sus controles originales y siguen disponibles en las cuatro pestañas.
- **Encontrar acciones:** Grabar inferior aparece en Dictar si el círculo sale de la vista; en Cuadernos es secundario. Guardar aparece con texto. Borrar mantiene rojo, Reanudar conserva contraste en la tarjeta de captura, las acciones admiten letra Grande y los controles tienen bordes más visibles. El encabezado se adapta a nombres largos sin desbordar.
- **Teclado y procesamiento juntos:** el estado y Cancelar transcripción se compactan para dejar accesibles Guardar y Cancelar edición. Volver permite salir de la vista ampliada sin perder el borrador y consultar los detalles.

## Capturas de Chromium, con datos ficticios

Son pantallas simuladas; **no son fotografías ni pruebas del Motorola**. Las fechas visibles se generaron durante cada ejecución y no representan datos reales.

| Estado | 360 px | 412 px |
| --- | --- | --- |
| Cuaderno en lectura | [Ver](capturas/clinica-editorial-corregida-cuadernos-360.png) | [Ver](capturas/clinica-editorial-corregida-cuadernos-412.png) |
| Grabando | [Ver](capturas/clinica-editorial-corregida-grabando-360.png) | [Ver](capturas/clinica-editorial-corregida-grabando-412.png) |
| Editor amplio | [Ver](capturas/clinica-editorial-corregida-editor-360.png) | — |
| Teclado simulado | [320 px](capturas/clinica-editorial-corregida-teclado-320.png) | [Ver](capturas/clinica-editorial-corregida-teclado-412.png) |
| Pausa | — | [Ver](capturas/clinica-editorial-corregida-pausa-412.png) |

## Verificaciones técnicas

- Node: **139/139**.
- Chromium: `browser.mjs`, `cifrado-browser.mjs`, `audio-nota-browser.mjs`, `notas-browser.mjs` y nueva `editor-browser.mjs`.
- La suite nueva comprueba lectura compacta; nombres largos; edición y teclado a 320/360/412 px, Normal/Grande; llegada de transcripción; controles alcanzables; herramientas y diálogo de corrección; Volver sin descartar ni cambiar destino; edición sin alterar el sello; cancelar; recuperación del borrador; captura/pausa y navegación por cuatro vistas; prioridad de controles nativos simulados; detalles y contraste de bordes ≥3:1. También cubre teclado con procesamiento pendiente, Guardar y ambas cancelaciones.
- La pausa y reanudación pasan por el botón original; las capturas usan estado de grabación simulado. **No se utilizó micrófono físico ni inferencia Whisper real.** La protección de navegador se valida con un autenticador virtual, no con huella real del Motorola.
- Se compararon contra `b6ae882` y permanecen idénticos: `workerBody`, captura, inicio/fin de Whisper, preparación de modelo, pausa/reanudación, guardado del borrador, almacén de cuadernos y bóveda. La CSP también es idéntica. No hay dependencias ni orígenes nuevos.
- El CI incluye la nueva suite. Consultar el resultado del commit actual en el PR.

## Coordinación y límites

El alcance de #48 **ya incluye HTML y JavaScript de presentación**, además de CSS; su descripción inicial de «solo CSS» quedó superada por estas correcciones autorizadas. No cambia claves, formatos, migraciones, datos almacenados, cifrado, audio ni modelo de transcripción. El estado de ampliación vive solo en memoria y se descarta con la página.

E2/#47 (`71bb17f`) permanece separado, sin cambios por esta entrega. Como ambos PR tocan index.html y documentación, su futura integración necesita resolver los cruces y ejecutar las pruebas de E2 sobre el resultado. No se afirma que una combinación no probada haya quedado validada.

#49 (`19770c7`) recoge el feedback real del propietario, incluido el editor pequeño y la reproducción satisfactoria del audio descargado. No se incorporan sus cambios documentales ni se extiende esa confirmación a estas pantallas nuevas. B3 (menús), E3 (reproductor), selector de destino y correcciones del voseo quedan fuera de esta entrega.

## Validación personal pendiente

En Motorola G56 5G, con información inventada: comodidad con una mano; teclado y selección reales; tamaños de letra/pantalla de Android; grabar, pausar, reanudar y cambiar de pestaña; revisar una transcripción larga; Volver/Guardar/Cancelar; cerrar y reabrir el borrador y una edición guardada; ayudas de privacidad y protección con huella real. No dar por completada esta validación por los resultados de Chromium.
