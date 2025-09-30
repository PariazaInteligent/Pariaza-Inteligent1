import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext'; // New
import ThemeSwitcher from '../ui/ThemeSwitcher';
import { UI_TEXT_ROMANIAN } from '../../constants';
import { Bars3Icon, UserCircleIcon, ArrowRightOnRectangleIcon, BellIcon } from '../ui/Icons'; 
import Breadcrumbs from '../ui/Breadcrumbs'; // New Import

interface HeaderProps {
  onMenuButtonClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuButtonClick }) => {
  const { user, logout } = useAuth();
  const { getUnreadMessageCount } = useData(); // New
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const unreadCount = user ? getUnreadMessageCount(user.id) : 0; // New

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-neutral-800 shadow-md transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <div className="lg:hidden">
                <button
                onClick={onMenuButtonClick}
                className="text-neutral-600 dark:text-neutral-300 hover:text-primary-500 dark:hover:text-primary-400 focus:outline-none"
                >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-7 w-7" />
                </button>
            </div>

            <div className="hidden lg:block">
                <Breadcrumbs />
            </div>
          </div>
          
          <div className="flex-1 flex justify-end items-center space-x-4">
            <ThemeSwitcher />

            {user && ( // Notification Bell Icon for logged-in users
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label={UI_TEXT_ROMANIAN.notificationCenter}
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={user.avatar || `https://picsum.photos/seed/${user.id}/100/100`}
                    alt={user.name}
                  />
                  <span className="hidden md:inline text-sm font-medium text-neutral-700 dark:text-neutral-200">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <div 
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-neutral-800 ring-1 ring-black dark:ring-neutral-700 ring-opacity-5 focus:outline-none py-2 animate-fade-in"
                    onMouseLeave={() => setUserMenuOpen(false)} 
                  >
                    <Link
                      to={user.role === 'ADMIN' ? '/admin/dashboard' : '/user/profil'}
                      className="block px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors w-full text-left flex items-center"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-5 w-5 mr-3" />
                      {user.role === 'ADMIN' ? UI_TEXT_ROMANIAN.adminDashboard : UI_TEXT_ROMANIAN.profile}
                    </Link>
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center"
                    >
                       <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                      {UI_TEXT_ROMANIAN.logoutButton}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                {UI_TEXT_ROMANIAN.loginButton}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;