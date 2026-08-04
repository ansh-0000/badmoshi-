import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useApp } from '@/context/AppContext';
import NetInfo from '@react-native-community/netinfo';
import { enqueueMessage, getQueuedMessages, removeQueuedMessage, incrementRetry, QueuedMessage } from '../lib/syncQueue';
import { API_BASE } from '@/constants/api'; // e.g. http://localhost:8080
import { getAccessToken } from '@/lib/api';

interface UseChatClientParams {
  chatId?: string;
  onMessageReceived?: (msg: any) => void;
  onMessageRead?: (data: { messageIds: string[], readerId: string }) => void;
  onTyping?: (data: { userId: string, typing: boolean }) => void;
}

export function useChatClient({ chatId, onMessageReceived, onMessageRead, onTyping }: UseChatClientParams) {
  const { user } = useApp();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!user) return;

    let disposed = false;
    let newSocket: Socket | null = null;
    let unsubscribeNetInfo: (() => void) | undefined;

    void (async () => {
      const token = await getAccessToken();
      if (!token || disposed) return;

      // The API accepts a JWT only during the Socket.IO handshake. It never
      // trusts a client-supplied user id from an event payload.
      const socketUrl = API_BASE.replace('/api', '');
      newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        reconnectionAttempts: Infinity,
      });

      if (disposed) {
        newSocket.disconnect();
        return;
      }
      setSocket(newSocket);

      unsubscribeNetInfo = NetInfo.addEventListener(state => {
        if (state.isConnected && newSocket?.connected) syncOfflineQueue(newSocket);
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        if (chatId) newSocket?.emit('join_room', { roomId: chatId });
        syncOfflineQueue(newSocket!);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('receive_message', (msg) => {
        if (onMessageReceived) onMessageReceived(msg);
      });

      newSocket.on('messages_read_receipt', (data) => {
        if (onMessageRead) onMessageRead(data);
      });

      newSocket.on('user_typing', (data) => {
        if (onTyping) onTyping(data);
      });

      newSocket.on('match_found', (data) => {
        console.log("Match found!", data);
      });
    })();

    return () => {
      disposed = true;
      unsubscribeNetInfo?.();
      newSocket?.disconnect();
    };
  }, [user, chatId]);

  // Sync worker
  const syncOfflineQueue = async (s: Socket) => {
    const queue = await getQueuedMessages();
    if (queue.length === 0) return;

    for (const msg of queue) {
      if (msg.retryCount > 5) {
        // Drop after 5 retries (or move to dead letter queue)
        await removeQueuedMessage(msg.id);
        continue;
      }

      s.emit('send_message', msg, async (response: any) => {
        if (response && response.success) {
          await removeQueuedMessage(msg.id);
        } else {
          await incrementRetry(msg.id);
        }
      });
    }
  };

  const sendMessage = useCallback(async (text: string, mediaUrl?: string) => {
    if (!user || !chatId) return null;

    const payload = {
      id: Date.now().toString(), // local optimistic ID
      chatId,
      senderId: user.id,
      text,
      mediaUrl
    };

    if (isConnected && socket) {
      // Send live
      return new Promise<any>((resolve) => {
        socket.emit('send_message', payload, (response: any) => {
          resolve({ ...payload, status: response?.status || 'failed' });
        });
      });
    } else {
      // Offline: Enqueue
      await enqueueMessage({ ...payload, timestamp: new Date().toISOString() });
      return { ...payload, status: 'sending' }; // 'sending' acts as pending locally
    }
  }, [socket, isConnected, user, chatId]);

  const sendTypingEvent = useCallback((typing: boolean) => {
    if (isConnected && socket && user && chatId) {
      if (typing !== isTyping) {
        socket.emit(typing ? 'typing_start' : 'typing_stop', { chatId, senderId: user.id });
        setIsTyping(typing);
      }
    }
  }, [socket, isConnected, user, chatId, isTyping]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (isConnected && socket && user && chatId && messageIds.length > 0) {
      socket.emit('message_read', { messageIds, chatId, readerId: user.id });
    }
  }, [socket, isConnected, user, chatId]);

  return {
    socket,
    isConnected,
    sendMessage,
    sendTypingEvent,
    markAsRead
  };
}
