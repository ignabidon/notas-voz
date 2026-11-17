# DictaVoz — Visión de producto y experiencia futura

> **Actualización del 17/11/2026 · ChatGPT, decisiones relatadas por el usuario.** Documento de producto, no autorización para editar la aplicación. Los diseños son referencias, no funcionalidad disponible. **Este PR #52 está en borrador: no fusionar sin permiso.**
>
> **Para Claude y otras IA:** cotejar siempre el `main` y los PR abiertos antes de implementar. Leer también `AGENTS.md`, `SEGURIDAD.md`, `CONTINUAR-AQUI.md` y `docs/PLAN-ALMACENAMIENTO-CIFRADO.md`. Si estas decisiones afectan modelos de datos, audio cifrado, guardado o restauración, elaborar plan y pruebas; no modificar K2, T ni otras etapas como cambio estético o «de paso». Si hay contradicción entre esta visión y el diseño de seguridad vigente, señalarla al usuario.
>
> **Estado verificado en main (`7171650`, 17/11):** nombre visible **DictaVoz** implementado (PR #57), B3 (menú de burbujas, PR #53), E3 (reproductor en cada nota, PR #55) y K1 (crear/verificar copia, PR #51) incorporados. **K2, T y AO siguen pendientes**; K2 y T requieren consulta previa al usuario. El nombre de la primera pestaña y la experiencia de llegada automática al borrador no deben confundirse con el nombre visible de la app. No reimplementar B3/E3.

## Decisiones confirmadas de experiencia

1. **Destino de grabaciones sin elección:** si el usuario no selecciona cuaderno, **crear un cuaderno nuevo con el nombre de la fecha y hora** al guardar; no utilizar «Notas rápidas» ni el último cuaderno. Esto **ya ocurre** al guardar desde la captura global. Elegir un cuaderno existente antes de grabar debe ser opcional y fácil, y no impedir grabar con un toque. Mantener su nombre editable.
2. **Título de la nota opcional:** permitir asignarlo antes de grabar y cambiarlo después; si se omite, usar nombre automático apropiado. **Diferenciar «título de cuaderno» de «título de mensaje/nota»:** el sistema actual ya genera el nombre del cuaderno, pero no debe darse por implementado el campo de título individual.
3. **Recorrido deseado:** abrir en grabadora (salvo bienvenida en primer uso); grabar, pausar/reanudar y detener; mostrar transcripción; al terminar **abrir automáticamente el cuaderno correspondiente con texto en el compositor como mensaje sin enviar**; revisar, corregir y tocar **Guardar** para crear la burbuja. «Enviar» es metáfora visual de mensajería, **nunca envío a un servidor**.
4. **No guardar automáticamente la transcripción como mensaje definitivo:** el usuario avaló explícitamente revisar primero (en especial nombres, negaciones, etc.). Si sale y vuelve, conservar el borrador como un mensaje escrito en WhatsApp que aún no se envió. El borrador actual **ya se autoguarda** periódicamente y se intenta restaurar tras recarga; verificar las condiciones de error y recuperación con pruebas, no prometer que puede continuar una transcripción si el navegador cerró su proceso.
5. **Texto prioritario, audio compacto:** en un cuaderno abierto cada nota es una burbuja cronológica. Si tiene audio, su pequeño reproductor está **siempre visible junto al texto**, pero el audio **solo se descifra/reproduce al tocar Reproducir**. El reproductor E3 **ya existe**; un minirreproductor más compacto es una propuesta de presentación, con duración, acceso a pausa y avance y objetivos táctiles accesibles. La vista debe permitir un editor expandible para textos extensos.
6. **«Conservar audio» manda:** **si estaba desactivado, NO guardar el audio aunque Whisper falle**; el usuario acepta que se pierda y desea que se le advierta con claridad. No introducir almacenamiento automático excepcional ni prometer recuperación de grabaciones no retenidas. Si estaba activado, preservar el audio y su vínculo, sujeto a las garantías de guardado existentes.
7. **Anonimización después del guardado:** el original debe quedar recuperable, la versión anonimizada revisable antes de copiar o exportar, sin sobrescribir silenciosamente el original.

## Mejora funcional solicitada: fallo de Whisper con audio conservado

**Objetivo confirmado:** si la transcripción falla y «Conservar audio» estaba activo, el usuario debe poder **guardar el audio como una nota sin transcripción**, reproducirlo dentro de su cuaderno, reintentar transcribir y añadir texto manual (o una etiqueta, si más adelante se define cómo se representan etiquetas por nota). Mostrar un mensaje claro: «No se pudo transcribir. El audio se conservó; podés escucharlo y agregar texto o reintentar». Para fallo parcial, conservar texto útil y marcar qué parte falta.

**Estado real del código (main `7171650`):** `convHasContent` y `convAddEntry` contemplan entradas con audio y texto vacío; `convSave` actualmente se niega a guardar si el texto está vacío. E3 tiene una ruta **manual de recuperación de audio sin nota desde Ajustes**, que crea una nota con texto «Audio recuperado (sin transcripción).». `fail()` deja aviso, pero no ofrece el recorrido inmediato desde el cuaderno. Por lo tanto, **la experiencia solicitada no está implementada**, aunque hay componentes reutilizables.

**Pautas de implementación futura (no ejecutadas):**
- Ofrecer un estado de fallo en el propio compositor/cuaderno, con opciones **«Guardar solo audio», «Reintentar transcripción» y «Escribir nota»**, sin obligar a inventar texto de relleno.
- Al confirmar, establecer el estado de transcripción fallida/pendiente de forma explícita (verificar `transcriptionStatus` y su uso real), guardar audio y referencia **atómicamente o con recuperación comprobada**, nunca declarar éxito antes de persistir el vínculo cifrado.
- Si falla y no se había conservado audio, mostrar un mensaje veraz de que no puede recuperarse; permitir igualmente escribir una nota manual.
- No reusar por error el audio de otra nota ni borrar un audio confirmado al cancelar un borrador; preservar las defensas de E2, la restricción de una sola pestaña y la consistencia de la copia K1/K2.
- Probar con Whisper que falla antes de producir texto, al fallar una parte, al cerrar la página y al volver; con/sin protección, con/sin «Conservar audio», con espacio insuficiente, dos pestañas, guardado/edición/cancelación y audio dañado. Usar datos y audios inventados; verificar luego en Motorola solo lo que no se reproduce en laboratorio.

## Preferencias visuales a estudiar y validar, NO implementadas

- **Conservar audio activado por defecto y ajuste principal en Ajustes, fuera de la pantalla de grabar.** Es una **propuesta reciente del usuario**, formulada tentativamente. Recomendada para simplificar la grabadora, **pero no modificar el valor predeterminado ni esconder el control sin evaluar privacidad, almacenamiento y comportamiento al actualizar configuraciones existentes**. Aunque se mueva a Ajustes, mostrar arriba de Dictar un estado corto y legible «Audio: se conserva / no se conserva» con acceso fácil al ajuste; no ocultar que una grabación quedará retenida, y bloquear cambios a mitad de captura.
- **Estética:** «Clínica editorial» evolucionada a editorial cálida (marfil, azul petróleo, verde salvia), alternativa oscura futura; textos claros en español, espacio para leer, un solo control dominante, navegación inferior de cuatro pestañas, comodidad a una mano en Motorola G56 5G. Paleta/íconos/tipografías definitivas pendientes.
- **Identidad:** el **nombre de producto DictaVoz ya está incorporado**. La bienvenida «¡Nuevo DictaVoz!» y el lema «Tus palabras, bajo tu control» son propuestas estéticas; la primera pestaña todavía puede llamarse «Dictar»: verificar antes de renombrarla. No tocar URL, repositorio, extensiones de copia ni claves internas.
- **Anonimización con reglas:** censura, sustitución por alias y códigos constantes o aleatorios son propuestas por definir antes de AO. Precisar alcance, persistencia, exposición de equivalencias, reversibilidad y exportación; no equiparar seudónimos con anonimización irreversible.

## Relación con el plan vigente

- **B3/E3: ya integrados**. Aplicar sus fundamentos visuales en futuras maquetas; no volver a programarlos.
- **K2/T:** mantener sus restricciones y pedir la consulta previa correspondiente. No usar esta visión para cambiar el formato de copias ni migraciones.
- **AO:** concretar reglas y recuperación del original antes de programar.
- **Cambios de experiencia posteriores:** selector de cuaderno antes de grabar; título de nota individual; navegar al borrador al transcribir; guardar solo audio ante fallo; simplificar la retención en Ajustes. Requieren diseño, alcance y pruebas propios; no forman parte automáticamente de K2/T.

## Prototipos pendientes

Crear pantallas coherentes de bienvenida, grabadora en reposo/grabando/pausa/transcripción, cuaderno con borrador, nota con minirreproductor y fallo de Whisper con audio recuperable, anonimización y Ajustes, para tema claro y oscuro. Acompañar cada imagen con comportamiento, estados, medidas táctiles y criterios de accesibilidad. **Las imágenes no son código ni aprobación para alterar la app.** Ver también `docs/PROPUESTA-ESTETICA-2026-11-16.md`.
