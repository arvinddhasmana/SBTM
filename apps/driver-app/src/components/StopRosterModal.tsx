import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDriverStore } from '../store/useDriverStore';
import type { Student } from '../types';
import { SvgXml } from 'react-native-svg';

const GLASS_BG = 'rgba(15,23,42,0.95)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

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

interface Props {
  stopId: string | null;
  onClose: () => void;
}

export default function StopRosterModal({ stopId, onClose }: Props) {
  const { t } = useTranslation('common');
  const students = useDriverStore((state) => state.students);
  const stops = useDriverStore((state) => state.stops);
  const toggleStudentStatus = useDriverStore((state) => state.toggleStudentStatus);

  const stop = useMemo(() => stops.find((s) => s.id === stopId), [stops, stopId]);

  const stopStudents = useMemo(() => {
    if (!stopId) return [];
    return students.filter((s) => s.stopId === stopId);
  }, [students, stopId]);

  if (!stopId || !stop) return null;

  const renderItem = ({ item }: { item: Student }) => {
    let statusColor = 'rgba(255,255,255,0.25)';
    let buttonLabel = t('roster.board', { defaultValue: 'Board' });

    if (item.status === 'BOARDED') {
      statusColor = 'rgba(34,197,94,0.5)';
      buttonLabel = t('roster.alight', { defaultValue: 'Alight' });
    }
    if (item.status === 'ALIGHTED') {
      statusColor = 'rgba(245,158,11,0.5)';
      buttonLabel = t('roster.reset', { defaultValue: 'Reset' });
    }

    return (
      <View style={styles.studentCard}>
        <StudentAvatar name={item.name} avatarUrl={item.avatarUrl} />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {t(`roster.status.${item.status}`, { defaultValue: item.status.replace('_', ' ') })}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: statusColor }]}
          onPress={() => void toggleStudentStatus(item.id)}
        >
          <Text style={styles.actionButtonText}>{buttonLabel}</Text>
          {item.pendingSync && <Text style={styles.syncIndicator}>...</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={!!stopId} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.headerTitle}>
                    {t('roster.arrivedAtStop', { defaultValue: 'Arrived at Stop' })}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {stop.sequence}. {stop.stopName}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {stopStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {t('roster.noStudents', { defaultValue: 'No students assigned.' })}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={stopStudents}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  style={styles.list}
                  contentContainerStyle={{ paddingBottom: 10 }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: GLASS_BG,
    borderTopWidth: 1,
    borderColor: GLASS_BORDER,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 250,
    maxHeight: '80%',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  list: {
    flexGrow: 0,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  syncIndicator: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' },
});
