package com.notbahcesi.app;

import android.content.Intent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;

/** Uses installed Android engines; no executable/model downloads inside the app. */
@CapacitorPlugin(name = "BilgeSpeech")
public class BilgeSpeechPlugin extends Plugin {
    private TextToSpeech tts;
    private String engine = "";
    private boolean ready = false;
    private PluginCall speaking;
    private int generation = 0;

    private void stopCurrent() {
        if (tts != null) tts.stop();
        if (speaking != null) { speaking.resolve(); speaking = null; }
    }
    private void withEngine(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            String requested = call.getString("engine", "");
            if (tts != null && ready && engine.equals(requested)) { action.run(); return; }
            stopCurrent();
            if (tts != null) tts.shutdown();
            ready = false; engine = requested;
            int token = ++generation;
            TextToSpeech.OnInitListener init = status -> getActivity().runOnUiThread(() -> {
                if (token != generation) { call.reject("Ses motoru değişti. Tekrar deneyin."); return; }
                if (status != TextToSpeech.SUCCESS) { call.reject("Ses motoru başlatılamadı."); return; }
                ready = true; action.run();
            });
            tts = requested.isEmpty() ? new TextToSpeech(getContext(), init) : new TextToSpeech(getContext(), init, requested);
        });
    }
    @PluginMethod public void voices(PluginCall call) {
        withEngine(call, () -> {
            JSArray engines = new JSArray(), voices = new JSArray();
            for (TextToSpeech.EngineInfo e : tts.getEngines()) { JSObject x = new JSObject(); x.put("id", e.name); x.put("name", e.label); engines.put(x); }
            Set<Voice> installed = tts.getVoices();
            if (installed != null) for (Voice v : installed) if ("tr".equals(v.getLocale().getLanguage())) {
                JSObject x = new JSObject(); x.put("id", v.getName()); x.put("name", v.getName()); x.put("network", v.isNetworkConnectionRequired()); voices.put(x);
            }
            JSObject result = new JSObject(); result.put("engines", engines); result.put("voices", voices); call.resolve(result);
        });
    }
    @PluginMethod public void speak(PluginCall call) {
        withEngine(call, () -> {
            stopCurrent();
            if (tts.setLanguage(new Locale("tr", "TR")) < TextToSpeech.LANG_AVAILABLE) { call.reject("Bu motorda Türkçe ses yüklü değil. Ses paketi yükleyin."); return; }
            String id = call.getString("voice", "");
            Set<Voice> voices = tts.getVoices();
            Voice selected = null;
            if (voices != null) for (Voice v : voices) if ("tr".equals(v.getLocale().getLanguage())) {
                if (v.getName().equals(id)) { selected = v; break; }
                if (selected == null || (selected.isNetworkConnectionRequired() && !v.isNetworkConnectionRequired())) selected = v;
            }
            if (selected != null) tts.setVoice(selected);
            tts.setSpeechRate(Math.max(.5f, Math.min(1.5f, call.getFloat("rate", .92f))));
            tts.setPitch(Math.max(.7f, Math.min(1.3f, call.getFloat("pitch", .94f))));
            String text = call.getString("text", "");
            if (text.trim().isEmpty() || text.length() > 16000) { call.reject("Seslendirilecek metin geçersiz."); return; }
            String prefix = UUID.randomUUID().toString();
            speaking = call;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                public void onStart(String utteranceId) { }
                public void onDone(String utteranceId) { if ((prefix + "-end").equals(utteranceId)) getActivity().runOnUiThread(() -> { if (speaking == call) { speaking = null; call.resolve(); } }); }
                public void onError(String utteranceId) { getActivity().runOnUiThread(() -> { if (speaking == call) { speaking = null; tts.stop(); call.reject("Seslendirme tamamlanamadı."); } }); }
            });
            int limit = Math.min(3000, TextToSpeech.getMaxSpeechInputLength() - 1);
            for (int start = 0; start < text.length(); start += limit) {
                int end = Math.min(text.length(), start + limit);
                if (tts.speak(text.substring(start, end), TextToSpeech.QUEUE_ADD, null, prefix + (end == text.length() ? "-end" : "-" + start)) == TextToSpeech.ERROR) { speaking = null; tts.stop(); call.reject("Seslendirilemedi."); return; }
            }
        });
    }
    @PluginMethod public void stop(PluginCall call) { getActivity().runOnUiThread(() -> { stopCurrent(); call.resolve(); }); }
    @PluginMethod public void install(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Intent intent = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                String requested = call.getString("engine", "");
                if (!requested.isEmpty()) {
                    boolean found = false;
                    if (tts != null) for (TextToSpeech.EngineInfo e : tts.getEngines()) if (e.name.equals(requested)) found = true;
                    if (!found) { call.reject("Önce kurulu bir ses motoru seçin."); return; }
                    intent.setPackage(requested);
                }
                getActivity().startActivity(intent); call.resolve();
            } catch (Exception e) { call.reject("Ses paketi ekranı açılamadı. Telefonun metin okuma ayarlarını kullanın."); }
        });
    }
    @Override protected void handleOnPause() { getActivity().runOnUiThread(this::stopCurrent); }
    @Override protected void handleOnDestroy() { generation++; stopCurrent(); if (tts != null) tts.shutdown(); tts = null; ready = false; }
}
