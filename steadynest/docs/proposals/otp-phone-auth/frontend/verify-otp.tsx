// app/(auth)/verify-otp.tsx
// Expo Router screen: 6-digit OTP entry + verification against the
// pending Firebase confirmation, then a call to our own backend to
// exchange the Firebase ID token for app session tokens (access+refresh),
// stored in SecureStore — never AsyncStorage.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { confirmPhoneOtp, requestPhoneOtp } from '../../lib/firebase';
import {
  getPendingConfirmation,
  setPendingConfirmation,
  clearPendingConfirmation,
} from '../../lib/pendingConfirmationStore';
import { exchangeFirebaseToken } from '../../lib/api';

const RESEND_COOLDOWN_SEC = 30;

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6 || status === 'verifying') return;
    setStatus('verifying');
    setError(null);

    const confirmation = getPendingConfirmation();
    if (!confirmation) {
      setError('Session expired. Go back and request a new code.');
      setStatus('error');
      return;
    }

    try {
      const idToken = await confirmPhoneOtp(confirmation, code);
      clearPendingConfirmation();

      // Exchange the Firebase ID token for our own access+refresh pair.
      // See otp-auth-backend-routes.js — this is also where role/isNewUser
      // comes back so the app can route to role-selection vs. dashboard.
      const { accessToken, refreshToken, user } = await exchangeFirebaseToken(idToken);

      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);

      if (user.isNewUser || !user.role) {
        router.replace('/(auth)/select-role');
      } else {
        router.replace('/(app)/dashboard');
      }
    } catch (err: any) {
      clearPendingConfirmation();
      if (err?.code === 'auth/invalid-verification-code') {
        setError('That code is wrong. Check and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setError('This code expired. Request a new one below.');
      } else {
        setError('Verification failed. Request a new code and try again.');
      }
      setStatus('error');
    }
  }, [code, status, router]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || !phone) return;
    setError(null);
    setCode('');
    try {
      const confirmation = await requestPhoneOtp(phone);
      setPendingConfirmation(confirmation);
      setCooldown(RESEND_COOLDOWN_SEC);
      setStatus('idle');
    } catch {
      setError('Could not resend code. Try again in a moment.');
    }
  }, [cooldown, phone]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>Sent to {phone}</Text>

      <TextInput
        style={styles.otpInput}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder="••••••"
        maxLength={6}
        autoFocus
        editable={status !== 'verifying'}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (code.length !== 6 || status === 'verifying') && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={code.length !== 6 || status === 'verifying'}
      >
        {status === 'verifying' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </Pressable>

      <Pressable onPress={handleResend} disabled={cooldown > 0} style={styles.resendRow}>
        <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 16,
    marginBottom: 12,
    color: '#111',
  },
  error: { color: '#c0392b', marginBottom: 12, fontSize: 13 },
  button: {
    backgroundColor: '#1f7a4d',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: '#a9c9b8' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendRow: { alignItems: 'center' },
  resendText: { color: '#1f7a4d', fontSize: 14, fontWeight: '600' },
  resendTextDisabled: { color: '#999' },
});
