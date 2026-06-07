import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { InputField } from '../components/InputField';
import { SelectField } from '../components/SelectField';
import { AppText } from '../components/AppText';
import api from '../lib/api';
import { displayMobile } from '../lib/mobile';
import { STUDENT_CLASS_OPTIONS } from '../constants/options';
import { colors, radius, shadows, spacing } from '../theme';

type Person = {
  _id: string;
  type: 'sathi' | 'student';
  name: string;
  masjid: string;
  schoolName?: string;
  mobile?: string;
  isLocked?: boolean;
  canDelete?: boolean;
};

export default function SearchScreen() {
  const router = useRouter();
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [results, setResults] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState({
    q: '',
    type: '' as '' | 'sathi' | 'student',
    classValue: null as number | null,
    schoolName: '',
    mobile: '',
    masjid: null as string | null,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
    api.get('/schools').then((res) => setSchools(res.data.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(1), 400);
    return () => clearTimeout(timer);
  }, [filters]);

  async function fetchResults(pageNumber = 1) {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const params: Record<string, string | number> = {
        page: pageNumber,
        limit: 10,
      };
      if (filters.q) params.q = filters.q;
      if (filters.type) params.type = filters.type;
      if (filters.classValue) params.classValue = filters.classValue;
      if (filters.schoolName) params.schoolName = filters.schoolName;
      if (filters.mobile) params.mobile = filters.mobile;
      if (filters.masjid) params.masjid = filters.masjid;

      const res = await api.get('/persons', { params });
      const newData = res.data.data;
      const pagination = res.data.pagination;

      if (pageNumber === 1) {
        setResults(newData);
      } else {
        setResults((prev) => [...prev, ...newData]);
      }

      setTotal(pagination?.total ?? 0);
      setPage(pageNumber);
      setHasMore(pageNumber < (pagination?.pages ?? 1));
      setSearched(true);
    } catch {
      if (pageNumber === 1) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (!loading && !loadingMore && hasMore) {
      fetchResults(page + 1);
    }
  }

  function update(key: string, value: any) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ q: '', type: '', classValue: null, schoolName: '', mobile: '', masjid: null });
  }

  function confirmDelete(item: Person) {
    Alert.alert(
      'রেকর্ড মুছুন',
      `"${item.name}" এর তথ্য চিরতরে মুছে ফেলা হবে। আপনি কি নিশ্চিত?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: () => deletePerson(item._id),
        },
      ]
    );
  }

  async function deletePerson(id: string) {
    try {
      setDeletingId(id);
      await api.delete(`/persons/${id}`);
      setResults((prev) => prev.filter((p) => p._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      Alert.alert('ত্রুটি', err.message || 'মুছে ফেলা সম্ভব হয়নি');
    } finally {
      setDeletingId(null);
    }
  }

  const hasFilters = filters.q || filters.type || filters.classValue || filters.schoolName || filters.mobile || filters.masjid;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <FlatList
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            data={results}
            keyExtractor={(item) => item._id}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <>
                <View style={styles.headerRow}>
                  <ScreenHeader title="সাথী খুঁজুন" />
                  {hasFilters ? (
                    <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                      <AppText style={styles.clearText}>ফিল্টার মুছুন</AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <InputField
                  label="নাম দিয়ে খুঁজুন"
                  value={filters.q}
                  onChangeText={(v) => update('q', v)}
                  placeholder="যেকোনো অংশ লিখুন"
                />

                <TouchableOpacity 
                  style={styles.filterToggle} 
                  onPress={() => setShowFilters(!showFilters)}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.filterToggleText}>
                    {showFilters ? 'ফিল্টার লুকান' : 'আরও ফিল্টার দেখুন'}
                  </AppText>
                  <AppText style={styles.filterToggleArrow}>
                    {showFilters ? '▲' : '▼'}
                  </AppText>
                </TouchableOpacity>

                {showFilters && (
                  <View style={styles.advancedFilters}>
                    <SelectField
                      label="ধরন"
                      value={filters.type || null}
                      onValueChange={(v) => update('type', v || '')}
                      options={[
                        { label: 'জিম্মাদার সাথী', value: 'sathi' },
                        { label: 'ছাত্র', value: 'student' },
                      ]}
                      placeholder="সব"
                    />

                    <SelectField
                      label="ক্লাস"
                      value={filters.classValue}
                      onValueChange={(v) => update('classValue', v)}
                      options={STUDENT_CLASS_OPTIONS}
                    />

                    <SelectField
                      label="স্কুলের নাম"
                      value={filters.schoolName || null}
                      onValueChange={(v) => update('schoolName', v || '')}
                      options={schools.map((s) => ({ label: s, value: s }))}
                    />

                    <InputField
                      label="মোবাইল"
                      value={filters.mobile}
                      onChangeText={(v) => update('mobile', v)}
                      keyboardType="phone-pad"
                    />

                    <SelectField
                      label="মসজিদ"
                      value={filters.masjid}
                      onValueChange={(v) => update('masjid', v)}
                      options={masjids.map((m) => ({ label: m, value: m }))}
                    />
                  </View>
                )}

                {loading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                  searched && (
                    <AppText style={styles.resultCount}>
                      {total} জন পাওয়া গেছে
                    </AppText>
                  )
                )}
              </>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => router.push(`/person/${item._id}`)}
              >
                <View style={styles.cardRow}>
                  <AppText style={styles.resultName}>{item.name}</AppText>
                  <View style={styles.badgesRight}>
                    {item.canDelete ? (
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => confirmDelete(item)}
                        disabled={deletingId === item._id}
                      >
                        {deletingId === item._id ? (
                          <ActivityIndicator size="small" color="#E74C3C" />
                        ) : (
                          <AppText style={styles.deleteIconText}>🗑</AppText>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    <View style={[styles.typeBadge, item.type === 'sathi' ? styles.sathiBadge : styles.studentBadge]}>
                      <AppText style={styles.typeBadgeText}>
                        {item.type === 'sathi' ? 'সাথী' : 'ছাত্র'}
                      </AppText>
                    </View>
                  </View>
                </View>
                <AppText style={styles.resultMeta}>{item.masjid}</AppText>
                {item.schoolName ? (
                  <AppText style={styles.resultMeta}>{item.schoolName}</AppText>
                ) : null}
                {item.mobile ? (
                  <AppText style={styles.resultMobile}>{displayMobile(item.mobile)}</AppText>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading && searched && results.length === 0 ? (
                <AppText style={styles.empty}>কোনো ফলাফল পাওয়া যায়নি</AppText>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clearBtn: {
    paddingTop: 4,
  },
  clearText: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.secondary,
    fontSize: 13,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 134, 171, 0.1)',
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  filterToggleText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.primary,
    fontSize: 14,
  },
  filterToggleArrow: {
    color: colors.primary,
    fontSize: 12,
  },
  advancedFilters: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.1)',
  },
  results: { marginTop: spacing.sm },
  resultCount: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 13,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: colors.text,
    flex: 1,
  },
  badgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconBtn: {
    padding: 4,
    marginRight: 4,
  },
  deleteIconText: {
    fontSize: 16,
    color: '#E74C3C',
  },
  typeBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: spacing.xs,
  },
  sathiBadge: { backgroundColor: '#E8F8F5' },
  studentBadge: { backgroundColor: '#FDE8F6' },
  typeBadgeText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  resultMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  resultMobile: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: colors.textLight,
    fontFamily: 'HindSiliguri_400Regular',
  },
});
