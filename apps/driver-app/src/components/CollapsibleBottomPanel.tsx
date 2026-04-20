import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  routeName: string;
  routeDirection: string;
  scanState: string;
  infoRequestCount: number;
  onNavigateRoster: () => void;
  onNavigateMessages: () => void;
  onEndRoute: () => void;
  onReportIncident: () => void;
  onPanic: () => void;
}

export default function CollapsibleBottomPanel({
  routeName,
  routeDirection,
  scanState,
  infoRequestCount,
  onNavigateRoster,
  onNavigateMessages,
  onEndRoute,
  onReportIncident,
  onPanic,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animValue, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animValue]);

  const expandedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const chevronRotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Chevron toggle – large, easy to tap while driving */}
      <TouchableOpacity
        onPress={toggle}
        style={styles.chevronBar}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
      >
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Svg width={32} height={32} viewBox="0 0 24 24">
            <Path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="rgba(255,255,255,0.8)" />
          </Svg>
        </Animated.View>
      </TouchableOpacity>

      {/* Always-visible collapsed strip */}
      <View style={styles.collapsedStrip}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName} numberOfLines={1}>
            {routeName}
          </Text>
          <View style={[styles.dirBadge, routeDirection === 'AM' ? styles.dirAM : styles.dirPM]}>
            <Text style={styles.dirText}>{routeDirection}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.panicButton} onPress={onPanic} activeOpacity={0.7}>
          <Text style={styles.panicText}>PANIC</Text>
        </TouchableOpacity>
      </View>

      {/* Expandable section */}
      <Animated.View style={[styles.expandable, { maxHeight: expandedHeight }]}>
        <View style={styles.expandContent}>
          {/* BLE status */}
          {scanState === 'scanning' && <Text style={styles.bleStatus}>BLE Active</Text>}
          {scanState === 'permission_denied' && (
            <Text style={styles.bleWarning}>BLE denied - manual only</Text>
          )}

          {/* Action buttons – sleek and compact */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.btnRoster]} onPress={onNavigateRoster}>
              <Text style={styles.btnText}>Roster</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnMessages]} onPress={onNavigateMessages}>
              <Text style={styles.btnText}>Messages</Text>
              {infoRequestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeNum}>{infoRequestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnEnd]} onPress={onEndRoute}>
              <Text style={styles.btnText}>End</Text>
            </TouchableOpacity>
          </View>

          {/* Incident button */}
          <TouchableOpacity style={styles.incidentBtn} onPress={onReportIncident}>
            <Text style={styles.incidentText}>Report Incident</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: GLASS_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: GLASS_BORDER,
  },
  // Large chevron bar for easy driving access
  chevronBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  collapsedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  dirBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dirAM: { backgroundColor: 'rgba(59,130,246,0.4)' },
  dirPM: { backgroundColor: 'rgba(245,158,11,0.4)' },
  dirText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  panicButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
  },
  panicText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  expandable: {
    overflow: 'hidden',
  },
  expandContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  bleStatus: {
    fontSize: 11,
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 8,
  },
  bleWarning: {
    fontSize: 11,
    color: '#FF9500',
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    position: 'relative',
  },
  btnRoster: { backgroundColor: 'rgba(0,122,255,0.35)' },
  btnMessages: { backgroundColor: 'rgba(99,102,241,0.35)' },
  btnEnd: { backgroundColor: 'rgba(255,149,0,0.35)' },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeNum: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  incidentBtn: {
    backgroundColor: 'rgba(245,158,11,0.3)',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  incidentText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
