import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { KeyboardFormScroll } from '../../components/KeyboardFormScroll';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { appAlert } from '../../lib/appAlert';
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
    api
      .get('/masjids')
      .then((res) => setMasjids(res.data.data))
      .catch((err: Error) => {
        appAlert('ত্রুটি', err.message);
      });
  }, []);

  async function handleSignup() {
    if (!name || !masjid || !mobile || !pin) {
      appAlert('ত্রুটি', 'সব বাধ্যতামূলক ঘর পূরণ করুন');
      return;
    }
    try {
      setLoading(true);
      await signup({ name, houseAddress, masjid, mobile, pin });
      router.replace('/(home)');
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardFormScroll contentContainerStyle={styles.content}>
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
              label="নতুন পিন সেট করুন *"
              value={pin}
              onChangeText={setPin}
              placeholder="কমপক্ষে ৪ অঙ্ক"
              secureTextEntry
              keyboardType="numeric"
            />
            <PrimaryButton title="অ্যাকাউন্ট তৈরি করুন" onPress={handleSignup} loading={loading} />
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },
});
