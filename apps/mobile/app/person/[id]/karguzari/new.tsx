import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GradientBackground } from '../../../../components/GradientBackground';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { InputField } from '../../../../components/InputField';
import { SelectField } from '../../../../components/SelectField';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { AppText } from '../../../../components/AppText';
import api from '../../../../lib/api';
import { KARGUZARI_TIME_SLOTS } from '../../../../constants/options';
import { colors, radius, spacing } from '../../../../theme';

export default function NewKarguzariScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  function formatBanglaDate(d: Date) {
    return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function openPicker() {
    setTempDate(date);
    setShowPicker(true);
  }

  function confirmIOSDate() {
    setDate(tempDate);
    setShowPicker(false);
  }

  async function handleSubmit() {
    if (!timeSlot || !text.trim()) {
      Alert.alert('ত্রুটি', 'সময় ও কারগুজারি দিন');
      return;
    }
    try {
      setLoading(true);
      await api.post(`/persons/${id}/karguzari`, {
        meetingDate: date.toISOString(),
        timeSlot,
        text,
      });
      Alert.alert('সফল', 'কারগুজারি সংরক্ষিত', [
        { text: 'ঠিক আছে', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title="কারগুজারি যোগ করুন" />

            <AppText style={styles.label}>সাক্ষাতের তারিখ</AppText>
            <TouchableOpacity style={styles.dateBtn} onPress={openPicker}>
              <AppText style={styles.dateText}>{formatBanglaDate(date)}</AppText>
              <AppText style={styles.dateMeta}>তারিখ পরিবর্তন করুন →</AppText>
            </TouchableOpacity>

            {/* Android: inline picker */}
            {showPicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setShowPicker(false);
                  if (selected) setDate(selected);
                }}
              />
            )}

            {/* iOS: modal with spinner + confirm */}
            {Platform.OS === 'ios' && (
              <Modal transparent animationType="slide" visible={showPicker}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalBox}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setShowPicker(false)}>
                        <AppText style={styles.modalCancel}>বাতিল</AppText>
                      </TouchableOpacity>
                      <AppText style={styles.modalTitle}>তারিখ নির্বাচন</AppText>
                      <TouchableOpacity onPress={confirmIOSDate}>
                        <AppText style={styles.modalDone}>ঠিক আছে</AppText>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, selected) => {
                        if (selected) setTempDate(selected);
                      }}
                      style={styles.iosPicker}
                    />
                  </View>
                </View>
              </Modal>
            )}

            <SelectField
              label="সাক্ষাতের সময়"
              value={timeSlot}
              onValueChange={(v) => setTimeSlot(v as string)}
              options={KARGUZARI_TIME_SLOTS.map((s) => ({ label: s, value: s }))}
            />

            <InputField
              label="কারগুজারি"
              value={text}
              onChangeText={setText}
              placeholder="সাক্ষাতের বিবরণ লিখুন"
              multiline
            />

            <PrimaryButton title="সংরক্ষণ করুন" onPress={handleSubmit} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  label: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  dateBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.md,
  },
  dateText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  dateMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  modalCancel: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.textLight,
    fontSize: 15,
  },
  modalDone: {
    fontFamily: 'HindSiliguri_700Bold',
    color: colors.primary,
    fontSize: 15,
  },
  iosPicker: {
    width: '100%',
  },
});
