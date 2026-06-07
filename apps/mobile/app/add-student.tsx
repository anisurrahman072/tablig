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
import { TIME_GIVEN_OPTIONS, STUDENT_CLASS_OPTIONS } from '../constants/options';
import { spacing } from '../theme';

export default function AddStudentScreen() {
  const router = useRouter();
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    masjid: null as string | null,
    houseLocation: '',
    mobile: '',
    timeGivenValue: null as number | null,
    classValue: null as number | null,
    schoolName: '',
    fatherName: '',
    fatherMobile: '',
  });

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
    api.get('/schools').then((res) => setSchools(res.data.data));
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
      await api.post('/persons', { type: 'student', ...form });
      Alert.alert('সফল', 'ছাত্র যোগ হয়েছে', [
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
            <ScreenHeader title="নতুন ছাত্র যোগ করুন" />
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
              label="কোন ক্লাসে পড়ে?"
              value={form.classValue}
              onValueChange={(v) => update('classValue', v)}
              options={STUDENT_CLASS_OPTIONS}
            />
            <SelectField
              label="স্কুলের নাম"
              value={form.schoolName || null}
              onValueChange={(v) => update('schoolName', v || '')}
              options={schools.map((s) => ({ label: s, value: s }))}
            />
            <InputField
              label="বাবার নাম"
              value={form.fatherName}
              onChangeText={(v) => update('fatherName', v)}
            />
            <InputField
              label="বাবার মোবাইল"
              value={form.fatherMobile}
              onChangeText={(v) => update('fatherMobile', v)}
              keyboardType="phone-pad"
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
