# Notas por Voz Android — Alfa

Proyecto experimental separado de Gamma y Gamma Studio.

## Estado
- Proyecto Android Kotlin / WebView creado.
- Interfaz Gamma Studio se carga como recurso local desde `app/src/main/assets/index.html`.
- Permiso de micrófono mediante Android.
- **Aún no compilado ni probado en el Motorola.**
- Grabación nativa, servicio en primer plano, Whisper nativo, cifrado y biometría pendientes. La grabación web original puede requerir ajustes para funcionar dentro de WebView.

## Para compilar
Abrir la carpeta `android-app` en Android Studio, sincronizar Gradle, compilar e instalar en un dispositivo Android. Se requiere Android SDK y JDK compatible. No se incluye wrapper Gradle generado.

No usar datos reales de pacientes en esta versión de prueba.
