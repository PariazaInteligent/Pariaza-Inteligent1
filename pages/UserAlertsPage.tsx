import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { InvestmentAlert, InvestmentAlertConditionType, NotificationType, Role, User } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import SwitchToggle from '../components/ui/SwitchToggle';
import { UI_TEXT_ROMANIAN } from '../constants';
import { formatDate, formatCurrency } from '../utils/helpers';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, CogIcon, BellAlertIcon, XCircleIcon } from '../components/ui/Icons';

const UserAlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading, addInvestmentAlert, updateInvestmentAlert, deleteInvestmentAlert } = useData();
  const { addNotification } = useNotifications();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<InvestmentAlert | null>(null);
  
  const initialFormData = {
    type: InvestmentAlertConditionType.PROFIT_GAIN_PERCENT,
    thresholdValue: '', // string for input, will parse to number
    isActive: true,
    notes: '',
  };
  const [formData, setFormData] = useState<{
    type: InvestmentAlertConditionType;
    thresholdValue: string;
    isActive: boolean;
    notes?: string;
  }>(initialFormData);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<InvestmentAlert | null>(null);

  const currentUser = useMemo(() => appData?.users.find(u => u.id === user?.id), [appData?.users, user?.id]);

  useEffect(() => {
    if (editingAlert) {
      setFormData({
        type: editingAlert.type,
        thresholdValue: editingAlert.thresholdValue.toString(),
        isActive: editingAlert.isActive,
        notes: editingAlert.notes || '',
      });
    } else {
      setFormData(initialFormData);
    }
  }, [editingAlert, isModalOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
     setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };


  const openModalForCreate = () => {
    setEditingAlert(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (alert: InvestmentAlert) => {
    setEditingAlert(alert);
    setIsModalOpen(true);
  };

  const handleDelete = (alert: InvestmentAlert) => {
    setAlertToDelete(alert);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (alertToDelete && user) {
      try {
        deleteInvestmentAlert(alertToDelete.id, user.id);
        addNotification(UI_TEXT_ROMANIAN.alertDeletedSuccessfully, NotificationType.SUCCESS);
      } catch (e) {
        addNotification(UI_TEXT_ROMANIAN.failedToDeleteAlert, NotificationType.ERROR);
      }
    }
    setIsDeleteModalOpen(false);
    setAlertToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUser) return;

    const thresholdNum = parseFloat(formData.thresholdValue);
    if (isNaN(thresholdNum)) {
      addNotification(UI_TEXT_ROMANIAN.alertThresholdNumeric, NotificationType.ERROR);
      return;
    }
    if (thresholdNum <= 0) {
        addNotification(UI_TEXT_ROMANIAN.alertThresholdPositive, NotificationType.ERROR);
        return;
    }
    
    if ( (formData.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || 
          formData.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) &&
         (thresholdNum < 0.01 || thresholdNum > 1000) ) {
      addNotification(UI_TEXT_ROMANIAN.alertThresholdPercentageRange, NotificationType.ERROR);
      return;
    }

    let referenceAmountForPercentage = currentUser.profileData.investedAmount;
     if ( (formData.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || 
           formData.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) &&
          (!referenceAmountForPercentage || referenceAmountForPercentage <= 0) ) {
        if (editingAlert && editingAlert.referenceInvestedAmount && editingAlert.referenceInvestedAmount > 0) {
            referenceAmountForPercentage = editingAlert.referenceInvestedAmount;
        } else {
            addNotification(UI_TEXT_ROMANIAN.cannotCreatePercentageAlertNoInvestment, NotificationType.WARNING);
            referenceAmountForPercentage = 0;
        }
    }

    try {
      const alertPayload = {
        userId: user.id,
        type: formData.type,
        thresholdValue: thresholdNum,
        isActive: formData.isActive,
        notes: formData.notes,
        referenceInvestedAmount: (formData.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || 
                                  formData.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) 
                                 ? referenceAmountForPercentage 
                                 : undefined,
      };

      if (editingAlert) {
        updateInvestmentAlert({
          ...editingAlert,
          ...alertPayload,
          referenceInvestedAmount: (formData.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || 
                                    formData.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) 
                                   ? (editingAlert.type === formData.type && editingAlert.referenceInvestedAmount ? editingAlert.referenceInvestedAmount : referenceAmountForPercentage)
                                   : undefined,
        });
        addNotification(UI_TEXT_ROMANIAN.alertUpdatedSuccessfully, NotificationType.SUCCESS);
      } else {
        addInvestmentAlert(alertPayload);
        addNotification(UI_TEXT_ROMANIAN.alertCreatedSuccessfully, NotificationType.SUCCESS);
      }
      setIsModalOpen(false);
    } catch (error) {
       addNotification(editingAlert ? UI_TEXT_ROMANIAN.failedToUpdateAlert : UI_TEXT_ROMANIAN.failedToCreateAlert, NotificationType.ERROR);
    }
  };

  const getAlertDescription = (alert: InvestmentAlert): string => {
    switch(alert.type) {
        case InvestmentAlertConditionType.PROFIT_GAIN_PERCENT:
            return `${UI_TEXT_ROMANIAN.alertConditionProfitGainPercent.replace('X%', `${alert.thresholdValue}%`)} (Ref: ${formatCurrency(alert.referenceInvestedAmount)})`;
        case InvestmentAlertConditionType.PROFIT_LOSS_PERCENT:
            return `${UI_TEXT_ROMANIAN.alertConditionProfitLossPercent.replace('X%', `${alert.thresholdValue}%`)} (Ref: ${formatCurrency(alert.referenceInvestedAmount)})`;
        case InvestmentAlertConditionType.INVESTMENT_VALUE_REACHES_ABOVE:
            return `${UI_TEXT_ROMANIAN.alertConditionInvestmentValueAbove.replace('X EUR', formatCurrency(alert.thresholdValue))}`;
        case InvestmentAlertConditionType.INVESTMENT_VALUE_DROPS_BELOW:
            return `${UI_TEXT_ROMANIAN.alertConditionInvestmentValueBelow.replace('X EUR', formatCurrency(alert.thresholdValue))}`;
        default:
            return "Alertă necunoscută";
    }
  };
  
  if (loading || !appData || !user || !currentUser) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const userAlerts = (appData.investmentAlerts || []).filter(alert => alert.userId === user.id)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <CogIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.userAlertsTitle}
      </h1>

      <Button onClick={openModalForCreate} variant="primary" leftIcon={<PlusCircleIcon className="h-5 w-5" />}>
        {UI_TEXT_ROMANIAN.createNewAlert}
      </Button>

      {userAlerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userAlerts.map(alert => (
            <Card key={alert.id} 
                title={getAlertDescription(alert)} 
                icon={alert.isActive ? <BellAlertIcon className="h-6 w-6 text-green-500"/> : <XCircleIcon className="h-6 w-6 text-red-500"/>}
                className={`transition-all duration-300 ${alert.isActive ? 'border-green-500 dark:border-green-600' : 'border-red-500 dark:border-red-600 opacity-70'} border-l-4`}
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Creată la: {formatDate(alert.createdAt)}
              </p>
              {alert.lastTriggeredAt && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  {UI_TEXT_ROMANIAN.alertLastTriggered}: {formatDate(alert.lastTriggeredAt)}
                </p>
              )}
              {alert.notes && (
                <p className="text-sm text-neutral-600 dark:text-neutral-300 my-2 p-2 bg-neutral-100 dark:bg-neutral-700 rounded">Notițe: {alert.notes}</p>
              )}
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                 <SwitchToggle 
                    id={`alert-active-${alert.id}`}
                    label={alert.isActive ? UI_TEXT_ROMANIAN.alertIsActive : UI_TEXT_ROMANIAN.alertNotActive}
                    checked={alert.isActive}
                    onChange={(checked) => updateInvestmentAlert({...alert, isActive: checked, referenceInvestedAmount: (alert.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || alert.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) && checked && (!alert.referenceInvestedAmount || alert.referenceInvestedAmount <=0) ? currentUser.profileData.investedAmount : alert.referenceInvestedAmount})}
                 />
                <div className="space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openModalForEdit(alert)} aria-label={UI_TEXT_ROMANIAN.edit}>
                    <PencilSquareIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(alert)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400" aria-label={UI_TEXT_ROMANIAN.delete}>
                    <TrashIcon className="h-5 w-5" />
                    </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center">
            <BellAlertIcon className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-3"/>
            <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noAlertsConfigured}</p>
        </Card>
      )}


      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAlert ? `Modifică Alertă` : UI_TEXT_ROMANIAN.createNewAlert}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.alertType}</label>
              <select 
                id="type" name="type" 
                value={formData.type} 
                onChange={handleInputChange} 
                className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={InvestmentAlertConditionType.PROFIT_GAIN_PERCENT}>{UI_TEXT_ROMANIAN.alertConditionProfitGainPercent.replace(' X%', '')}</option>
                <option value={InvestmentAlertConditionType.PROFIT_LOSS_PERCENT}>{UI_TEXT_ROMANIAN.alertConditionProfitLossPercent.replace(' X%', '')}</option>
                <option value={InvestmentAlertConditionType.INVESTMENT_VALUE_REACHES_ABOVE}>{UI_TEXT_ROMANIAN.alertConditionInvestmentValueAbove.replace(' X EUR', '')}</option>
                <option value={InvestmentAlertConditionType.INVESTMENT_VALUE_DROPS_BELOW}>{UI_TEXT_ROMANIAN.alertConditionInvestmentValueBelow.replace(' X EUR', '')}</option>
              </select>
            </div>
            
            <Input 
                label={`${UI_TEXT_ROMANIAN.thresholdValue} ${formData.type.includes("PERCENT") ? `(${UI_TEXT_ROMANIAN.valueTypePercentage})` : `(${UI_TEXT_ROMANIAN.valueTypeAmount})`}`}
                type="number" 
                name="thresholdValue" 
                value={formData.thresholdValue} 
                onChange={handleInputChange} 
                placeholder={formData.type.includes("PERCENT") ? "ex: 10 (pentru 10%)" : "ex: 500 (pentru 500 EUR)"}
                step={formData.type.includes("PERCENT") ? "0.1" : "1"}
                required 
            />
            {(formData.type === InvestmentAlertConditionType.PROFIT_GAIN_PERCENT || formData.type === InvestmentAlertConditionType.PROFIT_LOSS_PERCENT) && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {UI_TEXT_ROMANIAN.referenceInvestedAmountForAlert}: {formatCurrency(editingAlert?.referenceInvestedAmount || currentUser.profileData.investedAmount || 0)}. 
                    Acesta este folosit ca bază pentru calculul procentual.
                </p>
            )}

            <Textarea 
                label="Notițe (Opțional)"
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                rows={2}
                placeholder="Ex: Obiectiv profit trimestrial"
            />

            <SwitchToggle
                id="alertIsActiveModal"
                label={formData.isActive ? UI_TEXT_ROMANIAN.alertIsActive : UI_TEXT_ROMANIAN.alertNotActive}
                checked={formData.isActive}
                onChange={handleSwitchChange}
            />

            <div className="flex justify-end space-x-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>{UI_TEXT_ROMANIAN.cancel}</Button>
              <Button variant="primary" type="submit">{editingAlert ? UI_TEXT_ROMANIAN.save : UI_TEXT_ROMANIAN.createNewAlert}</Button>
            </div>
          </form>
        </Modal>
      )}

      {isDeleteModalOpen && alertToDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={UI_TEXT_ROMANIAN.confirmAlertDeletionTitle}
          message={`${UI_TEXT_ROMANIAN.confirmAlertDeletionMessage} (${getAlertDescription(alertToDelete)})`}
          confirmText={UI_TEXT_ROMANIAN.delete}
        />
      )}
    </div>
  );
};

export default UserAlertsPage;
