import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, useAnimatedProps } from 'react-native-reanimated';
import { TextInput } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { API_BASE } from '@/constants/api';

interface Listing {
  id: string;
  name: string;
  location: string;
  price: number;
  type: string;
  status: string;
  inquiries: number;
}

interface Inquiry {
  id: string;
  listingId: string;
  tenantName: string;
  message: string;
  date: string;
  status: string;
}

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedNumber({ value, prefix = '', suffix = '', style }: { value: number, prefix?: string, suffix?: string, style: any }) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 1500 });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `${prefix}${Math.round(animatedValue.value).toLocaleString('en-IN')}${suffix}`,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      value={`${prefix}${Math.round(animatedValue.value).toLocaleString('en-IN')}${suffix}`}
      animatedProps={animatedProps}
      style={[style, { padding: 0, margin: 0, borderTopWidth: 0, borderBottomWidth: 0 }]}
    />
  );
}

function StatCard({ icon, label, value, color, sub, isYield = false }: {
  icon: any; label: string; value: string | number; color: string; sub?: string; isYield?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4, backgroundColor: colors.glassDark }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      {typeof value === 'number' ? (
        <AnimatedNumber value={value} style={[styles.statValue, { color: isYield ? colors.primary : colors.foreground }]} />
      ) : (
        <Text style={[styles.statValue, { color: isYield ? colors.primary : colors.foreground }]}>{value}</Text>
      )}
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useApp();

  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 90);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`${API_BASE}/landlord/listings?ownerId=${user.id}`).then(r => r.json()),
      fetch(`${API_BASE}/landlord/inquiries?ownerId=${user.id}`).then(r => r.json()),
    ])
      .then(([lData, iData]) => {
        setListings(lData.listings ?? []);
        setInquiries(iData.inquiries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const totalRevenue = listings.reduce((s, l) => s + l.price, 0);
  const pendingInquiries = inquiries.filter(i => i.status === 'pending').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Transaction Instrument Panel */}
      <View style={[styles.hero, { paddingTop: topInset + 16, backgroundColor: colors.foreground }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.background }]}>
              Host Panel, {user?.name.split(' ')[0]}
            </Text>
            <Text style={[styles.heroSub, { color: colors.background + 'AA' }]}>Transaction Instruments & Yields</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              logout();
            }}
          >
            <Feather name="log-out" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={[styles.heroStats, { backgroundColor: colors.background + '1A' }]}>
          <View style={styles.heroStat}>
            <AnimatedNumber value={listings.length} style={[styles.heroStatNum, { color: colors.background }]} />
            <Text style={[styles.heroStatLabel, { color: colors.background + 'AA' }]}>Active Estates</Text>
          </View>
          <View style={[styles.heroStatDivider, { backgroundColor: colors.background + '33' }]} />
          <View style={styles.heroStat}>
            <AnimatedNumber value={pendingInquiries} style={[styles.heroStatNum, { color: colors.background }]} />
            <Text style={[styles.heroStatLabel, { color: colors.background + 'AA' }]}>New Applications</Text>
          </View>
          <View style={[styles.heroStatDivider, { backgroundColor: colors.background + '33' }]} />
          <View style={styles.heroStat}>
            <AnimatedNumber prefix="₹" value={totalRevenue} style={[styles.heroStatNum, { color: colors.primary }]} />
            <Text style={[styles.heroStatLabel, { color: colors.background + 'AA' }]}>Total Yields / Mo</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard icon="home" label="Active listings" value={listings.filter(l => l.status === 'active').length} color={colors.primary} sub="All verified" />
              <StatCard icon="inbox" label="Pending replies" value={pendingInquiries} color={colors.destructive} sub="Need action" />
              <StatCard icon="pie-chart" label="Total Rent Outlays" value={totalRevenue} color={colors.secondary} sub="Shared Splits" isYield />
              <StatCard icon="star" label="Avg. rating" value="4.8" color={colors.secondary} sub="From tenants" />
            </View>

            {/* Quick actions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>QUICK ACTIONS</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: 9999 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/add-property'); }}
                >
                  <Feather name="plus-circle" size={18} color={colors.background} />
                  <Text style={[styles.actionBtnText, { color: colors.background }]}>Add Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.destructive, borderRadius: 9999 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(landlord)/inquiries'); }}
                >
                  <Feather name="inbox" size={18} color={colors.background} />
                  <Text style={[styles.actionBtnText, { color: colors.background }]}>View Inquiries</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 24, gap: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold' },
  heroSub: { fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  logoutBtn: { padding: 8, borderRadius: 9999 },
  heroStats: { flexDirection: 'row', borderRadius: 28, padding: 14 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 22, fontFamily: 'monospace' }, // JetBrains Mono fallback
  heroStatLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  heroStatDivider: { width: 1 },
  content: { padding: 20, gap: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 28, gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontFamily: 'monospace' }, // JetBrains Mono fallback
  statLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statSub: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginLeft: 4 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
