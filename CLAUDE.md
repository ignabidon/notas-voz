# CLAUDE.md — DictaNota

> **▶ ESTADO ACTUAL (17/11/2026):** leer [CONTINUAR-AQUI.md](CONTINUAR-AQUI.md). En `main`: tema claro y chat (#36), Etapa A (#41), Etapa N: Dictar/Cuadernos (#43), diseño del almacenamiento cifrado (#44), E1 (#45), Clínica editorial y correcciones móviles (#48) y **E2: audios cifrados por nota (PR #50, que integra el #47)**, **K1: copia cifrada, crear y verificar** y **B3: menú de las notas y lista con vista previa**. No repetirlos. **E3 unido (PR #55). Próximo paso: K2** (con consulta). Pendientes sin decidir: renombrar la app (DictaVoz), rediseño de Ajustes y deshacer ediciones (ver CONTINUAR-AQUI.md), según el tablero [docs/PLAN-ALMACENAMIENTO-CIFRADO.md](docs/PLAN-ALMACENAMIENTO-CIFRADO.md). Forma de trabajo acordada el 17/11 (plan contado al empezar, unión con CI en verde, K2 y T siempre con consulta): ver AGENTS.md. Merge normal, sin squash. Prueba física Motorola pendiente.

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
