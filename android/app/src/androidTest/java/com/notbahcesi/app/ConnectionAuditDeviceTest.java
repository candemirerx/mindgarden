package com.notbahcesi.app;

import static org.junit.Assert.*;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.Test;

/** Opt-in audit; only caller-provided fixture data is transferred. No notes are edited. */
public class ConnectionAuditDeviceTest {
    private ActivityScenario<MainActivity> scenario;
    private String js(String s) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> out = new AtomicReference<>();
        scenario.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(s, v -> {out.set(v);latch.countDown();}));
        assertTrue(latch.await(15, TimeUnit.SECONDS)); return out.get();
    }
    private JSONObject invoke(String expr) throws Exception {
        js("window.__audit=null;Promise.resolve().then(()=>eval("+JSONObject.quote(expr)+")).then(value=>window.__audit={value:value??null}).catch(e=>window.__audit={error:e.message})");
        long end=SystemClock.elapsedRealtime()+600000;
        while(SystemClock.elapsedRealtime()<end){String s=js("window.__audit");if(!"null".equals(s))return new JSONObject(s);SystemClock.sleep(100);}
        throw new AssertionError("Operation timeout");
    }
    private JSONObject nativeCall(String method,JSONObject p) throws Exception {
        return invoke("window.Capacitor.nativePromise('RemoteBridge',"+JSONObject.quote(method)+","+p+")");
    }
    private void ready() throws Exception {
        long end=SystemClock.elapsedRealtime()+40000;
        while(SystemClock.elapsedRealtime()<end){if("true".equals(js("!!window.__nbUzak")))return;SystemClock.sleep(200);}
        fail("Bridge not ready");
    }
    @Test public void audit() throws Exception {
        android.os.Bundle args=InstrumentationRegistry.getArguments();
        org.junit.Assume.assumeNotNull(args.getString("audit"));
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)){
            scenario=a;ready();
            String base=args.getString("cardUrl","http://192.168.4.1");
            JSONObject r=nativeCall("request",new JSONObject().put("url",base+"/api/status").put("method","GET"));
            assertFalse(r.toString(),r.has("error"));
            JSONObject response=r.getJSONObject("value"); assertEquals(200,response.getInt("status"));
            JSONObject s=new JSONObject(response.getString("body"));
            System.out.println("AUDIT_CARD fw="+s.optString("fw")+" uptime="+s.optLong("uptime")+" ble="+s.optJSONObject("ble")+" wifi="+s.optJSONObject("wifi"));
            System.out.println("AUDIT_SCAN "+nativeCall("scan",new JSONObject()));
            String command=args.getString("expression");
            if(command!=null){JSONObject result=invoke(command);assertFalse(result.toString(),result.has("error"));System.out.println("AUDIT_RESULT "+result);}
        }
    }
    @Test public void transfers() throws Exception {
        org.junit.Assume.assumeNotNull(InstrumentationRegistry.getArguments().getString("transfers"));
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            scenario=a;ready();
            JSONObject r=invoke("(()=>{const p=window.__nbUzak.prefs();window.__nbUzak.ayarla({...p,connection:'wifi',agTuru:'kart-ap',cardUrl:'http://192.168.4.1',autoBaglan:false});return true})()");
            assertFalse(r.toString(),r.has("error"));
            if ("tailscale".equals(InstrumentationRegistry.getArguments().getString("route"))) {
                r=invoke("window.__nbUzak.eslestirBluetooth('6C:4C:BC:87:C5:86').then(p=>{window.__nbUzak.ayarla({...window.__nbUzak.prefs(),...p,helperUrl:'http://100.65.172.25:8765',connection:'pc-wifi',agTuru:'tailscale',autoBaglan:false});return true})");
                assertFalse(r.toString(),r.has("error"));
            } else if ("bluetooth".equals(InstrumentationRegistry.getArguments().getString("route"))) {
                r=invoke("window.__nbUzak.eslestirBluetooth('6C:4C:BC:87:C5:86').then(p=>{window.__nbUzak.ayarla({...window.__nbUzak.prefs(),...p,helperUrl:'',connection:'bluetooth'});return true})");
                assertFalse(r.toString(),r.has("error"));
                r=nativeCall("connect",new JSONObject().put("address","10:20:BA:46:A0:D1"));assertFalse(r.toString(),r.has("error"));
                js("localStorage.setItem('nb-ble-card','10:20:BA:46:A0:D1')");
            }
            r=invoke("window.__nbUzak.yokla()");
            assertEquals(r.toString(),"ok",r.getJSONObject("value").getString("tur"));
            String fixture="NB-AUDIT-20261010 Türkçe ğüşöçıİ • fotoğraf/dosya/pano";
            r=invoke("window.__nbUzak.telefonPanoYaz({metin:"+JSONObject.quote(fixture)+"})");
            assertFalse(r.toString(),r.has("error"));
            r=invoke("window.__nbUzak.telefonPanoOku()");
            assertEquals(fixture,r.getJSONObject("value").getString("metin"));
            System.out.println("AUDIT_PASS PHONE_CLIPBOARD_TEXT");
            r=invoke("window.__nbUzak.telefonPanoGonder()");assertFalse(r.toString(),r.has("error"));
            System.out.println("AUDIT_PASS PHONE_TO_PC_CLIPBOARD_TEXT");
            byte[] binary=new byte[1024*1024+37];for(int i=0;i<binary.length;i++)binary[i]=(byte)(i*31+7);
            sendFile("NB-AUDIT-20261010-binary.bin",binary,"application/octet-stream","dosya","dosya");
            String bigMb=InstrumentationRegistry.getArguments().getString("bigMb");
            if(bigMb!=null){
                long t0=System.currentTimeMillis();
                int bigBytes=Integer.parseInt(bigMb)*1024*1024;
                String gen="(()=>{const n="+bigBytes+";const parts=[];for(let o=0;o<n;o+=3*65536){const m=Math.min(3*65536,n-o);const a=new Uint8Array(m);for(let i=0;i<m;i++)a[i]=((o+i)*17+3)&255;let s='';for(let i=0;i<m;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,Math.min(m,i+8192)));parts.push(btoa(s))}return parts.join('')})()";
                r=invoke("window.__nbUzak.dosya('NB-AUDIT-20261010-big.bin',"+gen+",'dosya','application/octet-stream','dosya')");
                assertFalse(r.toString(),r.has("error"));
                java.security.MessageDigest md=java.security.MessageDigest.getInstance("SHA-256");byte[] blk=new byte[1<<20];
                for(int o=0;o<bigBytes;o+=blk.length){for(int i=0;i<blk.length;i++)blk[i]=(byte)(((o+i)*17+3)&255);md.update(blk,0,Math.min(blk.length,bigBytes-o));}
                System.out.println("AUDIT_PASS BIG bytes="+bigBytes+" sha256="+hex(md.digest())+" ms="+(System.currentTimeMillis()-t0));
            }
            sendFile("NB-AUDIT-20261010-empty.txt",new byte[0],"text/plain","dosya","dosya");
            sendFile("NB-AUDIT-20261010-Türkçe.txt",fixture.getBytes(java.nio.charset.StandardCharsets.UTF_8),"text/plain","dosya","dosya");
            android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(4,4,android.graphics.Bitmap.Config.ARGB_8888);
            bitmap.eraseColor(android.graphics.Color.rgb(36,129,197));
            java.io.ByteArrayOutputStream stream=new java.io.ByteArrayOutputStream();bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,stream);bitmap.recycle();
            byte[] png=stream.toByteArray();
            sendFile("NB-AUDIT-20261010-photo.png",png,"image/png","dosya","gorsel");
            String b64=android.util.Base64.encodeToString(png,android.util.Base64.NO_WRAP);
            r=nativeCall("writeClipboard",new JSONObject().put("images",new org.json.JSONArray().put(new JSONObject().put("mime","image/png").put("data",b64))));
            assertFalse(r.toString(),r.has("error"));
            r=nativeCall("readClipboard",new JSONObject()); assertFalse(r.toString(),r.has("error"));
            assertEquals("image/png",r.getJSONObject("value").getString("mime"));
            assertTrue(r.getJSONObject("value").getString("data").length()>0);
            System.out.println("AUDIT_PASS PHONE_CLIPBOARD_IMAGE");
            r=invoke("window.__nbUzak.telefonPanoGonder()");assertFalse(r.toString(),r.has("error"));
            System.out.println("AUDIT_PASS PHONE_TO_PC_CLIPBOARD_IMAGE");
            r=invoke("(()=>{window.__nbUzak.ayarla({...window.__nbUzak.prefs(),autoBaglan:true});return true})()");assertFalse(r.toString(),r.has("error"));
        }
    }
    @Test public void chunkProbe() throws Exception {
        org.junit.Assume.assumeNotNull(InstrumentationRegistry.getArguments().getString("probe"));
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            scenario=a;ready();
            for(int size:new int[]{1024,4096,8192,20000}) {
                StringBuilder data=new StringBuilder();for(int i=0;i<size;i++)data.append('A');
                JSONObject body=new JSONObject().put("action","parca").put("id","nbauditprobe"+size).put("sira",0).put("veri",data.toString());
                JSONObject r=nativeCall("request",new JSONObject().put("url","http://192.168.4.1/api/pcbridge").put("method","POST").put("body",body.toString()));
                System.out.println("AUDIT_PROBE bytes="+size+" result="+r);
            }
        }
    }
    private void sendFile(String name,byte[] data,String mime,String target,String kind) throws Exception {
        String b64=android.util.Base64.encodeToString(data,android.util.Base64.NO_WRAP);
        String payload=data.length>1024*1024
            ? "(()=>{let s='';for(let i=0;i<1048613;i++)s+=String.fromCharCode((i*31+7)&255);return btoa(s)})()"
            : JSONObject.quote(b64);
        JSONObject r=invoke("window.__nbUzak.dosya("+JSONObject.quote(name)+","+payload+","+JSONObject.quote(target)+","+JSONObject.quote(mime)+","+JSONObject.quote(kind)+")");
        assertFalse(r.toString(),r.has("error"));
        System.out.println("AUDIT_PASS FILE "+name+" bytes="+data.length+" sha256="+hex(java.security.MessageDigest.getInstance("SHA-256").digest(data)));
    }
    private String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte v:b)s.append(String.format("%02x",v&255));return s.toString();}
    @Test public void stability() throws Exception {
        org.junit.Assume.assumeNotNull(InstrumentationRegistry.getArguments().getString("stability"));
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            scenario=a;ready();long start=SystemClock.elapsedRealtime();
            boolean bluetooth="bluetooth".equals(InstrumentationRegistry.getArguments().getString("route"));
            if(bluetooth){JSONObject r=nativeCall("connect",new JSONObject().put("address","10:20:BA:46:A0:D1"));assertFalse(r.toString(),r.has("error"));}
            for(int i=0;i<60;i++){
                if(bluetooth){
                    JSONObject r=nativeCall("send",new JSONObject().put("command","s"));assertFalse(r.toString(),r.has("error"));
                    r=nativeCall("bleStatus",new JSONObject());assertTrue(r.toString(),r.getJSONObject("value").getBoolean("connected"));
                    r=invoke("window.Capacitor.nativePromise('RemoteBridge','sendClassic',{address:window.__nbUzak.prefs().helperBluetoothAddress,body:JSON.stringify({action:'ping',token:window.__nbUzak.prefs().helperToken})})");
                    assertFalse(r.toString(),r.has("error"));
                    if(i%6==0)System.out.println("AUDIT_STABILITY_BT "+(i+1)+"/60 elapsedMs="+(SystemClock.elapsedRealtime()-start));
                    SystemClock.sleep(5000);continue;
                }
                JSONObject r=nativeCall("request",new JSONObject().put("url","http://192.168.4.1/api/status").put("method","GET"));
                assertFalse(r.toString(),r.has("error"));assertEquals(200,r.getJSONObject("value").getInt("status"));
                r=nativeCall("request",new JSONObject().put("url","http://192.168.4.1/api/pcbridge").put("method","POST").put("body","{\"action\":\"ping\"}"));
                assertFalse(r.toString(),r.has("error"));assertEquals(200,r.getJSONObject("value").getInt("status"));
                if(i%6==0)System.out.println("AUDIT_STABILITY "+(i+1)+"/60 elapsedMs="+(SystemClock.elapsedRealtime()-start));
                SystemClock.sleep(5000);
            }
            System.out.println("AUDIT_PASS STABILITY "+(bluetooth?"BLUETOOTH":"WIFI")+" 60/60 elapsedMs="+(SystemClock.elapsedRealtime()-start));
        }
    }
}
