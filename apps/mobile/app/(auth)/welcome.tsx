import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <AppText style={styles.badge}>তাবলিগ</AppText>
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
  badge: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 34,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 17,
    color: colors.textLight,
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  actions: { gap: spacing.sm },
});
