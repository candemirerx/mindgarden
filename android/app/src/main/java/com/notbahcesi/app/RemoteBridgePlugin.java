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
import android.bluetooth.le.ScanSettings;
import android.content.Intent;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "RemoteBridge", permissions = {
    @Permission(alias = "nearby", strings = {Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_ADVERTISE}),
    @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION}),
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class RemoteBridgePlugin extends Plugin {
    private static final UUID NUS = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    private static final UUID RX = UUID.fromString("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    private static final UUID PC_SERVICE = UUID.fromString("93c7b30b-d973-4873-bf10-148491968b2c");
    private final Handler handler = new Handler(Looper.getMainLooper());
    private volatile BluetoothGatt gatt;
    private volatile BluetoothGattCharacteristic rx;
    private PluginCall connecting;
    private PluginCall writing;
    private ScanCallback scanning;
    private volatile BluetoothSocket classicSocket;
    private volatile String classicAddress;
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
    private RecognitionListener bridgeListener;
    /** İstenen motor: "auto" (önce cihaz içi), "device" (yalnızca cihaz içi), "system" (çevrimiçi sistem tanıyıcısı). */
    private String bridgeMotor = "auto";
    /** Çalışan tanıyıcı cihaz içi (çevrimdışı) motor mu? */
    private boolean bridgeCihazIci;
    /** Tanıyıcıdan en son ne zaman bir geri çağrı geldi; takılmayı yakalamak için. */
    private long bridgeSonOlay;
    private Runnable bridgeBekci;
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
        if (!bluetoothIzinleriHazir()) { call.reject("Bluetooth izni verilmedi. Telefon ayarlarından Yakındaki cihazlar iznini açabilirsiniz."); return; }
        if (call.getMethodName().equals("scan")) scan(call);
        else if (call.getMethodName().equals("connect")) connect(call);
        else if (call.getMethodName().equals("scanPaired")) scanPaired(call);
        else if (call.getMethodName().equals("connectClassic")) connectClassic(call);
        else if (call.getMethodName().equals("sendClassic")) sendClassic(call);
        else if (call.getMethodName().equals("hidStart")) hidStart(call);
        else if (call.getMethodName().equals("hidConnect")) hidConnect(call);
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
        if (scanning != null) { call.reject("BLE taraması zaten devam ediyor."); return; }
        final String scanId = call.getString("scanId", "");
        Map<String, JSObject> found = new LinkedHashMap<>();
        ScanCallback callback = new ScanCallback() {
            @Override public void onScanResult(int type, ScanResult result) {
                if (scanning != this) return;
                String name = result.getScanRecord() == null ? null : result.getScanRecord().getDeviceName();
                if (name == null || name.isEmpty()) name = result.getDevice().getName();
                if (name == null || name.isEmpty()) return;
                JSObject item = new JSObject();
                item.put("address", result.getDevice().getAddress());
                item.put("name", name);
                item.put("rssi", result.getRssi());
                found.put(result.getDevice().getAddress(), item);
                JSObject event = new JSObject();
                event.put("scanId", scanId);
                event.put("device", item);
                notifyListeners("bleScanDevice", event);
            }
            @Override public void onBatchScanResults(List<ScanResult> results) {
                for (ScanResult result : results) onScanResult(0, result);
            }
            @Override public void onScanFailed(int error) { if (scanning == this) { scanning = null; call.reject("BLE tarama hatası: " + error); } }
        };
        scanning = callback;
        try { scanner.startScan(null, new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).setReportDelay(0).build(), callback); }
        catch (SecurityException e) { scanning = null; call.reject("Bluetooth izni gerekli."); return; }
        // Telefon karta zaten bağlıysa (ör. başka bir uygulama bağlantıyı tutuyorsa)
        // Android tek ortak bağlantı açar ve kart taramada görünmeyebilir. Bağlı
        // cihazlar hemen listelenir; bu bağlantıya Not Bahçesi de katılabilir.
        try {
            BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            if (manager != null) {
                for (BluetoothDevice device : manager.getConnectedDevices(BluetoothProfile.GATT)) {
                    String name = device.getName();
                    if (name == null || name.isEmpty() || found.containsKey(device.getAddress())) continue;
                    JSObject item = new JSObject();
                    item.put("address", device.getAddress());
                    item.put("name", name);
                    item.put("rssi", 0);
                    item.put("connected", true);
                    found.put(device.getAddress(), item);
                    JSObject event = new JSObject();
                    event.put("scanId", scanId);
                    event.put("device", item);
                    notifyListeners("bleScanDevice", event);
                }
            }
        } catch (SecurityException ignored) { /* tarama yine de sürer */ }
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
        classicAddress = null;
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
                android.bluetooth.BluetoothClass sinif = device.getBluetoothClass();
                item.put("computer", sinif != null && sinif.getMajorDeviceClass() == android.bluetooth.BluetoothClass.Device.Major.COMPUTER);
                item.put("rssi", 0); devices.put(item);
            }
            JSObject result = new JSObject(); result.put("devices", devices); call.resolve(result);
        } catch (SecurityException e) { call.reject("Bluetooth izni gerekli."); }
    }
    @SuppressLint("MissingPermission") // Called only after bluetoothHazir validates permissions.
    private BluetoothSocket openClassicService(String address, UUID service) throws IOException {
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) throw new IOException("Bluetooth kapalı.");
        if (!BluetoothAdapter.checkBluetoothAddress(address)) throw new IOException("Ayarlardan eşleşmiş bilgisayarınızı seçin.");
        // Kartın BLE bağlantısı burada kapatılmaz: kart kipindeyken pano PC'ye
        // klasik Bluetooth ile gidebiliyor ve bu, kart bağlantısını düşürüyordu.
        closeClassic();
        adapter.cancelDiscovery();
        BluetoothSocket socket = adapter.getRemoteDevice(address).createRfcommSocketToServiceRecord(service);
        classicSocket = socket;
        Runnable timeout = () -> { if (classicSocket == socket) closeClassic(); };
        handler.postDelayed(timeout, 12000);
        try {
            socket.connect(); classicAddress = address; classicSonKullanim = System.currentTimeMillis();
            return socket;
        } catch (IOException error) { closeClassic(); throw error; }
        finally { handler.removeCallbacks(timeout); }
    }
    @SuppressLint("MissingPermission")
    private void refreshClassicServices(String address) throws IOException {
        BluetoothDevice device = adapter().getRemoteDevice(address);
        CountDownLatch ready = new CountDownLatch(1);
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                BluetoothDevice found = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (found != null && address.equalsIgnoreCase(found.getAddress())) ready.countDown();
            }
        };
        Context context = getContext();
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_UUID);
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        else context.registerReceiver(receiver, filter);
        try {
            // Android may cache PC services from before the helper was started.
            // Refresh discovery only after a failed connection, before sending any command.
            if (device.fetchUuidsWithSdp()) ready.await(4, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt(); throw new IOException("Bluetooth bağlantısı iptal edildi.", error);
        } finally { context.unregisterReceiver(receiver); }
    }
    private BluetoothSocket openClassic(String address) throws IOException {
        try { return openClassicService(address, PC_SERVICE); }
        catch (IOException firstError) {
            refreshClassicServices(address);
            try { return openClassicService(address, PC_SERVICE); }
            catch (IOException refreshedError) { return openClassicService(address, SPP); }
        }
    }
    @PluginMethod public void connectClassic(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        String address = call.getString("address", "");
        classicWorker.execute(() -> {
            try {
                openClassic(address);
                JSObject result = new JSObject(); result.put("connected", true); call.resolve(result);
            } catch (Exception e) {
                closeClassic(); call.reject("PC Bluetooth bağlantısı kurulamadı. Güncel PC yardımcısını açın ve Windows ile telefonu eşleştirin. " + e.getMessage());
            }
        });
    }
    @SuppressLint("MissingPermission") // Gerekçe: işlem yalnızca bağlantı kurulmuş soket üzerinde yapılır.
    @PluginMethod public void sendClassic(PluginCall call) {
        if (!bluetoothHazir(call)) return;
        String body = call.getString("body", "");
        String address = call.getString("address", "");
        if (body.length() == 0 || body.length() > 32000 || body.getBytes(StandardCharsets.UTF_8).length > 32768 || body.contains("\n")) { call.reject("Bluetooth komutu geçersiz veya çok uzun."); return; }
        classicWorker.execute(() -> {
            try {
                BluetoothSocket socket = classicSocket;
                boolean yeni = socket == null || !socket.isConnected() || (!address.isEmpty() && !address.equalsIgnoreCase(classicAddress));
                // Uzun süre boşta kalan soket karşı taraf gittiğinde de "bağlı" görünür;
                // komut yazılır ama hiç uygulanmaz. Önce zararsız bir ping ile sınanır,
                // yanıt yoksa bağlantı yeniden kurulur. Asıl komut yalnızca bir kez gider.
                if (!yeni && System.currentTimeMillis() - classicSonKullanim > CLASSIC_BOSTA_MS) {
                    try { classicSatir(socket, pingSatiri(body), 4000); }
                    catch (Exception olu) { closeClassic(); yeni = true; }
                }
                if (yeni) socket = openClassic(address);
                JSONObject response = classicSatir(socket, body, 10000);
                if (!response.optBoolean("ok")) throw new IOException(response.optString("error", "PC komutu reddetti. Erişim anahtarını kontrol edin."));
                call.resolve(JSObject.fromJSONObject(response));
            } catch (Exception e) { closeClassic(); call.reject("Bluetooth aktarımı başarısız: " + e.getMessage()); }
        });
    }
    private static final long CLASSIC_BOSTA_MS = 15000;
    private volatile long classicSonKullanim;
    /** Erişim anahtarını gövdeden alıp PC'ye etkisiz bir ping satırı hazırlar. */
    private static String pingSatiri(String body) throws Exception {
        JSONObject ping = new JSONObject();
        ping.put("action", "ping");
        ping.put("token", new JSONObject(body).optString("token", ""));
        return ping.toString();
    }
    /** Tek satır yazar, tek satır yanıt bekler; süre aşılırsa soket kapatılır ve okuma kesilir. */
    private JSONObject classicSatir(BluetoothSocket socket, String satir, long sureMs) throws Exception {
        Runnable timeout = () -> { if (classicSocket == socket) closeClassic(); };
        handler.postDelayed(timeout, sureMs);
        try {
            OutputStream out = socket.getOutputStream();
            out.write((satir + "\n").getBytes(StandardCharsets.UTF_8)); out.flush();
            InputStream in = socket.getInputStream();
            ByteArrayOutputStream reply = new ByteArrayOutputStream();
            int next;
            while ((next = in.read()) != '\n' && next != -1 && reply.size() < 512) reply.write(next);
            if (next != '\n') throw new IOException("PC bağlantıyı kapattı; komut yeniden gönderilmedi.");
            classicSonKullanim = System.currentTimeMillis();
            return new JSONObject(reply.toString("UTF-8"));
        } finally { handler.removeCallbacks(timeout); }
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
                        // Varsayılan 23 baytlık MTU'da 20 bayttan uzun komutlar uzun yazmaya
                        // düşüyor ve bazı kartlarda zaman aşımına uğruyordu.
                        try { remote.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH); } catch (SecurityException ignored) { }
                        if (!remote.requestMtu(185) && !remote.discoverServices()) failConnect("Servisler keşfedilemedi.");
                    } else if (state == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) {
                        failConnect("BLE bağlantısı kesildi (" + status + ").");
                        if (writing != null) { writing.reject("BLE bağlantısı kesildi."); writing = null; }
                        // Kapatılmayan istemci sayısı birikince Android yeni bağlantı açamıyor (133).
                        handler.post(() -> { if (gatt == remote) closeGatt(); });
                    }
                }
                @Override public void onMtuChanged(BluetoothGatt remote, int mtu, int status) {
                    if (remote != gatt) return;
                    if (!remote.discoverServices()) failConnect("Servisler keşfedilemedi.");
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
            handler.postDelayed(() -> { if (connecting == call) { failConnect("BLE bağlantısı zaman aşımına uğradı."); closeGatt(); } }, 12000);
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
        if (gatt == null || rx == null) { call.reject("Kartla BLE bağlantısı yok.", "BLE_NOT_CONNECTED"); return; }
        if (writing != null) { call.reject("Önceki BLE komutu henüz tamamlanmadı.", "BLE_BUSY"); return; }
        if (data.length == 0 || data.length > 180) { call.reject("BLE komutu 1–180 bayt olmalı."); return; }
        writing = call;
        rx.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
        rx.setValue(data);
        if (!gatt.writeCharacteristic(rx)) { writing = null; call.reject("BLE yazma başlatılamadı.", "BLE_NOT_STARTED"); return; }
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
                // Telefon Wi‑Fi'si uykudan uyanırken ya da kart BLE ile meşgulken ilk
                // TCP bağlantısı düşebiliyor. Henüz hiçbir veri gitmediği için yalnız
                // bağlantı kurma adımı bir kez daha denenir; komut asla iki kez gitmez.
                for (int deneme = 1; ; deneme++) {
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setConnectTimeout(deneme == 1 ? 4000 : 6500); connection.setReadTimeout(10000);
                    connection.setUseCaches(false);
                    connection.setRequestProperty("Connection", "close");
                    connection.setRequestMethod(method);
                    if (!token.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + token);
                    if (method.equals("POST")) { connection.setDoOutput(true); connection.setRequestProperty("Content-Type", "text/plain; charset=utf-8"); }
                    try { connection.connect(); break; }
                    catch (java.net.ConnectException | java.net.SocketTimeoutException | java.net.NoRouteToHostException hata) {
                        connection.disconnect(); connection = null;
                        if (deneme >= 2) throw hata;
                        Thread.sleep(400);
                    }
                }
                if (method.equals("POST")) {
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
            // Varsayılan: Kablosuz Bellek kartı (/api/status). PC yardımcısı için
            // port 8765 ve /hello ile çağrılır. Kart Wi‑Fi ve BLE'yi aynı radyoda
            // paylaştığı için yanıtı 0,5 sn'yi aşabiliyor; bekleme 1,5 sn.
            final int port = call.getInt("port", 80);
            final String path = call.getString("path", "/api/status");
            final String marker = call.getString("marker", "\"sd\":");
            final String suffix = port == 80 ? "" : ":" + port;
            List<String> found = Collections.synchronizedList(new ArrayList<>());
            List<String> bodies = Collections.synchronizedList(new ArrayList<>());
            ExecutorService pool = Executors.newFixedThreadPool(32);
            for (int host = 1; host < 255; host++) {
                final String address = "http://" + prefix + host + suffix;
                pool.submit(() -> {
                    HttpURLConnection conn = null;
                    try {
                        conn = (HttpURLConnection) new URL(address + path).openConnection();
                        conn.setConnectTimeout(1500); conn.setReadTimeout(2000);
                        if (conn.getResponseCode() == 200) {
                            ByteArrayOutputStream data = new ByteArrayOutputStream();
                            try (InputStream input = conn.getInputStream()) { byte[] buffer = new byte[1024]; int n = input.read(buffer); if (n > 0) data.write(buffer, 0, n); }
                            String body = data.toString("UTF-8");
                            if (body.contains(marker)) { found.add(address); bodies.add(body); }
                        }
                    } catch (Exception ignored) { }
                    finally { if (conn != null) conn.disconnect(); }
                });
            }
            pool.shutdown();
            try { pool.awaitTermination(25, TimeUnit.SECONDS); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            JSArray cards = new JSArray(); for (String item : found) cards.put(item);
            JSArray details = new JSArray(); for (String item : bodies) details.put(item);
            JSObject result = new JSObject(); result.put("cards", cards); result.put("bodies", details); call.resolve(result);
        }).start();
    }
    // ---- Bluetooth klavye/fare (HID cihaz profili) --------------------------
    // Telefon kendini bilgisayara doğrudan Bluetooth klavye + fare olarak tanıtır.
    // Windows bunu gerçek bir klavye gibi görür; PC'de hiçbir program gerekmez
    // (kart da USB'den aynı şeyi yapar). Android 9 (API 28) ve sonrası.
    /** Rapor 1: klavye [değiştirici, 0, 6 tuş]; rapor 2: fare [düğmeler, dx, dy, tekerlek]. */
    private static final byte[] HID_TANIM = {
        0x05, 0x01, 0x09, 0x06, (byte) 0xA1, 0x01, (byte) 0x85, 0x01,
        0x05, 0x07, 0x19, (byte) 0xE0, 0x29, (byte) 0xE7, 0x15, 0x00, 0x25, 0x01, 0x75, 0x01, (byte) 0x95, 0x08, (byte) 0x81, 0x02,
        (byte) 0x95, 0x01, 0x75, 0x08, (byte) 0x81, 0x01,
        (byte) 0x95, 0x06, 0x75, 0x08, 0x15, 0x00, 0x25, 0x65, 0x05, 0x07, 0x19, 0x00, 0x29, 0x65, (byte) 0x81, 0x00,
        (byte) 0xC0,
        0x05, 0x01, 0x09, 0x02, (byte) 0xA1, 0x01, (byte) 0x85, 0x02, 0x09, 0x01, (byte) 0xA1, 0x00,
        0x05, 0x09, 0x19, 0x01, 0x29, 0x03, 0x15, 0x00, 0x25, 0x01, (byte) 0x95, 0x03, 0x75, 0x01, (byte) 0x81, 0x02,
        (byte) 0x95, 0x01, 0x75, 0x05, (byte) 0x81, 0x03,
        0x05, 0x01, 0x09, 0x30, 0x09, 0x31, 0x09, 0x38, 0x15, (byte) 0x81, 0x25, 0x7F, 0x75, 0x08, (byte) 0x95, 0x03, (byte) 0x81, 0x06,
        (byte) 0xC0, (byte) 0xC0
    };
    private volatile android.bluetooth.BluetoothHidDevice hid;
    private volatile boolean hidKayitli;
    private volatile BluetoothDevice hidAna;
    /** Bağlantının kurulduğu an: Windows yeni klavyeyi kurarken gelen raporları kaçırıyor. */
    private volatile long hidBaglandiMs;
    private PluginCall hidKayitCall;
    private PluginCall hidBaglanCall;
    private String hidBaglanAdres;
    private final ExecutorService hidYazici = Executors.newSingleThreadExecutor();

    @SuppressLint({"MissingPermission", "NewApi"})
    private final android.bluetooth.BluetoothHidDevice.Callback hidGeri = Build.VERSION.SDK_INT < 28 ? null : new android.bluetooth.BluetoothHidDevice.Callback() {
        @Override public void onAppStatusChanged(BluetoothDevice cihaz, boolean kayitli) {
            hidKayitli = kayitli;
            if (!kayitli) hidAna = null;
            PluginCall c = hidKayitCall; hidKayitCall = null;
            if (c != null) {
                if (kayitli) c.resolve(hidDurumNesnesi());
                else c.reject("Bluetooth klavye başlatılamadı. Telefonda başka bir Bluetooth klavye/fare uygulaması (ör. Bluetooth Keyboard & Mouse) etkin olabilir; onu kapatıp yeniden deneyin.");
            }
            notifyListeners("hidDurum", hidDurumNesnesi());
        }
        // Windows bağlanırken rapor isteyebilir; yanıtsız kalırsa bazı sürümler klavyeyi
        // etkinleştirmiyor. Boş (hiçbir tuş basılı değil) rapor döndürülür.
        @Override public void onGetReport(BluetoothDevice cihaz, byte tur, byte no, int boyut) {
            try {
                if (hid != null) hid.replyReport(cihaz, tur, no, no == 2 ? new byte[4] : new byte[8]);
            } catch (SecurityException ignored) { }
        }
        @Override public void onSetReport(BluetoothDevice cihaz, byte tur, byte no, byte[] veri) {
            try { if (hid != null) hid.reportError(cihaz, android.bluetooth.BluetoothHidDevice.ERROR_RSP_SUCCESS); } catch (SecurityException ignored) { }
        }
        @Override public void onConnectionStateChanged(BluetoothDevice cihaz, int durum) {
            if (durum == BluetoothProfile.STATE_CONNECTED) { hidAna = cihaz; hidBaglandiMs = SystemClock.elapsedRealtime(); }
            else if (durum == BluetoothProfile.STATE_DISCONNECTED && cihaz != null && cihaz.equals(hidAna)) hidAna = null;
            PluginCall c = hidBaglanCall;
            if (c != null && cihaz != null && cihaz.getAddress().equalsIgnoreCase(hidBaglanAdres)) {
                if (durum == BluetoothProfile.STATE_CONNECTED) { hidBaglanCall = null; c.resolve(hidDurumNesnesi()); }
                else if (durum == BluetoothProfile.STATE_DISCONNECTED) { hidBaglanCall = null; c.reject("Bilgisayar Bluetooth klavye bağlantısını kabul etmedi."); }
            }
            notifyListeners("hidDurum", hidDurumNesnesi());
        }
    };

    private JSObject hidDurumNesnesi() {
        JSObject r = new JSObject();
        BluetoothDevice ana = hidAna;
        r.put("destekleniyor", Build.VERSION.SDK_INT >= 28);
        r.put("kayitli", hidKayitli);
        r.put("bagli", ana != null);
        r.put("adres", ana == null ? "" : ana.getAddress());
        return r;
    }

    @SuppressLint({"MissingPermission", "NewApi"})
    private void hidKaydet(PluginCall call) {
        android.bluetooth.BluetoothHidDeviceAppSdpSettings sdp = new android.bluetooth.BluetoothHidDeviceAppSdpSettings(
            "Not Bahçesi Klavye", "Telefondan klavye ve fare", "Not Bahçesi",
            android.bluetooth.BluetoothHidDevice.SUBCLASS1_COMBO, HID_TANIM);
        hidKayitCall = call;
        boolean basladi;
        try { basladi = hid.registerApp(sdp, null, null, Executors.newSingleThreadExecutor(), hidGeri); }
        catch (SecurityException e) { hidKayitCall = null; call.reject("Bluetooth izni gerekli."); return; }
        if (!basladi) { hidKayitCall = null; call.reject("Bluetooth klavye başlatılamadı. Başka bir Bluetooth klavye uygulaması etkin olabilir."); return; }
        handler.postDelayed(() -> { if (hidKayitCall == call) { hidKayitCall = null; call.reject("Bluetooth klavye kaydı zaman aşımına uğradı."); } }, 8000);
    }

    /** Bluetooth klavyeyi başlatır (uygulama açıkken bir kez). */
    @SuppressLint({"MissingPermission", "NewApi"})
    @PluginMethod public void hidStart(PluginCall call) {
        if (Build.VERSION.SDK_INT < 28) { call.reject("Bu özellik Android 9 ve sonrasında çalışır."); return; }
        if (!bluetoothHazir(call)) return;
        BluetoothAdapter adapter = adapter();
        if (adapter == null || !adapter.isEnabled()) { call.reject("Telefonun Bluetooth'u kapalı."); return; }
        if (hid != null && hidKayitli) { call.resolve(hidDurumNesnesi()); return; }
        if (hid != null) { hidKaydet(call); return; }
        boolean istendi = adapter.getProfileProxy(getContext(), new BluetoothProfile.ServiceListener() {
            @Override public void onServiceConnected(int profil, BluetoothProfile vekil) {
                hid = (android.bluetooth.BluetoothHidDevice) vekil;
                hidKaydet(call);
            }
            @Override public void onServiceDisconnected(int profil) { hid = null; hidKayitli = false; hidAna = null; }
        }, BluetoothProfile.HID_DEVICE);
        if (!istendi) call.reject("Bu telefon Bluetooth klavye özelliğini desteklemiyor.");
    }

    /** Eşleşmiş bilgisayara Bluetooth klavye olarak bağlanır. */
    @SuppressLint({"MissingPermission", "NewApi"})
    @PluginMethod public void hidConnect(PluginCall call) {
        if (Build.VERSION.SDK_INT < 28 || hid == null || !hidKayitli) { call.reject("Önce Bluetooth klavyeyi başlatın."); return; }
        if (!bluetoothHazir(call)) return;
        String adres = call.getString("address", "");
        BluetoothDevice ana = hidAna;
        if (ana != null && ana.getAddress().equalsIgnoreCase(adres)) { call.resolve(hidDurumNesnesi()); return; }
        try {
            BluetoothDevice cihaz = adapter().getRemoteDevice(adres);
            if (ana != null) hid.disconnect(ana);
            hidBaglanCall = call; hidBaglanAdres = adres;
            if (!hid.connect(cihaz)) { hidBaglanCall = null; call.reject("Bilgisayara Bluetooth klavye olarak bağlanılamadı."); return; }
            handler.postDelayed(() -> {
                if (hidBaglanCall == call) {
                    hidBaglanCall = null;
                    call.reject("Bilgisayar yanıt vermedi. Bilgisayarda Bluetooth açık mı? İlk kullanımda bilgisayarın Bluetooth ayarlarında telefonu kaldırıp \"Cihaz ekle\" ile yeniden ekleyin.");
                }
            }, 15000);
        } catch (Exception e) { hidBaglanCall = null; call.reject("Geçersiz Bluetooth adresi: " + e.getMessage()); }
    }

    @SuppressLint({"MissingPermission", "NewApi"})
    @PluginMethod public void hidDisconnect(PluginCall call) {
        BluetoothDevice ana = hidAna;
        if (Build.VERSION.SDK_INT >= 28 && hid != null && ana != null) { try { hid.disconnect(ana); } catch (SecurityException ignored) { } }
        call.resolve();
    }

    @PluginMethod public void hidStatus(PluginCall call) { call.resolve(hidDurumNesnesi()); }

    /**
     * Raporları sırayla gönderir: reports = [[raporNo, bayt...], ...]; her rapordan
     * sonra gapMs beklenir (Windows tuş basma/bırakmayı ayrı görsün).
     */
    @SuppressLint({"MissingPermission", "NewApi"})
    @PluginMethod public void hidSend(PluginCall call) {
        if (Build.VERSION.SDK_INT < 28 || hid == null || hidAna == null) { call.reject("Bilgisayara Bluetooth klavye olarak bağlı değil.", "HID_NOT_CONNECTED"); return; }
        JSArray raporlar = call.getArray("reports");
        int ara = Math.max(2, Math.min(60, call.getInt("gapMs", 8)));
        if (raporlar == null || raporlar.length() == 0 || raporlar.length() > 4000) { call.reject("Rapor listesi geçersiz."); return; }
        hidYazici.execute(() -> {
            try {
                // Yeni bağlantıda Windows klavye sürücüsünü kurarken ilk raporları kaçırıyor
                // (ilk tuş basılı kalıp tekrarlanıyordu): 2 sn dolana kadar bekle.
                long gecen = SystemClock.elapsedRealtime() - hidBaglandiMs;
                if (gecen < 2000) Thread.sleep(2000 - gecen);
                // Önceki bir gönderimde kalan basılı tuş/düğme olmasın.
                BluetoothDevice ilk = hidAna;
                if (ilk != null) { hid.sendReport(ilk, 1, new byte[8]); Thread.sleep(ara); }
                for (int i = 0; i < raporlar.length(); i++) {
                    org.json.JSONArray r = raporlar.getJSONArray(i);
                    int no = r.getInt(0);
                    byte[] veri = new byte[r.length() - 1];
                    for (int j = 1; j < r.length(); j++) veri[j - 1] = (byte) r.getInt(j);
                    BluetoothDevice ana = hidAna;
                    if (ana == null) throw new IOException("Bluetooth klavye bağlantısı koptu.");
                    if (!hid.sendReport(ana, no, veri)) {
                        Thread.sleep(25);
                        if (!hid.sendReport(ana, no, veri)) throw new IOException("Bilgisayar tuşu almadı.");
                    }
                    Thread.sleep(ara);
                }
                // sendReport yalnız kuyruğa koyar: son tuşlar (çoğu kez Enter) bağlantı
                // hemen kapanırsa yolda kalıyordu. Klavye gönderiminde sonda bir kez daha
                // "hepsi bırakıldı" raporu gider ve kuyruğun boşalması beklenir.
                BluetoothDevice son = hidAna;
                if (son != null && raporlar.getJSONArray(raporlar.length() - 1).getInt(0) == 1) {
                    hid.sendReport(son, 1, new byte[8]);
                    Thread.sleep(Math.max(60, ara * 3));
                }
                call.resolve();
            } catch (Exception e) { call.reject(e.getMessage() == null ? "Bluetooth klavye gönderimi başarısız." : e.getMessage()); }
        });
    }

    /** Telefonu 120 sn görünür yapar: bilgisayarda "Cihaz ekle" ile ilk eşleştirme için. */
    @PluginMethod public void hidDiscoverable(PluginCall call) {
        try {
            Intent istek = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
            istek.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 120);
            istek.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(istek);
            call.resolve();
        } catch (Exception e) { call.reject("Telefon görünür yapılamadı: " + e.getMessage()); }
    }

    // ---- UDP (kartın Wi‑Fi fare kanalı) --------------------------------------
    // Fare hareketi her seferinde TCP/HTTP bağlantısı kurmasın diye küçük UDP
    // paketleri gönderilir; yanıt beklenmez (kayıp paket yalnız küçük bir adımdır).
    private java.net.DatagramSocket udpSoket;
    private final ExecutorService udpYazici = Executors.newSingleThreadExecutor();
    @PluginMethod public void udpSend(PluginCall call) {
        String host = call.getString("host", "");
        int port = call.getInt("port", 0);
        JSArray veri = call.getArray("data");
        if (host.isEmpty() || port <= 0 || port > 65535 || veri == null || veri.length() == 0 || veri.length() > 64) { call.reject("UDP isteği geçersiz."); return; }
        udpYazici.execute(() -> {
            try {
                byte[] bayt = new byte[veri.length()];
                for (int i = 0; i < bayt.length; i++) bayt[i] = (byte) veri.getInt(i);
                if (udpSoket == null || udpSoket.isClosed()) udpSoket = new java.net.DatagramSocket();
                udpSoket.send(new java.net.DatagramPacket(bayt, bayt.length, java.net.InetAddress.getByName(host), port));
                call.resolve();
            } catch (Exception e) { call.reject("UDP gönderilemedi: " + e.getMessage()); }
        });
    }

    /** Kart BLE bağlantısı açık ve NUS yazma özelliği hazır mı? (durum göstergesi için; hiçbir şey göndermez) */
    @PluginMethod public void bleStatus(PluginCall call) {
        JSObject result = new JSObject();
        BluetoothGatt aktif = gatt;
        result.put("connected", aktif != null && rx != null && connecting == null);
        result.put("address", aktif == null ? "" : aktif.getDevice().getAddress());
        call.resolve(result);
    }
    /** Telefonun Wi‑Fi IPv4 adresi; kartın kendi ağında (192.168.4.x) olup olmadığını anlamak için. */
    @PluginMethod public void wifiAddress(PluginCall call) {
        WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        int ip = wifi == null || wifi.getConnectionInfo() == null ? 0 : wifi.getConnectionInfo().getIpAddress();
        JSObject result = new JSObject();
        result.put("address", ip == 0 ? "" : (ip & 255) + "." + ((ip >> 8) & 255) + "." + ((ip >> 16) & 255) + "." + ((ip >> 24) & 255));
        call.resolve(result);
    }
    /** Eşleştirme için Android'in Bluetooth ayarlarını açar. */
    @PluginMethod public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) { call.reject("Bluetooth ayarları açılamadı: " + e.getMessage()); }
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
            if (!SpeechRecognizer.isRecognitionAvailable(getContext()) && !cihazIciTanimaVar()) { call.reject("Ses tanıma hizmeti bulunamadı."); return; }
            int requested = call.getInt("seconds", 30);
            int seconds = requested == 0 ? 0 : Math.max(5, Math.min(3600, requested));
            bridgeCall = call;
            bridgeWords.setLength(0);
            bridgePartial = "";
            bridgeLanguage = call.getString("language", "tr-TR");
            String istenen = call.getString("engine", "auto");
            bridgeMotor = "device".equals(istenen) || "system".equals(istenen) ? istenen : "auto";
            bridgeStopping = false;
            bridgeErrors = 0;
            sessizlestir();
            try {
                bridgeListener = new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) { bridgeSonOlay = System.currentTimeMillis(); }
                    @Override public void onBeginningOfSpeech() { bridgeSonOlay = System.currentTimeMillis(); }
                    @Override public void onRmsChanged(float rmsdB) { bridgeSonOlay = System.currentTimeMillis(); }
                    @Override public void onBufferReceived(byte[] buffer) { }
                    @Override public void onEndOfSpeech() { bridgeSonOlay = System.currentTimeMillis(); }
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
                        bridgeSonOlay = System.currentTimeMillis();
                        if (bridgeStopping) { finishBridgeDictation(); return; }
                        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                            failBridgeDictation("Mikrofon izni verilmedi."); return;
                        }
                        // 12-13: dil desteklenmiyor / dil modeli yüklü değil.
                        if (error == 12 || error == 13) {
                            if (bridgeCihazIci && "auto".equals(bridgeMotor)) {
                                // Cihaz içi Türkçe model yoksa indirmeyi başlat ve bu oturum
                                // için çevrimiçi sistem tanıyıcısına geç.
                                cihazIciModeliIndir();
                                bridgeMotor = "system";
                                bridgeKesinlestir(bridgePartial);
                                if (!bridgeTanimaYenile()) return;
                                handler.postDelayed(() -> listenBridgeAgain(), 200);
                                return;
                            }
                            failBridgeDictation(bridgeCihazIci
                                ? "Cihaz içi ses tanıma modeli bu dil için yüklü değil. Telefon ayarlarından Google ses tanıma dil paketini indirin veya motoru Otomatik yapın."
                                : "Ses tanıma bu dili desteklemiyor: " + bridgeLanguage);
                            return;
                        }
                        // Dinleme yeniden başlarken cümlenin son hâli kaybolmasın.
                        bridgeKesinlestir(bridgePartial);
                        long bekle;
                        boolean yenile = false;
                        switch (error) {
                            // 1,2,4: ağ/sunucu, 10: aşırı yük. Kısa aralıkla denemek
                            // servisi boğar; 1,5 saniye beklenir ve bağlantı tazelenir.
                            case 1: case 2: case 4: case 10: bekle = 1500; yenile = true; break;
                            // 11: servis bağlantısı koptu; tanıyıcı yeniden kurulmadan çalışmaz.
                            case 11: bekle = 800; yenile = true; break;
                            // 5: istemci hatası, 8: tanıyıcı meşgul. İkisi de eski
                            // nesneyi kullanmayı bırakıp yenisini kurmayı gerektirir.
                            case 5: case 8: bekle = 300; yenile = true; break;
                            case 6: case 7: bekle = 100; break;
                            default: bekle = 400; break;
                        }
                        if (error != 6 && error != 7) {
                            if (++bridgeErrors >= 8) {
                                failBridgeDictation("Ses tanıma hizmeti tekrar tekrar hata verdi: " + error); return;
                            }
                            // Art arda hata servisin takıldığını gösterir.
                            if (bridgeErrors % 3 == 0) yenile = true;
                        }
                        if (yenile && !bridgeTanimaYenile()) return;
                        handler.postDelayed(() -> listenBridgeAgain(), bekle);
                    }
                };
                bridgeRecognizer = bridgeTanimaOlustur();
                if (bridgeRecognizer == null) {
                    failBridgeDictation("Cihaz içi ses tanıma bu telefonda yok. Motoru Otomatik veya Çevrimiçi yapın."); return;
                }
                bridgeRecognizer.setRecognitionListener(bridgeListener);
                bridgeSonOlay = System.currentTimeMillis();
                bridgeBekci = new Runnable() {
                    @Override public void run() {
                        if (bridgeCall == null) return;
                        // Bazı cihazlarda tanıyıcı hata bile vermeden susuyor. Dinleme
                        // sırasında ses düzeyi olayları sürekli gelir; uzun süre hiç olay
                        // gelmediyse tanıyıcı yeniden kurulur.
                        if (!bridgeStopping && System.currentTimeMillis() - bridgeSonOlay > 12000) {
                            bridgeKesinlestir(bridgePartial);
                            bridgeYayinla();
                            if (bridgeTanimaYenile()) listenBridgeAgain();
                        }
                        if (bridgeCall != null) handler.postDelayed(this, 3000);
                    }
                };
                handler.postDelayed(bridgeBekci, 3000);
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
    /** Bu telefonda cihaz içi (çevrimdışı) ses tanıma kullanılabilir mi? */
    private boolean cihazIciTanimaVar() {
        return Build.VERSION.SDK_INT >= 33 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
    }
    /**
     * İstenen motora göre tanıyıcı kurar. Cihaz içi motor internet ve sunucu
     * sınırı gerektirmez, gecikmesi düşüktür. Otomatikte cihaz içi motor tercih
     * edilir, yoksa sistem tanıyıcısı kullanılır; "device" seçiliyken cihaz içi
     * yoksa null döner.
     */
    private SpeechRecognizer bridgeTanimaOlustur() {
        bridgeCihazIci = false;
        if (!"system".equals(bridgeMotor) && cihazIciTanimaVar()) {
            try {
                SpeechRecognizer yerel = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                bridgeCihazIci = true;
                return yerel;
            } catch (Exception ignored) { }
        }
        if ("device".equals(bridgeMotor)) return null;
        return SpeechRecognizer.createSpeechRecognizer(getContext());
    }
    /** Takılan veya bozulan tanıyıcıyı atıp yenisini kurar. Kurulamazsa dikteyi hatayla bitirir. */
    private boolean bridgeTanimaYenile() {
        if (bridgeRecognizer != null) {
            try { bridgeRecognizer.cancel(); } catch (Exception ignored) { }
            try { bridgeRecognizer.destroy(); } catch (Exception ignored) { }
            bridgeRecognizer = null;
        }
        try {
            bridgeRecognizer = bridgeTanimaOlustur();
        } catch (Exception e) { bridgeRecognizer = null; }
        if (bridgeRecognizer == null) { failBridgeDictation("Ses tanıma yeniden başlatılamadı."); return false; }
        bridgeRecognizer.setRecognitionListener(bridgeListener);
        bridgeSonOlay = System.currentTimeMillis();
        return true;
    }
    /** Cihaz içi Türkçe dil modeli yoksa indirmesini ister; en iyi çaba, sonuç beklenmez. */
    private void cihazIciModeliIndir() {
        if (Build.VERSION.SDK_INT < 33 || bridgeRecognizer == null) return;
        try {
            Intent niyet = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            niyet.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            niyet.putExtra(RecognizerIntent.EXTRA_LANGUAGE, bridgeLanguage);
            bridgeRecognizer.triggerModelDownload(niyet);
        } catch (Exception ignored) { }
    }
    @PluginMethod public void getDictationEngines(PluginCall call) {
        JSObject sonuc = new JSObject();
        sonuc.put("onDevice", cihazIciTanimaVar());
        sonuc.put("system", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(sonuc);
    }
    private void listenBridgeAgain() {
        if (bridgeCall == null || bridgeStopping || bridgeRecognizer == null) return;
        bridgeSonOlay = System.currentTimeMillis();
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
        if (bridgeCihazIci) intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
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
    /** Editör tam ekranı: sistem çubuklarını gizler; kenardan kaydırınca geçici görünür. */
    @PluginMethod public void setImmersive(PluginCall call) {
        boolean acik = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Activity activity = getActivity();
        if (activity == null) { call.resolve(); return; }
        activity.runOnUiThread(() -> {
            androidx.core.view.WindowInsetsControllerCompat kontrol =
                androidx.core.view.WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
            int cubuklar = androidx.core.view.WindowInsetsCompat.Type.systemBars();
            // Gizlenen çubukların ve kamera çentiğinin yeri boş şerit kalmasın.
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), !acik);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                android.view.WindowManager.LayoutParams lp = activity.getWindow().getAttributes();
                lp.layoutInDisplayCutoutMode = acik
                    ? android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                    : android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
                activity.getWindow().setAttributes(lp);
            }
            if (acik) {
                kontrol.setSystemBarsBehavior(androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                kontrol.hide(cubuklar);
            } else {
                kontrol.show(cubuklar);
                // WebView son kenar boşluğunu (safe-area) önbellekte tutar. WebView çubukların
                // altına yerleştiyse boşluk sıfırlanır (yoksa sayfa iki kez aşağı kayar);
                // edge-to-edge zorunlu sürümlerde WebView çubukların arkasına uzandığından
                // gerçek boşluklar verilir (yoksa üst düğmeler durum çubuğuyla çakışır).
                android.view.View web = getBridge().getWebView();
                Runnable boslukYenile = () -> {
                    androidx.core.view.WindowInsetsCompat kok = androidx.core.view.ViewCompat.getRootWindowInsets(web);
                    int ust = kok == null ? 0 : kok.getInsets(cubuklar | androidx.core.view.WindowInsetsCompat.Type.displayCutout()).top;
                    int[] konum = new int[2];
                    web.getLocationOnScreen(konum);
                    boolean altta = kok == null || konum[1] >= ust;
                    androidx.core.view.ViewCompat.dispatchApplyWindowInsets(web, altta
                        ? new androidx.core.view.WindowInsetsCompat.Builder().build() : kok);
                };
                web.postDelayed(boslukYenile, 150);
                web.postDelayed(boslukYenile, 600);
            }
            call.resolve();
        });
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
        if (bridgeBekci != null) handler.removeCallbacks(bridgeBekci);
        bridgeBekci = null;
        bridgeCall = null;
        bridgeStopping = false;
        bridgePartial = "";
        sesiGeriVer();
        if (bridgeRecognizer != null) { bridgeRecognizer.destroy(); bridgeRecognizer = null; }
    }
    @SuppressLint("MissingPermission") // Cleanup must also work after permission revocation.
    @Override protected void handleOnDestroy() {
        closeClassic(); closeGatt();
        if (scanning != null) {
            try {
                BluetoothAdapter adapter = adapter();
                BluetoothLeScanner scanner = adapter == null ? null : adapter.getBluetoothLeScanner();
                if (scanner != null) scanner.stopScan(scanning);
            } catch (Exception ignored) { }
            scanning = null;
        }
        clearBridgeDictation();
        handler.removeCallbacksAndMessages(null);
        classicWorker.shutdownNow();
        super.handleOnDestroy();
    }
}
