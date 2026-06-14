import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton } from "../components/BackButton";
import { GradientBackground } from "../components/GradientBackground";
import { SelectField } from "../components/SelectField";
import { ContactQuickActions } from "../components/ContactQuickActions";
import { AdminSmsModal } from "../components/AdminSmsModal";
import { SelectCircleButton } from "../components/SelectCircleButton";
import { BatchSmsActionBar } from "../components/BatchSmsActionBar";
import { AppText } from "../components/AppText";
import { useAuth } from "../context/AuthContext";
import { useBatchSmsSelectionOptional } from "../context/BatchSmsContext";
import { useDirectorySearch, type DirectorySearchFilters } from "../hooks/useDirectorySearch";
import api from "../lib/api";
import { appAlert } from "../lib/appAlert";
import { displayMobile } from "../lib/mobile";
import { STUDENT_CLASS_OPTIONS } from "../constants/options";
import { colors, radius, shadows, spacing } from "../theme";

type DirectoryEntry = {
  _id: string;
  source: "account" | "person";
  type: "sathi" | "student";
  name: string;
  masjid: string;
  schoolName?: string;
  mobile?: string;
  canDelete?: boolean;
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    action?: string;
    openFilters?: string;
  }>();
  const { account } = useAuth();
  const isAdmin = !!account?.isAdmin;
  const batchSelection = useBatchSmsSelectionOptional();

  const initialFilters = React.useMemo<Partial<DirectorySearchFilters>>(() => {
    if (params.type === "sathi" || params.type === "student") {
      return { type: params.type };
    }
    return {};
  }, [params.type]);

  const {
    filters,
    results,
    total,
    hasMore,
    loading,
    loadingMore,
    searched,
    hasFilters,
    updateFilter,
    clearFilters,
    loadMore,
    removeResult,
  } = useDirectorySearch({ initialFilters });
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(params.openFilters === "1");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [smsTarget, setSmsTarget] = useState<DirectoryEntry | null>(null);

  const actionHint = React.useMemo(() => {
    switch (params.action) {
      case "sms":
        return isAdmin
          ? "সাথী খুঁজুন → নির্বাচন করে ব্যাচ SMS পাঠান"
          : null;
      case "call":
        return "ব্যক্তি খুঁজুন → নিচের কল বাটনে ট্যাপ করুন";
      case "whatsapp":
        return "ব্যক্তি খুঁজুন → নিচের হোয়াটসঅ্যাপ বাটনে ট্যাপ করুন";
      default:
        return null;
    }
  }, [params.action, isAdmin]);

  useEffect(() => {
    if (params.openFilters === "1") {
      setShowFilters(true);
    }
  }, [params.openFilters]);

  useEffect(() => {
    api.get("/masjids").then((res) => setMasjids(res.data.data));
    api.get("/schools").then((res) => setSchools(res.data.data));
  }, []);

  function update(key: string, value: unknown) {
    updateFilter(key as keyof typeof filters, value as never);
  }

  function handleEndReached() {
    loadMore();
  }

  function confirmDelete(item: DirectoryEntry) {
    appAlert(
      "রেকর্ড মুছুন",
      `"${item.name}" এর তথ্য মুছে ফেলা হবে। আপনি কি নিশ্চিত?`,
      [
        { text: "বাতিল", style: "cancel" },
        {
          text: "মুছুন",
          style: "destructive",
          onPress: () => deletePerson(item._id),
        },
      ],
    );
  }

  async function deletePerson(id: string) {
    try {
      setDeletingId(id);
      await api.delete(`/persons/${id}`);
      removeResult(id);
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "মুছে ফেলা সম্ভব হয়নি");
    } finally {
      setDeletingId(null);
    }
  }

  const selectionCount = batchSelection?.count ?? 0;
  const selectionMode = isAdmin && selectionCount > 0;

  function toggleSelect(item: DirectoryEntry) {
    if (!isAdmin || !item.mobile || !batchSelection) return;
    batchSelection.toggle(item);
  }

  function handleCardPress(item: DirectoryEntry) {
    if (selectionMode) {
      if (item.mobile) toggleSelect(item);
      return;
    }
    router.push(`/person/${item._id}`);
  }

  function goToBatchSms() {
    router.push("/batch-sms");
  }

  const listHeader = (
    <View style={styles.searchSection}>
      {/* Top bar: back + title + filter toggle */}
      <View style={styles.topBar}>
        <BackButton />
        <TouchableOpacity
          onPress={() => setShowFilters((s) => !s)}
          style={[
            styles.filterIconBtn,
            showFilters && styles.filterIconBtnActive,
          ]}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? "#FFFFFF" : colors.primary}
          />
          {hasFilters && !showFilters ? (
            <View style={styles.filterDot} />
          ) : null}
        </TouchableOpacity>
        <View style={styles.pageTitleWrap} pointerEvents="none">
          <AppText style={styles.pageTitle}>সাথী / ছাত্র খুঁজুন</AppText>
        </View>
      </View>

      {/* Pill search bar */}
      <View style={styles.searchBar}>
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.textLight}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={filters.q}
          onChangeText={(v) => update("q", v)}
          placeholder="নাম, মসজিদ, স্কুল, মোবাইল, ঠিকানা..."
          placeholderTextColor={colors.textLight}
          returnKeyType="search"
        />
        {filters.q ? (
          <TouchableOpacity
            onPress={() => update("q", "")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {actionHint ? (
        <View style={styles.actionHint}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <AppText style={styles.actionHintText}>{actionHint}</AppText>
        </View>
      ) : null}

      {/* Advanced filters panel */}
      {showFilters && (
        <View style={styles.advancedFilters}>
          <View style={styles.filterPanelHeader}>
            <AppText style={styles.filterPanelTitle}>ফিল্টার</AppText>
            {hasFilters ? (
              <TouchableOpacity onPress={clearFilters}>
                <AppText style={styles.clearText}>সব মুছুন</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
          <SelectField
            label="ধরন"
            value={filters.type || null}
            onValueChange={(v) => update("type", v || "")}
            options={[
              { label: "জিম্মাদার সাথী", value: "sathi" },
              { label: "ছাত্র", value: "student" },
            ]}
            placeholder="সব"
          />
          <SelectField
            label="ক্লাস"
            value={filters.classValue}
            onValueChange={(v) => update("classValue", v)}
            options={STUDENT_CLASS_OPTIONS}
          />
          <SelectField
            label="স্কুলের নাম"
            value={filters.schoolName || null}
            onValueChange={(v) => update("schoolName", v || "")}
            options={schools.map((s) => ({ label: s, value: s }))}
          />
          <SelectField
            label="মসজিদ"
            value={filters.masjid}
            onValueChange={(v) => update("masjid", v)}
            options={masjids.map((m) => ({ label: m, value: m }))}
          />
        </View>
      )}

      {/* Result count / loading */}
      <View style={styles.statusRow}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : searched ? (
          <View style={styles.countPill}>
            <Ionicons name="people-outline" size={13} color={colors.primary} />
            <AppText style={styles.resultCount}>{total} জন পাওয়া গেছে</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          {/* ── Single scrollable FlatList with header ── */}
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              selectionCount > 0 && styles.listContentWithBar,
            ]}
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item) => item._id}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              !loading && searched ? (
                <AppText style={styles.empty}>কোনো ফলাফল পাওয়া যায়নি</AppText>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={colors.primary}
                  style={styles.footerSpinner}
                />
              ) : hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMore}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.loadMoreText}>
                    আরও দেখুন ({total - results.length} জন বাকি)
                  </AppText>
                </TouchableOpacity>
              ) : searched && results.length > 0 ? (
                <AppText style={styles.endOfList}>
                  — সব ফলাফল দেখা হয়েছে —
                </AppText>
              ) : null
            }
            renderItem={({ item }) => {
              const isSathi = item.type === "sathi";
              const selected = batchSelection?.isSelected(item._id) ?? false;
              const canSelect = isAdmin && !!item.mobile;
              const inSelectionMode = selectionMode && canSelect;
              return (
                <View
                  style={[styles.cardWrap, selected && styles.cardWrapSelected]}
                >
                  <View
                    style={[
                      styles.resultCard,
                      isSathi ? styles.sathiCard : styles.studentCard,
                      selected && styles.resultCardSelected,
                      selected &&
                        (isSathi
                          ? styles.resultCardSelectedSathi
                          : styles.resultCardSelectedStudent),
                    ]}
                  >
                    <View
                      style={[
                        styles.accentBar,
                        isSathi ? styles.accentSathi : styles.accentStudent,
                        selected && styles.accentSelected,
                      ]}
                    />

                    <View style={styles.cardBody}>
                      <TouchableOpacity
                        onPress={() => handleCardPress(item)}
                        activeOpacity={0.82}
                        style={styles.cardInner}
                      >
                        <View style={styles.cardRow}>
                          <View style={styles.nameBlock}>
                            <AppText
                              style={[
                                styles.resultName,
                                isSathi ? styles.sathiName : styles.studentName,
                              ]}
                            >
                              {item.name}
                            </AppText>
                            {item.mobile ? (
                              <View style={styles.mobileUnderName}>
                                <Ionicons
                                  name="call-outline"
                                  size={13}
                                  color={isSathi ? "#2E86AB" : "#A23B72"}
                                />
                                <AppText
                                  style={[
                                    styles.mobileUnderNameText,
                                    isSathi
                                      ? styles.mobileSathi
                                      : styles.mobileStudent,
                                  ]}
                                >
                                  {displayMobile(item.mobile)}
                                </AppText>
                              </View>
                            ) : null}
                          </View>

                          {item.canDelete || canSelect ? (
                            <View
                              style={[
                                styles.actionTray,
                                selected && styles.actionTraySelected,
                                isSathi
                                  ? styles.actionTraySathi
                                  : styles.actionTrayStudent,
                              ]}
                            >
                              {item.canDelete ? (
                                <TouchableOpacity
                                  style={styles.trayDeleteBtn}
                                  onPress={() => confirmDelete(item)}
                                  disabled={deletingId === item._id}
                                  hitSlop={{
                                    top: 6,
                                    bottom: 6,
                                    left: 6,
                                    right: 4,
                                  }}
                                >
                                  {deletingId === item._id ? (
                                    <ActivityIndicator
                                      size="small"
                                      color="#E74C3C"
                                    />
                                  ) : (
                                    <Ionicons
                                      name="trash-outline"
                                      size={17}
                                      color="#E74C3C"
                                    />
                                  )}
                                </TouchableOpacity>
                              ) : null}

                              {item.canDelete && canSelect ? (
                                <View
                                  style={[
                                    styles.trayDivider,
                                    isSathi
                                      ? styles.trayDividerSathi
                                      : styles.trayDividerStudent,
                                  ]}
                                />
                              ) : null}

                              {canSelect ? (
                                <View style={styles.traySelectWrap}>
                                  <SelectCircleButton
                                    selected={selected}
                                    onPress={() => toggleSelect(item)}
                                  />
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.metaRow}>
                          <LinearGradient
                            colors={
                              isSathi
                                ? ["#2E86AB", "#48C9B0"]
                                : ["#A23B72", "#E056A0"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.typeBadge}
                          >
                            <Ionicons
                              name={isSathi ? "person" : "school"}
                              size={11}
                              color="#FFFFFF"
                              style={{ marginRight: 4 }}
                            />
                            <AppText style={styles.typeBadgeText}>
                              {isSathi ? "সাথী" : "ছাত্র"}
                            </AppText>
                          </LinearGradient>

                          <View style={styles.infoChips}>
                            <View
                              style={[
                                styles.chip,
                                isSathi ? styles.chipSathi : styles.chipStudent,
                              ]}
                            >
                              <Ionicons
                                name="location-outline"
                                size={12}
                                color={isSathi ? "#2E86AB" : "#A23B72"}
                              />
                              <AppText
                                style={[
                                  styles.chipText,
                                  isSathi
                                    ? styles.chipTextSathi
                                    : styles.chipTextStudent,
                                ]}
                              >
                                {item.masjid}
                              </AppText>
                            </View>
                            {item.schoolName ? (
                              <View style={[styles.chip, styles.chipStudent]}>
                                <Ionicons
                                  name="school-outline"
                                  size={12}
                                  color="#A23B72"
                                />
                                <AppText
                                  style={[
                                    styles.chipText,
                                    styles.chipTextStudent,
                                  ]}
                                >
                                  {item.schoolName}
                                </AppText>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {inSelectionMode ? (
                          <View
                            style={[
                              styles.selectionModeStrip,
                              selected && styles.selectionModeStripSelected,
                            ]}
                          >
                            <Ionicons
                              name={
                                selected
                                  ? "checkmark-circle"
                                  : "add-circle-outline"
                              }
                              size={16}
                              color={selected ? "#48C9B0" : colors.textLight}
                            />
                            <AppText
                              style={[
                                styles.selectionModeText,
                                selected && styles.selectionModeTextSelected,
                              ]}
                            >
                              {selected
                                ? "নির্বাচিত — আবার ট্যাপ করে বাতিল করুন"
                                : "নির্বাচন করতে ট্যাপ করুন"}
                            </AppText>
                          </View>
                        ) : null}
                      </TouchableOpacity>

                      {!selectionMode && item.mobile ? (
                        <View style={styles.actionStrip}>
                          <ContactQuickActions
                            mobile={item.mobile}
                            isAdmin={isAdmin}
                            onSmsPress={() => setSmsTarget(item)}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </KeyboardAvoidingView>

        {smsTarget?.mobile ? (
          <AdminSmsModal
            visible={!!smsTarget}
            onClose={() => setSmsTarget(null)}
            personId={smsTarget._id}
            personName={smsTarget.name}
            personMobile={smsTarget.mobile}
          />
        ) : null}

        {isAdmin && batchSelection ? (
          <BatchSmsActionBar
            count={selectionCount}
            onSmsPress={goToBatchSms}
            onClear={batchSelection.clear}
          />
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  searchSection: {
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  listContentWithBar: {
    paddingBottom: 130,
  },

  /* Compact top bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    position: "relative",
    minHeight: 38,
  },
  pageTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 80,
  },
  pageTitle: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(46,134,171,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(46,134,171,0.2)",
  },
  filterIconBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* Pill search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    shadowOpacity: 0.07,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(46, 134, 171, 0.08)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.14)",
  },
  actionHintText: {
    flex: 1,
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },

  /* Filter panel */
  advancedFilters: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.12)",
  },
  filterPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  filterPanelTitle: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 14,
    color: colors.text,
  },
  clearBtn: {},
  clearText: {
    fontFamily: "HindSiliguri_500Medium",
    color: colors.secondary,
    fontSize: 13,
  },

  /* Status row */
  statusRow: {
    height: 24,
    justifyContent: "center",
    marginBottom: 4,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultCount: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 12,
    color: colors.textLight,
  },
  cardWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    ...shadows.card,
    shadowOpacity: 0.07,
  },
  cardWrapSelected: {
    shadowColor: "#48C9B0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  resultCard: {
    borderRadius: radius.md,
    overflow: "hidden",
    flexDirection: "row",
  },
  sathiCard: {
    backgroundColor: "#EBF8FF",
    borderWidth: 1,
    borderColor: "rgba(46,134,171,0.18)",
  },
  studentCard: {
    backgroundColor: "#FDF0F7",
    borderWidth: 1,
    borderColor: "rgba(162,59,114,0.18)",
  },
  accentBar: {
    width: 5,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  accentSathi: { backgroundColor: "#2E86AB" },
  accentStudent: { backgroundColor: "#A23B72" },
  accentSelected: {
    backgroundColor: "#48C9B0",
    width: 6,
  },
  cardBody: {
    flex: 1,
  },
  cardInner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  actionTray: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.14)",
    shadowColor: "#2E86AB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: 2,
  },
  actionTraySathi: {
    borderColor: "rgba(46, 134, 171, 0.2)",
  },
  actionTrayStudent: {
    borderColor: "rgba(162, 59, 114, 0.2)",
  },
  actionTraySelected: {
    borderColor: "#48C9B0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#48C9B0",
    shadowOpacity: 0.25,
    elevation: 4,
  },
  trayDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(231, 76, 60, 0.08)",
  },
  trayDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },
  trayDividerSathi: {
    backgroundColor: "rgba(46, 134, 171, 0.18)",
  },
  trayDividerStudent: {
    backgroundColor: "rgba(162, 59, 114, 0.18)",
  },
  traySelectWrap: {
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCardSelected: {
    borderWidth: 2,
    borderColor: "#48C9B0",
  },
  resultCardSelectedSathi: {
    backgroundColor: "#DFF7F2",
  },
  resultCardSelectedStudent: {
    backgroundColor: "#E8FAF6",
  },
  selectionModeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(46, 134, 171, 0.12)",
  },
  selectionModeStripSelected: {
    borderTopColor: "rgba(72, 201, 176, 0.22)",
  },
  selectionModeText: {
    flex: 1,
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 12,
    color: colors.textLight,
  },
  selectionModeTextSelected: {
    color: "#1A8A74",
  },
  actionStrip: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: 8,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 18,
  },
  mobileUnderName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  mobileUnderNameText: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 13,
  },
  mobileSathi: { color: "#2E86AB" },
  mobileStudent: { color: "#A23B72" },
  sathiName: { color: "#1A3D52" },
  studentName: { color: "#4A1030" },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  infoChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chipSathi: { backgroundColor: "rgba(46,134,171,0.12)" },
  chipStudent: { backgroundColor: "rgba(162,59,114,0.12)" },
  chipText: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 12,
  },
  chipTextSathi: { color: "#1A5276" },
  chipTextStudent: { color: "#6C1949" },
  empty: {
    textAlign: "center",
    marginTop: spacing.lg,
    color: colors.textLight,
    fontFamily: "HindSiliguri_400Regular",
  },
  footerSpinner: { marginVertical: 20 },
  loadMoreBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(46, 134, 171, 0.1)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.2)",
  },
  loadMoreText: {
    fontFamily: "HindSiliguri_600SemiBold",
    color: colors.primary,
    fontSize: 14,
  },
  endOfList: {
    textAlign: "center",
    color: colors.textLight,
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 12,
    marginVertical: spacing.md,
  },
});
