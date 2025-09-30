import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import HowItWorksPage from './pages/HowItWorksPage';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import StatsPage from './pages/StatsPage';
import InvestmentsPage from './pages/InvestmentsPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
// FIX: Changed to a named import for ProfilePage.
import { ProfilePage } from './pages/ProfilePage';
import UserAlertsPage from './pages/UserAlertsPage'; 
import UserCycleReportsPage from './pages/UserCycleReportsPage'; 
import HelpCenterPage from './pages/HelpCenterPage'; 
import UserFeedbackPage from './pages/UserFeedbackPage'; 
import UserReferralPage from './pages/UserReferralPage'; 
import UserAdvancedReportsPage from './pages/UserAdvancedReportsPage';
import UserGoalsPage from './pages/UserGoalsPage';
import UserBetsPage from './pages/UserBetsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDataManagementPage from './pages/AdminDataManagementPage';
import AdminRequestsPage from './pages/AdminRequestsPage';
import AdminSystemLogPage from './pages/AdminSystemLogPage';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage';
import AdminViewFeedbackPage from './pages/AdminViewFeedbackPage'; 
import AdminPlatformSettingsPage from './pages/AdminPlatformSettingsPage';
import AdminCalendarPage from './pages/AdminCalendarPage'; 
import AdminMarketPulsePage from './pages/AdminMarketPulsePage'; // New Page
import UserBacktestingPage from './pages/UserBacktestingPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import TrophyRoomPage from './pages/TrophyRoomPage'; // New Page
import DesertOasisPage from './pages/DesertOasisPage'; // New Page
import DataStreamPage from './pages/DataStreamPage'; // New Page
import NotFoundPage from './pages/NotFoundPage';
import { Role } from './types';
import NotificationContainer from './components/ui/NotificationContainer';
import { UI_TEXT_ROMANIAN } from './constants';
import PWAInstallButton from './components/ui/PWAInstallButton';
import CookieConsent from './components/ui/CookieConsent'; // Import the new component
import { Chart, registerables } from 'chart.js/auto'; 

Chart.register(...registerables);


const App: React.FC = () => {
  const { theme } = useTheme();
  const { user, loadingAuth } = useAuth();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
        <div className="p-6 rounded-lg shadow-xl bg-white dark:bg-neutral-800">
          <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">{UI_TEXT_ROMANIAN.loadingApp}</p>
          {/* Add a spinner icon here */}
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationContainer />
      <PWAInstallButton />
      <CookieConsent />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === Role.ADMIN ? "/admin/dashboard" : "/user/dashboard"} /> : <LoginPage />} />
        
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cum-functioneaza" element={<HowItWorksPage />} />
          <Route path="/statistici" element={<StatsPage />} />
          <Route path="/trophy-room" element={<TrophyRoomPage />} />
          <Route path="/desert-oasis" element={<DesertOasisPage />} />
          <Route path="/data-stream" element={<DataStreamPage />} />
          <Route path="/notifications" element={user ? <NotificationCenterPage /> : <Navigate to="/login" />} />
          <Route path="/help" element={<HelpCenterPage />} /> 

          {/* User specific routes */}
          {user && user.role === Role.USER && (
            <>
              <Route path="/user/dashboard" element={<UserDashboardPage />} />
              <Route path="/user/investitii" element={<InvestmentsPage />} />
              <Route path="/user/retrageri" element={<WithdrawalsPage />} />
              <Route path="/user/profil" element={<ProfilePage />} />
              <Route path="/user/alerte" element={<UserAlertsPage />} />
              <Route path="/user/reports" element={<UserCycleReportsPage />} /> 
              <Route path="/user/advanced-reports" element={<UserAdvancedReportsPage />} /> 
              <Route path="/user/goals" element={<UserGoalsPage />} />
              <Route path="/user/bets" element={<UserBetsPage />} />
              <Route path="/user/feedback" element={<UserFeedbackPage />} /> 
              <Route path="/user/referrals" element={<UserReferralPage />} /> 
              <Route path="/user/backtest" element={<UserBacktestingPage />} />
            </>
          )}

          {/* Admin specific routes */}
          {user && user.role === Role.ADMIN && (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/utilizatori" element={<AdminUsersPage />} />
              <Route path="/admin/anunturi" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/date" element={<AdminDataManagementPage />} />
              <Route path="/admin/aprobari" element={<AdminRequestsPage />} />
              <Route path="/admin/jurnal" element={<AdminSystemLogPage />} />
              <Route path="/admin/feedback" element={<AdminViewFeedbackPage />} /> 
              <Route path="/admin/settings" element={<AdminPlatformSettingsPage />} />
              <Route path="/admin/calendar" element={<AdminCalendarPage />} />
              <Route path="/admin/market-pulse" element={<AdminMarketPulsePage />} />
              {/* Redirect admin from base user paths if they try to access them */}
              <Route path="/user/dashboard" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/user/profil" element={<Navigate to="/admin/dashboard" />} /> 
              <Route path="/user/alerte" element={<Navigate to="/admin/dashboard" />} /> 
              <Route path="/user/reports" element={<Navigate to="/admin/dashboard" />} /> 
              <Route path="/user/advanced-reports" element={<Navigate to="/admin/dashboard" />} /> 
              <Route path="/user/goals" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/user/bets" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/user/feedback" element={<Navigate to="/admin/dashboard" />} />
              <Route path="/user/referrals" element={<Navigate to="/admin/dashboard" />} /> 
              <Route path="/user/backtest" element={<Navigate to="/admin/dashboard" />} />
            </>
          )}
          
          {!user && (
             <>
              <Route path="/user/*" element={<Navigate to="/login" replace />} />
              <Route path="/admin/*" element={<Navigate to="/login" replace />} />
             </>
          )}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;