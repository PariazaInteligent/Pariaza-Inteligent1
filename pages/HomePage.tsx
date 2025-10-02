import React, { useMemo, useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { UI_TEXT_ROMANIAN, BADGE_DEFINITIONS } from '../constants'; 
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ChartBarIcon, UserCircleIcon, ShieldCheckIcon, BanknotesIcon, TrophyIcon, CheckBadgeIcon, SparklesIcon, ArrowLeftEndOnRectangleIcon } from '../components/ui/Icons';
import { Role, PlatformSettingKey, BetStatus, TransactionType } from '../types';
import { timeAgo, formatCurrency } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';

// --- START OF NEW COMPONENT DEFINITION ---

interface FeedItem {
  id: string;
  type: 'WIN' | 'INVESTMENT' | 'BADGE' | 'WITHDRAWAL';
  timestamp: string;
  text: React.ReactNode;
  icon: React.ReactNode;
  colorClass: string;
}

const SIGNIFICANT_INVESTMENT_THRESHOLD = 500; // EUR

const LiveActivityFeed: React.FC = () => {
  const { appData, loading } = useData();
  const [visibleItems, setVisibleItems] = useState<FeedItem[]>([]);
  
  const feedItems = useMemo((): FeedItem[] => {
    if (!appData) return [];

    const winItems: FeedItem[] = (appData.bets || [])
      .filter(bet => bet.status === BetStatus.WON && bet.profit && bet.profit > 0 && bet.resolvedAt)
      .map(bet => ({
        id: `win-${bet.id}`,
        type: 'WIN',
        timestamp: bet.resolvedAt!,
        text: (
          <>
            Pariul <span className="font-semibold text-neutral-800 dark:text-neutral-100">{bet.selection}</span> a fost câștigat, generând un profit de <span className="font-bold text-green-500">{formatCurrency(bet.profit)}</span>!
          </>
        ),
        icon: <TrophyIcon className="h-6 w-6 text-yellow-400" />,
        colorClass: 'border-yellow-400',
      }));

    const investmentItems: FeedItem[] = (appData.transactions || [])
      .filter(tx => 
        tx.type === TransactionType.INVESTMENT_APPROVAL && 
        tx.status === 'COMPLETED' &&
        tx.amount && tx.amount >= SIGNIFICANT_INVESTMENT_THRESHOLD
      )
      .map(tx => {
          const user = appData.users.find(u => u.id === tx.userId);
          return {
            id: `invest-${tx.id}`,
            type: 'INVESTMENT',
            timestamp: tx.timestamp,
            text: (
              <>
                Investiție nouă de <span className="font-bold text-primary-500 dark:text-primary-400">{formatCurrency(tx.amount)}</span> primită de la <span className="font-semibold text-neutral-800 dark:text-neutral-100">{user?.name || 'un investitor'}</span>.
              </>
            ),
            icon: <BanknotesIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />,
            colorClass: 'border-primary-500',
          }
      });
      
    const badgeItems: FeedItem[] = (appData.users || [])
      .filter(user => user.role === Role.USER && user.profileData.badges && user.profileData.badges.length > 0)
      .flatMap(user => user.profileData.badges.map(badge => ({
          id: `badge-${user.id}-${badge.badgeType}`,
          type: 'BADGE',
          timestamp: badge.earnedAt,
          text: (
              <>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100">{user.name}</span> a câștigat ecusonul: <span className="font-bold text-secondary-500 dark:text-secondary-400">{BADGE_DEFINITIONS[badge.badgeType]?.name || badge.badgeType}</span>!
              </>
          ),
          icon: React.createElement(BADGE_DEFINITIONS[badge.badgeType]?.icon || CheckBadgeIcon, { className: 'h-6 w-6 text-secondary-500 dark:text-secondary-400' }),
          colorClass: 'border-secondary-500',
      })));

    const withdrawalItems: FeedItem[] = (appData.transactions || [])
      .filter(tx => 
        tx.type === TransactionType.WITHDRAWAL_APPROVAL && 
        tx.status === 'COMPLETED' &&
        tx.amount && tx.amount > 0
      )
      .map(tx => {
          const user = appData.users.find(u => u.id === tx.userId);
          return {
            id: `withdraw-${tx.id}`,
            type: 'WITHDRAWAL',
            timestamp: tx.timestamp,
            text: (
              <>
                Retragere de <span className="font-bold text-rose-500">{formatCurrency(tx.amount)}</span> aprobată pentru <span className="font-semibold text-neutral-800 dark:text-neutral-100">{user?.name || 'un investitor'}</span>.
              </>
            ),
            icon: <ArrowLeftEndOnRectangleIcon className="h-6 w-6 text-rose-500" />,
            colorClass: 'border-rose-500',
          }
      });

    return [...winItems, ...investmentItems, ...badgeItems, ...withdrawalItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [appData]);

  useEffect(() => {
    if (feedItems.length > 0) {
      setVisibleItems([]); // Reset on data change
      const interval = setInterval(() => {
        setVisibleItems(current => {
          if (current.length < feedItems.length) {
            return [...feedItems.slice(0, current.length + 1)];
          }
          clearInterval(interval);
          return current;
        });
      }, 300); // Stagger the appearance of items
      return () => clearInterval(interval);
    }
  }, [feedItems]);

  if (loading && feedItems.length === 0) {
    return (
      <Card title="Activitate Live pe Platformă" icon={<SparklesIcon className="h-6 w-6" />}>
        <div className="flex justify-center items-center h-48">
          <Spinner />
        </div>
      </Card>
    );
  }
  
  if (feedItems.length === 0) {
      return null; // Don't show the card if there's no activity to display
  }

  return (
    <Card title="Activitate Live pe Platformă" icon={<SparklesIcon className="h-6 w-6 text-primary-500 dark:text-primary-400" />}>
      <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
        {visibleItems.map(item => (
          <div key={item.id} className={`flex items-start space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg shadow-sm border-l-4 ${item.colorClass} animate-slide-in-left`}>
            <div className="flex-shrink-0 pt-1">
              {item.icon}
            </div>
            <div className="flex-grow">
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{item.text}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{timeAgo(item.timestamp)}</p>
            </div>
          </div>
        ))}
        {visibleItems.length < feedItems.length && (
            <div className="flex justify-center pt-2">
                <Spinner size="sm" />
            </div>
        )}
      </div>
    </Card>
  );
};
// --- END OF NEW COMPONENT DEFINITION ---


const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { getPlatformSettingValue } = useData(); // Use useData to get settings

  const tagline = getPlatformSettingValue(PlatformSettingKey.UI_TEXT_TAGLINE, UI_TEXT_ROMANIAN.tagline);
  const welcomeMessage = getPlatformSettingValue(PlatformSettingKey.UI_TEXT_HOMEPAGE_WELCOME_MESSAGE, UI_TEXT_ROMANIAN.homepageWelcomeMessage);


  return (
    <div className="animate-fade-in space-y-8">
      <Card 
        className="bg-gradient-to-br from-primary-600 to-secondary-500 text-white dark:from-primary-700 dark:to-secondary-600"
        titleClassName="border-b-0"
      >
        <div className="text-center p-6">
          <NavLink 
            to="/" 
            aria-label={UI_TEXT_ROMANIAN.appName + " - " + UI_TEXT_ROMANIAN.home}
            className="block mb-6 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-400 rounded-md"
          >
            <img 
              src="https://i.ibb.co/zgtmkSY/IMG-4094-1.webp" 
              alt={UI_TEXT_ROMANIAN.appName + " Logo"} 
              className="h-20 md:h-24 object-contain mx-auto" 
            />
          </NavLink>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Bun venit la {UI_TEXT_ROMANIAN.appName}!
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-primary-100 dark:text-primary-200">
            {tagline}
          </h2>
          <p className="text-lg md:text-xl mb-8 text-primary-100 dark:text-primary-200">
            {welcomeMessage}
          </p>
          {!user && (
            <Link to="/login">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50 dark:bg-neutral-100 dark:text-primary-700 dark:hover:bg-neutral-200">
                {UI_TEXT_ROMANIAN.loginButton} sau Înregistrează-te
              </Button>
            </Link>
          )}
          {user && user.role === Role.USER && (
             <Link to="/user/dashboard">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50 dark:bg-neutral-100 dark:text-primary-700 dark:hover:bg-neutral-200">
                Vezi Dashboard-ul tău
              </Button>
            </Link>
          )}
           {user && user.role === Role.ADMIN && (
             <Link to="/admin/dashboard">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50 dark:bg-neutral-100 dark:text-primary-700 dark:hover:bg-neutral-200">
                Panou de Administrare
              </Button>
            </Link>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Performanță Transparentă" icon={<ChartBarIcon className="h-8 w-8" />}>
          <p className="text-neutral-600 dark:text-neutral-300">
            Urmărește evoluția băncii comune în timp real. Statistici detaliate, profitabilitate zilnică și turnover, toate la un click distanță.
          </p>
          <Link to="/statistici" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Vezi Statistici</Button>
          </Link>
        </Card>

        <Card title="Pentru Investitori" icon={<UserCircleIcon className="h-8 w-8" />}>
          <p className="text-neutral-600 dark:text-neutral-300">
            Dashboard personalizat, control asupra investițiilor tale, cereri de retragere facile și transparență totală asupra profitului tău.
          </p>
           {!user && (
            <Link to="/login" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Devino Investitor</Button>
            </Link>
          )}
           {user && user.role === Role.USER && (
            <Link to="/user/investitii" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Gestionează Investițiile</Button>
            </Link>
          )}
        </Card>

        <Card title="Administrare Eficientă" icon={<ShieldCheckIcon className="h-8 w-8" />}>
          <p className="text-neutral-600 dark:text-neutral-300">
            Panou de control complet pentru administratori. Gestionarea utilizatorilor, aprobarea cererilor, actualizarea datelor și export/import facil.
          </p>
           {user && user.role === Role.ADMIN && (
            <Link to="/admin/utilizatori" className="mt-4 inline-block">
              <Button variant="outline" size="sm">Panou Admin</Button>
            </Link>
          )}
          {!user && (
             <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Funcționalitate rezervată administratorilor.</p>
          )}
        </Card>
      </div>

      <LiveActivityFeed />

      <Card title="Cum Funcționează?">
        <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-300">
          <li><strong>Înregistrare/Autentificare:</strong> Creează-ți cont sau autentifică-te pentru a accesa platforma.</li>
          <li><strong>Investiție Inițială:</strong> Utilizatorii pot solicita adăugarea de fonduri în banca comună.</li>
          <li><strong>Management Zilnic (Admin):</strong> Administratorii introduc datele zilnice de performanță (profit, turnover).</li>
          <li><strong>Calcul Profit:</strong> Platforma calculează profitul proporțional pentru fiecare investitor activ.</li>
          <li><strong>Taxa de Platformă:</strong> O taxă <Link to="/data-stream" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-secondary-500 dark:hover:text-secondary-400 transition-colors underline decoration-dotted underline-offset-2" title="Descoperă secretul...">dinamică</Link> este aplicată, crescând cu numărul de investitori.</li>
          <li><strong>Retrageri:</strong> Investitorii pot solicita retragerea fondurilor și a profitului.</li>
          <li><strong>Transparență:</strong> Toate statisticile și tranzacțiile sunt vizibile (în funcție de rol).</li>
        </ol>
      </Card>
    </div>
  );
};

export default HomePage;