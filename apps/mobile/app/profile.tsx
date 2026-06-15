import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { InputField } from '../components/InputField';
import { SelectField } from '../components/SelectField';
import { PrimaryButton } from '../components/PrimaryButton';
import { AppText } from '../components/AppText';
import { KeyboardFormScroll, useScrollOnInputFocus } from '../components/KeyboardFormScroll';
import { useAuth } from '../context/AuthContext';
import { displayMobile } from '../lib/mobile';
import api from '../lib/api';
import { appAlert } from '../lib/appAlert';
import { buildMasjidSelectOptions } from '../lib/masjid';
import { colors, radius, shadows, spacing } from '../theme';

function ProfilePinField({
  value,
  onChangeText,
  pinVisible,
  onToggleVisible,
}: {
  value: string;
  onChangeText: (v: string) => void;
  pinVisible: boolean;
  onToggleVisible: () => void;
}) {
  const pinWrapRef = useRef<View>(null);
  const scrollIntoView = useScrollOnInputFocus();

  return (
    <View ref={pinWrapRef} style={styles.pinWrap}>
      <AppText style={styles.pinLabel}>পিন</AppText>
      <View style={styles.pinRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.pinInput}
          secureTextEntry={!pinVisible}
          keyboardType="numeric"
          placeholder="পিন লিখুন"
          placeholderTextColor={colors.textLight}
          onFocus={() => scrollIntoView?.(pinWrapRef)}
          maxLength={8}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={onToggleVisible}
          activeOpacity={0.7}
        >
          <Ionicons
            name={pinVisible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { account, logout, refreshAccount } = useAuth();

  const [masjids, setMasjids] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [form, setForm] = useState({
    name: '',
    houseAddress: '',
    masjid: null as string | null,
    mobile: '',
    pin: '',
  });

  useEffect(() => {
    api.get('/masjids').then((res) => setMasjids(res.data.data));
  }, []);

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name || '',
        houseAddress: account.houseAddress || '',
        masjid: account.masjid || null,
        mobile: account.mobile || '',
        pin: account.pin || '',
      });
    }
  }, [account]);

  function update(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpdate() {
    if (!form.name || !form.masjid || !form.mobile) {
      appAlert('ত্রুটি', 'নাম, মোবাইল ও মসজিদ বাধ্যতামূলক');
      return;
    }
    if (form.pin && form.pin.length < 4) {
      appAlert('ত্রুটি', 'পিন কমপক্ষে ৪ অঙ্কের হতে হবে');
      return;
    }
    try {
      setLoading(true);
      await api.put('/auth/profile', form);
      await refreshAccount();
      appAlert('সফল', 'প্রোফাইল আপডেট হয়েছে', [
        { text: 'ঠিক আছে', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      appAlert('ত্রুটি', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    appAlert('বের হবেন?', 'আপনি কি সত্যিই লগআউট করতে চান?', [
      { text: 'না', style: 'cancel' },
      { text: 'হ্যাঁ, বের হন', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardFormScroll contentContainerStyle={styles.content}>
          <ScreenHeader title="আমার প্রোফাইল" />

          <View style={styles.card}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
              <AppText style={styles.avatarName}>{account?.name}</AppText>
              <AppText style={styles.avatarMobile}>
                {displayMobile(account?.mobile)}
              </AppText>
            </View>

            <InputField
              label="নাম *"
              value={form.name}
              onChangeText={(v) => update('name', v)}
            />
            <SelectField
              label="মসজিদ *"
              value={form.masjid}
              onValueChange={(v) => update('masjid', v)}
              options={buildMasjidSelectOptions(masjids)}
            />
            <InputField
              label="বাসার ঠিকানা"
              value={form.houseAddress}
              onChangeText={(v) => update('houseAddress', v)}
              placeholder="ঐচ্ছিক"
            />
            <InputField
              label="মোবাইল নম্বর *"
              value={form.mobile}
              onChangeText={(v) => update('mobile', v)}
              keyboardType="phone-pad"
            />

            <ProfilePinField
              value={form.pin}
              onChangeText={(v) => update('pin', v)}
              pinVisible={pinVisible}
              onToggleVisible={() => setPinVisible((v) => !v)}
            />

            <PrimaryButton title="আপডেট করুন" onPress={handleUpdate} loading={loading} />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
            <AppText style={styles.logoutText}>লগ আউট করুন</AppText>
          </TouchableOpacity>
        </KeyboardFormScroll>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg ?? radius.md,
    padding: spacing.lg,
    ...shadows.card,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 134, 171, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 20,
    color: colors.text,
  },
  avatarMobile: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  pinWrap: {
    marginBottom: spacing.md,
  },
  pinLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 15,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  pinInput: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: {
    paddingLeft: spacing.sm,
    paddingVertical: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDEC',
    paddingVertical: 14,
    borderRadius: radius.md,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: '#E74C3C',
    fontSize: 16,
  },
});
