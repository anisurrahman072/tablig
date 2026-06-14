import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText } from "./AppText";
import { radius, shadows, spacing } from "../theme";

type QuickAction = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  textColor: string;
  params: Record<string, string>;
  adminOnly?: boolean;
};

const ACTIONS: QuickAction[] = [
  {
    id: "sms",
    title: "সাথীদের SMS পাঠান",
    icon: "chatbubble-ellipses-outline",
    iconBg: "rgba(241, 143, 1, 0.14)",
    iconColor: "#C56A00",
    textColor: "#5C3D0A",
    params: { type: "sathi", action: "sms" },
    adminOnly: true,
  },
  {
    id: "call",
    title: "সাথীদের কল দিন",
    icon: "call-outline",
    iconBg: "rgba(46, 134, 171, 0.14)",
    iconColor: "#2E86AB",
    textColor: "#1A5276",
    params: { type: "sathi", action: "call" },
  },
  {
    id: "whatsapp",
    title: "সাথীদের হোয়াটসঅ্যাপ",
    icon: "logo-whatsapp",
    iconBg: "rgba(37, 211, 102, 0.14)",
    iconColor: "#128C7E",
    textColor: "#145A32",
    params: { type: "sathi", action: "whatsapp" },
  },
  {
    id: "masjid",
    title: "মসজিদভিত্তিক সাথী",
    icon: "location-outline",
    iconBg: "rgba(108, 92, 231, 0.12)",
    iconColor: "#6C5CE7",
    textColor: "#4A3B8C",
    params: { type: "sathi", openFilters: "1" },
  },
  {
    id: "student",
    title: "ছাত্র খুঁজুন",
    icon: "school-outline",
    iconBg: "rgba(162, 59, 114, 0.12)",
    iconColor: "#A23B72",
    textColor: "#6C1949",
    params: { type: "student" },
  },
  {
    id: "school",
    title: "স্কুলভিত্তিক ছাত্র",
    icon: "library-outline",
    iconBg: "rgba(225, 86, 160, 0.12)",
    iconColor: "#E056A0",
    textColor: "#7A2455",
    params: { type: "student", openFilters: "1" },
  },
];

type Props = {
  isAdmin?: boolean;
};

export function SearchHubCard({ isAdmin = false }: Props) {
  const router = useRouter();
  const visibleActions = ACTIONS.filter((item) => !item.adminOnly || isAdmin);

  function openSearch(params: Record<string, string>) {
    router.push({ pathname: "/search", params });
  }

  function renderChip(item: QuickAction) {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => openSearch(item.params)}
        style={styles.chipOuter}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.97)", "rgba(255,255,255,0.88)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chip}
        >
          <View style={[styles.iconRing, { backgroundColor: item.iconBg }]}>
            <Ionicons name={item.icon} size={16} color={item.iconColor} />
          </View>
          <AppText
            style={[styles.chipText, { color: item.textColor }]}
            numberOfLines={1}
          >
            {item.title}
          </AppText>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["#F18F01", "#F7B733"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/search")}
          style={styles.header}
        >
          <View style={styles.headerText}>
            <AppText style={styles.title}>সাথী / ছাত্র খুঁজুন</AppText>
            <AppText style={styles.subtitle}>
              নাম, ক্লাস, স্কুল দিয়ে খুঁজুন
            </AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="search" size={20} color="#F18F01" />
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {visibleActions.map((item) => renderChip(item))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  chipOuter: {
    borderRadius: 22,
    ...shadows.card,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipText: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 12,
    lineHeight: 15,
    flexShrink: 1,
  },
});
