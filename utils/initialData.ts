import { AppData, User, GlobalStats, Transaction, DailyHistoryRecord, Role, UserProfileData, TransactionType, TransactionStatus, AdminPermission, AdminPermissionsRecord, Announcement, UserMessage, MessageImportance, UserMessageType, InvestmentAlert, UserBadge, FeedbackItem, PlatformSetting, PlatformSettingKey, PlatformSettingsData, Referral, CalendarEvent, AccentPaletteKey, InterfaceDensity, InvestmentGoal, Bet, BetType, BetStatus } from '../types'; // Added InvestmentGoal, Bet, BetType, BetStatus
import { DEFAULT_AVATAR_URL, UI_TEXT_ROMANIAN, ADMIN_TELEGRAM_USERNAME_FALLBACK, TELEGRAM_PREDEFINED_MESSAGE_FALLBACK, ACCENT_COLOR_PALETTES, INTERFACE_DENSITY_OPTIONS, GITHUB_DATA_URLS } from '../constants';
import { generateId } from './helpers';

// All permissions enabled for the global admin
const allAdminPermissions: AdminPermissionsRecord = {
  [AdminPermission.CAN_MANAGE_USERS]: true,
  [AdminPermission.CAN_VIEW_STATS]: true,
  [AdminPermission.CAN_MANAGE_DATA]: true,
  [AdminPermission.CAN_APPROVE_REQUESTS]: true,
  [AdminPermission.CAN_VIEW_SYSTEM_LOG]: true,
  [AdminPermission.CAN_MANAGE_ADMIN_PERMISSIONS]: true,
  [AdminPermission.CAN_USE_GEMINI_ANALYSIS]: true,
  [AdminPermission.CAN_MANAGE_ANNOUNCEMENTS]: true,
  [AdminPermission.CAN_VIEW_FEEDBACK]: true,
  [AdminPermission.CAN_MANAGE_PLATFORM_SETTINGS]: true, 
  [AdminPermission.CAN_MANAGE_CALENDAR_EVENTS]: true,
  [AdminPermission.CAN_MANAGE_INVESTMENT_GOALS]: true,
};

// Limited permissions for a secondary admin example
const limitedAdminPermissions: AdminPermissionsRecord = {
  [AdminPermission.CAN_MANAGE_USERS]: true,
  [AdminPermission.CAN_VIEW_STATS]: true,
  [AdminPermission.CAN_MANAGE_DATA]: false,
  [AdminPermission.CAN_APPROVE_REQUESTS]: true,
  [AdminPermission.CAN_VIEW_SYSTEM_LOG]: true,
  [AdminPermission.CAN_MANAGE_ADMIN_PERMISSIONS]: false,
  [AdminPermission.CAN_USE_GEMINI_ANALYSIS]: false,
  [AdminPermission.CAN_MANAGE_ANNOUNCEMENTS]: false,
  [AdminPermission.CAN_VIEW_FEEDBACK]: false,
  [AdminPermission.CAN_MANAGE_PLATFORM_SETTINGS]: false, 
  [AdminPermission.CAN_MANAGE_CALENDAR_EVENTS]: false,
  [AdminPermission.CAN_MANAGE_INVESTMENT_GOALS]: false,
};


export const generateInitialAdminUser = (): User => ({
  id: 'admin_initial_001', // Fixed ID
  email: 'admin@pariazainteligent.ro',
  password: 'adminpassword',
  role: Role.ADMIN,
  name: 'Admin Principal',
  avatar: 'https://picsum.photos/seed/admin_initial_001/100/100',
  isActive: true, 
  isGlobalAdmin: true,
  adminPermissions: allAdminPermissions, 
  profileData: {
    investedAmount: 0,
    totalProfitEarned: 0,
    joinDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    investmentHistory: [],
    badges: [], 
    accentPalette: 'DEFAULT_BLUE' as AccentPaletteKey, 
    interfaceDensity: InterfaceDensity.COMFORTABLE, 
  },
});

