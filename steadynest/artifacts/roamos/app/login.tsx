import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SteadyNestAppIcon } from '@/components/SteadyNestLogo';
import { useApp } from '@/context/AppContext';

type Mode = 'signin' | 'register';
type Role = 'tenant' | 'landlord';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, register } = useApp();

  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<Role>('tenant');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isTenant = role === 'tenant';

  const primaryColor = isTenant ? '#F05A28' : '#00897B';
  const gradientColors: [string, string, string] = isTenant
    ? ['#F05A28', '#FFA000', '#FFD54F']
    : ['#00897B', '#26A69A', '#80CBC4'];

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = mode === 'signin'
      ? await login(email.trim(), password)
      : await register(name.trim(), email.trim(), password, role);

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }

    // Navigation handled by auth guard in _layout.tsx
  };

  const fillDemo = (r: Role) => {
    if (r === 'tenant') { setEmail('priya@roamos.in'); setPassword('password123'); setRole('tenant'); }
    else { setEmail('rahul@roamos.in'); setPassword('password123'); setRole('landlord'); }
  };

  return (
    <View style={styles.container}>
      {/* Gradient hero header */}
      <LinearGradient
        colors={gradientColors}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoRow}>
          <SteadyNestAppIcon size={72} decorative />
        </View>
        <Text style={styles.logoText}>SteadyNest</Text>
        <Text style={styles.tagline}>
          {isTenant ? 'Find your place. Stay steady.' : 'Manage your properties with ease'}
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.formContainer, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role selector */}
          <View style={styles.roleCard}>
            <Text style={styles.roleLabel}>I AM A</Text>
            <View style={styles.roleToggle}>
              <TouchableOpacity
                style={[styles.roleBtn, isTenant && { backgroundColor: '#F05A28' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRole('tenant'); setError(''); }}
              >
                <Feather name="user" size={16} color={isTenant ? '#fff' : '#9E7B5A'} />
                <Text style={[styles.roleBtnText, { color: isTenant ? '#fff' : '#9E7B5A' }]}>Tenant</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, !isTenant && { backgroundColor: '#00897B' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRole('landlord'); setError(''); }}
              >
                <Feather name="home" size={16} color={!isTenant ? '#fff' : '#9E7B5A'} />
                <Text style={[styles.roleBtnText, { color: !isTenant ? '#fff' : '#9E7B5A' }]}>Landlord</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#C2A882"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#C2A882"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#C2A882"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9E7B5A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#E53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: primaryColor }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue with phone (OTP) */}
            <TouchableOpacity
              style={styles.phoneBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/phone-login'); }}
              activeOpacity={0.85}
            >
              <Feather name="smartphone" size={17} color="#1C0F00" />
              <Text style={styles.phoneBtnText}>Continue with phone</Text>
            </TouchableOpacity>

            {/* Toggle mode */}
            <TouchableOpacity
              onPress={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(''); }}
              style={styles.toggleRow}
            >
              <Text style={styles.toggleText}>
                {mode === 'signin' ? "New here? " : "Already have an account? "}
                <Text style={[styles.toggleLink, { color: primaryColor }]}>
                  {mode === 'signin' ? 'Create account' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo accounts */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>TRY A DEMO ACCOUNT</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: '#F05A28' }]}
                onPress={() => fillDemo('tenant')}
              >
                <Feather name="user" size={13} color="#F05A28" />
                <Text style={[styles.demoBtnText, { color: '#F05A28' }]}>Tenant</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: '#00897B' }]}
                onPress={() => fillDemo('landlord')}
              >
                <Feather name="home" size={13} color="#00897B" />
                <Text style={[styles.demoBtnText, { color: '#00897B' }]}>Landlord</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.demoHint}>Password: password123</Text>
            <TouchableOpacity
              style={{ marginTop: 16, alignSelf: 'center' }}
              onPress={() => router.push('/theme-showcase' as any)}
            >
              <Text style={{ color: '#00897B', textDecorationLine: 'underline', fontFamily: 'Inter_500Medium' }}>
                View Theme Showcase
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  logoRow: { marginBottom: 4 },
  logoText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    maxWidth: 260,
  },
  formContainer: {
    padding: 20,
    gap: 16,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  roleLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    color: '#9E7B5A',
  },
  roleToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
  },
  roleBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1C0F00' },
  inputGroup: { gap: 6 },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    color: '#9E7B5A',
  },
  input: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1C0F00',
    borderWidth: 1,
    borderColor: 'rgba(28,15,0,0.10)',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  eyeBtn: { position: 'absolute', right: 14, top: 13 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 10,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#C62828' },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFFFFF', letterSpacing: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(28,15,0,0.10)' },
  dividerText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#9E7B5A' },
  phoneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    backgroundColor: '#FFF3E0', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(28,15,0,0.10)',
  },
  phoneBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  toggleRow: { alignItems: 'center' },
  toggleText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
  toggleLink: { fontFamily: 'Inter_600SemiBold' },
  demoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  demoTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.5, color: '#9E7B5A' },
  demoRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  demoBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  demoHint: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
});
