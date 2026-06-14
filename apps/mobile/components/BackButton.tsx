import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText } from './AppText';
import { colors } from '../theme';

type Props = {
  onPress?: () => void;
  style?: ViewStyle;
  activeOpacity?: number;
};

const ICON_SIZE = 22;
const ROW_HEIGHT = 24;

export function BackButton({ onPress, style, activeOpacity = 0.7 }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={style}
      activeOpacity={activeOpacity}
    >
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="chevron-back" size={ICON_SIZE} color={colors.primary} />
        </View>
        <AppText style={styles.label}>ফিরে যান</AppText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  label: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.primary,
    fontSize: 15,
    lineHeight: ROW_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
