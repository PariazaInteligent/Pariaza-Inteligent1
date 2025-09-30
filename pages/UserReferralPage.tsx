
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { Referral, ReferralStatus, User, NotificationType } from '../types';
import { formatDate } from '../utils/helpers';
import { UserGroupIcon, ClipboardDocumentListIcon } from '../components/ui/Icons';

const UserReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading, getOrGenerateUserReferralCode } = useData();
  const { addNotification } = useNotifications();

  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(false);

  useEffect(() => {
    const fetchReferralCode = async () => {
      if (user && getOrGenerateUserReferralCode) {
        setIsLoadingCode(true);
        try {
          const code = await getOrGenerateUserReferralCode(user.id);
          setUserReferralCode(code);
        } catch (error) {
          addNotification(UI_TEXT_ROMANIAN.referralCodeGenerationError, NotificationType.ERROR);
          console.error("Error fetching referral code:", error);
        } finally {
          setIsLoadingCode(false);
        }
      }
    };
    fetchReferralCode();
  }, [user, getOrGenerateUserReferralCode, addNotification]);

  const handleCopyCode = () => {
    if (userReferralCode) {
      navigator.clipboard.writeText(userReferralCode)
        .then(() => addNotification(UI_TEXT_ROMANIAN.referralCodeCopied, NotificationType.SUCCESS))
        .catch(err => addNotification("Eroare la copierea codului.", NotificationType.ERROR));
    }
  };

  if (dataLoading || !user || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const successfulReferrals = (appData.referrals || [])
    .filter(ref => ref.referrerUserId === user.id && ref.status === ReferralStatus.COMPLETED)
    .map(ref => {
      const referredUser = appData.users.find(u => u.id === ref.referredUserId);
      return {
        ...ref,
        referredUserName: referredUser?.name || "Utilizator Șters/Necunoscut",
      };
    })
    .sort((a, b) => new Date(b.completedTimestamp || 0).getTime() - new Date(a.completedTimestamp || 0).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <UserGroupIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.referralPageTitle}
      </h1>

      <Card title={UI_TEXT_ROMANIAN.yourReferralCode}>
        {isLoadingCode ? (
          <Spinner />
        ) : userReferralCode ? (
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <p className="text-2xl font-mono font-bold p-3 bg-primary-50 dark:bg-primary-800/30 text-primary-700 dark:text-primary-300 rounded-lg tracking-wider">
              {userReferralCode}
            </p>
            <Button onClick={handleCopyCode} variant="outline" leftIcon={<ClipboardDocumentListIcon className="h-5 w-5"/>}>
              {UI_TEXT_ROMANIAN.copyCodeButton}
            </Button>
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.referralCodeGenerationError}</p>
        )}
      </Card>

      <Card title={UI_TEXT_ROMANIAN.referralInstructionsTitle}>
        <ul className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-300 text-sm">
          <li>{UI_TEXT_ROMANIAN.referralInstruction1}</li>
          <li>{UI_TEXT_ROMANIAN.referralInstruction2}</li>
        </ul>
        <h4 className="text-md font-semibold mt-4 mb-2 text-neutral-700 dark:text-neutral-200">{UI_TEXT_ROMANIAN.referralBenefitsTitle}</h4>
        <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-300 text-sm">
          <li>{UI_TEXT_ROMANIAN.referralBenefitYou}</li>
          <li>{UI_TEXT_ROMANIAN.referralBenefitFriend}</li>
        </ul>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{UI_TEXT_ROMANIAN.referralFutureBenefits}</p>
      </Card>

      <Card title={UI_TEXT_ROMANIAN.referralsMadeTitle}>
        {successfulReferrals.length > 0 ? (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {successfulReferrals.map(ref => (
              <li key={ref.id} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-neutral-800 dark:text-neutral-100">
                    {UI_TEXT_ROMANIAN.referredUserLabel} <span className="text-primary-600 dark:text-primary-400">{ref.referredUserName}</span>
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {UI_TEXT_ROMANIAN.referralDateLabel} {ref.completedTimestamp ? formatDate(ref.completedTimestamp) : '-'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noSuccessfulReferrals}</p>
        )}
      </Card>
    </div>
  );
};

export default UserReferralPage;
