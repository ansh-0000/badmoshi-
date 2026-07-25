import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { API_BASE } from '@/constants/api';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import PaymentAlert from '@/components/PaymentAlert';

export default function MeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, activeRole, toggleRole, theme, setTheme, activeLease } = useApp();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // Mocks for Dashboard Stats
  const mockTenantLease = activeLease || {
    property: 'The Hive Coliving',
    listingId: undefined as string | undefined,
    rent: 18500,
    dueDate: '5th Aug, 2026',
    status: 'active', // 'active', 'failed'
  };

  const mockLandlordStats = {
    properties: 3,
    occupancy: '100%',
    revenue: 55000,
    pendingInquiries: 2,
  };

  const handleManageAutopay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'guest', amount: mockTenantLease.rent })
      });
      const data = await res.json();
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetupPayouts = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/api/payments/connect-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email || 'guest@steadynest.com' })
      });
      const data = await res.json();
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '30', colors.primary + '10', 'transparent']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + 20,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90),
          },
        ]}
      >
        {/* Segmented Role Switcher */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.card, padding: 4, borderRadius: 9999, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: activeRole === 'tenant' ? colors.primary : 'transparent', borderRadius: 9999 }}
            onPress={() => { if(activeRole !== 'tenant') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleRole(); } }}
          >
            <Text style={{ color: activeRole === 'tenant' ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Tenant View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: activeRole === 'landlord' ? colors.primary : 'transparent', borderRadius: 9999 }}
            onPress={() => { if(activeRole !== 'landlord') { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleRole(); } }}
          >
            <Text style={{ color: activeRole === 'landlord' ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Landlord View</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header Card */}
        <View style={[styles.profileHeaderCard, { backgroundColor: colors.card, shadowColor: colors.primary }]}>
          <View style={[styles.avatarContainer, { borderColor: colors.background, borderWidth: 4 }]}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?u=' + (user?.id || 'guest') }} 
              style={styles.avatar} 
            />
            <View style={[styles.onlineBadge, { backgroundColor: '#10B981', borderColor: colors.card }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name || 'Nomad Explorer'}</Text>
            <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{user?.email || 'guest@steadynest.com'}</Text>
            
            {/* Theme Toggle */}
            <View style={{ flexDirection: 'row', marginTop: 16, backgroundColor: colors.background, padding: 4, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
              {(['light', 'dark', 'system'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme(t); }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: theme === t ? colors.primary : 'transparent'
                  }}
                >
                  <Text style={{ 
                    fontFamily: 'Inter_600SemiBold', 
                    fontSize: 12, 
                    textTransform: 'capitalize',
                    color: theme === t ? colors.primaryForeground : colors.mutedForeground 
                  }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Dynamic Dashboard View */}
        {activeRole === 'tenant' ? (
          <View style={styles.dashboardSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Lease</Text>
            
            {mockTenantLease.status === 'failed' && (
              <PaymentAlert amount={mockTenantLease.rent} dueDate={mockTenantLease.dueDate} listingId={mockTenantLease.listingId} />
            )}

            <View style={[styles.leaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.leaseRow}>
                <Feather name="home" size={24} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.leaseProperty, { color: colors.foreground }]}>{mockTenantLease.property}</Text>
                  <Text style={[styles.leaseMeta, { color: colors.mutedForeground }]}>Next due: {mockTenantLease.dueDate}</Text>
                </View>
                <Text style={[styles.leaseAmount, { color: colors.primary }]}>
                  ₹{mockTenantLease.rent.toLocaleString('en-IN')}
                </Text>
              </View>
              
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleManageAutopay}
              >
                <Feather name="credit-card" size={16} color={colors.foreground} />
                <Text style={[styles.actionText, { color: colors.foreground }]}>Manage Autopay</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dashboardSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Portfolio Overview</Text>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{mockLandlordStats.properties}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Properties</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{mockLandlordStats.occupancy}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Occupancy</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>₹{(mockLandlordStats.revenue/1000)}k</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Monthly Rev</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.inquiryCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]} >
              <Feather name="bell" size={20} color={colors.primary} />
              <Text style={[styles.inquiryText, { color: colors.primary }]}>{mockLandlordStats.pendingInquiries} Pending Inquiries</Text>
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.inquiryCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]} 
              onPress={handleSetupPayouts}
            >
              <Feather name="dollar-sign" size={20} color={colors.foreground} />
              <Text style={[styles.inquiryText, { color: colors.foreground }]}>Setup Payouts (Stripe Connect)</Text>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </TouchableOpacity>

            {/* Profit vs Break-even Graph */}
            <View style={{ marginTop: 24, backgroundColor: colors.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.foreground, marginBottom: 16 }}>Investment Status</Text>
              
              <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 20 }}>
                {/* Break even line */}
                <View style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 1, backgroundColor: colors.vermillion + '50', borderStyle: 'dashed' }} />
                <Text style={{ position: 'absolute', top: 32, right: 0, fontSize: 10, color: colors.vermillion, fontFamily: 'Inter_500Medium' }}>Break Even (₹40k)</Text>
                
                {/* Bars */}
                {[{ month: 'Jan', rev: 35 }, { month: 'Feb', rev: 38 }, { month: 'Mar', rev: 45 }, { month: 'Apr', rev: 50 }, { month: 'May', rev: 55 }].map((data, idx) => {
                  const isProfit = data.rev >= 40;
                  const heightPct = (data.rev / 60) * 100;
                  
                  return (
                    <View key={idx} style={{ alignItems: 'center', width: 40 }}>
                      <View style={{ width: 12, height: `${heightPct}%`, backgroundColor: isProfit ? colors.signalGreen : colors.accent, borderRadius: 6, opacity: 0.8 }} />
                      <Text style={{ marginTop: 8, fontSize: 10, color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>{data.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  content: {
    paddingHorizontal: 24,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  roleTitle: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  roleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  roleToggleText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 6,
  },
  profileHeaderCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  dashboardSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  leaseCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  leaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaseProperty: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  leaseMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  leaseAmount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  inquiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  inquiryText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  }
});
