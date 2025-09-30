import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { User, Role, NotificationType, UserProfileData, AdminPermission, AccentPaletteKey, InterfaceDensity, FeedbackStatus } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Input, { Textarea } from '../components/ui/Input';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import SwitchToggle from '../components/ui/SwitchToggle';
import { UI_TEXT_ROMANIAN, DEFAULT_AVATAR_URL, AVAILABLE_ADMIN_PERMISSIONS } from '../constants';
import { formatDate, generateId } from '../utils/helpers';
import { UsersIcon, UserPlusIcon, PencilSquareIcon, TrashIcon, ShieldCheckIcon, EyeIcon, CheckCircleIcon, XCircleIcon } from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from '../components/ui/UserProfileModal';

const AdminUsersPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, addUserInContext, updateUserInContext, addTransaction, exportData, linkReferral, sendBulkUserMessages } = useData();
  const { addNotification } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [filterRole, setFilterRole] = useState<Role | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);


  useEffect(() => {
    if (appData?.users) {
      setUsers(appData.users);
    }
  }, [appData?.users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        if (filterRole !== 'ALL' && u.role !== filterRole) return false;
        if (filterStatus !== 'ALL' && u.isActive !== (filterStatus === 'ACTIVE')) return false;
        if (searchTerm && !u.name.toLowerCase().includes(searchTerm.toLowerCase()) && !u.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, filterRole, filterStatus, searchTerm]);
  
  const investorsInView = useMemo(() => filteredUsers.filter(u => u.role === Role.USER), [filteredUsers]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAllInvestors = () => {
    if (selectedUserIds.size === investorsInView.length) {
      setSelectedUserIds(new Set()); // Deselect all
    } else {
      setSelectedUserIds(new Set(investorsInView.map(u => u.id))); // Select all
    }
  };

  const openCreateModal = (role: Role) => {
    setIsCreatingNew(true);
    setSelectedUser({
      id: '', name: '', email: '', role, avatar: DEFAULT_AVATAR_URL, isActive: true,
      profileData: { investedAmount: 0, totalProfitEarned: 0, joinDate: new Date().toISOString(), investmentHistory: [], badges: [] },
      adminPermissions: role === Role.ADMIN ? {} : undefined,
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsCreatingNew(false);
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    if(user.id === adminUser?.id){
        addNotification(UI_TEXT_ROMANIAN.cannotDeleteSelf, NotificationType.ERROR);
        return;
    }
    if(user.isGlobalAdmin){
        addNotification(UI_TEXT_ROMANIAN.cannotDeleteGlobalAdmin, NotificationType.ERROR);
        return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const openProfileModal = (user: User) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const openMessageModal = () => {
    if (selectedUserIds.size === 0) {
        addNotification("Selectează cel puțin un utilizator pentru a trimite un mesaj.", NotificationType.WARNING);
        return;
    }
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!adminUser || !messageTitle.trim() || !messageContent.trim()) {
      addNotification("Titlul și conținutul mesajului sunt obligatorii.", NotificationType.WARNING);
      return;
    }
    setIsSendingMessage(true);
    try {
        await sendBulkUserMessages(Array.from(selectedUserIds), messageTitle, messageContent, adminUser.id);
        // Success notification is handled in the context
        setMessageTitle('');
        setMessageContent('');
        setSelectedUserIds(new Set());
        setIsMessageModalOpen(false);
    } catch (e) {
        addNotification("Eroare la trimiterea mesajului.", NotificationType.ERROR);
    } finally {
        setIsSendingMessage(false);
    }
  };

  if (loading || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  // Placeholder implementations for create/edit/delete logic
  const handleSaveUser = () => { /* Logic would go here */ addNotification("Funcționalitatea de salvare nu este complet implementată.", NotificationType.INFO); };
  const handleDeleteUser = () => { /* Logic would go here */ addNotification("Funcționalitatea de ștergere nu este complet implementată.", NotificationType.INFO); };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
          <UsersIcon className="h-8 w-8 mr-3 text-primary-500" />
          {UI_TEXT_ROMANIAN.manageUsers}
        </h1>

        <Card>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
             <div className="flex gap-2">
                <Button onClick={() => openCreateModal(Role.USER)} variant="primary" leftIcon={<UserPlusIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.createNewUser}</Button>
                <Button onClick={() => openCreateModal(Role.ADMIN)} variant="secondary" leftIcon={<ShieldCheckIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.createNewAdmin}</Button>
                <Button 
                  onClick={openMessageModal} 
                  variant="outline" 
                  disabled={selectedUserIds.size === 0}
                >
                  {UI_TEXT_ROMANIAN.sendMessageToSelectedUsers.replace('{count}', String(selectedUserIds.size))}
                </Button>
            </div>
            <Input
              type="search"
              placeholder="Caută după nume sau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="mb-0 w-full md:w-auto"
            />
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <select onChange={(e) => setFilterRole(e.target.value as Role | 'ALL')} className="px-3 py-2 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 focus:ring-primary-500">
                <option value="ALL">{UI_TEXT_ROMANIAN.filterByRole}</option>
                <option value={Role.ADMIN}>{UI_TEXT_ROMANIAN.roleAdmin}</option>
                <option value={Role.USER}>{UI_TEXT_ROMANIAN.roleUser}</option>
            </select>
             <select onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} className="px-3 py-2 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 focus:ring-primary-500">
                <option value="ALL">{UI_TEXT_ROMANIAN.filterByStatus}</option>
                <option value="ACTIVE">{UI_TEXT_ROMANIAN.statusActive}</option>
                <option value="INACTIVE">{UI_TEXT_ROMANIAN.statusInactive}</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th scope="col" className="p-4">
                    <input 
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-primary-600 rounded"
                      onChange={handleSelectAllInvestors}
                      checked={investorsInView.length > 0 && selectedUserIds.size === investorsInView.length}
                      disabled={investorsInView.length === 0}
                      aria-label="Selectează toți investitorii"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Utilizator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Consimțământ Cookie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="p-4">
                      {user.role === Role.USER && (
                        <input 
                          type="checkbox" 
                          className="form-checkbox h-5 w-5 text-primary-600 rounded"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          aria-label={`Selectează ${user.name}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={user.avatar || DEFAULT_AVATAR_URL} alt={user.name} />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{user.role}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}`}>
                        {user.isActive ? UI_TEXT_ROMANIAN.userIsActive : UI_TEXT_ROMANIAN.userIsInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {user.profileData.cookieConsent ? (
                            <div className="flex items-center space-x-2">
                                <span title={`Preferințe: ${user.profileData.cookieConsent.preferences ? 'Acordat' : 'Refuzat'}`}>
                                    {user.profileData.cookieConsent.preferences ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-neutral-400" />}
                                </span>
                                 <span title={`Statistici: ${user.profileData.cookieConsent.statistics ? 'Acordat' : 'Refuzat'}`}>
                                    {user.profileData.cookieConsent.statistics ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-neutral-400" />}
                                </span>
                                 <span title={`Marketing: ${user.profileData.cookieConsent.marketing ? 'Acordat' : 'Refuzat'}`}>
                                    {user.profileData.cookieConsent.marketing ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-neutral-400" />}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 italic">Nu a răspuns</span>
                        )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <Button variant="ghost" size="sm" onClick={() => openProfileModal(user)}><EyeIcon className="h-5 w-5"/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}><PencilSquareIcon className="h-5 w-5"/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteModal(user)} className="text-red-500"><TrashIcon className="h-5 w-5"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={selectedUser} />
      
      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title={UI_TEXT_ROMANIAN.sendMessageModalTitle.replace('{count}', String(selectedUserIds.size))}
      >
        <div className="space-y-4">
            <Input 
                label={UI_TEXT_ROMANIAN.messageTitleLabel}
                value={messageTitle}
                onChange={e => setMessageTitle(e.target.value)}
                required
            />
            <Textarea
                label={UI_TEXT_ROMANIAN.messageContentLabel}
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                required
                rows={5}
            />
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setIsMessageModalOpen(false)}>Anulează</Button>
            <Button variant="primary" onClick={handleSendMessage} isLoading={isSendingMessage} disabled={isSendingMessage}>
              {UI_TEXT_ROMANIAN.sendMessageButton}
            </Button>
        </div>
      </Modal>

      {/* Add modals for Create/Edit and Delete confirmation */}
    </>
  );
};

export default AdminUsersPage;