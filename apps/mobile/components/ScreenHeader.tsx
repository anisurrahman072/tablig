import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { BackButton } from './BackButton';
import { colors, spacing } from '../theme';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <BackButton style={styles.backBtn} />
      <AppText style={styles.title}>{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 26,
    color: colors.text,
  },
});
