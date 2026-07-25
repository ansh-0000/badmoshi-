import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import RadiusSlider from '@/components/RadiusSlider';
import StayRow, { StayRowData } from '@/components/StayRow';
import MapView, { Marker } from '@/components/MapView';
import { PropertyPin } from '@/components/PropertyPin';
import api from '@/lib/api';
import { FOOD_PLACES, FoodPlace } from '@/constants/data';
import { distanceKm } from '@/lib/geo';

type Tab = 'stays' | 'places';
type TypeFilter = 'all' | 'coliving' | 'private' | 'hostel';
type PlaceCategory = 'all' | 'cafe' | 'food' | 'groceries';

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'coliving', label: 'Co-living' },
  { id: 'private', label: 'Private' },
  { id: 'hostel', label: 'Hostel' },
];

const PLACE_CATEGORIES: { id: PlaceCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cafe', label: 'Cafés' },
  { id: 'food', label: 'Food' },
  { id: 'groceries', label: 'Groceries' },
];

const PLACE_ICON: Record<FoodPlace['type'], keyof typeof Feather.glyphMap> = {
  cafe: 'coffee',
  restaurant: 'compass',
  bar: 'compass',
};

// Muted, low-saturation basemap closer to the design's #E6E3D8 preview
// card than the default Google Maps palette.
const MAP_STYLE_WARM = [
  { elementType: 'geometry', stylers: [{ color: '#E6E3D8' }] },
  { elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DAD6C7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#F1EEE2' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function StaysScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { radius, setRadius } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>('stays');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Saket');
  const [searchQuery, setSearchQuery] = useState('Saket');

  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Reuse the app's global radius (already 2-10, shared with Settings'
  // "Radar radius") clamped to this screen's 2-10km design range.
  const clampedRadius = Math.min(10, Math.max(2, radius));

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ['listings', region.latitude, region.longitude, clampedRadius],
    queryFn: async () => {
      const { data } = await api.get('/listings/nearby', {
        params: { lat: region.latitude, lng: region.longitude, radius: clampedRadius },
      });
      return data.listings || [];
    },
  });

  const listings: any[] = (queryData as any[]) || [];

  const stays: StayRowData[] = useMemo(() => {
    return listings
      .filter((l) => typeFilter === 'all' || l.type === typeFilter)
      .map((l) => {
        const km = distanceKm(region.latitude, region.longitude, l.lat, l.lng);
        const images = l.images ? JSON.parse(l.images) : [];
        return {
          id: l.id,
          title: l.title,
          meta: `${l.type ? l.type[0].toUpperCase() + l.type.slice(1) : 'Stay'} · ${km.toFixed(1)} km · Owner-listed`,
          price: l.price,
          rating: 4.8, // Same rating stand-in the previous StayCard used; real per-listing ratings aren't modeled yet.
          verified: true,
          image: images[0],
        };
      });
  }, [listings, typeFilter, region]);

  const places = useMemo(() => {
    return FOOD_PLACES
      .filter((p) => {
        if (placeCategory === 'all') return true;
        if (placeCategory === 'cafe') return p.type === 'cafe';
        if (placeCategory === 'food') return p.type === 'restaurant' || p.type === 'bar';
        return false; // "Groceries" — no real data source yet, intentionally empty rather than fabricated.
      })
      .map((p) => ({
        ...p,
        km: distanceKm(region.latitude, region.longitude, p.latitude, p.longitude),
      }));
  }, [placeCategory, region]);

  const mapPins = useMemo(() => {
    const sorted = [...stays].sort((a, b) => a.price - b.price);
    return sorted.slice(0, 3);
  }, [stays]);

  const circleSize = Math.min(260, 80 + (clampedRadius - 2) * 12);
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const submitSearch = () => {
    setLocationLabel(searchQuery || 'Saket');
    setEditingLocation(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const Header = (
    <>
      <View style={[styles.headerRow, { paddingTop: topInset + 14 }]}>
        {editingLocation ? (
          <TextInput
            style={[styles.locationInput, { color: colors.foreground }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search address or area..."
            placeholderTextColor="rgba(20,32,26,0.4)"
            autoFocus
            onSubmitEditing={submitSearch}
            onBlur={submitSearch}
            returnKeyType="search"
          />
        ) : (
          <TouchableOpacity
            style={styles.locationTap}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditingLocation(true);
            }}
          >
            <Text style={styles.eyebrow}>{activeTab === 'stays' ? 'Searching near' : 'Exploring near'}</Text>
            <View style={styles.locationRow}>
              <Text style={[styles.locationName, { color: colors.foreground }]}>{locationLabel}</Text>
              <Feather name="chevron-down" size={17} color="rgba(20,32,26,0.5)" />
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterSheetOpen(true);
          }}
        >
          <Feather name="sliders" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'stays' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('stays');
          }}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'stays' ? colors.primaryForeground : 'rgba(20,32,26,0.55)' }]}>
            Stays
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'places' && [styles.segmentBtnActive, { backgroundColor: colors.primary }]]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('places');
          }}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'places' ? colors.primaryForeground : 'rgba(20,32,26,0.55)' }]}>
            What's around here
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mapCard, { height: activeTab === 'stays' && stays.length === 0 && !loading ? 200 : 296 }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          onRegionChangeComplete={setRegion}
          customMapStyle={MAP_STYLE_WARM}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {activeTab === 'stays'
            ? mapPins.map((s) => {
                const listing = listings.find((l) => l.id === s.id);
                if (!listing) return null;
                return (
                  <PropertyPin
                    key={s.id}
                    coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                    price={s.price}
                    type={listing.type}
                    light={s.id === mapPins[mapPins.length - 1]?.id}
                    onPress={() => router.push(`/listing/${s.id}`)}
                  />
                );
              })
            : places.slice(0, 4).map((p) => (
                <Marker
                  key={p.id}
                  coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                  onPress={() => setActiveTab('places')}
                >
                  <View style={styles.goldPin}>
                    <Feather name={PLACE_ICON[p.type]} size={15} color="#14201A" />
                  </View>
                </Marker>
              ))}
        </MapView>

        <View pointerEvents="none" style={styles.mapOverlay}>
          <View
            style={[
              styles.radiusCircle,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                marginLeft: -circleSize / 2,
                marginTop: -circleSize / 2,
                borderStyle: stays.length === 0 && activeTab === 'stays' ? 'dashed' : 'solid',
              },
            ]}
          />
          <View style={styles.centerDot} />
        </View>

        <View style={styles.radiusBadge}>
          <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
          <Feather name="search" size={14} color={colors.primary} />
          <Text style={styles.radiusBadgeText}>{clampedRadius} km radius</Text>
        </View>
      </View>

      <View style={styles.radiusRow}>
        <Text style={[styles.radiusLabel, { color: colors.foreground }]}>Radius</Text>
        <RadiusSlider min={2} max={10} step={1} value={clampedRadius} onChange={setRadius} />
        <Text style={[styles.radiusValue, { color: colors.primary }]}>{clampedRadius} km</Text>
      </View>

      {activeTab === 'stays' && stays.length > 0 && (
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>Stays nearby</Text>
          <Text style={styles.listCount}>
            {stays.length} {stays.length === 1 ? 'stay' : 'stays'} within {clampedRadius} km
          </Text>
        </View>
      )}

      {activeTab === 'places' && (
        <>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.listTitle, { color: colors.foreground }]}>New around you</Text>
            <Text style={styles.listCount}>Get oriented fast</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
            {PLACE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryChip, { backgroundColor: placeCategory === c.id ? colors.primary : 'rgba(58,82,69,0.06)' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPlaceCategory(c.id);
                }}
              >
                <Text style={[styles.categoryChipText, { color: placeCategory === c.id ? colors.primaryForeground : 'rgba(20,32,26,0.6)' }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </>
  );

  const EmptyState = (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Feather name="map-pin" size={34} color={colors.primary} />
        <View style={styles.emptyIconSlash} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing within {clampedRadius} km</Text>
      <Text style={styles.emptyBody}>
        {locationLabel} is quiet right now. Widen your radius or we'll ping you the moment a verified stay is listed here.
      </Text>
      <TouchableOpacity
        style={[styles.widenBtn, { backgroundColor: colors.primary }]}
        onPress={() => setRadius(Math.min(10, clampedRadius + 4))}
      >
        <Text style={[styles.widenBtnText, { color: colors.primaryForeground }]}>Widen to {Math.min(10, clampedRadius + 4)} km</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.notifyBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
        <Feather name="bell" size={17} color={colors.foreground} />
        <Text style={[styles.notifyBtnText, { color: colors.foreground }]}>Notify me when listed</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          {Header}
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        </View>
      ) : activeTab === 'stays' ? (
        stays.length === 0 ? (
          <FlashList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={<>{Header}{EmptyState}</>}
            contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) } as any}
          />
        ) : (
          <FlashList
            data={stays}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.rowWrap}>
                <StayRow stay={item} onPress={() => router.push(`/listing/${item.id}`)} />
              </View>
            )}
            ListHeaderComponent={Header}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }] as any}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <FlashList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <TouchableOpacity
                style={[styles.placeRow, { backgroundColor: colors.card }]}
                activeOpacity={0.85}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <View style={styles.placeIcon}>
                  <Feather name={PLACE_ICON[item.type]} size={24} color="#B5842C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.placeName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={styles.placeMeta}>
                    {item.cuisine} · {item.km.toFixed(1)} km
                  </Text>
                </View>
                <Text style={[styles.placeRating, { color: colors.primary }]}>{item.rating}★</Text>
              </TouchableOpacity>
            </View>
          )}
          ListHeaderComponent={Header}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }] as any}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="coffee" size={32} color="rgba(20,32,26,0.4)" />
              <Text style={styles.emptyPlacesText}>No {placeCategory === 'all' ? 'places' : PLACE_CATEGORIES.find(c => c.id === placeCategory)?.label.toLowerCase()} found nearby yet.</Text>
            </View>
          }
        />
      )}

      <Modal visible={filterSheetOpen} transparent animationType="fade" onRequestClose={() => setFilterSheetOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setFilterSheetOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Property type</Text>
            {TYPE_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={styles.sheetRow}
                onPress={() => {
                  setTypeFilter(f.id);
                  setFilterSheetOpen(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.sheetRowText, { color: colors.foreground }]}>{f.label}</Text>
                {typeFilter === f.id && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, paddingHorizontal: 22 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  locationTap: { gap: 3 },
  locationInput: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    paddingVertical: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(20,32,26,0.42)',
    fontFamily: 'Inter_600SemiBold',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24 },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 9999,
    backgroundColor: 'rgba(58,82,69,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    padding: 5,
    marginHorizontal: 22,
    backgroundColor: 'rgba(58,82,69,0.06)',
    borderRadius: 9999,
    gap: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9999,
    alignItems: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#3A5245',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 3,
  },
  segmentText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  mapCard: {
    marginHorizontal: 22,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#E6E3D8',
    marginBottom: 14,
  },
  mapOverlay: {
    position: 'absolute',
    left: '50%',
    top: '52%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(58,82,69,0.55)',
    backgroundColor: 'rgba(58,82,69,0.1)',
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 9999,
    backgroundColor: '#3A5245',
    borderWidth: 3,
    borderColor: '#F9F8F4',
  },
  radiusBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: 'rgba(249,248,244,0.94)',
    overflow: 'hidden',
  },
  radiusBadgeText: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12, color: '#14201A' },
  goldPin: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    backgroundColor: '#E2A73E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  radiusLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  radiusValue: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 14, minWidth: 44, textAlign: 'right' },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  listTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20 },
  listCount: { fontSize: 12.5, color: 'rgba(20,32,26,0.5)' },
  chipsScroll: { marginBottom: 4 },
  chipsContent: { paddingHorizontal: 22, gap: 9, paddingBottom: 14 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 9999 },
  categoryChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  rowWrap: { paddingHorizontal: 22 },
  list: { paddingTop: 0 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 28,
    marginBottom: 14,
    shadowColor: '#14201A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 3,
  },
  placeIcon: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: 'rgba(226,167,62,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  placeMeta: { fontSize: 12.5, color: 'rgba(20,32,26,0.5)', marginTop: 3 },
  placeRating: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyPlacesText: { fontSize: 14, color: 'rgba(20,32,26,0.5)', textAlign: 'center', paddingHorizontal: 40 },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 9999,
    backgroundColor: 'rgba(58,82,69,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyIconSlash: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: '#3A5245',
    transform: [{ rotate: '45deg' }],
  },
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 24, marginBottom: 10, textAlign: 'center' },
  emptyBody: {
    fontSize: 14,
    color: 'rgba(20,32,26,0.55)',
    lineHeight: 21.7,
    textAlign: 'center',
    maxWidth: 250,
    marginBottom: 28,
  },
  widenBtn: {
    width: '100%',
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3A5245',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 4,
  },
  widenBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  notifyBtn: {
    width: '100%',
    borderRadius: 9999,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(20,32,26,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notifyBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,32,26,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 40,
  },
  sheetTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, marginBottom: 12 },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20,32,26,0.06)',
  },
  sheetRowText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
