import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { AppLogo } from '../../components/AppLogo';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { KeyboardFormScroll } from '../../components/KeyboardFormScroll';
import { useAuth } from '../../context/AuthContext';
import { appAlert } from '../../lib/appAlert';
import { colors, radius, spacing } from '../../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { successMsg } = useLocalSearchParams<{ successMsg?: string }>();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const UNCLAIMED_MESSAGE = 'Apnar account toiri korun';

  async function handleLogin() {
    if (!mobile || !pin) {
      appAlert('ত্রুটি', 'মোবাইল ও পিন দিন');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      await login(mobile, pin);
      router.replace('/(home)');
    } catch (err: any) {
      if (err.message === UNCLAIMED_MESSAGE) {
        setErrorMsg(UNCLAIMED_MESSAGE);
      } else {
        appAlert('ত্রুটি', err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorBannerText}>{errorMsg}</AppText>
          </View>
        ) : null}
        {successMsg ? (
          <View style={styles.banner}>
            <AppText style={styles.bannerText}>✓  {successMsg}</AppText>
          </View>
        ) : null}
        <KeyboardFormScroll contentContainerStyle={styles.content}>
          <View style={styles.logoContainer}>
            <AppLogo size={100} />
          </View>
          <ScreenHeader title="লগইন" />
          <InputField
            label="মোবাইল নম্বর"
            value={mobile}
            onChangeText={(v) => {
              setMobile(v);
              setErrorMsg(null);
            }}
            placeholder="০১XXXXXXXXX"
            keyboardType="phone-pad"
          />
          <InputField
            label="পিন"
            value={pin}
            onChangeText={(v) => {
              setPin(v);
              setErrorMsg(null);
            }}
            placeholder="••••"
            secureTextEntry
            keyboardType="numeric"
          />
          <PrimaryButton title="লগইন করুন" onPress={handleLogin} loading={loading} />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-pin')} style={styles.link}>
            <AppText style={styles.linkText}>পিন ভুলে গেছেন? রিকভার করুন</AppText>
          </TouchableOpacity>
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#E74C3C',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  errorBannerText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  banner: {
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  bannerText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.primary,
    fontSize: 15,
  },
});
