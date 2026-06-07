import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { spacing } from '../../theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [masjid, setMasjid] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [masjids, setMasjids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
  }, []);

  async function handleSignup() {
    if (!name || !masjid || !mobile || !pin) {
      Alert.alert('ত্রুটি', 'সব বাধ্যতামূলক ঘর পূরণ করুন');
      return;
    }
    try {
      setLoading(true);
      await signup({ name, houseAddress, masjid, mobile, pin });
      router.replace('/(home)');
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
            <ScreenHeader title="সাইন আপ" />
            <InputField label="নাম *" value={name} onChangeText={setName} placeholder="আপনার নাম" />
            <InputField
              label="বাসার ঠিকানা"
              value={houseAddress}
              onChangeText={setHouseAddress}
              placeholder="ঐচ্ছিক"
            />
            <SelectField
              label="মসজিদ *"
              value={masjid}
              onValueChange={(v) => setMasjid(v as string)}
              options={masjids.map((m) => ({ label: m, value: m }))}
              placeholder="মসজিদ নির্বাচন করুন"
            />
            <InputField
              label="মোবাইল নম্বর *"
              value={mobile}
              onChangeText={setMobile}
              placeholder="০১XXXXXXXXX"
              keyboardType="phone-pad"
            />
            <InputField
              label="পিন *"
              value={pin}
              onChangeText={setPin}
              placeholder="কমপক্ষে ৪ অঙ্ক"
              secureTextEntry
              keyboardType="numeric"
            />
            <PrimaryButton title="অ্যাকাউন্ট তৈরি করুন" onPress={handleSignup} loading={loading} />
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
