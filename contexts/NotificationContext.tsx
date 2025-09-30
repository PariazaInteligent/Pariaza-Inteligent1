
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { AppNotification, NotificationType } from '../types';
import { NOTIFICATION_TIMEOUT } from '../constants';

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType, duration: number = NOTIFICATION_TIMEOUT) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prevNotifications) => [...prevNotifications, { id, message, type, duration }]);

    if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    );
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
    