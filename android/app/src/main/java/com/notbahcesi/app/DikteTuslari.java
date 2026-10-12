package com.notbahcesi.app;

import android.content.Context;
import android.database.ContentObserver;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.KeyEvent;
import java.util.function.Consumer;
import org.json.JSONObject;

/**
 * Dikteyi kulaklık ve telefon tuşlarından yönetir.
 *
 * - Kulaklık: Oynat/duraklat, sonraki ve önceki komutları bir medya oturumuyla yakalanır.
 * - Telefon ses tuşları: uygulama öndeyken (MainActivity.dispatchKeyEvent) yakalanır;
 *   "hold" atanmışsa basılı tutarken dikte yapılır (bas-konuş).
 * - Kulaklık ses seviyesi: Bluetooth kulaklık bağlıyken medya sesindeki değişim.
 *
 * Yapılandırmayı web katmanı gönderir; eylemler: none, start, stop, toggle, hold.
 * Eylem "dikteTusu" olayıyla web katmanına iletilir.
 */
final class DikteTuslari {
    private static final Handler ANA = new Handler(Looper.getMainLooper());
    private static Consumer<String> yayin;
    private static JSONObject yapilandirma = new JSONObject();
    private static MediaSession oturum;
    private static AudioTrack sessiz;
    private static ContentObserver ses;
    private static boolean onPlanda = true;
    private static long sesYoksayBitis = 0;

    private DikteTuslari() { }

    static void baglan(Consumer<String> alici) { yayin = alici; }

    private static String eylem(String anahtar) {
        String v = yapilandirma.optString(anahtar, "none");
        return v.isEmpty() ? "none" : v;
    }

    private static void gonder(String eylemAdi) {
        if ("none".equals(eylemAdi)) return;
        String giden = "hold".equals(eylemAdi) ? "toggle" : eylemAdi;
        Consumer<String> a = yayin;
        if (a != null) ANA.post(() -> a.accept(giden));
    }

    static synchronized void ayarla(Context baglam, JSONObject ayar) {
        yapilandirma = ayar == null ? new JSONObject() : ayar;
        Context uygulama = baglam.getApplicationContext();
        kulaklikOturumu(uygulama);
        sesiIzle(uygulama);
    }

    static synchronized void birak(Context baglam) {
        yapilandirma = new JSONObject();
        kulaklikOturumu(baglam.getApplicationContext());
        sesiIzle(baglam.getApplicationContext());
    }

    static void planDegisti(Context baglam, boolean on) {
        onPlanda = on;
        sesiIzle(baglam.getApplicationContext());
    }

    /* ---- Kulaklık tuşları ---- */

    private static void kulaklikOturumu(Context c) {
        boolean var = !"none".equals(eylem("play")) || !"none".equals(eylem("next")) || !"none".equals(eylem("prev"));
        if (!var) {
            sessizAkis(false);
            if (oturum != null) { try { oturum.release(); } catch (Exception ignored) { } oturum = null; }
            return;
        }
        if (oturum != null) return;
        MediaSession s = new MediaSession(c, "NotBahcesiKulaklik");
        s.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { gonder(eylem("play")); }
            @Override public void onPause() { gonder(eylem("play")); }
            @Override public void onSkipToNext() { gonder(eylem("next")); }
            @Override public void onSkipToPrevious() { gonder(eylem("prev")); }
        });
        @SuppressWarnings("deprecation") int bayrak = MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS;
        s.setFlags(bayrak);
        s.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS)
            .setState(PlaybackState.STATE_PLAYING, 0, 1f).build());
        s.setActive(true);
        oturum = s;
        sessizAkis(true);
    }

    /** Sessiz akış, sistemin medya tuşlarını bu oturuma yönlendirmesini sağlar. */
    private static void sessizAkis(boolean ac) {
        if (!ac) {
            if (sessiz != null) { try { sessiz.stop(); } catch (Exception ignored) { } sessiz.release(); sessiz = null; }
            return;
        }
        if (sessiz != null) return;
        try {
            int hiz = 8000;
            byte[] tampon = new byte[hiz / 2 * 2];
            AudioTrack t = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(hiz).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                .setBufferSizeInBytes(tampon.length).setTransferMode(AudioTrack.MODE_STATIC).build();
            t.write(tampon, 0, tampon.length);
            t.setLoopPoints(0, tampon.length / 2, -1);
            t.play();
            sessiz = t;
        } catch (Exception ignored) { }
    }

    /* ---- Telefon ses tuşları ---- */

    /** MainActivity.dispatchKeyEvent'ten çağrılır; true dönerse tuş sistem ses ayarına gitmez. */
    static boolean tusIsle(KeyEvent olay) {
        int kod = olay.getKeyCode();
        if (kod != KeyEvent.KEYCODE_VOLUME_UP && kod != KeyEvent.KEYCODE_VOLUME_DOWN) return false;
        String e = eylem(kod == KeyEvent.KEYCODE_VOLUME_UP ? "volUp" : "volDown");
        if ("none".equals(e)) return false;
        if ("hold".equals(e)) {
            if (olay.getAction() == KeyEvent.ACTION_DOWN && olay.getRepeatCount() == 0) gonder("start");
            else if (olay.getAction() == KeyEvent.ACTION_UP) gonder("stop");
            return true;
        }
        if (olay.getAction() == KeyEvent.ACTION_DOWN && olay.getRepeatCount() == 0) gonder(e);
        return true;
    }

    /* ---- Kulaklık ses seviyesi ---- */

    private static void sesiIzle(Context c) {
        if (ses != null) { try { c.getContentResolver().unregisterContentObserver(ses); } catch (Exception ignored) { } ses = null; }
        if (!onPlanda || ("none".equals(eylem("btVolUp")) && "none".equals(eylem("btVolDown")))) return;
        final AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        final int[] akislar = {AudioManager.STREAM_MUSIC, AudioManager.STREAM_VOICE_CALL};
        final int[] seviye = new int[akislar.length];
        for (int i = 0; i < akislar.length; i++) seviye[i] = am.getStreamVolume(akislar[i]);
        final long[] son = {0};
        ses = new ContentObserver(ANA) {
            @Override public void onChange(boolean kendi) {
                int degisen = -1; int[] eski = seviye.clone();
                for (int i = 0; i < akislar.length; i++) {
                    int simdiki = am.getStreamVolume(akislar[i]);
                    if (simdiki != seviye[i] && degisen < 0) degisen = i;
                    seviye[i] = simdiki;
                }
                if (degisen < 0) return;
                long simdi = SystemClock.elapsedRealtime();
                boolean bagli = false;
                for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                    int t = d.getType();
                    if (t == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || t == AudioDeviceInfo.TYPE_BLE_HEADSET) bagli = true;
                }
                if (!bagli || simdi < sesYoksayBitis || simdi - son[0] < 700) return;
                String e = eylem(seviye[degisen] > eski[degisen] ? "btVolUp" : "btVolDown");
                if (!"none".equals(e)) { son[0] = simdi; gonder(e); }
            }
        };
        c.getContentResolver().registerContentObserver(Settings.System.CONTENT_URI, true, ses);
    }
}