export const generateSecondaryAdminUser = (): User => ({
    id: 'admin_secondary_002',
    email: 'admin2@pariazainteligent.ro',
    password: 'adminpassword2',
    role: Role.ADMIN,
    name: 'Admin Secundar',
    avatar: 'https://picsum.photos/seed/admin_secondary_002/100/100',
    isActive: true,
    isGlobalAdmin: false,
    adminPermissions: limitedAdminPermissions,
    profileData: {
        investedAmount: 0,
        totalProfitEarned: 0,
        joinDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        investmentHistory: [],
        badges: [], 
        accentPalette: 'DEFAULT_BLUE' as AccentPaletteKey, 
        interfaceDensity: InterfaceDensity.COMFORTABLE, 
    }
});


export const generateInitialInvestorUser = (id: string, name: string, email: string, initialInvestment: number = 0, joinDateOffsetDays: number = 0): User => ({
    id: id,
    email: email,
    password: 'userpassword', 
    role: Role.USER,
    name: name,
    avatar: `https://picsum.photos/seed/${email}/100/100`,
    isActive: true, 
    profileData: {
        investedAmount: initialInvestment,
        totalProfitEarned: 0,
        currentGrossProfit: 0,
        platformFeePaid: 0,
        currentNetProfit: 0,
        joinDate: new Date(Date.now() - joinDateOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
        investmentHistory: initialInvestment > 0 ? [{ date: new Date(Date.now() - joinDateOffsetDays * 24 * 60 * 60 * 1000).toISOString(), amount: initialInvestment, type: 'DEPOSIT' }] : [],
        badges: [], 
        accentPalette: 'DEFAULT_BLUE' as AccentPaletteKey, 
        interfaceDensity: InterfaceDensity.COMFORTABLE, 
    }
});

export const generateDefaultUserSet = (): User[] => [
    generateInitialAdminUser(),
    generateSecondaryAdminUser(), 
    generateInitialInvestorUser('user_demo_001', 'Investitor Demo 1', 'investitor1@example.com', 3000, 2),
    generateInitialInvestorUser('user_demo_002', 'Investitor Demo 2', 'investitor2@example.com', 2000, 1),
];


export const generateInitialGlobalStats = (): GlobalStats => ({
  totalInvested: 5000, 
  totalProfitDistributed: 0, 
  activeInvestors: 2,
  currentTurnover: 0, 
  totalBetsPlaced: 0, 
  platformFeeRate: 0.01, 
  lastProfitUpdateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
  achievedBankMilestones: [],
});

export const generateInitialTransactions = (): Transaction[] => {
  const adminId = 'admin_initial_001';
  const investor1Id = 'user_demo_001';
  const investor2Id = 'user_demo_002';
  const investor1Name = "Investitor Demo 1";
  const investor2Name = "Investitor Demo 2";
  const adminName = "Admin Principal";

  return [
    {
      id: "txn_init_admin_create",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 10000).toISOString(),
      userId: adminId,
      type: TransactionType.USER_CREATED,
      status: TransactionStatus.COMPLETED,
      description: `Cont Admin (${adminName}) creat.`
    },
    {
      id: "txn_init_user1_create",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 10000).toISOString(),
      userId: investor1Id,
      adminId: adminId,
      type: TransactionType.USER_CREATED,
      status: TransactionStatus.COMPLETED,
      description: `Cont Investitor (${investor1Name}) creat de admin ${adminName}.`
    },
    {
      id: "txn_init_user1_invest",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
      userId: investor1Id,
      type: TransactionType.INVESTMENT_APPROVAL,
      status: TransactionStatus.COMPLETED,
      amount: 3000,
      description: `Investiție inițială de ${investor1Name} aprobată.`
    },
    {
      id: "txn_init_user2_create",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 10000).toISOString(), 
      userId: investor2Id,
      adminId: adminId,
      type: TransactionType.USER_CREATED,
      status: TransactionStatus.COMPLETED,
      description: `Cont Investitor (${investor2Name}) creat de admin ${adminName}.`
    },
    {
      id: "txn_init_user2_invest",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
      userId: investor2Id,
      type: TransactionType.INVESTMENT_APPROVAL,
      status: TransactionStatus.COMPLETED,
      amount: 2000,
      description: `Investiție inițială de ${investor2Name} aprobată.`
    },
    {
      id: "txn_pending_withdrawal_user1_init",
      timestamp: new Date().toISOString(),
      userId: investor1Id,
      type: TransactionType.WITHDRAWAL_REQUEST,
      status: TransactionStatus.PENDING,
      amount: 500,
      description: `Cerere de retragere de la ${investor1Name} în valoare de 500 EUR.`
    }
  ];
};

