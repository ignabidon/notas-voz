# Protección cifrada de DictaNota: diseño y plan para Android

Fecha: 16/11/2026. Rama: `seguridad-02-cifrado-2026-11-16`. Reemplaza la propuesta de «bóveda opcional por nota» (rama `docs/optional-vault-design`, sin implementar).

## Decisiones del usuario (16/11/2026)

| Tema | Decisión |
| --- | --- |
| Qué se cifra | **Toda la app:** notas, borrador, copia para deshacer, tabla de personas y diccionario. No hay notas «comunes» sin cifrar mientras la protección esté activa. |
| Cómo se desbloquea | **Huella** para el uso diario y **contraseña** de respaldo. Además, un **código de recuperación** para anotar en papel. |
| Autobloqueo | A los **15 minutos** sin uso. Nunca mientras se graba o transcribe (eso cuenta como uso). |
| Audios | En una **segunda etapa**. Mientras tanto se avisa que «Conservar audio» guarda la voz sin cifrar. |
| A futuro | Una app de DictaNota para Android, que se desbloquee con la huella. El formato tiene que servirle. |

## Cómo funciona (versión web)

1. **Una clave de datos** aleatoria de 256 bits cifra cada parte por separado con AES-GCM: notas, borrador, deshacer, personas y diccionario. Se usa un IV aleatorio de 96 bits en cada escritura y un AAD que ata el registro a esta protección y a su nombre: `dictanota|v1|<id>|registro|<nombre>`.
2. **La clave de datos nunca se guarda en claro.** Se guarda «envuelta» (cifrada) tres veces:
   - **Contraseña:** PBKDF2-SHA256 con 600.000 iteraciones y sal de 16 bytes.
   - **Código de recuperación:** 120 bits aleatorios en 24 caracteres (alfabeto sin I, L, O ni U) pasados por HKDF-SHA256.
   - **Huella (opcional):** una llave de acceso (*passkey*) del dispositivo con la extensión **PRF de WebAuthn**. El autenticador devuelve 32 bytes secretos solo después de verificar la huella; esos bytes, pasados por HKDF-SHA256, envuelven la clave. No hay servidor: el sitio no verifica firmas, solo usa la salida PRF.
3. **Dónde queda cada cosa** (localStorage del sitio):
   - `notasvoz.boveda.v1`: la cabecera, con versión, id, parámetros y las tres envolturas.
   - `notasvoz.boveda.v1.r.<nombre>`: los registros cifrados.
   - Las claves históricas `notasvoz.gamma.*` protegidas quedan **vacías** mientras la protección está activa. La configuración (`cfg`) y el generador de códigos no son sensibles y siguen sin cifrar.
   - **Audios por nota (E2), en IndexedDB `notasvoz-dictanota-audio`:** fragmentos cifrados con una clave propia por audio; esa clave va envuelta con `K_audio` = HKDF-SHA256(clave de datos, sal = id de la cabecera, `dictanota audio v1`). `K_audio` no se guarda: se deriva al desbloquear. La cabecera no cambia.
4. **En la app:** `vaultStore` tiene la misma forma que `localStorage`. Sin protección pasa directo a `localStorage`, igual que antes. Con la protección abierta, lee y escribe sobre una copia en memoria y cifra en segundo plano. Bloqueada, no lee ni escribe nada protegido. Los datos se cargan recién al desbloquear (`vaultWhenReady`).
5. **Bloquear** guarda el borrador, espera a que termine el cifrado pendiente y **recarga la página**, que es la forma más simple de sacar el texto de la memoria y de la pantalla.

### Casos difíciles contemplados

- **Activar:** se cifra, se verifica descifrando y recién entonces se borran las copias en claro. Si no hay espacio, se deshace y no se cambia nada.
- **Contraseña incorrecta, código equivocado o huella distinta:** AES-GCM rechaza el intento y no se modifica nada.
- **Registro alterado, dañado o intercambiado:** no se usa ni se sobrescribe. Se aparta intacto como `….danado.<fecha>` y se avisa en Ajustes.
- **Copias en claro que quedaron** (activación interrumpida o una pestaña vieja abierta): al desbloquear, si falta la versión cifrada se cifran y se borran. Si coinciden con la cifrada, se borran. Si son distintas, **no se borran** y se avisa.
- **Cabecera dañada o con parámetros abusivos** (más de 5 millones de iteraciones, por ejemplo): la app queda bloqueada con un aviso y **nunca vuelve a mostrar texto en claro**.
- **Quitar la protección:** exige la contraseña, escribe y verifica las copias en claro y después borra lo cifrado.

