import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { GradientBackground } from "../components/GradientBackground";
import { ScreenHeader } from "../components/ScreenHeader";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { AdminGrantUserSearch } from "../components/AdminGrantUserSearch";
import { AppText } from "../components/AppText";
import api from "../lib/api";
import { appAlert } from "../lib/appAlert";
import { displayMobile } from "../lib/mobile";
import { colors, radius, shadows, spacing } from "../theme";

type AdminItem = {
  id: string;
  name: string;
  mobile: string;
  displayMobile: string;
  isSuperAdmin: boolean;
};

type MasjidItem = {
  id: string;
  name: string;
};

type SchoolItem = {
  id: string;
  name: string;
};

export default function AdminScreen() {
  const { account } = useAuth();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const isSuperAdmin = !!account?.isSuperAdmin;
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const grantSectionY = useRef(0);
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [masjids, setMasjids] = useState<MasjidItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [adminMobile, setAdminMobile] = useState("");
  const [masjidName, setMasjidName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingMasjids, setLoadingMasjids] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [adminRes, masjidRes, schoolRes] = await Promise.all([
      api.get("/admin/admins"),
      api.get("/admin/masjids"),
      api.get("/admin/schools"),
    ]);
    setAdmins(adminRes.data.data);
    setMasjids(masjidRes.data.data);
    setSchools(schoolRes.data.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => appAlert("ত্রুটি", "এডমিন তথ্য লোড করা যায়নি"));
    }, [load]),
  );

  useEffect(() => {
    if (!section) return;
    const timer = setTimeout(() => {
      const y = sectionOffsets.current[section];
      if (y != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [section, admins.length, masjids.length, schools.length]);

  function markSection(key: string, y: number) {
    sectionOffsets.current[key] = y;
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch {
      appAlert("ত্রুটি", "এডমিন তথ্য লোড করা যায়নি");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleGrantAdmin() {
    if (!adminMobile.trim()) {
      appAlert("ত্রুটি", "মোবাইল নম্বর দিন");
      return;
    }

    appAlert(
      "এডমিন করুন",
      `${adminMobile.trim()} নম্বরকে এডমিন করবেন? তাকে SMS-এ পিন পাঠানো হবে।`,
      [
        { text: "না", style: "cancel" },
        { text: "হ্যাঁ, এডমিন করুন", onPress: () => grantAdminByMobile() },
      ],
    );
  }

  async function grantAdminByMobile() {
    try {
      setLoadingAdmins(true);
      await api.post("/admin/admins", { mobile: adminMobile });
      setAdminMobile("");
      await load();
      appAlert("সফল", "এডমিন অ্যাক্সেস দেওয়া হয়েছে এবং SMS পাঠানো হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "এডমিন অ্যাক্সেস দেওয়া যায়নি");
    } finally {
      setLoadingAdmins(false);
    }
  }

  const adminMobiles = new Set(admins.map((a) => a.mobile));

  function confirmRevokeAdmin(item: AdminItem) {
    appAlert(
      "এডমিন বাতিল",
      `${item.name} (${displayMobile(item.mobile)}) এর এডমিন অ্যাক্সেস বাতিল করবেন?`,
      [
        { text: "না", style: "cancel" },
        {
          text: "হ্যাঁ, বাতিল করুন",
          style: "destructive",
          onPress: () => revokeAdmin(item),
        },
      ],
    );
  }

  async function revokeAdmin(item: AdminItem) {
    try {
      await api.delete(`/admin/admins/${item.mobile}`);
      await load();
      appAlert("সফল", "এডমিন অ্যাক্সেস বাতিল করা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "এডমিন অ্যাক্সেস বাতিল করা যায়নি");
    }
  }

  async function handleAddMasjid() {
    if (!masjidName.trim()) {
      appAlert("ত্রুটি", "মসজিদের নাম দিন");
      return;
    }
    try {
      setLoadingMasjids(true);
      await api.post("/admin/masjids", { name: masjidName.trim() });
      setMasjidName("");
      await load();
      appAlert("সফল", "মসজিদ যোগ করা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "মসজিদ যোগ করা যায়নি");
    } finally {
      setLoadingMasjids(false);
    }
  }

  function confirmDeleteMasjid(item: MasjidItem) {
    appAlert("মসজিদ মুছুন", `"${item.name}" মুছে ফেলবেন?`, [
      { text: "না", style: "cancel" },
      {
        text: "হ্যাঁ, মুছুন",
        style: "destructive",
        onPress: () => deleteMasjid(item),
      },
    ]);
  }

  async function deleteMasjid(item: MasjidItem) {
    try {
      await api.delete(`/admin/masjids/${item.id}`);
      await load();
      appAlert("সফল", "মসজিদ মুছে ফেলা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "মসজিদ মুছে ফেলা যায়নি");
    }
  }

  async function handleAddSchool() {
    if (!schoolName.trim()) {
      appAlert("ত্রুটি", "স্কুলের নাম দিন");
      return;
    }
    try {
      setLoadingSchools(true);
      await api.post("/admin/schools", { name: schoolName.trim() });
      setSchoolName("");
      await load();
      appAlert("সফল", "স্কুল যোগ করা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "স্কুল যোগ করা যায়নি");
    } finally {
      setLoadingSchools(false);
    }
  }

  function confirmDeleteSchool(item: SchoolItem) {
    appAlert("স্কুল মুছুন", `"${item.name}" মুছে ফেলবেন?`, [
      { text: "না", style: "cancel" },
      {
        text: "হ্যাঁ, মুছুন",
        style: "destructive",
        onPress: () => deleteSchool(item),
      },
    ]);
  }

  async function deleteSchool(item: SchoolItem) {
    try {
      await api.delete(`/admin/schools/${item.id}`);
      await load();
      appAlert("সফল", "স্কুল মুছে ফেলা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "স্কুল মুছে ফেলা যায়নি");
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <ScreenHeader title="এডমিন প্যানেল" />

            <View
              style={styles.section}
              onLayout={(e) => {
                grantSectionY.current = e.nativeEvent.layout.y;
                markSection("grant", e.nativeEvent.layout.y);
              }}
            >
              <AppText style={styles.sectionTitle}>এডমিন অ্যাক্সেস</AppText>
              <AppText style={styles.sectionHint}>
                সাথী/ছাত্র খুঁজে বা সরাসরি মোবাইল নম্বর দিয়ে এডমিন করুন। নতুন
                এডমিনকে SMS-এ পিন পাঠানো হবে।
              </AppText>

              <AdminGrantUserSearch
                adminMobiles={adminMobiles}
                onGranted={load}
                granting={loadingAdmins}
                onGrantingChange={setLoadingAdmins}
              />

              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <AppText style={styles.orText}>অথবা</AppText>
                <View style={styles.orLine} />
              </View>

              <InputField
                label="মোবাইল নম্বর"
                value={adminMobile}
                onChangeText={setAdminMobile}
                placeholder="০১XXXXXXXXX"
                keyboardType="phone-pad"
              />
              <PrimaryButton
                title="এডমিন করুন"
                onPress={handleGrantAdmin}
                loading={loadingAdmins}
              />

              <View
                onLayout={(e) =>
                  markSection("admins", grantSectionY.current + e.nativeEvent.layout.y)
                }
              >
              <AppText style={styles.listTitle}>বর্তমান এডমিনগণ</AppText>
              {admins.length === 0 ? (
                <AppText style={styles.empty}>কোনো এডমিন নেই</AppText>
              ) : (
                admins.map((item) => (
                  <View key={item.id} style={styles.listCard}>
                    <View style={styles.listInfo}>
                      <AppText style={styles.listName}>{item.name}</AppText>
                      <AppText style={styles.listMeta}>
                        {displayMobile(item.mobile)}
                      </AppText>
                      {item.isSuperAdmin ? (
                        <AppText style={styles.superBadge}>
                          প্রধান এডমিন
                        </AppText>
                      ) : null}
                    </View>
                    {isSuperAdmin && !item.isSuperAdmin ? (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => confirmRevokeAdmin(item)}
                      >
                        <AppText style={styles.removeText}>বাতিল</AppText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
              </View>
            </View>

            <View
              style={styles.section}
              onLayout={(e) => markSection("masjid", e.nativeEvent.layout.y)}
            >
              <AppText style={styles.sectionTitle}>মসজিদ ব্যবস্থাপনা</AppText>
              <AppText style={styles.sectionHint}>
                নতুন মসজিদ যোগ করুন বা অপ্রয়োজনীয় মসজিদ মুছুন
              </AppText>
              <InputField
                label="নতুন মসজিদের নাম"
                value={masjidName}
                onChangeText={setMasjidName}
                placeholder="যেমন: নতুন বাজার মসজিদ"
              />
              <PrimaryButton
                title="মসজিদ যোগ করুন"
                onPress={handleAddMasjid}
                loading={loadingMasjids}
              />

              <AppText style={styles.listTitle}>সব মসজিদ</AppText>
              {masjids.length === 0 ? (
                <AppText style={styles.empty}>কোনো মসজিদ নেই</AppText>
              ) : (
                masjids.map((item) => (
                  <View key={item.id} style={styles.listCard}>
                    <View style={styles.listInfo}>
                      <AppText style={styles.listName}>{item.name}</AppText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => confirmDeleteMasjid(item)}
                    >
                      <AppText style={styles.removeText}>মুছুন</AppText>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View
              style={styles.section}
              onLayout={(e) => markSection("school", e.nativeEvent.layout.y)}
            >
              <AppText style={styles.sectionTitle}>স্কুল ব্যবস্থাপনা</AppText>
              <AppText style={styles.sectionHint}>
                নতুন স্কুল যোগ করুন বা অপ্রয়োজনীয় স্কুল মুছুন
              </AppText>
              <InputField
                label="নতুন স্কুলের নাম"
                value={schoolName}
                onChangeText={setSchoolName}
                placeholder="যেমন: নতুন বাজার উচ্চ বিদ্যালয়"
              />
              <PrimaryButton
                title="স্কুল যোগ করুন"
                onPress={handleAddSchool}
                loading={loadingSchools}
              />

              <AppText style={styles.listTitle}>সব স্কুল</AppText>
              {schools.length === 0 ? (
                <AppText style={styles.empty}>কোনো স্কুল নেই</AppText>
              ) : (
                schools.map((item) => (
                  <View key={item.id} style={styles.listCard}>
                    <View style={styles.listInfo}>
                      <AppText style={styles.listName}>{item.name}</AppText>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => confirmDeleteSchool(item)}
                    >
                      <AppText style={styles.removeText}>মুছুন</AppText>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  sectionTitle: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 13,
    color: colors.textLight,
  },
  listTitle: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  listInfo: { flex: 1 },
  listName: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 15,
    color: colors.text,
  },
  listMeta: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  superBadge: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  removeBtn: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#E74C3C",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  removeText: {
    fontFamily: "HindSiliguri_600SemiBold",
    color: "#E74C3C",
    fontSize: 13,
  },
  empty: {
    fontFamily: "HindSiliguri_400Regular",
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
