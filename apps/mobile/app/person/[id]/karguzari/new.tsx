import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../../../../components/GradientBackground';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { InputField } from '../../../../components/InputField';
import { SelectField } from '../../../../components/SelectField';
import { PremiumModal } from '../../../../components/PremiumModal';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { AppText } from '../../../../components/AppText';
import api from '../../../../lib/api';
import { appAlert } from '../../../../lib/appAlert';
import { PersonSearchMultiSelect, SelectedAttendee } from '../../../../components/PersonSearchMultiSelect';
import { KeyboardFormScroll } from '../../../../components/KeyboardFormScroll';
import { KARGUZARI_TIME_SLOTS } from '../../../../constants/options';
import { KarguzariPremiumSection } from '../../../../components/KarguzariPremiumSection';
import { colors, radius, spacing, shadows } from '../../../../theme';

type TabKey = 'write' | 'history';

export default function NewKarguzariScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attendees, setAttendees] = useState<SelectedAttendee[]>([]);
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [visitedName, setVisitedName] = useState<string | null>(null);
  const [visitedType, setVisitedType] = useState<'sathi' | 'student' | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('write');
  const [karguzariRefreshToken, setKarguzariRefreshToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/persons/${id}`)
      .then((res) => {
        setVisitedName(res.data.data?.name ?? null);
        setVisitedType(res.data.data?.type ?? null);
      })
      .catch(() => setVisitedName(null));
  }, [id]);

  function formatBanglaDate(d: Date) {
    return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function openPicker() {
    setTempDate(date);
    setShowPicker(true);
  }

  function confirmDate() {
    setDate(tempDate);
    setShowPicker(false);
  }

  async function handleSubmit() {
    if (!timeSlot || !text.trim()) {
      appAlert('ত্রুটি', 'সময় ও কারগুজারি দিন');
      return;
    }
    try {
      setLoading(true);
      await api.post(`/persons/${id}/karguzari`, {
        meetingDate: date.toISOString(),
        timeSlot,
        text,
        attendeeIds: attendees.map((a) => a.id),
        attendeeNames,
      });
      setKarguzariRefreshToken((t) => t + 1);
      appAlert('সফল', 'কারগুজারি সংরক্ষিত', [
        { text: 'ঠিক আছে', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  const personName = visitedName ?? '...';
  const tabLabels = {
    write: 'কারগুজারি যোগ করুন',
    history: 'আগের কারগুজারি দেখুন',
  } as const;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topSection}>
          <ScreenHeader title={tabLabels[activeTab]} />

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'write' && styles.tabActive]}
              onPress={() => setActiveTab('write')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.tabText, activeTab === 'write' && styles.tabTextActive]}>
                {tabLabels.write}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.8}
            >
              <AppText style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                {tabLabels.history}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'write' ? (
        <KeyboardFormScroll contentContainerStyle={styles.content}>
            <LinearGradient
              colors={['#2E86AB', '#48C9B0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.visitBanner}
            >
              <View style={styles.visitIconWrap}>
                <Ionicons name="people" size={22} color="#2E86AB" />
              </View>
              <View style={styles.visitTextWrap}>
                <AppText style={styles.visitLabel}>সাক্ষাত করা হয়েছে</AppText>
                {visitedName ? (
                  <AppText style={styles.visitName} numberOfLines={2}>
                    {visitedName}
                    <AppText style={styles.visitSuffix}> এর সাথে</AppText>
                  </AppText>
                ) : (
                  <ActivityIndicator color="#FFFFFF" size="small" style={styles.visitLoader} />
                )}
                {visitedType ? (
                  <View style={styles.visitBadge}>
                    <AppText style={styles.visitBadgeText}>
                      {visitedType === 'sathi' ? 'জিম্মাদার সাথী' : 'ছাত্র'}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            <AppText style={styles.label}>সাক্ষাতের তারিখ</AppText>
            <TouchableOpacity style={styles.dateBtn} onPress={openPicker}>
              <AppText style={styles.dateText}>{formatBanglaDate(date)}</AppText>
              <AppText style={styles.dateMeta}>তারিখ পরিবর্তন করুন →</AppText>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <PremiumModal
                visible={showPicker}
                title="তারিখ নির্বাচন"
                onClose={() => setShowPicker(false)}
                onConfirm={confirmDate}
              >
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, selected) => {
                    if (selected) setTempDate(selected);
                  }}
                  style={styles.datePicker}
                />
              </PremiumModal>
            ) : showPicker ? (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                onChange={(event, selected) => {
                  setShowPicker(false);
                  if (event.type === 'set' && selected) {
                    setDate(selected);
                    setTempDate(selected);
                  }
                }}
              />
            ) : null}

            <SelectField
              label="সাক্ষাতের সময়"
              value={timeSlot}
              onValueChange={(v) => setTimeSlot(v as string)}
              options={KARGUZARI_TIME_SLOTS.map((s) => ({ label: s, value: s }))}
            />

            <PersonSearchMultiSelect
              label="মেহনতে যারা উপস্থিত ছিলেন"
              selected={attendees}
              textNames={attendeeNames}
              onSelectedChange={setAttendees}
              onTextNamesChange={setAttendeeNames}
              excludeIds={id ? [id] : []}
            />

            <InputField
              label="কারগুজারি"
              value={text}
              onChangeText={setText}
              placeholder="সাক্ষাতের বিবরণ লিখুন"
              multiline
            />

            <PrimaryButton title="সংরক্ষণ করুন" onPress={handleSubmit} loading={loading} />
        </KeyboardFormScroll>
        ) : id ? (
          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            <KarguzariPremiumSection
              personId={id}
              endpoint="received"
              title={`${personName} এর সাথে সাক্ষাত হয়েছে`}
              subtitle="যারা এই ব্যক্তির সাথে সাক্ষাৎ করেছেন এবং তারা কারগুজারি লিখেছেন"
              emptyText="এখনো কেউ কারগুজারি লিখেননি"
              headerColors={['#2E86AB', '#48C9B0']}
              icon="hand-left-outline"
              cardTint="#E8F6FC"
              cardBorder="rgba(46, 134, 171, 0.18)"
              accentColor="#2E86AB"
              refreshToken={karguzariRefreshToken}
              style={styles.firstSection}
            />

            <KarguzariPremiumSection
              personId={id}
              endpoint="authored"
              title={`${personName} যাদের উপর মেহনত করেছেন`}
              subtitle="এই ব্যক্তি নিজে যাদের সাথে সাক্ষাত করে কারগুজারি লিখেছেন"
              emptyText="এখনো কারগুজারি যোগ করা হয়নি"
              headerColors={['#A23B72', '#E056A0']}
              icon="create-outline"
              cardTint="#F9EDF5"
              cardBorder="rgba(162, 59, 114, 0.16)"
              accentColor="#A23B72"
              showVisitedPerson
              refreshToken={karguzariRefreshToken}
            />

            <KarguzariPremiumSection
              personId={id}
              endpoint="attended"
              title={`${personName} মেহনতে উপস্থিত ছিলেন`}
              subtitle="অন্যের সাক্ষাতে উপস্থিত থাকার রেকর্ড"
              emptyText="মেহনতে উপস্থিত থাকার কোনো রেকর্ড নেই"
              headerColors={['#F18F01', '#FFB347']}
              icon="people-outline"
              cardTint="#FFF4E6"
              cardBorder="rgba(241, 143, 1, 0.2)"
              accentColor="#F18F01"
              showVisitedPerson
              refreshToken={karguzariRefreshToken}
            />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.sm,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  tabText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  historyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  firstSection: {
    marginTop: spacing.sm,
  },
  visitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
    shadowColor: '#2E86AB',
    shadowOpacity: 0.25,
    elevation: 6,
  },
  visitIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitTextWrap: {
    flex: 1,
    gap: 2,
  },
  visitLabel: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
  },
  visitName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    lineHeight: 28,
  },
  visitSuffix: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  visitLoader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  visitBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  visitBadgeText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  label: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  dateBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.md,
  },
  dateText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  dateMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  datePicker: {
    width: '100%',
    backgroundColor: colors.card,
  },
});
