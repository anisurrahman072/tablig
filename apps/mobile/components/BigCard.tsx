import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "./AppText";
import { colors, radius, shadows, spacing } from "../theme";

type Props = {
  title: string;
  subtitle?: string;
  colors: [string, string];
  onPress: () => void;
  compactBottom?: boolean;
};

export function BigCard({
  title,
  subtitle,
  colors: gradientColors,
  onPress,
  compactBottom = false,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.wrap, compactBottom && styles.wrapCompactBottom]}
    >
      <LinearGradient colors={gradientColors} style={styles.card}>
        <AppText style={styles.title}>{title}</AppText>
        {subtitle ? (
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  wrapCompactBottom: {
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 110,
    justifyContent: "center",
  },
  title: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
});
