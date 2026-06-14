import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { SelectField } from "./SelectField";
import api from "../lib/api";
import { STUDENT_CLASS_OPTIONS } from "../constants/options";
import type { DirectorySearchFilters } from "../hooks/useDirectorySearch";
import { colors, radius, shadows, spacing } from "../theme";

type Props = {
  filters: DirectorySearchFilters;
  hasFilters: boolean;
  onFilterChange: <K extends keyof DirectorySearchFilters>(
    key: K,
    value: DirectorySearchFilters[K],
  ) => void;
  onClearFilters: () => void;
  showFilterToggle?: boolean;
  placeholder?: string;
};

export function DirectorySearchControls({
  filters,
  hasFilters,
  onFilterChange,
  onClearFilters,
  showFilterToggle = true,
  placeholder = "নাম, মসজিদ, স্কুল, মোবাইল, ঠিকানা...",
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);

  useEffect(() => {
    api.get("/masjids").then((res) => setMasjids(res.data.data ?? []));
    api.get("/schools").then((res) => setSchools(res.data.data ?? []));
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={filters.q}
            onChangeText={(value) => onFilterChange("q", value)}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            returnKeyType="search"
            numberOfLines={1}
            multiline={false}
            scrollEnabled={false}
          />
          {filters.q ? (
            <TouchableOpacity
              onPress={() => onFilterChange("q", "")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {showFilterToggle ? (
          <TouchableOpacity
            onPress={() => setShowFilters((value) => !value)}
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
        ) : null}
      </View>

      {showFilters ? (
        <View style={styles.advancedFilters}>
          <View style={styles.filterPanelHeader}>
            <AppText style={styles.filterPanelTitle}>ফিল্টার</AppText>
            {hasFilters ? (
              <TouchableOpacity onPress={onClearFilters}>
                <AppText style={styles.clearText}>সব মুছুন</AppText>
              </TouchableOpacity>
            ) : null}
          </View>
          <SelectField
            label="ধরন"
            value={filters.type || null}
            onValueChange={(value) =>
              onFilterChange("type", (value || "") as "" | "sathi" | "student")
            }
            options={[
              { label: "জিম্মাদার সাথী", value: "sathi" },
              { label: "ছাত্র", value: "student" },
            ]}
            placeholder="সব"
          />
          <SelectField
            label="ক্লাস"
            value={filters.classValue}
            onValueChange={(value) => onFilterChange("classValue", value)}
            options={STUDENT_CLASS_OPTIONS}
          />
          <SelectField
            label="স্কুলের নাম"
            value={filters.schoolName || null}
            onValueChange={(value) => onFilterChange("schoolName", value || "")}
            options={schools.map((school) => ({ label: school, value: school }))}
          />
          <SelectField
            label="মসজিদ"
            value={filters.masjid}
            onValueChange={(value) => onFilterChange("masjid", value)}
            options={masjids.map((masjid) => ({ label: masjid, value: masjid }))}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 23,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    shadowOpacity: 0.07,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 14,
    lineHeight: 18,
    height: 22,
    color: colors.text,
    padding: 0,
    margin: 0,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: "center" as const,
      },
      default: {},
    }),
  },
  filterIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  advancedFilters: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
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
  clearText: {
    fontFamily: "HindSiliguri_500Medium",
    color: colors.secondary,
    fontSize: 13,
  },
});
