import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SNEmpty } from '@/components/SNEmpty';
import { useTabBarClearance } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

export default function LandlordPaymentsScreen() {
  const colors = useColors();
  const tabBarClearance = useTabBarClearance();
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: tabBarClearance }]}>
      <SNEmpty
        title="Payment status is not connected"
        body="Razorpay Route onboarding and verified lease payment status are not configured yet. No payment collection is available from this screen."
        meta="No money movement is enabled"
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, paddingHorizontal: 20 } });
