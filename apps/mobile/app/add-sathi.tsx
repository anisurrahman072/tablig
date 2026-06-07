import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { InputField } from '../components/InputField';
import { SelectField } from '../components/SelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import api from '../lib/api';
import { TIME_GIVEN_OPTIONS, MASTURAT_DAYS_OPTIONS } from '../constants/options';
import { spacing } from '../theme';

export default function AddSathiScreen() {
  const router = useRouter();
  const [masjids, setMasjids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    masjid: null as string | null,
    houseLocation: '',
    mobile: '',
    timeGivenValue: null as number | null,
    masturatDaysValue: null as number | null,
    profession: '',
  });

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
  }, []);

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.masjid) {
      Alert.alert('ত্রুটি', 'নাম ও মসজিদ বাধ্যতামূলক');
      return;
    }
    try {
      setLoading(true);
      await api.post('/persons', { type: 'sathi', ...form });
      Alert.alert('সফল', 'সাথী যোগ হয়েছে', [
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
            <ScreenHeader title="নতুন সাথী যোগ করুন" />
            <InputField label="নাম *" value={form.name} onChangeText={(v) => update('name', v)} />
            <SelectField
              label="কাছের মসজিদ *"
              value={form.masjid}
              onValueChange={(v) => update('masjid', v)}
              options={masjids.map((m) => ({ label: m, value: m }))}
            />
            <InputField
              label="বাসার লোকেশন"
              value={form.houseLocation}
              onChangeText={(v) => update('houseLocation', v)}
            />
            <InputField
              label="মোবাইল"
              value={form.mobile}
              onChangeText={(v) => update('mobile', v)}
              keyboardType="phone-pad"
            />
            <SelectField
              label="এর আগে কত দিন সময় দিয়েছে?"
              value={form.timeGivenValue}
              onValueChange={(v) => update('timeGivenValue', v)}
              options={TIME_GIVEN_OPTIONS}
            />
            <SelectField
              label="মাস্তুরাতে কত দিন সময় দিয়েছে?"
              value={form.masturatDaysValue}
              onValueChange={(v) => update('masturatDaysValue', v)}
              options={MASTURAT_DAYS_OPTIONS}
            />
            <InputField
              label="পেশা"
              value={form.profession}
              onChangeText={(v) => update('profession', v)}
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
});
