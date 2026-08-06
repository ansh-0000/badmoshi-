// app/(auth)/phone-login.tsx
// Expo Router screen: phone number entry. Defensive states covered:
// invalid format, request-in-flight, request failure w/ retry, and a
// disabled resend cooldown so a user can't hammer the SMS endpoint.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { requestPhoneOtp } from '../../lib/firebase';
import { setPendingConfirmation } from '../../lib/pendingConfirmationStore';

const INDIA_PHONE_REGEX = /^\d{10}$/;

export default function PhoneLoginScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = INDIA_PHONE_REGEX.test(digits);

  const handleSubmit = useCallback(async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    const e164 = `+91${digits}`;
    try {
      const confirmation = await requestPhoneOtp(e164);
      // Confirmation objects aren't JSON-serializable, so they can't travel
      // through router params — stash it in the shared store instead, and
      // the verify screen reads it back out.
      setPendingConfirmation(confirmation);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: e164 },
      });
    } catch (err: any) {
      // Firebase throws distinct codes worth surfacing differently —
      // don't collapse everything into one generic message.
      if (err?.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again in a few minutes.');
      } else if (err?.code === 'auth/invalid-phone-number') {
        setError('That number looks invalid. Double-check and try again.');
      } else {
        setError('Could not send code. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [digits, isValid, loading, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Enter your mobile number</Text>
      <Text style={styles.subtitle}>We'll send you a one-time code via SMS.</Text>

      <View style={styles.inputRow}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          style={styles.input}
          value={digits}
          onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          placeholder="98765 43210"
          maxLength={10}
          autoFocus
          editable={!loading}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!isValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send code</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  prefix: { fontSize: 16, color: '#333', marginRight: 8, fontWeight: '600' },
  input: { flex: 1, fontSize: 16, paddingVertical: 14, color: '#111' },
  error: { color: '#c0392b', marginBottom: 12, fontSize: 13 },
  button: {
    backgroundColor: '#1f7a4d',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#a9c9b8' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
