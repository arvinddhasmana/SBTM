import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';

const GLASS_BG = 'rgba(15,23,42,0.92)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';
const COUNTDOWN_SECONDS = 5;

interface Props {
  visible: boolean;
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PanicCountdownModal({ visible, reason, onConfirm, onCancel }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      // Reset when hidden
      setSecondsLeft(COUNTDOWN_SECONDS);
      confirmedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Vibrate to get attention
    Vibration.vibrate([0, 300, 200, 300]);

    confirmedRef.current = false;
    setSecondsLeft(COUNTDOWN_SECONDS);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Auto-confirm
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            // Use setTimeout to avoid setState during render
            setTimeout(() => onConfirm(), 0);
          }
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, onConfirm]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>!</Text>
        </View>

        <Text style={styles.title}>EMERGENCY ALERT</Text>
        <Text style={styles.reason}>{reason}</Text>

        <View style={styles.countdownCircle}>
          <Text style={styles.countdownNumber}>{secondsLeft}</Text>
        </View>

        <Text style={styles.countdownLabel}>Sending alert in {secondsLeft}s...</Text>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendNowButton}
          onPress={() => {
            if (!confirmedRef.current) {
              confirmedRef.current = true;
              onConfirm();
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.sendNowText}>SEND NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(127,29,29,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: GLASS_BG,
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 20,
    padding: 28,
    width: '80%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 1,
    marginBottom: 6,
  },
  reason: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
  },
  countdownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF3B30',
  },
  countdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sendNowButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  sendNowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
