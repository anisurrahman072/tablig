import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import api from '../lib/api';
import { colors, radius, shadows, spacing } from '../theme';

const PAGE_SIZE = 5;

type KarguzariItem = {
  _id: string;
  meetingDate: string;
  timeSlot: string;
  text: string;
  author?: { name?: string };
  person?: { name?: string; type?: string };
  attendees?: { name?: string }[];
  attendeeNames?: string[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
};

type Props = {
  personId: string;
  endpoint: 'received' | 'authored' | 'attended';
  title: string;
  subtitle: string;
  emptyText: string;
  headerColors: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  cardTint: string;
  cardBorder: string;
  accentColor: string;
  showVisitedPerson?: boolean;
  refreshToken?: number;
  style?: ViewStyle;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAttendees(item: KarguzariItem) {
  const names: string[] = [];
  if (item.attendees?.length) {
    names.push(...item.attendees.map((a) => a.name).filter(Boolean) as string[]);
  }
  if (item.attendeeNames?.length) {
    names.push(...item.attendeeNames);
  }
  return names.length ? names.join(', ') : null;
}

function KarguzariItemCard({
  item,
  showVisitedPerson,
  cardTint,
  cardBorder,
  accentColor,
}: {
  item: KarguzariItem;
  showVisitedPerson?: boolean;
  cardTint: string;
  cardBorder: string;
  accentColor: string;
}) {
  const attendeeLine = formatAttendees(item);

  return (
    <View style={[styles.itemCard, { backgroundColor: cardTint, borderColor: cardBorder }]}>
      <View style={styles.itemHeader}>
        <View style={[styles.dateBadge, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name="calendar-outline" size={13} color={accentColor} />
          <AppText style={[styles.dateText, { color: accentColor }]}>
            {formatDate(item.meetingDate)}
          </AppText>
        </View>
        <View style={[styles.timeBadge, { backgroundColor: `${accentColor}12` }]}>
          <AppText style={[styles.timeText, { color: accentColor }]}>{item.timeSlot}</AppText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="create-outline" size={14} color={colors.textLight} />
        <AppText style={styles.metaText}>লিখেছেন: {item.author?.name || '—'}</AppText>
      </View>

      {showVisitedPerson && item.person?.name ? (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={accentColor} />
          <AppText style={[styles.metaText, { color: accentColor }]}>
            যাকে দেখা: {item.person.name}
          </AppText>
        </View>
      ) : null}

      {attendeeLine ? (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={colors.textLight} />
          <AppText style={styles.metaText}>উপস্থিত: {attendeeLine}</AppText>
        </View>
      ) : null}

      <AppText style={styles.itemText}>{item.text}</AppText>
    </View>
  );
}

export function KarguzariPremiumSection({
  personId,
  endpoint,
  title,
  subtitle,
  emptyText,
  headerColors,
  icon,
  cardTint,
  cardBorder,
  accentColor,
  showVisitedPerson,
  refreshToken = 0,
  style,
}: Props) {
  const [items, setItems] = useState<KarguzariItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(false);
      }

      try {
        const res = await api.get(`/persons/${personId}/karguzari/${endpoint}`, {
          params: { page: pageNum, limit: PAGE_SIZE },
        });
        const data: KarguzariItem[] = res.data.data ?? [];
        const pagination: Pagination = res.data.pagination ?? {
          page: pageNum,
          limit: PAGE_SIZE,
          total: data.length,
          pages: 1,
          hasMore: false,
        };

        setItems((prev) => (append ? [...prev, ...data] : data));
        setPage(pagination.page);
        setHasMore(!!pagination.hasMore);
        setTotal(pagination.total);
        setError(false);
      } catch {
        if (!append) {
          setItems([]);
          setHasMore(false);
          setTotal(0);
        }
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [personId, endpoint]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage, refreshToken]);

  function loadMore() {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, true);
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerIconWrap}>
          <Ionicons name={icon} size={22} color={headerColors[0]} />
        </View>
        <View style={styles.headerTextWrap}>
          <AppText style={styles.headerTitle}>{title}</AppText>
          <AppText style={styles.headerSubtitle}>{subtitle}</AppText>
          {!loading && total > 0 ? (
            <View style={styles.countBadge}>
              <AppText style={styles.countText}>{total}টি রেকর্ড</AppText>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={accentColor} />
            <AppText style={styles.loadingText}>লোড হচ্ছে...</AppText>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <AppText style={styles.errorText}>লোড করা যায়নি</AppText>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: accentColor }]}
              onPress={() => fetchPage(1, false)}
              activeOpacity={0.75}
            >
              <AppText style={[styles.retryText, { color: accentColor }]}>আবার চেষ্টা</AppText>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={28} color={colors.textLight} />
            <AppText style={styles.emptyText}>{emptyText}</AppText>
          </View>
        ) : (
          <>
            {items.map((item) => (
              <KarguzariItemCard
                key={item._id}
                item={item}
                showVisitedPerson={showVisitedPerson}
                cardTint={cardTint}
                cardBorder={cardBorder}
                accentColor={accentColor}
              />
            ))}

            {hasMore ? (
              <TouchableOpacity
                style={[styles.loadMoreBtn, { borderColor: accentColor }]}
                onPress={loadMore}
                disabled={loadingMore}
                activeOpacity={0.75}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <>
                    <Ionicons name="chevron-down" size={16} color={accentColor} />
                    <AppText style={[styles.loadMoreText, { color: accentColor }]}>
                      আরও দেখুন ({items.length}/{total})
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            ) : total > PAGE_SIZE ? (
              <AppText style={styles.allLoadedText}>সব রেকর্ড দেখানো হয়েছে</AppText>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  headerSubtitle: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 19,
  },
  countBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  body: {
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dateText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
  },
  timeBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timeText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
  },
  itemText: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    fontSize: 13,
  },
  errorText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.secondary,
    fontSize: 14,
  },
  retryBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  retryText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  loadMoreText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 14,
  },
  allLoadedText: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
