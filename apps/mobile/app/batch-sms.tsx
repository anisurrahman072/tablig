import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../components/BackButton';
import { GradientBackground } from '../components/GradientBackground';
import { AppText } from '../components/AppText';
import { PrimaryButton } from '../components/PrimaryButton';
import { BatchSmsProgressModal } from '../components/BatchSmsProgressModal';
import { SelectCircleButton } from '../components/SelectCircleButton';
import { KeyboardFormScroll } from '../components/KeyboardFormScroll';
import { useBatchSmsSelection } from '../context/BatchSmsContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { appAlert } from '../lib/appAlert';
import { DirectoryEntry } from '../lib/directory';
import { displayMobile } from '../lib/mobile';
import {
  clampCustomSmsMessage,
  CUSTOM_USER_SMS_DEFAULT,
  CUSTOM_USER_SMS_WARN_MESSAGE,
  customSmsLimitHint,
  getCustomSmsLimits,
} from '../lib/smsLimits';
import { colors, radius, shadows, spacing } from '../theme';

const PAGE_SIZE = 8;
const MAX_VISIBLE_RECIPIENTS = 3;
const EMPTY_RECIPIENTS_HEIGHT = 100;
const FALLBACK_CARD_HEIGHT = 76;

function RecipientRow({
  item,
  onRemove,
  onMeasure,
}: {
  item: DirectoryEntry;
  onRemove: (id: string) => void;
  onMeasure?: (height: number) => void;
}) {
  const isSathi = item.type === 'sathi';

  return (
    <View
      onLayout={
        onMeasure
          ? (event) => onMeasure(event.nativeEvent.layout.height)
          : undefined
      }
      style={[styles.recipientCard, isSathi ? styles.sathiCard : styles.studentCard]}
    >
      <View style={styles.recipientMain}>
        <AppText style={styles.recipientName}>{item.name}</AppText>
        <View style={styles.recipientMeta}>
          <LinearGradient
            colors={isSathi ? ['#2E86AB', '#48C9B0'] : ['#A23B72', '#E056A0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.typeBadge}
          >
            <AppText style={styles.typeBadgeText}>{isSathi ? 'সাথী' : 'ছাত্র'}</AppText>
          </LinearGradient>
          <AppText style={styles.recipientMobile}>{displayMobile(item.mobile!)}</AppText>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onRemove(item._id)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={24} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );
}

export default function BatchSmsScreen() {
  const router = useRouter();
  const { account } = useAuth();
  const isAdmin = !!account?.isAdmin;
  const { selected, remove, add, isSelected, count, clear } = useBatchSmsSelection();

  const [message, setMessage] = useState(CUSTOM_USER_SMS_DEFAULT);
  const [sending, setSending] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<DirectoryEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [measuredCardHeight, setMeasuredCardHeight] = useState(0);

  const limits = useMemo(() => getCustomSmsLimits(message), [message]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardHeight = measuredCardHeight || FALLBACK_CARD_HEIGHT;
  const visibleSlots = selected.length === 0 ? 0 : Math.min(selected.length, MAX_VISIBLE_RECIPIENTS);
  const recipientsBoxHeight =
    selected.length === 0
      ? EMPTY_RECIPIENTS_HEIGHT
      : spacing.sm * 2 +
        visibleSlots * cardHeight +
        Math.max(0, visibleSlots - 1) * spacing.xs;
  const needsRecipientScroll = selected.length > MAX_VISIBLE_RECIPIENTS;

  function handleCardMeasure(height: number) {
    if (height > 0 && Math.abs(height - measuredCardHeight) > 1) {
      setMeasuredCardHeight(height);
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(home)');
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (count === 0 && !showSearch) {
      // allow empty on first load if navigated directly - show message
    }
  }, [count, showSearch]);

  useEffect(() => {
    if (!showSearch) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (!searchQ.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      api
        .get('/persons', { params: { q: searchQ.trim(), page: 1, limit: PAGE_SIZE } })
        .then((res) => setSearchResults(res.data.data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQ, showSearch]);

  function handleChange(text: string) {
    setMessage(clampCustomSmsMessage(text));
  }

  async function handleSend() {
    const trimmed = message.trim();
    if (selected.length === 0) {
      appAlert('ত্রুটি', 'কমপক্ষে একজন গ্রহীতা নির্বাচন করুন');
      return;
    }
    if (!trimmed) {
      appAlert('ত্রুটি', 'মেসেজ লিখুন');
      return;
    }
    if (limits.isOverMax) {
      appAlert('ত্রুটি', `সর্বোচ্চ ${limits.maxTotal} অক্ষর লিখতে পারবেন`);
      return;
    }

    try {
      setSending(true);
      const res = await api.post('/sms/batches', {
        recipientIds: selected.map((r) => r._id),
        message: trimmed,
      });
      setBatchId(res.data.data._id);
      setProgressVisible(true);
    } catch (err: any) {
      appAlert('ত্রুটি', err.message || 'এসএমএস পাঠাতে ব্যর্থ');
    } finally {
      setSending(false);
    }
  }

  function handleProgressDone() {
    setProgressVisible(false);
    setBatchId(null);
    clear();
    router.back();
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <BackButton />
          <AppText style={styles.title}>একসাথে এসএমএস</AppText>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardFormScroll contentContainerStyle={styles.content}>
          <View style={styles.recipientsSection}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>গ্রহীতা ({count})</AppText>
              <TouchableOpacity
                onPress={() => setShowSearch((s) => !s)}
                style={styles.addBtn}
                activeOpacity={0.75}
              >
                <Ionicons name={showSearch ? 'close' : 'person-add'} size={16} color={colors.primary} />
                <AppText style={styles.addBtnText}>
                  {showSearch ? 'বন্ধ করুন' : 'যোগ করুন'}
                </AppText>
              </TouchableOpacity>
            </View>

            {showSearch ? (
              <View style={styles.searchBlock}>
                <View style={styles.searchBar}>
                  <Ionicons name="search-outline" size={18} color={colors.textLight} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQ}
                    onChangeText={setSearchQ}
                    placeholder="নাম, মসজিদ, মোবাইল..."
                    placeholderTextColor={colors.textLight}
                    autoFocus
                  />
                  {searchQ ? (
                    <TouchableOpacity
                      onPress={() => setSearchQ('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {searchLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.sm }} />
                ) : (
                  searchResults.map((item) => {
                    const already = isSelected(item._id);
                    const noMobile = !item.mobile;
                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[styles.searchResult, already && styles.searchResultSelected]}
                        onPress={() => {
                          if (noMobile) return;
                          if (already) remove(item._id);
                          else add(item);
                        }}
                        disabled={noMobile}
                        activeOpacity={0.8}
                      >
                        <View style={styles.searchResultInfo}>
                          <AppText style={styles.searchResultName}>{item.name}</AppText>
                          <AppText style={styles.searchResultMeta}>
                            {item.type === 'sathi' ? 'সাথী' : 'ছাত্র'}
                            {item.mobile ? ` • ${displayMobile(item.mobile)}` : ' • মোবাইল নেই'}
                          </AppText>
                        </View>
                        <SelectCircleButton
                          selected={already}
                          onPress={() => {
                            if (noMobile) return;
                            if (already) remove(item._id);
                            else add(item);
                          }}
                          disabled={noMobile}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            <View style={[styles.recipientsBox, { height: recipientsBoxHeight }]}>
              {selected.length === 0 ? (
                <View style={styles.recipientsEmpty}>
                  <Ionicons name="people-outline" size={28} color={colors.textLight} />
                  <AppText style={styles.empty}>কোনো গ্রহীতা নির্বাচিত নয়</AppText>
                </View>
              ) : needsRecipientScroll ? (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.recipientsScrollContent}
                >
                  {selected.map((item, index) => (
                    <RecipientRow
                      key={item._id}
                      item={item}
                      onRemove={remove}
                      onMeasure={index === 0 ? handleCardMeasure : undefined}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.recipientsScrollContent}>
                  {selected.map((item, index) => (
                    <RecipientRow
                      key={item._id}
                      item={item}
                      onRemove={remove}
                      onMeasure={index === 0 ? handleCardMeasure : undefined}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>মেসেজ লিখুন</AppText>
            <TextInput
              value={message}
              onChangeText={handleChange}
              placeholder="এখানে মেসেজ লিখুন..."
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
              style={styles.input}
              maxLength={limits.maxTotal}
            />
            <View style={styles.metaRow}>
              <AppText style={styles.hint}>{customSmsLimitHint()}</AppText>
              <AppText
                style={[
                  styles.counter,
                  (limits.isOverWarn || limits.isOverMax) && styles.counterWarn,
                ]}
              >
                {limits.totalLength}/{limits.maxTotal}
              </AppText>
            </View>
            {limits.isOverWarn ? (
              <AppText style={styles.warn}>{CUSTOM_USER_SMS_WARN_MESSAGE}</AppText>
            ) : null}
            <AppText style={styles.notice}>
              এই মেসেজ {count} জনের মোবাইলে এসএমএস হিসেবে যাবে। আপনার কোনো টাকা কাটবে না।
            </AppText>
          </View>

          <PrimaryButton
            title={`এসএমএস পাঠান (${count} জন)`}
            onPress={handleSend}
            loading={sending}
            variant="secondary"
          />
        </KeyboardFormScroll>

        <BatchSmsProgressModal
          visible={progressVisible}
          batchId={batchId}
          onClose={() => setProgressVisible(false)}
          onDone={handleProgressDone}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: { width: 70 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  recipientsSection: {
    gap: spacing.sm,
  },
  recipientsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.16)',
    overflow: 'hidden',
    ...shadows.card,
    shadowOpacity: 0.08,
  },
  recipientsScrollContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recipientsEmpty: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 17,
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 134, 171, 0.1)',
  },
  addBtnText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  searchBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    shadowOpacity: 0.06,
  },
  searchIcon: { marginRight: 0 },
  searchInput: {
    flex: 1,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
    padding: 0,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(46, 134, 171, 0.06)',
  },
  searchResultInfo: {
    flex: 1,
    gap: 2,
  },
  searchResultName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  searchResultMeta: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 12,
    color: colors.textLight,
  },
  empty: {
    fontFamily: 'HindSiliguri_400Regular',
    color: colors.textLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sathiCard: {
    backgroundColor: '#EBF8FF',
    borderColor: 'rgba(46,134,171,0.18)',
  },
  studentCard: {
    backgroundColor: '#FDF0F7',
    borderColor: 'rgba(162,59,114,0.18)',
  },
  recipientMain: {
    flex: 1,
    gap: 4,
  },
  recipientName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 16,
    color: colors.text,
  },
  recipientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  typeBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  recipientMobile: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  removeBtn: {
    marginLeft: spacing.sm,
  },
  input: {
    minHeight: 110,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    flex: 1,
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 11,
    color: colors.textLight,
  },
  counter: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  counterWarn: {
    color: colors.secondary,
  },
  notice: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 20,
  },
  warn: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.secondary,
  },
});
