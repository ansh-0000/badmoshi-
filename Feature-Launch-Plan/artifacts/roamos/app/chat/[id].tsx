import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { CHAT_ROOMS, Message } from '@/constants/data';
import api from '@/lib/api';
import { toFriendlyError } from '@/lib/errorMessage';
import { useChatClient } from '@/hooks/useChatClient';
import { useApp } from '@/context/AppContext';

function Bubble({ msg }: { msg: Message }) {
  const colors = useColors();
  
  const getStatusIcon = () => {
    if (msg.status === 'sending') return <Feather name="clock" size={10} color={colors.mutedForeground} />;
    if (msg.status === 'failed') return <Feather name="alert-circle" size={10} color={colors.vermillion} />;
    if (msg.status === 'sent') return <Feather name="check" size={12} color={colors.mutedForeground} />;
    if (msg.status === 'delivered') return <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>✓✓</Text>;
    if (msg.status === 'read') return <Text style={{ color: '#34B7F1', fontSize: 10 }}>✓✓</Text>;
    return null;
  };

  const isAI = msg.sender === 'AI Assistant';

  return (
    <Animated.View 
      entering={FadeInUp.duration(300).springify()} 
      layout={Layout.springify()}
      style={[styles.bubbleWrapper, msg.isOwn && styles.bubbleWrapperOwn]}
    >
      {!msg.isOwn && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isAI && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tiraViolet }} />}
          <Text style={[styles.sender, { color: isAI ? colors.tiraViolet : colors.mutedForeground }]}>{msg.sender}</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        msg.isOwn
          ? { backgroundColor: colors.primary, borderTopRightRadius: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }
          : isAI
            ? { backgroundColor: colors.tiraViolet + '15', borderColor: colors.tiraViolet + '30', borderWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
        msg.status === 'failed' && { borderColor: colors.vermillion, borderWidth: 1 }
      ]}>
        <Text style={[styles.msgText, { color: msg.isOwn ? '#fff' : colors.foreground }]}>
          {msg.text}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: msg.isOwn ? 'flex-end' : 'flex-start' }}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{msg.timestamp}</Text>
        {msg.isOwn && getStatusIcon()}
        {msg.status === 'failed' && <Text style={{ fontSize: 10, color: colors.vermillion }}>Tap to Retry</Text>}
      </View>
    </Animated.View>
  );
}

export default function ChatRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useApp();
  const queryClient = useQueryClient();

  const room = CHAT_ROOMS.find(r => r.id === id) ?? {
    id: id,
    city: 'Direct Message',
    name: 'Private Chat',
    activeUsers: 1,
    lastMessage: 'Say hi!',
    lastTime: 'now',
    emoji: '👤'
  };
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);

  const handleMessageReceived = useCallback((newMsg: any) => {
    // Determine if it's our own or someone else's
    const isOwn = newMsg.senderId === user?.id;
    const msg: Message = {
      id: newMsg.id,
      clientId: newMsg.id,
      sender: isOwn ? 'You' : (newMsg.senderName || 'User'),
      text: newMsg.text,
      timestamp: new Date(newMsg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOwn,
      status: newMsg.status || 'delivered'
    };
    
    setMessages(prev => {
      // Check for dupes just in case
      if (prev.some(m => m.id === msg.id)) {
        return prev.map(m => m.id === msg.id ? { ...m, status: msg.status } : m);
      }
      return [msg, ...prev];
    });
    setPartnerTyping(false);
  }, [user]);

  const handleTyping = useCallback((data: { userId: string, typing: boolean }) => {
    if (data.userId !== user?.id) {
      setPartnerTyping(data.typing);
    }
  }, [user]);

  const { isConnected, sendMessage, sendTypingEvent, markAsRead } = useChatClient({
    chatId: room.id,
    onMessageReceived: handleMessageReceived,
    onTyping: handleTyping,
    onMessageRead: (data) => {
      setMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m));
    }
  });

  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  // React Query for history. Was hitting the wrong path (GET /chat/:id, no
  // auth header) against a backend that serves GET /chat/:id/messages and
  // requires auth — every room loaded empty regardless of real message data.
  const { data: historyMessages, isLoading: loading } = useQuery({
    queryKey: ['chatHistory', room.id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/chat/${room.id}/messages`);
        if (data.success && data.messages) {
          return data.messages.map((m: any) => ({
            id: m.id,
            clientId: m.id,
            sender: m.senderId === user?.id ? 'You' : 'User',
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isOwn: m.senderId === user?.id,
            status: m.status
          }));
        }
        return [];
      } catch (err) {
        toFriendlyError(err, "Couldn't load this conversation.");
        return [];
      }
    },
    enabled: !!user,
  });

  // Sync React Query cache into local state for real-time appending
  useEffect(() => {
    if (historyMessages && messages.length === 0) {
      setMessages(historyMessages);
    }
  }, [historyMessages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendTypingEvent(false);
    
    const tempMsg: Message = {
      id: Date.now().toString(),
      clientId: Date.now().toString(),
      sender: 'You',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isOwn: true,
      status: 'sending'
    };
    
    setMessages(prev => [tempMsg, ...prev]);
    setText('');
    
    const result = await sendMessage(trimmed);
    if (result) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, id: result.id, status: result.status } : m));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.roomEmoji}>{room.emoji}</Text>
            <Text style={[styles.roomName, { color: colors.foreground }]}>{room.name}</Text>
          </View>
          <View style={styles.headerMeta}>
            <View style={[styles.onlineDot, { backgroundColor: isConnected ? colors.signalGreen : colors.mutedForeground }]} />
            <Text style={[styles.onlineCount, { color: colors.mutedForeground }]}>
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </Text>
          </View>
        </View>
        <Feather name="more-horizontal" size={22} color={colors.mutedForeground} />
      </View>

      {/* Messages + input */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlashList
            data={messages}
            inverted={true}
            keyExtractor={m => m.id}
            renderItem={({ item }) => <Bubble msg={item} />}
            contentContainerStyle={[styles.messages, { paddingBottom: 12, paddingTop: 12 }] as any}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              partnerTyping ? (
                 <View style={[styles.bubbleWrapper, { alignSelf: 'flex-start', marginBottom: 8 }]}>
                    <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderTopLeftRadius: 4 }]}>
                       <Text style={[styles.msgText, { color: colors.foreground, fontStyle: 'italic', fontSize: 13 }]}>Typing...</Text>
                    </View>
                 </View>
              ) : null
            }
          />
        )}

        {/* Input row */}
        <View style={[
          styles.inputRow,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            paddingBottom: bottomInset + 8,
          },
        ]}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.muted,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={text}
            onChangeText={(v) => {
              setText(v);
              sendTypingEvent(v.length > 0);
            }}
            placeholder={`Message ${room.name}…`}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
            onPress={send}
            disabled={!text.trim()}
          >
            <Feather name="send" size={18} color={text.trim() ? colors.ink : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 3 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomEmoji: { fontSize: 18 },
  roomName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineCount: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  messages: { paddingHorizontal: 16, paddingTop: 16, gap: 14, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleWrapper: { gap: 3, maxWidth: '80%' },
  bubbleWrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { fontSize: 11, fontFamily: 'Inter_500Medium', marginLeft: 4 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, maxWidth: '100%' },
  msgText: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  time: { fontSize: 10, fontFamily: 'Inter_400Regular', marginHorizontal: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
