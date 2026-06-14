import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText } from "./AppText";
import { DirectorySearchControls } from "./DirectorySearchControls";
import api from "../lib/api";
import { appAlert } from "../lib/appAlert";
import { displayMobile } from "../lib/mobile";
import type { DirectoryEntry } from "../lib/directory";
import { useDirectorySearch } from "../hooks/useDirectorySearch";
import { colors, radius, spacing } from "../theme";

type Props = {
  adminMobiles: Set<string>;
  onGranted: () => Promise<void> | void;
  granting: boolean;
  onGrantingChange: (loading: boolean) => void;
};

export function AdminGrantUserSearch({
  adminMobiles,
  onGranted,
  granting,
  onGrantingChange,
}: Props) {
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
    resetFilters,
  } = useDirectorySearch({ requireQuery: true });

  function confirmGrant(item: DirectoryEntry) {
    if (!item.mobile) {
      appAlert(
        "মোবাইল নেই",
        "এই ব্যক্তির মোবাইল নম্বর নেই। নিচে মোবাইল নম্বর দিয়ে এডমিন করুন।",
      );
      return;
    }

    appAlert(
      "এডমিন করুন",
      `${item.name} (${displayMobile(item.mobile)}) কে এডমিন করবেন? তাকে SMS-এ পিন পাঠানো হবে।`,
      [
        { text: "না", style: "cancel" },
        {
          text: "হ্যাঁ, এডমিন করুন",
          onPress: () => {
            const personId =
              item.source === "account" ? item.personId : item._id;
            grantAdmin({
              ...(personId ? { personId } : {}),
              mobile: item.mobile,
            });
          },
        },
      ],
    );
  }

  async function grantAdmin(payload: { personId?: string; mobile?: string }) {
    try {
      onGrantingChange(true);
      await api.post("/admin/admins", payload);
      resetFilters();
      await onGranted();
      appAlert("সফল", "এডমিন অ্যাক্সেস দেওয়া হয়েছে এবং SMS পাঠানো হয়েছে");
    } catch (err: any) {
      appAlert("ত্রুটি", err.message || "এডমিন অ্যাক্সেস দেওয়া যায়নি");
    } finally {
      onGrantingChange(false);
    }
  }

  const showResults = searched && hasFilters;

  return (
    <View style={styles.wrap}>
      <AppText style={styles.subLabel}>ব্যবহারকারী খুঁজুন</AppText>

      <DirectorySearchControls
        filters={filters}
        hasFilters={hasFilters}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        showFilterToggle={false}
        placeholder="নাম, মসজিদ, স্কুল, মোবাইল..."
      />

      {loading || showResults ? (
        <View style={styles.statusRow}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <AppText style={styles.resultCount}>{total} জন পাওয়া গেছে</AppText>
          )}
        </View>
      ) : null}

      {showResults && !loading && results.length === 0 ? (
        <AppText style={styles.empty}>কোনো ফলাফল পাওয়া যায়নি</AppText>
      ) : null}

      {results.map((item) => {
        const isSathi = item.type === "sathi";
        const alreadyAdmin = !!item.mobile && adminMobiles.has(item.mobile);
        const noMobile = !item.mobile;
        return (
          <View
            key={item._id}
            style={[
              styles.resultCard,
              isSathi ? styles.sathiCard : styles.studentCard,
            ]}
          >
            <View style={styles.resultInfo}>
              <AppText style={styles.resultName}>{item.name}</AppText>
              <AppText style={styles.resultMeta} numberOfLines={2}>
                {isSathi ? "সাথী" : "ছাত্র"} • {item.masjid}
                {item.mobile ? ` • ${displayMobile(item.mobile)}` : ""}
              </AppText>
              {alreadyAdmin ? (
                <AppText style={styles.alreadyAdmin}>ইতিমধ্যে এডমিন</AppText>
              ) : null}
              {noMobile ? (
                <AppText style={styles.noMobile}>মোবাইল নম্বর নেই</AppText>
              ) : null}
            </View>
            {!noMobile ? (
              <TouchableOpacity
                style={[styles.grantBtn, granting && styles.grantBtnDisabled]}
                onPress={() => confirmGrant(item)}
                disabled={granting}
                activeOpacity={0.75}
              >
                {granting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <AppText style={styles.grantBtnText}>এডমিন</AppText>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}

      {showResults && hasMore ? (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={loadMore}
          disabled={loadingMore}
          activeOpacity={0.75}
        >
          {loadingMore ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <AppText style={styles.loadMoreText}>
              আরও দেখুন ({total - results.length} জন বাকি)
            </AppText>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  subLabel: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  resultCount: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 12,
    color: colors.textLight,
  },
  empty: {
    textAlign: "center",
    color: colors.textLight,
    fontFamily: "HindSiliguri_400Regular",
    marginBottom: spacing.sm,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  sathiCard: {
    backgroundColor: "#EBF8FF",
    borderColor: "rgba(46,134,171,0.18)",
  },
  studentCard: {
    backgroundColor: "#FDF0F7",
    borderColor: "rgba(162,59,114,0.18)",
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 15,
    color: colors.text,
  },
  resultMeta: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  alreadyAdmin: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  noMobile: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 12,
    color: "#856404",
    marginTop: 2,
  },
  grantBtn: {
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  grantBtnDisabled: {
    opacity: 0.7,
  },
  grantBtnText: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  loadMoreBtn: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "rgba(46, 134, 171, 0.1)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.2)",
  },
  loadMoreText: {
    fontFamily: "HindSiliguri_600SemiBold",
    color: colors.primary,
    fontSize: 13,
  },
});
