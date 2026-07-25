import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

type Role = 'tenant' | 'landlord';

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setUserRole } = useApp();

  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!selected) return;
    setError('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await setUserRole(selected);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Could not save your choice.');
      return;
    }
    // AuthGuard routes into the correct area once the role is set.
  };

  const Option = ({ role, icon, title, sub, color }: { role: Role; icon: any; title: string; sub: string; color: string }) => {
    const active = selected === role;
    return (
      <TouchableOpacity
        style={[styles.option, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '12' : colors.card }]}
        onPress={() => { Haptics.selectionAsync(); setSelected(role); setError(''); }}
        activeOpacity={0.9}
      >
        <View style={[styles.optionIcon, { backgroundColor: active ? color : colors.muted }]}>
          <Feather name={icon} size={22} color={active ? colors.primaryForeground : color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{sub}</Text>
        </View>
        {active && <Feather name="check-circle" size={22} color={color} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroTitle}>How will you use SteadyNest?</Text>
        <Text style={styles.heroSub}>You can switch modes anytime later.</Text>
      </LinearGradient>

      <View style={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
        {/* Tenant/landlord keep distinct accent colors so the two options read
            differently at a glance, but both stay inside the app's real
            green/moss palette instead of the old off-brand orange. */}
        <Option role="tenant" icon="user" title="I'm a Tenant" sub="Find housing, pay rent, meet locals" color={colors.primary} />
        <Option role="landlord" icon="home" title="I'm a Landlord" sub="List properties, collect rent, match tenants" color={colors.tiraViolet} />

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: selected ? 1 : 0.5 }]}
          onPress={handleContinue}
          disabled={!selected || loading}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>CONTINUE</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  hero: { paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  heroSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)' },
  body: { flex: 1, padding: 20, gap: 14 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#1C0F00' },
  optionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9E7B5A', marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#C62828' },
  submitBtn: { backgroundColor: '#F05A28', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  submitText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
});
