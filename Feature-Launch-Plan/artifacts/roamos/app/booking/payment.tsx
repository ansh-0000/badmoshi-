import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit / Debit Card', icon: 'credit-card', subtitle: 'Visa, MasterCard, Amex' },
  { id: 'upi', name: 'UPI', icon: 'smartphone', subtitle: 'Google Pay, PhonePe, Paytm' },
];

export default function BookingPaymentScreen() {
  const { id, total, title } = useLocalSearchParams<{ id: string, total: string, title: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setActiveLease, setAutopayEnabled } = useApp();

  const [selectedMethod, setSelectedMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);

    try {
      const { data } = await api.post('/payments/subscribe', {
        userId: user?.id,
        listingId: id,
      });

      const result = await WebBrowser.openAuthSessionAsync(data.url, 'roamos://payment');

      if (result.type === 'success' && result.url?.includes('/success')) {
        setActiveLease({
          property: title,
          listingId: id,
          rent: parseInt(total || '0', 10),
          dueDate: 'the 1st of next month',
          status: 'active',
        });
        setAutopayEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.dismissAll();
        router.push('/');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // User backed out of Stripe Checkout — stay on this screen, no error needed.
      } else {
        Alert.alert('Payment Incomplete', 'The payment was not completed. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Payment Setup Failed', toFriendlyError(err, 'Could not start checkout. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.totalHeader}>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Amount to Pay</Text>
          <Text style={[styles.totalValue, { color: colors.foreground }]}>₹{parseInt(total || '0').toLocaleString('en-IN')}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Payment Method</Text>

        <View style={styles.methodsList}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                {
                  backgroundColor: selectedMethod === method.id ? colors.primary + '10' : colors.card,
                  borderColor: selectedMethod === method.id ? colors.primary : colors.border
                }
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedMethod(method.id);
              }}
              disabled={loading}
            >
              <View style={[styles.methodIcon, { backgroundColor: selectedMethod === method.id ? colors.primary : colors.muted }]}>
                <Feather name={method.icon as any} size={20} color={selectedMethod === method.id ? '#FFF' : colors.foreground} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodName, { color: colors.foreground }]}>{method.name}</Text>
                <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>{method.subtitle}</Text>
              </View>
              <View style={styles.radioWrapper}>
                <View style={[
                  styles.radio, 
                  { 
                    borderColor: selectedMethod === method.id ? colors.primary : colors.mutedForeground,
                    backgroundColor: selectedMethod === method.id ? colors.primary : 'transparent'
                  }
                ]}>
                  {selectedMethod === method.id && <Feather name="check" size={12} color="#FFF" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]} 
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Confirm Booking</Text>
              <Feather name="check-circle" size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  totalHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.05)', // extremely subtle green
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  methodsList: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  methodSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  radioWrapper: {
    paddingLeft: 16,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
