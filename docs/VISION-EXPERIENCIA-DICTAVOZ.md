# DictaVoz — Visión de experiencia futura (17/11/2026)

> **Documento de decisiones de producto, no orden de implementación.** Registrado por ChatGPT a pedido del usuario mientras se encuentra pausada otra tarea de Claude. No cambia código, datos, formatos, cifrado, pruebas ni prioridades del tablero. **No fusionar este PR sin confirmación del usuario.**
>
> **Para Claude y otras IA:** leer antes de diseñar B3, E3, selección de destino, editor o AO. Mantener la ejecución de las etapas del `docs/PLAN-ALMACENAMIENTO-CIFRADO.md`; no ampliar su alcance de oficio. Si alguna decisión de esta visión choca con el diseño de almacenamiento/seguridad o el código existente, señalarlo antes de programar. Las decisiones funcionales aquí expresan la experiencia deseada, **no garantizan que ya esté implementada**.

## Decisiones de experiencia confirmadas por el usuario

1. **Recorrido continuo:** al abrir normalmente la app se ve la grabadora; la bienvenida se muestra solo en el primer uso (y puede consultarse desde Ajustes). Grabar → pausar/reanudar/detener → mostrar progreso de transcripción → abrir automáticamente el cuaderno de destino con la transcripción como **mensaje borrador sin enviar** → revisar/corregir → **Guardar** (ícono de envío acompañado de texto claro) → nueva burbuja con el texto y, cuando se eligió conservarlo, su audio asociado. Guardar **no significa enviar por Internet**.
2. **Revisión en el propio cuaderno (opción A elegida expresamente):** el cuaderno es una conversación personal con notas en burbujas, ordenadas temporalmente, semejante en interacción a un chat de WhatsApp. La transcripción nueva aparece en ese contexto y puede editarse antes de confirmar. Para textos largos, prever editor expandible sin cambiar el destino ni perder el borrador.
3. **Destino opcional antes de grabar:** en Dictar/DictaVoz se puede elegir un cuaderno existente o crear uno; si no se elige, usar destino predeterminado. La elección no debe ser un obstáculo para grabar con un toque. El cuaderno tiene nombre editable.
4. **Título opcional:** permitir nombrar la nota antes de grabar; si no se nombra, generar uno automáticamente (por ejemplo basado en fecha/hora), editable posteriormente. Distinguir el título de la nota del nombre del cuaderno y preservar los sellos de guardado existentes.
5. **Audio y texto como una nota:** al confirmar el borrador, conservar la asociación entre transcripción y audio si «Conservar audio» estaba activo. El audio se reproduce **dentro de la burbuja** cuando E3 esté implementado; no crear un reproductor separado como experiencia principal. La grabación y el borrador no deben perderse silenciosamente por error de transcripción, navegación o interrupción; estudiar los casos de recuperación dentro de las garantías existentes, sin prometer persistencia no probada.
6. **Anonimización posterior:** no interrumpir el recorrido habitual de grabar/revisar/guardar. El original debe seguir recuperable; la versión anonimizada es una representación distinta, revisable antes de copiar/exportar. Nunca reemplazar silenciosamente el original.

## Propuestas para estudiar, NO aprobadas como especificación técnica

- Reglas de anonimización por palabra/nombre/patrón: censura, sustitución por alias y códigos seudónimos estables o nuevos. **Pendiente decidir** alcance de cada regla, persistencia de correspondencias, colisiones, seguridad y efecto sobre exportaciones. Un código estable puede permitir reidentificación; no equiparar automáticamente seudonimización con anonimización irreversible.
- Renombrar la primera pestaña de «Dictar» a **«DictaVoz»**; nombre de producto candidato escrito exactamente así, lema «Tus palabras, bajo tu control», bienvenida publicitaria «¡Nuevo DictaVoz!» y «¡Con anonimización de datos incorporada!». **No cambiar aún nombre visible, repositorio, rutas ni claves históricas.**
- Estética editorial cálida: marfil, azul petróleo, verde salvia; versión oscura por explorar. Imágenes y maquetas son **referencias conceptuales**, no pantallas implementadas ni especificaciones de color, accesibilidad o geometría.
- Selector de cuaderno/título compacto o desplegable arriba del micrófono; barra inferior de cuatro destinos; controles de grabación visibles y cómodos en Motorola G56 5G. Validar tamaños táctiles, teclado, pantalla pequeña y estados de grabación reales antes de decidir detalles visuales.

## Relación con las etapas técnicas

- **B3 (menú de burbujas):** diseñar acciones discretas sin impedir que la burbuja contenga texto y reproductor. No adelantar la nueva experiencia de editor salvo autorización específica.
- **E3 (reproductor):** integrarlo en la burbuja de la nota, con texto asociado y controles accesibles; respetar las reglas de audio cifrado y las dependencias del tablero.
- **K2 y T:** mantener prioridades y garantías de restauración/migración; no modificar formatos por motivos estéticos. Requieren consulta previa al usuario conforme al tablero.
- **AO:** antes de implementar, acordar el comportamiento exacto de reglas, códigos y original recuperable; preservar el diseño de seguridad.
- **Selección previa de cuaderno, título y navegación automática al borrador:** son objetivos futuros; no introducirlos furtivamente en B3/E3.

## Criterio de entrega futuro

Antes de implementar la interfaz definitiva, preparar prototipos de bienvenida, grabadora en reposo/grabando/pausada/transcribiendo, cuaderno con borrador y audio, anonimización y ajustes; luego una guía de componentes/estados/accesibilidad. Revisar diferencias con `main` y PR abiertos. **No interpretar este documento como autorización para implementar ni fusionar cambios.**
