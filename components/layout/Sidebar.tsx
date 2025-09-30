import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; // Import useTheme
import { Role } from '../../types';
import { UI_TEXT_ROMANIAN } from '../../constants';
import { HomeIcon, ChartBarIcon, BanknotesIcon, ArrowLeftEndOnRectangleIcon, UserCircleIcon, CogIcon, ShieldCheckIcon, UsersIcon, ClipboardDocumentListIcon, DocumentTextIcon, XMarkIcon, BellIcon, MegaphoneIcon, DocumentChartBarIcon, QuestionMarkCircleIcon, ChatBubbleLeftEllipsisIcon, WrenchScrewdriverIcon, CalculatorIcon, UserGroupIcon, CalendarDaysIcon, TableCellsIcon, FlagIcon, TrophyIcon, PresentationChartLineIcon } from '../ui/Icons'; // Added FlagIcon


interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: Role[]; 
  adminOnly?: boolean; 
  publicAccess?: boolean; 
}

const commonNavItems: NavItem[] = [
  { to: '/', label: UI_TEXT_ROMANIAN.home, icon: <HomeIcon className="h-6 w-6" />, publicAccess: true },
  { to: '/cum-functioneaza', label: UI_TEXT_ROMANIAN.howItWorks, icon: <ClipboardDocumentListIcon className="h-6 w-6" />, publicAccess: true },
  { to: '/statistici', label: UI_TEXT_ROMANIAN.statistics, icon: <ChartBarIcon className="h-6 w-6" />, publicAccess: true },
  { to: '/trophy-room', label: UI_TEXT_ROMANIAN.trophyRoom, icon: <TrophyIcon className="h-6 w-6" />, publicAccess: true },
  { to: '/notifications', label: UI_TEXT_ROMANIAN.notificationCenter, icon: <BellIcon className="h-6 w-6" /> }, 
  { to: '/help', label: UI_TEXT_ROMANIAN.helpCenter, icon: <QuestionMarkCircleIcon className="h-6 w-6" />, publicAccess: true },
];

const userNavItems: NavItem[] = [
  { to: '/user/dashboard', label: UI_TEXT_ROMANIAN.myDashboard, icon: <UserCircleIcon className="h-6 w-6" />, roles: [Role.USER] },
  { to: '/user/investitii', label: UI_TEXT_ROMANIAN.investments, icon: <BanknotesIcon className="h-6 w-6" />, roles: [Role.USER] },
  { to: '/user/retrageri', label: UI_TEXT_ROMANIAN.withdrawals, icon: <ArrowLeftEndOnRectangleIcon className="h-6 w-6" />, roles: [Role.USER] }, 
  { to: '/user/bets', label: UI_TEXT_ROMANIAN.betHistory, icon: <DocumentChartBarIcon className="h-6 w-6" />, roles: [Role.USER]},
  { to: '/user/alerte', label: UI_TEXT_ROMANIAN.configureAlerts, icon: <CogIcon className="h-6 w-6" />, roles: [Role.USER]},
  { to: '/user/reports', label: UI_TEXT_ROMANIAN.cycleReports, icon: <DocumentChartBarIcon className="h-6 w-6" />, roles: [Role.USER]}, 
  { to: '/user/advanced-reports', label: UI_TEXT_ROMANIAN.advancedReports, icon: <TableCellsIcon className="h-6 w-6" />, roles: [Role.USER]}, 
  { to: '/user/goals', label: UI_TEXT_ROMANIAN.myGoals, icon: <FlagIcon className="h-6 w-6" />, roles: [Role.USER]}, // New Item for Goals
  { to: '/user/profil', label: UI_TEXT_ROMANIAN.profile, icon: <UserCircleIcon className="h-6 w-6" />, roles: [Role.USER] },
  { to: '/user/feedback', label: UI_TEXT_ROMANIAN.submitFeedback, icon: <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />, roles: [Role.USER] }, 
  { to: '/user/referrals', label: UI_TEXT_ROMANIAN.myReferrals, icon: <UserGroupIcon className="h-6 w-6" />, roles: [Role.USER] },
  { to: '/user/backtest', label: UI_TEXT_ROMANIAN.backtestingStrategies, icon: <CalculatorIcon className="h-6 w-6" />, roles: [Role.USER] },
];

const adminNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: UI_TEXT_ROMANIAN.adminDashboard, icon: <ShieldCheckIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/market-pulse', label: UI_TEXT_ROMANIAN.adminMarketPulse, icon: <PresentationChartLineIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/utilizatori', label: UI_TEXT_ROMANIAN.manageUsers, icon: <UsersIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/anunturi', label: UI_TEXT_ROMANIAN.manageAnnouncements, icon: <MegaphoneIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/calendar', label: UI_TEXT_ROMANIAN.adminCalendar, icon: <CalendarDaysIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/date', label: UI_TEXT_ROMANIAN.dataManagement, icon: <DocumentTextIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/aprobari', label: UI_TEXT_ROMANIAN.pendingRequests, icon: <ClipboardDocumentListIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
  { to: '/admin/jurnal', label: UI_TEXT_ROMANIAN.systemLog, icon: <DocumentTextIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true }, 
  { to: '/admin/feedback', label: UI_TEXT_ROMANIAN.viewFeedback, icon: <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true }, 
  { to: '/admin/settings', label: UI_TEXT_ROMANIAN.platformSettings, icon: <WrenchScrewdriverIcon className="h-6 w-6" />, roles: [Role.ADMIN], adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isForceHidden: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isForceHidden }) => {
  const { user, logout } = useAuth();
  const { currentAccentBaseColor } = useTheme(); // Get accent color

  const getFilteredNavItems = () => {
    let finalItems: NavItem[] = [];

    finalItems.push(...commonNavItems.filter(item => item.publicAccess));

    if (user) {
      const authenticatedCommon = commonNavItems.filter(item => 
        !item.publicAccess && 
        (!item.roles || item.roles.includes(user.role))
      );
      finalItems.push(...authenticatedCommon);

      if (user.role === Role.USER) {
        finalItems.push(...userNavItems.filter(item => item.roles?.includes(Role.USER)));
      } else if (user.role === Role.ADMIN) {
        finalItems.push(...adminNavItems.filter(item => item.roles?.includes(Role.ADMIN)));
      }
    }
    
    const uniquePaths = new Map<string, NavItem>();
    finalItems.forEach(item => {
        if (!uniquePaths.has(item.to) || (item.roles && !uniquePaths.get(item.to)?.roles) ) {
             uniquePaths.set(item.to, item);
        }
    });
    
    return Array.from(uniquePaths.values()).sort((a, b) => {
        const aIsPublicCommon = commonNavItems.some(ci => ci.to === a.to && ci.publicAccess);
        const bIsPublicCommon = commonNavItems.some(ci => ci.to === b.to && ci.publicAccess);
        if (aIsPublicCommon && !bIsPublicCommon) return -1;
        if (!aIsPublicCommon && bIsPublicCommon) return 1;
        return 0;
    });
  };


  const navLinkClass = ({ isActive }: { isActive: boolean }) => {
    const activeBgColor = `bg-${currentAccentBaseColor}-600`; // Use currentAccentBaseColor
    const hoverBgColor = `hover:bg-neutral-700`;
    return `flex items-center px-4 py-3 text-lg rounded-lg transition-colors duration-200 ease-in-out
     ${isActive 
       ? `${activeBgColor} text-white shadow-lg` 
       : `text-neutral-300 ${hoverBgColor} hover:text-white`
     }`;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      ></div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-neutral-800 dark:bg-neutral-900 shadow-2xl 
                   transform transition-all duration-300 ease-in-out lg:relative overflow-hidden
                   ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
                   lg:translate-x-0
                   ${isForceHidden ? 'lg:w-0 lg:p-0' : 'lg:w-72'}`}
      >
        <div className="w-72 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between h-20 px-6 border-b border-neutral-700 dark:border-neutral-800 flex-shrink-0">
              <NavLink 
                to="/" 
                onClick={() => setIsOpen(false)} 
                aria-label={UI_TEXT_ROMANIAN.appName + " - " + UI_TEXT_ROMANIAN.home}
                className="focus:outline-none focus:ring-2 focus:ring-primary-400 rounded"
              >
                <img 
                  src="https://i.ibb.co/zgtmkSY/IMG-4094-1.webp" 
                  alt={UI_TEXT_ROMANIAN.appName + " Logo"} 
                  className="h-12 object-contain" 
                />
              </NavLink>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white lg:hidden">
                <XMarkIcon className="h-7 w-7" />
              </button>
            </div>

            <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
              {getFilteredNavItems().map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={() => setIsOpen(false)}>
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="p-6 border-t border-neutral-700 dark:border-neutral-800 flex-shrink-0">
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="flex items-center w-full px-4 py-3 text-lg text-neutral-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors duration-200"
                >
                  <ArrowLeftEndOnRectangleIcon className="h-6 w-6 mr-3" />
                  {UI_TEXT_ROMANIAN.logoutButton}
                </button>
              </div>
            )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;