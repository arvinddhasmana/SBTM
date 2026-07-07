import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  /** Optional DB stop_sequence; rendered as a small badge so school stays
   *  visually distinct from numbered pickup/dropoff pins. */
  sequence?: number;
}

export default function SchoolMarkerView({ sequence }: Props) {
  return (
    <View style={styles.container}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"
          fill="white"
        />
      </Svg>
      {sequence !== undefined && sequence > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sequence}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#8b5cf6',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#8b5cf6',
  },
});
