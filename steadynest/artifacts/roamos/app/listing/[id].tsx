import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stay, setStay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [proxyNumber, setProxyNumber] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        setStay({
          ...data.data,
          images: data.data.images ? JSON.parse(data.data.images) : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800"],
        });
      } catch (err) {
        console.warn('Failed to fetch listing', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stay) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.foreground }}>Property not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCallLandlord = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalling(true);
    try {
      const { data } = await api.post('/calls/mask', { listingId: id });
      setProxyNumber(data.proxyNumber);
      Alert.alert(
        "Secure Call Provisioned",
        `Calling Landlord via secure proxy: ${data.proxyNumber}\n\nYour actual number is hidden.`,
        [{ text: "OK", onPress: () => console.log('Initiating native call...') }]
      );
    } catch (err) {
      Alert.alert("Error", "Could not establish secure call.");
      console.warn(err);
    } finally {
      setCalling(false);
    }
  };

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 100 }} bounces={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: stay.images[0] }} style={styles.heroImage} />
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={[styles.headerOverlay, { paddingTop: topInset + 10 }]}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn}>
              <Feather name="heart" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* 360 Panorama Mock Button */}
          <TouchableOpacity 
            style={[styles.panoBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert("360° View", "Launching immersive 360° panorama...");
            }}
          >
            <Feather name="rotate-ccw" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold', marginLeft: 4 }}>360°</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>{stay.title}</Text>
          </View>
          
          {/* The pin used to render unconditionally, so a listing with no
              address showed a lone map-pin glyph followed by nothing — it read
              as a rendering failure. `address` is nullable in the schema and is
              null for every bulk-seeded row, so this is reachable with real
              data, not just a seeding gap. No address means no location row. */}
          {typeof stay.address === 'string' && stay.address.trim().length > 0 && (
            <Text style={[styles.location, { color: colors.mutedForeground }]}>
              <Feather name="map-pin" size={12} /> {stay.address.trim()}
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About this place</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {stay.description || `Enjoy a beautiful, premium stay. This property offers top-tier amenities, a vibrant community, and high-speed Wi-Fi, perfect for travelers and digital nomads alike. Experience the local culture right at your doorstep.`}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <Feather name="wifi" size={20} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.foreground }]}>Fast Wi-Fi</Text>
            </View>
            <View style={styles.amenityItem}>
              <Feather name="monitor" size={20} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.foreground }]}>Workspace</Text>
            </View>
            <View style={styles.amenityItem}>
              <Feather name="coffee" size={20} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.foreground }]}>Kitchen</Text>
            </View>
            <View style={styles.amenityItem}>
              <Feather name="wind" size={20} color={colors.primary} />
              <Text style={[styles.amenityText, { color: colors.foreground }]}>AC</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset || 20 }]}>
        <View>
          <Text style={[styles.priceText, { color: colors.foreground }]}>
            ₹{stay.price?.toLocaleString('en-IN')} <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>/ mo</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.callBtn, { borderColor: colors.primary }]}
            onPress={handleCallLandlord}
            disabled={calling}
          >
            {calling ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="phone-call" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/booking/setup', params: { id } })}
          >
            <Text style={[styles.bookBtnText, { color: colors.primaryForeground }]}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panoBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  content: {
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    flex: 1,
    marginRight: 16,
  },
  location: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  amenityItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  priceSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtn: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
