# DictaVoz · Registro único de decisiones de Ignacio

> **Qué es:** la única lista de decisiones del propietario. Reúne lo que antes estaba repartido en `AGENTS.md`, el tablero, el diseño cifrado, la propuesta estética, el informe de continuidad y las descripciones de los PR. Creado el 17/11/2026 (Claude, solo documentación).
> **Regla:** si algo no está acá, **no está decidido**. Ninguna IA decide por Ignacio ni toma una descripción de PR como permiso.
> **Cómo leer la columna «Fuente»:** `chat` = lo dijo Ignacio en una conversación y quedó escrito en un documento de `main`; **`PR #n (sin unir)`** = lo cuenta la descripción de un PR que todavía no está en `main`. **Ignacio: confirmá o corregí las filas de esa clase**, porque no hay otro registro de ellas.
> **Estados:** Vigente · Hecho (ya en `main`) · En curso (en un PR) · Pendiente (decidido, sin hacer) · **A decidir** (todavía no respondió).

## Cómo se anota una decisión nueva

Una línea con ID nuevo, fecha, la frase de Ignacio lo más literal posible y la fuente. Si reemplaza a otra, se cambia el estado de la vieja a «Reemplazada por X» (**no se borra**). Los demás documentos solo citan el ID.

---

## D · Almacenamiento cifrado (16/11/2026, fuente: diseño y tablero)

| ID | Decisión | Estado |
|---|---|---|
| D1 | Los originales de notas anonimizadas se guardan solo con la protección cifrada activa | Vigente (AO pendiente) |
| D2 | Los audios por nota se guardan solo con la protección cifrada activa; sin protección, «Conservar audio» sigue como antes | Vigente, **en revisión por A2** |
| D3 | Al quitar la protección: ofrecer copia, borrar los audios por nota y preguntar qué hacer con los originales | Vigente (AO pendiente; hoy no se puede quitar la protección si hay audios) |
| D4 | Tope de 30 MB para cargar un archivo de audio | Hecho (E2) |
| D5 | Copia cifrada: elegir cada vez «Completa» o «Solo texto» | Hecho (K1) |
| D6 | Restaurar solo en app vacía, o reemplazando todo con doble confirmación | Pendiente (K2) |
| D7 | El audio suelto viejo no se migra; aviso con Descargar y Borrar | Hecho (E3) |
| D8 | Los audios sin nota no se borran solos; lista en Ajustes | Hecho (E3) |
| D9 | Exportar «anonimizada» con notas sin anonimizar: avisar cuántas son | Pendiente (AO) |
| D10 | El código de recuperación es único; cambia solo a pedido, con contraseña | Hecho |
| D11 | La app se bloquea a los 15 minutos aunque suene un audio | Hecho (E3) |
| D12 | La copia cifrada va antes del reproductor | Hecho |
| D13 | El texto se muda al depósito grande (IndexedDB) antes de los originales. **Actualizada el 17/11 (chat): en la misma base que los audios** (ver A9) | Pendiente (T) |

**Descartado (16/11):** entrar con una cuenta (Gmail u otra), ligar la huella a Google, copia en Google Drive y botón directo a Google Docs. **App de Android:** después del plan; entre conocidos, como experimental, pasando el archivo de instalación.

## U · Experiencia y estética

