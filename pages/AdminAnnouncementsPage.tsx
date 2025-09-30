import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Announcement, MessageImportance, NotificationType, AdminPermission, TransactionType, TransactionStatus, AuditDetail } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { formatDate, generateId, generateAuditDetails } from '../utils/helpers';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, MegaphoneIcon } from '../components/ui/Icons';

const AdminAnnouncementsPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, addAnnouncement, updateAnnouncement, deleteAnnouncement, addTransaction } = useData(); // Added addTransaction for direct logging
  const { addNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<{ title: string; content: string; importance: MessageImportance }>({
    title: '',
    content: '',
    importance: MessageImportance.MEDIUM,
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  const canManage = adminUser?.isGlobalAdmin || adminUser?.adminPermissions?.[AdminPermission.CAN_MANAGE_ANNOUNCEMENTS];

  useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        importance: editingAnnouncement.importance,
      });
    } else {
      setFormData({ title: '', content: '', importance: MessageImportance.MEDIUM });
    }
  }, [editingAnnouncement, isModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModalForCreate = () => {
    if (!canManage) {
        addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
        return;
    }
    setEditingAnnouncement(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (ann: Announcement) => {
    if (!canManage) {
        addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
        return;
    }
    setEditingAnnouncement(ann);
    setIsModalOpen(true);
  };

  const handleDelete = (ann: Announcement) => {
     if (!canManage) {
        addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
        return;
    }
    setAnnouncementToDelete(ann);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (announcementToDelete && canManage && adminUser) {
      try {
        deleteAnnouncement(announcementToDelete.id); // This should call addTransaction internally in DataContext
        addNotification(UI_TEXT_ROMANIAN.announcementDeletedSuccessfully, NotificationType.SUCCESS);
      } catch (e) {
        addNotification(UI_TEXT_ROMANIAN.failedToDeleteAnnouncement, NotificationType.ERROR);
      }
    }
    setIsDeleteModalOpen(false);
    setAnnouncementToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !adminUser) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      addNotification("Titlul și conținutul sunt obligatorii.", NotificationType.ERROR);
      return;
    }

    try {
      if (editingAnnouncement) {
        const updatedFullAnnouncement: Announcement = {
          ...editingAnnouncement,
          title: formData.title,
          content: formData.content,
          importance: formData.importance,
        };
        // Pass both old and new data to DataContext's updateAnnouncement
        updateAnnouncement(editingAnnouncement, updatedFullAnnouncement); 
        addNotification(UI_TEXT_ROMANIAN.announcementUpdatedSuccessfully, NotificationType.SUCCESS);

      } else { // Creating new
        const newAnn = addAnnouncement({ // addAnnouncement in DataContext handles logging
          ...formData,
          createdBy: adminUser.id,
        });
        if (newAnn) {
          addNotification(UI_TEXT_ROMANIAN.announcementCreatedSuccessfully, NotificationType.SUCCESS);
        } else {
           addNotification(UI_TEXT_ROMANIAN.failedToCreateAnnouncement, NotificationType.ERROR);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
       addNotification(editingAnnouncement ? UI_TEXT_ROMANIAN.failedToUpdateAnnouncement : UI_TEXT_ROMANIAN.failedToCreateAnnouncement, NotificationType.ERROR);
    }
  };
  
  if (loading || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
   if (!canManage) {
    return (
        <Card title={UI_TEXT_ROMANIAN.accessDenied} className="text-center">
            <p>{UI_TEXT_ROMANIAN.accessDenied}. Nu aveți permisiunea de a gestiona anunțurile.</p>
        </Card>
    );
  }

  const sortedAnnouncements = [...(appData.announcements || [])].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <MegaphoneIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.manageAnnouncements}
      </h1>

      <Button onClick={openModalForCreate} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5" />}>
        {UI_TEXT_ROMANIAN.createNewAnnouncement}
      </Button>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Titlu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Importanță</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Creat La</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
              {sortedAnnouncements.map(ann => (
                <tr key={ann.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">{ann.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${ann.importance === MessageImportance.HIGH ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' : 
                          ann.importance === MessageImportance.MEDIUM ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 
                          'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100'}`}>
                      {ann.importance}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{formatDate(ann.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openModalForEdit(ann)} aria-label={`Modifică ${ann.title}`}>
                      <PencilSquareIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ann)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400" aria-label={`Șterge ${ann.title}`}>
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedAnnouncements.length === 0 && <p className="text-center py-4 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noAnnouncements}</p>}
        </div>
      </Card>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAnnouncement ? `Modifică Anunț` : UI_TEXT_ROMANIAN.createNewAnnouncement}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={UI_TEXT_ROMANIAN.announcementTitle} name="title" value={formData.title} onChange={handleInputChange} required />
            <Textarea label={UI_TEXT_ROMANIAN.announcementContent} name="content" value={formData.content} onChange={handleInputChange} rows={5} required />
            <div>
              <label htmlFor="importance" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.announcementImportance}</label>
              <select id="importance" name="importance" value={formData.importance} onChange={handleInputChange} className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500">
                <option value={MessageImportance.LOW}>{UI_TEXT_ROMANIAN.importanceLow}</option>
                <option value={MessageImportance.MEDIUM}>{UI_TEXT_ROMANIAN.importanceMedium}</option>
                <option value={MessageImportance.HIGH}>{UI_TEXT_ROMANIAN.importanceHigh}</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{UI_TEXT_ROMANIAN.cancel}</Button>
              <Button variant="primary" type="submit">{editingAnnouncement ? UI_TEXT_ROMANIAN.save : UI_TEXT_ROMANIAN.createNewAnnouncement}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && announcementToDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={UI_TEXT_ROMANIAN.confirmAnnouncementDeletionTitle}
          message={`${UI_TEXT_ROMANIAN.confirmAnnouncementDeletionMessage} "${announcementToDelete.title}"`}
          confirmText={UI_TEXT_ROMANIAN.delete}
        />
      )}
    </div>
  );
};

export default AdminAnnouncementsPage;