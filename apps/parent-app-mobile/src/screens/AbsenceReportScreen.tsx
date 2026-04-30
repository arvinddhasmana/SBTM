import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useParentStore } from '../store/useParentStore';
import { ParentApiService } from '../services/ParentApiService';
import { AbsenceReport } from '../types';
import { GlassCard, GlassButton } from '../components';

/** Today as YYYY-MM-DD (local-day, mirrors web AbsenceReport.tsx). */
function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Web-only date input wrapper. react-native-web translates `<TextInput>` into
 * an `<input type="text">` so the browser's date picker never appears. We
 * sidestep that by rendering a real native `<input type="date">` element on
 * web (it still satisfies `getByTestId('absence-date').fill('YYYY-MM-DD')`
 * because Playwright fills it like any input).
 */
function WebDateInput({
  value,
  onChange,
  min,
  testID,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  min: string;
  testID: string;
  disabled?: boolean;
}) {
  // React.createElement avoids JSX type-checking against react-native intrinsic
  // types (since we're rendering a DOM element on web).
  return React.createElement('input', {
    type: 'date',
    value,
    min,
    disabled,
    'data-testid': testID,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    style: {
      width: '100%',
      backgroundColor: '#fff',
      color: '#0f172a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '12px 15px',
      fontSize: 16,
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
  });
}

export default function AbsenceReportScreen() {
  const { children } = useParentStore();
  const [selectedChildId, setSelectedChildId] = useState(children.length > 0 ? children[0].id : '');
  const minDate = useMemo(() => todayIso(), []);
  const [tripDate, setTripDate] = useState<string>(minDate);
  const [routeType, setRouteType] = useState<'AM' | 'PM' | 'BOTH'>('BOTH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Native (iOS/Android) calendar visibility. iOS shows it inline so default
  // to true; Android opens the OS dialog on demand and dismisses on its own.
  const [showNativePicker, setShowNativePicker] = useState(false);

  /** Parse 'YYYY-MM-DD' as a local-day date (avoids UTC off-by-one). */
  const parseTripDate = (iso: string): Date => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  /** Friendly label for the date button (e.g. "Thu, Apr 30, 2026"). */
  const formatTripDate = (iso: string): string => {
    if (!iso) return 'Select date';
    return parseTripDate(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleNativeDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires `dismissed` on cancel — hide and keep the previous value.
    if (Platform.OS === 'android') setShowNativePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    setTripDate(`${yyyy}-${mm}-${dd}`);
  };

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
      Alert.alert('Error', 'Please enter date in format YYYY-MM-DD (e.g., 2026-05-01)');
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
              setTripDate(minDate);
              setRouteType('BOTH');
              setNotes('');
            },
          },
        ],
      );
    } catch (error: any) {
      // NestJS ValidationPipe returns `message` as a string[]; the gateway's
      // ConflictException returns a string. Normalize so the parent sees
      // the real reason (e.g. "already reported", "studentId must be a UUID").
      const raw = error?.message ?? error?.details?.message;
      const friendly = Array.isArray(raw)
        ? raw.join('\n')
        : typeof raw === 'string' && raw.trim()
          ? raw
          : 'Failed to report absence. Please try again.';
      Alert.alert('Error', friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (children.length === 0) {
    return (
      <View style={styles.centerContainer} testID="absence-screen">
        <Text style={styles.emptyText}>No children associated with your account.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="absence-screen">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <GlassCard style={styles.formCard}>
          <Text style={styles.title}>Report an Absence</Text>
          <Text style={styles.subtitle}>
            Let the driver and school know your child will not be riding the bus.
          </Text>

          {/* Submit at the top — keeps the primary action visible without
            scrolling on smaller phones. */}
          <GlassButton
            title="Submit Report"
            onPress={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.submitButton}
            testID="absence-submit"
          />

          {/* Child Selector — light surface so the selected option text is
            readable on both web (browser-native popup) and native dropdowns. */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Child</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedChildId}
                onValueChange={setSelectedChildId}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor="#0f172a"
                testID="absence-child"
              >
                {children.map((child) => (
                  <Picker.Item
                    key={child.id}
                    label={`${child.firstName} ${child.lastName}`}
                    value={child.id}
                    color="#0f172a"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Date Input — web uses a real <input type="date"> for the browser
            calendar; native uses @react-native-community/datetimepicker so a
            real OS calendar opens (iOS spinner / Android dialog). The plain
            TextInput fallback was kept so existing E2E tests still pass on
            web (`getByTestId('absence-date').fill(...)`). */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Date</Text>
            {Platform.OS === 'web' ? (
              <WebDateInput
                value={tripDate}
                onChange={setTripDate}
                min={minDate}
                testID="absence-date"
                disabled={isSubmitting}
              />
            ) : (
              <>
                <Pressable
                  onPress={() => setShowNativePicker(true)}
                  disabled={isSubmitting}
                  style={styles.dateButton}
                  accessibilityRole="button"
                  accessibilityLabel="Pick absence date"
                  testID="absence-date"
                >
                  <Text style={styles.dateButtonText}>{formatTripDate(tripDate)}</Text>
                  <Text style={styles.dateButtonIcon}>🗓️</Text>
                </Pressable>
                {showNativePicker && (
                  <DateTimePicker
                    testID="absence-date-picker"
                    value={parseTripDate(tripDate || minDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    minimumDate={parseTripDate(minDate)}
                    onChange={handleNativeDateChange}
                  />
                )}
                {Platform.OS === 'ios' && showNativePicker && (
                  <Pressable onPress={() => setShowNativePicker(false)} style={styles.dateDoneBtn}>
                    <Text style={styles.dateDoneText}>Done</Text>
                  </Pressable>
                )}
              </>
            )}
            <Text style={styles.hint}>Earliest selectable date is today.</Text>
          </View>

          {/* Route Type Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Route</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={routeType}
                onValueChange={(value) => setRouteType(value as 'AM' | 'PM' | 'BOTH')}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor="#0f172a"
                testID="absence-route"
              >
                <Picker.Item label="Morning route only (AM)" value="AM" color="#0f172a" />
                <Picker.Item label="Afternoon route only (PM)" value="PM" color="#0f172a" />
                <Picker.Item label="Full day (both routes)" value="BOTH" color="#0f172a" />
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
              testID="absence-notes"
            />
            <Text style={styles.hint}>{notes.length}/500 characters</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1020',
    padding: 20,
  },
  content: {
    padding: 14,
  },
  formCard: {
    padding: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    // Android's native Picker draws its selected text inside an inner
    // TextView whose descenders get clipped when the wrapper is too short.
    // Give the container some vertical breathing room and let the picker
    // own the height so the chosen value is fully visible.
    paddingVertical: Platform.OS === 'android' ? 2 : 0,
  },
  picker: {
    color: '#0f172a',
    height: Platform.OS === 'android' ? 60 : 44,
  },
  pickerItem: {
    color: '#0f172a',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: { color: '#0f172a', fontSize: 15, fontWeight: '500' },
  dateButtonIcon: { fontSize: 16 },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    backgroundColor: 'rgba(99,102,241,0.85)',
    borderRadius: 8,
  },
  dateDoneText: { color: '#fff', fontWeight: '600' },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  submitButton: {
    marginTop: 4,
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
});
