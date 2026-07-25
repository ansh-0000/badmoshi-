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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { verifyOtp, requestOtp } = useApp();
  const { phone, devCode } = useLocalSearchParams<{ phone: string; devCode?: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valid = /^\d{6}$/.test(code);

  const handleVerify = async () => {
    setError('');
    if (!valid) {
      setError('Enter the 6-digit code.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await verifyOtp(phone, code);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Verification failed.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // AuthGuard routes from here: new users → /role-select, returning → their area.
  };

  const handleResend = async () => {
    setError('');
    setCode('');
    const result = await requestOtp(phone);
    if (!result.success) setError(result.error ?? 'Could not resend code.');
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
          <Feather name="shield" size={30} color={colors.primary} />
        </View>
        <Text style={styles.heroTitle}>Enter the code</Text>
        <Text style={styles.heroSub}>Sent to {phone}</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {!!devCode && (
            <View style={[styles.devBox, { backgroundColor: colors.primary + '15' }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.devText, { color: colors.primary }]}>Dev mode (no SMS provider): your code is {devCode}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.mutedForeground }]}>6-DIGIT CODE</Text>
          <TextInput
            style={[styles.codeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={code}
            onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            placeholder="••••••"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: valid ? 1 : 0.6 }]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>VERIFY</Text>}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
              <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
              <Text style={[styles.backText, { color: colors.mutedForeground }]}>Change number</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResend}>
              <Text style={[styles.resendText, { color: colors.primary }]}>Resend code</Text>
            </TouchableOpacity>
          </View>
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
  heroSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)' },
  body: { flex: 1, padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  devBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#E0F2F1', borderRadius: 10, padding: 10 },
  devText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#00695C' },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#9E7B5A' },
  codeInput: {
    backgroundColor: '#FFF8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 15,
    fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1C0F00', borderWidth: 1, borderColor: 'rgba(28,15,0,0.10)',
    textAlign: 'center', letterSpacing: 10,
  },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFEBEE', borderRadius: 10, padding: 10 },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#C62828' },
  submitBtn: { backgroundColor: '#F05A28', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#9E7B5A' },
  resendText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#F05A28' },
});
