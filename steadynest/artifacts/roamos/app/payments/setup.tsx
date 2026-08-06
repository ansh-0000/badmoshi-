import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';

export default function PaymentSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { user, activeLease, setActiveLease } = useApp();

  const [loading, setLoading] = useState(false);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const handleRetry = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const effectiveListingId = listingId || activeLease?.listingId;
    if (!effectiveListingId) {
      Alert.alert('Missing Listing', 'We could not find which property this autopay mandate is for. Please retry from your lease.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payments/subscribe', {
        userId: user?.id,
        listingId: effectiveListingId,
      });

      const result = await WebBrowser.openAuthSessionAsync(data.url, 'roamos://payment');

      if (result.type === 'success' && result.url?.includes('/success')) {
        setActiveLease({
          ...activeLease,
          listingId: effectiveListingId,
          status: 'active',
        });
        Alert.alert('Success', 'Autopay is set up and your rent is paid!');
        router.back();
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User backed out of Stripe Checkout — stay on this screen.
      } else {
        Alert.alert('Payment Incomplete', 'The payment was not completed. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Payment Setup Failed', toFriendlyError(err, 'Could not start checkout. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset, paddingBottom: bottomInset }]}>
      <LinearGradient
        colors={[colors.primary + '10', 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Manage Autopay</Text>
      </View>

      <View style={styles.content}>
        {activeLease?.status === 'active' ? (
          <View style={[styles.cardPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 3 }}>Autopay via Stripe</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.primary }}>Active mandate</Text>
              </View>
              <Feather name="check-circle" size={30} color={colors.primary} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 18 }} />
            <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, lineHeight: 20 }}>
              Next auto-deduction of ₹{activeLease.rent?.toLocaleString('en-IN')} is scheduled for {activeLease.dueDate}.
            </Text>

            <TouchableOpacity
              style={[styles.btn, styles.btnOutline, { borderColor: colors.destructive, marginTop: 24 }]}
              onPress={() => {
                setActiveLease({ ...activeLease, status: 'failed' });
                Alert.alert('Autopay Cancelled', 'Your mandate has been revoked.');
                router.back();
              }}
            >
              <Text style={[styles.btnText, { color: colors.destructive }]}>Cancel Autopay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.statusCard, { backgroundColor: 'rgba(168,82,50,0.07)', borderColor: 'rgba(168,82,50,0.28)' }]}>
              <View style={styles.statusHeaderRow}>
                <View style={[styles.statusIcon, { backgroundColor: 'rgba(168,82,50,0.12)' }]}>
                  <Feather name="alert-circle" size={20} color={colors.destructive} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, { color: colors.foreground }]}>No active autopay</Text>
                  <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
                    Your last attempt didn't complete
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.detailEyebrow, { color: colors.mutedForeground }]}>WHAT HAPPENS NEXT</Text>
              {[
                { icon: 'external-link' as const, text: 'You\'ll be taken to a secure Stripe Checkout page' },
                { icon: 'credit-card' as const, text: 'Enter your card or UPI details there' },
                { icon: 'repeat' as const, text: 'Rent is then collected automatically each month' },
              ].map((step, i) => (
                <View key={i} style={[styles.stepRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[styles.stepIcon, { backgroundColor: colors.muted }]}>
                    <Feather name={step.icon} size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.stepText, { color: colors.foreground }]}>{step.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.secureNote}>
              <Feather name="lock" size={13} color={colors.mutedForeground} />
              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                SteadyNest never stores your raw card number.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleRetry}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Set up autopay</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  statusCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
  },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  statusSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  detailCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailEyebrow: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  disclaimer: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  cardPreview: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
  },
  btn: {
    paddingVertical: 17,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  }
});
