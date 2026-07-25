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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginBottom: 4 }}>Autopay via Stripe</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.signalGreen }}>Active Mandate</Text>
              </View>
              <Feather name="check-circle" size={32} color={colors.signalGreen} />
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
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
            <View style={[styles.cardPreview, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="credit-card" size={40} color={colors.primary} />
              <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.foreground, marginTop: 16, textAlign: 'center' }}>
                Your last autopay attempt failed
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
                Retry with a fresh Stripe Checkout session
              </Text>
            </View>

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              You'll be taken to a secure Stripe Checkout page to re-enter your card or UPI details. SteadyNest never stores your raw card number.
            </Text>

            <View style={styles.actions}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Retry Payment</Text>
                </TouchableOpacity>
              )}
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  cardPreview: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  disclaimer: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
    gap: 16,
  },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  }
});