export const generateInitialDailyHistory = (): DailyHistoryRecord[] => [
  {
    day: 1,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    dailyGrossProfit: 110,
    turnover: 100,
    numBets: 1,
    totalBankValueStart: 3000, 
    totalBankValueEnd: 3110, 
    notes: "Zi generată automat din pariuri rezolvate.",
    distributedNetProfit: 108.9, 
    collectedFees: 1.1, 
  },
];

export const generateInitialAnnouncements = (): Announcement[] => [
    {
        id: generateId('announcement'),
        title: "Mentenanță Programată Duminică",
        content: "Platforma va fi indisponibilă duminică, între orele 02:00 și 04:00 AM, pentru lucrări de mentenanță. Vă mulțumim pentru înțelegere!",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'admin_initial_001',
        importance: MessageImportance.HIGH,
    },
    {
        id: generateId('announcement'),
        title: "Actualizare Termeni și Condiții",
        content: "Am actualizat Termenii și Condițiile platformei. Vă rugăm să îi revizuiți în secțiunea dedicată.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'admin_initial_001',
        importance: MessageImportance.MEDIUM,
    }
];

export const generateInitialUserMessages = (): UserMessage[] => [
    {
        id: generateId('usermsg'),
        userId: 'user_demo_001',
        title: "Cererea de Retragere Aprobată",
        content: "Cererea ta de retragere în valoare de 200 EUR a fost aprobată și procesată.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        type: UserMessageType.SUCCESS,
        linkTo: '/user/retrageri',
    },
    {
        id: generateId('usermsg'),
        userId: 'user_demo_001',
        title: "Investiție Confirmată",
        content: "Investiția ta de 500 EUR a fost confirmată și adăugată în cont.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        type: UserMessageType.SUCCESS,
        linkTo: '/user/investitii',
    }
];

export const generateInitialInvestmentAlerts = (): InvestmentAlert[] => [];

export const generateInitialFeedback = (): FeedbackItem[] => [];

export const generateInitialPlatformSettings = (): PlatformSettingsData => [
    {
        key: PlatformSettingKey.TELEGRAM_USERNAME,
        value: ADMIN_TELEGRAM_USERNAME_FALLBACK,
        label: "Nume Utilizator Telegram Admin",
        description: "Numele de utilizator Telegram afișat pentru contact pe pagina de login.",
        type: 'text',
        isPublic: true,
    },
    {
        key: PlatformSettingKey.TELEGRAM_PREDEFINED_MESSAGE,
        value: TELEGRAM_PREDEFINED_MESSAGE_FALLBACK,
        label: "Mesaj Predefinit Contact Telegram",
        description: "Mesajul precompletat când un utilizator contactează adminul pe Telegram de pe pagina de login.",
        type: 'textarea',
        isPublic: true,
    },
    {
        key: PlatformSettingKey.UI_TEXT_TAGLINE,
        value: UI_TEXT_ROMANIAN.tagline,
        label: "Slogan Platformă (Tagline)",
        description: "Sloganul principal afișat pe pagina de pornire, sub numele aplicației.",
        type: 'text',
        isPublic: true,
    },
    {
        key: PlatformSettingKey.UI_TEXT_HOMEPAGE_WELCOME_MESSAGE,
        value: UI_TEXT_ROMANIAN.homepageWelcomeMessage,
        label: "Mesaj Întâmpinare Pagina Principală",
        description: "Mesajul detaliat de întâmpinare afișat pe pagina de pornire.",
        type: 'textarea',
        isPublic: true,
    },
    {
        key: PlatformSettingKey.GITHUB_URL_GLOBAL_STATS,
        value: GITHUB_DATA_URLS.globalStats,
        label: "URL GitHub: Statistici Globale",
        description: "URL-ul către fișierul globalStats.json de pe GitHub.",
        type: 'text',
        isPublic: false,
    },
    {
        key: PlatformSettingKey.GITHUB_URL_USERS,
        value: GITHUB_DATA_URLS.users,
        label: "URL GitHub: Utilizatori",
        description: "URL-ul către fișierul users.json de pe GitHub.",
        type: 'text',
        isPublic: false,
    },
    {
        key: PlatformSettingKey.GITHUB_URL_TRANSACTIONS,
        value: GITHUB_DATA_URLS.transactions,
        label: "URL GitHub: Tranzacții",
        description: "URL-ul către fișierul transactions.json de pe GitHub.",
        type: 'text',
        isPublic: false,
    },
    {
        key: PlatformSettingKey.GITHUB_URL_DAILY_HISTORY,
        value: GITHUB_DATA_URLS.dailyHistory,
        label: "URL GitHub: Istoric Zilnic",
        description: "URL-ul către fișierul dailyHistory.json de pe GitHub.",
        type: 'text',
        isPublic: false,
    },
     {
        key: PlatformSettingKey.GITHUB_URL_BETS,
        value: GITHUB_DATA_URLS.bets,
        label: "URL GitHub: Pariuri",
        description: "URL-ul către fișierul bets.json de pe GitHub.",
        type: 'text',
        isPublic: false,
    },
    {
        key: PlatformSettingKey.FEATURE_ALLOW_REFERRALS,
        value: 'true', // booleans are stored as strings 'true'/'false'
        label: "Activare Sistem de Recomandări",
        description: "Activează sau dezactivează funcționalitatea de recomandări pentru utilizatori.",
        type: 'boolean',
        isPublic: true,
    },
    {
        key: PlatformSettingKey.AI_WATCHDOG_STAKE_THRESHOLD_PERCENT,
        value: '5',
        label: 'Prag Avertizare Miză AI Watchdog (%)',
        description: 'Procentajul maxim din banca totală pe care o miză o poate avea înainte ca AI Watchdog să emită o avertizare de risc.',
        type: 'number',
        isPublic: false,
    },
    {
        key: PlatformSettingKey.AI_WATCHDOG_MIDDLE_PROFIT_THRESHOLD_PERCENT,
        value: '1',
        label: 'Prag Profit Middle AI Watchdog (%)',
        description: 'Profitul procentual minim (raportat la miza totală) pentru un "middle" sub care AI Watchdog va emite o avertizare de profit nesemnificativ.',
        type: 'number',
        isPublic: false,
    }
];

