import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { SNEmpty } from '@/components/SNEmpty';
import { useTabBarClearance } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';

type PortfolioSummary = {
  propertyCount: number;
  availableCount: number;
  potentialMonthlyRent: number;
};

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/listings/summary');
      setSummary(response.data.data ?? null);
    } catch (caught) {
      setError(toFriendlyError(caught, 'We could not load your properties. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPortfolio(); }, [loadPortfolio]);
  useFocusEffect(useCallback(() => { void loadPortfolio(); }, [loadPortfolio]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <Text style={[styles.eyebrow, { color: colors.primaryTint }]}>OWNER PORTFOLIO</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Your rental portfolio</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Listings you own, priced in INR.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : error ? (
          <SNEmpty title="Portfolio unavailable" body={error} cta="Try again" onCta={() => void loadPortfolio()} />
        ) : !summary || summary.propertyCount === 0 ? (
          <SNEmpty
            title="Add your first rental"
            body="Create a Delhi NCR rental listing to start managing your portfolio."
            cta="Add listing"
            onCta={() => router.push('/add-property')}
          />
        ) : (
          <>
            <View style={styles.stats}>
              <Stat label="Properties" value={String(summary.propertyCount)} />
              <Stat label="Available" value={String(summary.availableCount)} />
              <Stat label="Potential monthly rent" value={`₹${summary.potentialMonthlyRent.toLocaleString('en-IN')}`} />
            </View>

            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/add-property'); }}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Add listing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={() => router.push('/(landlord)/listings')}
            >
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>View all properties</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryTint} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, flexGrow: 1 },
  eyebrow: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 11, letterSpacing: 1.1, marginTop: 18 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, marginTop: 9 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 26 },
  loading: { marginTop: 48 },
  stats: { gap: 10 },
  stat: { borderWidth: 1, borderRadius: 18, padding: 16 },
  statValue: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 },
  primaryAction: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 9999, paddingVertical: 15, marginTop: 24 },
  primaryActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  secondaryAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 15, marginTop: 12 },
  secondaryActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
