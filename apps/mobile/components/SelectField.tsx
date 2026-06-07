import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AppText } from './AppText';
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
  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={value ?? ''}
          onValueChange={(v) => onValueChange(v === '' ? null : v)}
          style={styles.picker}
        >
          <Picker.Item label={placeholder || 'নির্বাচন করুন'} value="" />
          {options.map((opt) => (
            <Picker.Item key={String(opt.value)} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
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
  pickerWrap: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  picker: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.text,
  },
});
