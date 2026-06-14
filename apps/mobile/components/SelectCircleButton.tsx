import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

type Props = {
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function SelectCircleButton({ selected, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {selected ? (
        <LinearGradient
          colors={['#2E86AB', '#48C9B0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circleSelected}
        >
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={[styles.circle, disabled && styles.circleDisabled]}>
          <View style={styles.innerRing} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E86AB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  circleDisabled: {
    opacity: 0.35,
    borderColor: colors.textLight,
  },
  innerRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(46, 134, 171, 0.12)',
  },
  circleSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E86AB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
});
