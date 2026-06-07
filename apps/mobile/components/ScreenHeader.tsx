import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <View style={styles.backInner}>
          {/* Arrow uses system font so it renders correctly on all devices */}
          <Text style={styles.arrow}>‹</Text>
          <AppText style={styles.backText}>ফিরে যান</AppText>
        </View>
      </TouchableOpacity>
      <AppText style={styles.title}>{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  backInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    fontSize: 22,
    color: colors.primary,
    lineHeight: 24,
    fontWeight: '300',
  },
  backText: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.primary,
    fontSize: 15,
  },
  title: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 26,
    color: colors.text,
  },
});
