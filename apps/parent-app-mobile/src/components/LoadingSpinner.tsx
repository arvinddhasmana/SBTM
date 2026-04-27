import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export default function LoadingSpinner({ size = 'medium', color }: LoadingSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const sizeValue = getSizeValue();

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const gradientColors = color
    ? [color, color]
    : ['#6366f1', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: sizeValue,
            height: sizeValue,
            transform: [{ rotate: spin }, { scale: pulseValue }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradient, { borderRadius: sizeValue / 2 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View
          style={[
            styles.innerCircle,
            {
              width: sizeValue * 0.7,
              height: sizeValue * 0.7,
              borderRadius: (sizeValue * 0.7) / 2,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  innerCircle: {
    backgroundColor: '#1e293b',
    position: 'absolute',
  },
});
