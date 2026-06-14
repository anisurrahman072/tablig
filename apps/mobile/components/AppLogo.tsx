import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  shape?: 'rounded' | 'circle';
};

export function AppLogo({ size = 160, style, shape = 'rounded' }: Props) {
  const borderRadius = shape === 'circle' ? size / 2 : Math.round(size * 0.22);

  return (
    <View style={[styles.clip, { width: size, height: size, borderRadius }, style]}>
      <Image
        source={require('../assets/logo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
