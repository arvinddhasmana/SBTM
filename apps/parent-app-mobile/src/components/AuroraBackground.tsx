import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

/**
 * Plain dark full-screen background. Previously rendered a gradient + three
 * decorative blurred "blobs" but the blobs hurt readability of the foreground
 * content (per parent feedback) so the background is now a flat dark slate.
 */
interface AuroraBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AuroraBackground({ children, style }: AuroraBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1020' },
  content: { flex: 1 },
});
