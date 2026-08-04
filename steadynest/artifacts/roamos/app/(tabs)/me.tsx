import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  Animated,
  Easing,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { CameraView, useCameraPermissions } from '@/components/CameraWrapper';
import { API_BASE } from '@/constants/api';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import PaymentAlert from '@/components/PaymentAlert';
import { useTabBarClearance } from '@/constants/layout';
import { fixedInk } from '@/constants/colors';

const HOLD_DURATION_MS = 3000;

function formatJoinDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
}

function MenuRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function MeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    user, activeRole, setUserRole, logout, theme, setTheme, activeLease,
    trustedContacts, setTrustedContacts,
  } = useApp();
  const [switchingRole, setSwitchingRole] = useState<'tenant' | 'landlord' | null>(null);

  // Changing role reissues the access token (the role is a JWT claim) and moves
  // the user to the other half of the app, so it is confirmed rather than
  // instant. The server no longer 409s on a second call — see the note on
  // PATCH /auth/role.
  const requestRoleSwitch = (role: 'tenant' | 'landlord') => {
    if (role === activeRole || switchingRole) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      role === 'landlord' ? 'Switch to Landlord?' : 'Switch to Tenant?',
      role === 'landlord'
        ? 'You will see your properties, tenants and payouts instead of the tenant search. You can switch back any time.'
        : 'You will see stays near you, roommate matching and your lease instead of the landlord tools. You can switch back any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            setSwitchingRole(role);
            const result = await setUserRole(role);
            setSwitchingRole(null);
            if (!result.success) {
              Alert.alert('Could not switch', result.error ?? 'Please try again.');
            }
            // On success AuthGuard sees the new user.role and routes across.
          },
        },
      ],
    );
  };

  const confirmSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign out?', 'You will need to sign in again to see your stays and messages.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

  const tabBarClearance = useTabBarClearance();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [holding, setHolding] = useState(false);
  const [safetyExpanded, setSafetyExpanded] = useState(false);
  const [contactDraft, setContactDraft] = useState(trustedContacts[0] || '');
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdProgress = useRef(new Animated.Value(0)).current;

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const mockTenantLease = activeLease || {
    property: 'The Hive Coliving',
    listingId: undefined as string | undefined,
    rent: 18500,
    dueDate: '5th Aug, 2026',
    status: 'active',
  };

  const mockLandlordStats = {
    properties: 3,
    occupancy: '100%',
    revenue: 55000,
    pendingInquiries: 2,
  };

  const startHold = () => {
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(holdProgress, { toValue: 1, duration: HOLD_DURATION_MS, easing: Easing.linear, useNativeDriver: false }).start();
    holdTimer.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/sos-active');
      cancelHold();
    }, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  const handleSetupPayouts = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/payments/connect-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email || 'guest@steadynest.com' }),
      });
      const data = await res.json();
      if (data.url) Linking.openURL(data.url);
    } catch (err) {
      console.error(err);
    }
  };

  const joinDate = formatJoinDate(user?.created_at);
  // There's no formal KYC/ID-verification pipeline in this app yet — phone
  // OTP is the one identity step the backend actually enforces, so that's
  // the only "verified" claim shown here, not a fabricated KYC badge.
  const verifiedLabel = user?.phone ? 'Phone verified' : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {permission?.granted && Platform.OS !== 'web' && (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        </View>
      )}

      <LinearGradient
        colors={[colors.primary + '20', 'transparent']}
        style={styles.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 16, paddingBottom: tabBarClearance },
        ]}
      >
        {/* Emergency SOS — the single most prominent element on this screen */}
        <View style={[styles.sosCard, { backgroundColor: 'rgba(168,82,50,0.07)', borderColor: 'rgba(168,82,50,0.28)' }]}>
          <View style={styles.sosHeaderRow}>
            <Feather name="alert-triangle" size={16} color={colors.vermillion} />
            <Text style={[styles.sosEyebrow, { color: colors.vermillion }]}>EMERGENCY</Text>
          </View>
          <Text style={[styles.sosDesc, { color: colors.mutedForeground }]}>
            Alerts your {trustedContacts.length} trusted contact{trustedContacts.length === 1 ? '' : 's'} with your live location and notifies local support.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={styles.sosButtonWrapper}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: 'rgba(249,248,244,0.25)',
                  borderRadius: 9999,
                  width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
            <View style={[styles.sosButton, { backgroundColor: colors.vermillion }]}>
              <Feather name="alert-octagon" size={22} color="#F9F8F4" />
              <Text style={styles.sosButtonText}>{holding ? 'Keep holding…' : 'Emergency SOS'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.sosHint, { color: colors.mutedForeground }]}>Press &amp; hold for 3 seconds to trigger</Text>
        </View>

        {/* Profile identity */}
        <View style={styles.profileRow}>
          <View style={[styles.avatarContainer, { borderColor: colors.background }]}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=' + (user?.id || 'guest') }} style={styles.avatar} />
            {verifiedLabel && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Feather name="check" size={10} color="#F9F8F4" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name || 'SteadyNest user'}</Text>
            <Text style={[styles.userMeta, { color: colors.mutedForeground }]}>
              {[joinDate, verifiedLabel].filter(Boolean).join(' · ') || (user?.email || user?.phone || '')}
            </Text>
          </View>
        </View>

        {/* Role switcher — changes the REAL role, not just this screen's card.
            Confirmed first, because it moves the whole app to a different
            half of the product and takes a round trip to the server. */}
        <View style={[styles.roleSwitcher, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(['tenant', 'landlord'] as const).map((role) => {
            const isActive = activeRole === role;
            return (
              <TouchableOpacity
                key={role}
                disabled={switchingRole !== null}
                style={[styles.roleBtn, { backgroundColor: isActive ? colors.primary : 'transparent' }]}
                onPress={() => requestRoleSwitch(role)}
              >
                {switchingRole === role ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={{
                      color: isActive ? colors.primaryForeground : colors.mutedForeground,
                      fontFamily: 'Inter_600SemiBold',
                    }}
                  >
                    {role === 'tenant' ? 'Tenant' : 'Landlord'}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic Dashboard View */}
        {activeRole === 'tenant' ? (
          <View style={[styles.moneyCard, { backgroundColor: fixedInk.surface }]}>
            <View style={styles.moneyHeaderRow}>
              <Text style={styles.moneyEyebrow}>SPENT THIS MONTH</Text>
              <View style={styles.dueChip}>
                <Text style={styles.dueChipText}>Rent due {mockTenantLease.dueDate}</Text>
              </View>
            </View>
            <Text style={styles.moneyTotal}>₹{mockTenantLease.rent.toLocaleString('en-IN')}</Text>
            {mockTenantLease.status === 'failed' && (
              <PaymentAlert amount={mockTenantLease.rent} dueDate={mockTenantLease.dueDate} listingId={mockTenantLease.listingId} />
            )}
            <TouchableOpacity style={styles.moneyAction} onPress={() => router.push('/payments/setup')}>
              <Feather name="credit-card" size={16} color="#F9F8F4" />
              <Text style={styles.moneyActionText}>Manage Autopay</Text>
              <Feather name="chevron-right" size={16} color="rgba(249,248,244,0.5)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.moneyCard, { backgroundColor: colors.primary }]}>
            <View style={styles.moneyHeaderRow}>
              <Text style={styles.moneyEyebrow}>EARNED THIS MONTH</Text>
              <View style={styles.dueChip}>
                <Text style={styles.dueChipText}>{mockLandlordStats.pendingInquiries} pending</Text>
              </View>
            </View>
            <Text style={styles.moneyTotal}>₹{mockLandlordStats.revenue.toLocaleString('en-IN')}</Text>
            <View style={styles.statsRow}>
              <View><Text style={styles.statLabel}>Properties</Text><Text style={styles.statValue}>{mockLandlordStats.properties}</Text></View>
              <View><Text style={styles.statLabel}>Occupancy</Text><Text style={styles.statValue}>{mockLandlordStats.occupancy}</Text></View>
            </View>
            <TouchableOpacity style={styles.moneyAction} onPress={handleSetupPayouts}>
              <Feather name="dollar-sign" size={16} color="#F9F8F4" />
              <Text style={styles.moneyActionText}>Setup Payouts</Text>
              <Feather name="chevron-right" size={16} color="rgba(249,248,244,0.6)" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Menu */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="credit-card" label="Payment methods" onPress={() => router.push('/payments/setup')} />
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => setSafetyExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <Feather name="shield" size={19} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Identity & safety</Text>
            <Feather name={safetyExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {safetyExpanded && (
            <View style={[styles.safetyPanel, { borderBottomColor: colors.border }]}>
              <Text style={[styles.safetyLabel, { color: colors.mutedForeground }]}>Trusted contact (SOS)</Text>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.contactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={contactDraft}
                  onChangeText={setContactDraft}
                  placeholder="+91XXXXXXXXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.contactSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTrustedContacts([contactDraft.trim() || trustedContacts[0]]);
                  }}
                >
                  <Feather name="check" size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
              {!permission?.granted && Platform.OS !== 'web' && (
                <TouchableOpacity onPress={requestPermission} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.primary, fontSize: 12.5 }}>Grant camera permission for SOS photos</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={[styles.menuRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <Feather name="moon" size={19} color={colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Preferences</Text>
            <View style={{ flexDirection: 'row', backgroundColor: colors.background, padding: 3, borderRadius: 9999, borderWidth: 1, borderColor: colors.border }}>
              {(['light', 'dark', 'system'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme(t); }}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: theme === t ? colors.primary : 'transparent' }}
                >
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'capitalize', color: theme === t ? colors.primaryForeground : colors.mutedForeground }}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Sign out. The app had no sign-out control at all — once signed in on
            a device there was no way back to the login screen, which is also
            why signing in as a second account was impossible to test. */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={confirmSignOut}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={17} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  content: { paddingHorizontal: 22 },
  sosCard: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  sosHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sosEyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  sosDesc: { fontSize: 13, lineHeight: 18.5, marginBottom: 16 },
  sosButtonWrapper: { borderRadius: 9999, overflow: 'hidden' },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingVertical: 19,
    borderRadius: 9999,
  },
  sosButtonText: { color: '#F9F8F4', fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: 0.4 },
  sosHint: { textAlign: 'center', fontSize: 12, marginTop: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32 },
  avatar: { width: '100%', height: '100%', borderRadius: 32 },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10,
    borderWidth: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 24, fontFamily: 'PlayfairDisplay_600SemiBold' },
  userMeta: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 2 },
  roleSwitcher: { flexDirection: 'row', padding: 4, borderRadius: 9999, borderWidth: 1, marginBottom: 22 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    marginTop: 26, paddingVertical: 15, borderRadius: 9999, borderWidth: 1,
  },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  roleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9999 },
  moneyCard: { borderRadius: 28, padding: 22, marginBottom: 20 },
  moneyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  moneyEyebrow: { fontSize: 11, letterSpacing: 1.2, color: fixedInk.onSurfaceMuted, fontFamily: 'Inter_600SemiBold' },
  dueChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: 'rgba(226,167,62,0.2)' },
  dueChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#E2A73E' },
  moneyTotal: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 36, color: fixedInk.onSurface, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 28, marginTop: 16 },
  statLabel: { fontSize: 11, color: fixedInk.onSurfaceMuted },
  statValue: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 16, color: fixedInk.onSurface, marginTop: 3 },
  moneyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: fixedInk.hairline,
  },
  moneyActionText: { color: fixedInk.onSurface, fontSize: 13.5, fontFamily: 'Inter_500Medium' },
  menuCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1 },
  menuIcon: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14.5, fontFamily: 'Inter_500Medium' },
  safetyPanel: { paddingHorizontal: 16, paddingBottom: 18, borderBottomWidth: 1 },
  safetyLabel: { fontSize: 11.5, marginBottom: 8, marginTop: -4 },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  contactSaveBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
