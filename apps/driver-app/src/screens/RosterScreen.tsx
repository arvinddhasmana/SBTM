import React, { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDriverStore } from '../store/useDriverStore';
import type { Student, Stop } from '../types';
import { SvgXml } from 'react-native-svg';

const GLASS_BG = 'rgba(15,23,42,0.82)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

interface Section {
  title: string;
  arrivalTime: string;
  data: Student[];
}

function StudentAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    if (avatarUrl.startsWith('data:image/svg+xml')) {
      const xml = decodeURIComponent(avatarUrl.replace(/^data:image\/svg\+xml;utf8,/, ''));
      return (
        <View style={[styles.avatar, { overflow: 'hidden' }]}>
          <SvgXml xml={xml} width="40" height="40" />
        </View>
      );
    }
    return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
  }
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <View style={[styles.avatarCircle, { backgroundColor: `${colors[colorIndex]}66` }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function buildSections(students: Student[], stops: Stop[]): Section[] {
  const stopStudents = new Map<string, Student[]>();
  const unassigned: Student[] = [];

  for (const student of students) {
    if (student.stopId) {
      const list = stopStudents.get(student.stopId) ?? [];
      list.push(student);
      stopStudents.set(student.stopId, list);
    } else {
      unassigned.push(student);
    }
  }

  const sections: Section[] = stops
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => ({
      title: `Stop ${stop.sequence}: ${stop.stopName}`,
      arrivalTime: stop.arrivalTime ?? '',
      data: stopStudents.get(stop.id) ?? [],
    }))
    .filter((section) => section.data.length > 0);

  if (unassigned.length > 0) {
    sections.push({ title: 'Other Students', arrivalTime: '', data: unassigned });
  }

  return sections;
}

export default function RosterScreen() {
  const insets = useSafeAreaInsets();
  const students = useDriverStore((state) => state.students);
  const stops = useDriverStore((state) => state.stops);
  const rosterLoadState = useDriverStore((state) => state.rosterLoadState);
  const rosterError = useDriverStore((state) => state.rosterError);
  const isOffline = useDriverStore((state) => state.isOffline);
  const toggleStudentStatus = useDriverStore((state) => state.toggleStudentStatus);
  const refreshRoster = useDriverStore((state) => state.refreshRoster);
  const routeDirection = useDriverStore((state) => state.routeDirection);
  const boardAll = useDriverStore((state) => state.boardAll);
  const alightAll = useDriverStore((state) => state.alightAll);

  const sections = useMemo(() => buildSections(students, stops), [students, stops]);

  const hasNotBoarded = students.some((s) => s.status === 'NOT_BOARDED');
  const hasBoarded = students.some((s) => s.status === 'BOARDED');

  const handleBoardAll = () => {
    Alert.alert('Board All', 'Mark all students as boarded?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Board All', onPress: () => void boardAll() },
    ]);
  };

  const handleAlightAll = () => {
    Alert.alert('Alight All', 'Mark all boarded students as alighted?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Alight All', onPress: () => void alightAll() },
    ]);
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {section.title}
      </Text>
      {section.arrivalTime ? <Text style={styles.arrivalTime}>{section.arrivalTime}</Text> : null}
    </View>
  );

  const renderItem = ({ item }: { item: Student }) => {
    let statusColor = 'rgba(255,255,255,0.25)';
    let buttonLabel = 'Board';
    if (item.status === 'BOARDED') {
      statusColor = 'rgba(34,197,94,0.5)';
      buttonLabel = 'Alight';
    }
    if (item.status === 'ALIGHTED') {
      statusColor = 'rgba(245,158,11,0.5)';
      buttonLabel = 'Reset';
    }

    return (
      <View style={styles.card}>
        <StudentAvatar name={item.name} avatarUrl={item.avatarUrl} />
        <View style={styles.studentInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: statusColor }]}
          onPress={() => void toggleStudentStatus(item.id)}
          accessibilityLabel={`${item.name} – ${buttonLabel}`}
        >
          <Text style={styles.actionButtonText}>{buttonLabel}</Text>
          {item.pendingSync && <Text style={styles.syncIndicator}>...</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  if (rosterLoadState === 'loading') {
    return (
      <View style={[styles.centerView, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.infoText}>Loading roster...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Text style={styles.header}>Student Roster</Text>

      {routeDirection === 'PM' && hasNotBoarded && (
        <TouchableOpacity style={styles.bulkBtn} onPress={handleBoardAll}>
          <Text style={styles.bulkText}>Board All Students</Text>
        </TouchableOpacity>
      )}
      {routeDirection === 'AM' && hasBoarded && (
        <TouchableOpacity style={[styles.bulkBtn, styles.bulkAlight]} onPress={handleAlightAll}>
          <Text style={styles.bulkText}>Alight All Students</Text>
        </TouchableOpacity>
      )}

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline - changes will sync when reconnected</Text>
        </View>
      )}

      {rosterLoadState === 'error' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{rosterError ?? 'Roster unavailable'}</Text>
          <TouchableOpacity onPress={() => void refreshRoster()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {students.length === 0 ? (
        <View style={styles.centerView}>
          <Text style={styles.infoText}>No students on this route yet.</Text>
          <TouchableOpacity onPress={() => void refreshRoster()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          onRefresh={() => void refreshRoster()}
          refreshing={false}
          stickySectionHeadersEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    padding: 16,
    paddingBottom: 8,
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    marginRight: 8,
  },
  arrivalTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GLASS_BG,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncIndicator: {
    color: '#fff',
    fontSize: 11,
  },
  offlineBanner: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: 8,
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 6,
  },
  offlineText: {
    color: '#f59e0b',
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 6,
    padding: 8,
    marginHorizontal: 14,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: 'rgba(59,130,246,0.4)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkBtn: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 6,
    alignItems: 'center',
  },
  bulkAlight: {
    backgroundColor: 'rgba(245,158,11,0.3)',
  },
  bulkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
