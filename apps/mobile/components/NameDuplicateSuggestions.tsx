import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText } from './AppText';
import api from '../lib/api';
import { displayMobile } from '../lib/mobile';
import type { DirectoryEntry } from '../lib/directory';
import { STUDENT_CLASS_OPTIONS } from '../constants/options';
import { colors, radius, spacing } from '../theme';

const SUGGESTION_LIMIT = 5;
const DEBOUNCE_MS = 400;

type Field = 'name' | 'mobile';

type Props = {
  query: string;
  field: Field;
};

const FIELD_CONFIG: Record<
  Field,
  { minLength: number; header: string; minDigits?: number }
> = {
  name: {
    minLength: 2,
    header:
      'সদৃশ নামে ইতিমধ্যে ডাটাবেসে আছে — আপনি কি এই ব্যক্তিদের একজন যোগ করতে চাচ্ছিলেন?',
  },
  mobile: {
    minLength: 1,
    minDigits: 4,
    header:
      'এই মোবাইল নম্বরে ইতিমধ্যে ডাটাবেসে আছে — আপনি কি এই ব্যক্তিদের একজন যোগ করতে চাচ্ছিলেন?',
  },
};

function getClassLabel(classValue: number | null | undefined): string | null {
  if (classValue == null) return null;
  return STUDENT_CLASS_OPTIONS.find((o) => o.value === classValue)?.label ?? null;
}

function isQueryReady(query: string, field: Field): boolean {
  const config = FIELD_CONFIG[field];
  const trimmed = query.trim();
  if (trimmed.length < config.minLength) return false;
  if (config.minDigits != null) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < config.minDigits) return false;
  }
  return true;
}

export function DuplicatePersonSuggestions({ query, field }: Props) {
  const router = useRouter();
  const trimmedQuery = query.trim();
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);
  const ready = isQueryReady(trimmedQuery, field);

  useEffect(() => {
    if (!ready) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      const fetchId = ++fetchIdRef.current;
      setLoading(true);
      try {
        const res = await api.get('/persons', {
          params: { q: trimmedQuery, page: 1, limit: SUGGESTION_LIMIT },
        });
        if (fetchId !== fetchIdRef.current) return;
        setResults(res.data.data ?? []);
      } catch {
        if (fetchId === fetchIdRef.current) setResults([]);
      } finally {
        if (fetchId === fetchIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmedQuery, ready]);

  if (!ready) return null;
  if (!loading && results.length === 0) return null;

  const { header } = FIELD_CONFIG[field];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={16} color="#B7791F" />
        <AppText style={styles.headerText}>{header}</AppText>
        {loading ? (
          <ActivityIndicator size="small" color="#B7791F" style={styles.headerSpinner} />
        ) : null}
      </View>

      {!loading
        ? results.map((item) => {
            const isStudent = item.type === 'student';
            const classLabel = isStudent ? getClassLabel(item.classValue) : null;
            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.row, isStudent ? styles.rowStudent : styles.rowSathi]}
                onPress={() => router.push(`/person/${item._id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.rowMain}>
                  <AppText style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText style={styles.rowMeta} numberOfLines={2}>
                    {isStudent ? 'ছাত্র' : 'সাথী'}
                    {' • '}
                    {item.masjid}
                    {item.mobile ? ` • ${displayMobile(item.mobile)}` : ''}
                    {isStudent && item.schoolName ? ` • ${item.schoolName}` : ''}
                    {classLabel ? ` • ${classLabel}` : ''}
                  </AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={isStudent ? '#A23B72' : colors.primary}
                />
              </TouchableOpacity>
            );
          })
        : null}

      {!loading && results.length > 0 ? (
        <AppText style={styles.footerHint}>প্রোফাইল দেখতে ট্যাপ করুন</AppText>
      ) : null}
    </View>
  );
}

/** @deprecated Use DuplicatePersonSuggestions with field="name" */
export function NameDuplicateSuggestions({ name }: { name: string }) {
  return <DuplicatePersonSuggestions query={name} field="name" />;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: '#FFFBF0',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(183, 121, 31, 0.22)',
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerText: {
    flex: 1,
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: '#8A6D1F',
  },
  headerSpinner: {
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
    borderWidth: 1,
  },
  rowSathi: {
    backgroundColor: 'rgba(46, 134, 171, 0.08)',
    borderColor: 'rgba(46, 134, 171, 0.16)',
  },
  rowStudent: {
    backgroundColor: 'rgba(162, 59, 114, 0.08)',
    borderColor: 'rgba(162, 59, 114, 0.16)',
  },
  rowMain: {
    flex: 1,
  },
  rowName: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  rowMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 11,
    color: colors.textLight,
    marginTop: 1,
  },
  footerHint: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
