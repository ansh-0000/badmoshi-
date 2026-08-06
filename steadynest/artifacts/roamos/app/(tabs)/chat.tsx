import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import api from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { useTabBarClearance } from '@/constants/layout';

interface Thread {
  chatId: string;
  otherUser: { id: string; name: string; role: 'tenant' | 'landlord' | null; avatarUrl: string | null };
  lastMessage: string;
  lastTimestamp: string | null;
  unreadCount: number;
}

// Matches the design's mono time column: "9:32" today, "Yest" yesterday,
// weekday abbreviation within the last week, else a short date.
function formatThreadTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yest';

  const daysAgo = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ThreadRow({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  const colors = useColors();
  const initial = thread.otherUser.name.charAt(0).toUpperCase();
  const isLandlord = thread.otherUser.role === 'landlord';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
        <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
      </View>
      <View style={[styles.rowContent, { borderBottomColor: colors.border }]}>
        <View style={styles.rowTop}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {thread.otherUser.name}
            </Text>
            {isLandlord && (
              <View style={[styles.landlordTag, { backgroundColor: colors.accent + '2E' }]}>
                <Text style={[styles.landlordTagText, { color: '#8A6A22' }]}>Landlord</Text>
              </View>
            )}
          </View>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatThreadTime(thread.lastTimestamp)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
            {thread.lastMessage || 'Say hi!'}
          </Text>
          {thread.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{thread.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const [query, setQuery] = useState('');
  const tabBarClearance = useTabBarClearance();

  const { data: threads = [], isLoading } = useQuery<Thread[]>({
    queryKey: ['chatThreads'],
    queryFn: async () => {
      const { data } = await api.get('/chat/threads');
      return data.threads ?? [];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.trim().toLowerCase();
    return threads.filter((t) => t.otherUser.name.toLowerCase().includes(q));
  }, [threads, query]);

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Messages</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.muted }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search conversations"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(t) => t.chatId}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.chatId, name: item.otherUser.name, role: item.otherUser.role ?? '' },
                });
              }}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarClearance },
          ] as any}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.muted }]}>
                <Feather name="message-circle" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                When you match on Connect or reach out to an owner from Stays, your chats land
                here — voice translation built in.
              </Text>
              <TouchableOpacity
                style={[styles.findBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(tabs)/match');
                }}
              >
                <Feather name="users" size={18} color={colors.primaryForeground} />
                <Text style={[styles.findBtnText, { color: colors.primaryForeground }]}>Find flatmates</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  screenTitle: { fontSize: 28, fontFamily: 'PlayfairDisplay_600SemiBold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 9999,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },
  list: { paddingHorizontal: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontFamily: 'PlayfairDisplay_600SemiBold' },
  rowContent: { flex: 1, minWidth: 0, borderBottomWidth: 1, paddingBottom: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  name: { fontSize: 15.5, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },
  landlordTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  landlordTagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  time: { fontSize: 11, fontFamily: 'JetBrainsMono_500Medium' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 },
  lastMsg: { fontSize: 13.5, fontFamily: 'Inter_400Regular', flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { color: '#F9F8F4', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 25, marginBottom: 10 },
  emptyBody: { fontSize: 14, lineHeight: 21.7, textAlign: 'center', maxWidth: 260, marginBottom: 30 },
  findBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 9999,
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
  findBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
