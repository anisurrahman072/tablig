import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { PremiumModal } from './PremiumModal';
import { SelectCircleButton } from './SelectCircleButton';
import api from '../lib/api';
import { displayMobile } from '../lib/mobile';
import type { DirectoryEntry } from '../lib/directory';
import { colors, radius, shadows, spacing } from '../theme';

const PAGE_SIZE = 10;

export type SelectedAttendee = {
  id: string;
  name: string;
  type: 'sathi' | 'student';
};

type Props = {
  label: string;
  selected: SelectedAttendee[];
  textNames: string[];
  onSelectedChange: (items: SelectedAttendee[]) => void;
  onTextNamesChange: (names: string[]) => void;
  excludeIds?: string[];
};

export function PersonSearchMultiSelect({
  label,
  selected,
  textNames,
  onSelectedChange,
  onTextNamesChange,
  excludeIds = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const loadingRef = useRef(false);

  const excludeSet = new Set(excludeIds);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchResults(query), 400);
    return () => clearTimeout(timer);
  }, [open, query]);

  async function fetchResults(q: string) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: PAGE_SIZE };
      if (q.trim()) params.q = q.trim();
      const res = await api.get('/persons', { params });
      setResults(res.data.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  function isSelected(id: string) {
    return selected.some((s) => s.id === id);
  }

  function toggle(item: DirectoryEntry) {
    if (excludeSet.has(item._id)) return;
    if (isSelected(item._id)) {
      onSelectedChange(selected.filter((s) => s.id !== item._id));
    } else {
      onSelectedChange([
        ...selected,
        { id: item._id, name: item.name, type: item.type },
      ]);
    }
  }

  function addTextName() {
    const name = nameInput.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (
      textNames.some((n) => n.toLowerCase() === lower) ||
      selected.some((s) => s.name.toLowerCase() === lower)
    ) {
      return;
    }
    onTextNamesChange([...textNames, name]);
    setNameInput('');
  }

  function removeSelected(id: string) {
    onSelectedChange(selected.filter((s) => s.id !== id));
  }

  function removeTextName(name: string) {
    onTextNamesChange(textNames.filter((n) => n !== name));
  }

  const hasSelections = selected.length > 0 || textNames.length > 0;
  const summaryText = hasSelections
    ? [...selected.map((s) => s.name), ...textNames].join(', ')
    : 'নির্বাচন করুন';
  const filteredResults = results.filter((r) => !excludeSet.has(r._id));

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{label}</AppText>

      {hasSelections ? (
        <View style={styles.chips}>
          {selected.map((item) => (
            <View key={item.id} style={styles.chip}>
              <AppText style={styles.chipText}>{item.name}</AppText>
              <TouchableOpacity onPress={() => removeSelected(item.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
          {textNames.map((name) => (
            <View key={name} style={[styles.chip, styles.chipTextOnly]}>
              <AppText style={styles.chipText}>{name}</AppText>
              <TouchableOpacity onPress={() => removeTextName(name)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#856404" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.75}>
        <AppText
          style={[styles.triggerText, !hasSelections && styles.placeholderText]}
          numberOfLines={2}
        >
          {hasSelections ? 'আরও যোগ করুন' : summaryText}
        </AppText>
        <Ionicons name="people-outline" size={20} color={colors.primary} />
      </TouchableOpacity>

      <PremiumModal
        visible={open}
        title={label}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        confirmLabel="সম্পন্ন"
        keyboardAware
        scrollable={false}
        contentStyle={styles.modalContent}
      >
        {/*
          Layout: flex column
            ① Search bar  — fixed height
            ② List        — flex: 1 (shrinks when PremiumModal lifts above keyboard)
            ③ Footer      — fixed height, pinned at bottom of sheet
        */}
        <View style={styles.modalBody}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="নাম, মসজিদ, স্কুল, মোবাইল..."
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : filteredResults.length === 0 ? (
              <AppText style={styles.empty}>কোনো ফলাফল পাওয়া যায়নি</AppText>
            ) : (
              filteredResults.map((item) => {
                const picked = isSelected(item._id);
                const isSathi = item.type === 'sathi';
                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[styles.resultRow, picked && styles.resultRowSelected]}
                    onPress={() => toggle(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.resultInfo}>
                      <AppText style={styles.resultName}>{item.name}</AppText>
                      <AppText style={styles.resultMeta}>
                        {isSathi ? 'সাথী' : 'ছাত্র'} • {item.masjid}
                        {item.mobile ? ` • ${displayMobile(item.mobile)}` : ''}
                      </AppText>
                    </View>
                    <SelectCircleButton selected={picked} onPress={() => toggle(item)} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.manualSection}>
            <View style={styles.manualHeader}>
              <AppText style={styles.manualLabel}>তালিকায় না থাকলে নাম লিখুন</AppText>
              {textNames.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.manualChipsScroll}
                  contentContainerStyle={styles.manualChipsContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {textNames.map((name) => (
                    <View key={name} style={styles.manualChip}>
                      <AppText style={styles.manualChipText} numberOfLines={1}>
                        {name}
                      </AppText>
                      <TouchableOpacity onPress={() => removeTextName(name)} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color="#856404" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="সাথীর নাম"
                placeholderTextColor={colors.textLight}
                onSubmitEditing={() => Keyboard.dismiss()}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addBtn} onPress={addTextName} activeOpacity={0.75}>
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </PremiumModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4FA',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.25)',
  },
  chipTextOnly: {
    backgroundColor: '#FFF3CD',
    borderColor: 'rgba(133, 100, 4, 0.25)',
  },
  chipText: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  triggerText: {
    flex: 1,
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 15,
    color: colors.text,
    marginRight: spacing.sm,
  },
  placeholderText: {
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
  },
  modalContent: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    ...shadows.card,
    shadowOpacity: 0.07,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  loader: { marginVertical: spacing.lg },
  listScroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
    marginVertical: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  resultRowSelected: {
    backgroundColor: '#E8FAF6',
  },
  resultInfo: { flex: 1 },
  resultName: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  resultMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  manualSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(133, 100, 4, 0.2)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: '#FFF3CD',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  manualLabel: {
    flexShrink: 0,
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  manualChipsScroll: {
    flex: 1,
    minWidth: 0,
  },
  manualChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.xs,
  },
  manualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(133, 100, 4, 0.3)',
    maxWidth: 140,
  },
  manualChipText: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 12,
    color: colors.text,
    maxWidth: 110,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
