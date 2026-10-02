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
        assertTrue("WebView timeout", ready.await(5, TimeUnit.SECONDS));
        return result.get();
    }
    private JSONObject call(String method, JSONObject args) throws Exception {
        js("window.__cardQa=null;window.Capacitor.nativePromise('RemoteBridge',"
            + JSONObject.quote(method) + "," + args
            + ").then(v=>window.__cardQa={value:v||{}}).catch(e=>window.__cardQa={error:e.message})");
        long deadline = SystemClock.elapsedRealtime() + 20000;
        while (SystemClock.elapsedRealtime() < deadline) {
            String result = js("window.__cardQa");
            if (!"null".equals(result)) return new JSONObject(result);
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
                } finally { call("disconnect", new JSONObject()); }
            }
        }
    }
}
