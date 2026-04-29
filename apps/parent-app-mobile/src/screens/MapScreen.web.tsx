import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useParentStore } from '../store/useParentStore';
import { RootStackParamList } from '../types';
import { AuroraBackground, IconButton } from '../components';

type MapScreenRouteProp = RouteProp<RootStackParamList, 'Map'>;

/**
 * Web-only stub for MapScreen.
 *
 * react-native-maps relies on native iOS/Android map modules and cannot be
 * bundled for the web. The native MapScreen.tsx remains the source of truth
 * for iOS/Android. This file only renders a simple placeholder so the app can
 * still bundle and run in Expo web (used for Playwright E2E and previews).
 */
export default function MapScreen() {
  const route = useRoute<MapScreenRouteProp>();
  const navigation = useNavigation();
  const { children } = useParentStore();
  const child = children.find((c) => c.id === route.params.childId);

  return (
    <AuroraBackground>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.row}>
          <IconButton icon="‹" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
          {child && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {child.firstName} {child.lastName}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
      <View style={styles.center}>
        <Text style={styles.title}>Map view</Text>
        <Text style={styles.subtitle}>Live tracking is available in the iOS and Android apps.</Text>
        <Pressable
          accessibilityLabel="Back to dashboard"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Back to dashboard</Text>
        </Pressable>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: '#e0e7ff',
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#a5b4fc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
