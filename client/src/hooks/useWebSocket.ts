import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export interface UseWebSocketOptions {
    url: string;
    onMessage?: (message: WebSocketMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    reconnect?: boolean;
    reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
    const {
        url,
        onMessage,
        onOpen,
        onClose,
        onError,
        reconnect = true,
        reconnectInterval = 3000,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldReconnectRef = useRef(true);

    const callbacksRef = useRef({ onMessage, onOpen, onClose, onError });
    useEffect(() => {
        callbacksRef.current = { onMessage, onOpen, onClose, onError };
    }, [onMessage, onOpen, onClose, onError]);

    const connect = useCallback(() => {
        if (!url || url.trim() === '') {
            return;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                setIsConnected(true);
                callbacksRef.current.onOpen?.();
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);
                    callbacksRef.current.onMessage?.(message);
                } catch (error) {
                }
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                callbacksRef.current.onClose?.();

                const shouldRetry = shouldReconnectRef.current && reconnect && 
                    event.code !== 1000 &&
                    event.code !== 1008 &&
                    event.code !== 1006;
                
                if (shouldRetry) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            };

            ws.onerror = (error) => {
                callbacksRef.current.onError?.(error);
            };

            wsRef.current = ws;
        } catch (error) {
        }
    }, [url, reconnect, reconnectInterval]);

    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    useEffect(() => {
        if (url && url.trim() !== '') {
            connect();
        }
        return () => {
            shouldReconnectRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
        };
    }, [url, connect]);

    return {
        isConnected,
        lastMessage,
        sendMessage,
        disconnect,
        reconnect: connect,
    };
};

