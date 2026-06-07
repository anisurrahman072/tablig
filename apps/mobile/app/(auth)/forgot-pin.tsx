import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { InputField } from '../../components/InputField';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../lib/api';
import { spacing } from '../../theme';

export default function ForgotPinScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!mobile.trim()) {
      Alert.alert('ত্রুটি', 'মোবাইল নম্বর দিন');
      return;
    }
    try {
      setLoading(true);
      await api.post('/auth/forgot-pin', { mobile });
      // Go straight to login with a success message — no extra step
      router.replace({
        pathname: '/(auth)/login',
        params: { successMsg: 'আপনার নতুন পিন মোবাইলে পাঠানো হয়েছে' },
      });
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
            <ScreenHeader title="পিন রিকভারি" />
            <InputField
              label="মোবাইল নম্বর"
              value={mobile}
              onChangeText={setMobile}
              placeholder="০১XXXXXXXXX"
              keyboardType="phone-pad"
            />
            <PrimaryButton title="পিন পাঠান" onPress={handleSend} loading={loading} />
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
});
