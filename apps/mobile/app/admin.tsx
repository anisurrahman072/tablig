import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { GradientBackground } from "../components/GradientBackground";
import { ScreenHeader } from "../components/ScreenHeader";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { AdminGrantUserSearch } from "../components/AdminGrantUserSearch";
import { AppText } from "../components/AppText";
import {
  KeyboardFormScroll,
  useScrollOnInputFocus,
} from "../components/KeyboardFormScroll";
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

type AdminTab = "access" | "masjid" | "school";

const ADMIN_TABS: {
  id: AdminTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeGradient: [string, string];
  activeBorder: string;
  activeText: string;
  activeIcon: string;
  inactiveBg: string;
}[] = [
  {
    id: "access",
    label: "এডমিন অ্যাক্সেস",
    icon: "shield-checkmark-outline",
    activeGradient: ["#E8F4FA", "#D4EBF7"],
    activeBorder: "#2E86AB",
    activeText: "#1A5276",
    activeIcon: "#2E86AB",
    inactiveBg: "#F7FBFF",
  },
  {
    id: "masjid",
    label: "মসজিদ ব্যবস্থাপনা",
    icon: "business-outline",
    activeGradient: ["#E8F8F5", "#D5F0E8"],
    activeBorder: "#40916C",
    activeText: "#1B4332",
    activeIcon: "#2D6A4F",
    inactiveBg: "#F4FBF8",
  },
  {
    id: "school",
    label: "স্কুল ব্যবস্থাপনা",
    icon: "school-outline",
    activeGradient: ["#F3E8FF", "#E8DAFF"],
    activeBorder: "#A23B72",
    activeText: "#6B2D5C",
    activeIcon: "#A23B72",
    inactiveBg: "#FFF8FC",
  },
];

function sectionToTab(section?: string): AdminTab {
  if (section === "masjid") return "masjid";
  if (section === "school") return "school";
  return "access";
}

function InlineEditInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const wrapRef = useRef<View>(null);
  const scrollIntoView = useScrollOnInputFocus();

  return (
    <View ref={wrapRef}>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        autoFocus
        onFocus={() => scrollIntoView?.(wrapRef)}
      />
    </View>
  );
}

