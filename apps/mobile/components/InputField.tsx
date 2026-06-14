import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FocusEvent,
} from 'react-native';
import { AppText } from './AppText';
import { useScrollOnInputFocus } from './KeyboardFormScroll';
import { colors, radius, spacing } from '../theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  onFocus?: (e: FocusEvent) => void;
};

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  multiline,
  onFocus,
}: Props) {
  const wrapRef = useRef<View>(null);
  const scrollIntoView = useScrollOnInputFocus();

  function handleFocus(e: FocusEvent) {
    onFocus?.(e);
    scrollIntoView?.(wrapRef);
  }

  return (
    <View ref={wrapRef} style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={handleFocus}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
