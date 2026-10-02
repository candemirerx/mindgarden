package com.notbahcesi.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(RemoteBridgePlugin.class);
        registerPlugin(LocalLlmPlugin.class);
        super.onCreate(state);
    }
}
