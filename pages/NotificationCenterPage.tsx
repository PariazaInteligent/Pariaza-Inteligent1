
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom'; // Added Link import
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { Announcement, UserMessage, MessageImportance, UserMessageType } from '../types';
import { formatDate } from '../utils/helpers';
import { BellIcon, MegaphoneIcon, CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '../components/ui/Icons'; // Assuming suitable icons exist

type TabType = 'announcements' | 'personalMessages';

const NotificationCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading, markUserMessageAsRead, markAllUserMessagesAsRead } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('announcements');

  const sortedAnnouncements = useMemo(() => {
    if (!appData?.announcements) return [];
    return [...appData.announcements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appData?.announcements]);

  const userMessages = useMemo(() => {
    if (!appData?.userMessages || !user) return [];
    return [...appData.userMessages]
      .filter(msg => msg.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appData?.userMessages, user]);

  if (loading || !appData || !user) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const getImportanceClass = (importance: MessageImportance) => {
    switch (importance) {
      case MessageImportance.HIGH: return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/30';
      case MessageImportance.MEDIUM: return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30';
      case MessageImportance.LOW: return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30';
      default: return 'border-l-4 border-neutral-300 dark:border-neutral-600';
    }
  };

  const getMessageTypeIcon = (type: UserMessageType) => {
    switch (type) {
        case UserMessageType.SUCCESS: return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
        case UserMessageType.INFO: return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
        case UserMessageType.WARNING: return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
        case UserMessageType.ERROR: return <XCircleIcon className="h-5 w-5 text-red-500" />;
        case UserMessageType.ACTION_REQUIRED: return <ExclamationTriangleIcon className="h-5 w-5 text-purple-500" />;
        default: return <InformationCircleIcon className="h-5 w-5 text-neutral-500" />;
    }
  };

  const handleMarkAsRead = (messageId: string) => {
    markUserMessageAsRead(messageId, user.id);
  };
  
  const handleMarkAllRead = () => {
    markAllUserMessagesAsRead(user.id);
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <BellIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.notificationCenter}
      </h1>

      <Card>
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`${
                activeTab === 'announcements'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-600'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <MegaphoneIcon className="h-5 w-5 mr-2" /> {UI_TEXT_ROMANIAN.announcementsTab}
            </button>
            <button
              onClick={() => setActiveTab('personalMessages')}
              className={`${
                activeTab === 'personalMessages'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-600'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <BellIcon className="h-5 w-5 mr-2" /> {UI_TEXT_ROMANIAN.personalMessagesTab}
              {userMessages.filter(msg => !msg.isRead).length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {userMessages.filter(msg => !msg.isRead).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {sortedAnnouncements.length > 0 ? sortedAnnouncements.map((ann: Announcement) => (
                <div key={ann.id} className={`p-4 rounded-lg shadow-sm ${getImportanceClass(ann.importance)}`}>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{ann.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Publicat la: {formatDate(ann.createdAt)} de Admin ID: {ann.createdBy.substring(0,8)}...
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{ann.content}</p>
                </div>
              )) : <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noAnnouncements}</p>}
            </div>
          )}

          {activeTab === 'personalMessages' && (
            <div className="space-y-4">
              {userMessages.filter(msg => !msg.isRead).length > 0 && (
                <div className="text-right mb-4">
                    <Button onClick={handleMarkAllRead} variant="outline" size="sm">
                        {UI_TEXT_ROMANIAN.markAllAsRead}
                    </Button>
                </div>
              )}
              {userMessages.length > 0 ? userMessages.map((msg: UserMessage) => (
                <div key={msg.id} className={`p-4 rounded-lg shadow-sm border-l-4 ${msg.isRead ? 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/60' : 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5 mr-3">{getMessageTypeIcon(msg.type)}</div>
                    <div className="flex-grow">
                        <h3 className={`text-md font-semibold ${msg.isRead ? 'text-neutral-700 dark:text-neutral-200' : 'text-primary-700 dark:text-primary-300'}`}>{msg.title}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Primit la: {formatDate(msg.createdAt)}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{msg.content}</p>
                        {msg.linkTo && (
                            <Link to={msg.linkTo} className="mt-2 inline-block">
                                <Button variant="ghost" size="sm" className="text-primary-600 dark:text-primary-400">
                                    {UI_TEXT_ROMANIAN.viewDetails}
                                </Button>
                            </Link>
                        )}
                    </div>
                    {!msg.isRead && (
                        <Button onClick={() => handleMarkAsRead(msg.id)} variant="ghost" size="sm" className="ml-4 flex-shrink-0" aria-label={UI_TEXT_ROMANIAN.markAsRead}>
                            <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-green-500" />
                        </Button>
                    )}
                  </div>
                </div>
              )) : <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noPersonalMessages}</p>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationCenterPage;