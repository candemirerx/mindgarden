package com.notbahcesi.app;

import java.util.concurrent.atomic.AtomicBoolean;

/** MTU callback and its watchdog may race; discover services exactly once. */
final class BleDiscoveryGate implements Runnable {
    private final AtomicBoolean started = new AtomicBoolean();
    private final Runnable discover;

    BleDiscoveryGate(Runnable discover) { this.discover = discover; }

    @Override public void run() {
        if (started.compareAndSet(false, true)) discover.run();
    }
}
