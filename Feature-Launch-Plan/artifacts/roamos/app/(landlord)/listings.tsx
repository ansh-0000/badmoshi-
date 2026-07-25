import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/AppContext';
import { API_BASE } from '@/constants/api';

interface Listing {
  id: string;
  name: string;
  location: string;
  price: number;
  type: string;
  status: string;
  inquiries: number;
}

const TYPE_COLORS: Record<string, string> = {
  private: '#F05A28',
  coliving: '#7B1FA2',
  hostel: '#1565C0',
};

export default function ListingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 90);

  const fetchListings = () => {
    if (!user) return;
    setLoading(true);
    fetch(`${API_BASE}/landlord/listings?ownerId=${user.id}`)
      .then(r => r.json())
      .then(d => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, [user]);

  const totalRevenue = listings.reduce((s, l) => s + l.price, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#7B1FA2', '#AB47BC', '#CE93D8']}
        style={[styles.header, { paddingTop: topInset + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>MY LISTINGS</Text>
            <Text style={styles.headerSub}>
              {listings.length} {listings.length === 1 ? 'property' : 'properties'} · ₹{(totalRevenue / 1000).toFixed(0)}K/mo
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert('Add Listing', 'Property form coming soon!', [{ text: 'OK' }]);
            }}
          >
            <Feather name="plus" size={22} color="#7B1FA2" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color="#7B1FA2" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={listings}
          keyExtractor={l => l.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomInset }] as any}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="home" size={40} color="#CE93D8" />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Tap the + button to add your first property</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = TYPE_COLORS[item.type] ?? '#7B1FA2';
            return (
              <View style={styles.card}>
                {/* Color left stripe */}
                <View style={[styles.stripe, { backgroundColor: color }]} />

                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <View style={[styles.typePill, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.typeText, { color }]}>
                          {item.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardLocation}>
                      <Feather name="map-pin" size={11} /> {item.location}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.footerLeft}>
                      <Text style={styles.cardPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                      <Text style={styles.cardPriceSub}>/mo</Text>
                    </View>
                    <View style={styles.footerRight}>
                      <View style={[styles.inqBadge, { backgroundColor: item.inquiries > 0 ? '#FFF3E0' : '#F5F5F5' }]}>
                        <Feather name="inbox" size={12} color={item.inquiries > 0 ? '#F05A28' : '#9E7B5A'} />
                        <Text style={[styles.inqCount, { color: item.inquiries > 0 ? '#F05A28' : '#9E7B5A' }]}>
                          {item.inquiries} {item.inquiries === 1 ? 'inquiry' : 'inquiries'}
                        </Text>
                      </View>

                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#E8F5E9' }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            Alert.alert('Edit', `Edit "${item.name}" — form coming soon!`);
                          }}
                        >
                          <Feather name="edit-2" size={14} color="#2E7D32" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#FFEBEE' }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert('Remove listing', `Are you sure you want to remove "${item.name}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => setListings(prev => prev.filter(l => l.id !== item.id)) },
                            ]);
                          }}
                        >
                          <Feather name="trash-2" size={14} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={[styles.statusRow, { backgroundColor: item.status === 'active' ? '#E0F2F1' : '#FFF3E0' }]}>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#00897B' : '#F05A28' }]} />
                    <Text style={[styles.statusText, { color: item.status === 'active' ? '#00897B' : '#F05A28' }]}>
                      {item.status === 'active' ? 'Active & listed' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  stripe: { width: 5 },
  cardBody: { flex: 1, padding: 14, gap: 10 },
  cardTop: { gap: 4 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#1C0F00', flex: 1 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  cardLocation: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  cardPrice: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1C0F00' },
  cardPriceSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
  footerRight: { gap: 8, alignItems: 'flex-end' },
  inqBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  inqCount: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9E7B5A', textAlign: 'center' },
});
