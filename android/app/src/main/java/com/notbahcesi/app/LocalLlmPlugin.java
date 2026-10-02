package com.notbahcesi.app;

import android.content.Context;
import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Content;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.ThinkingConfig;
import java.util.Collections;
import java.io.File;
import java.io.InputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LocalLlm")
public class LocalLlmPlugin extends Plugin {
    private volatile LlmInference llmInference = null;
    private volatile Engine modernEngine = null;
    private volatile String currentModelPath = null;
    private volatile String currentModelName = null;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean importPending = false;

    // Scoped storage: Download klasörünü doğrudan taramak yerine kullanıcı
    // tek bir dosyaya erişim verir. Genel depolama izni istenmez.
    @PluginMethod
    public synchronized void importModel(PluginCall call) {
        if (importPending) {
            call.reject("Bir model zaten ekleniyor. Lütfen tamamlanmasını bekleyin.");
            return;
        }
        importPending = true;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivityForResult(call, intent, "modelSelected");
        } catch (Exception e) {
            importPending = false;
            call.reject("Dosya seçici açılamadı.", e);
        }
    }

    @ActivityCallback
    private void modelSelected(PluginCall call, ActivityResult result) {
        if (call == null) { importPending = false; return; }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            importPending = false;
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }
        Uri uri = data.getData();
        executor.execute(() -> {
            File temporary = null;
            try {
                String name = "";
                long expectedSize = -1;
                try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) {
                        int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                        int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                        if (nameIndex >= 0) name = cursor.getString(nameIndex);
                        if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) expectedSize = cursor.getLong(sizeIndex);
                    }
                }
                String safeName = name == null ? "" : name.replaceAll("[^\\p{L}\\p{N}._-]", "_");
                String lower = safeName.toLowerCase(Locale.ROOT);
                if (!lower.endsWith(".task") && !lower.endsWith(".bin") && !lower.endsWith(".litertlm")) {
                    throw new IOException("MediaPipe uyumlu .task / .bin veya LiteRT-LM .litertlm dosyasını seçin. GGUF ve safetensors dosyaları açılamaz.");
                }
                File dir = new File(getContext().getFilesDir(), "models");
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Model klasörü oluşturulamadı.");
                long reserve = 64L * 1024 * 1024;
                if (expectedSize >= 0 && expectedSize > dir.getUsableSpace() - reserve) {
                    throw new IOException("Modeli eklemek için cihazda yeterli boş alan yok.");
                }
                temporary = File.createTempFile("model-", ".partial", dir);
                long copied = 0;
                try (InputStream input = getContext().getContentResolver().openInputStream(uri);
                     FileOutputStream output = new FileOutputStream(temporary)) {
                    if (input == null) throw new IOException("Seçilen dosya okunamadı.");
                    byte[] buffer = new byte[1024 * 1024];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (dir.getUsableSpace() < reserve + count) throw new IOException("Cihazın boş alanı yetersiz.");
                        output.write(buffer, 0, count);
                        copied += count;
                    }
                    output.getFD().sync();
                }
                if (copied < 1024 * 1024 || (expectedSize >= 0 && copied != expectedSize)) {
                    throw new IOException("Model dosyası eksik görünüyor. İndirme tamamlandıktan sonra tekrar seçin.");
                }
                File target = new File(dir, safeName);
                if (target.exists()) target = new File(dir, UUID.randomUUID().toString().substring(0, 8) + "-" + safeName);
                if (!temporary.renameTo(target)) throw new IOException("Model kaydedilemedi.");
                temporary = null;
                JSObject ret = new JSObject();
                ret.put("modelPath", target.getAbsolutePath());
                ret.put("modelName", target.getName());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Model eklenemedi: " + e.getMessage(), e);
            } finally {
                if (temporary != null) temporary.delete();
                importPending = false;
            }
        });
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", true);
        ret.put("isLoaded", llmInference != null || modernEngine != null);
        ret.put("currentModelPath", currentModelPath != null ? currentModelPath : "");
        ret.put("currentModelName", currentModelName != null ? currentModelName : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void listModels(PluginCall call) {
        executor.execute(() -> {
            try {
                Context context = getContext();
                List<File> searchDirs = new ArrayList<>();

                // Uygulamanın dahili ve harici dosya dizinleri
                if (context.getFilesDir() != null) searchDirs.add(context.getFilesDir());
                File extFiles = context.getExternalFilesDir(null);
                if (extFiles != null) searchDirs.add(extFiles);

                // Modeller için özel 'models' alt dizini
                File modelsDir = new File(context.getFilesDir(), "models");
                if (!modelsDir.exists()) modelsDir.mkdirs();
                searchDirs.add(modelsDir);

                if (extFiles != null) {
                    File extModelsDir = new File(extFiles, "models");
                    if (!extModelsDir.exists()) extModelsDir.mkdirs();
                    searchDirs.add(extModelsDir);
                }

                JSArray modelsArray = new JSArray();
                for (File dir : searchDirs) {
                    scanDirectoryForModels(dir, modelsArray);
                }

                JSObject ret = new JSObject();
                ret.put("models", modelsArray);
                ret.put("modelsDir", modelsDir.getAbsolutePath());
                if (extFiles != null) {
                    ret.put("extModelsDir", new File(extFiles, "models").getAbsolutePath());
                }
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Modeller taranırken hata: " + e.getMessage(), e);
            }
        });
    }

    private void scanDirectoryForModels(File dir, JSArray target) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;

        File[] files = dir.listFiles();
        if (files == null) return;

        for (File f : files) {
            if (f.isFile()) {
                String name = f.getName().toLowerCase(Locale.ROOT);
                if (name.endsWith(".bin") || name.endsWith(".task") || name.endsWith(".litertlm")) {
                    JSObject item = new JSObject();
                    item.put("name", f.getName());
                    item.put("path", f.getAbsolutePath());
                    item.put("sizeBytes", f.length());
                    item.put("sizeMb", Math.round((f.length() / (1024.0 * 1024.0)) * 10.0) / 10.0);
                    item.put("isLoaded", f.getAbsolutePath().equals(currentModelPath));
                    target.put(item);
                }
            }
        }
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        String path = call.getString("modelPath");
        if (path == null || path.trim().isEmpty()) { call.reject("Silinecek modeli seçin."); return; }
        executor.execute(() -> {
            try {
                File file = new File(path).getCanonicalFile();
                String name = file.getName().toLowerCase(Locale.ROOT);
                if (!(name.endsWith(".task") || name.endsWith(".bin") || name.endsWith(".litertlm")))
                    throw new IOException("Yalnızca model dosyaları silinebilir.");
                Context context = getContext();
                File internal = context.getFilesDir().getCanonicalFile();
                File external = context.getExternalFilesDir(null);
                File parent = file.getParentFile();
                boolean owned = parent != null && (parent.equals(internal) || parent.equals(new File(internal, "models").getCanonicalFile()));
                if (external != null) {
                    external = external.getCanonicalFile();
                    owned |= parent != null && (parent.equals(external) || parent.equals(new File(external, "models").getCanonicalFile()));
                }
                if (!owned) throw new IOException("Uygulama dışındaki dosyalar silinemez.");
                if (currentModelPath != null && file.equals(new File(currentModelPath).getCanonicalFile())) closeEngines();
                if (file.exists() && (!file.isFile() || !file.delete())) throw new IOException("Model silinemedi. Tekrar deneyin.");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } catch (Exception error) { call.reject("Model silinemedi: " + error.getMessage(), error); }
        });
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String modelPath = call.getString("modelPath");
        if (modelPath == null || modelPath.trim().isEmpty()) {
            call.reject("modelPath parametresi boş olamaz.");
            return;
        }

        File file = new File(modelPath);
        if (!file.exists() || !file.canRead()) {
            call.reject("Model dosyası bulunamadı veya okunamıyor: " + modelPath);
            return;
        }

        int maxTokens = call.getInt("maxTokens", 1024);

        executor.execute(() -> {
            try {
                closeEngines();

                Context context = getContext();
                if (file.getName().toLowerCase(Locale.ROOT).endsWith(".litertlm")) {
                    Engine candidate = new Engine(new EngineConfig(file.getAbsolutePath(),
                            new Backend.CPU(4, null), null, null,
                            Math.max(2048, Math.min(maxTokens, 8192)), null, context.getCacheDir().getAbsolutePath()));
                    try {
                        candidate.initialize();
                        modernEngine = candidate;
                    } catch (Throwable failure) {
                        try { candidate.close(); } catch (Throwable ignored) {}
                        throw failure;
                    }
                } else {
                    LlmInference.LlmInferenceOptions.Builder builder = LlmInference.LlmInferenceOptions.builder()
                        .setModelPath(file.getAbsolutePath())
                        .setMaxTokens(maxTokens);

                LlmInference.LlmInferenceOptions options = builder.build();
                llmInference = LlmInference.createFromOptions(context, options);
                }
                currentModelPath = file.getAbsolutePath();
                currentModelName = file.getName();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("modelPath", currentModelPath);
                ret.put("modelName", currentModelName);
                call.resolve(ret);
            } catch (Throwable e) {
                closeEngines();
                android.util.Log.e("LocalLlm", "Model initialization failed", e);
                String detail = String.valueOf(e.getMessage()).toLowerCase(Locale.ROOT);
                if (e instanceof OutOfMemoryError || detail.contains("memory") || detail.contains("bad_alloc")) {
                    call.reject("Model için yeterli boş bellek yok. Daha küçük bir model seçin.");
                } else if (e instanceof UnsatisfiedLinkError) {
                    call.reject("Bu modelin motoru cihazınızda kullanılamıyor. 64 bit Android gerekir.");
                } else if (detail.contains("unsupported")) {
                    call.reject("Model dosyası bu motor sürümüyle uyumlu değil.");
                } else {
                    call.reject("Model açılamadı. Dosyanın uyumlu olduğundan ve indirmenin tamamlandığından emin olun.");
                }
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt");
        if (prompt == null || prompt.trim().isEmpty()) {
            call.reject("prompt parametresi boş olamaz.");
            return;
        }

        executor.execute(() -> {
            if (llmInference == null && modernEngine == null) {
                call.reject("Aktif yerel yapay zekâ modeli yok. Lütfen Ayarlar'dan bir model yükleyin.");
                return;
            }
            try {
                long startTime = System.currentTimeMillis();
                String response;
                if (modernEngine != null) {
                    // Each document operation gets a fresh conversation: no earlier note leaks into a response.
                    try (Conversation conversation = modernEngine.createConversation(new ConversationConfig())) {
                        Message message = conversation.sendMessage(prompt, Collections.emptyMap(),
                                null, null, null, 512, new ThinkingConfig(false), null);
                        StringBuilder text = new StringBuilder();
                        for (Content content : message.getContents().getContents()) {
                            if (content instanceof Content.Text) text.append(((Content.Text) content).getText());
                        }
                        response = message.getChannels().get("final");
                        if (response == null || response.trim().isEmpty()) response = text.toString();
                        response = response.replaceAll("(?s)<think>.*?</think>", "").trim();
                        // Distilled reasoning models may omit the opening tag in their template.
                        int reasoningEnd = response.lastIndexOf("</think>");
                        if (reasoningEnd >= 0) response = response.substring(reasoningEnd + "</think>".length()).trim();
                        if (response.contains("<think>")) throw new IOException("Model son yanıtını tamamlayamadı. Daha kısa bir metin deneyin.");
                    }
                } else response = llmInference.generateResponse(prompt);
                long durationMs = System.currentTimeMillis() - startTime;

                JSObject ret = new JSObject();
                ret.put("text", response != null ? response : "");
                ret.put("durationMs", durationMs);
                ret.put("modelName", currentModelName != null ? currentModelName : "");
                call.resolve(ret);
            } catch (Throwable e) {
                call.reject("Yerel model yanıt üretemedi: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        executor.execute(() -> {
            try {
                closeEngines();

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Throwable e) {
                call.reject("Model serbest bırakılamadı: " + e.getMessage());
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        executor.execute(this::closeEngines);
        executor.shutdown();
        super.handleOnDestroy();
    }

    private void closeEngines() {
        if (llmInference != null) { try { llmInference.close(); } catch (Throwable ignored) {} }
        if (modernEngine != null) { try { modernEngine.close(); } catch (Throwable ignored) {} }
        llmInference = null;
        modernEngine = null;
        currentModelPath = null;
        currentModelName = null;
    }
}
