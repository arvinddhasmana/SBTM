import { useEffect, useRef, useCallback } from 'react';

/**
 * Detects panic-worthy events:
 *   - Rapid multi-tap (>2 taps in 1.5s) anywhere on screen
 *   - Device drop: free-fall (<0.3g) followed by impact (>3g) within a 2ft+ drop window
 *
 * Both triggers call `onPanicDetected(reason)` which should show a countdown confirmation.
 */
export function usePanicDetection(isActive: boolean, onPanicDetected: (reason: string) => void) {
  const tapTimestamps = useRef<number[]>([]);
  const accelerometerSub = useRef<{ remove: () => void } | null>(null);
  const fallStartTime = useRef<number | null>(null);
  const onPanicRef = useRef(onPanicDetected);
  onPanicRef.current = onPanicDetected;

  // ── Multi-tap detection ────────────────────────────────────────
  const registerTap = useCallback(() => {
    if (!isActive) return;
    const now = Date.now();
    tapTimestamps.current.push(now);
    // Keep only taps within the last 1.5 seconds
    tapTimestamps.current = tapTimestamps.current.filter((t) => now - t < 1500);
    if (tapTimestamps.current.length > 2) {
      tapTimestamps.current = [];
      onPanicRef.current('Rapid taps detected');
    }
  }, [isActive]);

  // ── Drop detection (accelerometer) ─────────────────────────────
  useEffect(() => {
    if (!isActive) {
      if (accelerometerSub.current) {
        accelerometerSub.current.remove();
        accelerometerSub.current = null;
      }
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { Accelerometer } = require('expo-sensors');
        Accelerometer.setUpdateInterval(100);
        accelerometerSub.current = Accelerometer.addListener(
          (data: { x: number; y: number; z: number }) => {
            if (!mounted) return;
            const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
            const now = Date.now();

            // Free-fall: magnitude < 0.3g
            if (magnitude < 0.3) {
              if (!fallStartTime.current) {
                fallStartTime.current = now;
              }
            }
            // Impact after fall: magnitude > 3g within 600ms of free-fall start
            else if (magnitude > 3 && fallStartTime.current) {
              const fallDuration = now - fallStartTime.current;
              // 2-foot drop ~350ms; allow 100-600ms window
              if (fallDuration >= 100 && fallDuration <= 600) {
                fallStartTime.current = null;
                onPanicRef.current('Device drop detected');
              } else {
                fallStartTime.current = null;
              }
            }
            // Reset if no impact within 800ms of fall start
            else if (fallStartTime.current && now - fallStartTime.current > 800) {
              fallStartTime.current = null;
            }
          },
        );
      } catch {
        // expo-sensors not available (e.g., simulator) — silently skip
      }
    })();

    return () => {
      mounted = false;
      if (accelerometerSub.current) {
        accelerometerSub.current.remove();
        accelerometerSub.current = null;
      }
    };
  }, [isActive]);

  return { registerTap };
}
