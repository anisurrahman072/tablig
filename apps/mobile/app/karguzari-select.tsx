import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { GradientBackground } from '../components/GradientBackground';
import { SelectField } from '../components/SelectField';
import { AppText } from '../components/AppText';
import { useDirectorySearch } from '../hooks/useDirectorySearch';
import api from '../lib/api';
import { RecentKarguzari } from '../lib/directory';
import { displayMobile } from '../lib/mobile';
import { MASTURAT_DAYS_OPTIONS, STUDENT_CLASS_FILTER_OPTIONS, TIME_GIVEN_OPTIONS } from '../constants/options';
import { buildMasjidSelectOptions } from '../lib/masjid';
import { colors, radius, shadows, spacing } from '../theme';

const BENGALI_MONTHS = [
  'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে',
];

function formatKarguzariDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${BENGALI_MONTHS[d.getMonth()]}`;
}

function getKarguzariTheme(isSathi: boolean) {
  if (isSathi) {
    return {
      accent: '#B8860B',
      accentDark: '#92610A',
      title: '#7A5A08',
      label: '#9A8668',
      labelIcon: '#B89B5E',
      value: '#134E45',
      dateBg: 'rgba(184,134,11,0.16)',
      timeBg: 'rgba(184,134,11,0.1)',
      timeText: '#A67C00',
      chipBg: '#FFFFFF',
      chipBorder: 'rgba(184,134,11,0.35)',
      chipText: '#734E0A',
      body: '#3F3A34',
      itemBg: 'rgba(255,255,255,0.55)',
      itemBorder: 'rgba(184,134,11,0.18)',
    };
  }
  return {
    accent: '#6D28D9',
    accentDark: '#5B21B6',
    title: '#5B21B6',
    label: '#8B7AA8',
    labelIcon: '#9B7FD4',
    value: '#4C1D95',
    dateBg: 'rgba(109,40,217,0.14)',
    timeBg: 'rgba(109,40,217,0.09)',
    timeText: '#6D28D9',
    chipBg: '#FFFFFF',
    chipBorder: 'rgba(109,40,217,0.28)',
    chipText: '#5B21B6',
    body: '#3A3548',
    itemBg: 'rgba(255,255,255,0.6)',
    itemBorder: 'rgba(109,40,217,0.16)',
  };
}

function RecentKarguzariPreviewItem({
  k,
  isSathi,
}: {
  k: RecentKarguzari;
  isSathi: boolean;
}) {
  const theme = getKarguzariTheme(isSathi);
  const attendees = k.attendeeNames ?? [];

  return (
    <View
      style={[
        styles.karguzariItem,
        { backgroundColor: theme.itemBg, borderColor: theme.itemBorder },
      ]}
    >
      <View style={styles.karguzariItemHeader}>
        <View style={[styles.karguzariDateBadge, { backgroundColor: theme.dateBg }]}>
          <Ionicons name="calendar-outline" size={12} color={theme.accentDark} />
          <AppText style={[styles.karguzariDate, { color: theme.accentDark }]}>
            {formatKarguzariDate(k.meetingDate)}
          </AppText>
        </View>
        {k.timeSlot ? (
          <View style={[styles.karguzariTimeBadge, { backgroundColor: theme.timeBg }]}>
            <AppText style={[styles.karguzariTimeText, { color: theme.timeText }]}>
              {k.timeSlot}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.karguzariMetaRow}>
        <View style={styles.karguzariLabelGroup}>
          <Ionicons name="create-outline" size={13} color={theme.labelIcon} />
          <AppText style={[styles.karguzariLabel, { color: theme.label }]}>
            লিখেছেন
          </AppText>
        </View>
        <AppText
          style={[styles.karguzariMetaValue, { color: theme.value }]}
          numberOfLines={1}
        >
          {k.author?.name || '—'}
        </AppText>
      </View>

      {attendees.length > 0 ? (
        <View style={styles.karguzariAttendeeRow}>
          <View style={styles.karguzariLabelGroup}>
            <Ionicons name="people-outline" size={13} color={theme.labelIcon} />
            <AppText style={[styles.karguzariLabel, { color: theme.label }]}>
              উপস্থিত
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.karguzariAttendeeScroll}
            contentContainerStyle={styles.karguzariAttendeeScrollContent}
          >
            {attendees.map((name) => (
              <View
                key={name}
                style={[
                  styles.karguzariAttendeeChip,
                  {
                    backgroundColor: theme.chipBg,
                    borderColor: theme.chipBorder,
                  },
                ]}
              >
                <AppText
                  style={[styles.karguzariAttendeeChipText, { color: theme.chipText }]}
                  numberOfLines={1}
                >
                  {name}
                </AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <AppText
        style={[styles.karguzariText, { color: theme.body }]}
        numberOfLines={3}
      >
        {k.text}
      </AppText>
    </View>
  );
}

export default function KarguzariSelectScreen() {
  const router = useRouter();
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
  } = useDirectorySearch({ withKarguzari: true });

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
    api.get('/schools').then((res) => setSchools(res.data.data));
  }, []);

  function handleEndReached() {
    loadMore();
  }

  function update(key: string, value: unknown) {
    updateFilter(key as keyof typeof filters, value as never);
  }

  const listHeader = (
    <View style={styles.searchSection}>
      <View style={styles.header}>
        <BackButton style={styles.backBtn} />
        <View style={styles.titleRow}>
          <AppText style={styles.pageTitle}>মেহনতের কারগুজারি লিখুন</AppText>
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
              color={showFilters ? '#FFFFFF' : colors.primary}
            />
            {hasFilters && !showFilters ? (
              <View style={styles.filterDot} />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <AppText style={styles.hint}>
        যার সাথে সাক্ষাৎ হয়েছে তাকে নির্বাচন করুন
      </AppText>

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
          onChangeText={(v) => update('q', v)}
          placeholder="নাম, মসজিদ, স্কুল, মোবাইল, ঠিকানা..."
          placeholderTextColor={colors.textLight}
          returnKeyType="search"
        />
        {filters.q ? (
          <TouchableOpacity
            onPress={() => update('q', '')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

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
          <ScrollView
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <SelectField
              label="ধরন"
            value={filters.type || null}
            onValueChange={(v) => update('type', v || '')}
            options={[
              { label: 'জিম্মাদার সাথী', value: 'sathi' },
              { label: 'ছাত্র', value: 'student' },
            ]}
            placeholder="সব"
            placeholderSelectable
          />
          <SelectField
            label="ক্লাস"
            value={filters.classValue}
            onValueChange={(v) => update('classValue', v)}
            options={STUDENT_CLASS_FILTER_OPTIONS}
          />
          <SelectField
            label="স্কুলের নাম"
            value={filters.schoolName || null}
            onValueChange={(v) => update('schoolName', v || '')}
            options={schools.map((s) => ({ label: s, value: s }))}
          />
          <SelectField
            label="মসজিদ"
            value={filters.masjid}
            onValueChange={(v) => update('masjid', v)}
            options={buildMasjidSelectOptions(masjids)}
          />
          <SelectField
            label="অ্যাকাউন্ট দাবি"
            value={filters.claimedStatus || null}
            onValueChange={(v) => update('claimedStatus', v || '')}
            options={[
              { label: 'দাবিকৃত', value: 'claimed' },
              { label: 'অদাবিকৃত', value: 'unclaimed' },
            ]}
            placeholder="সব"
            placeholderSelectable
          />
          <SelectField
            label="এর আগে সময় দিয়েছেন"
            value={filters.timeGivenValue}
            onValueChange={(v) => update('timeGivenValue', v)}
            options={TIME_GIVEN_OPTIONS}
          />
          <SelectField
            label="মাস্তুরাতে সময় দিয়েছেন"
            value={filters.masturatDaysValue}
            onValueChange={(v) => update('masturatDaysValue', v)}
            options={MASTURAT_DAYS_OPTIONS}
          />
          </ScrollView>
        </View>
      )}

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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <FlatList
            contentContainerStyle={styles.listContent}
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
              const isSathi = item.type === 'sathi';
              const recentKarguzari = item.recentKarguzari ?? [];
              return (
                <View style={styles.cardWrap}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => router.push(`/person/${item._id}/karguzari/new`)}
                  >
                    <View
                      style={[
                        styles.resultCard,
                        isSathi ? styles.sathiCard : styles.studentCard,
                      ]}
                    >
                      <View
                        style={[
                          styles.accentBar,
                          isSathi ? styles.accentSathi : styles.accentStudent,
                        ]}
                      />

                      <View style={styles.cardBody}>
                        <View style={styles.cardInner}>
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
                                  color={isSathi ? '#1B9B84' : '#7C5CBF'}
                                />
                                <AppText
                                  style={[
                                    styles.mobileUnderNameText,
                                    isSathi ? styles.mobileSathi : styles.mobileStudent,
                                  ]}
                                >
                                  {displayMobile(item.mobile)}
                                </AppText>
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.metaRow}>
                            <LinearGradient
                              colors={
                                isSathi
                                  ? ['#1B9B84', '#48C9B0']
                                  : ['#7C5CBF', '#A78BFA']
                              }
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.typeBadge}
                            >
                              <Ionicons
                                name={isSathi ? 'person' : 'school'}
                                size={11}
                                color="#FFFFFF"
                                style={{ marginRight: 4 }}
                              />
                              <AppText style={styles.typeBadgeText}>
                                {isSathi ? 'সাথী' : 'ছাত্র'}
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
                                  color={isSathi ? '#1B9B84' : '#7C5CBF'}
                                />
                                <AppText
                                  style={[
                                    styles.chipText,
                                    isSathi ? styles.chipTextSathi : styles.chipTextStudent,
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
                                    color="#7C5CBF"
                                  />
                                  <AppText style={[styles.chipText, styles.chipTextStudent]}>
                                    {item.schoolName}
                                  </AppText>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        {recentKarguzari.length > 0 && (
                          <View
                            style={[
                              styles.karguzariPreview,
                              isSathi
                                ? styles.karguzariPreviewSathi
                                : styles.karguzariPreviewStudent,
                            ]}
                          >
                            <View
                              style={[
                                styles.karguzariPreviewHeader,
                                isSathi
                                  ? styles.karguzariPreviewHeaderSathi
                                  : styles.karguzariPreviewHeaderStudent,
                              ]}
                            >
                              <View
                                style={[
                                  styles.karguzariPreviewTitleBadge,
                                  isSathi
                                    ? styles.karguzariPreviewTitleBadgeSathi
                                    : styles.karguzariPreviewTitleBadgeStudent,
                                ]}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={13}
                                  color={isSathi ? '#92610A' : '#5B21B6'}
                                />
                                <AppText
                                  style={[
                                    styles.karguzariPreviewLabel,
                                    isSathi
                                      ? styles.karguzariLabelSathi
                                      : styles.karguzariLabelStudent,
                                  ]}
                                >
                                  সাম্প্রতিক কারগুজারি
                                </AppText>
                              </View>
                            </View>
                            {recentKarguzari.map((k, idx) => (
                              <View
                                key={k._id}
                                style={idx > 0 && styles.karguzariItemDivider}
                              >
                                <RecentKarguzariPreviewItem k={k} isSathi={isSathi} />
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </KeyboardAvoidingView>
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
  header: {
    marginBottom: spacing.sm,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    flex: 1,
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 22,
    color: colors.text,
  },
  hint: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    marginBottom: spacing.sm,
    fontSize: 14,
    textAlign: 'center',
  },
  filterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(46,134,171,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46,134,171,0.2)',
    flexShrink: 0,
  },
  filterIconBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  advancedFilters: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.12)',
    overflow: 'hidden',
  },
  filterScroll: {
    maxHeight: Math.min(340, Dimensions.get('window').height * 0.38),
  },
  filterScrollContent: {
    paddingBottom: spacing.xs,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterPanelTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 14,
    color: colors.text,
  },
  clearText: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.secondary,
    fontSize: 13,
  },
  statusRow: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 4,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultCount: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 12,
    color: colors.textLight,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
  },
  footerSpinner: { marginVertical: 20 },
  loadMoreBtn: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(46, 134, 171, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.2)',
  },
  loadMoreText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.primary,
    fontSize: 14,
  },
  endOfList: {
    textAlign: 'center',
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    marginVertical: spacing.md,
  },
  cardWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    ...shadows.card,
    shadowOpacity: 0.07,
  },
  resultCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sathiCard: {
    backgroundColor: '#E6F7F2',
    borderWidth: 1,
    borderColor: 'rgba(27,155,132,0.2)',
  },
  studentCard: {
    backgroundColor: '#F0EBFF',
    borderWidth: 1,
    borderColor: 'rgba(124,92,191,0.2)',
  },
  accentBar: {
    width: 5,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  accentSathi: { backgroundColor: '#1B9B84' },
  accentStudent: { backgroundColor: '#7C5CBF' },
  cardBody: { flex: 1 },
  cardInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  nameBlock: {
    gap: 2,
    marginBottom: 8,
  },
  resultName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
  },
  sathiName: { color: '#134E45' },
  studentName: { color: '#3D2B6B' },
  mobileUnderName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  mobileUnderNameText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
  },
  mobileSathi: { color: '#1B9B84' },
  mobileStudent: { color: '#7C5CBF' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  infoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chipSathi: { backgroundColor: 'rgba(27,155,132,0.12)' },
  chipStudent: { backgroundColor: 'rgba(124,92,191,0.12)' },
  chipText: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
  },
  chipTextSathi: { color: '#134E45' },
  chipTextStudent: { color: '#4A3078' },

  karguzariPreview: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    marginTop: 4,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    gap: 6,
    borderWidth: 1,
  },
  karguzariPreviewSathi: {
    backgroundColor: '#FFF8E8',
    borderColor: '#E8C468',
  },
  karguzariPreviewStudent: {
    backgroundColor: '#F3EEFF',
    borderColor: '#B794F6',
  },
  karguzariPreviewHeader: {
    paddingBottom: 6,
    marginBottom: 2,
    borderBottomWidth: 1,
  },
  karguzariPreviewHeaderSathi: {
    borderBottomColor: 'rgba(184,134,11,0.2)',
  },
  karguzariPreviewHeaderStudent: {
    borderBottomColor: 'rgba(109,40,217,0.18)',
  },
  karguzariPreviewTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  karguzariPreviewTitleBadgeSathi: {
    backgroundColor: 'rgba(184,134,11,0.14)',
  },
  karguzariPreviewTitleBadgeStudent: {
    backgroundColor: 'rgba(109,40,217,0.12)',
  },
  karguzariPreviewLabel: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  karguzariLabelSathi: { color: '#92610A' },
  karguzariLabelStudent: { color: '#5B21B6' },
  karguzariItem: {
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  karguzariItemDivider: {
    marginTop: 6,
  },
  karguzariItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  karguzariDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  karguzariTimeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  karguzariTimeText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 11,
  },
  karguzariMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 22,
  },
  karguzariAttendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 26,
  },
  karguzariLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  karguzariLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  karguzariMetaValue: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 13,
    flex: 1,
  },
  karguzariAttendeeScroll: {
    flex: 1,
  },
  karguzariAttendeeScrollContent: {
    alignItems: 'center',
    gap: 5,
    paddingRight: 4,
  },
  karguzariAttendeeChip: {
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    maxWidth: 140,
  },
  karguzariAttendeeChipText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 11,
  },
  karguzariDate: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 12,
  },
  karguzariText: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 1,
  },
});
