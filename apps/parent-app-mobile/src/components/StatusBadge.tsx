import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'on_bus'
  | 'at_school'
  | 'at_home'
  | 'unknown';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function StatusBadge({
  label,
  variant,
  size = 'medium',
  style,
  textStyle,
}: StatusBadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
      case 'at_school':
        return {
          background: 'rgba(16, 185, 129, 0.2)',
          border: 'rgba(16, 185, 129, 0.5)',
          text: '#10b981',
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.2)',
          border: 'rgba(245, 158, 11, 0.5)',
          text: '#f59e0b',
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.2)',
          border: 'rgba(239, 68, 68, 0.5)',
          text: '#ef4444',
        };
      case 'info':
      case 'on_bus':
        return {
          background: 'rgba(99, 102, 241, 0.2)',
          border: 'rgba(99, 102, 241, 0.5)',
          text: '#6366f1',
        };
      case 'neutral':
      case 'at_home':
        return {
          background: 'rgba(100, 116, 139, 0.2)',
          border: 'rgba(100, 116, 139, 0.5)',
          text: '#64748b',
        };
      case 'unknown':
        return {
          background: 'rgba(245, 158, 11, 0.2)',
          border: 'rgba(245, 158, 11, 0.5)',
          text: '#f59e0b',
        };
      default:
        return {
          background: 'rgba(100, 116, 139, 0.2)',
          border: 'rgba(100, 116, 139, 0.5)',
          text: '#64748b',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
          text: { fontSize: 11 },
        };
      case 'large':
        return {
          container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
          text: { fontSize: 16 },
        };
      default:
        return {
          container: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 10 },
          text: { fontSize: 13 },
        };
    }
  };

  const colors = getColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeStyles.text,
          { color: colors.text },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
