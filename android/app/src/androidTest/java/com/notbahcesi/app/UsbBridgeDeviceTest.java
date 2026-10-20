package com.notbahcesi.app;

import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import android.os.SystemClock;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;

/** Read-only device check; no notes, preferences, pairing or clipboards are changed. */
public class UsbBridgeDeviceTest {
    private String js(ActivityScenario<MainActivity> scene, String expression) throws Exception {
        CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> value=new AtomicReference<>();
        scene.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(expression, v -> {value.set(v);latch.countDown();}));
        assertTrue(latch.await(10,TimeUnit.SECONDS));return value.get();
    }
    private JSONObject request(ActivityScenario<MainActivity> scene, String path) throws Exception {
        js(scene,"window.__usbProbe=null;window.Capacitor.nativePromise('RemoteBridge','request',{url:'http://127.0.0.1:18775"+path+"',method:'GET'}).then(v=>window.__usbProbe=v).catch(e=>window.__usbProbe={error:e.message})");
        long end=SystemClock.elapsedRealtime()+15000;
        while(SystemClock.elapsedRealtime()<end){String raw=js(scene,"window.__usbProbe");if(!"null".equals(raw))return new JSONObject(raw);SystemClock.sleep(100);}
        throw new AssertionError("USB probe timed out");
    }
    @Test public void nativeUsbTunnelAndAuthentication() throws Exception {
        try(ActivityScenario<MainActivity> scene=ActivityScenario.launch(MainActivity.class)) {
            long end=SystemClock.elapsedRealtime()+30000;
            while(!"true".equals(js(scene,"!!window.Capacitor?.nativePromise")) && SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
            JSONObject hello=request(scene,"/hello");assertEquals(200,hello.getInt("status"));
            assertEquals("cep-kopru-pc",new JSONObject(hello.getString("body")).getString("app"));
            assertEquals(401,request(scene,"/health").getInt("status"));
            System.out.println("PASS: Not Bahcesi native USB tunnel; unauthenticated access rejected");
        }
    }
}
