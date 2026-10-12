package com.notbahcesi.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.KeyEvent;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(RemoteBridgePlugin.class);
        registerPlugin(LocalLlmPlugin.class);
        super.onCreate(state);
    }

    @Override public boolean dispatchKeyEvent(KeyEvent olay) {
        if (DikteTuslari.tusIsle(olay)) return true;
        return super.dispatchKeyEvent(olay);
    }

    @Override public void onResume() { super.onResume(); DikteTuslari.planDegisti(this, true); }
    @Override public void onPause() { super.onPause(); DikteTuslari.planDegisti(this, false); }
}
