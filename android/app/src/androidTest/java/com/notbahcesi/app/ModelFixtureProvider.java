package com.notbahcesi.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.FileNotFoundException;
import java.io.OutputStream;
import java.io.File;

/** Kişisel dosyalara erişmez. Test için 2 MB sıfır üretir; çıkarımda kullanılmaz. */
public class ModelFixtureProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) { return "application/octet-stream"; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        File real = new File(getContext().getExternalFilesDir(null), "gemma3-1b-it-int4.task");
        cursor.addRow(new Object[]{uri.getLastPathSegment(), "gemma3-1b-it-int4.task".equals(uri.getLastPathSegment()) ? real.length() : 2L * 1024 * 1024});
        return cursor;
    }
    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        String name = uri.getLastPathSegment();
        if ("gemma3-1b-it-int4.task".equals(name)) return ParcelFileDescriptor.open(new File(getContext().getExternalFilesDir(null), name), ParcelFileDescriptor.MODE_READ_ONLY);
        if (!"qa-fixture.task".equals(name) && !"qa-fixture.litertlm".equals(name) && !"qa-fixture.safetensors".equals(name)) throw new FileNotFoundException();
        try {
            ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
            new Thread(() -> {
                try (OutputStream out = new ParcelFileDescriptor.AutoCloseOutputStream(pipe[1])) {
                    byte[] buffer = new byte[64 * 1024];
                    for (int i = 0; i < 32; i++) out.write(buffer);
                } catch (Exception ignored) {}
            }).start();
            return pipe[0];
        } catch (Exception e) { throw new FileNotFoundException(e.getMessage()); }
    }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri uri, ContentValues values, String where, String[] args) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri uri, String where, String[] args) { throw new UnsupportedOperationException(); }
}