export default function AdminScreen() {
  const { account } = useAuth();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const isSuperAdmin = !!account?.isSuperAdmin;
  const [activeTab, setActiveTab] = useState<AdminTab>(() => sectionToTab(section));
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
  const [editingMasjidId, setEditingMasjidId] = useState<string | null>(null);
  const [editMasjidName, setEditMasjidName] = useState("");
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editSchoolName, setEditSchoolName] = useState("");
  const tabBarRef = useRef<ScrollView>(null);
  const tabBarWidth = useRef(0);
  const tabLayouts = useRef<Partial<Record<AdminTab, { x: number; width: number }>>>(
    {},
  );

  const scrollTabToCenter = useCallback((tab: AdminTab) => {
    const layout = tabLayouts.current[tab];
    const viewport = tabBarWidth.current;
    if (!layout || !viewport) return;

    const targetX = layout.x + layout.width / 2 - viewport / 2;
    tabBarRef.current?.scrollTo({
      x: Math.max(0, targetX),
      animated: true,
    });
  }, []);

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
    setActiveTab(sectionToTab(section));
  }, [section]);

  useEffect(() => {
    const timer = setTimeout(() => scrollTabToCenter(activeTab), 60);
    return () => clearTimeout(timer);
  }, [activeTab, scrollTabToCenter]);

  function switchTab(tab: AdminTab) {
    setActiveTab(tab);
    cancelEditMasjid();
    cancelEditSchool();
  }

  function handleTabLayout(tab: AdminTab, x: number, width: number) {
    tabLayouts.current[tab] = { x, width };
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

  function startEditMasjid(item: MasjidItem) {
    setEditingMasjidId(item.id);
    setEditMasjidName(item.name);
  }

  function cancelEditMasjid() {
    setEditingMasjidId(null);
    setEditMasjidName("");
  }

  async function saveEditMasjid(item: MasjidItem) {
    const name = editMasjidName.trim();
    if (!name) {
      appAlert("ত্রুটি", "মসজিদের নাম দিন");
      return;
    }
    if (name === item.name) {
      cancelEditMasjid();
      return;
    }

    try {
      setLoadingMasjids(true);
      await api.patch(`/admin/masjids/${item.id}`, { name });
      cancelEditMasjid();
      await load();
      appAlert("সফল", "মসজিদের নাম আপডেট করা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "মসজিদের নাম আপডেট করা যায়নি");
    } finally {
      setLoadingMasjids(false);
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

  function startEditSchool(item: SchoolItem) {
    setEditingSchoolId(item.id);
    setEditSchoolName(item.name);
  }

  function cancelEditSchool() {
    setEditingSchoolId(null);
    setEditSchoolName("");
  }

  async function saveEditSchool(item: SchoolItem) {
    const name = editSchoolName.trim();
    if (!name) {
      appAlert("ত্রুটি", "স্কুলের নাম দিন");
      return;
    }
    if (name === item.name) {
      cancelEditSchool();
      return;
    }

    try {
      setLoadingSchools(true);
      await api.patch(`/admin/schools/${item.id}`, { name });
      cancelEditSchool();
      await load();
      appAlert("সফল", "স্কুলের নাম আপডেট করা হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "স্কুলের নাম আপডেট করা যায়নি");
    } finally {
      setLoadingSchools(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardFormScroll
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
            <ScreenHeader title="এডমিন প্যানেল" />

            <ScrollView
              ref={tabBarRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarContent}
              style={styles.tabBarScroll}
              onLayout={(e) => {
                tabBarWidth.current = e.nativeEvent.layout.width;
                scrollTabToCenter(activeTab);
              }}
            >
              {ADMIN_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.88}
                    onPress={() => switchTab(tab.id)}
                    onLayout={(e) => {
                      const { x, width } = e.nativeEvent.layout;
                      handleTabLayout(tab.id, x, width);
                    }}
                    style={[
                      styles.tabPillOuter,
                      isActive && { borderColor: tab.activeBorder },
                    ]}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={tab.activeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.tabPill,
                          styles.tabPillActive,
                          { borderColor: tab.activeBorder },
                        ]}
                      >
                        <View
                          style={[
                            styles.tabIconWrap,
                            { backgroundColor: "rgba(255,255,255,0.72)" },
                          ]}
                        >
                          <Ionicons
                            name={tab.icon}
                            size={16}
                            color={tab.activeIcon}
                          />
                        </View>
                        <AppText
                          style={[styles.tabLabel, { color: tab.activeText }]}
                        >
                          {tab.label}
                        </AppText>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.tabPill,
                          { backgroundColor: tab.inactiveBg },
                        ]}
                      >
                        <View style={styles.tabIconWrap}>
                          <Ionicons
                            name={tab.icon}
                            size={16}
                            color={colors.textLight}
                          />
                        </View>
                        <AppText style={styles.tabLabel}>{tab.label}</AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeTab === "access" ? (
            <View style={styles.section}>
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
            ) : null}

            {activeTab === "masjid" ? (
            <View style={styles.section}>
              <AppText style={styles.sectionHint}>
                নতুন মসজিদ যোগ করুন, নাম সম্পাদনা করুন বা অপ্রয়োজনীয় মসজিদ
                মুছুন
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
                  <View
                    key={item.id}
                    style={[
                      styles.listCard,
                      editingMasjidId === item.id && styles.listCardEditing,
                    ]}
                  >
                    {editingMasjidId === item.id ? (
                      <>
                        <InlineEditInput
                          value={editMasjidName}
                          onChangeText={setEditMasjidName}
                          placeholder="মসজিদের নাম"
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={() => saveEditMasjid(item)}
                            disabled={loadingMasjids}
                          >
                            <AppText style={styles.saveText}>সংরক্ষণ করুন</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={cancelEditMasjid}
                            disabled={loadingMasjids}
                          >
                            <AppText style={styles.cancelText}>বাতিল করুন</AppText>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.listInfo}>
                          <AppText style={styles.listName}>{item.name}</AppText>
                        </View>
                        <View style={styles.listActions}>
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => startEditMasjid(item)}
                            accessibilityLabel="সম্পাদনা"
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => confirmDeleteMasjid(item)}
                            accessibilityLabel="মুছুন"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color="#E74C3C"
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
            ) : null}

            {activeTab === "school" ? (
            <View style={styles.section}>
              <AppText style={styles.sectionHint}>
                নতুন স্কুল যোগ করুন, নাম সম্পাদনা করুন বা অপ্রয়োজনীয় স্কুল মুছুন
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
                  <View
                    key={item.id}
                    style={[
                      styles.listCard,
                      editingSchoolId === item.id && styles.listCardEditing,
                    ]}
                  >
                    {editingSchoolId === item.id ? (
                      <>
                        <InlineEditInput
                          value={editSchoolName}
                          onChangeText={setEditSchoolName}
                          placeholder="স্কুলের নাম"
                        />
                        <View style={styles.editActions}>
                          <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={() => saveEditSchool(item)}
                            disabled={loadingSchools}
                          >
                            <AppText style={styles.saveText}>সংরক্ষণ করুন</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={cancelEditSchool}
                            disabled={loadingSchools}
                          >
                            <AppText style={styles.cancelText}>বাতিল করুন</AppText>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.listInfo}>
                          <AppText style={styles.listName}>{item.name}</AppText>
                        </View>
                        <View style={styles.listActions}>
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => startEditSchool(item)}
                            accessibilityLabel="সম্পাদনা"
                          >
                            <Ionicons
                              name="create-outline"
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeBtn}
                            onPress={() => confirmDeleteSchool(item)}
                            accessibilityLabel="মুছুন"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={17}
                              color="#E74C3C"
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ))
              )}
            </View>
            ) : null}
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },
  tabBarScroll: {
    marginBottom: spacing.md,
    flexGrow: 0,
  },
  tabBarContent: {
    gap: spacing.sm,
    paddingBottom: 2,
  },
  tabPillOuter: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  tabPillActive: {
    borderWidth: 1,
    ...shadows.card,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    flexShrink: 0,
  },
  tabLabel: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 18,
  },
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
  listCardEditing: {
    flexDirection: "column",
    alignItems: "stretch",
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
  listActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  editInput: {
    width: "100%",
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
  editBtn: {
    backgroundColor: "#E8F4FA",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontFamily: "HindSiliguri_600SemiBold",
    color: "#FFFFFF",
    fontSize: 13,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "HindSiliguri_600SemiBold",
    color: colors.textLight,
    fontSize: 13,
  },
  removeBtn: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#E74C3C",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
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
