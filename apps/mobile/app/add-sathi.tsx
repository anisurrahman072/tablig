import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { InputField } from '../components/InputField';
import { SelectField } from '../components/SelectField';
import { KeyboardFormScroll } from '../components/KeyboardFormScroll';
import { AppText } from '../components/AppText';
import api from '../lib/api';
import { appAlert } from '../lib/appAlert';
import { TIME_GIVEN_OPTIONS, MASTURAT_DAYS_OPTIONS, STUDENT_CLASS_OPTIONS } from '../constants/options';
import { colors, radius, shadows, spacing } from '../theme';

export default function AddPersonScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [isStudent, setIsStudent] = useState(false);
  const [masjids, setMasjids] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    masjid: null as string | null,
    houseLocation: '',
    mobile: '',
    timeGivenValue: null as number | null,
    // sathi-only
    masturatDaysValue: null as number | null,
    profession: '',
    // student-only
    classValue: null as number | null,
    schoolName: '',
    fatherName: '',
    fatherMobile: '',
  });

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
    api.get('/schools').then((res) => setSchools(res.data.data));
  }, []);

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.masjid) {
      appAlert('ত্রুটি', 'নাম ও মসজিদ বাধ্যতামূলক');
      return;
    }
    try {
      setLoading(true);
      const type = isStudent ? 'student' : 'sathi';
      const payload = isStudent
        ? {
            type,
            name: form.name,
            masjid: form.masjid,
            houseLocation: form.houseLocation,
            mobile: form.mobile,
            timeGivenValue: form.timeGivenValue,
            classValue: form.classValue,
            schoolName: form.schoolName,
            fatherName: form.fatherName,
            fatherMobile: form.fatherMobile,
          }
        : {
            type,
            name: form.name,
            masjid: form.masjid,
            houseLocation: form.houseLocation,
            mobile: form.mobile,
            timeGivenValue: form.timeGivenValue,
            masturatDaysValue: form.masturatDaysValue,
            profession: form.profession,
          };
      await api.post('/persons', payload);
      appAlert('সফল', isStudent ? 'ছাত্র যোগ হয়েছে' : 'সাথী যোগ হয়েছে', [
        { text: 'ঠিক আছে', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardFormScroll ref={scrollRef} contentContainerStyle={styles.content}>
          <ScreenHeader title="নতুন সাথী যোগ করুন" />

          {/* ── Student toggle ── */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleIcon, isStudent && styles.toggleIconActive]}>
                <Ionicons
                  name={isStudent ? 'school' : 'person'}
                  size={20}
                  color={isStudent ? '#FFFFFF' : colors.primary}
                />
              </View>
              <View>
                <AppText style={styles.toggleLabel}>
                  {isStudent ? 'ছাত্র হিসেবে যোগ হচ্ছে' : 'সাথী হিসেবে যোগ হচ্ছে'}
                </AppText>
                <AppText style={styles.toggleSub}>
                  {isStudent ? 'ছাত্রের তথ্য পূরণ করুন' : 'টগল করুন যদি ছাত্র হয়'}
                </AppText>
              </View>
            </View>
            <Switch
              value={isStudent}
              onValueChange={(v) => {
                setIsStudent(v);
                setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
              }}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={isStudent ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* ── Common fields ── */}
          <InputField label="নাম *" value={form.name} onChangeText={(v) => update('name', v)} />
          <SelectField
            label="কাছের মসজিদ *"
            value={form.masjid}
            onValueChange={(v) => update('masjid', v)}
            options={masjids.map((m) => ({ label: m, value: m }))}
          />
          <InputField
            label="বাসার লোকেশন"
            value={form.houseLocation}
            onChangeText={(v) => update('houseLocation', v)}
          />
          <InputField
            label="মোবাইল"
            value={form.mobile}
            onChangeText={(v) => update('mobile', v)}
            keyboardType="phone-pad"
          />
          <SelectField
            label="এর আগে কত দিন সময় দিয়েছে?"
            value={form.timeGivenValue}
            onValueChange={(v) => update('timeGivenValue', v)}
            options={TIME_GIVEN_OPTIONS}
          />

          {/* ── Sathi-only fields ── */}
          {!isStudent && (
            <>
              <SelectField
                label="মাস্তুরাতে কত দিন সময় দিয়েছে?"
                value={form.masturatDaysValue}
                onValueChange={(v) => update('masturatDaysValue', v)}
                options={MASTURAT_DAYS_OPTIONS}
              />
              <InputField
                label="পেশা"
                value={form.profession}
                onChangeText={(v) => update('profession', v)}
              />
            </>
          )}

          {/* ── Student-only fields ── */}
          {isStudent && (
            <View style={styles.studentSection}>
              <View style={styles.studentSectionHeader}>
                <Ionicons name="school-outline" size={18} color={colors.secondary} />
                <AppText style={styles.studentSectionTitle}>ছাত্রের তথ্য</AppText>
              </View>
              <SelectField
                label="কোন ক্লাসে পড়ে?"
                value={form.classValue}
                onValueChange={(v) => update('classValue', v)}
                options={STUDENT_CLASS_OPTIONS}
              />
              <SelectField
                label="স্কুলের নাম"
                value={form.schoolName || null}
                onValueChange={(v) => update('schoolName', v || '')}
                options={schools.map((s) => ({ label: s, value: s }))}
              />
              <InputField
                label="বাবার নাম"
                value={form.fatherName}
                onChangeText={(v) => update('fatherName', v)}
              />
              <InputField
                label="বাবার মোবাইল"
                value={form.fatherMobile}
                onChangeText={(v) => update('fatherMobile', v)}
                keyboardType="phone-pad"
              />
            </View>
          )}

          {/* ── Submit button ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.submitWrap}
          >
            <LinearGradient
              colors={isStudent ? ['#A23B72', '#6C5CE7'] : ['#2E86AB', '#48C9B0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isStudent ? 'school' : 'person-add'}
                    size={22}
                    color="#FFFFFF"
                    style={styles.submitIcon}
                  />
                  <AppText style={styles.submitText}>
                    {isStudent ? 'ছাত্র সংরক্ষণ করুন' : 'সাথী সংরক্ষণ করুন'}
                  </AppText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconActive: {
    backgroundColor: colors.secondary,
  },
  toggleLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    color: colors.text,
  },
  toggleSub: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },

  studentSection: {
    backgroundColor: '#FDF0F7',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(162, 59, 114, 0.2)',
    marginBottom: spacing.md,
  },
  studentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  studentSectionTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 16,
    color: colors.secondary,
  },

  submitWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.card,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  submitIcon: {
    marginRight: 4,
  },
  submitText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
