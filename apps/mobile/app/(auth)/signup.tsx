import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { SelectField } from '../../components/SelectField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { KeyboardFormScroll } from '../../components/KeyboardFormScroll';
import { AppText } from '../../components/AppText';
import api from '../../lib/api';
import { appAlert } from '../../lib/appAlert';
import { buildMasjidSelectOptions } from '../../lib/masjid';
import { colors, radius, spacing } from '../../theme';

const PENDING_SIGNUP_KEY = 'tablig_signup_pending';

type PendingSignup = {
  requestId: string;
  name: string;
  userMobile: string;
  superAdminMobile: string;
};

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [houseAddress, setHouseAddress] = useState('');
  const [masjid, setMasjid] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [masjids, setMasjids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);

  useEffect(() => {
    api
      .get('/masjids')
      .then((res) => setMasjids(res.data.data))
      .catch((err: Error) => {
        appAlert('ত্রুটি', err.message);
      });

    SecureStore.getItemAsync(PENDING_SIGNUP_KEY)
      .then((stored) => {
        if (stored) setPendingSignup(JSON.parse(stored) as PendingSignup);
      })
      .catch(() => {});
  }, []);

  function continuePendingSignup() {
    if (!pendingSignup) return;
    router.push({
      pathname: '/(auth)/signup-security',
      params: pendingSignup,
    });
  }

  async function handleSignup() {
    if (!name || !masjid || !mobile || !pin) {
      appAlert('ত্রুটি', 'সব বাধ্যতামূলক ঘর পূরণ করুন');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/auth/signup/request', {
        name,
        houseAddress,
        masjid,
        mobile,
        pin,
      });
      const { requestId, name: savedName, userMobile, superAdminMobile } = res.data.data;
      const pending: PendingSignup = {
        requestId,
        name: savedName,
        userMobile,
        superAdminMobile,
      };
      await SecureStore.setItemAsync(PENDING_SIGNUP_KEY, JSON.stringify(pending));
      setPendingSignup(pending);
      router.push({
        pathname: '/(auth)/signup-security',
        params: pending,
      });
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
            {pendingSignup ? (
              <TouchableOpacity style={styles.resumeBanner} onPress={continuePendingSignup}>
                <AppText style={styles.resumeTitle}>মুলতুবি অনুরোধ আছে</AppText>
                <AppText style={styles.resumeBody}>
                  {pendingSignup.name} ({pendingSignup.userMobile}) — OTP দিয়ে চালিয়ে যান
                </AppText>
              </TouchableOpacity>
            ) : null}
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
              options={buildMasjidSelectOptions(masjids)}
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
  resumeBanner: {
    backgroundColor: 'rgba(46,134,171,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resumeTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 16,
    color: colors.primary,
    marginBottom: 4,
  },
  resumeBody: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
});
