import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { KeyboardFormScroll } from '../../components/KeyboardFormScroll';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { appAlert } from '../../lib/appAlert';
import { colors, radius, shadows, spacing } from '../../theme';

const PENDING_SIGNUP_KEY = 'tablig_signup_pending';

type PendingSignup = {
  requestId: string;
  name: string;
  userMobile: string;
  superAdminMobile: string;
};

export default function SignupSecurityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    requestId?: string;
    name?: string;
    userMobile?: string;
    superAdminMobile?: string;
  }>();
  const { verifySignup } = useAuth();
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [booting, setBooting] = useState(true);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      try {
        if (params.requestId) {
          const data: PendingSignup = {
            requestId: params.requestId,
            name: params.name || '',
            userMobile: params.userMobile || '',
            superAdminMobile: params.superAdminMobile || '01780581427',
          };
          setPending(data);
          await SecureStore.setItemAsync(PENDING_SIGNUP_KEY, JSON.stringify(data));
          return;
        }

        const stored = await SecureStore.getItemAsync(PENDING_SIGNUP_KEY);
        if (stored) {
          setPending(JSON.parse(stored) as PendingSignup);
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [params.requestId, params.name, params.userMobile, params.superAdminMobile]);

  async function handleVerify() {
    if (!pending?.requestId) {
      appAlert('ত্রুটি', 'অনুরোধ পাওয়া যায়নি। আবার সাইন আপ করুন');
      router.replace('/(auth)/signup');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      appAlert('ত্রুটি', '৬ অঙ্কের নিরাপত্তা কোড দিন');
      return;
    }
    try {
      setLoading(true);
      await verifySignup(pending.requestId, code.trim());
      await SecureStore.deleteItemAsync(PENDING_SIGNUP_KEY);
      router.replace('/(home)');
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pending?.requestId) return;
    try {
      setResending(true);
      await api.post('/auth/signup/resend', { requestId: pending.requestId });
      appAlert('সফল', 'সুপার অ্যাডমিনকে SMS আবার পাঠানো হয়েছে');
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setResending(false);
    }
  }

  if (booting) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!pending) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <AppText style={styles.emptyTitle}>কোনো মুলতুবি অনুরোধ নেই</AppText>
            <AppText style={styles.emptySubtitle}>
              আবার সাইন আপ করুন — আপনার তথ্য একবারই দিতে হবে
            </AppText>
            <PrimaryButton title="সাইন আপে ফিরুন" onPress={() => router.replace('/(auth)/signup')} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const adminNumber = pending.superAdminMobile || '01780581427';

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardFormScroll contentContainerStyle={styles.content}>
          <ScreenHeader title="অ্যাডমিন অনুমোদন" />

          <View style={styles.heroCard}>
            <View style={styles.iconRing}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="shield-checkmark" size={42} color="#fff" />
              </LinearGradient>
            </View>

            <AppText style={styles.heroTitle}>অ্যাডমিন যাচাইকরণ</AppText>
            <AppText style={styles.heroBody}>
              আপনার তথ্য নিরাপদে জমা হয়েছে। অ্যাকাউন্ট তৈরি করতে সুপার অ্যাডমিনের অনুমোদন
              প্রয়োজন।
            </AppText>
          </View>

          <View style={styles.infoCard}>
            <AppText style={styles.infoLabel}>জমা দেওয়া তথ্য</AppText>
            <AppText style={styles.infoValue}>{pending.name}</AppText>
            <AppText style={styles.infoMeta}>{pending.userMobile}</AppText>
          </View>

          <View style={styles.instructionCard}>
            <AppText style={styles.instructionText}>
              আপনার তথ্য নিশ্চিত করতে সুপার অ্যাডমিনকে কল করুন। সুপার অ্যাডমিনের মোবাইল নম্বর{' '}
              <AppText style={styles.highlight}>{adminNumber}</AppText> — এই নম্বরে SMS গিয়েছে।
              সুপার অ্যাডমিনকে কল করে OTP জেনে নিন এবং এখানে লিখুন।
            </AppText>
          </View>

          <AppText style={styles.otpLabel}>৬ অঙ্কের নিরাপত্তা কোড *</AppText>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="• • • • • •"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
            textAlign="center"
          />

          <PrimaryButton title="সাবমিট করুন" onPress={handleVerify} loading={loading} />

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending}
            style={styles.resendBtn}
          >
            {resending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <AppText style={styles.resendText}>সুপার অ্যাডমিনকে SMS আবার পাঠান</AppText>
            )}
          </TouchableOpacity>

          <AppText style={styles.footerNote}>
            আপনার তথ্য সংরক্ষিত আছে — OTP পেলেই সাবমিট করুন, আবার ফর্ম পূরণ করতে হবে না।
          </AppText>
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 22,
    textAlign: 'center',
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 16,
    textAlign: 'center',
    color: colors.textLight,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconRing: {
    marginBottom: spacing.md,
    borderRadius: 999,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  iconGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroBody: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 16,
    color: colors.textLight,
    lineHeight: 26,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 20,
    color: colors.primary,
  },
  infoMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.textLight,
    marginTop: 2,
  },
  instructionCard: {
    backgroundColor: 'rgba(46,134,171,0.08)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  instructionText: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
  highlight: {
    fontFamily: 'HindSiliguri_700Bold',
    color: colors.secondary,
  },
  otpLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  otpInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 28,
    letterSpacing: 8,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  resendText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },
  footerNote: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
