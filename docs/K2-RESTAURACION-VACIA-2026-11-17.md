# K2 — Restauración experimental en una instalación vacía (17/11/2026)

**Estado:** PR #61 (borrador), apilado sobre el PR #60 y el #59. **No integrado en `main`, no publicado y sin pruebas físicas de Motorola.** Implementado por ChatGPT en una rama independiente. No se cambió ni eliminó información real.

## Alcance acotado

Se incorpora una opción de **restauración en una instalación completamente vacía**, para respaldos `.dictanota` de formato 1 (K1) y formato 2 (P2 experimental). **No se permite fusionar datos, restaurar encima de notas actuales ni reemplazar la base existente**. La etapa de reemplazo seguro se diseñará por separado, con confirmaciones explícitas y ensayo de retorno. La configuración y los registros cifrados vuelven a usar las mismas claves del archivo y la misma contraseña o código de recuperación; **la huella no viaja**.

La copia versión 2 **no incluye todavía el audio heredado `notasvoz-gamma-audio`**. El botón de exportación vigente K1 produce formato 1, y con bóveda apagada solo exporta texto. Por eso ninguna de estas opciones puede anunciarse como «copia íntegra de todos los audios»; recuperar no vuelve a crear audios que nunca estuvieron en el archivo. El programa debe señalar esa limitación antes de publicar la función.

## Resguardos del ensayo

1. No se admite una instalación que tenga registros de DictaVoz, datos de configuración, notas, borradores, fragmentos de audio en la biblioteca nueva ni audio en la base antigua. Se comprueba nuevamente después de validar el archivo.
2. Sin Web Locks o si otra pestaña tiene el candado, no se escribe. Se impide iniciar durante grabación, transcripción o guardado.
3. **Primera lectura:** contraseña o código, cabecera, todos los bloques, cifrado, integridad y bloque final. Cualquier error corta el procedimiento **antes de modificar datos**.
4. **Segunda lectura:** determina registros, configuración, fichas y offsets de fragmentos, sin volcar todo el archivo a memoria. Rechaza inconsistencias estructurales antes de comenzar.
5. Se escribe un registro de lote con los identificadores nuevos; luego se guardan fragmentos y fichas, se revisa la integridad de cada audio, y se guardan los registros cifrados y ajustes. **La cabecera de la bóveda se escribe última** y confirma la operación. No se escribe código de huella biométrica de otro dispositivo.
6. Si falla antes de la cabecera, se intenta limpiar exclusivamente ese lote. Al recargar la app se reintenta la limpieza bajo el mismo candado. Si falla esa limpieza, los datos se conservan para diagnóstico: **no se recomienda usar «Borrar datos del sitio»**.
7. Después de confirmar, se recarga para que la bóveda se abra usando el mecanismo normal. Los audios no se reproducen automáticamente.

## Revisión y pruebas requeridas

- Prueba Chrome de restauración con fixture fijo inventado de formato 2; contraseña errónea; copia cortada; un borrador preexistente; lote interrumpido; audio íntegro; recarga con bóveda cerrada; segunda restauración rechazada.
- **Agregar en revisión cruzada antes de merge:** pruebas de formato 1 (texto y audio cifrado), cortes en cada paso, fallo de cuota en localStorage e IndexedDB, doble pestaña, corrupción de fichas y recuperación de lotes parciales. Asegurar que no se restauran metadatos que no tengan todas sus partes.
- Ensayar conservación de notas y referencias después de volver a abrir, tanto con archivo «solo texto» como «completa». Las pruebas sin Motorola no validan el navegador real del usuario.
- Bloquear activación hasta que la matriz de pruebas y la auditoría independiente estén completas y los PR #59 y #60 estén revisados.

## Siguientes etapas (no autorizadas ni implementadas aquí)

El reemplazo completo de datos existentes necesita un respaldo verificable del estado anterior, un algoritmo de recuperación tras corte, confirmación doble y **permiso adicional del propietario**. P2 todavía necesita conectar captura, biblioteca, audios heredados e inventario completo; también faltan reintento de Whisper y candado universal de escritura sin bóveda. El paso de mudanza T y la anonimización AO continúan fuera de alcance.

**Niveles:** código en rama/PR; CI automatizado con resultados verificables por ejecución; **Motorola: no probado**.