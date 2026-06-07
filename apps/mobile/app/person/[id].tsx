import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import api from '../../lib/api';
import { displayMobile } from '../../lib/mobile';
import {
  TIME_GIVEN_OPTIONS,
  MASTURAT_DAYS_OPTIONS,
  STUDENT_CLASS_OPTIONS,
} from '../../constants/options';
import { colors, radius, shadows, spacing } from '../../theme';

function labelForValue(options: { label: string; value: number }[], value?: number | null) {
  if (value == null) return '—';
  return options.find((o) => o.value === value)?.label || '—';
}

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString('bn-BD');
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PersonProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<any>(null);
  const [karguzari, setKarguzari] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    const [personRes, kargRes] = await Promise.all([
      api.get(`/persons/${id}`),
      api.get(`/persons/${id}/karguzari`),
    ]);
    setPerson(personRes.data.data);
    setKarguzari(kargRes.data.data);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoadError(true));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmDelete() {
    Alert.alert(
      'রেকর্ড মুছুন',
      `"${person?.name}" এর তথ্য চিরতরে মুছে ফেলা হবে। আপনি কি নিশ্চিত?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      await api.delete(`/persons/${id}`);
      router.back();
    } catch (err: any) {
      Alert.alert('ত্রুটি', err.message || 'মুছে ফেলা সম্ভব হয়নি');
    } finally {
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <AppText style={styles.errorText}>তথ্য লোড করা যায়নি</AppText>
            <PrimaryButton
              title="আবার চেষ্টা করুন"
              variant="outline"
              onPress={() => load().catch(() => setLoadError(true))}
            />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!person) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText style={styles.loadingText}>লোড হচ্ছে...</AppText>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const isSathi = person.type === 'sathi';
  const claimedByName: string | null = person.claimedBy?.name ?? null;
  const lastLoginAt: string | null = person.claimedBy?.lastLoginAt ?? null;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ScreenHeader title={person.name} />

          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <AppText style={styles.badge}>
                {isSathi ? 'জিম্মাদার সাথী' : 'ছাত্র'}
              </AppText>
              {person.isLocked ? (
                <View style={styles.claimedBadge}>
                  <AppText style={styles.claimedText}>দাবিকৃত</AppText>
                </View>
              ) : (
                <View style={styles.unclaimedBadge}>
                  <AppText style={styles.unclaimedText}>অদাবিকৃত</AppText>
                </View>
              )}
            </View>

            <InfoRow label="মসজিদ" value={person.masjid} />
            <InfoRow label="বাসার লোকেশন" value={person.houseLocation || '—'} />
            <InfoRow label="মোবাইল" value={displayMobile(person.mobile)} />
            <InfoRow
              label="এর আগে সময়"
              value={labelForValue(TIME_GIVEN_OPTIONS, person.timeGivenValue)}
            />
            {isSathi ? (
              <>
                <InfoRow
                  label="মাস্তুরাত"
                  value={labelForValue(MASTURAT_DAYS_OPTIONS, person.masturatDaysValue)}
                />
                <InfoRow label="পেশা" value={person.profession || '—'} />
              </>
            ) : (
              <>
                <InfoRow
                  label="ক্লাস"
                  value={labelForValue(STUDENT_CLASS_OPTIONS, person.classValue)}
                />
                <InfoRow label="স্কুল" value={person.schoolName || '—'} />
                <InfoRow label="বাবার নাম" value={person.fatherName || '—'} />
                <InfoRow label="বাবার মোবাইল" value={displayMobile(person.fatherMobile)} />
              </>
            )}

            {/* Last login — shown only when the record is claimed */}
            {person.isLocked && claimedByName ? (
              <View style={styles.lastLoginBox}>
                <AppText style={styles.lastLoginLabel}>
                  অ্যাকাউন্ট মালিক: {claimedByName}
                </AppText>
                <AppText style={styles.lastLoginValue}>
                  সর্বশেষ লগইন:{' '}
                  {lastLoginAt ? formatDateTime(lastLoginAt) : 'এখনো লগইন করেননি'}
                </AppText>
              </View>
            ) : null}
          </View>

          {person.canEdit ? (
            <PrimaryButton
              title="তথ্য সম্পাদনা"
              variant="outline"
              onPress={() => router.push(`/person/${id}/edit`)}
            />
          ) : null}

          <PrimaryButton
            title="কারগুজারি যোগ করুন"
            onPress={() => router.push(`/person/${id}/karguzari/new`)}
          />

          {/* Delete — only visible for unclaimed records */}
          {person.canDelete ? (
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
              onPress={confirmDelete}
              disabled={deleting}
              activeOpacity={0.75}
            >
              <AppText style={styles.deleteBtnText}>
                {deleting ? 'মুছে ফেলা হচ্ছে...' : '🗑  রেকর্ড মুছুন'}
              </AppText>
            </TouchableOpacity>
          ) : null}

          <AppText style={styles.sectionTitle}>মেহনতের কারগুজারি</AppText>
          {karguzari.length === 0 ? (
            <AppText style={styles.empty}>এখনো কারগুজারি নেই</AppText>
          ) : (
            karguzari.map((k) => (
              <View key={k._id} style={styles.kCard}>
                <AppText style={styles.kDate}>
                  {formatDate(k.meetingDate)} • {k.timeSlot}
                </AppText>
                <AppText style={styles.kAuthor}>লিখেছেন: {k.author?.name}</AppText>
                <AppText style={styles.kText}>{k.text}</AppText>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.primary,
    fontSize: 15,
  },
  claimedBadge: {
    backgroundColor: '#D4EDDA',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  claimedText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#155724',
    fontSize: 12,
  },
  unclaimedBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  unclaimedText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#856404',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    fontFamily: 'HindSiliguri_500Medium',
    color: colors.textLight,
    flex: 1,
  },
  value: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  lastLoginBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  lastLoginLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.text,
    fontSize: 13,
  },
  lastLoginValue: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    fontSize: 13,
  },
  deleteBtn: {
    marginTop: spacing.md,
    backgroundColor: '#FFF0F0',
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#E74C3C',
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 20,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    color: colors.text,
  },
  kCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  kDate: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.primary,
    fontSize: 14,
  },
  kAuthor: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    fontSize: 13,
    marginTop: 2,
  },
  kText: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.text,
    fontSize: 15,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  empty: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.secondary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
});
