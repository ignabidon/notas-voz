plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android { namespace = "ar.notasvoz.local"; compileSdk = 35
  defaultConfig { applicationId = "ar.notasvoz.local"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1-alpha" }
  compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
  kotlinOptions { jvmTarget = "17" }
}
