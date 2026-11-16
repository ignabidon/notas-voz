# CLAUDE.md — DictaNota

> **▶ PRIMER PASO PARA LA PRÓXIMA IA: [CONTINUAR-AQUI.md](CONTINUAR-AQUI.md)** → [informe de continuidad del 16/11/2026](docs/INFORME-CONTINUIDAD-2026-11-16.md). Fases 1–3 del rediseño hechas (pestaña Notas con hojas y mensajes); **falta la estética clara «Clínica contemporánea»**, el aspecto de chat y la prueba en el Motorola. Programar y unir a `main` solo con permiso del usuario. Leer SEGURIDAD.md antes de tocar código.

**⚠ SEGURIDAD — leé primero SEGURIDAD.md** (revisión de seguridad en curso desde el 15/11/2026: reglas obligatorias, CSP, hallazgos abiertos y pendientes; la CSP y la huella MP3 aún no están confirmadas en el Motorola).

**Antes de programar, leé AGENTS.md, README.md y CAMBIOS.md. AGENTS.md es la fuente única de reglas compartidas para Claude, ChatGPT y otros agentes.**

- Rama principal: `main`; aplicación web oficial: `/index.html`.
- Nombre: **DictaNota — Prueba Delta 11**.
- Rama de respaldo de intentos antiguos: `archivo-antes-de-delta-2026-11-15`.
- Preservar grabación, pausa y barra fija; Whisper, correcciones contextuales, diccionario, anonimización, notas y exportación.
- Mantener las claves históricas de almacenamiento, aunque contengan `gamma`, para evitar perder notas.
- Partir siempre del último `main` y abrir una rama propia para cada cambio. No sobrescribir avances ni borrar respaldos.
- Ejecutar `node --test tests/delta.test.mjs`, verificar CI y Pages y documentar cambios en CAMBIOS.md.
- Nunca confundir «guardado en GitHub», «prueba técnica aprobada» y «probado en Motorola».
- No usar datos reales de pacientes. Explicar en español sencillo las modificaciones.
