import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
    outputRange: [0, 200],
  });

  const chevronRotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const accentColor = routeDirection === 'AM' ? '#3b82f6' : '#f59e0b';

  return (
    <View style={styles.wrapper}>
      {/* Drag handle */}
      <TouchableOpacity
        onPress={toggle}
        style={styles.chevronBar}
        activeOpacity={0.8}
        hitSlop={{ top: 14, bottom: 14, left: 40, right: 40 }}
      >
        <View style={styles.dragHandle} />
      </TouchableOpacity>

      {/* Always-visible collapsed strip */}
      <View style={styles.collapsedStrip}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName} numberOfLines={1}>
            {routeName}
          </Text>
          <View style={[styles.dirBadge, routeDirection === 'AM' ? styles.dirAM : styles.dirPM]}>
            <Text style={[styles.dirText, { color: accentColor }]}>{routeDirection}</Text>
          </View>
        </View>

        {/* Glowing PANIC button */}
        <TouchableOpacity onPress={onPanic} activeOpacity={0.8} style={styles.panicWrapper}>
          <LinearGradient
            colors={['#7f1d1d', '#ef4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.panicButton}
          >
            <MaterialCommunityIcons name="alert-octagon" size={14} color="#fff" />
            <Text style={styles.panicText}>PANIC</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Expandable section */}
      <Animated.View style={[styles.expandable, { maxHeight: expandedHeight }]}>
        <View style={styles.expandContent}>
          {/* BLE status pill */}
          {scanState === 'scanning' && (
            <View style={styles.blePill}>
              <View style={styles.bleBlip} />
              <Text style={styles.bleStatus}>BLE Scanning Active</Text>
            </View>
          )}
          {scanState === 'permission_denied' && (
            <View style={[styles.blePill, styles.blePillWarn]}>
              <MaterialCommunityIcons name="bluetooth-off" size={12} color="#f59e0b" />
              <Text style={styles.bleWarning}>BLE denied — manual only</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnRoster]}
              onPress={onNavigateRoster}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="account-group" size={18} color="#fff" />
              <Text style={styles.btnText}>Roster</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnMessages]}
              onPress={onNavigateMessages}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="message-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Messages</Text>
              {infoRequestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeNum}>{infoRequestCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnEnd]}
              onPress={onEndRoute}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="flag-checkered" size={18} color="#fff" />
              <Text style={styles.btnText}>End</Text>
            </TouchableOpacity>
          </View>

          {/* Incident report */}
          <TouchableOpacity
            style={styles.incidentBtn}
            onPress={onReportIncident}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="clipboard-alert-outline"
              size={16}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.incidentText}>Report Incident</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const GLASS_BG = 'rgba(15,23,42,0.92)';
const GLASS_BORDER = 'rgba(255,255,255,0.1)';

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: GLASS_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: GLASS_BORDER,
  },
  chevronBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  collapsedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
  },
  dirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  dirAM: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  dirPM: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.5)',
  },
  dirText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  panicWrapper: {
    borderRadius: 10,
    // Shadow glow effect
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
  },
  panicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  panicText: {
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  expandable: {
    overflow: 'hidden',
  },
  expandContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  blePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  blePillWarn: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  bleBlip: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  bleStatus: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#34C759',
  },
  bleWarning: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#f59e0b',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'column',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    position: 'relative',
  },
  btnRoster: { backgroundColor: 'rgba(59,130,246,0.3)', borderColor: 'rgba(59,130,246,0.4)' },
  btnMessages: { backgroundColor: 'rgba(99,102,241,0.3)', borderColor: 'rgba(99,102,241,0.4)' },
  btnEnd: { backgroundColor: 'rgba(245,158,11,0.3)', borderColor: 'rgba(245,158,11,0.4)' },
  btnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 12,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
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
    fontFamily: 'Inter_700Bold',
    fontWeight: 'bold',
  },
  incidentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  incidentText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
});
