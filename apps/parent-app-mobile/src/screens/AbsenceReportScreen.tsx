import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useParentStore } from '../store/useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { AbsenceReport } from '../types';

export default function AbsenceReportScreen() {
  const { children } = useParentStore();
  const [selectedChildId, setSelectedChildId] = useState(
    children.length > 0 ? children[0].id : ''
  );
  const [tripDate, setTripDate] = useState('');
  const [routeType, setRouteType] = useState<'AM' | 'PM' | 'BOTH'>('BOTH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedChildId) {
      Alert.alert('Error', 'Please select a child');
      return;
    }

    if (!tripDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tripDate)) {
      Alert.alert(
        'Error',
        'Please enter date in format YYYY-MM-DD (e.g., 2026-05-01)'
      );
      return;
    }

    const selectedChild = children.find((c) => c.id === selectedChildId);
    if (!selectedChild) {
      Alert.alert('Error', 'Selected child not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const report: AbsenceReport = {
        studentId: selectedChild.studentId,
        tripDate,
        routeType,
        notes: notes.trim() || undefined,
      };

      await ParentApiService.reportAbsence(report);

      Alert.alert(
        'Success',
        'Absence reported successfully. The driver and school have been notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setTripDate('');
              setRouteType('BOTH');
              setNotes('');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to report absence. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (children.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          No children associated with your account.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report an Absence</Text>
      <Text style={styles.subtitle}>
        Let the driver and school know your child will not be riding the bus.
      </Text>

      {/* Child Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Child</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedChildId}
            onValueChange={setSelectedChildId}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            {children.map((child) => (
              <Picker.Item
                key={child.id}
                label={`${child.firstName} ${child.lastName}`}
                value={child.id}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Date Input */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-05-01"
          placeholderTextColor="#64748b"
          value={tripDate}
          onChangeText={setTripDate}
          editable={!isSubmitting}
        />
        <Text style={styles.hint}>Format: YYYY-MM-DD, minimum today</Text>
      </View>

      {/* Route Type Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Route</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={routeType}
            onValueChange={(value) => setRouteType(value as 'AM' | 'PM' | 'BOTH')}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Morning route only (AM)" value="AM" />
            <Picker.Item label="Afternoon route only (PM)" value="PM" />
            <Picker.Item label="Full day (both routes)" value="BOTH" />
          </Picker>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional information..."
          placeholderTextColor="#64748b"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          maxLength={500}
          editable={!isSubmitting}
        />
        <Text style={styles.hint}>{notes.length}/500 characters</Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
