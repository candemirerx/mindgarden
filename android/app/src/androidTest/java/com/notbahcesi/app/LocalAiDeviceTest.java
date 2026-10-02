package com.notbahcesi.app;

import static org.junit.Assert.*;
import android.app.Activity;
import android.app.Instrumentation;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.SystemClock;
import android.view.WindowManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class LocalAiDeviceTest {
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private ActivityScenario<MainActivity> scenario;

    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> {
            result.set(value); latch.countDown();
        }));
        if (!latch.await(5, TimeUnit.SECONDS)) throw new java.util.concurrent.TimeoutException("WebView henüz hazır değil");
        return result.get();
    }
    private void until(String expression) throws Exception {
        until(expression, 30000);
    }
    private void until(String expression, long timeout) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + timeout;
        do {
            try {
                if ("true".equals(js("Boolean(" + expression + ")"))) return;
            } catch (java.util.concurrent.TimeoutException initializing) {
                // Soğuk açılışta ilk sayfa yüklemesi JS callback'ini iptal edebilir.
            }
            SystemClock.sleep(200);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("Beklenen uygulama durumu oluşmadı: " + expression);
    }
    private String text(String script) throws Exception { return new JSONArray("[" + js(script) + "]").getString(0); }
    private void screenshot(String name) throws Exception {
        // DOM güncellemesi ile Android compositor karesi aynı anda tamamlanmaz.
        instrumentation.waitForIdleSync();
        SystemClock.sleep(400);
        Bitmap bitmap = instrumentation.getUiAutomation().takeScreenshot();
        assertNotNull(bitmap);
        File dir = new File(instrumentation.getTargetContext().getExternalFilesDir(null), "qa-ai");
        assertTrue(dir.isDirectory() || dir.mkdirs());
        try (FileOutputStream out = new FileOutputStream(new File(dir, name))) { bitmap.compress(Bitmap.CompressFormat.PNG, 100, out); }
        bitmap.recycle();
    }

    @Test public void offlineNoticeDoesNotBlockLocalEditor() throws Exception {
        try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
            scenario = launched;
            until("document.body && document.body.innerText.length > 50 && window.Capacitor && window.Capacitor.nativePromise");
            js("window.__network=null;window.Capacitor.nativePromise('Network','getStatus',{}).then(v=>window.__network=v)");
            until("window.__network");
            assertEquals("Run this test with Wi-Fi and mobile data off", "false", js("window.__network.connected"));
            js("window.__offlinePreviousPage=true");
            scenario.onActivity(activity -> {
                String url = activity.getBridge().getWebView().getUrl();
                activity.getBridge().getWebView().loadUrl(Uri.parse(url).buildUpon().path("/").clearQuery().build().toString());
            });
            until("!window.__offlinePreviousPage && document.querySelector('[data-offline-notice]')");
            assertEquals("true", js("getComputedStyle(document.querySelector('[data-offline-notice]')).pointerEvents === 'none'"));
            assertEquals("true", js("document.querySelector('[data-offline-notice]').getBoundingClientRect().height < 60"));
            screenshot("offline-brief.png");
            SystemClock.sleep(3000);
            assertEquals("null", js("document.querySelector('[data-offline-notice]')"));
            screenshot("offline-clear.png");
            scenario.onActivity(activity -> {
                String url = activity.getBridge().getWebView().getUrl();
                // Direct WebView navigation must name the exported HTML asset.
                activity.getBridge().getWebView().loadUrl(Uri.parse(url).buildUpon().path("/editor.html").clearQuery().build().toString());
            });
            until("document.querySelector('textarea')");
            assertEquals("true", js("(()=>{const e=document.querySelector('textarea'); e.focus(); return !e.disabled && !e.readOnly && document.activeElement===e;})()"));
        }
    }

    /** Opt-in real-model device test; leaves the selected model installed as requested. */
    @Test public void installedAlternativeModelInference() throws Exception {
        String name = InstrumentationRegistry.getArguments().getString("modelName");
        if (name == null) return;
        assertTrue(name.matches("[a-zA-Z0-9_.-]+\\.(task|bin|litertlm)"));
        File file = new File(instrumentation.getTargetContext().getExternalFilesDir(null), "models/" + name);
        assertTrue("Downloaded model is missing", file.isFile() && file.length() > 100000000);
        try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
            scenario = launched;
            until("document.body && document.body.innerText.length > 50 && window.Capacitor && window.Capacitor.nativePromise");
            js("window.__alt=null;window.Capacitor.nativePromise('LocalLlm','listModels',{}).then(v=>window.__alt=v)");
            until("window.__alt");
            assertEquals("true", js("window.__alt.models.some(m=>m.path===" + JSONObject.quote(file.getAbsolutePath()) + ")"));
            long start = SystemClock.elapsedRealtime();
            js("window.__alt=null;window.Capacitor.nativePromise('LocalLlm','loadModel',{modelPath:" + JSONObject.quote(file.getAbsolutePath()) + ",maxTokens:1024}).then(v=>window.__alt={value:v}).catch(e=>window.__alt={error:e.message})");
            until("window.__alt", 300000);
            assertEquals(text("JSON.stringify(window.__alt)"), "true", js("!!window.__alt.value?.success"));
            JSONObject evidence = new JSONObject();
            evidence.put("model", name); evidence.put("loadMs", SystemClock.elapsedRealtime() - start);
            JSONArray answers = new JSONArray();
            String[] prompts = {"Türkçe tek kısa cümleyle merhaba de.", "Aşağıdaki cümlenin yazım hatalarını düzelt. Yalnızca düzeltilmiş cümleyi yaz: bugun ise giderken yagmur yagdi ama semsiyemi evde unuttum"};
            for (String prompt : prompts) {
                js("window.__alt=null;window.Capacitor.nativePromise('LocalLlm','generate',{prompt:" + JSONObject.quote(prompt) + "}).then(v=>window.__alt={value:v}).catch(e=>window.__alt={error:e.message})");
                until("window.__alt", 300000);
                String result = text("JSON.stringify(window.__alt)");
                assertEquals(result, "true", js("!!window.__alt.value?.text?.trim()"));
                assertEquals(result, "false", js("/<\\/?think>/.test(window.__alt.value.text)"));
                answers.put(new JSONObject().put("prompt", prompt).put("result", new JSONObject(result)));
            }
            evidence.put("answers", answers);
            File dir = new File(instrumentation.getTargetContext().getExternalFilesDir(null), "qa-ai");
            assertTrue(dir.isDirectory() || dir.mkdirs());
            try (FileOutputStream out = new FileOutputStream(new File(dir, name + ".json"))) { out.write(evidence.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
            if ("true".equals(InstrumentationRegistry.getArguments().getString("selectModel"))) js("localStorage.setItem('nb-ai-local-model-path'," + JSONObject.quote(file.getAbsolutePath()) + ");localStorage.setItem('nb-ai-provider','local')");
        }
    }

    @Test public void realModelImportAndInference() throws Exception {
        if (!"true".equals(InstrumentationRegistry.getArguments().getString("realModel"))) return;
        try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
            scenario = launched;
            until("document.body && window.Capacitor && window.Capacitor.nativePromise");
            File existing = new File(instrumentation.getTargetContext().getFilesDir(), "models/gemma3-1b-it-int4.task");
            String path;
            if (existing.length() == 554661243L) path = existing.getAbsolutePath();
            else {
                Instrumentation.ActivityMonitor monitor = new Instrumentation.ActivityMonitor() {
                    @Override public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                        if (!Intent.ACTION_OPEN_DOCUMENT.equals(intent.getAction())) return null;
                        return new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent().setData(Uri.parse("content://com.notbahcesi.app.test.model-fixture/gemma3-1b-it-int4.task")));
                    }
                };
                instrumentation.addMonitor(monitor);
                try {
                    js("window.__real=null;window.Capacitor.nativePromise('LocalLlm','importModel',{}).then(v=>window.__real={value:v}).catch(e=>window.__real={error:e.message})");
                    until("window.__real", 180000);
                    JSONObject result = new JSONObject(text("JSON.stringify(window.__real)"));
                    assertFalse(result.toString(), result.has("error"));
                    path = result.getJSONObject("value").getString("modelPath");
                    assertEquals(554661243L, new File(path).length());
                } finally { instrumentation.removeMonitor(monitor); }
            }
            js("window.__real=null;window.Capacitor.nativePromise('LocalLlm','loadModel',{modelPath:" + JSONObject.quote(path) + ",maxTokens:1024}).then(v=>window.__real={value:v}).catch(e=>window.__real={error:e.message})");
            until("window.__real", 240000);
            assertEquals(text("JSON.stringify(window.__real)"), "true", js("!!window.__real.value?.success"));
            js("localStorage.setItem('nb-ai-local-model-path'," + JSONObject.quote(path) + ");localStorage.setItem('nb-ai-provider','local')");
            js("window.__real=null;window.Capacitor.nativePromise('LocalLlm','generate',{prompt:'Türkçe tek kısa cümleyle merhaba de.'}).then(v=>window.__real={value:v}).catch(e=>window.__real={error:e.message})");
            until("window.__real", 300000);
            String result = text("JSON.stringify(window.__real)");
            assertEquals(result, "true", js("!!window.__real.value?.text?.trim()"));
            File dir = new File(instrumentation.getTargetContext().getExternalFilesDir(null), "qa-ai");
            assertTrue(dir.isDirectory() || dir.mkdirs());
            try (FileOutputStream out = new FileOutputStream(new File(dir, "real-inference.json"))) { out.write(result.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
            System.out.println("REAL_MODEL_RESULT=" + result);
        }
    }

    @Test public void threeEditorTabsAndToolSettings() throws Exception {
        try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
            scenario = launched;
            until("document.body && window.Capacitor");
            String saved = text("JSON.stringify(['nb-tools-section','nb-computer-section','nb-ai-section'].map(k=>[k,localStorage.getItem(k)]))");
            try {
                js("['nb-tools-section','nb-computer-section','nb-ai-section'].forEach(k=>localStorage.setItem(k,'1'))");
                scenario.onActivity(activity -> activity.getBridge().getWebView().loadUrl("https://localhost/editor.html"));
                until("document.querySelectorAll('.studio-tabs [role=tab]').length===3");
                assertEquals("true", js("document.documentElement.scrollWidth <= window.innerWidth"));
                // WebView's device-pixel conversion can report 44 CSS px as 43.995 px.
                assertEquals(text("JSON.stringify(Array.from(document.querySelectorAll('.studio-tabs button')).map(b=>({label:b.getAttribute('aria-label'),width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})))"), "true", js("Array.from(document.querySelectorAll('.studio-tabs button')).every(b=>parseFloat(getComputedStyle(b).width)>=43.98 && parseFloat(getComputedStyle(b).height)>=43.98 && b.getBoundingClientRect().width>=43.98 && b.getBoundingClientRect().height>=43.98)"));
                js("document.getElementById('studio-tab-computer').click()");
                until("getComputedStyle(document.getElementById('studio-panel-computer')).display!=='none'");
                assertEquals("null", js("document.getElementById('studio-panel-tools')"));
                screenshot("editor-three-tabs.png");
                js("document.getElementById('studio-tab-tools').click()");
                until("document.getElementById('studio-panel-tools')");
                assertEquals("true", js("getComputedStyle(document.getElementById('studio-panel-computer')).display==='none'"));
                js("localStorage.setItem('nb-computer-section','0');window.dispatchEvent(new Event('focus'))");
                until("!document.getElementById('studio-tab-computer')");
                js("document.querySelector('[aria-label=\"Ayarları aç\"]').click()");
                until("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Düzenleme araçları'))");
                js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Düzenleme araçları')).click()");
                until("document.getElementById('tools-settings-panel-local')");
                assertEquals("null", js("document.getElementById('tools-settings-panel-computer')"));
                js("document.getElementById('tools-settings-tab-computer').click()");
                until("document.getElementById('tools-settings-panel-computer')");
                assertEquals("null", js("document.getElementById('tools-settings-panel-local')"));
                assertEquals("true", js("Array.from(document.querySelectorAll('#tools-settings-panel-computer button')).some(b=>/Makro ekle/i.test(b.textContent))"));
                screenshot("tool-settings-computer.png");
            } finally {
                js("JSON.parse(" + JSONObject.quote(saved) + ").forEach(([k,v])=>v===null?localStorage.removeItem(k):localStorage.setItem(k,v))");
            }
        }
    }

    @Test public void deleteLoadedModelCopy() throws Exception {
        if (!"true".equals(InstrumentationRegistry.getArguments().getString("activeDeletion"))) return;
        Context context = instrumentation.getTargetContext();
        File source = new File(context.getExternalFilesDir(null), "models/gemma3-1b-it-int4.task");
        assertTrue(source.isFile());
        File copy = new File(context.getFilesDir(), "models/qa-loaded-delete.task");
        assertTrue(copy.getParentFile().isDirectory() || copy.getParentFile().mkdirs());
        try {
            try (java.io.FileInputStream in = new java.io.FileInputStream(source); FileOutputStream out = new FileOutputStream(copy)) {
                byte[] buffer = new byte[4 * 1024 * 1024]; int count;
                while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            }
            try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
                scenario = launched;
                until("window.Capacitor && window.Capacitor.nativePromise");
                js("window.__deleteQa=null;window.Capacitor.nativePromise('LocalLlm','loadModel',{modelPath:" + JSONObject.quote(copy.getAbsolutePath()) + ",maxTokens:1024}).then(v=>window.__deleteQa={value:v}).catch(e=>window.__deleteQa={error:e.message})");
                until("window.__deleteQa", 120000);
                assertEquals(text("JSON.stringify(window.__deleteQa)"), "true", js("!!window.__deleteQa.value?.success"));
                js("window.__deleteQa=null;window.Capacitor.nativePromise('LocalLlm','deleteModel',{modelPath:" + JSONObject.quote(copy.getAbsolutePath()) + "}).then(v=>window.__deleteQa=v)");
                until("window.__deleteQa");
                assertFalse(copy.exists()); assertTrue(source.exists());
                js("window.__deleteQa=null;window.Capacitor.nativePromise('LocalLlm','isAvailable',{}).then(v=>window.__deleteQa=v)");
                until("window.__deleteQa");
                assertEquals("false", js("window.__deleteQa.isLoaded"));
                assertEquals("", text("window.__deleteQa.currentModelPath"));
            }
        } finally { copy.delete(); }
    }

    @Test public void settingsAndNativeImportOnInstalledRelease() throws Exception {
        Context context = instrumentation.getTargetContext();
        assertFalse("Test için telefonun ekran kilidini açın", ((KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE)).isKeyguardLocked());
        try (ActivityScenario<MainActivity> launched = ActivityScenario.launch(MainActivity.class)) {
            scenario = launched;
            until("document.body && document.body.innerText.length > 50 && window.Capacitor && window.Capacitor.nativePromise");
            scenario.onActivity(activity -> {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                String url = activity.getBridge().getWebView().getUrl();
                activity.getBridge().getWebView().loadUrl(Uri.parse(url).buildUpon().path("/editor").clearQuery().build().toString());
            });
            until("document.querySelector('[aria-label=\"Ayarları aç\"]')");
            String before = text("localStorage.getItem('nb-ai-provider') || 'gemini'");
            js("document.querySelector('[aria-label=\"Ayarları aç\"]').click()");
            until("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Bulut bağlantısı veya'))");
            js("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Bulut bağlantısı veya')).click()");
            until("document.getElementById('ai-tab-local') && document.getElementById('ai-tab-cloud')");
            js("document.getElementById('ai-tab-cloud').click()");
            until("document.getElementById('ai-panel-cloud')");
            assertEquals(before, text("localStorage.getItem('nb-ai-provider') || 'gemini'"));
            assertEquals("true", js("document.getElementById('ai-tab-cloud').getBoundingClientRect().height >= 44"));
            screenshot("cloud.png");
            js("document.getElementById('ai-tab-local').click()");
            until("document.getElementById('ai-panel-local')");
            assertEquals(before, text("localStorage.getItem('nb-ai-provider') || 'gemini'"));
            assertEquals("true", js("Array.from(document.querySelectorAll('#ai-panel-local button')).some(b=>b.textContent.includes('Dosya seç') && !b.disabled)"));
            assertEquals("true", js("document.documentElement.scrollWidth <= window.innerWidth"));
            screenshot("local.png");
            System.loadLibrary("llm_inference_engine_jni");
            assertEquals("false", js("Array.from(document.querySelectorAll('#ai-panel-local button')).some(b=>b.textContent.includes('İndirme sayfasını aç'))"));
            js("window.__nbQa=null;window.Capacitor.nativePromise('LocalLlm','isAvailable',{}).then(v=>window.__nbQa={value:v}).catch(e=>window.__nbQa={error:e.message})");
            until("window.__nbQa");
            assertEquals("true", js("window.__nbQa.value && window.__nbQa.value.supported"));

            // SAF sonuçlarını Android instrumentation ile kontrollü üretir.
            // Gerçek native import kodu ve Capacitor köprüsü çalışır.
            String[] names = {null, "qa-fixture.safetensors", "qa-fixture.task", "qa-fixture.litertlm"};
            for (String name : names) {
                Instrumentation.ActivityMonitor monitor = new Instrumentation.ActivityMonitor() {
                    @Override public Instrumentation.ActivityResult onStartActivity(Intent intent) {
                        if (!Intent.ACTION_OPEN_DOCUMENT.equals(intent.getAction())) return null;
                        Intent data = new Intent();
                        if (name != null) data.setData(Uri.parse("content://com.notbahcesi.app.test.model-fixture/" + name));
                        return new Instrumentation.ActivityResult(name == null ? Activity.RESULT_CANCELED : Activity.RESULT_OK, data);
                    }
                };
                instrumentation.addMonitor(monitor);
                try {
                    js("window.__nbQa=null;window.Capacitor.nativePromise('LocalLlm','importModel',{}).then(v=>window.__nbQa={value:v}).catch(e=>window.__nbQa={error:e.message})");
                    until("window.__nbQa");
                    JSONObject response = new JSONObject(text("JSON.stringify(window.__nbQa)"));
                    if (name == null) assertTrue(response.getJSONObject("value").getBoolean("cancelled"));
                    else if (name.endsWith(".safetensors")) assertTrue(response.getString("error").contains("MediaPipe uyumlu"));
                    else {
                        String importedPath = response.getJSONObject("value").getString("modelPath");
                        File imported = new File(importedPath);
                        assertTrue(imported.getCanonicalPath().startsWith(new File(context.getFilesDir(), "models").getCanonicalPath() + File.separator));
                        assertEquals(2L * 1024 * 1024, imported.length());
                        try {
                            js("window.__nbQa=null;window.Capacitor.nativePromise('LocalLlm','listModels',{}).then(v=>window.__nbQa={value:v})");
                            until("window.__nbQa");
                            assertEquals("true", js("window.__nbQa.value.models.some(m=>m.path===" + JSONObject.quote(importedPath) + " && !m.isLoaded)"));
                            String selectedBefore = text("localStorage.getItem('nb-ai-local-model-path') || ''");
                            try {
                                js("localStorage.setItem('nb-ai-local-model-path'," + JSONObject.quote(importedPath) + ");document.querySelector('[aria-label=\"Model listesini yenile\"]').click()");
                                String deleteLabel = imported.getName() + " modelini sil";
                                until("Array.from(document.querySelectorAll('#ai-panel-local button')).some(b=>b.getAttribute('aria-label')===" + JSONObject.quote(deleteLabel) + ")");
                                js("Array.from(document.querySelectorAll('#ai-panel-local button')).find(b=>b.getAttribute('aria-label')===" + JSONObject.quote(deleteLabel) + ").click()");
                                until("document.querySelector('[aria-label=\"Model silme onayı\"]')");
                                js("Array.from(document.querySelectorAll('[aria-label=\"Model silme onayı\"] button')).find(b=>b.textContent==='Vazgeç').click()");
                                assertTrue("Vazgeç dosyayı korumalı", imported.exists());
                                js("Array.from(document.querySelectorAll('#ai-panel-local button')).find(b=>b.getAttribute('aria-label')===" + JSONObject.quote(deleteLabel) + ").click()");
                                js("Array.from(document.querySelectorAll('[aria-label=\"Model silme onayı\"] button')).find(b=>b.textContent==='Sil').click()");
                                until("!Array.from(document.querySelectorAll('#ai-panel-local button')).some(b=>b.getAttribute('aria-label')===" + JSONObject.quote(deleteLabel) + ")");
                                assertFalse("Silinen model diskte kalmamalı", imported.exists());
                                assertEquals("", text("localStorage.getItem('nb-ai-local-model-path') || ''"));
                            } finally { js("localStorage.setItem('nb-ai-local-model-path'," + JSONObject.quote(selectedBefore) + ")"); }
                        } finally { if (imported.exists()) assertTrue("Sentetik test dosyası temizlenemedi", imported.delete()); }
                    }
                } finally { instrumentation.removeMonitor(monitor); }
            }
            assertEquals(before, text("localStorage.getItem('nb-ai-provider') || 'gemini'"));
            File clearA = new File(context.getFilesDir(), "models/qa-clear-a.task");
            File clearB = new File(context.getFilesDir(), "models/qa-clear-b.litertlm");
            try {
                try (FileOutputStream out = new FileOutputStream(clearA)) { out.write(new byte[1024]); }
                try (FileOutputStream out = new FileOutputStream(clearB)) { out.write(new byte[1024]); }
                // Only synthetic fixtures are shown for the bulk-delete test; user models remain untouched.
                js("window.__originalNativePromise=window.Capacitor.nativePromise;window.Capacitor.nativePromise=function(p,m,o){return window.__originalNativePromise.call(this,p,m,o).then(r=>p==='LocalLlm'&&m==='listModels'?{...r,models:r.models.filter(f=>/^qa-clear-/.test(f.name))}:r)};document.querySelector('[aria-label=\"Model listesini yenile\"]').click()");
                until("Array.from(document.querySelectorAll('#ai-panel-local button')).filter(b=>/qa-clear-.*modelini sil/.test(b.getAttribute('aria-label')||'')).length===2");
                js("document.querySelector('[aria-label=\"Tüm yerel modelleri sil\"]').click()");
                until("document.querySelector('[aria-label=\"Model silme onayı\"]')");
                js("Array.from(document.querySelectorAll('[aria-label=\"Model silme onayı\"] button')).find(b=>b.textContent==='Sil').click()");
                until("document.getElementById('ai-panel-local').textContent.includes('Henüz model eklenmedi')");
                assertFalse(clearA.exists()); assertFalse(clearB.exists());
            } finally {
                js("if(window.__originalNativePromise){window.Capacitor.nativePromise=window.__originalNativePromise;delete window.__originalNativePromise}");
                clearA.delete(); clearB.delete();
            }
            js("window.__nbQa=null;window.Capacitor.nativePromise('LocalLlm','deleteModel',{modelPath:'/sdcard/Download/qa-not-owned.task'}).then(v=>window.__nbQa={value:v}).catch(e=>window.__nbQa={error:e.message})");
            until("window.__nbQa");
            assertEquals("true", js("!!window.__nbQa.error"));
            js("delete window.__nbQa");
        }
    }
}
