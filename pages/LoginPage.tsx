import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UI_TEXT_ROMANIAN, ADMIN_TELEGRAM_USERNAME_FALLBACK, TELEGRAM_PREDEFINED_MESSAGE_FALLBACK } from '../constants';
import { Role, NotificationType, PlatformSettingKey } from '../types';
import Card from '../components/ui/Card';
import Footer from '../components/layout/Footer';
import { TelegramIcon } from '../components/ui/Icons';
import EnigmaGrid from '../components/ui/EnigmaGrid'; // Import the new component

const validateEmail = (email: string): boolean => {
  // Simple regex for email format validation
  const re = /\S+@\S+\.\S+/;
  return re.test(String(email).toLowerCase());
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState(''); // State for email validation error
  const { login, loadingAuth } = useAuth();
  const { appData, loading: dataLoading, updateUserInContext } = useData();
  const { addNotification } = useNotifications();
  const { getPlatformSettingValue } = useData();
  const navigate = useNavigate();

  const adminTelegramUsername = useMemo(() =>
    getPlatformSettingValue(PlatformSettingKey.TELEGRAM_USERNAME, ADMIN_TELEGRAM_USERNAME_FALLBACK),
    [getPlatformSettingValue]
  );
  const telegramPredefinedMessage = useMemo(() =>
    getPlatformSettingValue(PlatformSettingKey.TELEGRAM_PREDEFINED_MESSAGE, TELEGRAM_PREDEFINED_MESSAGE_FALLBACK),
    [getPlatformSettingValue]
  );
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError(''); // Clear error as user types
    }
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError('Formatul email-ului este invalid.');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation on submit
    if (!validateEmail(email)) {
      setEmailError('Formatul email-ului este invalid.');
      addNotification('Te rog introdu un email valid.', NotificationType.ERROR);
      return;
    }
    
    setEmailError(''); // Clear any previous blur errors

    if (dataLoading || !appData?.users) {
      addNotification("Datele aplicației se încarcă, te rog așteaptă o secundă...", NotificationType.INFO);
      return;
    }

    try {
      const user = await login(email, password, appData.users);
      if (user) {
        addNotification(`Bun venit, ${user.name}!`, NotificationType.SUCCESS);
        
        // Update last login timestamp in local state without exporting
        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        updateUserInContext(updatedUser);

        if (user.role === Role.ADMIN) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/user/dashboard', { replace: true });
        }
      } else {
        setError(UI_TEXT_ROMANIAN.authenticationFailed);
        addNotification(UI_TEXT_ROMANIAN.authenticationFailed, NotificationType.ERROR);
      }
    } catch (err) {
      const errorMessage = (err as Error).message || UI_TEXT_ROMANIAN.authenticationFailed;
      setError(errorMessage);
      addNotification(errorMessage, NotificationType.ERROR);
    }
  };

  const handleContactAdmin = () => {
    const message = encodeURIComponent(telegramPredefinedMessage);
    const telegramUrl = `https://t.me/${adminTelegramUsername}?text=${message}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 animate-fade-in relative overflow-hidden">
      <EnigmaGrid />
      <div className="z-10 w-full max-w-md flex flex-col flex-grow justify-center">
        <Card 
          className="w-full shadow-2xl bg-neutral-800/60 dark:bg-neutral-900/60 backdrop-blur-md border border-primary-500/30"
          titleClassName="text-center"
        >
          <div className="text-center mb-8">
              <Link to="/" aria-label={UI_TEXT_ROMANIAN.home} className="inline-block mb-1">
                  <img 
                  src="https://i.ibb.co/zgtmkSY/IMG-4094-1.webp" 
                  alt={UI_TEXT_ROMANIAN.appName + " Logo"} 
                  className="h-16 object-contain" 
                  />
              </Link>
            <h1 className="text-3xl font-bold text-primary-400">{UI_TEXT_ROMANIAN.login}</h1>
            <p className="text-neutral-300 mt-1">Autentifică-te pentru a accesa platforma.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={UI_TEXT_ROMANIAN.email}
              type="email"
              name="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              required
              placeholder="exemplu@email.com"
              error={emailError}
            />
            <Input
              label={UI_TEXT_ROMANIAN.password}
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              showPasswordToggle 
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" isLoading={loadingAuth || dataLoading} disabled={loadingAuth || dataLoading}>
              {UI_TEXT_ROMANIAN.loginButton}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-300">{UI_TEXT_ROMANIAN.loginPageContactHelp}</p>
            <Button onClick={handleContactAdmin} variant="ghost" className="mt-2 text-primary-400 hover:underline" leftIcon={<TelegramIcon className="h-5 w-5"/>}>
              {UI_TEXT_ROMANIAN.contactAdminTelegramButton} (@{adminTelegramUsername})
            </Button>
          </div>
        </Card>
      </div>
      <div className="w-full max-w-md mt-auto z-10">
        <Footer />
      </div>
    </div>
  );
};

export default LoginPage;