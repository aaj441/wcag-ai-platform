import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotifications } from './NotificationContext';

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscriptions: Set<string>;
}

interface WebSocketContextType extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  subscribeToScan: (scanId: string) => void;
  unsubscribeFromScan: (scanId: string) => void;
  sendScanCommand: (scanId: string, command: string, data?: any) => void;
}

type WebSocketAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED'; payload: Socket }
  | { type: 'DISCONNECTED' }
  | { type: 'ERROR'; payload: string }
  | { type: 'SUBSCRIBE'; payload: string }
  | { type: 'UNSUBSCRIBE'; payload: string }
  | { type: 'CLEAR_SUBSCRIPTIONS' };

const initialState: WebSocketState = {
  socket: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  subscriptions: new Set(),
};

const webSocketReducer = (
  state: WebSocketState,
  action: WebSocketAction
): WebSocketState => {
  switch (action.type) {
    case 'CONNECTING':
      return {
        ...state,
        isConnecting: true,
        error: null,
      };
    case 'CONNECTED':
      return {
        ...state,
        socket: action.payload,
        isConnected: true,
        isConnecting: false,
        error: null,
      };
    case 'DISCONNECTED':
      return {
        ...state,
        socket: null,
        isConnected: false,
        isConnecting: false,
        error: null,
        subscriptions: new Set(),
      };
    case 'ERROR':
      return {
        ...state,
        socket: null,
        isConnected: false,
        isConnecting: false,
        error: action.payload,
        subscriptions: new Set(),
      };
    case 'SUBSCRIBE':
      return {
        ...state,
        subscriptions: new Set([...state.subscriptions, action.payload]),
      };
    case 'UNSUBSCRIBE':
      const newSubscriptions = new Set(state.subscriptions);
      newSubscriptions.delete(action.payload);
      return {
        ...state,
        subscriptions: newSubscriptions,
      };
    case 'CLEAR_SUBSCRIPTIONS':
      return {
        ...state,
        subscriptions: new Set(),
      };
    default:
      return state;
  }
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(webSocketReducer, initialState);
  const { addNotification } = useNotifications();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = () => {
    if (state.isConnecting || state.isConnected) {
      return;
    }

    dispatch({ type: 'CONNECTING' });

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      const token = localStorage.getItem('token');

      if (!token) {
        dispatch({ type: 'ERROR', payload: 'Authentication token required' });
        return;
      }

      const socket = io(wsUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false, // Handle reconnection manually
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        dispatch({ type: 'CONNECTED', payload: socket });
        reconnectAttempts.current = 0;
        
        addNotification({
          type: 'success',
          title: 'Connected',
          message: 'Real-time updates are now active',
          duration: 3000,
        });

        // Re-subscribe to previous subscriptions
        state.subscriptions.forEach(scanId => {
          socket.emit('subscribe_scan', { scanId });
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        dispatch({ type: 'DISCONNECTED' });
        
        if (reason === 'io server disconnect') {
          // The disconnection was initiated by the server, reconnect manually
          setTimeout(() => {
            if (reconnectAttempts.current < maxReconnectAttempts) {
              reconnectAttempts.current++;
              connect();
            }
          }, 1000 * reconnectAttempts.current);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        dispatch({ type: 'ERROR', payload: error.message });
        
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to connect to real-time updates',
          persistent: true,
        });

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, 1000 * reconnectAttempts.current);
        }
      });

      // Handle incoming messages
      socket.on('scan_progress', (data) => {
        console.log('Scan progress update:', data);
        
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('scan_progress', { detail: data }));
        
        if (data.progress === 100) {
          addNotification({
            type: 'success',
            title: 'Scan Completed',
            message: `Accessibility scan for ${data.scanId} has completed successfully`,
            action: {
              label: 'View Results',
              onClick: () => {
                window.location.href = `/scans/${data.scanId}`;
              },
            },
          });
        }
      });

      socket.on('scan_complete', (data) => {
        console.log('Scan completed:', data);
        
        window.dispatchEvent(new CustomEvent('scan_complete', { detail: data }));
        
        addNotification({
          type: 'success',
          title: 'Scan Complete',
          message: `Your accessibility scan is ready! Score: ${data.results.score}%`,
          action: {
            label: 'View Report',
            onClick: () => {
              window.location.href = `/scans/${data.scanId}`;
            },
          },
        });
      });

      socket.on('scan_error', (data) => {
        console.error('Scan error:', data);
        
        window.dispatchEvent(new CustomEvent('scan_error', { detail: data }));
        
        addNotification({
          type: 'error',
          title: 'Scan Failed',
          message: `Accessibility scan failed: ${data.error}`,
          persistent: true,
        });
      });

      socket.on('notification', (data) => {
        console.log('Notification received:', data);
        
        addNotification({
          type: data.type,
          title: data.title,
          message: data.message,
          persistent: data.type === 'error' || data.type === 'warning',
          action: data.actionUrl ? {
            label: 'View',
            onClick: () => {
              window.location.href = data.actionUrl;
            },
          } : undefined,
        });
      });

      socket.on('system_notification', (data) => {
        console.log('System notification:', data);
        
        addNotification({
          type: data.type,
          title: data.title,
          message: data.message,
          persistent: true,
        });
      });

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      dispatch({ type: 'ERROR', payload: 'Failed to initialize WebSocket' });
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (state.socket) {
      state.socket.disconnect();
    }

    dispatch({ type: 'DISCONNECTED' });
  };

  const subscribeToScan = (scanId: string) => {
    if (!state.socket) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    state.socket.emit('subscribe_scan', { scanId });
    dispatch({ type: 'SUBSCRIBE', payload: scanId });
  };

  const unsubscribeFromScan = (scanId: string) => {
    if (!state.socket) {
      return;
    }

    state.socket.emit('unsubscribe_scan', { scanId });
    dispatch({ type: 'UNSUBSCRIBE', payload: scanId });
  };

  const sendScanCommand = (scanId: string, command: string, data?: any) => {
    if (!state.socket) {
      console.warn('Cannot send command: WebSocket not connected');
      return;
    }

    state.socket.emit('scan_command', {
      scanId,
      command,
      data,
    });
  };

  // Auto-connect when component mounts and user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Reconnect when token changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !state.isConnected && !state.isConnecting) {
      connect();
    } else if (!token && state.isConnected) {
      disconnect();
    }
  }, [localStorage.getItem('token')]);

  const value: WebSocketContextType = {
    ...state,
    connect,
    disconnect,
    subscribeToScan,
    unsubscribeFromScan,
    sendScanCommand,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;