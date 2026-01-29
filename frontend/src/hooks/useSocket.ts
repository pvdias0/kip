import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

interface SocketEvents {
  'transaction:created': (transaction: any) => void;
  'transaction:updated': (transaction: any) => void;
  'transaction:deleted': (data: { id: string }) => void;
  'stats:updated': (stats: any) => void;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<Function>>>(new Map());

  // Inicializar conexão
  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      console.warn('[Socket] ❌ Token não disponível em localStorage');
      return;
    }

    console.log('[Socket] 🔐 Token encontrado (primeiros 20 chars):', token.substring(0, 20) + '...');

    // Criar conexão com autenticação
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] ✅ Conectado ao servidor:', socketRef.current?.id);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[Socket] ❌ Erro de conexão:', error);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket] 🔌 Desconectado do servidor');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Registrar listeners para um evento
  const on = useCallback(
    (event: string, callback: Function) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());

        // Adicionar listener no socket
        if (socketRef.current) {
          socketRef.current.on(event, (data) => {
            const listeners = listenersRef.current.get(event);
            if (listeners) {
              listeners.forEach((cb) => cb(data));
            }
          });
        }
      }

      listenersRef.current.get(event)?.add(callback);

      // Retornar função para desregistrar
      return () => {
        listenersRef.current.get(event)?.delete(callback);
      };
    },
    []
  );

  // Emitir evento
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Verificar conexão
  const isConnected = socketRef.current?.connected ?? false;

  return {
    socket: socketRef.current,
    on,
    emit,
    isConnected,
  };
}
