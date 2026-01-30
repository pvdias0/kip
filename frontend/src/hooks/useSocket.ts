import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "https://kip.pvapps.com.br";

interface SocketEvents {
  "transaction:created": (transaction: Record<string, unknown>) => void;
  "transaction:updated": (transaction: Record<string, unknown>) => void;
  "transaction:deleted": (data: { id: string }) => void;
  "stats:updated": (stats: Record<string, unknown>) => void;
}

// Global singleton para evitar múltiplas conexões
let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<
    Map<string, Set<(data: Record<string, unknown>) => void>>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Inicializar conexão (apenas uma vez - singleton)
  useEffect(() => {
    // Se já temos uma conexão global ativa, usar ela
    if (globalSocket?.connected) {
      console.log(
        "[Socket] ♻️ Reutilizando conexão existente:",
        globalSocket.id,
      );
      socketRef.current = globalSocket;
      setIsConnected(true);
      return;
    }

    // Se há uma conexão em progresso, não criar outra
    if (globalSocket && !globalSocket.disconnected) {
      console.log("[Socket] ⏳ Aguardando conexão existente...");
      socketRef.current = globalSocket;
      return;
    }

    const token = localStorage.getItem("auth_token");

    if (!token) {
      return;
    }

    // Criar conexão com autenticação
    globalSocket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      forceNew: false, // Reutilizar conexão existente
    });

    socketRef.current = globalSocket;

    globalSocket.on("connect", () => {
      setIsConnected(true);
    });

    globalSocket.on("connect_error", (error) => {
      setIsConnected(false);
    });

    globalSocket.on("disconnect", () => {
      console.log("[Socket] 🔌 Desconectado do servidor");
      setIsConnected(false);
    });

    return () => {
      // Não desconectar globalmente, apenas remover referência local
      socketRef.current = null;
    };
  }, []);

  // Registrar listeners para um evento
  const on = useCallback(
    (event: string, callback: (data: Record<string, unknown>) => void) => {
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
    [],
  );

  // Emitir evento
  const emit = useCallback((event: string, data?: Record<string, unknown>) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Verificar conexão
  return {
    socket: socketRef.current,
    on,
    emit,
    isConnected,
  };
}
