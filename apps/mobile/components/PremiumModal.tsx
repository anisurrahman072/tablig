import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "./AppText";
import { colors, radius, shadows, spacing } from "../theme";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  /** Lifts sheet above keyboard when typing (iOS + Android Modal). */
  keyboardAware?: boolean;
  /** When true, wraps children in a scroll view. When false, children manage their own scroll areas. */
  scrollable?: boolean;
};

const TOP_GAP = 24;

export function PremiumModal({
  visible,
  title,
  onClose,
  onConfirm,
  confirmLabel = "ঠিক আছে",
  children,
  contentStyle,
  keyboardAware = false,
  scrollable,
}: Props) {
  const useOuterScroll =
    scrollable === true || (keyboardAware && scrollable !== false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible || !keyboardAware) {
      setKeyboardHeight(0);
      return;
    }
    const metrics = Keyboard.metrics();
    if (metrics?.height) {
      setKeyboardHeight(metrics.height);
    }
    // Android Modal ignores adjustResize — must lift the sheet manually on both platforms.
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardAware]);

  const bottomPad = Math.max(insets.bottom, spacing.md);
  const sheetHeight = windowHeight * 0.78;
  const keyboardOpen = keyboardHeight > 0;

  const sheetStyle = (() => {
    if (useOuterScroll) {
      return keyboardOpen
        ? {
            height: windowHeight - keyboardHeight - TOP_GAP,
            maxHeight: windowHeight - keyboardHeight - TOP_GAP,
            marginBottom: keyboardHeight,
            paddingBottom: spacing.md,
          }
        : {
            height: sheetHeight,
            maxHeight: sheetHeight,
            paddingBottom: bottomPad,
          };
    }
    if (keyboardOpen) {
      const availH = Math.min(
        sheetHeight,
        windowHeight - keyboardHeight - TOP_GAP,
      );
      return {
        height: availH,
        maxHeight: availH,
        marginBottom: keyboardHeight,
        paddingBottom: bottomPad,
      };
    }
    return {
      height: sheetHeight,
      maxHeight: sheetHeight,
      paddingBottom: bottomPad,
    };
  })();

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop — tapping outside the sheet closes the modal */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            useOuterScroll && styles.sheetScrollable,
            sheetStyle,
          ]}
        >
          <LinearGradient
            colors={[colors.primary, "#48C9B0", colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {onConfirm ? (
              <TouchableOpacity
                onPress={onConfirm}
                hitSlop={12}
                style={styles.headerSide}
              >
                <AppText style={styles.confirm}>{confirmLabel}</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSide} />
            )}
            <AppText style={styles.title} numberOfLines={1}>
              {title}
            </AppText>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={[styles.headerSide, styles.closeSide]}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>

          {useOuterScroll ? (
            <ScrollView
              style={styles.scrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              nestedScrollEnabled
              contentContainerStyle={[
                styles.scrollContent,
                contentStyle,
                { paddingBottom: spacing.xl },
              ]}
            >
              {children}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.content,
                !useOuterScroll && styles.contentFill,
                contentStyle,
              ]}
            >
              {children}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(26, 43, 60, 0.55)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    maxHeight: "78%",
    ...shadows.card,
  },
  sheetScrollable: {
    flexDirection: "column",
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerSide: {
    minWidth: 64,
  },
  closeSide: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
    textAlign: "center",
  },
  confirm: {
    fontFamily: "HindSiliguri_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  content: {
    backgroundColor: colors.background,
  },
  contentFill: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    backgroundColor: colors.background,
  },
});
