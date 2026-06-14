import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumModal } from './PremiumModal';
import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';
import api from '../lib/api';
import { appAlert } from '../lib/appAlert';
import { displayMobile } from '../lib/mobile';
import {
  clampCustomSmsMessage,
  CUSTOM_USER_SMS_DEFAULT,
  CUSTOM_USER_SMS_WARN_MESSAGE,
  customSmsLimitHint,
  getCustomSmsLimits,
} from '../lib/smsLimits';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  personMobile: string;
};

export function AdminSmsModal({
  visible,
  onClose,
  personId,
  personName,
  personMobile,
}: Props) {
  const [message, setMessage] = useState(CUSTOM_USER_SMS_DEFAULT);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage(CUSTOM_USER_SMS_DEFAULT);
      setSending(false);
    } else {
      setMessage('');
      setSending(false);
    }
  }, [visible]);

  const limits = useMemo(() => getCustomSmsLimits(message), [message]);

  function handleChange(text: string) {
    setMessage(clampCustomSmsMessage(text));
  }

  async function handleSend() {
    const trimmed = message.trim();
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
      await api.post(`/persons/${personId}/sms`, { message: trimmed });
      appAlert('সফল', 'এসএমএস পাঠানো হয়েছে');
      onClose();
    } catch (err: any) {
      appAlert('ত্রুটি', err.message || 'এসএমএস পাঠাতে ব্যর্থ');
    } finally {
      setSending(false);
    }
  }

  return (
    <PremiumModal visible={visible} title="এসএমএস পাঠান" onClose={onClose} keyboardAware>
      <View style={styles.body}>
        <View style={styles.recipientCard}>
          <View style={styles.recipientRow}>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
            <View style={styles.recipientText}>
              <AppText style={styles.recipientName}>{personName}</AppText>
              <AppText style={styles.recipientMobile}>{displayMobile(personMobile)}</AppText>
            </View>
          </View>
        </View>

        <View>
          <AppText style={styles.inputLabel}>আপনার মেসেজ লিখুন</AppText>
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
        </View>

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
          এই মেসেজটি {personName} ভাইয়ের মোবাইলে এসএমএস হিসেবে যাবে। আপনার কোনো টাকা কাটবে না।
        </AppText>

        <PrimaryButton
          title="এসএমএস পাঠান"
          onPress={handleSend}
          loading={sending}
          variant="secondary"
        />
      </View>
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  recipientCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.15)',
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recipientText: {
    flex: 1,
    gap: 2,
  },
  recipientName: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 17,
    color: colors.text,
  },
  recipientMobile: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  inputLabel: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
  },
  warn: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 13,
    color: colors.secondary,
  },
});
