# CONTINUAR AQUÍ — Próxima IA de DictaNota

> **Punto de entrada obligatorio para continuar el rediseño conversacional (16/11/2026).**
> **Estado (16/11/2026, 09:14):** propuesta, maquetas, **fase 1** (modelo) y **fase 2** (guardado protegido, migración de notas viejas, sello = hora de guardado, mover/copiar hoja completa) hechas, sin cambios visibles: la app todavía no usa el bloque `CONV`. **Leer las secciones 2.5 y 2.6 de la especificación.** Próximo paso: **fase 3**, la pantalla Notas con burbujas y botón Guardar; necesita autorización explícita.

## Lectura en orden

1. **[Especificación completa del rediseño](docs/REDISENO-CONVERSACIONAL-2026-11-16.md)** — acuerdos del usuario, arquitectura, bitácora y biblioteca, fecha/hora original de cada mensaje, flujos, migración segura y pruebas.
2. **[Encargo listo para otra IA](docs/PROMPT-SIGUIENTE-IA-2026-11-16.txt)** — instrucciones concretas para la siguiente etapa.
3. **[AGENTS.md](AGENTS.md)** y **[CLAUDE.md](CLAUDE.md)** — convenciones de desarrollo y coordinación de agentes.
4. **[SEGURIDAD.md](SEGURIDAD.md)** y **[DISENO-CIFRADO.md](DISENO-CIFRADO.md)** — restricciones obligatorias de seguridad, cifrado y persistencia.
5. **[README.md](README.md)** y **[CAMBIOS.md](CAMBIOS.md)** — estado vigente de la aplicación e historial técnico.
6. Inspeccionar la versión actual de **[index.html](index.html)** y **[tests](tests/)** y confirmar el SHA actualizado de `main` antes de recomendar cambios.

## Qué está acordado

- Estética **Clínica contemporánea**, móvil primero, preparada para una futura app Android.
- Navegación a rediseñar: **Notas / Biblioteca / Ajustes**. Texto y Anonimizar siguen existiendo como capacidades dentro de las notas, no como pestañas obligatorias.
- **Captura rápida**: cada grabación desde el botón global crea **una nota nueva por defecto**, sin título obligatorio ni necesidad de clasificarla; después se puede renombrar («Supermercado», «Días lunes») o **mover su mensaje** a otra nota existente.
- Grabar dentro de una conversación abierta agrega allí la nueva entrada; nunca agregar una grabación global automáticamente a la última conversación.
- Interfaz tipo chat **privado y local**, no mensajería ni transmisión a terceros. Cada burbuja muestra transcripción y, solo cuando exista, audio reproducible.
- **Fecha completa y hora originales** del registro visibles en cada burbuja (por ejemplo, `16/11/2026 · 10:42`), guardadas como **metadatos no editables en la UI**. Editar, mover, anonimizar o exportar no las cambia. Las aclaraciones sobre fechas van en el texto del usuario.
- **Biblioteca destacada** con notas, audios realmente conservados y documentos; no esconder la recuperación y las descargas.

## Riesgo técnico que NO se puede ignorar

La versión actual guarda notas planas (`id/text/title/ts/tags`) y mantiene en IndexedDB **el último audio más uno anterior recuperable**: todavía **no** existe una biblioteca multi-audio asociada a mensajes. El nuevo diseño exige **modelo de datos, migración versionada, pruebas y plan de rollback**. Proteger claves antiguas (`notasvoz.gamma.*`), el almacén `vaultStore` y la funcionalidad actual. **Los audios conservados todavía no están cifrados**; no tratar el aspecto visual de privacidad como garantía de seguridad.

## Tu primera tarea (solo análisis, sin programar)

1. Verificar el HEAD actual de `main` y revisar código/documentación.
2. Presentar diagnóstico de compatibilidad con el almacenamiento real, límites y riesgos.
3. Crear propuestas visuales/maquetas para Notas, Biblioteca y Ajustes, incluyendo mensajes, menú mover y marca de fecha/hora.
4. Describir modelo de datos + plan de migración, respaldo y recuperación de múltiples audios.
5. Separar decisiones **confirmadas** de sugerencias, exponer dudas puntuales y **pedir aprobación explícita antes de editar o publicar funcionalidades**.

**No cambiar `index.html`, pruebas, datos, ramas de respaldo ni la aplicación publicada durante esta etapa documental.**
