import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { AppLogo } from '../../components/AppLogo';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { wakeupServer } from '../../lib/api';
import { colors, radius, spacing } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      wakeupServer();
    }, []),
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <AppLogo size={160} />
          </View>

          <View style={styles.heroBlock}>
            <AppText style={styles.heroTitle}>শূরায়ে নিজাম</AppText>
            <LinearGradient
              colors={[colors.primary, colors.secondary, colors.accent]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroAccent}
            />
          </View>

          <AppText style={styles.title}>সাথী ও ছাত্র ব্যবস্থাপনা</AppText>
          <AppText style={styles.subtitle}>
            দাওয়াতের কাজে সাথী ও ছাত্রদের তথ্য এক জায়গায় রাখুন
          </AppText>

          <View style={styles.actions}>
            <PrimaryButton title="লগইন" onPress={() => router.push('/(auth)/login')} />
            <PrimaryButton
              title="সাইন আপ"
              variant="secondary"
              onPress={() => router.push('/(auth)/signup')}
            />
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 40,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 52,
  },
  heroAccent: {
    width: 72,
    height: 4,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 26,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 17,
    color: colors.textLight,
    lineHeight: 26,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  actions: { gap: spacing.sm },
});
