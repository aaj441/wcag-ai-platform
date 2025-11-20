import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import toast, { Toast } from 'react-hot-toast';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isPermissionGranted: boolean;
  isLoading: boolean;
}

interface NotificationContextType extends NotificationState {
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  requestPermission: () => Promise<boolean>;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'SET_PERMISSION_GRANTED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isPermissionGranted: false,
  isLoading: false,
};

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      const unreadCount = action.payload.persistent ? state.unreadCount + 1 : state.unreadCount;
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
        unreadCount,
      };
    case 'REMOVE_NOTIFICATION':
      const filtered = state.notifications.filter(n => n.id !== action.payload);
      const removed = state.notifications.find(n => n.id === action.payload);
      const newUnreadCount = removed?.persistent && !removed.id.includes('read')
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount;
      return {
        ...state,
        notifications: filtered,
        unreadCount: newUnreadCount,
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, id: `${action.payload}-read` } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({
          ...n,
          id: n.persistent ? `${n.id}-read` : n.id,
        })),
        unreadCount: 0,
      };
    case 'SET_PERMISSION_GRANTED':
      return {
        ...state,
        isPermissionGranted: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Check browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      dispatch({
        type: 'SET_PERMISSION_GRANTED',
        payload: permission === 'granted',
      });
    }
  }, []);

  const generateId = (): string => {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addNotification = (notification: Omit<Notification, 'id'>): string => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Show toast notification
    const toastOptions: Partial<Toast> = {
      duration: newNotification.duration,
      position: 'top-right',
    };

    if (newNotification.action) {
      toastOptions.icon = '⚡';
    }

    const toastMessage = (
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {newNotification.title && (
            <div className="font-semibold text-sm">{newNotification.title}</div>
          )}
          <div className="text-sm">{newNotification.message}</div>
        </div>
        {newNotification.action && (
          <button
            onClick={newNotification.action.onClick}
            className="ml-4 px-3 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            {newNotification.action.label}
          </button>
        )}
      </div>
    );

    switch (newNotification.type) {
      case 'success':
        toast.success(toastMessage, toastOptions);
        break;
      case 'error':
        toast.error(toastMessage, toastOptions);
        break;
      case 'warning':
        toast(toastMessage, { ...toastOptions, icon: '⚠️' });
        break;
      case 'info':
      default:
        toast(toastMessage, toastOptions);
        break;
    }

    // Show browser notification if permission granted and notification is persistent
    if (
      state.isPermissionGranted &&
      newNotification.persistent &&
      typeof window !== 'undefined'
    ) {
      const browserNotification = new Notification(newNotification.title || 'Notification', {
        body: newNotification.message,
        icon: '/favicon.ico',
        tag: id,
        requireInteraction: true,
      });

      browserNotification.onclick = () => {
        window.focus();
        if (newNotification.action) {
          newNotification.action.onClick();
        }
        browserNotification.close();
      };

      // Auto-close browser notification after duration
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          browserNotification.close();
        }, newNotification.duration);
      }
    }

    return id;
  };

  const removeNotification = (id: string): void => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAllNotifications = (): void => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const markAsRead = (id: string): void => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAllAsRead = (): void => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  };

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (state.isPermissionGranted) {
      return true;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      dispatch({ type: 'SET_PERMISSION_GRANTED', payload: granted });
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const showSuccess = (message: string, title?: string): void => {
    addNotification({
      type: 'success',
      title: title || 'Success',
      message,
    });
  };

  const showError = (message: string, title?: string): void => {
    addNotification({
      type: 'error',
      title: title || 'Error',
      message,
      persistent: true,
    });
  };

  const showWarning = (message: string, title?: string): void => {
    addNotification({
      type: 'warning',
      title: title || 'Warning',
      message,
      persistent: true,
    });
  };

  const showInfo = (message: string, title?: string): void => {
    addNotification({
      type: 'info',
      title: title || 'Info',
      message,
    });
  };

  const value: NotificationContextType = {
    ...state,
    addNotification,
    removeNotification,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
    requestPermission,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;