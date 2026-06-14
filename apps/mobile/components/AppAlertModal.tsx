import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { colors, radius, shadows, spacing } from '../theme';

export type AlertType = 'success' | 'error' | 'confirm' | 'info';

export type AppAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  type: AlertType;
  buttons: AppAlertButton[];
  onDismiss: () => void;
};

const TYPE_CONFIG: Record<
  AlertType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    gradient: [string, string];
    tint: string;
    ring: string;
  }
> = {
  success: {
    icon: 'checkmark-circle',
    gradient: ['#48C9B0', '#2E86AB'],
    tint: '#E8F8F5',
    ring: 'rgba(72, 201, 176, 0.25)',
  },
  error: {
    icon: 'close-circle',
    gradient: ['#FF7675', '#E17055'],
    tint: '#FFF0EE',
    ring: 'rgba(255, 118, 117, 0.25)',
  },
  confirm: {
    icon: 'help-circle',
    gradient: ['#FDCB6E', '#F18F01'],
    tint: '#FFF8E8',
    ring: 'rgba(253, 203, 110, 0.28)',
  },
  info: {
    icon: 'information-circle',
    gradient: ['#74B9FF', '#2E86AB'],
    tint: '#EBF5FB',
    ring: 'rgba(46, 134, 171, 0.22)',
  },
};

function inferAlertType(title: string, buttons: AppAlertButton[]): AlertType {
  if (title === 'সফল') return 'success';
  if (title === 'ত্রুটি') return 'error';
  if (buttons.some((b) => b.style === 'destructive') || title.includes('?')) return 'confirm';
  if (buttons.length > 1) return 'confirm';
  return 'info';
}

export function inferTypeFromAlert(title: string, buttons: AppAlertButton[] = []): AlertType {
  return inferAlertType(title, buttons);
}

export function AppAlertModal({ visible, title, message, type, buttons, onDismiss }: Props) {
  const config = TYPE_CONFIG[type];
  const resolvedButtons =
    buttons.length > 0 ? buttons : [{ text: 'ঠিক আছে', style: 'default' as const }];

  function handlePress(button: AppAlertButton) {
    onDismiss();
    button.onPress?.();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.cardWrap} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['#FFFFFF', config.tint, '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={[styles.iconRing, { backgroundColor: config.ring }]}>
              <LinearGradient colors={config.gradient} style={styles.iconBadge}>
                <Ionicons name={config.icon} size={34} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <AppText style={styles.title}>{title}</AppText>
            {message ? <AppText style={styles.message}>{message}</AppText> : <View style={styles.messageSpacer} />}

            <View style={[styles.actions, resolvedButtons.length > 1 && styles.actionsRow]}>
              {resolvedButtons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';

                if (isCancel) {
                  return (
                    <TouchableOpacity
                      key={`${button.text}-${index}`}
                      style={[styles.actionBtn, styles.cancelBtn, resolvedButtons.length > 1 && styles.actionHalf]}
                      onPress={() => handlePress(button)}
                      activeOpacity={0.85}
                    >
                      <AppText
                        style={[
                          styles.cancelText,
                          resolvedButtons.length > 1 && styles.actionTextCompact,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {button.text}
                      </AppText>
                    </TouchableOpacity>
                  );
                }

                const btnGradient: [string, string] = isDestructive
                  ? ['#FF7675', '#D63031']
                  : config.gradient;

                return (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[styles.actionBtn, resolvedButtons.length > 1 && styles.actionHalf]}
                    onPress={() => handlePress(button)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={btnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.primaryBtn,
                        resolvedButtons.length > 1 && styles.primaryBtnCompact,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.primaryText,
                          resolvedButtons.length > 1 && styles.actionTextCompact,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {button.text}
                      </AppText>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(26, 43, 60, 0.52)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    ...shadows.card,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontFamily: 'HindSiliguri_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  messageSpacer: {
    height: spacing.sm,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionBtn: {
    width: '100%',
  },
  actionHalf: {
    flex: 1,
    minWidth: 0,
  },
  primaryBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnCompact: {
    paddingHorizontal: spacing.sm,
  },
  primaryText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cancelBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 48,
  },
  cancelText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  actionTextCompact: {
    fontSize: 14,
    width: '100%',
  },
});
