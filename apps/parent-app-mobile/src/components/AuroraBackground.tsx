import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Aurora Dark themed full-screen background with dark indigo gradient and
 * soft, decorative blurred "blobs" that mimic the glassmorphic mockups.
 */
interface AuroraBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AuroraBackground({ children, style }: AuroraBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={['#0b1020', '#1e1b4b', '#0b1020']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative blurred blobs */}
      <View pointerEvents="none" style={[styles.blob, styles.blobIndigo]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobPurple]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBlue]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1020' },
  content: { flex: 1 },
  blob: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.35,
  },
  blobIndigo: { top: -80, left: -90, backgroundColor: '#6366f1' },
  blobPurple: { top: 220, right: -120, backgroundColor: '#8b5cf6' },
  blobBlue: { bottom: -120, left: 40, backgroundColor: '#3b82f6' },
});
