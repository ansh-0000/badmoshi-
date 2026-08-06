import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface PaymentAlertProps {
  amount: number;
  dueDate: string;
  listingId?: string;
}

export default function PaymentAlert({ amount, dueDate, listingId }: PaymentAlertProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={20} color={colors.destructive} />
        <Text style={[styles.title, { color: colors.destructive }]}>Payment Failed</Text>
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>
        We couldn't process your autopay of ₹{amount.toLocaleString('en-IN')} for {dueDate}.
        Please update your payment method to avoid late fees.
      </Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.destructive }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: '/payments/setup', params: { listingId: listingId || '' } } as any);
        }}
      >
        <Text style={[styles.btnText, { color: colors.destructiveForeground }]}>Update Payment Method</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
