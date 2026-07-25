import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';

export default function BookingInvoiceScreen() {
  const { id, guests, suite, basePrice, title } = useLocalSearchParams<{ id: string, guests: string, suite: string, basePrice: string, title: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!title || !basePrice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Invalid booking details.</Text>
      </View>
    );
  }

  const parsedBase = parseInt(basePrice, 10);
  const gst = Math.round(parsedBase * 0.18);
  const securityDeposit = 5000;
  const platformFee = 499;
  const total = parsedBase + gst + securityDeposit + platformFee;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/booking/payment',
      params: {
        id,
        total,
        title,
      }
    });
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Review Invoice</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.propertyInfo}>
          <Text style={[styles.propertyName, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.bookingMeta, { color: colors.mutedForeground }]}>
            {guests} Guest(s) • {suite === 'premium' ? 'Premium Master' : suite === 'deluxe' ? 'Deluxe Suite' : 'Standard Suite'}
          </Text>
        </View>

        {/* Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.receiptHeader}>
            <MaterialCommunityIcons name="receipt" size={24} color={colors.primary} />
            <Text style={[styles.receiptTitle, { color: colors.foreground }]}>Payment Breakdown</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.lineItem}>
            <Text style={[styles.lineItemLabel, { color: colors.mutedForeground }]}>Base Rent (1 Month)</Text>
            <Text style={[styles.lineItemValue, { color: colors.foreground }]}>₹{parsedBase.toLocaleString('en-IN')}</Text>
          </View>
          
          <View style={styles.lineItem}>
            <Text style={[styles.lineItemLabel, { color: colors.mutedForeground }]}>Taxes (GST 18%)</Text>
            <Text style={[styles.lineItemValue, { color: colors.foreground }]}>₹{gst.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.lineItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.lineItemLabel, { color: colors.mutedForeground }]}>Security Deposit</Text>
              <Feather name="info" size={12} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.lineItemValue, { color: colors.foreground }]}>₹{securityDeposit.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.lineItem}>
            <Text style={[styles.lineItemLabel, { color: colors.mutedForeground }]}>Platform Fee</Text>
            <Text style={[styles.lineItemValue, { color: colors.foreground }]}>₹{platformFee.toLocaleString('en-IN')}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, borderStyle: 'dashed', borderWidth: 1, height: 0 }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total Due Now</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        <View style={[styles.securityNote, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
          <Feather name="shield" size={16} color={colors.accent} />
          <Text style={[styles.securityText, { color: colors.foreground }]}>
            Security deposit is fully refundable upon checkout, subject to property inspection.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleNext}>
          <Text style={styles.primaryBtnText}>Proceed to Payment</Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
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
  propertyInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  propertyName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  bookingMeta: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
  },
  receiptCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 20,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lineItemLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  lineItemValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  totalValue: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
  },
  securityNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
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
