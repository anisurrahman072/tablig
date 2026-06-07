import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import { InputField } from '../components/InputField';
import { AppText } from '../components/AppText';
import api from '../lib/api';
import { colors, radius, shadows, spacing } from '../theme';

type Person = { _id: string; name: string; type: string; masjid: string };

export default function KarguzariSelectScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get('/persons', { params: q ? { q } : {} });
        setResults(res.data.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader title="কারগুজারি লিখুন" />
          <AppText style={styles.hint}>কার জন্য কারগুজারি লিখবেন তা নির্বাচন করুন</AppText>
          <InputField
            label="নাম দিয়ে খুঁজুন"
            value={q}
            onChangeText={setQ}
            placeholder="নাম লিখুন"
          />

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            results.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.card}
                onPress={() => router.push(`/person/${item._id}/karguzari/new`)}
              >
                <AppText style={styles.name}>{item.name}</AppText>
                <AppText style={styles.meta}>
                  {item.type === 'sathi' ? 'জিম্মাদার সাথী' : 'ছাত্র'} • {item.masjid}
                </AppText>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  hint: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    marginBottom: spacing.md,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  name: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: colors.text,
  },
  meta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
});
