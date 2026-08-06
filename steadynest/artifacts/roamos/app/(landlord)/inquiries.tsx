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

interface Inquiry {
  id: string;
  listingId: string;
  tenantName: string;
  tenantEmail: string;
  message: string;
  date: string;
  status: 'pending' | 'replied';
}

type FilterStatus = 'all' | 'pending' | 'replied';

export default function InquiriesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 90);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/landlord/inquiries?ownerId=${user.id}`)
      .then(r => r.json())
      .then(d => setInquiries(d.inquiries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleReply = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReplyingId(id);
    try {
      const res = await fetch(`${API_BASE}/landlord/inquiries/${id}/reply`, { method: 'POST' });
      if (res.ok) {
        setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: 'replied' } : i));
        Alert.alert('Marked as replied', 'The inquiry has been updated.');
      }
    } catch {
      Alert.alert('Error', 'Could not update inquiry.');
    } finally {
      setReplyingId(null);
    }
  };

  const filtered = filter === 'all' ? inquiries : inquiries.filter(i => i.status === filter);
  const pendingCount = inquiries.filter(i => i.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#F05A28', '#FF8A65', '#FFCCBC']}
        style={[styles.header, { paddingTop: topInset + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>INQUIRIES</Text>
        <Text style={styles.headerSub}>
          {pendingCount > 0
            ? `${pendingCount} new ${pendingCount === 1 ? 'message' : 'messages'} waiting`
            : 'All caught up!'}
        </Text>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {(['all', 'pending', 'replied'] as FilterStatus[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color="#F05A28" style={{ marginTop: 40 }} />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomInset }] as any}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color="#FFCCBC" />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No inquiries yet' : `No ${filter} inquiries`}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'all' ? 'Tenant messages will appear here' : 'Switch the filter above'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.status === 'pending' && { borderLeftWidth: 4, borderLeftColor: '#F05A28' }]}>
              {/* Tenant info */}
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: item.status === 'pending' ? '#FFF3E0' : '#E0F2F1' }]}>
                  <Text style={styles.avatarText}>
                    {item.tenantName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{item.tenantName}</Text>
                  <Text style={styles.tenantEmail}>{item.tenantEmail}</Text>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === 'pending' ? '#FFF3E0' : '#E0F2F1',
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.status === 'pending' ? '#F05A28' : '#00897B',
                  }]}>
                    {item.status === 'pending' ? 'NEW' : 'REPLIED'}
                  </Text>
                </View>
              </View>

              {/* Message */}
              <View style={styles.msgBox}>
                <Feather name="message-circle" size={13} color="#9E7B5A" />
                <Text style={styles.msgText}>{item.message}</Text>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{item.date}</Text>
                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.replyBtn}
                    onPress={() => handleReply(item.id)}
                    disabled={replyingId === item.id}
                  >
                    {replyingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="check-circle" size={14} color="#fff" />
                        <Text style={styles.replyBtnText}>Mark Replied</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 1.5 },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.9)' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterBtnActive: { backgroundColor: '#fff' },
  filterText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' },
  filterTextActive: { color: '#F05A28' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#F05A28' },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  tenantEmail: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9E7B5A', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  msgBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    padding: 12,
  },
  msgText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#1C0F00', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#9E7B5A' },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00897B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  replyBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: '#1C0F00' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9E7B5A', textAlign: 'center' },
});
