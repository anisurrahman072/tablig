import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { BigCard } from '../../components/BigCard';
import { AppText } from '../../components/AppText';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadows, spacing } from '../../theme';

export default function HomeScreen() {
  const router = useRouter();
  const { account, logout, refreshAccount } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshAccount().catch(() => {});
    }, [refreshAccount])
  );

  function handleLogout() {
    Alert.alert('বের হবেন?', 'আপনি কি সত্যিই লগআউট করতে চান?', [
      { text: 'না', style: 'cancel' },
      { text: 'হ্যাঁ, বের হন', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.premiumHeader}>
            <View style={styles.topBar}>
              <View style={styles.brandContainer}>
                <AppText style={styles.brandText}>হালকা ২৬</AppText>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <AppText style={styles.logoutText}>বের হন</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.welcomeSection}>
              <AppText style={styles.greet}>আসসালামু আলাইকুম</AppText>
              <AppText style={styles.name}>{account?.name}</AppText>
            </View>
          </View>

          <BigCard
            title="নতুন সাথী যোগ করুন"
            subtitle="জিম্মাদার সাথীর তথ্য যোগ করুন"
            colors={['#2E86AB', '#48C9B0']}
            onPress={() => router.push('/add-sathi')}
          />
          <BigCard
            title="নতুন ছাত্র যোগ করুন"
            subtitle="ছাত্রের তথ্য যোগ করুন"
            colors={['#A23B72', '#E056A0']}
            onPress={() => router.push('/add-student')}
          />
          <BigCard
            title="সাথী খুঁজুন"
            subtitle="নাম, ক্লাস, স্কুল দিয়ে খুঁজুন"
            colors={['#F18F01', '#F7B733']}
            onPress={() => router.push('/search')}
          />
          <BigCard
            title="কারগুজারি লিখুন"
            subtitle="সাক্ষাতের মেহনতের কারগুজারি লিখুন"
            colors={['#6C5CE7', '#A29BFE']}
            onPress={() => router.push('/karguzari-select')}
          />
          {account?.isAdmin ? (
            <BigCard
              title="এডমিন"
              subtitle="এডমিন অ্যাক্সেস ও মসজিদ ব্যবস্থাপনা"
              colors={['#1B4332', '#40916C']}
              onPress={() => router.push('/admin')}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  premiumHeader: {
    marginBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 134, 171, 0.2)',
    ...shadows.card,
  },
  brandText: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 16,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  logoutText: {
    fontFamily: 'HindSiliguri_600SemiBold',
    color: colors.secondary,
    fontSize: 15,
  },
  welcomeSection: {
    paddingHorizontal: 4,
  },
  greet: {
    fontFamily: 'HindSiliguri_500Medium',
    fontSize: 15,
    color: colors.textLight,
  },
  name: {
    fontFamily: 'HindSiliguri_700Bold',
    fontSize: 28,
    color: colors.text,
    marginTop: -6,
  },
});
