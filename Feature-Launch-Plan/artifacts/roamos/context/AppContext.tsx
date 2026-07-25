import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '@/constants/api';
import { API_BASE_URL, setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';

// ── Security: Input Sanitization ────────────────────────────────────────────
// Strips HTML/script tags and dangerous patterns from user input
export function sanitize(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// ── Security: Client-side Rate Limiter ──────────────────────────────────────
// Prevents spam/abuse by enforcing a cooldown between API calls
const rateLimitMap = new Map<string, number>();
export function isRateLimited(key: string, cooldownMs: number = 1000): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(key) || 0;
  if (now - last < cooldownMs) return true;
  rateLimitMap.set(key, now);
  return false;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email?: string | null;
  role: 'tenant' | 'landlord' | null;
  phone?: string | null;
  city?: string | null;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface OtpRequestResult {
  success: boolean;
  error?: string;
  devCode?: string; // present only in dev when no SMS provider is configured
}

interface OtpVerifyResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
}

interface AppContextType {
  // Auth
  user: AppUser | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string, role: 'tenant' | 'landlord') => Promise<AuthResult>;
  requestOtp: (phone: string) => Promise<OtpRequestResult>;
  verifyOtp: (phone: string, code: string) => Promise<OtpVerifyResult>;
  setUserRole: (role: 'tenant' | 'landlord') => Promise<AuthResult>;
  logout: () => void;

  // City & settings
  currentCityId: string;
  setCurrentCityId: (id: string) => void;
  radius: number;
  setRadius: (r: number) => void;
  completedItems: string[];
  toggleChecklistItem: (id: string) => void;
  resetChecklist: () => void;
  autopayEnabled: boolean;
  setAutopayEnabled: (v: boolean) => void;
  visitedCities: string[];
  markCityVisited: (id: string) => void;

  // Dual-role
  activeRole: 'tenant' | 'landlord';
  setActiveRole: (role: 'tenant' | 'landlord') => void;
  toggleRole: () => void;
  activeLease: any;
  setActiveLease: (lease: any) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [currentCityId, setCurrentCityId] = useState('delhi');
  const [radius, setRadius] = useState(2);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [visitedCities, setVisitedCities] = useState<string[]>(['delhi']);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem('@roamos_v2')
      .then(raw => {
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (p.user) setUser(p.user);
            if (p.currentCityId) setCurrentCityId(p.currentCityId);
            if (typeof p.radius === 'number') setRadius(p.radius);
            if (p.completedItems) setCompletedItems(p.completedItems);
            if (p.autopayEnabled) setAutopayEnabled(p.autopayEnabled);
            if (p.visitedCities) setVisitedCities(p.visitedCities);
            if (p.theme) setTheme(p.theme);
          } catch (e) {
            console.error('Failed to parse roamos state', e);
          }
        }
      })
      .finally(() => setIsAuthLoading(false));
  }, []);

  // Save changes
  useEffect(() => {
    if (!isAuthLoading) {
      AsyncStorage.setItem('@roamos_v2', JSON.stringify({
        user,
        currentCityId,
        radius,
        completedItems,
        autopayEnabled,
        visitedCities,
        theme,
      })).catch(e => console.error('Failed to save roamos state', e));
    }
  }, [user, currentCityId, radius, completedItems, autopayEnabled, visitedCities, theme, isAuthLoading]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitize(email.trim().toLowerCase()), password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? 'Login failed.' };
      
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: toFriendlyError(err, 'Login failed.') };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: 'tenant' | 'landlord',
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sanitize(name), email: sanitize(email.trim().toLowerCase()), password, role }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? 'Registration failed.' };
      
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: toFriendlyError(err, 'Registration failed.') };
    }
  };

  // ── Phone / OTP auth (additive — see api-server /auth/otp/*) ────────────────

  const requestOtp = async (phone: string): Promise<OtpRequestResult> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? 'Could not send code.' };
      return { success: true, devCode: data.devCode };
    } catch (err) {
      return { success: false, error: toFriendlyError(err, 'Could not send code.') };
    }
  };

  const verifyOtp = async (phone: string, code: string): Promise<OtpVerifyResult> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'invalid_or_expired_code'
          ? 'That code is invalid or expired.'
          : data.error === 'too_many_attempts'
          ? 'Too many attempts. Request a new code.'
          : data.error ?? 'Verification failed.';
        return { success: false, error: msg };
      }
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      return { success: true, isNewUser: data.isNewUser };
    } catch (err) {
      return { success: false, error: toFriendlyError(err, 'Verification failed.') };
    }
  };

  const setUserRole = async (role: 'tenant' | 'landlord'): Promise<AuthResult> => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error ?? 'Could not set role.' };
      // Role is part of the access token's claims — refresh it.
      if (data.accessToken) {
        const refresh = await getRefreshToken();
        await setTokens(data.accessToken, refresh ?? '');
      }
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: toFriendlyError(err, 'Could not set role.') };
    }
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
    setCompletedItems([]);
    setVisitedCities(['delhi']);
  };

  // ── Checklist & city ──────────────────────────────────────────────────────

  const toggleChecklistItem = (id: string) =>
    setCompletedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );

  const resetChecklist = () => setCompletedItems([]);

  const markCityVisited = (id: string) =>
    setVisitedCities(prev => (prev.includes(id) ? prev : [...prev, id]));

  // Global Dual-Role state
  const [activeRole, setActiveRole] = useState<'tenant' | 'landlord'>('tenant');
  const [activeLease, setActiveLease] = useState<any>(null); // For mocked lease/payment state

  const toggleRole = () => {
    setActiveRole(prev => (prev === 'tenant' ? 'landlord' : 'tenant'));
  };

  return (
    <AppContext.Provider
      value={{
        user, isAuthLoading, login, register, requestOtp, verifyOtp, setUserRole, logout,
        currentCityId, setCurrentCityId,
        radius, setRadius,
        completedItems, toggleChecklistItem, resetChecklist,
        autopayEnabled, setAutopayEnabled,
        visitedCities, markCityVisited,
        activeRole, setActiveRole, toggleRole,
        activeLease, setActiveLease,
        theme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
