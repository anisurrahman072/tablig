import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PremiumModal } from "./PremiumModal";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";
import api from "../lib/api";
import { SingleSmsLog } from "../lib/directory";
import { displayMobile } from "../lib/mobile";
import { colors, radius, spacing } from "../theme";

type Props = {
  visible: boolean;
  log: SingleSmsLog | null;
  onClose: () => void;
  onResent?: () => void;
};

export function SingleSmsDetailModal({
  visible,
  log,
  onClose,
  onResent,
}: Props) {
  const [resending, setResending] = useState(false);
  const [result, setResult] = useState<SingleSmsLog | null>(null);

  function handleClose() {
    setResult(null);
    onClose();
  }

  async function handleResend() {
    if (!log) return;
    try {
      setResending(true);
      const res = await api.post(`/sms/history/logs/${log._id}/resend`);
      setResult(res.data.data);
      onResent?.();
    } catch {
      // handled by api interceptor
    } finally {
      setResending(false);
    }
  }

  const active = result || log;
  const isFailed = active?.status === "failed";

  return (
    <PremiumModal
      visible={visible}
      title="একক এসএমএস"
      onClose={handleClose}
      scrollable={false}
      contentStyle={styles.modalContent}
    >
      {!active ? null : (
        <View style={styles.body}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollInner}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.statusRow, isFailed && styles.statusRowFail]}>
              <Ionicons
                name={isFailed ? "close-circle" : "checkmark-circle"}
                size={22}
                color={isFailed ? "#E74C3C" : "#27AE60"}
              />
              <AppText
                style={[styles.statusText, isFailed && styles.statusTextFail]}
              >
                {isFailed ? "ব্যর্থ" : "সফল"}
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText style={styles.label}>গ্রহীতা</AppText>
              <AppText style={styles.value}>{active.recipientName}</AppText>
              <AppText style={styles.mobile}>
                {displayMobile(active.recipientMobile)}
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText style={styles.label}>বার্তা</AppText>
              <AppText style={styles.message}>{active.message}</AppText>
            </View>

            {active.sender?.name ? (
              <View style={styles.field}>
                <AppText style={styles.label}>পাঠিয়েছেন</AppText>
                <AppText style={styles.value}>{active.sender.name}</AppText>
              </View>
            ) : null}

            {isFailed && active.errorMessage ? (
              <View style={styles.errorBox}>
                <AppText style={styles.errorText}>
                  {active.errorMessage}
                </AppText>
              </View>
            ) : null}

            {result ? (
              <View
                style={[
                  styles.resultBox,
                  isFailed ? styles.resultBoxFail : styles.resultBoxOk,
                ]}
              >
                <AppText style={styles.resultText}>
                  {isFailed
                    ? "পুনরায় পাঠানো ব্যর্থ হয়েছে"
                    : "পুনরায় পাঠানো সফল হয়েছে"}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title={isFailed ? "পুনরায় পাঠান" : "আবার পাঠান"}
              onPress={handleResend}
              loading={resending}
              variant={isFailed ? "secondary" : "primary"}
            />

            <TouchableOpacity
              onPress={handleClose}
              style={styles.doneBtn}
              activeOpacity={0.82}
            >
              <AppText style={styles.doneText}>ঠিক আছে</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </PremiumModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  contentScroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  contentScrollInner: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: "rgba(39, 174, 96, 0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusRowFail: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  statusText: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 14,
    color: "#27AE60",
  },
  statusTextFail: {
    color: "#E74C3C",
  },
  field: {
    gap: 4,
  },
  label: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 12,
    color: colors.textLight,
  },
  value: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 15,
    color: colors.text,
  },
  mobile: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 14,
    color: colors.primary,
  },
  message: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    backgroundColor: "rgba(231, 76, 60, 0.08)",
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 13,
    color: "#E74C3C",
  },
  resultBox: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  resultBoxOk: {
    backgroundColor: "rgba(39, 174, 96, 0.1)",
  },
  resultBoxFail: {
    backgroundColor: "rgba(231, 76, 60, 0.1)",
  },
  resultText: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
  },
  doneBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: "#FFF0D9",
    borderWidth: 1,
    borderColor: "rgba(241, 143, 1, 0.35)",
  },
  doneText: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 16,
    color: colors.accent,
  },
});
