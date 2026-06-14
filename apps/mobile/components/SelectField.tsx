import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PremiumModal } from './PremiumModal';
import { colors, radius, spacing } from '../theme';

type Option = { label: string; value: string | number };

type Props = {
  label: string;
  value: string | number | null;
  onValueChange: (v: string | number | null) => void;
  options: Option[];
  placeholder?: string;
};

export function SelectField({ label, value, onValueChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const placeholderText = placeholder || 'নির্বাচন করুন';
  const selected = options.find((opt) => opt.value === value);
  const displayText = selected?.label ?? placeholderText;

  function selectOption(next: string | number | null) {
    onValueChange(next);
    setOpen(false);
  }

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        <AppText style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {displayText}
        </AppText>
        <Ionicons name="chevron-down" size={20} color={colors.primary} />
      </TouchableOpacity>

      <PremiumModal visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {placeholder ? (
            <TouchableOpacity
              style={[styles.option, value === null && styles.optionSelected]}
              onPress={() => selectOption(null)}
              activeOpacity={0.7}
            >
              <AppText style={[styles.optionText, value === null && styles.optionTextSelected]}>
                {placeholderText}
              </AppText>
              {value === null ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          ) : null}
          {options.map((opt, index) => {
            const isSelected = opt.value === value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.option,
                  isSelected && styles.optionSelected,
                  index === options.length - 1 && styles.optionLast,
                ]}
                onPress={() => selectOption(opt.value)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt.label}
                </AppText>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : (
                  <View style={styles.optionDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </PremiumModal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  triggerText: {
    flex: 1,
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 16,
    color: colors.text,
    marginRight: spacing.sm,
  },
  placeholderText: {
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
  },
  list: {
    maxHeight: 360,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionSelected: {
    backgroundColor: '#E8F4FA',
  },
  optionText: {
    flex: 1,
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 16,
    color: colors.text,
    marginRight: spacing.sm,
  },
  optionTextSelected: {
    fontFamily: 'HindSiliguri_700Bold',
    color: colors.primary,
  },
  optionDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
});
