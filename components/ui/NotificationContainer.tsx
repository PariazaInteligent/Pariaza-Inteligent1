
import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { AppNotification, NotificationType } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XMarkIcon } from './Icons'; // Assuming Icons.tsx

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  switch (type) {
    case NotificationType.SUCCESS:
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case NotificationType.ERROR:
      return <XCircleIcon className="h-6 w-6 text-red-500" />;
    case NotificationType.INFO:
      return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    case NotificationType.WARNING:
      return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
    default:
      return null;
  }
};

const Notification: React.FC<{ notification: AppNotification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  const baseClasses = "max-w-sm w-full bg-white dark:bg-neutral-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 ease-in-out";
  // Add animation classes for enter/leave if desired
  // For now, simple fade in/out handled by the container's map update.

  return (
    <div className={`${baseClasses} animate-fade-in`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <NotificationIcon type={notification.type} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1).toLowerCase()}
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {notification.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(notification.id)}
              className="inline-flex text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (!notifications.length) {
    return null;
  }

  return (
    <div aria-live="assertive" className="fixed inset-0 flex flex-col items-end px-4 py-6 space-y-4 pointer-events-none sm:p-6 sm:items-end z-[100]">
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} onDismiss={removeNotification} />
      ))}
    </div>
  );
};

export default NotificationContainer;
    