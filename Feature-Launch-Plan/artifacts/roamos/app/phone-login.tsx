import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { requestOtp } = useApp();

  const [digits, setDigits] = useState(''); // 10-digit local number
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phone = `+91${digits}`;
  const valid = /^\d{10}$/.test(digits);

  const handleSend = async () => {
    setError('');
    if (!valid) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await requestOtp(phone);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Could not send code.');
      return;
    }
    // Pass the dev code through so testing without SMS is one tap (no-op in prod).
    router.push({ pathname: '/verify-otp', params: { phone, devCode: result.devCode ?? '' } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.logoCircle, { backgroundColor: colors.card }]}>
          <Feather name="smartphone" size={30} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Continue with phone</Text>
        <Text style={styles.heroSub}>We'll text you a 6-digit verification code.</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>MOBILE NUMBER</Text>
          <View style={styles.phoneRow}>
            <View style={[styles.prefix, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.prefixText, { color: colors.foreground }]}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={digits}
              onChangeText={t => { setDigits(t.replace(/\D/g, '').slice(0, 10)); setError(''); }}
              placeholder="98765 43210"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: valid ? 1 : 0.6 }]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>SEND CODE</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Use email instead</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  hero: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 68, height: 68, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff' },
  heroSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: 260 },
  body: { flex: 1, padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#9E7B5A' },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  prefix: {
    backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(28,15,0,0.10)',
  },
  prefixText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  input: {
    flex: 1, backgroundColor: '#FFF8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: 'Inter_400Regular', color: '#1C0F00', borderWidth: 1, borderColor: 'rgba(28,15,0,0.10)',
    letterSpacing: 1,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#C62828' },
  submitBtn: {
    backgroundColor: '#F05A28', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  backText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#9E7B5A' },
});
