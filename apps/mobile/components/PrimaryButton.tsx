import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
};

export function PrimaryButton({ title, onPress, loading, variant = 'primary' }: Props) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[
        styles.btn,
        { backgroundColor: bg },
        variant === 'outline' && styles.outline,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <AppText style={[styles.text, variant === 'outline' && styles.outlineText]}>
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  text: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  outline: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  outlineText: {
    color: colors.primary,
  },
});
