import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { AppText } from './AppText';
import { appAlert } from '../lib/appAlert';
import { mobileForDial } from '../lib/mobile';

type ActionKey = 'whatsapp' | 'call' | 'sms';

type Props = {
  mobile: string;
  isAdmin?: boolean;
  onSmsPress?: () => void;
};

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    appAlert('ত্রুটি', 'এই কাজটি সম্পন্ন করা যায়নি');
  }
}

async function openWhatsApp(digits: string) {
  const appUrl = `whatsapp://send?phone=${digits}`;
  const webUrl = `https://wa.me/${digits}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  } catch {
    await openUrl(webUrl);
  }
}

const BASE_ACTIONS: Array<{
  key: ActionKey;
  label: string;
  icon: 'logo-whatsapp' | 'call' | 'chatbubble';
  colors: [string, string];
  labelColor: string;
  iconColor: string;
}> = [
  {
    key: 'whatsapp',
    label: 'হোয়াটসঅ্যাপ',
    icon: 'logo-whatsapp',
    colors: ['#25D366', '#128C7E'],
    labelColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  {
    key: 'call',
    label: 'কল দিন',
    icon: 'call',
    colors: ['#2E86AB', '#48C9B0'],
    labelColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
];

const SMS_ACTION = {
  key: 'sms' as const,
  label: 'এসএমএস',
  icon: 'chatbubble' as const,
  colors: ['#F7971E', '#FFD200'] as [string, string],
  labelColor: '#3D2914',
  iconColor: '#3D2914',
};

export function ContactQuickActions({ mobile, isAdmin, onSmsPress }: Props) {
  const digits = mobileForDial(mobile);
  if (!digits) return null;

  const actions = isAdmin ? [...BASE_ACTIONS, SMS_ACTION] : BASE_ACTIONS;

  function handleAction(action: ActionKey) {
    if (action === 'sms') {
      onSmsPress?.();
      return;
    }
    if (action === 'whatsapp') {
      openWhatsApp(digits!);
    } else {
      openUrl(`tel:+${digits}`);
    }
  }

  return (
    <View style={styles.strip}>
      <View style={styles.row}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            activeOpacity={0.88}
            onPress={() => handleAction(action.key)}
            style={styles.btnWrap}
          >
            <LinearGradient
              colors={action.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Ionicons name={action.icon} size={13} color={action.iconColor} style={styles.icon} />
              <AppText
                style={[styles.label, { color: action.labelColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {action.label}
              </AppText>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(46, 134, 171, 0.14)',
  },
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  btnWrap: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#1A3D52',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 3,
    minHeight: 32,
  },
  icon: {
    marginRight: 3,
  },
  label: {
    flexShrink: 1,
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },
});
