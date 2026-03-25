import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import { Student } from '../types';

export default function RosterScreen() {
    const students = useDriverStore((state) => state.students);
    const rosterLoadState = useDriverStore((state) => state.rosterLoadState);
    const rosterError = useDriverStore((state) => state.rosterError);
    const isOffline = useDriverStore((state) => state.isOffline);
    const toggleStudentStatus = useDriverStore((state) => state.toggleStudentStatus);
    const refreshRoster = useDriverStore((state) => state.refreshRoster);

    const renderItem = ({ item }: { item: Student }) => {
        let statusColor = '#999';
        if (item.status === 'BOARDED') statusColor = '#34C759';
        if (item.status === 'ALIGHTED') statusColor = '#FF9500';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => void toggleStudentStatus(item.id)}
                accessibilityLabel={`${item.status} – tap to change`}
            >
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.pendingSync && (
                        <Text style={styles.pendingBadge}>⏳</Text>
                    )}
                </View>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                </View>
            </TouchableOpacity>
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
                <FlatList
                    data={students}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onRefresh={() => void refreshRoster()}
                    refreshing={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
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
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 18,
    },
    pendingBadge: {
        fontSize: 14,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    offlineBanner: {
        backgroundColor: '#FFF3CD',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    offlineText: {
        color: '#856404',
        fontSize: 13,
    },
    errorBanner: {
        backgroundColor: '#F8D7DA',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
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
});
