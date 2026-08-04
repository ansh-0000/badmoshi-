import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { SNEmpty } from '@/components/SNEmpty';
import { useTabBarClearance } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';

type OwnedListing = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  currency: 'INR';
  address: string | null;
  status: 'available' | 'rented';
};

export default function ListingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const tabBarClearance = useTabBarClearance();
  const [listings, setListings] = useState<OwnedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/listings?limit=50');
      setListings(response.data.data ?? []);
    } catch {
      setError('Your listings could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadListings(); }, [loadListings]);
  useFocusEffect(useCallback(() => { void loadListings(); }, [loadListings]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Properties</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your 50 most recent owned listings appear here.</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Add a listing"
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/add-property')}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : error ? (
          <SNEmpty title="Listings unavailable" body={error} cta="Try again" onCta={() => void loadListings()} />
        ) : listings.length === 0 ? (
          <SNEmpty title="No properties yet" body="Create a rental listing when you are ready." cta="Add listing" onCta={() => router.push('/add-property')} />
        ) : listings.map((listing) => (
          <View key={listing.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listingTitle, { color: colors.foreground }]}>{listing.title}</Text>
                <Text style={[styles.location, { color: colors.mutedForeground }]}>{listing.address || 'Address not shared'}</Text>
              </View>
              <View style={[styles.status, { backgroundColor: listing.status === 'available' ? colors.muted : colors.secondary }]}>
                <Text style={[styles.statusText, { color: colors.primaryTint }]}>{listing.status === 'available' ? 'AVAILABLE' : 'RENTED'}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={[styles.rent, { color: colors.foreground }]}>₹{listing.price.toLocaleString('en-IN')}<Text style={[styles.perMonth, { color: colors.mutedForeground }]}> / month</Text></Text>
              <Text style={[styles.type, { color: colors.primaryTint }]}>{listing.type.replace('-', ' ')}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 18, marginBottom: 24 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 270 },
  addButton: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  loading: { marginTop: 48 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12, gap: 18 },
  cardHeader: { flexDirection: 'row', gap: 12 },
  listingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  location: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 4 },
  status: { borderRadius: 9999, paddingHorizontal: 9, paddingVertical: 6, alignSelf: 'flex-start' },
  statusText: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 9, letterSpacing: 0.6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rent: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 16 },
  perMonth: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  type: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'capitalize' },
});
