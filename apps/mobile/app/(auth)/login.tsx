import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { successMsg } = useLocalSearchParams<{ successMsg?: string }>();
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!mobile || !pin) {
      Alert.alert('ত্রুটি', 'মোবাইল ও পিন দিন');
      return;
    }
    try {
      setLoading(true);
      await login(mobile, pin);
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
        {successMsg ? (
          <View style={styles.banner}>
            <AppText style={styles.bannerText}>✓  {successMsg}</AppText>
          </View>
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ScreenHeader title="লগইন" />
            <InputField
              label="মোবাইল নম্বর"
              value={mobile}
              onChangeText={setMobile}
              placeholder="০১XXXXXXXXX"
              keyboardType="phone-pad"
            />
            <InputField
              label="পিন"
              value={pin}
              onChangeText={setPin}
              placeholder="••••"
              secureTextEntry
              keyboardType="numeric"
            />
            <PrimaryButton title="লগইন করুন" onPress={handleLogin} loading={loading} />
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-pin')} style={styles.link}>
              <AppText style={styles.linkText}>পিন ভুলে গেছেন? রিকভার করুন</AppText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg },
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
