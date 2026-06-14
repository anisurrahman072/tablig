import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { GradientBackground } from '../components/GradientBackground';
import { AppText } from '../components/AppText';
import { BatchSmsProgressModal } from '../components/BatchSmsProgressModal';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { BatchSmsLog } from '../lib/directory';
import { colors, radius, shadows, spacing } from '../theme';

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: BatchSmsLog['status']) {
  switch (status) {
    case 'completed':
      return 'সম্পূর্ণ সফল';
    case 'partial':
      return 'আংশিক সফল';
    case 'failed':
      return 'ব্যর্থ';
    case 'processing':
      return 'প্রক্রিয়াধীন';
    default:
      return 'অপেক্ষমান';
  }
}

function statusColor(status: BatchSmsLog['status']) {
  switch (status) {
    case 'completed':
      return '#27AE60';
    case 'partial':
      return colors.accent;
    case 'failed':
      return '#E74C3C';
    case 'processing':
      return colors.primary;
    default:
      return colors.textLight;
  }
}

export default function BatchSmsHistoryScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const isAdmin = !!account?.isAdmin;

  const [batches, setBatches] = useState<BatchSmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get('/sms/batches', { params: { page: 1, limit: 30 } });
    setBatches(res.data.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        router.replace('/(home)');
        return;
      }
      setLoading(true);
      load()
        .catch(() => setBatches([]))
        .finally(() => setLoading(false));
    }, [isAdmin, load, router])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  function openBatch(batch: BatchSmsLog) {
    setActiveBatchId(batch._id);
    setProgressVisible(true);
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ScreenHeader title="ব্যাচ এসএমএস ইতিহাস" />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : batches.length === 0 ? (
            <AppText style={styles.empty}>এখনো কোনো ব্যাচ এসএমএস নেই</AppText>
          ) : (
            batches.map((batch) => (
                <TouchableOpacity
                  key={batch._id}
                  style={styles.card}
                  onPress={() => openBatch(batch)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardMeta}>
                      <AppText style={styles.cardDate}>{formatDateTime(batch.createdAt)}</AppText>
                      <AppText style={styles.cardSender}>
                        পাঠিয়েছেন: {batch.sender?.name || '—'}
                      </AppText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(batch.status)}18` }]}>
                      <AppText style={[styles.statusText, { color: statusColor(batch.status) }]}>
                        {statusLabel(batch.status)}
                      </AppText>
                    </View>
                  </View>

                  <AppText style={styles.cardMessage} numberOfLines={2}>
                    {batch.message}
                  </AppText>

                  <View style={styles.statsRow}>
                    <StatChip icon="checkmark-circle" color="#27AE60" value={batch.sentCount} label="সফল" />
                    <StatChip icon="close-circle" color="#E74C3C" value={batch.failedCount} label="ব্যর্থ" />
                    <StatChip icon="people" color={colors.primary} value={batch.totalRecipients} label="মোট" />
                  </View>

                  {batch.failedCount > 0 && batch.status !== 'processing' ? (
                    <LinearGradient
                      colors={['rgba(162,59,114,0.08)', 'rgba(162,59,114,0.04)']}
                      style={styles.retryHint}
                    >
                      <Ionicons name="refresh" size={14} color={colors.secondary} />
                      <AppText style={styles.retryHintText}>বিস্তারিত দেখুন ও পুনরায় পাঠান</AppText>
                    </LinearGradient>
                  ) : null}
                </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <BatchSmsProgressModal
          visible={progressVisible}
          batchId={activeBatchId}
          title="এসএমএস পাঠানো হয়েছে"
          onClose={() => {
            setProgressVisible(false);
            setActiveBatchId(null);
            load().catch(() => {});
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

function StatChip({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={14} color={color} />
      <AppText style={styles.statChipText}>
        {value} {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.sm,
  },
  centered: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.12)',
    ...shadows.card,
    shadowOpacity: 0.08,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardMeta: {
    flex: 1,
    gap: 2,
  },
  cardDate: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  cardSender: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 11,
  },
  cardMessage: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 134, 171, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statChipText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  retryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  retryHintText: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 12,
    color: colors.secondary,
  },
});
