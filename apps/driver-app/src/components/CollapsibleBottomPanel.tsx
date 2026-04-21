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
  expanded: boolean;
  onToggle: () => void;
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
  expanded,
  onToggle,
  onNavigateRoster,
  onNavigateMessages,
  onEndRoute,
  onReportIncident,
  onPanic,
}: Props) {
  const animValue = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animValue, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [expanded, animValue]);

  const expandedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 110],
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
        onPress={onToggle}
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
    backgroundColor: 'rgba(10,16,35,0.39)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  chevronBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 7,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    color: '#e2e8f0',
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
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  panicText: {
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  expandable: {
    overflow: 'hidden',
  },
  expandContent: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
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
    gap: 6,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    position: 'relative',
  },
  btnRoster: { backgroundColor: 'rgba(59,130,246,0.09)', borderColor: 'rgba(59,130,246,0.15)' },
  btnMessages: { backgroundColor: 'rgba(99,102,241,0.09)', borderColor: 'rgba(99,102,241,0.15)' },
  btnEnd: { backgroundColor: 'rgba(245,158,11,0.09)', borderColor: 'rgba(245,158,11,0.15)' },
  btnText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
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
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.05)',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.1)',
  },
  incidentText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 11,
  },
});
