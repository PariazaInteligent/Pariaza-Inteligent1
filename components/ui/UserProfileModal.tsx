import React from 'react';
import { User, Role, AdminPermission, UserBadge } from '../../types'; // Added UserBadge
import Modal from './Modal';
import Card from './Card';
import { UI_TEXT_ROMANIAN, AVAILABLE_ADMIN_PERMISSIONS, BADGE_DEFINITIONS } from '../../constants'; // Added BADGE_DEFINITIONS
import { formatCurrency, formatDate } from '../../utils/helpers';
import { UserCircleIcon, BanknotesIcon, ArrowTrendingUpIcon, WalletIcon, ShieldCheckIcon, CalendarDaysIcon, PhoneIcon, MapPinIcon, HashtagIcon, CheckBadgeIcon, TrophyIcon, CheckCircleIcon, XCircleIcon } from './Icons'; // Added TrophyIcon

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const getPermissionLabel = (permissionKey: AdminPermission): string => {
    const perm = AVAILABLE_ADMIN_PERMISSIONS.find(p => p.key === permissionKey);
    return perm ? perm.label : permissionKey;
  };
  
  const earnedBadges = user.profileData.badges || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${UI_TEXT_ROMANIAN.profile}: ${user.name}`} size="xl">
      <div className="space-y-6">
        {/* General Information Card */}
        <Card 
            title="Informații Generale" 
            icon={<UserCircleIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />}
            className="border border-neutral-200 dark:border-neutral-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
                <img src={user.avatar} alt={user.name} className="h-20 w-20 rounded-full object-cover border-2 border-primary-300 dark:border-primary-500" />
                <div>
                    <p className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{user.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                </div>
            </div>
            <div className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                <p><strong className="font-medium">ID Utilizator:</strong> <span className="text-neutral-500 dark:text-neutral-400">{user.id}</span></p>
                <p><strong className="font-medium">{UI_TEXT_ROMANIAN.userRole}:</strong> <span className="font-semibold text-primary-600 dark:text-primary-400">{user.role}</span></p>
                <p><strong className="font-medium">Status:</strong> 
                    <span className={`ml-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}`}>
                    {user.isActive ? UI_TEXT_ROMANIAN.userIsActive : UI_TEXT_ROMANIAN.userIsInactive}
                    </span>
                </p>
                <p><strong className="font-medium">Data Înscrierii:</strong> {formatDate(user.profileData.joinDate)}</p>
            </div>
          </div>
        </Card>

        {/* Contact Information Card */}
        {(user.profileData.contactPhone || user.profileData.address) && (
             <Card title="Informații Contact" icon={<PhoneIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />} className="border border-neutral-200 dark:border-neutral-700">
                {user.profileData.contactPhone && <p className="text-sm text-neutral-700 dark:text-neutral-300"><strong className="font-medium">Telefon:</strong> {user.profileData.contactPhone}</p>}
                {user.profileData.address && <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1"><strong className="font-medium">Adresă:</strong> {user.profileData.address}</p>}
             </Card>
        )}

        {/* Cookie Consent Card */}
        {user.profileData.cookieConsent && (
            <Card title="Consimțământ Cookie" icon={<CheckCircleIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />} className="border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Consimțământ acordat la: {formatDate(user.profileData.cookieConsent.timestamp)}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                        {user.profileData.cookieConsent.preferences ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />}
                        <span className="text-sm font-medium">Preferințe</span>
                    </div>
                     <div className="flex items-center space-x-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                        {user.profileData.cookieConsent.statistics ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />}
                        <span className="text-sm font-medium">Statistici</span>
                    </div>
                     <div className="flex items-center space-x-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                        {user.profileData.cookieConsent.marketing ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />}
                        <span className="text-sm font-medium">Marketing</span>
                    </div>
                </div>
            </Card>
        )}


        {/* Financial Summary for Users */}
        {user.role === Role.USER && (
          <Card title="Sumar Financiar" icon={<BanknotesIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />} className="border border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.investedAmount}</p>
                    <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(user.profileData.investedAmount)}</p>
                </div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.totalProfit}</p>
                    <p className="text-lg font-semibold text-green-500">{formatCurrency(user.profileData.totalProfitEarned)}</p>
                </div>
                 <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.totalBalance}</p>
                    <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">{formatCurrency((user.profileData.investedAmount || 0) + (user.profileData.totalProfitEarned || 0))}</p>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-1">{UI_TEXT_ROMANIAN.currentCycleDetails}</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.grossProfit}: {formatCurrency(user.profileData.currentGrossProfit)}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.platformFee}: {formatCurrency(user.profileData.platformFeePaid)}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.netProfit}: {formatCurrency(user.profileData.currentNetProfit)}</p>
            </div>
          </Card>
        )}

        {/* Investment History for Users */}
        {user.role === Role.USER && user.profileData.investmentHistory && user.profileData.investmentHistory.length > 0 && (
          <Card title="Istoric Investiții" icon={<CalendarDaysIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />} className="border border-neutral-200 dark:border-neutral-700">
            <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
              {user.profileData.investmentHistory
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2.5 rounded-md bg-neutral-50 dark:bg-neutral-700/50 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {item.type === 'DEPOSIT' ? 'Depunere' : 
                         item.type === 'WITHDRAWAL' ? 'Retragere' : 
                         item.type === 'PROFIT_PAYOUT' ? 'Plată Profit' : 
                         item.type === 'FEE' ? 'Taxă Platformă' : 
                         item.type}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(item.date)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
        
        {/* Badges Section - New for UserProfileModal */}
        {user.role === Role.USER && (
            <Card title={UI_TEXT_ROMANIAN.badgesSectionTitle} icon={<TrophyIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />} className="border border-neutral-200 dark:border-neutral-700">
            {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {earnedBadges.sort((a,b) => new Date(a.earnedAt).getTime() - new Date(b.earnedAt).getTime()).map((badge: UserBadge) => {
                    const badgeDef = BADGE_DEFINITIONS[badge.badgeType];
                     if (!badgeDef) return null; 
                    const IconComponent = badgeDef.icon;
                    return (
                    <div 
                        key={badge.badgeType} 
                        className="flex flex-col items-center p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-md shadow-sm cursor-help" 
                        title={`${badgeDef.description}${badge.details ? ` (${badge.details})` : ''}\nCâștigat la: ${formatDate(badge.earnedAt)}`}
                    >
                        <IconComponent className="h-10 w-10 mb-1" /> {/* Icon specific color defined in Icons.tsx */}
                        <p className="text-xs font-medium text-center text-neutral-700 dark:text-neutral-200">{badgeDef.name}</p>
                    </div>
                    );
                })}
                </div>
            ) : (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-3">{UI_TEXT_ROMANIAN.noBadgesEarned}</p>
            )}
            </Card>
        )}

        {/* Admin Permissions for Admins */}
        {user.role === Role.ADMIN && (
          <Card title="Permisiuni Administrator" icon={<ShieldCheckIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />} className="border border-neutral-200 dark:border-neutral-700">
            {user.isGlobalAdmin && (
                <p className="flex items-center text-md font-semibold text-green-600 dark:text-green-400 mb-3 p-2 bg-green-50 dark:bg-green-900/30 rounded-md">
                    <CheckBadgeIcon className="h-5 w-5 mr-2"/> Administrator Global (toate permisiunile active)
                </p>
            )}
            <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
              {AVAILABLE_ADMIN_PERMISSIONS.map(permDef => (
                <li key={permDef.key} className="flex justify-between items-center p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700/50">
                  <span>{permDef.label}</span>
                  <span className={`font-semibold ${user.adminPermissions?.[permDef.key] || user.isGlobalAdmin ? 'text-green-500' : 'text-red-500'}`}>
                    {(user.adminPermissions?.[permDef.key] || user.isGlobalAdmin) ? UI_TEXT_ROMANIAN.permissionStateActive : UI_TEXT_ROMANIAN.permissionStateInactive}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default UserProfileModal;