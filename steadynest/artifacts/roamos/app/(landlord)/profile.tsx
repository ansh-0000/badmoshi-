import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import { CITIES } from '@/constants/data';

function ProfileRow({ icon, label, value, color }: {
  icon: any; label: string; value: string; color?: string;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={[styles.rowIcon, { backgroundColor: (color ?? '#00897B') + '18' }]}>
        <Feather name={icon} size={16} color={color ?? '#00897B'} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function LandlordProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useApp();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 90);

  const city = CITIES.find(c => c.id === (user?.city ?? 'delhi')) ?? CITIES[0];
  const initials = (user?.name ?? 'LL').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1565C0', '#1976D2', '#42A5F5']}
        style={[styles.hero, { paddingTop: topInset + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{user?.name ?? 'Landlord'}</Text>
        <View style={[styles.roleBadge]}>
          <Feather name="home" size={12} color="#1565C0" />
          <Text style={styles.roleText}>VERIFIED LANDLORD</Text>
        </View>
        <Text style={styles.heroEmail}>{user?.email}</Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      >
        {/* Profile info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
          <View style={styles.card}>
            <ProfileRow icon="user" label="Full Name" value={user?.name ?? '—'} color="#1565C0" />
            <View style={styles.divider} />
            <ProfileRow icon="mail" label="Email" value={user?.email ?? '—'} color="#7B1FA2" />
            <View style={styles.divider} />
            <ProfileRow icon="phone" label="Phone" value={user?.phone ?? 'Not set'} color="#00897B" />
            <View style={styles.divider} />
            <ProfileRow icon="map-pin" label="Base City" value={city.name} color="#F05A28" />
          </View>
        </View>

        {/* Landlord perks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LANDLORD PERKS</Text>
          <View style={styles.perksGrid}>
            {[
              { icon: 'zap', label: 'Autopay', sub: 'Auto-collect rent', color: '#FFA000' },
              { icon: 'shield', label: 'Verified', sub: 'Trust badge on listings', color: '#00897B' },
              { icon: 'trending-up', label: 'Analytics', sub: 'Occupancy insights', color: '#7B1FA2' },
              { icon: 'message-square', label: 'Direct chat', sub: 'With tenants', color: '#1565C0' },
            ].map((perk, i) => (
              <View key={i} style={[styles.perkCard, { borderTopColor: perk.color, borderTopWidth: 3 }]}>
                <View style={[styles.perkIcon, { backgroundColor: perk.color + '18' }]}>
                  <Feather name={perk.icon as any} size={18} color={perk.color} />
                </View>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkSub}>{perk.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.card}>
            {[
              { icon: 'bell', label: 'Notifications', sub: 'Inquiry alerts', color: '#F05A28' },
              { icon: 'credit-card', label: 'Payment details', sub: 'Bank account for autopay', color: '#00897B' },
              { icon: 'help-circle', label: 'Help & Support', sub: 'FAQs and contact', color: '#1565C0' },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(28,15,0,0.08)' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(item.label, `${item.label} settings coming soon!`);
                }}
              >
                <View style={[styles.rowIcon, { backgroundColor: item.color + '18' }]}>
                  <Feather name={item.icon as any} size={16} color={item.color} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingSubLabel}>{item.sub}</Text>
                </View>
                <Feather name="chevron-right" size={16} color="#C2A882" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert('Sign out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: logout },
            ]);
          }}
        >
          <Feather name="log-out" size={16} color="#E53935" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 30, gap: 10 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#1565C0' },
  heroName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#1565C0' },
  heroEmail: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)' },
  content: { padding: 20, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#9E7B5A', marginLeft: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, color: '#9E7B5A' },
  rowValue: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#1C0F00', marginTop: 1 },
  divider: { height: 1, backgroundColor: 'rgba(28,15,0,0.07)', marginHorizontal: 14 },
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  perkCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  perkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  perkLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  perkSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#1C0F00' },
  settingSubLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9E7B5A', marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    paddingVertical: 15,
  },
  logoutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#E53935' },
});
