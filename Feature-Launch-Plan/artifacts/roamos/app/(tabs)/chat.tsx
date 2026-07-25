import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { CHAT_ROOMS, ChatRoom } from '@/constants/data';

function RoomRow({ room, onPress }: { room: ChatRoom; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* City emoji avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.card, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }]}>
        <Text style={styles.emojiText}>{room.emoji}</Text>
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.roomName, { color: colors.foreground }]}>{room.name}</Text>
          <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{room.lastTime}</Text>
        </View>
        <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
          {room.lastMessage}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.activePip, { backgroundColor: colors.accent }]} />
          <Text style={[styles.activeCount, { color: colors.accent }]}>
            {room.activeUsers} nomads online
          </Text>
        </View>
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const totalOnline = CHAT_ROOMS.reduce((s, r) => s + r.activeUsers, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.tiraViolet + '10', 'transparent']}
        style={[StyleSheet.absoluteFill, { height: 300 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>COMMUNITY</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Location-based group chat
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/guide' as any);
          }}
        >
          <Feather name="compass" size={16} color={colors.primary} />
          <Text style={[styles.aiButtonText, { color: colors.primary }]}>AI Guide</Text>
        </TouchableOpacity>
      </View>

      {/* City rooms */}
      <FlashList
        data={CHAT_ROOMS}
        keyExtractor={r => r.id}
        renderItem={({ item }) => (
          <RoomRow
            room={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/chat/[id]', params: { id: item.id } });
            }}
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) },
        ] as any}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTIVE ROOMS</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emojiText: { fontSize: 22 },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  timeText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  lastMsg: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activePip: { width: 5, height: 5, borderRadius: 3 },
  activeCount: { fontSize: 11, fontFamily: 'Inter_500Medium' },
});
