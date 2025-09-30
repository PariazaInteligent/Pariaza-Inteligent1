
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UI_TEXT_ROMANIAN } from '../constants';
import { TransactionType, TransactionStatus, Role, NotificationType } from '../types';
import Spinner from '../components/ui/Spinner';
import { ArrowLeftEndOnRectangleIcon } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../utils/helpers';

const WithdrawalsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, addTransaction, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (dataLoading || !user || user.role !== Role.USER) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const currentUserData = appData?.users.find(u => u.id === user.id);
  // Updated calculation for availableForWithdrawal to reflect "Sold Total Curent"
  const availableForWithdrawal = (currentUserData?.profileData.investedAmount || 0) + (currentUserData?.profileData.totalProfitEarned || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawalAmount = parseFloat(amount);

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      addNotification('Suma introdusă nu este validă.', NotificationType.ERROR);
      return;
    }
    if (withdrawalAmount > availableForWithdrawal) {
      addNotification(`Suma solicitată depășește fondurile disponibile (${formatCurrency(availableForWithdrawal)}).`, NotificationType.ERROR);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addTransaction({
        userId: user.id,
        type: TransactionType.WITHDRAWAL_REQUEST,
        amount: withdrawalAmount,
        status: TransactionStatus.PENDING,
        description: `Cerere de retragere de ${user.name} în valoare de ${formatCurrency(withdrawalAmount)}.`,
      });

      addNotification('Cererea ta de retragere a fost trimisă spre aprobare.', NotificationType.SUCCESS);
      setAmount('');
    } catch (error) {
      addNotification('A apărut o eroare la trimiterea cererii de retragere.', NotificationType.ERROR);
      console.error("Withdrawal request error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const pendingWithdrawalRequests = appData?.transactions
    .filter(t => t.userId === user.id && t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === TransactionStatus.PENDING)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <ArrowLeftEndOnRectangleIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.withdrawals}
      </h1>

      <Card title="Solicită o Retragere">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Updated descriptive text for availableForWithdrawal */}
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Suma disponibilă pentru retragere (Sold Total Curent): <span className="font-bold text-green-500">{formatCurrency(availableForWithdrawal)}</span>
          </p>
          <Input
            label="Suma de retras (EUR)"
            type="number"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="ex: 500"
            min="1"
            max={availableForWithdrawal > 0 ? availableForWithdrawal.toString() : "0"} // Ensure max is not negative
            required
            disabled={availableForWithdrawal <= 0}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Retragerea va fi procesată după aprobarea unui administrator.
          </p>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading || availableForWithdrawal <= 0}>
            Trimite Cererea de Retragere
          </Button>
        </form>
      </Card>

      <Card title="Statutul Cererilor Tale de Retragere">
        <h3 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">Cereri de Retragere în Așteptare</h3>
        {pendingWithdrawalRequests && pendingWithdrawalRequests.length > 0 ? (
          <ul className="space-y-3">
            {pendingWithdrawalRequests.map(req => (
              <li key={req.id} className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">Suma: {formatCurrency(req.amount)}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Data cererii: {formatDate(req.timestamp)}</p>
                  </div>
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100">
                    {req.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">Nu ai cereri de retragere în așteptare.</p>
        )}
      </Card>

       <Card title="Istoricul Retragerilor Aprobate">
            {currentUserData?.profileData.investmentHistory && currentUserData.profileData.investmentHistory.filter(h => h.type === 'WITHDRAWAL').length > 0 ? (
                <ul className="max-h-60 overflow-y-auto space-y-2">
                    {currentUserData.profileData.investmentHistory
                        .filter(h => h.type === 'WITHDRAWAL')
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((item, index) => (
                        <li key={index} className="flex justify-between items-center p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50">
                            <div>
                                <p className="font-medium text-neutral-800 dark:text-neutral-100">Retragere</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(item.date)}</p>
                            </div>
                            <span className="font-semibold text-red-600 dark:text-red-400">
                                {formatCurrency(item.amount)} {/* Amounts for withdrawals are typically positive in request, negative in history */}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
            )}
        </Card>
    </div>
  );
};

export default WithdrawalsPage;
