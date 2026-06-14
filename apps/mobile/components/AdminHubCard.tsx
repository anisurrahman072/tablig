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
  section: string;
  superAdminOnly?: boolean;
};

const ACTIONS: QuickAction[] = [
  {
    id: "grant",
    title: "নতুন এডমিন বানান",
    icon: "person-add-outline",
    iconBg: "rgba(255, 255, 255, 0.22)",
    iconColor: "#1B4332",
    textColor: "#1B4332",
    section: "grant",
  },
  {
    id: "masjid",
    title: "মসজিদ যোগ করুন",
    icon: "business-outline",
    iconBg: "rgba(255, 255, 255, 0.22)",
    iconColor: "#2D6A4F",
    textColor: "#1B4332",
    section: "masjid",
  },
  {
    id: "school",
    title: "স্কুল যোগ করুন",
    icon: "school-outline",
    iconBg: "rgba(255, 255, 255, 0.22)",
    iconColor: "#0B5345",
    textColor: "#145A32",
    section: "school",
  },
  {
    id: "admins",
    title: "এডমিন তালিকা",
    icon: "people-outline",
    iconBg: "rgba(255, 255, 255, 0.22)",
    iconColor: "#0B5345",
    textColor: "#1B4332",
    section: "admins",
  },
  {
    id: "sms-history",
    title: "ব্যাচ SMS ইতিহাস",
    icon: "mail-open-outline",
    iconBg: "rgba(255, 255, 255, 0.22)",
    iconColor: "#148F77",
    textColor: "#0E6655",
    section: "sms-history",
  },
];

type Props = {
  isSuperAdmin?: boolean;
};

export function AdminHubCard({ isSuperAdmin = false }: Props) {
  const router = useRouter();
  const visibleActions = ACTIONS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin,
  );

  function openAdmin(section: string) {
    if (section === "sms-history") {
      router.push("/batch-sms-history");
      return;
    }
    router.push({
      pathname: "/admin",
      params: { section },
    });
  }

  function renderChip(item: QuickAction) {
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => openAdmin(item.section)}
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
        colors={["#1B4332", "#40916C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/admin")}
          style={styles.header}
        >
          <View style={styles.headerText}>
            <AppText style={styles.title}>এডমিন</AppText>
            <AppText style={styles.subtitle}>
              এডমিন অ্যাক্সেস ও মসজিদ ব্যবস্থাপনা
            </AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#1B4332" />
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
