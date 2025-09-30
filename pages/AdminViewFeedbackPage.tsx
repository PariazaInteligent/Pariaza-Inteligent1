import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { FeedbackItem, AdminPermission, FeedbackCategory, FeedbackStatus } from '../types';
import { formatDate } from '../utils/helpers';
import { ChatBubbleLeftEllipsisIcon } from '../components/ui/Icons';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const AdminViewFeedbackPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, updateFeedbackStatus } = useData();

  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'ALL'>('ALL');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);

  const openViewModal = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setIsViewModalOpen(true);
  };

  if (loading || !appData || !adminUser) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const canViewFeedback = adminUser.isGlobalAdmin || adminUser.adminPermissions?.[AdminPermission.CAN_VIEW_FEEDBACK];

  if (!canViewFeedback) {
    return (
        <Card title={UI_TEXT_ROMANIAN.accessDenied} className="text-center">
            <p>{UI_TEXT_ROMANIAN.accessDenied} Nu aveți permisiunea de a vizualiza feedback-ul.</p>
        </Card>
    );
  }

  const filteredAndSortedFeedback = useMemo(() => {
    if (!appData?.feedback) return [];
    
    let feedback = [...appData.feedback];

    if (categoryFilter !== 'ALL') {
      feedback = feedback.filter(item => item.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      feedback = feedback.filter(item => item.status === statusFilter);
    }

    return feedback.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [appData?.feedback, categoryFilter, statusFilter]);

  const handleStatusChange = (feedbackId: string, newStatus: FeedbackStatus) => {
    if (adminUser && updateFeedbackStatus) {
      updateFeedbackStatus(feedbackId, newStatus, adminUser.id);
      setIsViewModalOpen(false); // Close modal after action
    }
  };

  const getStatusPillClass = (status: FeedbackStatus) => {
    switch(status) {
      case FeedbackStatus.NEW: return 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100';
      case FeedbackStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100';
      case FeedbackStatus.RESOLVED: return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100';
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100';
    }
  };

  const getCategoryText = (category: FeedbackCategory) => {
      switch(category) {
          case FeedbackCategory.BUG_REPORT: return UI_TEXT_ROMANIAN.feedbackCategoryBugReport;
          case FeedbackCategory.SUGGESTION: return UI_TEXT_ROMANIAN.feedbackCategorySuggestion;
          case FeedbackCategory.GENERAL_FEEDBACK: return UI_TEXT_ROMANIAN.feedbackCategoryGeneral;
          default: return category;
      }
  };
  
  const getStatusText = (status: FeedbackStatus) => {
      switch(status) {
          case FeedbackStatus.NEW: return UI_TEXT_ROMANIAN.feedbackStatusNew;
          case FeedbackStatus.IN_PROGRESS: return UI_TEXT_ROMANIAN.feedbackStatusInProgress;
          case FeedbackStatus.RESOLVED: return UI_TEXT_ROMANIAN.feedbackStatusResolved;
          default: return status;
      }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
          <ChatBubbleLeftEllipsisIcon className="h-8 w-8 mr-3 text-primary-500" />
          {UI_TEXT_ROMANIAN.adminViewFeedbackTitle}
        </h1>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="categoryFilter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {UI_TEXT_ROMANIAN.adminFeedbackFilterByCategory}
              </label>
              <select 
                id="categoryFilter" 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | 'ALL')}
                className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">{UI_TEXT_ROMANIAN.allCategories}</option>
                <option value={FeedbackCategory.BUG_REPORT}>{UI_TEXT_ROMANIAN.feedbackCategoryBugReport}</option>
                <option value={FeedbackCategory.SUGGESTION}>{UI_TEXT_ROMANIAN.feedbackCategorySuggestion}</option>
                <option value={FeedbackCategory.GENERAL_FEEDBACK}>{UI_TEXT_ROMANIAN.feedbackCategoryGeneral}</option>
              </select>
            </div>
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {UI_TEXT_ROMANIAN.adminFeedbackFilterByStatus}
              </label>
              <select 
                id="statusFilter" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | 'ALL')}
                className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="ALL">{UI_TEXT_ROMANIAN.allStatuses}</option>
                <option value={FeedbackStatus.NEW}>{UI_TEXT_ROMANIAN.feedbackStatusNew}</option>
                <option value={FeedbackStatus.IN_PROGRESS}>{UI_TEXT_ROMANIAN.feedbackStatusInProgress}</option>
                <option value={FeedbackStatus.RESOLVED}>{UI_TEXT_ROMANIAN.feedbackStatusResolved}</option>
              </select>
            </div>
          </div>

          {filteredAndSortedFeedback.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableDate}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableUser}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableCategory}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableSubject}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableDescription}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.adminFeedbackTableStatus}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {filteredAndSortedFeedback.map((item: FeedbackItem) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors cursor-pointer"
                      onClick={() => openViewModal(item)}
                      aria-label={`Vezi detalii pentru feedback: ${item.subject}`}
                      tabIndex={0}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{formatDate(item.timestamp)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100" title={item.userEmail}>{item.userName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{getCategoryText(item.category)}</td>
                      <td className="px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100 max-w-xs truncate" title={item.subject}>{item.subject}</td>
                      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 max-w-sm truncate" title={item.description}>{item.description}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillClass(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-10 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noFeedbackSubmitted}</p>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Detalii Feedback: "${selectedFeedback?.subject || ''}"`}
        size="screen75"
        footerContent={
          selectedFeedback && (
            <div className="flex justify-end items-center space-x-2">
                <Button 
                    variant="outline" 
                    size="md" 
                    onClick={() => handleStatusChange(selectedFeedback.id, FeedbackStatus.IN_PROGRESS)}
                    disabled={selectedFeedback.status === FeedbackStatus.IN_PROGRESS || selectedFeedback.status === FeedbackStatus.RESOLVED}
                >
                    {UI_TEXT_ROMANIAN.markAsInProgress}
                </Button>
                <Button 
                    variant="secondary" 
                    size="md" 
                    onClick={() => handleStatusChange(selectedFeedback.id, FeedbackStatus.RESOLVED)}
                    disabled={selectedFeedback.status === FeedbackStatus.RESOLVED}
                >
                    {UI_TEXT_ROMANIAN.markAsResolved}
                </Button>
            </div>
          )
        }
      >
        {selectedFeedback && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">Utilizator</p>
                <p>{selectedFeedback.userName} ({selectedFeedback.userEmail})</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">Categorie</p>
                <p>{getCategoryText(selectedFeedback.category)}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">Data</p>
                <p>{formatDate(selectedFeedback.timestamp)}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">Status</p>
                <p><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusPillClass(selectedFeedback.status)}`}>
                    {getStatusText(selectedFeedback.status)}
                  </span></p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">Descriere completă</p>
              <div className="mt-1 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg max-h-64 overflow-y-auto border dark:border-neutral-600">
                  <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">{selectedFeedback.description}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminViewFeedbackPage;
