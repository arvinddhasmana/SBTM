import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'alert' | 'success';
  style?: ViewStyle;
}

export default function GlassCard({ children, variant = 'default', style }: GlassCardProps) {
  const getGradientColors = () => {
    switch (variant) {
      case 'elevated':
        return ['rgba(51, 65, 85, 0.8)', 'rgba(30, 41, 59, 0.8)'];
      case 'alert':
        return ['rgba(239, 68, 68, 0.15)', 'rgba(185, 28, 28, 0.15)'];
      case 'success':
        return ['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)'];
      default:
        return ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.6)'];
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'alert':
        return 'rgba(239, 68, 68, 0.3)';
      case 'success':
        return 'rgba(16, 185, 129, 0.3)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  return (
    <View style={[styles.container, { borderColor: getBorderColor() }, style]}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 16,
  },
});
