import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../../components/GradientBackground';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { InputField } from '../../../components/InputField';
import { SelectField } from '../../../components/SelectField';
import { PrimaryButton } from '../../../components/PrimaryButton';
import api from '../../../lib/api';
import { displayMobile } from '../../../lib/mobile';
import {
  TIME_GIVEN_OPTIONS,
  MASTURAT_DAYS_OPTIONS,
  STUDENT_CLASS_OPTIONS,
} from '../../../constants/options';
import { spacing } from '../../../theme';

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [type, setType] = useState<'sathi' | 'student'>('sathi');
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const [masjidRes, schoolRes, personRes] = await Promise.all([
          api.get('/masjids'),
          api.get('/schools'),
          api.get(`/persons/${id}`),
        ]);
        setMasjids(masjidRes.data.data);
        setSchools(schoolRes.data.data);
        const p = personRes.data.data;
        setType(p.type);
        setForm({
          name: p.name,
          masjid: p.masjid,
          houseLocation: p.houseLocation || '',
          mobile: displayMobile(p.mobile),
          timeGivenValue: p.timeGivenValue,
          masturatDaysValue: p.masturatDaysValue,
          profession: p.profession || '',
          classValue: p.classValue,
          schoolName: p.schoolName || '',
          fatherName: p.fatherName || '',
          fatherMobile: displayMobile(p.fatherMobile),
        });
      } finally {
        setDataLoading(false);
      }
    })();
  }, [id]);

  function update(key: string, value: any) {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name || !form.masjid) {
      Alert.alert('ত্রুটি', 'নাম ও মসজিদ বাধ্যতামূলক');
      return;
    }
    try {
      setLoading(true);
      await api.put(`/persons/${id}`, { type, ...form });
      Alert.alert('সফল', 'তথ্য আপডেট হয়েছে', [
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
        {dataLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2E86AB" />
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <ScreenHeader title="তথ্য সম্পাদনা" />
          <InputField label="নাম *" value={form.name || ''} onChangeText={(v) => update('name', v)} />
          <SelectField
            label="কাছের মসজিদ *"
            value={form.masjid || null}
            onValueChange={(v) => update('masjid', v)}
            options={masjids.map((m) => ({ label: m, value: m }))}
          />
          <InputField
            label="বাসার লোকেশন"
            value={form.houseLocation || ''}
            onChangeText={(v) => update('houseLocation', v)}
          />
          <InputField
            label="মোবাইল"
            value={form.mobile || ''}
            onChangeText={(v) => update('mobile', v)}
            keyboardType="phone-pad"
          />
          <SelectField
            label="এর আগে কত দিন সময় দিয়েছে?"
            value={form.timeGivenValue}
            onValueChange={(v) => update('timeGivenValue', v)}
            options={TIME_GIVEN_OPTIONS}
          />

          {type === 'sathi' ? (
            <>
              <SelectField
                label="মাস্তুরাতে কত দিন সময় দিয়েছে?"
                value={form.masturatDaysValue}
                onValueChange={(v) => update('masturatDaysValue', v)}
                options={MASTURAT_DAYS_OPTIONS}
              />
              <InputField
                label="পেশা"
                value={form.profession || ''}
                onChangeText={(v) => update('profession', v)}
              />
            </>
          ) : (
            <>
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
                value={form.fatherName || ''}
                onChangeText={(v) => update('fatherName', v)}
              />
              <InputField
                label="বাবার মোবাইল"
                value={form.fatherMobile || ''}
                onChangeText={(v) => update('fatherMobile', v)}
                keyboardType="phone-pad"
              />
            </>
          )}

          <PrimaryButton title="আপডেট করুন" onPress={handleSave} loading={loading} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
