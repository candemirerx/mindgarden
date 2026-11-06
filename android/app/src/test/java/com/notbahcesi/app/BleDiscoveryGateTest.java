package com.notbahcesi.app;

import static org.junit.Assert.assertEquals;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;

public class BleDiscoveryGateTest {
    @Test public void missingMtuCallbackStillDiscovers() {
        AtomicInteger count = new AtomicInteger();
        BleDiscoveryGate gate = new BleDiscoveryGate(count::incrementAndGet);
        gate.run(); // watchdog: shared Android connection returned no MTU callback
        assertEquals(1, count.get());
    }

    @Test public void lateAndDuplicateMtuCallbacksDoNotRestartDiscovery() {
        AtomicInteger count = new AtomicInteger();
        BleDiscoveryGate gate = new BleDiscoveryGate(count::incrementAndGet);
        gate.run(); // watchdog or first MTU callback
        gate.run(); // late MTU callback
        gate.run(); // watchdog after successful callback
        assertEquals(1, count.get());
    }
}
