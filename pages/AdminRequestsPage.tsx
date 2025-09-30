
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Transaction, TransactionStatus, TransactionType, User, NotificationType, GlobalStats, Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UI_TEXT_ROMANIAN } from '../constants';
import Spinner from '../components/ui/Spinner';
import { formatDate, formatCurrency, calculatePlatformFeeRate } from '../utils/helpers';
import { CheckCircleIcon, XCircleIcon, ClipboardDocumentListIcon } from '../components/ui/Icons';
import { useAuth } from '../contexts/AuthContext'; 

const AdminRequestsPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, updateAppData, addTransaction, updateUserInContext, exportData, checkAndAwardBadges, completeReferral } = useData(); 
  const { addNotification } = useNotifications();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRequestAction = async (request: Transaction, newStatus: TransactionStatus.APPROVED | TransactionStatus.REJECTED) => {
    if (!appData || !appData.users || !appData.transactions || !appData.globalStats || !adminUser) {
        addNotification("Datele necesare nu sunt încărcate.", NotificationType.ERROR);
        return;
    }
    setProcessingId(request.id);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      const updatedTransactions = appData.transactions.map(t =>
        t.id === request.id ? { ...t, status: newStatus, adminId: adminUser.id } : t
      );
      
      let currentUsersList = [...appData.users]; 
      const targetUserIndex = currentUsersList.findIndex(u => u.id === request.userId);
      let targetUserName = "Utilizator necunoscut";
      let finalUsersList = currentUsersList; 
      let finalGlobalStats = { ...appData.globalStats };
      let userAfterUpdate: User | undefined = undefined;


      if (targetUserIndex !== -1) {
        const targetUser = { ...currentUsersList[targetUserIndex] };
        targetUserName = targetUser.name;

        if (newStatus === TransactionStatus.APPROVED && request.amount) {
            let newInvestedAmount = targetUser.profileData.investedAmount;
            const historyEntryType = request.type === TransactionType.INVESTMENT_REQUEST ? 'DEPOSIT' : 'WITHDRAWAL';
            const historyEntryAmount = request.type === TransactionType.INVESTMENT_REQUEST ? request.amount : -request.amount;

            const historyEntry: User['profileData']['investmentHistory'][0] = {
                date: new Date().toISOString(),
                amount: historyEntryAmount,
                type: historyEntryType
            };

            if (request.type === TransactionType.INVESTMENT_REQUEST) {
              newInvestedAmount += request.amount;
            } else if (request.type === TransactionType.WITHDRAWAL_REQUEST) {
              newInvestedAmount -= request.amount;
              if (newInvestedAmount < 0) newInvestedAmount = 0; 
            }
            
            userAfterUpdate = { 
              ...targetUser,
              profileData: {
                ...targetUser.profileData,
                investedAmount: newInvestedAmount,
                investmentHistory: [...targetUser.profileData.investmentHistory, historyEntry]
              }
            };
            currentUsersList[targetUserIndex] = userAfterUpdate;
            finalUsersList = currentUsersList; 
        }
      }
      
      const newTotalInvested = finalUsersList
        .filter(u => u.role === Role.USER)
        .reduce((sum, u) => sum + (u.profileData.investedAmount || 0), 0);
      const newActiveInvestors = finalUsersList
        .filter(u => u.role === Role.USER && u.isActive && (u.profileData.investedAmount || 0) > 0).length;
      const newPlatformFeeRate = calculatePlatformFeeRate(newActiveInvestors);

      finalGlobalStats = {
        ...appData.globalStats,
        totalInvested: newTotalInvested,
        activeInvestors: newActiveInvestors,
        platformFeeRate: newPlatformFeeRate,
      };
      
      updateAppData({ 
          transactions: updatedTransactions, 
          users: finalUsersList, 
          globalStats: finalGlobalStats 
      });
      
      await exportData('users', finalUsersList);
      await exportData('globalStats', finalGlobalStats);
      await exportData('transactions', updatedTransactions);
      
      const actionTransactionType: TransactionType = newStatus === TransactionStatus.APPROVED ? 
        (request.type === TransactionType.INVESTMENT_REQUEST ? TransactionType.INVESTMENT_APPROVAL : TransactionType.WITHDRAWAL_APPROVAL)
        : (request.type === TransactionType.INVESTMENT_REQUEST ? TransactionType.INVESTMENT_REJECTION : TransactionType.WITHDRAWAL_REJECTION);

      addTransaction({ 
          adminId: adminUser.id,
          userId: request.userId,
          type: actionTransactionType,
          status: TransactionStatus.COMPLETED, 
          description: `Cererea de ${request.type === TransactionType.INVESTMENT_REQUEST ? 'investiție' : 'retragere'} (${formatCurrency(request.amount)}) pentru ${targetUserName} a fost ${newStatus === TransactionStatus.APPROVED ? 'aprobată' : 'respinsă'} de ${adminUser.name}.`,
          amount: request.amount, 
          details: { originalRequestId: request.id }
      });

      // Badge check for investment approval
      if (newStatus === TransactionStatus.APPROVED && request.type === TransactionType.INVESTMENT_REQUEST && userAfterUpdate && request.amount) {
           await checkAndAwardBadges(userAfterUpdate.id, 'INVESTMENT_APPROVAL', request.amount);
           // Check for referral completion
           const userInvestmentTransactions = appData.transactions.filter(
             tx => tx.userId === request.userId && 
                   tx.type === TransactionType.INVESTMENT_APPROVAL &&
                   tx.status === TransactionStatus.COMPLETED
           );
           // If this is the first approved investment (count becomes 1 *after* this one)
           if (userInvestmentTransactions.length === 0) { // This check is slightly off, it should be 0 before this one is 'completed' in the array
             await completeReferral(request.userId!);
           }
      }

      addNotification(newStatus === TransactionStatus.APPROVED ? UI_TEXT_ROMANIAN.requestApproved : UI_TEXT_ROMANIAN.requestRejected, NotificationType.SUCCESS);
    } catch (error) {
      addNotification(`Eroare la procesarea cererii: ${(error as Error).message}`, NotificationType.ERROR);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const pendingInvestmentRequests = appData.transactions.filter(t => t.type === TransactionType.INVESTMENT_REQUEST && t.status === TransactionStatus.PENDING);
  const pendingWithdrawalRequests = appData.transactions.filter(t => t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === TransactionStatus.PENDING);

  const renderRequestList = (requests: Transaction[], title: string) => (
    <Card title={title} icon={<ClipboardDocumentListIcon className="h-6 w-6"/>}>
      {requests.length > 0 ? (
        <ul className="space-y-4">
          {requests.map(req => {
            const userRequesting = appData.users.find(u => u.id === req.userId);
            return (
              <li key={req.id} className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/60 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                      {userRequesting?.name || 'Utilizator necunoscut'} ({userRequesting?.email})
                    </p>
                    <p className="text-md text-primary-600 dark:text-primary-400 font-semibold">{formatCurrency(req.amount)}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Data cererii: {formatDate(req.timestamp)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      ID Cerere: {req.id}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 flex space-x-2 flex-shrink-0">
                    <Button
                      onClick={() => handleRequestAction(req, TransactionStatus.APPROVED)}
                      variant="primary"
                      size="sm"
                      isLoading={processingId === req.id}
                      disabled={processingId === req.id}
                      leftIcon={<CheckCircleIcon className="h-5 w-5"/>}
                    >
                      {UI_TEXT_ROMANIAN.approve}
                    </Button>
                    <Button
                      onClick={() => handleRequestAction(req, TransactionStatus.REJECTED)}
                      variant="danger"
                      size="sm"
                      isLoading={processingId === req.id}
                      disabled={processingId === req.id}
                      leftIcon={<XCircleIcon className="h-5 w-5"/>}
                    >
                      {UI_TEXT_ROMANIAN.reject}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
      )}
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <ClipboardDocumentListIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.pendingRequests}
      </h1>
      {renderRequestList(pendingInvestmentRequests, UI_TEXT_ROMANIAN.pendingInvestmentRequests)}
      {renderRequestList(pendingWithdrawalRequests, UI_TEXT_ROMANIAN.pendingWithdrawalRequests)}
    </div>
  );
};

export default AdminRequestsPage;
