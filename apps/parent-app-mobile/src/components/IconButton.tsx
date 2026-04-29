import React from 'react';
import { Pressable, StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';

/**
 * Small round glass icon button used in the Aurora Dark header rows.
 * Renders a circular translucent surface with the provided icon glyph
 * (emoji or short string) centered. Optionally shows a small red dot
 * for unread / alert indication. Always accepts an accessibilityLabel
 * so screen readers and E2E selectors can identify the action.
 */
interface IconButtonProps {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
  showDot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  showDot = false,
  style,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-label={accessibilityLabel as any}
      testID={testID}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
    >
      <Text style={styles.icon}>{icon}</Text>
      {showDot && <View style={styles.dot} />}
      {/* Visually small but present text label so text-based selectors still match */}
      <Text
        style={styles.srOnly}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {accessibilityLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.16)' },
  icon: { fontSize: 18, color: '#e2e8f0' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#0b1020',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    color: 'transparent',
    fontSize: 1,
  },
});
