package com.notbahcesi.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.content.Intent;
import android.content.Context;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "RemoteBridge", permissions = {
    @Permission(alias = "nearby", strings = {Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT}),
    @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION}),
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class RemoteBridgePlugin extends Plugin {
    private static final UUID NUS = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    private static final UUID RX = UUID.fromString("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    private final Handler handler = new Handler(Looper.getMainLooper());
    private BluetoothGatt gatt;
    private BluetoothGattCharacteristic rx;
    private PluginCall connecting;
    private PluginCall writing;
    private ScanCallback scanning;
    private volatile BluetoothSocket classicSocket;
    private final ExecutorService classicWorker = Executors.newSingleThreadExecutor();
    private SpeechRecognizer bridgeRecognizer;
    private PluginCall bridgeCall;
    private final StringBuilder bridgeWords = new StringBuilder();
    private String bridgeLanguage;
    private boolean bridgeStopping;
    private int bridgeErrors;
    private Runnable bridgeDeadline;
    /** Bölümlü oturumda segment sonucu geldiyse oturum sonucu metni tekrar eklenmez. */
    private boolean bridgeSegmentGoruldu;
    /** Henüz kesinleşmemiş, konuşulmakta olan cümlenin son hâli. */
    private String bridgePartial = "";
    /**
     * Köprü Dikte boyunca sessize alınan ses akışlarının önceki düzeyleri.
     *
     * Android ses tanıyıcı her oturumu başlatıp bitirdiğinde bir açılış/kapanış
     * tonu çalar. Konuşma aralarda kesildikçe oturum yenilenir ve bu ton her
     * seferinde duyulur. Ton müzik/bildirim akışından çıktığı için dikte boyunca
     * bu akışlar susturulur; dikte bitince eski düzeyler geri konur.
     */
    private final Map<Integer, Integer> sessizAkislar = new LinkedHashMap<>();

    private boolean bluetoothPermission(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 31 ? "nearby" : "location";
        if (getPermissionState(alias) != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "permissionReady");
            return false;
        }
        return true;
    }
    @PermissionCallback private void permissionReady(PluginCall call) {
        if (call == null) return;
        if (call.getMethodName().equals("scan")) scan(call);
        else if (call.getMethodName().equals("connect")) connect(call);
        else if (call.getMethodName().equals("scanPaired")) scanPaired(call);
        else if (call.getMethodName().equals("connectClassic")) connectClassic(call);
        else call.reject("Bluetooth izni gerekli.");
    }
    private BluetoothAdapter adapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Activity.BLUETOOTH_SERVICE);
        return manager == null ? null : manager.getAdapter();
    }

    /**
     * İzin verilmiş mi? Capacitor'ın kayıtlı izin durumundan bağımsız olarak
     * işletim sistemine sorar; böylece kullanıcı izni sonradan kaldırdıysa da
     * güvenli biçimde reddederiz.
     */
    private boolean izinVerildi(String izin) {
        // ContextCompat, API 22'de de çalışan sürüm güvenli denetim sağlar.
        return androidx.core.content.ContextCompat.checkSelfPermission(getContext(), izin)
            == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }

    /** Bluetooth çağrıları için gereken çalışma zamanı izinleri hazır mı? */
    private boolean bluetoothIzinleriHazir() {
        if (Build.VERSION.SDK_INT >= 31) {
            return izinVerildi(Manifest.permission.BLUETOOTH_SCAN)
                && izinVerildi(Manifest.permission.BLUETOOTH_CONNECT);
        }
        // Android 11 ve altında tarama için konum izni zorunludur.
        return izinVerildi(Manifest.permission.ACCESS_FINE_LOCATION);
    }

    /**
     * Mesaj seçiminden bağımsız olarak, Bluetooth özellikleri yalnızca izin
     * gerçekten verildiğinde çağrılır. Kullanıcı izni kaldırdıysa yeniden
     * istenir; çağrı sağlayıcıya hiç gidilmez.
     */
    private boolean bluetoothHazir(PluginCall call) {
        if (!bluetoothPermission(call)) return false;
        if (!bluetoothIzinleriHazir()) {
            call.reject("Bluetooth izni gerekli.");
            return false;
        }
        return true;
    }

    @SuppressLint("MissingPermission") // Gerekçe: bluetoothHazir() çalışma zamanı iznini doğrular.
    @PluginMethod public void scan(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) { call.reject("Bluetooth kapalı veya desteklenmiyor."); return; }
        BluetoothLeScanner scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) { call.reject("BLE tarama başlatılamadı."); return; }
        if (scanning != null) scanner.stopScan(scanning);
        Map<String, JSObject> found = new LinkedHashMap<>();
        ScanCallback callback = new ScanCallback() {
            @Override public void onScanResult(int type, ScanResult result) {
                String name = result.getScanRecord() == null ? null : result.getScanRecord().getDeviceName();
                if (name == null || name.isEmpty()) name = result.getDevice().getName();
                if (name == null || name.isEmpty()) return;
                JSObject item = new JSObject();
                item.put("address", result.getDevice().getAddress());
                item.put("name", name);
                item.put("rssi", result.getRssi());
                found.put(result.getDevice().getAddress(), item);
            }
            @Override public void onScanFailed(int error) { if (scanning == this) { scanning = null; call.reject("BLE tarama hatası: " + error); } }
        };
        scanning = callback;
        try { scanner.startScan(callback); }
        catch (SecurityException e) { scanning = null; call.reject("Bluetooth izni gerekli."); return; }
        handler.postDelayed(() -> {
            if (scanning != callback) return;
            scanning = null;
            scanner.stopScan(callback);
            JSArray devices = new JSArray();
            for (JSObject item : found.values()) devices.put(item);
            JSObject result = new JSObject(); result.put("devices", devices); call.resolve(result);
        }, 8000);
    }
    @SuppressLint("MissingPermission") // Gerekçe: izin yoksa bile kaynağı serbest bırakmak zorundayız; SecurityException yutulur.
    private void closeGatt() {
        rx = null;
        if (gatt != null) {
            // İzin geri alınmışsa çağrı SecurityException fırlatabilir; bağlantı
            // yine de kapatılmalı ve nesne serbest bırakılmalıdır.
            try { gatt.disconnect(); } catch (SecurityException ignored) { }
            try { gatt.close(); } catch (SecurityException ignored) { }
            gatt = null;
        }
    }
    private void closeClassic() {
        BluetoothSocket socket = classicSocket;
        classicSocket = null;
        if (socket != null) try { socket.close(); } catch (IOException ignored) { }
    }
    @SuppressLint("MissingPermission") // Gerekçe: bluetoothHazir() çalışma zamanı iznini doğrular.
    @PluginMethod public void scanPaired(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) { call.reject("Bluetooth kapalı."); return; }
        try {
            JSArray devices = new JSArray();
            for (BluetoothDevice device : adapter.getBondedDevices()) {
                JSObject item = new JSObject(); item.put("address", device.getAddress());
                item.put("name", device.getName() == null ? "Eşleşmiş cihaz" : device.getName());
                item.put("rssi", 0); devices.put(item);
            }
            JSObject result = new JSObject(); result.put("devices", devices); call.resolve(result);
        } catch (SecurityException e) { call.reject("Bluetooth izni gerekli."); }
    }
    @SuppressLint("MissingPermission") // Gerekçe: bluetoothHazir() çalışma zamanı iznini doğrular.
    @PluginMethod public void connectClassic(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) { call.reject("Bluetooth kapalı."); return; }
        String address = call.getString("address", "");
        AtomicBoolean finished = new AtomicBoolean(false);
        classicWorker.execute(() -> {
            BluetoothSocket socket = null;
            try {
                closeClassic(); closeGatt();
                BluetoothDevice device = adapter.getRemoteDevice(address);
                socket = device.createRfcommSocketToServiceRecord(SPP);
                classicSocket = socket;
                socket.connect();
                JSObject result = new JSObject(); result.put("connected", true); call.resolve(result);
            } catch (Exception e) {
                closeClassic(); call.reject("PC Bluetooth seri bağlantısı kurulamadı: " + e.getMessage());
            } finally { finished.set(true); }
        });
        handler.postDelayed(() -> { if (!finished.get()) closeClassic(); }, 12000);
    }
    @SuppressLint("MissingPermission") // Gerekçe: işlem yalnızca bağlantı kurulmuş soket üzerinde yapılır.
    @PluginMethod public void sendClassic(PluginCall call) {
        String body = call.getString("body", "");
        if (body.length() == 0 || body.length() > 32000 || body.contains("\n")) { call.reject("Bluetooth komutu geçersiz."); return; }
        AtomicBoolean finished = new AtomicBoolean(false);
        classicWorker.execute(() -> {
            BluetoothSocket socket = classicSocket;
            if (socket == null || !socket.isConnected()) { finished.set(true); call.reject("Önce PC ile klasik Bluetooth bağlantısı kurun."); return; }
            try {
                OutputStream out = socket.getOutputStream();
                out.write((body + "\n").getBytes(StandardCharsets.UTF_8)); out.flush();
                InputStream in = socket.getInputStream();
                ByteArrayOutputStream reply = new ByteArrayOutputStream();
                int next;
                while ((next = in.read()) != '\n' && next != -1 && reply.size() < 512) reply.write(next);
                if (next != '\n' || !new JSONObject(reply.toString("UTF-8")).optBoolean("ok")) throw new IOException("PC komutu reddetti.");
                call.resolve();
            } catch (Exception e) { closeClassic(); call.reject("Bluetooth aktarımı başarısız: " + e.getMessage()); }
            finally { finished.set(true); }
        });
        handler.postDelayed(() -> { if (!finished.get()) closeClassic(); }, 10000);
    }
    @SuppressLint("MissingPermission") // Gerekçe: bluetoothHazir() çalışma zamanı iznini doğrular.
    @PluginMethod public void connect(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        String address = call.getString("address", "");
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) { call.reject("Bluetooth kapalı."); return; }
        try {
            BluetoothDevice device = adapter.getRemoteDevice(address);
            closeGatt();
            connecting = call;
            BluetoothGattCallback callback = new BluetoothGattCallback() {
                @Override public void onConnectionStateChange(BluetoothGatt remote, int status, int state) {
                    if (remote != gatt) return;
                    if (status == BluetoothGatt.GATT_SUCCESS && state == BluetoothProfile.STATE_CONNECTED) {
                        if (!remote.discoverServices()) failConnect("Servisler keşfedilemedi.");
                    } else if (state == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) {
                        failConnect("BLE bağlantısı kesildi (" + status + ").");
                        if (writing != null) { writing.reject("BLE bağlantısı kesildi."); writing = null; }
                        rx = null;
                    }
                }
                @Override public void onServicesDiscovered(BluetoothGatt remote, int status) {
                    if (remote != gatt) return;
                    BluetoothGattService service = remote.getService(NUS);
                    rx = service == null ? null : service.getCharacteristic(RX);
                    if (status != BluetoothGatt.GATT_SUCCESS || rx == null) { failConnect("Bu cihaz Kablosuz Bellek NUS servisini sunmuyor."); return; }
                    if (connecting != null) { JSObject result = new JSObject(); result.put("connected", true); connecting.resolve(result); connecting = null; }
                }
                @Override public void onCharacteristicWrite(BluetoothGatt remote, BluetoothGattCharacteristic characteristic, int status) {
                    if (writing == null) return;
                    if (status == BluetoothGatt.GATT_SUCCESS) writing.resolve(); else writing.reject("BLE yazma hatası: " + status);
                    writing = null;
                }
            };
            // Dört parametreli connectGatt API 23'te geldi; Android 5.1 (minSdk 22)
            // cihazlarda eski imzaya düşeriz, aksi hâlde çalışma zamanı hatası olur.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                gatt = device.connectGatt(getContext(), false, callback, BluetoothDevice.TRANSPORT_LE);
            } else {
                gatt = device.connectGatt(getContext(), false, callback);
            }
            handler.postDelayed(() -> { if (connecting == call) failConnect("BLE bağlantısı zaman aşımına uğradı."); }, 12000);
        } catch (Exception e) { connecting = null; call.reject("Geçersiz BLE cihazı: " + e.getMessage()); }
    }
    private void failConnect(String message) { if (connecting != null) { connecting.reject(message); connecting = null; } }
    @PluginMethod public void disconnect(PluginCall call) { closeGatt(); closeClassic(); call.resolve(); }
    @PluginMethod public void send(PluginCall call) {
        String command = call.getString("command", "");
        write(call, command.getBytes(StandardCharsets.UTF_8));
    }
    @PluginMethod public void clickAbsolute(PluginCall call) {
        int x = call.getInt("x", -1), y = call.getInt("y", -1);
        if (x < 0 || x > 32767 || y < 0 || y > 32767) { call.reject("Konum 0–32767 arasında olmalı."); return; }
        write(call, new byte[] {3, (byte) x, (byte) (x >> 8), (byte) y, (byte) (y >> 8), 1});
    }
    @PluginMethod public void moveAbsolute(PluginCall call) {
        int x = call.getInt("x", -1), y = call.getInt("y", -1);
        if (x < 0 || x > 32767 || y < 0 || y > 32767) { call.reject("Konum 0–32767 arasında olmalı."); return; }
        write(call, new byte[] {1, (byte) x, (byte) (x >> 8), (byte) y, (byte) (y >> 8)});
    }
    @SuppressLint("MissingPermission") // Gerekçe: girişte bluetoothIzinleriHazir() doğrulanır.
    private void write(PluginCall call, byte[] data) {
        if (!bluetoothIzinleriHazir()) { call.reject("Bluetooth izni gerekli."); return; }
        if (gatt == null || rx == null) { call.reject("Önce kartla BLE bağlantısı kurun."); return; }
        if (writing != null) { call.reject("Önceki BLE komutu henüz tamamlanmadı."); return; }
        if (data.length == 0 || data.length > 180) { call.reject("BLE komutu 1–180 bayt olmalı."); return; }
        writing = call;
        rx.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
        rx.setValue(data);
        if (!gatt.writeCharacteristic(rx)) { writing = null; call.reject("BLE yazma başlatılamadı."); return; }
        handler.postDelayed(() -> { if (writing == call) { writing = null; call.reject("BLE yazma zaman aşımı."); } }, 8000);
    }
    @PluginMethod public void request(PluginCall call) {
        String address = call.getString("url", "");
        String method = call.getString("method", "GET");
        String body = call.getString("body", "");
        String token = call.getString("token", "");
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(address);
                if (!url.getProtocol().equals("http") && !url.getProtocol().equals("https")) throw new IllegalArgumentException("HTTP(S) gerekli.");
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(3500); connection.setReadTimeout(10000);
                connection.setRequestMethod(method);
                if (!token.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + token);
                if (method.equals("POST")) {
                    connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "text/plain; charset=utf-8");
                    try (OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
                }
                int status = connection.getResponseCode();
                InputStream stream = status < 400 ? connection.getInputStream() : connection.getErrorStream();
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                if (stream != null) try (InputStream input = stream) { byte[] buffer = new byte[2048]; int read;
                    while ((read = input.read(buffer)) != -1 && bytes.size() < 65536) bytes.write(buffer, 0, read); }
                JSObject result = new JSObject(); result.put("status", status); result.put("body", bytes.toString("UTF-8")); call.resolve(result);
            } catch (Exception e) {
                // Bağlantı kurulamadığında ham soket metni ("ECONNREFUSED") kullanıcıya
                // hiçbir şey anlatmıyordu; en sık iki nedeni açıkça yaz.
                String ayrinti = e.getMessage() == null ? e.toString() : e.getMessage();
                boolean ulasilamadi = e instanceof java.net.SocketTimeoutException || e instanceof java.net.ConnectException
                    || ayrinti.contains("ECONNREFUSED") || ayrinti.contains("ETIMEDOUT") || ayrinti.contains("failed to connect");
                if (ulasilamadi) call.reject("Bilgisayara ulaşılamadı (" + address + "). Yardımcı program açık mı, telefon aynı Wi‑Fi ağında mı ve güvenlik duvarı izni verildi mi? Ayrıntı: " + ayrinti);
                else call.reject("Ağ isteği başarısız: " + ayrinti);
            }
            finally { if (connection != null) connection.disconnect(); }
        }).start();
    }
    @PluginMethod public void discover(PluginCall call) {
        new Thread(() -> {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            int ip = wifi == null || wifi.getConnectionInfo() == null ? 0 : wifi.getConnectionInfo().getIpAddress();
            if (ip == 0) { call.reject("Önce telefonun Wi‑Fi ağına bağlanın."); return; }
            int first = ip & 255, second = (ip >> 8) & 255, third = (ip >> 16) & 255;
            boolean privateSubnet = first == 10 || (first == 172 && second >= 16 && second <= 31) || (first == 192 && second == 168);
            if (!privateSubnet) { call.reject("Güvenlik için yalnız özel yerel ağlar taranır. Kart IP'sini elle girebilirsiniz."); return; }
            String prefix = first + "." + second + "." + third + ".";
            List<String> found = Collections.synchronizedList(new ArrayList<>());
            ExecutorService pool = Executors.newFixedThreadPool(16);
            for (int host = 1; host < 255; host++) {
                final String address = "http://" + prefix + host;
                pool.submit(() -> {
                    HttpURLConnection conn = null;
                    try {
                        conn = (HttpURLConnection) new URL(address + "/api/status").openConnection();
                        conn.setConnectTimeout(550); conn.setReadTimeout(550);
                        if (conn.getResponseCode() == 200) {
                            ByteArrayOutputStream data = new ByteArrayOutputStream();
                            try (InputStream input = conn.getInputStream()) { byte[] buffer = new byte[1024]; int n = input.read(buffer); if (n > 0) data.write(buffer, 0, n); }
                            String body = data.toString("UTF-8");
                            if (body.contains("\"fw\":") && body.contains("\"sd\":")) found.add(address);
                        }
                    } catch (Exception ignored) { }
                    finally { if (conn != null) conn.disconnect(); }
                });
            }
            pool.shutdown();
            try { pool.awaitTermination(22, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            JSArray cards = new JSArray(); for (String item : found) cards.put(item);
            JSObject result = new JSObject(); result.put("cards", cards); call.resolve(result);
        }).start();
    }
    @PluginMethod public void dictate(PluginCall call) {
        if (getPermissionState("microphone") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneReady"); return;
        }
        try {
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "tr-TR"));
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            startActivityForResult(call, intent, "speechResult");
        } catch (Exception e) { call.reject("Ses tanıma hizmeti bulunamadı: " + e.getMessage()); }
    }
    @PermissionCallback private void microphoneReady(PluginCall call) {
        if (call != null && getPermissionState("microphone") == com.getcapacitor.PermissionState.GRANTED) dictate(call);
        else if (call != null) call.reject("Mikrofon izni verilmedi.");
    }
    @ActivityCallback private void speechResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.reject("Dikte iptal edildi veya ses tanınamadı."); return; }
        ArrayList<String> words = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (words == null || words.isEmpty()) { call.reject("Konuşma anlaşılamadı."); return; }
        JSObject response = new JSObject(); response.put("text", words.get(0)); call.resolve(response);
    }

    @PluginMethod public void startBridgeDictation(PluginCall call) {
        if (getPermissionState("microphone") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "bridgeMicrophoneReady"); return;
        }
        handler.post(() -> {
            if (bridgeCall != null) { call.reject("Köprü Dikte zaten dinliyor."); return; }
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("Ses tanıma hizmeti bulunamadı."); return; }
            int requested = call.getInt("seconds", 30);
            int seconds = requested == 0 ? 0 : Math.max(5, Math.min(3600, requested));
            bridgeCall = call;
            bridgeWords.setLength(0);
            bridgePartial = "";
            bridgeLanguage = call.getString("language", "tr-TR");
            bridgeStopping = false;
            bridgeErrors = 0;
            sessizlestir();
            try {
                bridgeRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                bridgeRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) { }
                    @Override public void onBeginningOfSpeech() { }
                    @Override public void onRmsChanged(float rmsdB) { }
                    @Override public void onBufferReceived(byte[] buffer) { }
                    @Override public void onEndOfSpeech() { }
                    /**
                     * Kısmi sonuç: konuşma sürerken tanıyıcı cümlenin o ana kadarki
                     * hâlini verir. Metne eklenmez, "konuşulmakta olan" parça olarak
                     * tutulur ve bilgisayara hemen iletilir; cümle bitince yerini
                     * kesinleşmiş sonuca bırakır.
                     */
                    @Override public void onPartialResults(Bundle partialResults) {
                        String metin = duyulanMetin(partialResults);
                        if (metin.isEmpty()) return;
                        bridgePartial = metin;
                        bridgeErrors = 0;
                        bridgeYayinla();
                    }
                    @Override public void onEvent(int eventType, Bundle params) { }
                    @Override public void onResults(Bundle results) {
                        bridgeErrors = 0;
                        // Bölümlü oturumda metin segment sonuçlarıyla geldi; buradaki
                        // sonuç aynı cümleyi ikinci kez ekler.
                        String sonSonuc = duyulanMetin(results);
                        if (!bridgeSegmentGoruldu && !sonSonuc.isEmpty()) bridgeKesinlestir(sonSonuc);
                        // Konuşulmakta olan parça hiçbir durumda sessizce atılmaz:
                        // bilgisayara yazılmış sözler sonradan silinmesin.
                        else bridgeKesinlestir(bridgePartial);
                        bridgeYayinla();
                        if (bridgeStopping) { finishBridgeDictation(); return; }
                        handler.postDelayed(() -> listenBridgeAgain(), 120);
                    }
                    /**
                     * Bölümlü oturum: sessizlik sınırında oturum kapanmaz, yalnızca
                     * segment sonucu gelir; açılış/kapanış tonu bu yüzden duyulmaz.
                     */
                    @Override public void onSegmentResults(Bundle segmentResults) {
                        bridgeSegmentGoruldu = true;
                        bridgeErrors = 0;
                        bridgeKesinlestir(duyulanMetin(segmentResults));
                        bridgeYayinla();
                    }
                    @Override public void onEndOfSegmentedSession() {
                        bridgeKesinlestir(bridgePartial);
                        bridgeYayinla();
                        if (bridgeStopping) { finishBridgeDictation(); return; }
                        handler.postDelayed(() -> listenBridgeAgain(), 120);
                    }
                    @Override public void onError(int error) {
                        if (bridgeStopping) { finishBridgeDictation(); return; }
                        // 9: mikrofon izni yok, 12-13: dil desteklenmiyor. Bunlar
                        // yeniden denemekle düzelmez.
                        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS || error == 12 || error == 13) {
                            failBridgeDictation("Ses tanıma hatası: " + error); return;
                        }
                        // Dinleme yeniden başlarken cümlenin son hâli kaybolmasın.
                        bridgeKesinlestir(bridgePartial);
                        long bekle;
                        switch (error) {
                            // 1,2,4: ağ/sunucu, 10,11: sunucu sınırı. Kısa aralıkla
                            // denemek servisi boğar; 1,5 saniye beklenir.
                            case 1: case 2: case 4: case 10: case 11: bekle = 1500; break;
                            case 5: bekle = 150; break;
                            case 6: case 7: bekle = 100; break;
                            // 8: tanıyıcı meşgul; önce iptal edilip yeniden başlatılır.
                            case 8: try { bridgeRecognizer.cancel(); } catch (Exception ignored) { } bekle = 400; break;
                            default: bekle = 400; break;
                        }
                        if (error != 6 && error != 7 && ++bridgeErrors >= 6) {
                            failBridgeDictation("Ses tanıma hizmeti tekrar tekrar hata verdi: " + error); return;
                        }
                        handler.postDelayed(() -> listenBridgeAgain(), bekle);
                    }
                });
                if (seconds > 0) {
                    bridgeDeadline = () -> stopBridgeListening();
                    handler.postDelayed(bridgeDeadline, seconds * 1000L);
                }
                listenBridgeAgain();
            } catch (Exception e) { failBridgeDictation("Köprü Dikte başlatılamadı: " + e.getMessage()); }
        });
    }
    @PermissionCallback private void bridgeMicrophoneReady(PluginCall call) {
        if (call != null && getPermissionState("microphone") == com.getcapacitor.PermissionState.GRANTED) startBridgeDictation(call);
        else if (call != null) call.reject("Mikrofon izni verilmedi.");
    }
    private void listenBridgeAgain() {
        if (bridgeCall == null || bridgeStopping || bridgeRecognizer == null) return;
        // Oturum yenilenirken yarım kalan cümle varsa kaybolmasın.
        bridgeKesinlestir(bridgePartial);
        bridgeSegmentGoruldu = false;
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, bridgeLanguage);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        // Kablosuz Bellek uygulamasindaki cozumun aynisi: bolumlu oturum acilir,
        // boylece varsayilan bes saniyelik sessizlik sinirinda oturum kapanip
        // acilmaz ve acilis/kapanis tonu duyulmaz. Sinir yalnizca segmenti bitirir.
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1000L);
        intent.putExtra("android.speech.extra.SEGMENTED_SESSION", "android.speech.extras.SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS");
        try { bridgeRecognizer.startListening(intent); }
        catch (Exception e) { failBridgeDictation("Dinleme yeniden başlatılamadı: " + e.getMessage()); }
    }
    /** Tanıma sonucundaki ilk metni döndürür; sonuç yoksa boş metin. */
    private String duyulanMetin(Bundle sonuc) {
        if (sonuc == null) return "";
        ArrayList<String> duyulan = sonuc.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (duyulan == null || duyulan.isEmpty()) return "";
        String ilk = duyulan.get(0);
        return ilk == null ? "" : ilk.trim();
    }
    /**
     * Tanınan cümleyi kesinleştirir: konuşulmakta olan parça temizlenir ve
     * cümlenin son hâli toplanan metne tek boşlukla eklenir.
     */
    private void bridgeKesinlestir(String metin) {
        bridgePartial = "";
        if (metin == null || metin.isEmpty()) return;
        if (bridgeWords.length() > 0) bridgeWords.append(' ');
        bridgeWords.append(metin);
    }
    /**
     * Diktenin şu andaki tam metni: kesinleşmiş cümleler + konuşulmakta olan
     * parça. Arayüz bu metni hedef alır, bilgisayara yalnızca değişen kuyruk
     * yazılır; böylece konuşma sürerken aktarım da sürer.
     */
    private String bridgeTamMetin() {
        String parca = bridgePartial == null ? "" : bridgePartial.trim();
        if (parca.isEmpty()) return bridgeWords.toString();
        if (bridgeWords.length() == 0) return parca;
        return bridgeWords.toString() + " " + parca;
    }
    /**
     * Güncel dikte metnini arayüze bildirir; aktarım bu olayla ilerler.
     *
     * `text` konuşulmakta olan parçayı da içerir, `kesin` yalnızca kesinleşmiş
     * cümleleri taşır. Arayüz tercihe göre birini hedefler: varsayılanda söz
     * konuşulurken, tercih kapatıldığında cümle sonunda bilgisayara yazılır.
     */
    private void bridgeYayinla() {
        if (bridgeCall == null) return;
        JSObject veri = new JSObject();
        veri.put("text", bridgeTamMetin());
        veri.put("kesin", bridgeWords.toString());
        notifyListeners("bridgeDictation", veri);
    }
    /**
     * Ses tanıyıcının oturum açılış/kapanış tonunu duyurmamak için dikte boyunca
     * müzik, bildirim ve sistem akışlarını susturur; önceki düzeyleri saklar.
     * Yalnızca gerçekten açık olan akışlar değiştirilir, zil ve alarm akışlarına
     * dokunulmaz (gelen arama veya alarm sessiz kalmasın).
     */
    private void sessizlestir() {
        AudioManager ses = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (ses == null) return;
        List<Integer> akislar = new ArrayList<>();
        akislar.add(AudioManager.STREAM_NOTIFICATION);
        akislar.add(AudioManager.STREAM_SYSTEM);
        // Ton bazı cihazlarda müzik akışından çıkar. Müzik çalıyorsa kullanıcının
        // sesi kesilmesin diye o akışa dokunulmaz.
        if (!ses.isMusicActive()) akislar.add(AudioManager.STREAM_MUSIC);
        for (int akis : akislar) {
            if (sessizAkislar.containsKey(akis)) continue;
            try {
                int onceki = ses.getStreamVolume(akis);
                sessizAkislar.put(akis, onceki);
                if (onceki > 0) ses.setStreamVolume(akis, 0, 0);
            } catch (Exception ignored) { }
        }
    }
    /** Susturulan akışları önceki düzeylerine döndürür. */
    private void sesiGeriVer() {
        if (sessizAkislar.isEmpty()) return;
        AudioManager ses = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (ses != null) {
            for (Map.Entry<Integer, Integer> kayit : sessizAkislar.entrySet()) {
                try { ses.setStreamVolume(kayit.getKey(), kayit.getValue(), 0); } catch (Exception ignored) { }
            }
        }
        sessizAkislar.clear();
    }
    @PluginMethod public void stopBridgeDictation(PluginCall call) {
        handler.post(() -> { stopBridgeListening(); call.resolve(); });
    }
    private void stopBridgeListening() {
        if (bridgeCall == null || bridgeStopping) return;
        bridgeStopping = true;
        if (bridgeRecognizer != null) bridgeRecognizer.stopListening();
        // Tanıyıcı son cümlenin sonucunu döndürmezse beklemeyi sonlandır.
        handler.postDelayed(() -> { if (bridgeStopping) finishBridgeDictation(); }, 1800);
    }
    private void finishBridgeDictation() {
        PluginCall call = bridgeCall;
        if (call == null) return;
        // Son cümle kesinleşmediyse konuşulan parça kaybolmasın; tanıyıcı son
        // sonucu döndürmeden bitirdiğinde de yazılanlar bilgisayarda kalır.
        if (!bridgePartial.isEmpty()) { bridgeKesinlestir(bridgePartial); bridgeYayinla(); }
        String text = bridgeWords.toString();
        clearBridgeDictation();
        if (text.isEmpty()) call.reject("Konuşma anlaşılamadı; bilgisayara metin gönderilmedi.");
        else { JSObject result = new JSObject(); result.put("text", text); call.resolve(result); }
    }
    private void failBridgeDictation(String message) {
        PluginCall call = bridgeCall;
        if (!bridgePartial.isEmpty()) { bridgeKesinlestir(bridgePartial); bridgeYayinla(); }
        clearBridgeDictation();
        if (call != null) call.reject(message);
    }
    private void clearBridgeDictation() {
        if (bridgeDeadline != null) handler.removeCallbacks(bridgeDeadline);
        bridgeDeadline = null;
        bridgeCall = null;
        bridgeStopping = false;
        bridgePartial = "";
        sesiGeriVer();
        if (bridgeRecognizer != null) { bridgeRecognizer.destroy(); bridgeRecognizer = null; }
    }
}
