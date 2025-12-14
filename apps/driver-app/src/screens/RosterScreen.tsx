import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useDriverStore } from '../store/useDriverStore';
import { Student } from '../types';

export default function RosterScreen() {
    const students = useDriverStore((state) => state.students);
    const toggleStudentStatus = useDriverStore((state) => state.toggleStudentStatus);

    const renderItem = ({ item }: { item: Student }) => {
        let statusColor = '#999';
        if (item.status === 'BOARDED') statusColor = '#34C759'; // Green
        if (item.status === 'ALIGHTED') statusColor = '#FF9500'; // Orange

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => toggleStudentStatus(item.id)}
            >
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Student Roster</Text>
            <FlatList
                data={students}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
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
    name: {
        fontSize: 18,
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
});
