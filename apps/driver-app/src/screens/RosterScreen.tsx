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
} from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import type { Student, Stop } from '../types';

interface Section {
  title: string;
  arrivalTime: string;
  data: Student[];
}

function StudentAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
  }
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <View style={[styles.avatarCircle, { backgroundColor: colors[colorIndex] }]}>
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
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.arrivalTime ? <Text style={styles.arrivalTime}>{section.arrivalTime}</Text> : null}
    </View>
  );

  const renderItem = ({ item }: { item: Student }) => {
    let statusColor = '#999';
    let buttonLabel = 'Board';
    if (item.status === 'BOARDED') {
      statusColor = '#34C759';
      buttonLabel = 'Alight';
    }
    if (item.status === 'ALIGHTED') {
      statusColor = '#FF9500';
      buttonLabel = 'Reset';
    }

    return (
      <View style={styles.card}>
        <StudentAvatar name={item.name} avatarUrl={item.avatarUrl} />
        <View style={styles.studentInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.infoText}>Loading roster…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Student Roster</Text>

      {routeDirection === 'PM' && hasNotBoarded && (
        <TouchableOpacity style={styles.bulkActionButton} onPress={handleBoardAll}>
          <Text style={styles.bulkActionText}>Board All Students</Text>
        </TouchableOpacity>
      )}
      {routeDirection === 'AM' && hasBoarded && (
        <TouchableOpacity
          style={[styles.bulkActionButton, styles.bulkAlightButton]}
          onPress={handleAlightAll}
        >
          <Text style={styles.bulkActionText}>Alight All Students</Text>
        </TouchableOpacity>
      )}

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline – changes will sync when reconnected</Text>
        </View>
      )}

      {rosterLoadState === 'error' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{rosterError ?? 'Roster unavailable'}</Text>
          <TouchableOpacity onPress={() => void refreshRoster()} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {students.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.infoText}>No students on this route yet.</Text>
          <TouchableOpacity onPress={() => void refreshRoster()} style={styles.retryButton}>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8eef4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d0d8e0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2c3e50',
  },
  arrivalTime: {
    fontSize: 13,
    color: '#607d8b',
    fontWeight: '600',
  },
  // Student card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  syncIndicator: {
    color: '#fff',
    fontSize: 12,
  },
  // Banners
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  offlineText: {
    color: '#856404',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#721C24',
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bulkActionButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  bulkAlightButton: {
    backgroundColor: '#FF9500',
  },
  bulkActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
