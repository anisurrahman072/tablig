import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { colors, radius, shadows, spacing } from '../theme';

type Props = {
  count: number;
  onSmsPress: () => void;
  onClear: () => void;
};

export function BatchSmsActionBar({ count, onSmsPress, onClear }: Props) {
  const insets = useSafeAreaInsets();

  if (count === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <LinearGradient
          colors={['#2E86AB', '#48C9B0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.countBadge}>
            <AppText style={styles.countText}>{count}</AppText>
          </View>
          <AppText style={styles.headerTitle} numberOfLines={1}>
            {count} জন নির্বাচিত
          </AppText>
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity style={styles.actionRow} onPress={onSmsPress} activeOpacity={0.82}>
          <LinearGradient colors={['#2E86AB', '#48C9B0']} style={styles.actionIconWrap}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
          </LinearGradient>
          <AppText style={styles.actionTitle}>নির্বাচিতদের একসাথে এসএমএস পাঠান</AppText>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.12)',
    ...shadows.card,
    shadowOpacity: 0.18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  countBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    flex: 1,
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
