import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PremiumModal } from "./PremiumModal";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";
import api from "../lib/api";
import { BatchSmsLog } from "../lib/directory";
import { displayMobile } from "../lib/mobile";
import { colors, radius, spacing } from "../theme";

type Props = {
  visible: boolean;
  batchId: string | null;
  onClose: () => void;
  onDone?: () => void;
  title?: string;
};

const POLL_MS = 800;
const LIST_ROW_GAP = 6;

type RecipientRowProps = {
  name: string;
  mobile: string;
  status: "sent" | "failed";
  error?: string;
};

function RecipientListBox({
  title,
  titleStyle,
  recipients,
  status,
}: {
  title: string;
  titleStyle?: object;
  recipients: {
    _id?: string;
    name: string;
    mobile: string;
    errorMessage?: string;
  }[];
  status: "sent" | "failed";
}) {
  if (recipients.length === 0) return null;

  return (
    <View style={styles.listBox}>
      <AppText style={[styles.listTitle, titleStyle]}>{title}</AppText>
      <View style={styles.listContent}>
        {recipients.map((r) => (
          <RecipientRow
            key={r._id || r.mobile}
            name={r.name}
            mobile={r.mobile}
            status={status}
            error={r.errorMessage}
          />
        ))}
      </View>
    </View>
  );
}

