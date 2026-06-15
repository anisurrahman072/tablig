import React, { useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "../../components/GradientBackground";
import { AppLogo } from "../../components/AppLogo";
import { BigCard } from "../../components/BigCard";
import { SearchHubCard } from "../../components/SearchHubCard";
import { AdminHubCard } from "../../components/AdminHubCard";
import { AppText } from "../../components/AppText";
import { useAuth } from "../../context/AuthContext";
import { colors, radius, shadows, spacing } from "../../theme";

export default function HomeScreen() {
  const router = useRouter();
  const { account, logout, refreshAccount } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshAccount().catch(() => {});
    }, [refreshAccount]),
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.premiumHeader}>
            <View style={styles.topBar}>
              <AppLogo size={48} shape="circle" style={styles.brandLogo} />
              <View style={styles.brandTextBlock}>
                <AppText style={styles.brandTitle}>তাবলীগ - হালকা ২২৬</AppText>
                <AppText style={styles.brandSub}>টঙ্গী মারকাজ</AppText>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/profile")}
                style={styles.settingsBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="settings-sharp"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.welcomeSection}>
              <AppText style={styles.greet}>আসসালামু আলাইকুম</AppText>
              <AppText style={styles.name}>{account?.name}</AppText>
            </View>
          </View>

          <BigCard
            title="নতুন সাথী / ছাত্র যোগ করুন"
            subtitle="সাথী বা ছাত্র — একটি ফর্মেই যোগ করুন"
            colors={["#2E86AB", "#A23B72"]}
            onPress={() => router.push("/add-sathi")}
          />

          <SearchHubCard isAdmin={!!account?.isAdmin} />

          <BigCard
            title="কারগুজারি লিখুন"
            subtitle="সাক্ষাতের মেহনতের কারগুজারি লিখুন"
            colors={["#6C5CE7", "#A29BFE"]}
            onPress={() => router.push("/karguzari-select")}
          />
          {account?.isAdmin ? (
            <>
              <BigCard
                title="এসএমএস ইতিহাস"
                subtitle="একক ও ব্যাচ এসএমএস দেখুন, পুনরায় পাঠান"
                colors={["#0B5345", "#1ABC9C"]}
                onPress={() => router.push("/batch-sms-history")}
              />
              <AdminHubCard isSuperAdmin={!!account?.isSuperAdmin} />
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  premiumHeader: {
    marginBottom: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  brandTextBlock: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  brandTitle: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  brandSub: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
  brandLogo: {
    borderWidth: 2,
    borderColor: 'rgba(46, 134, 171, 0.22)',
    shadowColor: '#2E86AB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.2)",
    ...shadows.card,
  },
  welcomeSection: {
    paddingHorizontal: 4,
  },
  greet: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 15,
    color: colors.textLight,
  },
  name: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 28,
    color: colors.text,
    marginTop: -6,
  },
});
