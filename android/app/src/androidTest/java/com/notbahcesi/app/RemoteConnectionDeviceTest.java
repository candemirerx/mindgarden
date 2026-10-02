package com.notbahcesi.app;

import static org.junit.Assert.*;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Opt-in real PC tests. Only clipboard and reversible cursor movement are sent. */
@RunWith(AndroidJUnit4.class)
public class RemoteConnectionDeviceTest {
    @Test public void repairCardPairing() throws Exception {
        String address=InstrumentationRegistry.getArguments().getString("repairCardAddress");
        if(!"A4:CB:8F:D8:D4:7D".equals(address))return;
        android.bluetooth.BluetoothDevice device=android.bluetooth.BluetoothAdapter.getDefaultAdapter().getRemoteDevice(address);
        if(device.getBondState()==android.bluetooth.BluetoothDevice.BOND_BONDED){
            assertTrue((Boolean)device.getClass().getMethod("removeBond").invoke(device));
            long end=SystemClock.elapsedRealtime()+8000;
            while(device.getBondState()!=android.bluetooth.BluetoothDevice.BOND_NONE&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
        }
        assertTrue("Fresh pairing could not start",device.createBond());
        long end=SystemClock.elapsedRealtime()+45000;
        while(device.getBondState()!=android.bluetooth.BluetoothDevice.BOND_BONDED&&SystemClock.elapsedRealtime()<end)SystemClock.sleep(200);
        assertEquals("Confirm card pairing on phone",android.bluetooth.BluetoothDevice.BOND_BONDED,device.getBondState());
    }
    @Test public void cardConnectionsProbe() throws Exception {
        try(ActivityScenario<MainActivity> activity=ActivityScenario.launch(MainActivity.class)){
            scenario=activity;ready();
            JSONObject wifi=call("discover",new JSONObject());
            System.out.println("CARD_WIFI="+wifi);
            System.out.println("CARD_SAVED_URL="+js("JSON.parse(localStorage.getItem('nb-remote-prefs-v1')||'{}').cardUrl||'http://192.168.4.1'"));
            JSONObject scanned=call("scan",new JSONObject());
            System.out.println("CARD_BLE_SCAN="+scanned);
            if(scanned.has("error"))fail(scanned.getString("error"));
            JSONArray devices=scanned.getJSONObject("value").getJSONArray("devices");
            for(int i=0;i<devices.length();i++){
                JSONObject device=devices.getJSONObject(i);
                String name=device.optString("name").toLowerCase(java.util.Locale.ROOT);
                if(!name.contains("usb hid")&&!name.contains("kablosuz")&&!name.contains("bellek"))continue;
                JSONObject result=call("connect",new JSONObject().put("address",device.getString("address")));
                System.out.println("CARD_BLE_CONNECT="+device.getString("address")+":"+result);
                if(!result.has("error")){
                    System.out.println("CARD_BLE_MOVE="+call("send",new JSONObject().put("command","mm:3,0")));
                    System.out.println("CARD_BLE_RESTORE="+call("send",new JSONObject().put("command","mm:-3,0")));
                }
                call("disconnect",new JSONObject());
            }
        }
    }
    @Test public void bluetoothServiceDiagnostics() throws Exception {
        String address=InstrumentationRegistry.getArguments().getString("pcAddress");
        if(address==null)return;
        android.bluetooth.BluetoothAdapter adapter=android.bluetooth.BluetoothAdapter.getDefaultAdapter();
        android.bluetooth.BluetoothDevice device=adapter.getRemoteDevice(address);
        android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        CountDownLatch fetched=new CountDownLatch(1);
        android.content.BroadcastReceiver receiver=new android.content.BroadcastReceiver(){
            @Override public void onReceive(android.content.Context c, android.content.Intent i){
                System.out.println("PC_SDP="+java.util.Arrays.toString((android.os.Parcelable[])i.getParcelableArrayExtra(android.bluetooth.BluetoothDevice.EXTRA_UUID)));
                fetched.countDown();
            }
        };
        context.registerReceiver(receiver,new android.content.IntentFilter(android.bluetooth.BluetoothDevice.ACTION_UUID),android.content.Context.RECEIVER_EXPORTED);
        try { adapter.cancelDiscovery(); device.fetchUuidsWithSdp(); fetched.await(20,TimeUnit.SECONDS); }
        finally {context.unregisterReceiver(receiver);}
        java.util.UUID service=java.util.UUID.fromString("93c7b30b-d973-4873-bf10-148491968b2c");
        for(boolean secure:new boolean[]{true,false}) {
            android.bluetooth.BluetoothSocket socket=secure?device.createRfcommSocketToServiceRecord(service):device.createInsecureRfcommSocketToServiceRecord(service);
            try {socket.connect();System.out.println("PC_CONNECT secure="+secure+" OK");}
            catch(Exception e){System.out.println("PC_CONNECT secure="+secure+" "+e);}
            finally{socket.close();}
        }
    }
    private ActivityScenario<MainActivity> scenario;
    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch ready = new CountDownLatch(1);
        scenario.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); ready.countDown(); }));
        assertTrue("WebView did not reply", ready.await(5, TimeUnit.SECONDS));
        return result.get();
    }
    private JSONObject call(String method, JSONObject options) throws Exception {
        js("window.__pcQa=null;window.Capacitor.nativePromise('RemoteBridge'," + JSONObject.quote(method) + "," + options + ").then(v=>window.__pcQa={value:v||{}}).catch(e=>window.__pcQa={error:e.message})");
        long deadline = SystemClock.elapsedRealtime() + 45000;
        while (SystemClock.elapsedRealtime() < deadline) {
            String value = js("window.__pcQa");
            if (!"null".equals(value)) return new JSONObject(value);
            SystemClock.sleep(150);
        }
        fail("PC operation timed out: " + method); return null;
    }
    private void ready() throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(js("!!window.Capacitor?.nativePromise"))) return;
            SystemClock.sleep(200);
        }
        fail("Capacitor not ready");
    }
    private JSONObject http(String base, String path, String method, String body, String token) throws Exception {
        JSONObject result = call("request", new JSONObject().put("url",base+path).put("method",method).put("body",body).put("token",token));
        assertFalse(result.optString("error"), result.has("error"));
        return result.getJSONObject("value");
    }
    @Test public void wifiPcClipboardAndCommands() throws Exception {
        String url = InstrumentationRegistry.getArguments().getString("pcUrl");
        String token = InstrumentationRegistry.getArguments().getString("pcToken");
        if (url == null || token == null) return;
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario=activity; ready();
            assertEquals(401,http(url,"/health","GET","","invalid-test-token").getInt("status"));
            JSONObject health=http(url,"/health","GET","",token);
            assertEquals(200,health.getInt("status"));
            assertEquals("not-bahcesi-clipboard",new JSONObject(health.getString("body")).getString("app"));
            assertEquals(200,http(url,"/input","POST","{\"action\":\"ping\"}",token).getInt("status"));
            assertEquals(200,http(url,"/clipboard","POST","Not Bahçesi Wi-Fi testi: çığöşü 🌿",token).getInt("status"));
            assertEquals(200,http(url,"/input","POST","{\"action\":\"move\",\"dx\":3,\"dy\":0}",token).getInt("status"));
            assertEquals(200,http(url,"/input","POST","{\"action\":\"move\",\"dx\":-3,\"dy\":0}",token).getInt("status"));
            if ("true".equals(InstrumentationRegistry.getArguments().getString("selectPc")))
                js("(()=>{const p=JSON.parse(localStorage.getItem('nb-remote-prefs-v1')||'{}');p.connection='pc-wifi';p.helperUrl="+JSONObject.quote(url)+";p.helperToken="+JSONObject.quote(token)+";localStorage.setItem('nb-remote-prefs-v1',JSON.stringify(p));})()");
        }
    }
    @Test public void bluetoothPcClipboardAndReconnect() throws Exception {
        String name = InstrumentationRegistry.getArguments().getString("pcName");
        String token = InstrumentationRegistry.getArguments().getString("pcToken");
        if (name == null || token == null) return;
        try (ActivityScenario<MainActivity> activity = ActivityScenario.launch(MainActivity.class)) {
            scenario=activity; ready();
            JSONObject paired=call("scanPaired",new JSONObject());
            assertFalse(paired.optString("error"),paired.has("error"));
            JSONArray devices=paired.getJSONObject("value").getJSONArray("devices");
            String address=null;
            for(int i=0;i<devices.length();i++) {
                JSONObject device=devices.getJSONObject(i);
                if(!name.equalsIgnoreCase(device.optString("name"))) continue;
                String only=InstrumentationRegistry.getArguments().getString("pcAddress");
                if(only!=null&&!only.equals(device.getString("address")))continue;
                if("true".equals(InstrumentationRegistry.getArguments().getString("refreshSdp"))) {
                    android.bluetooth.BluetoothAdapter.getDefaultAdapter().getRemoteDevice(device.getString("address")).fetchUuidsWithSdp();
                    SystemClock.sleep(2500);
                }
                JSONObject connection=call("connectClassic",new JSONObject().put("address",device.getString("address")));
                if(connection.has("error")) System.out.println("BT_CONNECT_FAILURE="+device.getString("address")+":"+connection.getString("error"));
                if(!connection.has("error")) { address=device.getString("address"); break; }
            }
            assertNotNull("PC not paired or incoming COM unavailable: "+devices,address);
            JSONObject ping=new JSONObject().put("action","ping").put("token",token);
            assertFalse(call("sendClassic",new JSONObject().put("body",ping.toString()).put("address",address)).has("error"));
            call("disconnect",new JSONObject());
            // The next command must reconnect without another device-selection step.
            JSONObject clipboard=new JSONObject().put("action","clipboard").put("text","Not Bahçesi Bluetooth testi: çığöşü 🌿").put("token",token);
            JSONObject reply=call("sendClassic",new JSONObject().put("body",clipboard.toString()).put("address",address));
            assertFalse(reply.optString("error"),reply.has("error"));
            JSONObject invalid=new JSONObject().put("action","ping").put("token","invalid-test-token");
            assertTrue(call("sendClassic",new JSONObject().put("body",invalid.toString()).put("address",address)).has("error"));
            assertFalse(call("sendClassic",new JSONObject().put("body",ping.toString()).put("address",address)).has("error"));
            js("(()=>{const p=JSON.parse(localStorage.getItem('nb-remote-prefs-v1')||'{}');p.helperBluetoothAddress="+JSONObject.quote(address)+";p.helperToken="+JSONObject.quote(token)+";p.helperUrl="+JSONObject.quote(InstrumentationRegistry.getArguments().getString("pcUrl", "http://192.168.1.109:8765"))+";if(!['pc-wifi','pc-bluetooth'].includes(p.connection))p.connection='pc-bluetooth';localStorage.setItem('nb-remote-prefs-v1',JSON.stringify(p));})()");
            call("disconnect",new JSONObject());
        }
    }
}