| ID | Decisión | Fecha | Fuente | Estado |
|---|---|---|---|---|
| U1 | Estética «Clínica contemporánea» (clara, azul petróleo), móvil primero, pensada para una futura app de Android | 16/11 | chat | Hecho (#36, #48) |
| U2 | Pestañas **Dictar · Cuadernos · Anonimizar · Ajustes**; en la interfaz «hoja» pasa a «cuaderno» | 16/11 | chat | Hecho (#43) |
| U3 | «Grabar» inferior en Dictar solo cuando el círculo no se ve | 16/11 | chat | Hecho (#48) |
| U4 | Menú «⋯» en las notas y vista previa en la lista (activada por defecto, con interruptor) | 16/11 | chat | Hecho (B3 #53) |
| U5 | Modo oscuro **opcional** | 16/11 | chat | Pendiente (Etapa D) |
| U6 | Audio dentro de la burbuja, estilo WhatsApp, **sin** resaltar la palabra que suena. Los audios cargados se guardan unidos a su nota y obedecen «Conservar audio» (apagado = no se guardan) | 16/11 | chat | Hecho (E2, E3) |
| U7 | Guardar es explícito; el sello de guardado de cada nota es inmutable; título de un cuaderno nuevo = fecha y hora; captura global → cuaderno nuevo, dentro de un cuaderno → se agrega ahí | 16/11 | chat | Hecho |
| U8 | Anonimización: el original se guarda junto a la versión anonimizada y se recupera fácil (mantener apretada la burbuja); al exportar se elige cada vez | 16/11 | PR #37 (sin unir) | Pendiente (AO) |
| U9 | Autoría visible solo en Ajustes: «Psicólogo Ignacio Lasarte · creador de la aplicación». Sin nombres de IA en la interfaz | 16/11 | PR #37 (sin unir) | Pendiente |
| U10 | Motor Whisper y lamejs dentro del repositorio (sacar jsDelivr de la CSP). Modelos dentro o descargados una vez: **sin decidir** | 16/11 | PR #37 (sin unir) | Pendiente |
| U11 | Proteger `main` en GitHub. Lo activa Ignacio | 16/11 | chat | **Pendiente: `main` sigue sin protección (verificado 17/11)** |
| U12 | Elegir cuaderno y nombre desde Dictar (por defecto, uno nuevo con fecha y hora) | 17/11 | PR #49 y #52 (sin unir) | Pendiente |
| U13 | Revisar la transcripción como borrador dentro del cuaderno y confirmar a mano; conservar borradores al volver a la app | 17/11 | PR #52 (sin unir) | En curso (#59) |
| U14 | Si Whisper falla y «Conservar audio» estaba activado: mostrar el audio en el cuaderno y permitir «guardar solo audio», reintentar y escribir a mano. Si estaba desactivado: no guardar el audio | 17/11 | PR #52 (sin unir) | En curso (#59 hace «guardar solo audio»; falta reintentar) |
| U15 | Reproductor compacto en la misma burbuja, con prioridad visual para el texto | 17/11 | PR #52 (sin unir) | Pendiente |
| U16 | **Prioridad de mejoras de uso** (después de las revisiones cruzadas): primero **elegir cuaderno y nombre desde Dictar** (U12) y el **rediseño de Ajustes** (primero una maqueta; no se programa hasta que Ignacio la apruebe). No eligió por ahora: reintentar Whisper desde el audio guardado (U14, parte pendiente) ni deshacer una edición guardada | 17/11 | chat | Vigente |

## W · Forma de trabajo

| ID | Decisión | Fecha | Fuente | Estado |
|---|---|---|---|---|
| W1 | El plan de cada paso se le cuenta a Ignacio en lenguaje simple al empezar, **sin esperar su aprobación**, **salvo T**, donde sí se espera su permiso explícito. K2 ya fue autorizado (A4, A5) | 17/11 | chat (sesión con Claude); K2 actualizado el 17/11 | Vigente. **Otra IA debe confirmarla con Ignacio antes de aplicarla** (así lo dice `AGENTS.md`) |
| W2 | Se puede unir a `main` con el CI en verde (merge normal, sin squash), **salvo T** (permiso explícito). K2 se une según A5 | 17/11 | chat (sesión con Claude); K2 actualizado el 17/11 | Vigente, misma condición que W1 |
| W3 | Las pruebas que Ignacio no puede hacer en el celular no frenan el avance: se prueba todo en laboratorio y se le deja una lista corta. Nunca se escribe «probado en el Motorola» sin su confirmación. Para la Entrega 2 no se hacen pruebas físicas | 17/11 | chat; PR #60 (sin unir) | Vigente |
| W4 | Todo lo guardado hoy en su celular son **datos de prueba** y pueden descartarse; **no autoriza borrar nada** sin pedido aparte, salvo lo que Ignacio autorizó en A8. Los datos futuros sí se protegen con rigor | 17/11 | chat; auditoría #58 (sin unir) | Vigente |
| W5 | La app se llama **DictaVoz**; cambia solo lo visible (el repositorio, las claves internas y la extensión `.dictanota` no cambian) | 17/11 | chat | Hecho (#57) |

## A · Arquitectura B y almacenamiento (17/11)

| ID | Decisión | Fecha | Fuente | Estado |
|---|---|---|---|---|
| A1 | Adoptar la **arquitectura B**: una biblioteca única de audio sobre `notasvoz-dictanota-audio`, aprovechando E1–E3 y K1. No autoriza por sí sola borrados, T, AO ni cambios de formatos | 17/11 | **chat: confirmada por Ignacio** (consta también en PR #59) | Vigente; en curso (#59) |
| A2 | Permitir guardar audio **sin protección**, con advertencia inequívoca de que no está cifrado. **No se habilita** ese recorrido hasta que una copia y una restauración lo cubran. Refina D2 | 17/11 | **chat: confirmada por Ignacio** (PR #59) | Vigente; en curso |
| A3 | Seguir con la biblioteca unificada (fase P2 de la auditoría) y un **formato 2** de copia, solo en laboratorio. El formato 1 y su archivo fijo no se tocan. Publicar el formato 2 pide permiso aparte | 17/11 | **chat: confirmada por Ignacio** (PR #60) | Vigente; en curso (#60) |
| A4 | **K2 autorizado: el ensayo en instalación vacía y también el reemplazo de datos existentes**, con respaldo verificado previo y doble confirmación (D6) | 17/11 | chat | Vigente. En #61 solo existe el ensayo; **el reemplazo todavía no está programado** y necesita su propio PR y dueño |
| A5 | **K2 se une a `main` sin consultar de nuevo a Ignacio**, siempre que haya una revisión cruzada sin hallazgos graves, el CI en verde y esté resuelto el bloqueante conocido de #61 (escritura de otras pestañas con la protección apagada). Es una condición técnica: no la reemplaza la autorización | 17/11 | chat | Vigente |
| A6 | **«Conservar audio» activado de entrada solo en instalaciones nuevas**, con aviso claro de privacidad (la voz puede nombrar pacientes) y el control principal en Ajustes. Las configuraciones existentes no cambian | 17/11 | chat | Pendiente (fase P5 de la auditoría; depende de que A2 y las copias estén listas) |
| A7 | Se puede **retirar la compatibilidad** con el audio suelto viejo («última / anterior») y con estructuras de prueba históricas. No borra nada por sí solo | 17/11 | chat | Pendiente (fase P6) |
| A8 | Se pueden **borrar los datos de prueba** de las bases viejas al retirar esa compatibilidad, sin preguntar de nuevo. Se entiende: solo lo que W4 declara de prueba (lo guardado hasta hoy). **Cualquier otro borrado se consulta**, y si Ignacio empieza a usar datos reales, esta autorización deja de valer | 17/11 | chat | Vigente |
| A9 | **T (mudar el texto): en la misma base que los audios.** T sigue exigiendo su permiso explícito antes de programar y antes de unir. Reemplaza lo «a reconsiderar» de D13 | 17/11 | chat | Vigente; T pendiente |
| A10 | **Contraseña mínima: se mantiene en 8 caracteres.** La revisión externa sugirió subirla a 12 porque protege las copias que salen del teléfono; Ignacio decidió no subirla | 17/11 | chat | Vigente |
| A11 | **Audios sin protección al restaurar (M12): se cifran** y quedan protegidos dentro de la bóveda. Con esto la restauración cubrirá el audio sin protección (condición de A2 y A6) | 17/11 | chat | Pendiente (K2 de reemplazo) |

## Q · Todavía sin decidir

| ID | Pregunta | Dónde se discute |
|---|---|---|
| Q1 | ¿Cuándo se **publica** el formato 2 de copia? A3 solo lo permite en laboratorio | #60 |
| Q2 | Reglas de **AO**: qué se guarda, qué se exporta (anonimizada / original) y cuándo avisar | Diseño 2.3; D9 |
| Q3 | Pendientes de producto sin prioridad: **deshacer una edición guardada**, **reintentar Whisper desde el audio guardado**, mensaje de «otra pestaña» más claro, «querés» transcripto como «queréis», modo oscuro, autoría en Ajustes, motor Whisper propio dentro del repo | `docs/historial/CONTINUAR-AQUI-hasta-2026-11-17.md`, U5, U9, U10, U14 |

**Respondidas el 17/11 y movidas a la tabla A:** K2 (A4, A5) · «Conservar audio» por defecto (A6) · retirar compatibilidad con datos de prueba (A7) · borrar bases viejas de prueba (A8) · dónde alojar el texto de T (A9).
