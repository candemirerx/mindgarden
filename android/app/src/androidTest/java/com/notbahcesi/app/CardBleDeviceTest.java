package com.notbahcesi.app;

import static org.junit.Assert.*;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Opt-in card test: status queries only; no typing, clicks or saved preferences. */
@RunWith(AndroidJUnit4.class)
public class CardBleDeviceTest {
    private ActivityScenario<MainActivity> scenario;
    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch ready = new CountDownLatch(1);
        scenario.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(script,
            value -> { result.set(value); ready.countDown(); }));
        assertTrue("WebView timeout", ready.await(15, TimeUnit.SECONDS));
        return result.get();
    }
    private JSONObject call(String method, JSONObject args) throws Exception {
        js("window.__cardQa=null;window.Capacitor.nativePromise('RemoteBridge',"
            + JSONObject.quote(method) + "," + args
            + ").then(v=>window.__cardQa={value:v||{}}).catch(e=>window.__cardQa={error:e.message})");
        // HTTP isteği eklentide en çok ~21 sn sürebilir (4 + 6,5 sn bağlanma, 10 sn okuma).
        long start = SystemClock.elapsedRealtime();
        long deadline = start + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            String result = js("window.__cardQa");
            if (!"null".equals(result)) {
                long ms = SystemClock.elapsedRealtime() - start;
                if (ms > 3000) System.out.println("CARD_SLOW_CALL method=" + method + " ms=" + ms + " result=" + result);
                return new JSONObject(result);
            }
            SystemClock.sleep(150);
        }
        throw new AssertionError("Card operation timeout: " + method);
    }
    @Test public void statusQueriesAndReconnect() throws Exception {
        String address = InstrumentationRegistry.getArguments().getString("cardAddress");
        org.junit.Assume.assumeNotNull(address);
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            long deadline = SystemClock.elapsedRealtime() + 30000;
            while (!"true".equals(js("!!window.Capacitor?.nativePromise"))
                && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(200);
            for (int round = 0; round < 3; round++) {
                JSONObject connected = call("connect", new JSONObject().put("address", address));
                assertFalse(connected.toString(), connected.has("error"));
                assertTrue(connected.toString(), connected.getJSONObject("value").getBoolean("connected"));
                JSONObject sent = call("send", new JSONObject().put("command", "s"));
                assertFalse(sent.toString(), sent.has("error"));
                System.out.println("CARD_STATUS_WRITE_OK round=" + round);
                assertFalse(call("disconnect", new JSONObject()).has("error"));
                SystemClock.sleep(700);
            }
        }
    }
    /** Uygulamanın JS köprüsü hazır olana kadar bekler. */
    private void hazirBekle() {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            try { if ("true".equals(js("!!window.Capacitor?.nativePromise"))) return; } catch (Exception ignored) { }
            SystemClock.sleep(200);
        }
    }

    /**
     * Açılışta otomatik bağlanma: uygulama açılınca kancanın yüklendiğini,
     * "Açılışta otomatik bağlan" varsayılanının açık olduğunu ve zorlanan
     * denemenin hata fırlatmadan yapılandırılmış bir sonuç döndürdüğünü doğrular.
     * Kayıtlı tercihler test bitince aynen geri yazılır; kullanıcı ayarları bozulmaz.
     */
    @Test public void autoConnectOnLaunch() throws Exception {
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 25000;
            while (!"true".equals(js("!!window.__nbOtomatik && !!window.__nbUzak")) && SystemClock.elapsedRealtime() < son) SystemClock.sleep(250);
            assertTrue("Otomatik bağlanma kancası yüklenmedi (window.__nbOtomatik)", "true".equals(js("!!window.__nbOtomatik")));
            js("if (!window.__otoYedek) window.__otoYedek = localStorage.getItem('nb-remote-prefs-v1')");
            try {
                assertTrue("Açılışta otomatik bağlan varsayılanı açık olmalı", "true".equals(js("window.__nbUzak.prefs().autoBaglan !== false")));
                js("window.__otoQa=null;window.__nbOtomatik.baglan(true).then(v=>window.__otoQa={value:v}).catch(e=>window.__otoQa={error:e.message})");
                long bitis = SystemClock.elapsedRealtime() + 90000;
                String ham = "null";
                while ("null".equals(ham) && SystemClock.elapsedRealtime() < bitis) { SystemClock.sleep(250); ham = js("window.__otoQa"); }
                assertFalse("Otomatik bağlanma sonucu gelmedi", "null".equals(ham));
                JSONObject sonuc = new JSONObject(ham);
                assertFalse(sonuc.toString(), sonuc.has("error"));
                JSONObject deger = sonuc.optJSONObject("value");
                assertNotNull(sonuc.toString(), deger);
                String ozet = "OTO_BAGLAN yol=" + deger.optString("yol") + " ok=" + deger.optBoolean("ok") + " mesaj=" + deger.optString("mesaj");
                System.out.println(ozet);
                android.util.Log.i("NotBahcesiTest", ozet);
            } finally {
                js("if (window.__otoYedek) localStorage.setItem('nb-remote-prefs-v1', window.__otoYedek)");
            }
        }
    }
    /**
     * Yazma testi (yalnız -e typeB64 verilince): kart BLE üzerinden PC'ye metin
     * ("t:" parçaları) ve Enter gönderir. PC'de odakta bir metin alanı olmalı.
     */
    @Test public void typesThroughCardBle() throws Exception {
        String address = InstrumentationRegistry.getArguments().getString("cardAddress");
        String b64 = InstrumentationRegistry.getArguments().getString("typeB64");
        org.junit.Assume.assumeNotNull(address, b64);
        String text = new String(android.util.Base64.decode(b64, android.util.Base64.DEFAULT), "UTF-8");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            assertFalse(call("connect", new JSONObject().put("address", address)).has("error"));
            try {
                // Uygulamadaki gibi UTF-8 güvenli ~120 baytlık parçalar.
                StringBuilder parca = new StringBuilder();
                for (int i = 0; i < text.length(); ) {
                    int cp = text.codePointAt(i);
                    String ch = new String(Character.toChars(cp));
                    if ((parca + ch).getBytes("UTF-8").length > 120) {
                        JSONObject r = call("send", new JSONObject().put("command", "t:" + parca));
                        assertFalse(r.toString(), r.has("error"));
                        parca.setLength(0);
                    }
                    parca.append(ch);
                    i += Character.charCount(cp);
                }
                if (parca.length() > 0) assertFalse(call("send", new JSONObject().put("command", "t:" + parca)).has("error"));
                assertFalse(call("send", new JSONObject().put("command", "k:ENTER")).has("error"));
                assertFalse(call("send", new JSONObject().put("command", "k:END")).has("error"));
                System.out.println("CARD_BLE_TYPED chars=" + text.length());
            } finally { call("disconnect", new JSONObject()); }
        }
    }
    /**
     * Yazma testi (yalnız -e cardUrl -e typeB64 -e wifiType=1 verilince): uygulamanın
     * yerel HTTP yoluyla kartın Wi‑Fi'ına (ev ağı ya da kartın AP'si) metin ve Enter gönderir.
     */
    @Test public void typesThroughCardWifi() throws Exception {
        String url = InstrumentationRegistry.getArguments().getString("cardUrl");
        String b64 = InstrumentationRegistry.getArguments().getString("typeB64");
        org.junit.Assume.assumeNotNull(url, b64, InstrumentationRegistry.getArguments().getString("wifiType"));
        String text = new String(android.util.Base64.decode(b64, android.util.Base64.DEFAULT), "UTF-8");
        String body = "b64:" + android.util.Base64.encodeToString(text.getBytes("UTF-8"), android.util.Base64.NO_WRAP);
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            JSONObject durum = call("request", new JSONObject().put("url", url + "/api/status").put("method", "GET").put("body", "").put("token", ""));
            assertFalse(durum.toString(), durum.has("error"));
            System.out.println("CARD_WIFI_STATUS " + durum.getJSONObject("value").getString("body"));
            JSONObject yaz = call("request", new JSONObject().put("url", url + "/api/keys").put("method", "POST").put("body", body).put("token", ""));
            assertFalse(yaz.toString(), yaz.has("error"));
            assertEquals(yaz.toString(), 200, yaz.getJSONObject("value").getInt("status"));
            JSONObject enter = call("request", new JSONObject().put("url", url + "/api/rkey?code=40&mods=0").put("method", "POST").put("body", "").put("token", ""));
            assertFalse(enter.toString(), enter.has("error"));
            System.out.println("CARD_WIFI_TYPED chars=" + text.length());
        }
    }
    /**
     * Yazma testi (yalnız -e pcAddress -e pcToken -e typeB64 verilince): klasik
     * Bluetooth ile PC yardımcısına metin ve Enter gönderir.
     */
    @Test public void typesThroughPcBluetooth() throws Exception {
        String pc = InstrumentationRegistry.getArguments().getString("pcAddress");
        String token = InstrumentationRegistry.getArguments().getString("pcToken");
        String b64 = InstrumentationRegistry.getArguments().getString("typeB64");
        org.junit.Assume.assumeNotNull(pc, token, b64);
        String text = new String(android.util.Base64.decode(b64, android.util.Base64.DEFAULT), "UTF-8");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            JSONObject c = call("connectClassic", new JSONObject().put("address", pc));
            assertFalse(c.toString(), c.has("error"));
            JSONObject t = call("sendClassic", new JSONObject().put("address", pc)
                .put("body", new JSONObject().put("action", "text").put("text", text).put("token", token).toString()));
            assertFalse(t.toString(), t.has("error"));
            JSONObject e = call("sendClassic", new JSONObject().put("address", pc)
                .put("body", new JSONObject().put("action", "shortcut").put("keys", "ENTER").put("token", token).toString()));
            assertFalse(e.toString(), e.has("error"));
            System.out.println("PC_BT_TYPED chars=" + text.length());
            call("disconnect", new JSONObject());
        }
    }
    /**
     * Eşleştirme testi (yalnız -e pcPin verilince): yerel ağda PC yardımcısını bulur,
     * 6 haneli kodla Wi‑Fi'dan anahtar alır; -e pcAddress verilirse aynı kodu
     * klasik Bluetooth ile gönderip anahtarla ping atar.
     */
    @Test public void pairsWithPcHelper() throws Exception {
        String pin = InstrumentationRegistry.getArguments().getString("pcPin");
        String pc = InstrumentationRegistry.getArguments().getString("pcAddress");
        org.junit.Assume.assumeNotNull(pin);
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            JSONObject bul = call("discover", new JSONObject().put("port", 8765).put("path", "/hello").put("marker", "not-bahcesi-clipboard"));
            assertFalse(bul.toString(), bul.has("error"));
            org.json.JSONArray bulunan = bul.getJSONObject("value").getJSONArray("cards");
            assertTrue("Ağda yardımcı bulunamadı: " + bul, bulunan.length() > 0);
            String url = bulunan.getString(0);
            System.out.println("PC_FOUND " + url + " " + bul.getJSONObject("value").optJSONArray("bodies"));
            JSONObject eslesme = call("request", new JSONObject().put("url", url + "/pair").put("method", "POST")
                .put("body", new JSONObject().put("pin", pin).toString()).put("token", ""));
            assertFalse(eslesme.toString(), eslesme.has("error"));
            JSONObject govde = new JSONObject(eslesme.getJSONObject("value").getString("body"));
            assertTrue(govde.toString(), govde.optBoolean("ok"));
            String token = govde.getString("token");
            assertEquals(43, token.length());
            System.out.println("PC_PAIRED_WIFI name=" + govde.optString("name"));
            if (pc != null) {
                JSONObject bt = call("sendClassic", new JSONObject().put("address", pc)
                    .put("body", new JSONObject().put("action", "pair").put("pin", pin).toString()));
                assertFalse(bt.toString(), bt.has("error"));
                assertEquals(token, bt.getJSONObject("value").getString("token"));
                JSONObject ping = call("sendClassic", new JSONObject().put("address", pc)
                    .put("body", new JSONObject().put("action", "ping").put("token", token).toString()));
                assertFalse(ping.toString(), ping.has("error"));
                System.out.println("PC_PAIRED_BLUETOOTH ok");
                call("disconnect", new JSONObject());
            }
        }
    }
    /** Sayfadaki bir JS ifadesinin (Promise olabilir) sonucunu bekler. */
    private JSONObject jsCall(String ifade, long sureMs) throws Exception {
        js("window.__cardQa=null;Promise.resolve().then(()=>" + ifade + ").then(v=>window.__cardQa={value:(v===undefined?null:v)})"
            + ".catch(e=>window.__cardQa={error:String(e&&e.message||e)})");
        long son = SystemClock.elapsedRealtime() + sureMs;
        while (SystemClock.elapsedRealtime() < son) {
            String r = js("window.__cardQa");
            if (!"null".equals(r)) return new JSONObject(r);
            SystemClock.sleep(150);
        }
        throw new AssertionError("JS zaman aşımı: " + ifade);
    }
    private void basari(String adim, JSONObject r) {
        assertFalse(adim + ": " + r, r.has("error"));
        System.out.println("E2E_OK " + adim);
    }
    /**
     * Editör yolları uçtan uca (yalnız -e e2e 1 verilince): editörün kullandığı
     * fonksiyonlarla (window.__nbUzak) dört yol sırayla kurulur, yoklanır ve
     * her birinden PC'de odaktaki metin alanına ayırt edilebilir bir satır
     * yazılır; kart kipinde PC panosuna metin gönderilir. PC tarafı sonucu
     * Not Defteri ve panodan karşılaştırır. Kullanıcının ayarları sonda geri yüklenir.
     * Argümanlar: pcPin, pcAddress, cardAddress, cardUrl, typeB64.
     */
    @Test public void editorPathsEndToEnd() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("e2e"));
        String pin = a.getString("pcPin"), pc = a.getString("pcAddress"), kart = a.getString("cardAddress"), kartUrl = a.getString("cardUrl");
        String metin = new String(android.util.Base64.decode(a.getString("typeB64"), android.util.Base64.DEFAULT), "UTF-8");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            // Kanca (lib/baglantiDurumu) kök düzende her sayfayla yüklenir.
            // Açılış sırasında WebView kısa süre yanıt vermeyebilir; o anki zaman aşımları sayılmaz.
            long son = SystemClock.elapsedRealtime() + 45000;
            boolean hazir = false;
            while (!hazir && SystemClock.elapsedRealtime() < son) {
                try { hazir = "true".equals(js("!!window.__nbUzak")); } catch (AssertionError gecis) { /* sayfa yükleniyor */ }
                if (!hazir) SystemClock.sleep(500);
            }
            assertTrue("Test kancası yüklenmedi", hazir);
            String orijinal = js("JSON.stringify(window.__nbUzak.prefs())");
            String orijinalKart = js("localStorage.getItem('nb-ble-card')");
            try {
                String q = JSONObject.quote(metin);
                // 1) Bilgisayar · Wi‑Fi: ağda bul + kodla eşleş (ayarlar ekranının yaptığı).
                JSONObject bul = jsCall("window.__nbUzak.bul()", 40000); basari("bilgisayar-bul", bul);
                String url = bul.getJSONArray("value").getJSONObject(0).getString("url");
                JSONObject es = jsCall("window.__nbUzak.eslestirWifi(" + JSONObject.quote(url) + "," + JSONObject.quote(pin) + ").then(s=>{const p=window.__nbUzak.prefs();window.__nbUzak.ayarla(Object.assign(p,s,{connection:'pc-wifi'}));return s.helperName;})", 20000);
                basari("eslestir-wifi " + es.optString("value"), es);
                JSONObject y = jsCall("window.__nbUzak.yokla()", 20000); basari("yokla-pc-wifi", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("yaz-pc-wifi", jsCall("window.__nbUzak.yaz('1 pcwifi '+" + q + "+'\\n')", 30000));
                // 2) Bilgisayar · Bluetooth: aynı anahtar, eşleşmiş PC adresi.
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{connection:'pc-bluetooth',helperBluetoothAddress:" + JSONObject.quote(pc) + "}))", 5000);
                y = jsCall("window.__nbUzak.yokla()", 30000); basari("yokla-pc-bt", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("yaz-pc-bt", jsCall("window.__nbUzak.yaz('2 pcbt '+" + q + "+'\\n')", 30000));
                // 3) Kart · Wi‑Fi: kartı bul (ayarlar ekranının yaptığı), sonra yaz.
                JSONObject kb = jsCall("window.__nbUzak.kartBul()", 40000); basari("kart-bul", kb);
                assertTrue(kb.toString(), kb.getJSONObject("value").getJSONArray("urls").toString().contains(kartUrl.replace("/", "\\/")));
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{connection:'wifi',cardUrl:" + JSONObject.quote(kartUrl) + "}))", 5000);
                y = jsCall("window.__nbUzak.yokla()", 20000); basari("yokla-kart-wifi", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("yaz-kart-wifi", jsCall("window.__nbUzak.yaz('3 kartwifi '+" + q + "+'\\n')", 30000));
                // 4) Kart · Bluetooth: kayıtlı kart adresi; yoklama editör gibi yeniden bağlanır.
                js("localStorage.setItem('nb-ble-card'," + JSONObject.quote(kart) + ")");
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{connection:'bluetooth'}))", 5000);
                y = jsCall("window.__nbUzak.yokla()", 30000); basari("yokla-kart-ble", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("yaz-kart-ble", jsCall("window.__nbUzak.yaz('4 kartble '+" + q + "+'\\n')", 30000));
                // Kart kipinde pano: eşleşmiş PC yardımcısına gider (aynı anahtar).
                basari("pano-kart-kipi", jsCall("window.__nbUzak.pano('PANO '+" + q + ")", 20000));
            } finally {
                // orijinal, evaluateJavascript'in döndürdüğü tırnaklı JSON metnidir.
                js("window.__nbUzak.ayarla(JSON.parse(" + orijinal + "))");
                js(orijinalKart == null || "null".equals(orijinalKart) ? "localStorage.removeItem('nb-ble-card')" : "localStorage.setItem('nb-ble-card'," + orijinalKart + ")");
                System.out.println("E2E_PREFS_RESTORED");
            }
        }
    }
    /**
     * Durum göstergesi dürüst mü? (yalnız -e signals 1 verilince; PC yardımcısı KAPALI olmalı)
     * Ulaşılamayan yol "hata", eksik kurulum "kurulmadi" dönmeli; asla "ok" değil.
     */
    @Test public void statusSignalsAreHonest() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("signals"));
        String pcUrl = a.getString("pcUrl");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 45000;
            boolean hazir = false;
            while (!hazir && SystemClock.elapsedRealtime() < son) {
                try { hazir = "true".equals(js("!!window.__nbUzak")); } catch (AssertionError gecis) { /* yükleniyor */ }
                if (!hazir) SystemClock.sleep(500);
            }
            assertTrue("Test kancası yüklenmedi", hazir);
            String orijinal = js("JSON.stringify(window.__nbUzak.prefs())");
            try {
                String[][] durumlar = {
                    { "{connection:'pc-wifi',helperUrl:" + JSONObject.quote(pcUrl) + ",helperToken:'gecersiz-anahtar'}", "hata", "pc-wifi yardımcı kapalı" },
                    { "{connection:'pc-wifi',helperUrl:'',helperToken:''}", "kurulmadi", "pc-wifi eşleşme yok" },
                    { "{connection:'pc-bluetooth',helperBluetoothAddress:'',helperToken:''}", "kurulmadi", "pc-bt seçim yok" },
                    { "{connection:'wifi',cardUrl:'http://192.168.1.250'}", "hata", "kart-wifi yanlış adres" },
                    { "{connection:'wifi',cardUrl:''}", "kurulmadi", "kart-wifi adres yok" }
                };
                for (String[] d : durumlar) {
                    jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs()," + d[0] + "))", 5000);
                    JSONObject y = jsCall("window.__nbUzak.yokla()", 30000);
                    assertFalse(y.toString(), y.has("error"));
                    String tur = y.getJSONObject("value").getString("tur");
                    System.out.println("SIGNAL " + d[2] + " -> " + tur + " : " + y.getJSONObject("value").optString("mesaj"));
                    assertEquals(d[2] + ": " + y, d[1], tur);
                }
            } finally {
                js("window.__nbUzak.ayarla(JSON.parse(" + orijinal + "))");
            }
        }
    }
    /**
     * Kodsuz PC Bluetooth (yalnız -e btCodeless 1 -e pcAddress … verilince): ayarlar
     * ekranının yaptığı gibi kodsuz bağlanır, yoklar ve panoya -e panoText gönderir.
     * Kullanıcının ayarları sonda geri yüklenir.
     */
    @Test public void pcBluetoothCodeless() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("btCodeless"));
        String pc = a.getString("pcAddress");
        String pano = new String(android.util.Base64.decode(a.getString("panoB64"), android.util.Base64.DEFAULT), "UTF-8");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 45000;
            boolean hazir = false;
            while (!hazir && SystemClock.elapsedRealtime() < son) {
                try { hazir = "true".equals(js("!!window.__nbUzak")); } catch (AssertionError gecis) { /* yükleniyor */ }
                if (!hazir) SystemClock.sleep(500);
            }
            assertTrue("Test kancası yüklenmedi", hazir);
            String orijinal = js("JSON.stringify(window.__nbUzak.prefs())");
            try {
                // Temiz başlangıç: anahtar yok (yeni kullanıcı gibi).
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{helperToken:'',helperUrl:'',helperName:'',helperBluetoothAddress:''}))", 5000);
                JSONObject b = jsCall("window.__nbUzak.eslestirBluetooth(" + JSONObject.quote(pc) + ").then(s=>{window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),s,{helperBluetoothAddress:" + JSONObject.quote(pc) + ",connection:'pc-bluetooth'}));return s.helperName;})", 30000);
                basari("bt-kodsuz-baglan " + b.optString("value"), b);
                JSONObject y = jsCall("window.__nbUzak.yokla()", 30000); basari("bt-yokla", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("bt-pano", jsCall("window.__nbUzak.pano(" + JSONObject.quote(pano) + ")", 20000));
            } finally {
                js("window.__nbUzak.ayarla(JSON.parse(" + orijinal + "))");
                System.out.println("E2E_PREFS_RESTORED");
            }
        }
    }
    /**
     * Programsız Bilgisayar · Bluetooth (yalnız -e btHid 1 -e pcAddress … -e typeB64 … verilince):
     * telefon Bluetooth klavye olarak bağlanır, yoklar, PC'de odaktaki alana metin + Enter yazar.
     */
    @Test public void pcBluetoothHid() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("btHid"));
        String pc = a.getString("pcAddress");
        String metin = new String(android.util.Base64.decode(a.getString("typeB64"), android.util.Base64.DEFAULT), "UTF-8");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 45000;
            boolean hazir = false;
            while (!hazir && SystemClock.elapsedRealtime() < son) {
                try { hazir = "true".equals(js("!!window.__nbUzak")); } catch (AssertionError gecis) { /* yükleniyor */ }
                if (!hazir) SystemClock.sleep(500);
            }
            assertTrue("Test kancası yüklenmedi", hazir);
            String orijinal = js("JSON.stringify(window.__nbUzak.prefs())");
            try {
                JSONObject b = jsCall("window.__nbUzak.btKlavye(" + JSONObject.quote(pc) + ")", 30000); basari("hid-baglan", b);
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{connection:'pc-bluetooth',helperBluetoothAddress:" + JSONObject.quote(pc) + "}))", 5000);
                JSONObject y = jsCall("window.__nbUzak.yokla()", 30000); basari("hid-yokla", y);
                assertEquals(y.toString(), "ok", y.getJSONObject("value").getString("tur"));
                basari("hid-yaz", jsCall("window.__nbUzak.yaz(" + JSONObject.quote(metin + "\n") + ")", 60000));
                basari("hid-kisayol-home", jsCall("window.__nbUzak.tus('END')", 10000));
            } finally {
                js("window.__nbUzak.ayarla(JSON.parse(" + orijinal + "))");
                System.out.println("E2E_PREFS_RESTORED");
            }
        }
    }
    /**
     * Kart Wi‑Fi fare (yalnız -e udpMouse 1 -e cardUrl … verilince): yoklama UDP portunu
     * öğrenir; sonra editörün fare yüzeyinin gönderdiği gibi 'mm:' komutları gider
     * (sağa 10×+20, sola 10×-20). PC tarafı imleç konumunu ölçer.
     */
    @Test public void cardUdpMouse() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("udpMouse"));
        String kartUrl = a.getString("cardUrl");
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 45000;
            boolean hazir = false;
            while (!hazir && SystemClock.elapsedRealtime() < son) {
                try { hazir = "true".equals(js("!!window.__nbUzak")); } catch (AssertionError gecis) { /* yükleniyor */ }
                if (!hazir) SystemClock.sleep(500);
            }
            assertTrue("Test kancası yüklenmedi", hazir);
            String orijinal = js("JSON.stringify(window.__nbUzak.prefs())");
            try {
                jsCall("window.__nbUzak.ayarla(Object.assign(window.__nbUzak.prefs(),{connection:'wifi',cardUrl:" + JSONObject.quote(kartUrl) + "}))", 5000);
                JSONObject y = jsCall("window.__nbUzak.yokla()", 20000); basari("udp-yokla", y);
                long t0 = SystemClock.elapsedRealtime();
                for (int i = 0; i < 10; i++) jsCall("window.__nbUzak.komut('mm:20,0')", 5000);
                long saga = SystemClock.elapsedRealtime() - t0;
                System.out.println("E2E_UDP_SAGA_MS " + saga);
                SystemClock.sleep(1500);
                t0 = SystemClock.elapsedRealtime();
                for (int i = 0; i < 10; i++) jsCall("window.__nbUzak.komut('mm:-20,0')", 5000);
                System.out.println("E2E_UDP_SOLA_MS " + (SystemClock.elapsedRealtime() - t0));
            } finally {
                js("window.__nbUzak.ayarla(JSON.parse(" + orijinal + "))");
                System.out.println("E2E_PREFS_RESTORED");
            }
        }
    }
    /**
     * Bluetooth klavye eşleştirme modu (yalnız -e hidPair 1): klavyeyi başlatır, telefonu
     * görünür yapar ve PC tarafından eşleştirme + klavye bağlantısı gelene kadar (en çok
     * -e beklemeSn, varsayılan 150) uygulamayı açık tutar.
     */
    @Test public void hidPairingMode() throws Exception {
        android.os.Bundle a = InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(a.getString("hidPair"));
        int sure = Integer.parseInt(a.getString("beklemeSn", "150"));
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            JSONObject r = call("hidStart", new JSONObject()); basari("hid-basladi", r);
            basari("gorunur-istendi", call("hidDiscoverable", new JSONObject()));
            long son = SystemClock.elapsedRealtime() + sure * 1000L;
            while (SystemClock.elapsedRealtime() < son) {
                JSONObject d = call("hidStatus", new JSONObject());
                if (d.getJSONObject("value").optBoolean("bagli")) { System.out.println("E2E_HID_BAGLANDI " + d.getJSONObject("value").optString("adres")); SystemClock.sleep(3000); return; }
                SystemClock.sleep(1000);
            }
            fail("Süre içinde PC klavye olarak bağlanmadı");
        }
    }
    /** Kart arama testi (yalnız -e expectCardUrl verilince): yerel ağ taramasında kart bulunmalı. */
    @Test public void findsCardOnLocalWifi() throws Exception {
        String beklenen = InstrumentationRegistry.getArguments().getString("expectCardUrl");
        org.junit.Assume.assumeNotNull(beklenen);
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            for (int tur = 0; tur < 3; tur++) {
                JSONObject bul = call("discover", new JSONObject());
                assertFalse(bul.toString(), bul.has("error"));
                org.json.JSONArray kartlar = bul.getJSONObject("value").getJSONArray("cards");
                boolean var = false;
                for (int i = 0; i < kartlar.length(); i++) var |= beklenen.equals(kartlar.getString(i));
                System.out.println("CARD_DISCOVER round=" + tur + " " + kartlar);
                assertTrue("Kart bulunamadı (tur " + tur + "): " + kartlar, var);
            }
        }
    }
    @Test public void scanResultsArriveBeforeCompletion() throws Exception {
        org.junit.Assume.assumeNotNull(InstrumentationRegistry.getArguments().getString("cardAddress"));
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            long deadline = SystemClock.elapsedRealtime() + 30000;
            while (!"true".equals(js("!!window.Capacitor?.nativePromise"))
                && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(200);
            js("window.__scanFirst=0;window.__scanEvents=0;window.__scanDone=false;"
                + "window.__scanListener=window.Capacitor.Plugins.RemoteBridge.addListener('bleScanDevice',"
                + "e=>{if(e.scanId==='card-live-test'){window.__scanEvents++;if(!window.__scanFirst)window.__scanFirst=Date.now();}})");
            js("window.__scanStart=Date.now();window.__scanError=null;"
                + "Promise.resolve(window.__scanListener).then(()=>window.Capacitor.nativePromise('RemoteBridge','scan',{scanId:'card-live-test'}))"
                + ".then(()=>window.__scanDone=true).catch(e=>window.__scanError=e.message)");
            try {
                deadline = SystemClock.elapsedRealtime() + 6500;
                while ("0".equals(js("window.__scanEvents")) && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(150);
                assertTrue("No live discovery event: " + js("window.__scanError"), Integer.parseInt(js("window.__scanEvents")) > 0);
                assertEquals("Scan already completed before first event", "false", js("window.__scanDone"));
                System.out.println("CARD_LIVE_SCAN_FIRST_EVENT_MS=" + js("window.__scanFirst-window.__scanStart"));
                deadline = SystemClock.elapsedRealtime() + 10000;
                while (!"true".equals(js("window.__scanDone")) && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(150);
                assertEquals(js("window.__scanError"), "true", js("window.__scanDone"));
            } finally {
                js("Promise.resolve(window.__scanListener).then(l=>l.remove())");
            }
        }
    }
    /**
     * Teshis (yalnizca -e teshis 1 verilince): hicbir seyi degistirmeden kayitli
     * tercihleri, yakin/eslesmis Bluetooth cihazlarini (ad, adres, sinyal) ve kart
     * aramasini yazdirir. "Kart gorunmuyor" sorununda neyin eksik oldugunu
     * (izin, menzil, ad) ayirt etmek icin kullanilir.
     */
    @Test public void teshis() throws Exception {
        org.junit.Assume.assumeNotNull(InstrumentationRegistry.getArguments().getString("teshis"));
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            hazirBekle();
            long son = SystemClock.elapsedRealtime() + 25000;
            while (!"true".equals(js("!!window.__nbUzak")) && SystemClock.elapsedRealtime() < son) SystemClock.sleep(250);
            System.out.println("TESHIS_PREFS " + js("JSON.stringify(window.__nbUzak.prefs())"));
            System.out.println("TESHIS_WIFI " + call("wifiAddress", new JSONObject()));
            System.out.println("TESHIS_BLE " + call("scan", new JSONObject().put("scanId", "teshis")));
            System.out.println("TESHIS_ESLESMIS " + call("scanPaired", new JSONObject()));
            js("window.__teshisKart=null;window.__nbUzak.kartBul().then(v=>window.__teshisKart={value:v}).catch(e=>window.__teshisKart={error:e.message})");
            long bitis = SystemClock.elapsedRealtime() + 45000;
            String ham = "null";
            while ("null".equals(ham) && SystemClock.elapsedRealtime() < bitis) { SystemClock.sleep(500); ham = js("window.__teshisKart"); }
            System.out.println("TESHIS_KART_ARAMA " + ham);
        }
    }

    @Test public void wifiAndBleRemainAvailableTogether() throws Exception {
        String address = InstrumentationRegistry.getArguments().getString("cardAddress");
        String url = InstrumentationRegistry.getArguments().getString("cardUrl");
        org.junit.Assume.assumeNotNull(address, url);
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario = activity;
            long deadline = SystemClock.elapsedRealtime() + 30000;
            while (!"true".equals(js("!!window.Capacitor?.nativePromise"))
                && SystemClock.elapsedRealtime() < deadline) SystemClock.sleep(200);
            long previousUptime = -1;
            for (int round = 0; round < 2; round++) {
                assertFalse(call("connect", new JSONObject().put("address", address)).has("error"));
                try {
                    for (int sample = 0; sample < 15; sample++) {
                        assertFalse(call("send", new JSONObject().put("command", "s")).has("error"));
                        JSONObject reply = call("request", new JSONObject().put("url", url + "/api/status")
                            .put("method", "GET").put("body", "").put("token", ""));
                        assertFalse(reply.toString(), reply.has("error"));
                        JSONObject value = reply.getJSONObject("value");
                        assertEquals(200, value.getInt("status"));
                        JSONObject status = new JSONObject(value.getString("body"));
                        assertTrue("BLE disabled", status.getJSONObject("ble").getBoolean("on"));
                        long uptime = status.getLong("uptime");
                        assertTrue("Card rebooted", uptime >= previousUptime);
                        previousUptime = uptime;
                        System.out.println("CARD_DUAL_OK round=" + round + " sample=" + sample + " uptime=" + uptime);
                        SystemClock.sleep(2000);
                    }
                } finally {
                    // Kesme hatası asıl hatayı gizlemesin.
                    try { call("disconnect", new JSONObject()); }
                    catch (AssertionError e) { System.out.println("CARD_DISCONNECT_AFTER_FAIL " + e.getMessage()); }
                }
            }
        }
    }
}
