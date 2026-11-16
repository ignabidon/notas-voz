# CONTINUAR AQUÍ — Próxima IA de DictaNota

> **Trabajo posterior en revisión:** ChatGPT implementó estética clara y chat en `rediseno-04-clinica-chat-chatgpt`, desde `089ebbec`. Consultar esa rama/PR antes de repetir el trabajo. Aún no equivale a publicación en main; ver CAMBIOS.md y resultado de CI. El informe de las 10:15 describe la base anterior.
> Vocabulario vigente: nota = texto escrito o transcripto; hoja = contenedor de notas. Inicio listo para grabar y acceso a hojas. Anonimización de nota/hoja con original recuperable: próxima etapa, no implementada en este cambio.

> **Actualizado: 16/11/2026, 10:15.** `main` = `bb89314`, publicado.
> **Primer documento para leer: [docs/INFORME-CONTINUIDAD-2026-11-16.md](docs/INFORME-CONTINUIDAD-2026-11-16.md)**: qué está hecho, qué falta, en qué orden y por qué el usuario «no ve cambios».

## En una frase

El rediseño conversacional tiene hechos los datos, el guardado protegido y una **pestaña Notas** funcional (hojas, burbujas con fecha y hora de guardado, Guardar/Descartar, mover y copiar). **Falta la estética clara «Clínica contemporánea» (nunca se implementó: la app sigue oscura)**, el aspecto de chat de Notas, la navegación final y la prueba en el Motorola.

## Lectura en orden

1. **[Informe de continuidad](docs/INFORME-CONTINUIDAD-2026-11-16.md)**: estado, pendientes priorizados y decisiones vigentes.
2. **[Especificación](docs/REDISENO-CONVERSACIONAL-2026-11-16.md)**: secciones **2.5 y 2.6** (decisiones del usuario del 16/11; reemplazan a lo anterior donde choquen).
3. **[AGENTS.md](AGENTS.md)**: reglas compartidas. **[SEGURIDAD.md](SEGURIDAD.md)** y **[DISENO-CIFRADO.md](DISENO-CIFRADO.md)**: restricciones obligatorias.
4. **[CAMBIOS.md](CAMBIOS.md)**: detalle de las fases 1, 2 y 3. **[README.md](README.md)**: guía de uso y prueba en el celular.

## Próximo paso sugerido

1. Implementar la **estética Clínica contemporánea**: está aprobada; los colores están en el informe, sección 3.1. Mostrar capturas al usuario antes de publicar.
2. Dar a Notas **aspecto de chat**: barra de escritura abajo y botón global «Nueva nota».
3. Después: navegación Notas / Biblioteca / Ajustes, Anonimizar desde la hoja, vista Documento.

Cada paso va en su rama, con pruebas, CI y **permiso del usuario para unir a `main`**. Sin datos reales de pacientes.
