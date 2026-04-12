import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/api-config";

interface SocketEvents {
  "transaction:created": (transaction: Record<string, unknown>) => void;
  "transaction:updated": (transaction: Record<string, unknown>) => void;
  "transaction:deleted": (data: { id: string }) => void;
  "stats:updated": (stats: Record<string, unknown>) => void;
}

let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<
    Map<string, Set<(data: Record<string, unknown>) => void>>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      setIsConnected(true);
      return;
    }

    if (globalSocket && !globalSocket.disconnected) {
      socketRef.current = globalSocket;
      return;
    }

    const token = localStorage.getItem("auth_token");

    if (!token) {
      return;
    }

    globalSocket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      forceNew: false,
    });

    socketRef.current = globalSocket;

    globalSocket.on("connect", () => {
      setIsConnected(true);
    });

    globalSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    globalSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socketRef.current = null;
    };
  }, []);

  const on = useCallback(
    (event: string, callback: (data: Record<string, unknown>) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());

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

      return () => {
        listenersRef.current.get(event)?.delete(callback);
      };
    },
    [],
  );

  const emit = useCallback((event: string, data?: Record<string, unknown>) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    socket: socketRef.current,
    on,
    emit,
    isConnected,
  };
}