### Límites (no prometer más de esto)

- Protege los datos **guardados** frente a quien tenga el celular o una copia del almacenamiento sin la contraseña ni la huella. **No** protege una sesión desbloqueada, capturas de pantalla, el portapapeles, el teclado, el malware ni código comprometido de la app o de sus librerías (ver el hallazgo 2 en SEGURIDAD.md).
- Una contraseña débil se puede adivinar fuera de línea: se piden 8 caracteres como mínimo y se recomienda una frase.
- Los **TXT o Word descargados**, lo que se copia y lo que se comparte salen **sin cifrar**.
- No es un borrado forense: el navegador puede conservar restos de las copias en claro anteriores en su disco interno.
- Si se cierra la app de golpe justo después de escribir, se puede perder lo último que no llegó a guardarse cifrado. El cifrado tarda milisegundos.
- **Audios:** desde el paso E2 (16/11/2026), los audios nuevos guardados con «Conservar audio» y la protección abierta van cifrados y unidos a su nota (detalle en `docs/DISENO-ALMACENAMIENTO-CIFRADO-2026-11-16.md`, 2.4). Los guardados sin protección, o antes de E2, siguen sin cifrar en la base vieja. **Mientras haya audios por nota guardados, no se puede quitar la protección** (su clave sale de ella); el recorrido completo (copia + borrar audios, D3) llega con AO. Solo una pestaña escribe datos protegidos a la vez.
- **Huella en Brave/Android:** depende de que la llave de acceso quede en el Administrador de contraseñas de Google, que admite PRF. Brave usa el mismo código WebAuthn que Chromium, pero **no está probado en el Motorola**. Si no funciona, la app lo dice y se sigue usando la contraseña.
- Si se borran los «datos del sitio» en Brave, se pierden las notas, como pasa hoy. La protección no es una copia de seguridad.

## Plan para la app de Android

**Recomendación:** empaquetar esta misma web como app nativa con **Capacitor**. Se reutiliza todo `index.html` (Whisper, interfaz, anonimización) y se suma una pequeña capa nativa para la huella.

- **Huella nativa:** `BiometricPrompt` más una clave del **Android Keystore** que solo se habilita con huella (`setUserAuthenticationRequired(true)`, con invalidación si se agregan huellas nuevas). Esa clave **envuelve la misma clave de datos**: se agrega a la cabecera como una cuarta envoltura (`android`), sin cambiar el formato de los registros.
- **Por qué no usar la passkey dentro de la app:** en el WebView de Android, WebAuthn todavía es limitado. El Keystore es la vía estándar, no depende de Google Password Manager y la clave nunca sale del chip seguro del teléfono.
- **Migración desde la web:** el almacenamiento de la app nativa es otro y no comparte datos con Brave. Hace falta una **copia cifrada exportable**: un archivo con la cabecera y los registros, abrible con la contraseña o con el código de recuperación. Es la próxima pieza que conviene construir, porque también sirve como copia de seguridad.
- **Audios:** en la app nativa conviene cifrarlos con la misma clave de datos, por partes (por ejemplo, de 1 MB), para no cargar audios largos enteros en memoria.
- **Alternativa más liviana:** una TWA (Trusted Web Activity), que es Chrome en pantalla completa. Mantiene la passkey web y el mismo almacenamiento de Chrome (no el de Brave), pero no permite el Keystore ni el control fino del micrófono en segundo plano.

## Verificación de esta entrega

- `node --test tests/delta.test.mjs`: 109 pruebas, de las cuales 10 son nuevas de cifrado. Cubren activar, bloqueo, contraseña incorrecta, recuperación, huella con salida PRF simulada, registros alterados o intercambiados, copias en claro sobrantes, quitar la protección, cabecera abusiva y que la app no lea lo protegido por fuera del almacén cifrado.
- `node tests/cifrado-browser.mjs`: Chrome real a 412 px con un **autenticador virtual con PRF**. Recorre activar, código, huella, recargar bloqueada, desbloquear con huella, bloqueo manual, contraseña incorrecta, autobloqueo (y que no se bloquee grabando), recuperación y quitar la protección. En cada paso verifica que el texto ficticio no quede en claro.
- **Sin probar en el Motorola:** la huella real en Brave, el tiempo de desbloqueo con 600.000 iteraciones en el teléfono y el autobloqueo con la pantalla apagada.