export const generateInitialReferrals = (): Referral[] => [];

export const generateInitialCalendarEvents = (): CalendarEvent[] => [];

export const generateInitialInvestmentGoals = (): InvestmentGoal[] => []; // New

export const generateInitialBets = (): Bet[] => [
    {
        id: generateId('bet'),
        groupId: 'grp_init_001',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        eventTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        sport: "Fotbal",
        league: "Liga 1",
        event: "FCSB vs CFR Cluj",
        market: "Rezultat Final",
        selection: "FCSB",
        odds: 2.1,
        stake: 100,
        betType: BetType.VALUE,
        status: BetStatus.WON,
        profit: 110,
        createdByAdminId: 'admin_initial_001',
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        processedInDailyHistory: true, // Assume it was processed in the initial daily history
        notes: "Cota parea valoroasa."
    },
    {
        id: generateId('bet'),
        groupId: 'grp_init_002',
        date: new Date().toISOString().split('T')[0],
        eventTimestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Event in 2 hours
        sport: "Tenis",
        league: "ATP Finals",
        event: "Djokovic vs Alcaraz",
        market: "Total Game-uri",
        selection: "Peste 22.5",
        odds: 1.85,
        stake: 50,
        betType: BetType.MIDDLE,
        status: BetStatus.PENDING,
        createdByAdminId: 'admin_initial_001',
        // FIX: Added missing 'processedInDailyHistory' property.
        processedInDailyHistory: false,
    }
];

// Default AppData structure with all initial data generators
export const defaultInitialData: Partial<AppData> = { 
  globalStats: generateInitialGlobalStats(),
  users: generateDefaultUserSet(),
  transactions: generateInitialTransactions(),
  dailyHistory: generateInitialDailyHistory(),
  announcements: generateInitialAnnouncements(),
  userMessages: generateInitialUserMessages(),
  investmentAlerts: generateInitialInvestmentAlerts(),
  feedback: generateInitialFeedback(),
  platformSettings: generateInitialPlatformSettings(), 
  referrals: generateInitialReferrals(),
  calendarEvents: generateInitialCalendarEvents(),
  investmentGoals: generateInitialInvestmentGoals(), // New
  bets: generateInitialBets(), // New
};
