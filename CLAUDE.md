# CLAUDE.md — Grabador de voz Delta

**Antes de programar, leé AGENTS.md, README.md y CAMBIOS.md. AGENTS.md es la fuente única de reglas compartidas para Claude, ChatGPT y otros agentes.**

- Rama principal: `main`; aplicación web oficial: `/index.html`.
- Nombre: **Grabador de voz Delta — Prueba Delta**.
- Rama de respaldo de intentos antiguos: `archivo-antes-de-delta-2026-11-15`.
- Preservar grabación, pausa y barra fija; Whisper, correcciones contextuales, diccionario, anonimización, notas y exportación.
- Mantener las claves históricas de almacenamiento, aunque contengan `gamma`, para evitar perder notas.
- Ejecutar `node --test tests/delta.test.mjs` y documentar cambios en CAMBIOS.md.
- Nunca confundir «guardado en GitHub», «prueba técnica aprobada» y «probado en Motorola».
- No usar datos reales de pacientes. Explicar en español sencillo las modificaciones.
