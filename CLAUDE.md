# CLAUDE.md — DictaNota

> **▶ ESTADO ACTUAL (16/11/2026, 18:40):** leer [CONTINUAR-AQUI.md](CONTINUAR-AQUI.md). En `main`: PR #36 (tema claro y chat), #41 (Etapa A), #43 (Etapa N: Dictar/Cuadernos) y #44 (diseño del almacenamiento cifrado). No repetirlos. **E1 unido; E2 en el PR #47 (corregido tras la revisión de ChatGPT; espera nueva revisión). Próximo paso: K1** (cuando se una E2), según el tablero [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md). Nuevos PR desde main actualizado; merge normal, sin squash. Prueba física Motorola pendiente.

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
