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
import { SingleSmsDetailModal } from '../components/SingleSmsDetailModal';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { BatchSmsHistoryItem, SingleSmsLog, SmsHistoryItem } from '../lib/directory';
import { displayMobile } from '../lib/mobile';
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

function batchStatusLabel(status: BatchSmsHistoryItem['status']) {
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

function batchStatusColor(status: BatchSmsHistoryItem['status']) {
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

  const [items, setItems] = useState<SmsHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [singleVisible, setSingleVisible] = useState(false);
  const [activeSingle, setActiveSingle] = useState<SingleSmsLog | null>(null);

  const load = useCallback(async () => {
    const res = await api.get('/sms/history', { params: { page: 1, limit: 30 } });
    setItems(res.data.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        router.replace('/(home)');
        return;
      }
      setLoading(true);
      load()
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, [isAdmin, load, router])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  function openBatch(batch: BatchSmsHistoryItem) {
    setActiveBatchId(batch._id);
    setProgressVisible(true);
  }

  function openSingle(log: SingleSmsLog) {
    setActiveSingle(log);
    setSingleVisible(true);
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ScreenHeader title="এসএমএস ইতিহাস" />

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <AppText style={styles.empty}>এখনো কোনো এসএমএস পাঠানো হয়নি</AppText>
          ) : (
            items.map((item) =>
              item.kind === 'batch' ? (
                <TouchableOpacity
                  key={`batch-${item._id}`}
                  style={styles.card}
                  onPress={() => openBatch(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardMeta}>
                      <View style={styles.typeRow}>
                        <View style={styles.typeBadge}>
                          <Ionicons name="people" size={12} color={colors.primary} />
                          <AppText style={styles.typeText}>ব্যাচ</AppText>
                        </View>
                        <AppText style={styles.cardDate}>{formatDateTime(item.createdAt)}</AppText>
                      </View>
                      <AppText style={styles.cardSender}>
                        পাঠিয়েছেন: {item.sender?.name || '—'}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${batchStatusColor(item.status)}18` },
                      ]}
                    >
                      <AppText
                        style={[styles.statusText, { color: batchStatusColor(item.status) }]}
                      >
                        {batchStatusLabel(item.status)}
                      </AppText>
                    </View>
                  </View>

                  <AppText style={styles.cardMessage} numberOfLines={2}>
                    {item.message}
                  </AppText>

                  <View style={styles.statsRow}>
                    <StatChip icon="checkmark-circle" color="#27AE60" value={item.sentCount} label="সফল" />
                    <StatChip icon="close-circle" color="#E74C3C" value={item.failedCount} label="ব্যর্থ" />
                    <StatChip icon="people" color={colors.primary} value={item.totalRecipients} label="মোট" />
                  </View>

                  {item.failedCount > 0 && item.status !== 'processing' ? (
                    <LinearGradient
                      colors={['rgba(162,59,114,0.08)', 'rgba(162,59,114,0.04)']}
                      style={styles.retryHint}
                    >
                      <Ionicons name="refresh" size={14} color={colors.secondary} />
                      <AppText style={styles.retryHintText}>বিস্তারিত দেখুন ও পুনরায় পাঠান</AppText>
                    </LinearGradient>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={`single-${item._id}`}
                  style={styles.card}
                  onPress={() => openSingle(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardMeta}>
                      <View style={styles.typeRow}>
                        <View style={[styles.typeBadge, styles.typeBadgeSingle]}>
                          <Ionicons name="person" size={12} color={colors.secondary} />
                          <AppText style={[styles.typeText, styles.typeTextSingle]}>একক</AppText>
                        </View>
                        <AppText style={styles.cardDate}>{formatDateTime(item.createdAt)}</AppText>
                      </View>
                      <AppText style={styles.cardSender}>
                        {item.recipientName} · {displayMobile(item.recipientMobile)}
                      </AppText>
                      <AppText style={styles.cardSender}>
                        পাঠিয়েছেন: {item.sender?.name || '—'}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === 'failed' ? 'rgba(231,76,60,0.12)' : 'rgba(39,174,96,0.12)',
                        },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.statusText,
                          { color: item.status === 'failed' ? '#E74C3C' : '#27AE60' },
                        ]}
                      >
                        {item.status === 'failed' ? 'ব্যর্থ' : 'সফল'}
                      </AppText>
                    </View>
                  </View>

                  <AppText style={styles.cardMessage} numberOfLines={2}>
                    {item.message}
                  </AppText>

                  {item.status === 'failed' ? (
                    <LinearGradient
                      colors={['rgba(162,59,114,0.08)', 'rgba(162,59,114,0.04)']}
                      style={styles.retryHint}
                    >
                      <Ionicons name="refresh" size={14} color={colors.secondary} />
                      <AppText style={styles.retryHintText}>বিস্তারিত দেখুন ও পুনরায় পাঠান</AppText>
                    </LinearGradient>
                  ) : null}
                </TouchableOpacity>
              )
            )
          )}
        </ScrollView>

        <BatchSmsProgressModal
          visible={progressVisible}
          batchId={activeBatchId}
          title="ব্যাচ এসএমএস"
          onClose={() => {
            setProgressVisible(false);
            setActiveBatchId(null);
            load().catch(() => {});
          }}
        />

        <SingleSmsDetailModal
          visible={singleVisible}
          log={activeSingle}
          onClose={() => {
            setSingleVisible(false);
            setActiveSingle(null);
          }}
          onResent={() => load().catch(() => {})}
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 134, 171, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeSingle: {
    backgroundColor: 'rgba(162, 59, 114, 0.1)',
  },
  typeText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 10,
    color: colors.primary,
  },
  typeTextSingle: {
    color: colors.secondary,
  },
  cardDate: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 13,
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
