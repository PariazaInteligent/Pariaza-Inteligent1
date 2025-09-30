import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { InvestmentGoal, GoalType, GoalStatus, NotificationType, User, Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, GOAL_TYPE_FRIENDLY_NAMES } from '../constants';
import { formatDate, formatCurrency } from '../utils/helpers';
import { FlagIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon, CalendarDaysIcon, TrophyIcon } from '../components/ui/Icons';

const UserGoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading, addInvestmentGoal, updateInvestmentGoal, deleteInvestmentGoal, checkAndCompleteGoals } = useData();
  const { addNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);
  const initialFormData = {
    name: '',
    goalType: GoalType.TARGET_BALANCE,
    targetAmount: '',
    targetDate: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<InvestmentGoal | null>(null);
  
  const currentUserData = useMemo(() => {
    if (!user || !appData?.users) return null;
    return appData.users.find(u => u.id === user.id);
  }, [appData?.users, user?.id]);

  useEffect(() => {
    if (user?.id) {
      checkAndCompleteGoals(user.id);
    }
  }, [user?.id, currentUserData?.profileData, checkAndCompleteGoals]);


  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        goalType: editingGoal.goalType,
        targetAmount: editingGoal.targetAmount.toString(),
        targetDate: editingGoal.targetDate || '',
        notes: editingGoal.notes || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [editingGoal, isModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: InvestmentGoal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (goal: InvestmentGoal) => {
    setGoalToDelete(goal);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (goalToDelete) {
      const success = deleteInvestmentGoal(goalToDelete.id); // This now marks as CANCELLED
      if (success) {
        addNotification(UI_TEXT_ROMANIAN.goalCancelledSuccessfully, NotificationType.SUCCESS);
      } else {
        addNotification(UI_TEXT_ROMANIAN.failedToCancelGoal, NotificationType.ERROR);
      }
    }
    setIsDeleteModalOpen(false);
    setGoalToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetAmountNum = parseFloat(formData.targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
      addNotification("Suma țintă trebuie să fie un număr pozitiv.", NotificationType.ERROR);
      return;
    }
    if (formData.targetDate && new Date(formData.targetDate) < new Date(new Date().toDateString())) {
        addNotification("Data țintă nu poate fi în trecut.", NotificationType.ERROR);
        return;
    }

    const goalPayload = {
      name: formData.name,
      goalType: formData.goalType,
      targetAmount: targetAmountNum,
      targetDate: formData.targetDate || undefined,
      notes: formData.notes,
    };

    try {
      if (editingGoal) {
        updateInvestmentGoal(editingGoal.id, goalPayload);
      } else {
        addInvestmentGoal({ ...goalPayload, userId: user.id });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Goal submission error:", err);
      // Notification is handled by add/updateInvestmentGoal
    }
  };

  const calculateProgress = (goal: InvestmentGoal): { percentage: number; currentValue: number; daysLeft?: number } => {
    if (!currentUserData) return { percentage: 0, currentValue: 0 };

    let currentValue = 0;
    if (goal.status === GoalStatus.COMPLETED && goal.completedDate) {
        // If completed, use the value at completion if we decide to store it, otherwise re-calculate for display
        // For now, we recalculate to always show current relation to target for transparency.
        // Or, better, if it's completed, its "currentValue" *was* the target or more.
        // Let's assume currentAmountAtCompletion is not yet stored, so we show 100% or more.
    }

    if (goal.goalType === GoalType.TARGET_BALANCE) {
      currentValue = (currentUserData.profileData.investedAmount || 0) + (currentUserData.profileData.totalProfitEarned || 0);
    } else if (goal.goalType === GoalType.TARGET_PROFIT_TOTAL) {
      currentValue = currentUserData.profileData.totalProfitEarned || 0;
    }
    
    const percentage = goal.targetAmount > 0 ? Math.min(Math.max((currentValue / goal.targetAmount) * 100, 0), 100) : 0;
    
    let daysLeft: number | undefined = undefined;
    if (goal.targetDate && goal.status === GoalStatus.ACTIVE) {
        const target = new Date(goal.targetDate);
        const today = new Date();
        today.setHours(0,0,0,0); // Compare dates only
        target.setHours(0,0,0,0);
        if (target >= today) {
            daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
    }
    return { percentage, currentValue, daysLeft };
  };


  if (loading || !appData || !user || !currentUserData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const userGoals = (appData.investmentGoals || []).filter(goal => goal.userId === user.id)
    .sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const activeGoals = userGoals.filter(g => g.status === GoalStatus.ACTIVE);
  const completedGoals = userGoals.filter(g => g.status === GoalStatus.COMPLETED);
  const cancelledGoals = userGoals.filter(g => g.status === GoalStatus.CANCELLED);


  const renderGoalCard = (goal: InvestmentGoal) => {
    const { percentage, currentValue, daysLeft } = calculateProgress(goal);
    let statusColor = 'bg-blue-500';
    let statusText = UI_TEXT_ROMANIAN.goalStatusActive;
    if (goal.status === GoalStatus.COMPLETED) {
      statusColor = 'bg-green-500';
      statusText = UI_TEXT_ROMANIAN.goalStatusCompleted;
    } else if (goal.status === GoalStatus.CANCELLED) {
      statusColor = 'bg-neutral-500';
      statusText = UI_TEXT_ROMANIAN.goalStatusCancelled;
    }

    return (
      <Card 
        key={goal.id} 
        title={goal.name} 
        icon={goal.status === GoalStatus.COMPLETED ? <TrophyIcon className="h-6 w-6 text-yellow-400"/> : <FlagIcon className="h-6 w-6 text-primary-500" />}
        className={`transition-all duration-300 ${goal.status === GoalStatus.CANCELLED ? 'opacity-60' : ''}`}
      >
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">
          {GOAL_TYPE_FRIENDLY_NAMES[goal.goalType]}
        </p>
        <div className="mb-3">
          <div className="flex justify-between text-sm text-neutral-700 dark:text-neutral-200 mb-1">
            <span>{formatCurrency(currentValue)}</span>
            <span>{formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
            <div
              className={`${statusColor} h-3 rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${goal.status === GoalStatus.COMPLETED ? 100 : percentage}%` }}
              role="progressbar"
              aria-valuenow={goal.status === GoalStatus.COMPLETED ? 100 : percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-right">
            {goal.status === GoalStatus.COMPLETED ? UI_TEXT_ROMANIAN.goalAchieved : `${percentage.toFixed(1)}% atins`}
          </p>
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5 mb-3">
            <p>{UI_TEXT_ROMANIAN.goalStartDateLabel} {formatDate(goal.startDate, {day:'numeric', month:'long', year:'numeric'})}</p>
            {goal.targetDate && <p>Data Țintă: {formatDate(goal.targetDate, {day:'numeric', month:'long', year:'numeric'})}
                {daysLeft !== undefined && goal.status === GoalStatus.ACTIVE && ` (${UI_TEXT_ROMANIAN.daysRemaining} ${daysLeft})`}
                {daysLeft === undefined && goal.targetDate && new Date(goal.targetDate) < new Date(new Date().toDateString()) && goal.status === GoalStatus.ACTIVE && ` (${UI_TEXT_ROMANIAN.targetDatePassed})`}
            </p>}
            {goal.status === GoalStatus.COMPLETED && goal.completedDate && <p className="font-semibold text-green-500">{UI_TEXT_ROMANIAN.goalCompletedDateLabel} {formatDate(goal.completedDate, {day:'numeric', month:'long', year:'numeric'})}</p>}
        </div>
        {goal.notes && <p className="text-sm italic text-neutral-600 dark:text-neutral-300 p-2 bg-neutral-50 dark:bg-neutral-700/30 rounded mb-3">Notițe: {goal.notes}</p>}

        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end space-x-2">
          {goal.status === GoalStatus.ACTIVE && (
            <>
              <Button variant="outline" size="sm" onClick={() => openEditModal(goal)} leftIcon={<PencilSquareIcon className="h-4 w-4"/>}>
                {UI_TEXT_ROMANIAN.edit}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(goal)} leftIcon={<XCircleIcon className="h-4 w-4"/>}>
                {UI_TEXT_ROMANIAN.cancel}
              </Button>
            </>
          )}
           {goal.status === GoalStatus.COMPLETED && (
            <span className="text-green-500 font-semibold flex items-center"><CheckCircleIcon className="h-5 w-5 mr-1"/> {UI_TEXT_ROMANIAN.goalStatusCompleted}</span>
           )}
           {goal.status === GoalStatus.CANCELLED && (
            <span className="text-neutral-500 font-semibold flex items-center"><XCircleIcon className="h-5 w-5 mr-1"/> {UI_TEXT_ROMANIAN.goalStatusCancelled}</span>
           )}
        </div>
      </Card>
    );
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <FlagIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.userGoalsPageTitle}
      </h1>

      <Button onClick={openCreateModal} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5" />}>
        {UI_TEXT_ROMANIAN.createNewGoal}
      </Button>

      {activeGoals.length > 0 && (
        <section>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Obiective Active</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeGoals.map(renderGoalCard)}
            </div>
        </section>
      )}

      {completedGoals.length > 0 && (
         <section>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Obiective Finalizate</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedGoals.map(renderGoalCard)}
            </div>
        </section>
      )}
      
      {cancelledGoals.length > 0 && (
         <section>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3">Obiective Anulate</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cancelledGoals.map(renderGoalCard)}
            </div>
        </section>
      )}

      {userGoals.length === 0 && (
        <Card className="text-center py-10">
          <FlagIcon className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noGoalsSet}</p>
        </Card>
      )}

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingGoal ? `Modifică Obiectiv: ${editingGoal.name}` : UI_TEXT_ROMANIAN.createNewGoal}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={UI_TEXT_ROMANIAN.goalNameLabel} name="name" value={formData.name} onChange={handleInputChange} placeholder={UI_TEXT_ROMANIAN.goalNamePlaceholder} required />
            <div>
              <label htmlFor="goalType" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.goalTypeLabel}</label>
              <select 
                id="goalType" name="goalType" 
                value={formData.goalType} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={GoalType.TARGET_BALANCE}>{UI_TEXT_ROMANIAN.goalTypeTargetBalance}</option>
                <option value={GoalType.TARGET_PROFIT_TOTAL}>{UI_TEXT_ROMANIAN.goalTypeTargetProfitTotal}</option>
              </select>
            </div>
            <Input label={UI_TEXT_ROMANIAN.goalTargetAmountLabel} type="number" name="targetAmount" value={formData.targetAmount} onChange={handleInputChange} placeholder="ex: 5000" min="1" required />
            <Input label={UI_TEXT_ROMANIAN.goalTargetDateLabel} type="date" name="targetDate" value={formData.targetDate} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} />
            <Textarea label={UI_TEXT_ROMANIAN.goalNotesLabel} name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Detalii suplimentare despre obiectiv..." />
            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{UI_TEXT_ROMANIAN.cancel}</Button>
              <Button variant="primary" type="submit">{editingGoal ? UI_TEXT_ROMANIAN.save : UI_TEXT_ROMANIAN.createNewGoal}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && goalToDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={UI_TEXT_ROMANIAN.confirmGoalCancellationTitle}
          message={UI_TEXT_ROMANIAN.confirmGoalCancellationMessage.replace('{goalName}', goalToDelete.name)}
          confirmText={UI_TEXT_ROMANIAN.cancel} // "Cancel" button text for cancelling a goal
          cancelText="Închide"
        />
      )}
    </div>
  );
};

export default UserGoalsPage;