export function BatchSmsProgressModal({
  visible,
  batchId,
  onClose,
  onDone,
  title = "এসএমএস পাঠানো হচ্ছে",
}: Props) {
  const [batch, setBatch] = useState<BatchSmsLog | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [resendingAll, setResendingAll] = useState(false);
  const [resendBatchId, setResendBatchId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchBatch(id: string) {
    const res = await api.get(`/sms/batches/${id}`);
    setBatch(res.data.data);
    return res.data.data as BatchSmsLog;
  }

  useEffect(() => {
    if (!visible || !batchId) {
      setBatch(null);
      setRetrying(false);
      setResendingAll(false);
      setResendBatchId(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    fetchBatch(batchId).catch(() => {});

    pollRef.current = setInterval(() => {
      fetchBatch(batchId)
        .then((data) => {
          if (["completed", "partial", "failed"].includes(data.status)) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        })
        .catch(() => {});
    }, POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [visible, batchId]);

  const isProcessing =
    batch?.status === "pending" || batch?.status === "processing";
  const progress = batch
    ? Math.round(
        ((batch.sentCount + batch.failedCount + batch.skippedCount) /
          batch.totalRecipients) *
          100,
      )
    : 0;
  const failedRecipients =
    batch?.recipients.filter((r) => r.status === "failed") ?? [];
  const sentRecipients =
    batch?.recipients.filter((r) => r.status === "sent") ?? [];

  async function handleRetry() {
    if (!batchId) return;
    try {
      setRetrying(true);
      await api.post(`/sms/batches/${batchId}/retry`);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchBatch(batchId!).catch(() => {});
      }, POLL_MS);
    } catch {
      // error handled by api interceptor
    } finally {
      setRetrying(false);
    }
  }

  async function handleResendAll() {
    if (!batchId) return;
    try {
      setResendingAll(true);
      const res = await api.post(`/sms/batches/${batchId}/resend`);
      const newBatchId = res.data.data._id as string;
      setResendBatchId(newBatchId);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchBatch(newBatchId)
          .then((data) => {
            setBatch(data);
            if (["completed", "partial", "failed"].includes(data.status)) {
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            }
          })
          .catch(() => {});
      }, POLL_MS);
    } catch {
      // error handled by api interceptor
    } finally {
      setResendingAll(false);
    }
  }

  function handleClose() {
    if (isProcessing) return;
    onDone?.();
    onClose();
  }

  return (
    <PremiumModal
      visible={visible}
      title={title}
      onClose={handleClose}
      scrollable={false}
      contentStyle={styles.modalContent}
    >
      <View style={styles.body}>
        {!batch ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText style={styles.loadingText}>প্রস্তুত হচ্ছে...</AppText>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollInner}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <AppText style={styles.progressLabel}>
                    {isProcessing ? "পাঠানো হচ্ছে..." : "সম্পন্ন"}
                  </AppText>
                  <AppText style={styles.progressPct}>{progress}%</AppText>
                </View>
                <View style={styles.progressTrack}>
                  <LinearGradient
                    colors={["#2E86AB", "#48C9B0"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
                <View style={styles.statsRow}>
                  <StatPill
                    icon="checkmark-circle"
                    color="#27AE60"
                    label={`${batch.sentCount} সফল`}
                  />
                  <StatPill
                    icon="close-circle"
                    color="#E74C3C"
                    label={`${batch.failedCount} ব্যর্থ`}
                  />
                  <StatPill
                    icon="people"
                    color={colors.primary}
                    label={`${batch.totalRecipients} মোট`}
                  />
                </View>
              </View>

              <View style={styles.messageField}>
                <AppText style={styles.messageLabel}>বার্তা</AppText>
                <AppText style={styles.messageText}>{batch.message}</AppText>
              </View>

              <RecipientListBox
                title="সফলভাবে পাঠানো"
                recipients={sentRecipients}
                status="sent"
              />

              <RecipientListBox
                title="ব্যর্থ হয়েছে"
                titleStyle={styles.listTitleFail}
                recipients={failedRecipients}
                status="failed"
              />

              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <AppText style={styles.processingText}>
                    অন্যান্য গ্রহীতাদের জন্য অপেক্ষা করুন...
                  </AppText>
                </View>
              ) : null}
            </ScrollView>

            {!isProcessing ? (
              <View style={styles.footer}>
                {failedRecipients.length > 0 ? (
                  <PrimaryButton
                    title="ব্যর্থদের পুনরায় পাঠান"
                    onPress={handleRetry}
                    loading={retrying}
                    variant="secondary"
                  />
                ) : null}

                {!resendBatchId ? (
                  <PrimaryButton
                    title="সবাইকে আবার পাঠান"
                    onPress={handleResendAll}
                    loading={resendingAll}
                    variant="outline"
                  />
                ) : null}

                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.doneBtn}
                  activeOpacity={0.82}
                >
                  <AppText style={styles.doneText}>ঠিক আছে</AppText>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </View>
    </PremiumModal>
  );
}

function StatPill({
  icon,
  color,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={14} color={color} />
      <AppText style={styles.statText}>{label}</AppText>
    </View>
  );
}

function RecipientRow({ name, mobile, status, error }: RecipientRowProps) {
  return (
    <View
      style={[
        styles.recipientRow,
        status === "failed" && styles.recipientRowFail,
      ]}
    >
      <Ionicons
        name={status === "sent" ? "checkmark-circle" : "close-circle"}
        size={20}
        color={status === "sent" ? "#27AE60" : "#E74C3C"}
      />
      <View style={styles.recipientInfo}>
        <AppText style={styles.recipientName}>{name}</AppText>
        <AppText style={styles.recipientMobile}>
          {displayMobile(mobile)}
        </AppText>
        {error ? (
          <AppText style={styles.recipientError}>{error}</AppText>
        ) : null}
      </View>
    </View>
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: "HindSiliguri_400Regular",
    color: colors.textLight,
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 15,
    color: colors.text,
  },
  progressPct: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 15,
    color: colors.primary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(46, 134, 171, 0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statText: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 12,
    color: colors.text,
  },
  messageField: {
    gap: 4,
  },
  messageLabel: {
    fontFamily: "HindSiliguri_600SemiBold",
    fontSize: 12,
    color: colors.textLight,
  },
  messageText: {
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
  listBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(46, 134, 171, 0.14)",
    overflow: "hidden",
  },
  listTitle: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 13,
    color: "#27AE60",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  listTitleFail: {
    color: "#E74C3C",
  },
  listContent: {
    padding: spacing.sm,
    gap: LIST_ROW_GAP,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(39, 174, 96, 0.15)",
  },
  recipientRowFail: {
    borderColor: "rgba(231, 76, 60, 0.15)",
  },
  recipientInfo: {
    flex: 1,
    gap: 2,
  },
  recipientName: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 14,
    color: colors.text,
  },
  recipientMobile: {
    fontFamily: "HindSiliguri_500Medium",
    fontSize: 13,
    color: colors.primary,
  },
  recipientError: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 11,
    color: "#E74C3C",
    marginTop: 2,
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  processingText: {
    fontFamily: "HindSiliguri_400Regular",
    fontSize: 13,
    color: colors.textLight,
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
