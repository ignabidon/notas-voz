package ar.notasvoz.local

import android.Manifest
import android.app.Activity
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.content.pm.PackageManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var pending: PermissionRequest? = null
    private val micRequest = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = true
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (!request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                        request.deny()
                    } else if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else {
                        pending = request
                        requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), micRequest)
                    }
                }
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                val path = request?.url?.path ?: return null
                if (request.url?.host == "appassets.androidplatform.net" && path == "/assets/index.html") {
                    return assets.open("index.html").use { input ->
                        WebResourceResponse("text/html", "UTF-8", input.readBytes().inputStream())
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }
        }
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == micRequest) {
            val p = pending
            pending = null
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                p?.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
            } else p?.deny()
        }
    }

    override fun onDestroy() {
        pending?.deny()
        web.destroy()
        super.onDestroy()
    }
}
