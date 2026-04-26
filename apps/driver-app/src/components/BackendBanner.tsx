import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
}

export default function BackendBanner({ visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="wifi-off" size={16} color="#fef08a" style={styles.icon} />
      <Text style={styles.text}>
        Backend services are unreachable. Check your network or contact your administrator.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#78350f',
    borderBottomColor: '#d97706',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: {
    marginRight: 8,
    flexShrink: 0,
  },
  text: {
    color: '#fef08a',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
