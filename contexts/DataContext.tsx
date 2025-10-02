import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { AppData, GlobalStats, User, Transaction, DailyHistoryRecord, Role, TransactionType, TransactionStatus, NotificationType, Announcement, UserMessage, MessageImportance, UserMessageType, InvestmentAlert, InvestmentAlertConditionType, DashboardWidgetConfig, BadgeType, UserBadge, FeedbackItem, FeedbackCategory, PlatformSetting, PlatformSettingKey, PlatformSettingsData, AuditDetail, TransactionDetails, Referral, ReferralStatus, CalendarEvent, CalendarEventType, AccentPaletteKey, InterfaceDensity, InvestmentGoal, GoalType, GoalStatus, Bet, BetStatus, BetType, FeedbackStatus, CookieConsentData } from '../types'; 
import { dataService } from '../services/dataService';
import { API_ENDPOINTS, UI_TEXT_ROMANIAN, BADGE_DEFINITIONS, ADMIN_TELEGRAM_USERNAME_FALLBACK, TELEGRAM_PREDEFINED_MESSAGE_FALLBACK, AVAILABLE_ADMIN_PERMISSIONS, ACCENT_COLOR_PALETTES, INTERFACE_DENSITY_OPTIONS } from '../constants';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { 
    generateInitialGlobalStats, 
    generateInitialTransactions, 
    generateInitialDailyHistory,
    generateDefaultUserSet,
    generateInitialAnnouncements,
    generateInitialUserMessages,
    generateInitialInvestmentAlerts,
    generateInitialFeedback,
    generateInitialPlatformSettings,
    generateInitialReferrals,
    generateInitialCalendarEvents,
    generateInitialInvestmentGoals, 
    generateInitialBets
} from '../utils/initialData';
import { generateId, formatCurrency, generateAuditDetails, distributeDailyProfit, calculatePlatformFeeRate, formatDate } from '../utils/helpers'; 

const defaultInitialData: AppData = {
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
  investmentGoals: generateInitialInvestmentGoals(),
  bets: generateInitialBets(),
};

export type ValueBetData = Omit<Bet, 'id' | 'status' | 'processedInDailyHistory' | 'groupId' | 'betType' | 'middleDetails'>;
export type MiddleBetData = Omit<Bet, 'id' | 'status' | 'processedInDailyHistory' | 'groupId' | 'betType'>;

interface DataContextType {
  appData: AppData | null;
  loading: boolean;
  error: string | null;
  fetchData: (showNotification?: boolean) => Promise<void>;
  updateAppData: (newData: Partial<AppData>) => void;
  exportData: (dataType: keyof AppData, dataToExportParam?: any) => Promise<void>;
  exportAllAppData: () => Promise<void>;
  importData: (dataType: keyof AppData, file: File) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateUserInContext: (updatedUser: User) => void;
  addUserInContext: (newUser: User) => User | null;
  updateUserAndExport: (user: User) => Promise<void>;
  // Announcement functions
  addAnnouncement: (announcementData: Omit<Announcement, 'id' | 'createdAt'>) => Announcement | null;
  updateAnnouncement: (oldAnnouncement: Announcement, updatedAnnouncementData: Partial<Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>>) => void;
  deleteAnnouncement: (announcementId: string) => void;
  // UserMessage functions
  addUserMessage: (messageData: Omit<UserMessage, 'id' | 'createdAt' | 'isRead'>) => UserMessage | null;
  sendBulkUserMessages: (userIds: string[], title: string, content: string, adminId: string) => Promise<void>;
  markUserMessageAsRead: (messageId: string, userId: string) => void;
  markAllUserMessagesAsRead: (userId: string) => void;
  getUnreadMessageCount: (userId: string) => number;
  // InvestmentAlert functions
  addInvestmentAlert: (alertData: Omit<InvestmentAlert, 'id' | 'createdAt' | 'lastTriggeredAt'>) => InvestmentAlert | null;
  updateInvestmentAlert: (updatedAlert: InvestmentAlert) => void;
  deleteInvestmentAlert: (alertId: string, userId: string) => void;
  checkAndTriggerInvestmentAlerts: (usersForAlertCheck: User[], allAlerts: InvestmentAlert[]) => Promise<{ updatedAlerts: InvestmentAlert[], triggeredMessagesCount: number }>;
  // Dashboard Widget Config function
  updateCurrentUserWidgetConfigAndExport: (userId: string, newConfig: DashboardWidgetConfig[]) => Promise<void>;
  // Gamification Badge functions
  checkUserBadgesOnLoad: (userId: string) => Promise<void>; 
  checkAndAwardBadges: (userId: string, eventType: 'PROFIT_DISTRIBUTION' | 'INVESTMENT_APPROVAL' | 'USER_LOAD' | 'GOAL_COMPLETED', eventData?: any) => Promise<void>;
  // Feedback System functions
  addFeedbackItem: (item: Omit<FeedbackItem, 'id' | 'timestamp' | 'status'>) => FeedbackItem | null;
  updateFeedbackStatus: (feedbackId: string, newStatus: FeedbackStatus, adminId: string) => Promise<void>;
  // Platform Settings functions
  getPlatformSettingValue: (key: PlatformSettingKey, defaultValue?: string) => string;
  updatePlatformSettings: (updatedSettings: PlatformSetting[]) => Promise<void>;
  // Referral System functions
  getOrGenerateUserReferralCode: (userId: string) => Promise<string>;
  linkReferral: (referredUserId: string, referralCode: string, referredUserName: string) => Promise<boolean>;
  completeReferral: (referredUserId: string) => Promise<void>;
  // Investment Goal functions
  addInvestmentGoal: (goalData: Omit<InvestmentGoal, 'id' | 'startDate' | 'status'> & { userId: string }) => InvestmentGoal | null;
  updateInvestmentGoal: (goalId: string, updates: Partial<Omit<InvestmentGoal, 'id' | 'userId' | 'startDate'>>) => InvestmentGoal | null;
  deleteInvestmentGoal: (goalId: string) => boolean; // Or mark as CANCELLED
  checkAndCompleteGoals: (userId: string) => Promise<void>;
  // Bet Management Functions
  addBet: (betData: Omit<Bet, 'id' | 'status' | 'processedInDailyHistory' | 'groupId' | 'betType' | 'middleDetails'>) => Promise<Bet | null>;
  addValueMiddlePair: (valueBetData: ValueBetData, middleBetData: MiddleBetData) => Promise<void>;
  updateBet: (betId: string, updates: Partial<Omit<Bet, 'id'>>) => Promise<Bet | null>;
  deleteBet: (betId: string) => Promise<boolean>;
  deleteBetGroup: (groupId: string) => Promise<void>;
  resolveDayAndDistribute: (date: string, adminId: string) => Promise<void>;
  // FIX: Add missing function to DataContextType
  updateUserCookieConsent: (userId: string, consentData: CookieConsentData) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const { user: authUser } = useAuth();

  const fetchData = useCallback(async (showNotification: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const [
        fetchedGlobalStats, fetchedUsers, fetchedTransactions, fetchedDailyHistory,
        fetchedAnnouncements, fetchedUserMessages, fetchedInvestmentAlerts, fetchedFeedback,
        fetchedPlatformSettings, fetchedReferrals, fetchedCalendarEvents,
        fetchedInvestmentGoals, fetchedBets
      ] = await Promise.all([
        dataService.fetchGlobalStats(API_ENDPOINTS.globalStats),
        dataService.fetchUsers(API_ENDPOINTS.users),
        dataService.fetchTransactions(API_ENDPOINTS.transactions),
        dataService.fetchDailyHistory(API_ENDPOINTS.dailyHistory),
        dataService.fetchAnnouncements(API_ENDPOINTS.announcements),
        dataService.fetchUserMessages(API_ENDPOINTS.userMessages),
        dataService.fetchInvestmentAlerts(API_ENDPOINTS.investmentAlerts),
        dataService.fetchFeedback(API_ENDPOINTS.feedback),
        dataService.fetchPlatformSettings(API_ENDPOINTS.platformSettings),
        dataService.fetchReferrals(API_ENDPOINTS.referrals),
        dataService.fetchCalendarEvents(API_ENDPOINTS.calendarEvents),
        dataService.fetchInvestmentGoals(API_ENDPOINTS.investmentGoals),
        dataService.fetchBets(API_ENDPOINTS.bets),
      ]);
      
      // Post-processing for users to match the nested structure expected by the frontend.
      // This is a temporary measure. Ideally, the API would return the correct structure.
      const processedUsers = (fetchedUsers as any[]).map(dbUser => {
        // Assume profileData fields might be returned flat from a simple SELECT *
        const {
            investedAmount, totalProfitEarned, currentGrossProfit, platformFeePaid, currentNetProfit,
            joinDate, investmentHistory, badges, dashboardWidgetsConfig, contactPhone, address,
            accentPalette, interfaceDensity, cookieConsent,
            ...restOfUser
        } = dbUser;

        // Attempt to parse JSON string fields if they exist
        let parsedPermissions = restOfUser.adminPermissions;
        if(typeof parsedPermissions === 'string') {
            try { parsedPermissions = JSON.parse(parsedPermissions); }
            catch(e) { console.error(`Failed to parse adminPermissions for user ${dbUser.id}`, e); parsedPermissions = {}; }
        }

        return {
            ...restOfUser,
            adminPermissions: parsedPermissions,
            profileData: {
                investedAmount: Number(investedAmount) || 0,
                totalProfitEarned: Number(totalProfitEarned) || 0,
                currentGrossProfit: Number(currentGrossProfit) || 0,
                platformFeePaid: Number(platformFeePaid) || 0,
                currentNetProfit: Number(currentNetProfit) || 0,
                joinDate: joinDate || new Date().toISOString(),
                // These are likely in other tables and won't be in the flat user object.
                // We initialize them as empty arrays to prevent crashes.
                investmentHistory: [], 
                badges: [],
                dashboardWidgetsConfig: [],
                contactPhone: contactPhone,
                address: address,
                accentPalette: accentPalette,
                interfaceDensity: interfaceDensity,
                cookieConsent: cookieConsent,
            }
        } as User;
      });


      setAppData({
        globalStats: fetchedGlobalStats as GlobalStats,
        users: processedUsers,
        transactions: fetchedTransactions as Transaction[],
        dailyHistory: fetchedDailyHistory as DailyHistoryRecord[],
        announcements: fetchedAnnouncements as Announcement[],
        userMessages: fetchedUserMessages as UserMessage[],
        investmentAlerts: fetchedInvestmentAlerts as InvestmentAlert[],
        feedback: fetchedFeedback as FeedbackItem[],
        platformSettings: fetchedPlatformSettings as PlatformSetting[],
        referrals: fetchedReferrals as Referral[],
        calendarEvents: fetchedCalendarEvents as CalendarEvent[],
        investmentGoals: fetchedInvestmentGoals as InvestmentGoal[],
        bets: fetchedBets as Bet[],
      });
      
      if (showNotification) {
        addNotification(UI_TEXT_ROMANIAN.dataRefreshed, NotificationType.SUCCESS);
      }
    } catch (e: any) {
      console.error("Failed to fetch app data from API:", e);
      const errorMessage = `${UI_TEXT_ROMANIAN.fetchDataError} ${e.message || ''}.`;
      setError(errorMessage);
      addNotification(errorMessage, NotificationType.ERROR, 10000);
      setAppData(defaultInitialData as AppData); // Fallback to default data on API failure
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const updateAppData = useCallback((newData: Partial<AppData>) => {
    setAppData((prevData) => {
      if (!prevData) return { ...(defaultInitialData as AppData), ...newData }; 
      return { ...prevData, ...newData };
    });
  }, []);

  const addTransactionInternal = useCallback((transactionInput: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTransaction: Transaction = {
      ...transactionInput,
      id: generateId('txn'),
      timestamp: new Date().toISOString(),
    };
    setAppData(prev => {
      if (!prev) return { ...(defaultInitialData as AppData), transactions: [newTransaction] }; 
      return {
        ...prev,
        transactions: [newTransaction, ...(prev.transactions || [])]
      };
    });
    return newTransaction; 
  }, []);

  const exportData = useCallback(async (dataType: keyof AppData, dataToExportParam?: any) => {
    const dataToUse = dataToExportParam ?? appData?.[dataType];
    if (!dataToUse) {
      addNotification(`${UI_TEXT_ROMANIAN.error}: Nu există date pentru ${dataType} de exportat.`, NotificationType.ERROR);
      return;
    }
    try {
      dataService.exportToJson(dataToUse, `${dataType}.json`);
      addNotification(`${UI_TEXT_ROMANIAN.fileExportedSuccessfully}: ${dataType}.json`, NotificationType.SUCCESS);
      if (!['globalStats', 'users', 'transactions', 'dailyHistory', 'announcements', 'userMessages', 'investmentAlerts', 'feedback', 'platformSettings', 'referrals', 'calendarEvents', 'investmentGoals', 'bets'].includes(dataType)) { 
        addTransactionInternal({
          type: TransactionType.DATA_EXPORT,
          status: TransactionStatus.COMPLETED,
          description: `Datele de tip ${dataType} au fost exportate.`,
        });
      }
    } catch (e) {
      addNotification(`${UI_TEXT_ROMANIAN.failedToExportFile}: ${dataType}.json. Motiv: ${(e as Error).message}`, NotificationType.ERROR);
    }
  }, [appData, addNotification, addTransactionInternal]);
  
  const updateUserAndExport = useCallback(async (updatedUser: User) => {
    let finalUsersList: User[] | undefined;
    setAppData(prev => {
        if (!prev || !prev.users) {
            addNotification("Datele utilizatorilor nu sunt disponibile pentru actualizare.", NotificationType.ERROR);
            return prev;
        }
        finalUsersList = prev.users.map(u => u.id === updatedUser.id ? updatedUser : u);
        return { ...prev, users: finalUsersList };
    });
    
    if (finalUsersList) {
        await exportData('users', finalUsersList);
    }
  }, [setAppData, addNotification, exportData]);

  const exportAllAppData = useCallback(async () => {
    if (!appData) {
      addNotification("Datele aplicației nu sunt încărcate. Exportul complet nu este posibil.", NotificationType.ERROR);
      return;
    }
    const dataKeys = Object.keys(appData) as (keyof AppData)[];
    for (const key of dataKeys) {
        await exportData(key, appData[key]);
    }
    addNotification("Toate fișierele JSON au fost pregătite pentru descărcare!", NotificationType.SUCCESS);
  }, [appData, exportData, addNotification]);

  const importData = async (dataType: keyof AppData, file: File) => {
    try {
      const jsonData = await dataService.importFromJson(file);
      if (jsonData) {
        updateAppData({ [dataType]: jsonData });
        addNotification(`${UI_TEXT_ROMANIAN.fileImportedSuccessfully}: ${file.name} pentru ${dataType}.`, NotificationType.SUCCESS);
         if (!['feedback', 'platformSettings', 'referrals', 'calendarEvents', 'userMessages', 'investmentGoals', 'bets'].includes(dataType)) { 
            addTransactionInternal({
            type: TransactionType.DATA_IMPORT,
            status: TransactionStatus.COMPLETED,
            description: `Datele de tip ${dataType} au fost importate din fișierul ${file.name}.`,
            });
         }
      }
    } catch (e) {
      addNotification(`${UI_TEXT_ROMANIAN.failedToImportFile}: ${file.name}. Motiv: ${(e as Error).message}`, NotificationType.ERROR);
    }
  };

  const updateUserInContext = useCallback((updatedUser: User) => {
    setAppData(prev => {
      if (!prev || !prev.users) return prev; 
      return {
        ...prev,
        users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u)
      };
    });
  }, []);

  const addUserMessage = useCallback((messageData: Omit<UserMessage, 'id' | 'createdAt' | 'isRead'>): UserMessage | null => {
    let finalMessage: UserMessage | null = null;
    setAppData(prev => {
      if (!prev) return null;
       finalMessage = {
        ...messageData,
        id: generateId('usermsg'),
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      const updatedUserMessages = [finalMessage, ...(prev.userMessages || [])];
      return { ...prev, userMessages: updatedUserMessages };
    });
    return finalMessage;
  }, []);

  const sendBulkUserMessages = useCallback(async (userIds: string[], title: string, content: string, adminId: string) => {
    if (!appData || !appData.userMessages || !appData.transactions) {
        addNotification("Datele necesare (mesaje, tranzacții) nu sunt disponibile.", NotificationType.ERROR);
        return;
    }

    const newMessages: UserMessage[] = userIds.map(userId => ({
        id: generateId('usermsg'),
        userId,
        title,
        content,
        createdAt: new Date().toISOString(),
        isRead: false,
        type: UserMessageType.INFO,
    }));

    const newTransaction: Transaction = {
        id: generateId('txn'),
        timestamp: new Date().toISOString(),
        adminId,
        type: TransactionType.BULK_MESSAGE_SENT,
        status: TransactionStatus.COMPLETED,
        description: `Adminul a trimis un mesaj către ${userIds.length} utilizator(i). Titlu: "${title}"`,
        details: {
            recipientCount: userIds.length,
            recipientIds: userIds,
            messageTitle: title,
        }
    };

    const updatedUserMessages = [...newMessages, ...appData.userMessages];
    const updatedTransactions = [newTransaction, ...appData.transactions];

    updateAppData({
        userMessages: updatedUserMessages,
        transactions: updatedTransactions,
    });

    await exportData('userMessages', updatedUserMessages);
    await exportData('transactions', updatedTransactions);

    addNotification(`Mesaj trimis cu succes către ${userIds.length} utilizator(i).`, NotificationType.SUCCESS);
  }, [appData, addNotification, updateAppData, exportData]);

  const awardBadge = useCallback((userId: string, badgeType: BadgeType, details?: string): boolean => {
    let userAwardedNewBadge = false;
    let usersListAfterUpdate: User[] | undefined;

    setAppData(prev => {
      if (!prev || !prev.users) return prev;
      const userIndex = prev.users.findIndex(u => u.id === userId);
      if (userIndex === -1) return prev;

      const userToUpdate = { ...prev.users[userIndex] };
      userToUpdate.profileData = { ...userToUpdate.profileData }; 
      if (!userToUpdate.profileData.badges) {
        userToUpdate.profileData.badges = [];
      }

      if (!userToUpdate.profileData.badges.find(b => b.badgeType === badgeType)) {
        userToUpdate.profileData.badges = [...userToUpdate.profileData.badges, {
          badgeType,
          earnedAt: new Date().toISOString(),
          details,
        }];
        userAwardedNewBadge = true;

        const updatedUsers = [...prev.users];
        updatedUsers[userIndex] = userToUpdate;
        usersListAfterUpdate = updatedUsers; 
        return { ...prev, users: updatedUsers };
      }
      return prev; 
    });

    if (userAwardedNewBadge && usersListAfterUpdate) {
        const badgeDef = BADGE_DEFINITIONS[badgeType];
        addUserMessage({
            userId,
            title: UI_TEXT_ROMANIAN.badgeEarnedNotificationTitle,
            content: UI_TEXT_ROMANIAN.badgeEarnedNotificationContent.replace('{badgeName}', badgeDef.name) + (details ? ` (${details})` : ''),
            type: UserMessageType.BADGE,
            linkTo: '/user/profil',
            relatedBadgeType: badgeType,
        });
        addTransactionInternal({
            userId,
            type: TransactionType.BADGE_EARNED,
            status: TransactionStatus.COMPLETED,
            description: `Utilizatorul a câștigat ecusonul: ${badgeDef.name}.`,
            details: { badgeType, details },
        });
        exportData('users', usersListAfterUpdate); 
    }
    return userAwardedNewBadge; 
  }, [addUserMessage, addTransactionInternal, exportData]);


  const checkAndAwardBadges = useCallback(async (
    userId: string, 
    eventType: 'PROFIT_DISTRIBUTION' | 'INVESTMENT_APPROVAL' | 'USER_LOAD' | 'GOAL_COMPLETED', 
    eventData?: any
  ) => {
    if (!appData) return;
    const user = appData.users.find(u => u.id === userId);
    if (!user || user.role !== Role.USER) return;

    switch (eventType) {
        case 'PROFIT_DISTRIBUTION':
            const userNetProfit = eventData as number;
            if (userNetProfit > 0) {
                awardBadge(userId, BadgeType.FIRST_PROFIT, `Profit: ${formatCurrency(userNetProfit)}`);
            }
            break;
        case 'INVESTMENT_APPROVAL':
            const investmentAmount = eventData as number;
            const totalInvestedAfterApproval = user.profileData.investedAmount;
            if (totalInvestedAfterApproval >= 1000) {
                 awardBadge(userId, BadgeType.MILESTONE_INVESTMENT_1K, `Total investit: ${formatCurrency(totalInvestedAfterApproval)}`);
            }
            if (investmentAmount >= 500) {
                 awardBadge(userId, BadgeType.HIGH_ROLLER_SINGLE_INVESTMENT_500, `Investiție de: ${formatCurrency(investmentAmount)}`);
            }
            break;
        case 'USER_LOAD':
            const accountAgeInMillis = new Date().getTime() - new Date(user.profileData.joinDate).getTime();
            const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
            if (accountAgeInMillis >= thirtyDaysInMillis) {
                 awardBadge(userId, BadgeType.PLATFORM_VETERAN_30_DAYS, `Activ de ${Math.floor(accountAgeInMillis / (24*60*60*1000))} zile`);
            }
            break;
        case 'GOAL_COMPLETED':
            const goalName = eventData as string;
            awardBadge(userId, BadgeType.GOAL_ACHIEVER, `Obiectiv atins: ${goalName}`);
            break;
    }
  }, [appData, awardBadge]);
  
  const checkUserBadgesOnLoad = useCallback(async (userId: string) => {
    await checkAndAwardBadges(userId, 'USER_LOAD');
  }, [checkAndAwardBadges]);


  const addUserInContext = useCallback((newUser: User): User | null => {
    let finalNewUser: User | null = null;
    setAppData(prev => {
      if (!prev || !prev.users) {
        finalNewUser = newUser;
        return { ...(defaultInitialData as AppData), users: [finalNewUser] };
      }
      if (prev.users.find(u => u.id === newUser.id || u.email === newUser.email)) {
        addNotification(`Utilizatorul cu email ${newUser.email} sau ID ${newUser.id} există deja.`, NotificationType.ERROR);
        return prev;
      }
      finalNewUser = newUser; 
      return {
        ...prev,
        users: [...prev.users, finalNewUser]
      };
    });

     if (finalNewUser) { 
        checkUserBadgesOnLoad(finalNewUser.id); 
        if (finalNewUser.role === Role.USER && finalNewUser.profileData.investedAmount > 0) {
            checkAndAwardBadges(finalNewUser.id, 'INVESTMENT_APPROVAL', finalNewUser.profileData.investedAmount);
        }
    }
    return finalNewUser;
  }, [addNotification, checkAndAwardBadges, checkUserBadgesOnLoad]);

  const addAnnouncement = useCallback((announcementData: Omit<Announcement, 'id' | 'createdAt'>): Announcement | null => {
    let finalAnnouncement: Announcement | null = null;
    setAppData(prev => {
        if (!prev) return null;
        finalAnnouncement = {
            ...announcementData,
            id: generateId('announcement'),
            createdAt: new Date().toISOString(),
        };
        const updatedAnnouncements = [finalAnnouncement, ...(prev.announcements || [])];
         addTransactionInternal({
            type: TransactionType.ANNOUNCEMENT_CREATED,
            status: TransactionStatus.COMPLETED,
            adminId: announcementData.createdBy,
            description: `Anunț nou creat: "${announcementData.title}"`,
            details: { initialValues: { title: finalAnnouncement.title, content: finalAnnouncement.content, importance: finalAnnouncement.importance } }
        });
        return { ...prev, announcements: updatedAnnouncements };
    });
    
    if (finalAnnouncement && appData) { 
         exportData('announcements', [finalAnnouncement, ...(appData.announcements || [])]);
    }
    return finalAnnouncement;
  }, [appData, exportData, addTransactionInternal]);

  const updateAnnouncement = useCallback((oldAnnouncement: Announcement, updatedAnnouncementData: Partial<Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>>) => {
    let finalAnnouncements: Announcement[] | undefined;
    const updatedFullAnnouncement: Announcement = {...oldAnnouncement, ...updatedAnnouncementData};

    setAppData(prev => {
        if (!prev || !prev.announcements) return prev;
        finalAnnouncements = (prev.announcements || []).map(ann => 
            ann.id === oldAnnouncement.id ? updatedFullAnnouncement : ann
        );
        return { ...prev, announcements: finalAnnouncements };
    });
    
    if (finalAnnouncements) {
        const changes = generateAuditDetails(
            oldAnnouncement, 
            updatedFullAnnouncement, 
            ['title', 'content', 'importance'],
            { title: "Titlu", content: "Conținut", importance: "Importanță" }
        );
        addTransactionInternal({
            type: TransactionType.ANNOUNCEMENT_UPDATED,
            status: TransactionStatus.COMPLETED,
            adminId: oldAnnouncement.createdBy, 
            description: `Anunț actualizat: "${updatedFullAnnouncement.title}"`,
            details: { announcementId: updatedFullAnnouncement.id, changedFields: changes }
        });
        exportData('announcements', finalAnnouncements);
    }
  }, [exportData, addTransactionInternal]);

  const deleteAnnouncement = useCallback((announcementId: string) => {
    let announcementToDeleteRef: Announcement | undefined;
    let finalAnnouncements: Announcement[] | undefined;

    setAppData(prev => {
        if (!prev || !prev.announcements) return prev;
        announcementToDeleteRef = prev.announcements.find(a => a.id === announcementId);
        finalAnnouncements = (prev.announcements || []).filter(ann => ann.id !== announcementId);
        return { ...prev, announcements: finalAnnouncements };
    });

    if(finalAnnouncements) exportData('announcements', finalAnnouncements);
    if(announcementToDeleteRef){
        addTransactionInternal({
            type: TransactionType.ANNOUNCEMENT_DELETED,
            status: TransactionStatus.COMPLETED,
            adminId: announcementToDeleteRef.createdBy, 
            description: `Anunț șters: "${announcementToDeleteRef.title}"`,
            details: { announcementId, deletedValues: { title: announcementToDeleteRef.title, content: announcementToDeleteRef.content, importance: announcementToDeleteRef.importance } }
        });
    }
  }, [exportData, addTransactionInternal]);


  const markUserMessageAsRead = useCallback((messageId: string, userId: string) => {
    let finalUserMessages: UserMessage[] | undefined;
    setAppData(prev => {
        if (!prev) return prev;
        finalUserMessages = (prev.userMessages || []).map(msg =>
            msg.id === messageId && msg.userId === userId ? { ...msg, isRead: true } : msg
        );
        return { ...prev, userMessages: finalUserMessages };
    });
    if (finalUserMessages) exportData('userMessages', finalUserMessages);
  }, [exportData]);

  const markAllUserMessagesAsRead = useCallback((userId: string) => {
    let finalUserMessages: UserMessage[] | undefined;
    setAppData(prev => {
        if (!prev) return prev;
        finalUserMessages = (prev.userMessages || []).map(msg =>
            msg.userId === userId && !msg.isRead ? { ...msg, isRead: true } : msg
        );
        return { ...prev, userMessages: finalUserMessages };
    });
     if (finalUserMessages) exportData('userMessages', finalUserMessages);
  }, [exportData]);

  const getUnreadMessageCount = useCallback((userId: string): number => {
    if (!appData || !appData.userMessages) return 0;
    return appData.userMessages.filter(msg => msg.userId === userId && !msg.isRead).length;
  }, [appData]);

  const addInvestmentAlert = useCallback((alertData: Omit<InvestmentAlert, 'id' | 'createdAt' | 'lastTriggeredAt'>): InvestmentAlert | null => {
    let finalAlert: InvestmentAlert | null = null;
    setAppData(prev => {
        if (!prev) return null;
        finalAlert = {
            ...alertData,
            id: generateId('alert'),
            createdAt: new Date().toISOString(),
        };
        const updatedAlerts = [finalAlert, ...(prev.investmentAlerts || [])];
        return { ...prev, investmentAlerts: updatedAlerts };
    });
    
    if(finalAlert && appData) exportData('investmentAlerts', [finalAlert, ...(appData.investmentAlerts || [])]);
    if(finalAlert) {
        addTransactionInternal({
            type: TransactionType.USER_ALERT_CREATED,
            status: TransactionStatus.COMPLETED,
            userId: alertData.userId,
            description: `Alertă nouă creată: ${alertData.type} la ${alertData.thresholdValue}.`,
            details: { alertId: finalAlert.id, type: alertData.type, threshold: alertData.thresholdValue, notes: alertData.notes }
        });
    }
    return finalAlert;
  }, [appData, exportData, addTransactionInternal]);

  const updateInvestmentAlert = useCallback((updatedAlert: InvestmentAlert) => {
    let finalAlerts: InvestmentAlert[] | undefined;
    let oldAlert: InvestmentAlert | undefined;

    setAppData(prev => {
        if (!prev || !prev.investmentAlerts) return prev;
        oldAlert = prev.investmentAlerts.find(alert => alert.id === updatedAlert.id);
        finalAlerts = (prev.investmentAlerts || []).map(alert =>
            alert.id === updatedAlert.id ? updatedAlert : alert
        );
        return { ...prev, investmentAlerts: finalAlerts };
    });

    if(finalAlerts && oldAlert) {
        exportData('investmentAlerts', finalAlerts);
        const fieldsToAudit: (keyof InvestmentAlert)[] = ['type', 'thresholdValue', 'isActive', 'notes'];
        const fieldLabels: Record<keyof InvestmentAlert, string> = {
            id: 'ID Alertă',
            userId: 'ID Utilizator',
            type: 'Tip Alertă',
            thresholdValue: 'Valoare Prag',
            referenceInvestedAmount: 'Suma de Referință',
            isActive: 'Activă',
            lastTriggeredAt: 'Ultima Declanșare',
            createdAt: 'Creată La',
            notes: 'Notițe',
        };
        const changedFields = generateAuditDetails(oldAlert, updatedAlert, fieldsToAudit, fieldLabels);

        addTransactionInternal({
            type: TransactionType.USER_ALERT_UPDATED,
            status: TransactionStatus.COMPLETED,
            userId: updatedAlert.userId,
            description: `Alertă actualizată: ${updatedAlert.type} la ${updatedAlert.thresholdValue}.`,
            details: { alertId: updatedAlert.id, changedFields }
        });
    }
  }, [exportData, addTransactionInternal]);

  const deleteInvestmentAlert = useCallback((alertId: string, userId: string) => {
    let alertToDeleteRef: InvestmentAlert | undefined;
    let finalAlerts: InvestmentAlert[] | undefined;
    setAppData(prev => {
        if (!prev) return prev;
        alertToDeleteRef = (prev.investmentAlerts || []).find(alert => alert.id === alertId);
        finalAlerts = (prev.investmentAlerts || []).filter(alert => alert.id !== alertId);
        return { ...prev, investmentAlerts: finalAlerts };
    });
    
    if(finalAlerts) exportData('investmentAlerts', finalAlerts);
    if (alertToDeleteRef) {
        addTransactionInternal({
            type: TransactionType.USER_ALERT_DELETED,
            status: TransactionStatus.COMPLETED,
            userId: userId,
            description: `Alertă ștearsă: ${alertToDeleteRef.type}.`,
            details: { alertId, alertDetails: { type: alertToDeleteRef.type, threshold: alertToDeleteRef.thresholdValue} }
        });
    }
  }, [exportData, addTransactionInternal]);

  const checkAndTriggerInvestmentAlerts = useCallback(async (
    usersForAlertCheck: User[], 
    allAlerts: InvestmentAlert[]
  ): Promise<{ updatedAlerts: InvestmentAlert[], triggeredMessagesCount: number }> => {
    let triggeredMessagesCount = 0;
    const alertsToUpdateLocally: InvestmentAlert[] = []; 

    const now = new Date();
    const oneDayInMillis = 24 * 60 * 60 * 1000;

    for (const user of usersForAlertCheck) {
      if (user.role !== Role.USER || !user.isActive) continue;

      const userAlerts = allAlerts.filter(alert => alert.userId === user.id && alert.isActive);
      if (userAlerts.length === 0) continue;

      const { investedAmount = 0, totalProfitEarned = 0 } = user.profileData;
      const currentInvestmentValue = investedAmount + totalProfitEarned;

      for (const alert of userAlerts) {
        let shouldTrigger = false;
        let alertMessageContent = "";

        if (alert.lastTriggeredAt) {
          const lastTriggerTime = new Date(alert.lastTriggeredAt).getTime();
          if (now.getTime() - lastTriggerTime < oneDayInMillis) {
            continue; 
          }
        }
        
        const refInvestAmount = alert.referenceInvestedAmount !== undefined && alert.referenceInvestedAmount > 0 
                                ? alert.referenceInvestedAmount 
                                : investedAmount > 0 ? investedAmount : 0; 

        switch (alert.type) {
          case InvestmentAlertConditionType.PROFIT_GAIN_PERCENT:
            if (refInvestAmount > 0 && totalProfitEarned > 0) {
              const profitPercentage = (totalProfitEarned / refInvestAmount) * 100;
              if (profitPercentage >= alert.thresholdValue) {
                shouldTrigger = true;
                alertMessageContent = `Profitul tău a atins sau depășit ${alert.thresholdValue}% (este ${profitPercentage.toFixed(2)}%) din investiția de referință ${formatCurrency(refInvestAmount)}. Profit actual: ${formatCurrency(totalProfitEarned)}.`;
              }
            }
            break;
          case InvestmentAlertConditionType.PROFIT_LOSS_PERCENT:
            if (refInvestAmount > 0 && totalProfitEarned < 0) {
              const lossPercentage = (Math.abs(totalProfitEarned) / refInvestAmount) * 100;
              if (lossPercentage >= alert.thresholdValue) {
                shouldTrigger = true;
                alertMessageContent = `Pierderea ta a atins sau depășit ${alert.thresholdValue}% (este ${lossPercentage.toFixed(2)}%) din investiția de referință ${formatCurrency(refInvestAmount)}. Pierdere actuală: ${formatCurrency(totalProfitEarned)}.`;
              }
            }
            break;
          case InvestmentAlertConditionType.INVESTMENT_VALUE_REACHES_ABOVE:
            if (currentInvestmentValue >= alert.thresholdValue) {
              shouldTrigger = true;
              alertMessageContent = `Valoarea investiției tale (${formatCurrency(currentInvestmentValue)}) a atins sau depășit pragul de ${formatCurrency(alert.thresholdValue)}.`;
            }
            break;
          case InvestmentAlertConditionType.INVESTMENT_VALUE_DROPS_BELOW:
            if (currentInvestmentValue <= alert.thresholdValue) {
              shouldTrigger = true;
              alertMessageContent = `Valoarea investiției tale (${formatCurrency(currentInvestmentValue)}) a scăzut sub sau la pragul de ${formatCurrency(alert.thresholdValue)}.`;
            }
            break;
        }

        if (shouldTrigger) {
          addUserMessage({
            userId: user.id,
            title: UI_TEXT_ROMANIAN.alertTriggeredMessageTitle,
            content: alertMessageContent,
            type: UserMessageType.ALERT,
            linkTo: '/user/alerte',
            relatedAlertId: alert.id,
          });
          triggeredMessagesCount++;
          
          const updatedAlert = { ...alert, lastTriggeredAt: now.toISOString() };
          alertsToUpdateLocally.push(updatedAlert); 

          addTransactionInternal({
            type: TransactionType.USER_ALERT_TRIGGERED,
            status: TransactionStatus.COMPLETED,
            userId: user.id,
            description: `Alertă declanșată: ${alert.type} - Prag: ${alert.thresholdValue}. Detaliu: ${alertMessageContent.substring(0, 100)}...`,
            details: { alertId: alert.id, triggeredValue: currentInvestmentValue, profit: totalProfitEarned }
          });
        }
      }
    }
    
    let finalUpdatedAlerts = [...allAlerts];
    if (alertsToUpdateLocally.length > 0) {
        finalUpdatedAlerts = allAlerts.map(originalAlert => {
            const foundUpdated = alertsToUpdateLocally.find(ua => ua.id === originalAlert.id);
            return foundUpdated ? foundUpdated : originalAlert;
        });
        setAppData(prev => ({ ...prev!, investmentAlerts: finalUpdatedAlerts }));
    }

    return { updatedAlerts: finalUpdatedAlerts, triggeredMessagesCount };
  }, [addUserMessage, addTransactionInternal, setAppData]);

  const updateCurrentUserWidgetConfigAndExport = useCallback(async (userId: string, newConfig: DashboardWidgetConfig[]) => {
    let finalUsersList: User[] | undefined;
    setAppData(prev => {
        if (!prev || !prev.users) {
          addNotification("Datele utilizatorilor nu sunt disponibile.", NotificationType.ERROR);
          return prev;
        }
        finalUsersList = prev.users.map(u => 
          u.id === userId 
            ? { ...u, profileData: { ...u.profileData, dashboardWidgetsConfig: newConfig } } 
            : u
        );
        return { ...prev, users: finalUsersList };
    });
    
    if (finalUsersList) {
        addTransactionInternal({
        userId: userId,
        type: TransactionType.USER_DASHBOARD_CONFIG_UPDATED,
        status: TransactionStatus.COMPLETED,
        description: `Configurația dashboard-ului pentru utilizatorul ${userId} a fost actualizată.`,
        });
        await exportData('users', finalUsersList);
        addNotification(UI_TEXT_ROMANIAN.dashboardPreferencesSaved, NotificationType.SUCCESS, 7000);
    }
  }, [setAppData, addTransactionInternal, exportData, addNotification]);

  const addFeedbackItem = useCallback((item: Omit<FeedbackItem, 'id' | 'timestamp' | 'status'>): FeedbackItem | null => {
    let newFeedbackItem: FeedbackItem | null = null;
    setAppData(prev => {
        if(!prev) return null;
        newFeedbackItem = {
            ...item,
            id: generateId('fbk'),
            timestamp: new Date().toISOString(),
            status: FeedbackStatus.NEW,
        };
        const updatedFeedback = [newFeedbackItem, ...(prev.feedback || [])];
        return { ...prev, feedback: updatedFeedback };
    });

    if (newFeedbackItem && appData) {
        exportData('feedback', [newFeedbackItem, ...(appData.feedback || [])]);
        addTransactionInternal({
            userId: item.userId,
            type: TransactionType.FEEDBACK_SUBMITTED,
            status: TransactionStatus.COMPLETED,
            description: `Feedback nou trimis de ${item.userName}: "${item.subject}"`,
            details: { category: item.category }
        });
    }
    return newFeedbackItem;
  }, [appData, exportData, addTransactionInternal]);

  const updateFeedbackStatus = useCallback(async (feedbackId: string, newStatus: FeedbackStatus, adminId: string) => {
    if (!appData?.feedback) return;
    
    let oldStatus: FeedbackStatus | undefined;
    const itemToUpdate = appData.feedback.find(item => item.id === feedbackId);
    if (!itemToUpdate) return;
    oldStatus = itemToUpdate.status;

    if (oldStatus === newStatus) return; // No change

    const updatedFeedbackList = appData.feedback.map(item => 
        item.id === feedbackId ? { ...item, status: newStatus } : item
    );

    updateAppData({ feedback: updatedFeedbackList });

    addTransactionInternal({
        adminId: adminId,
        type: TransactionType.FEEDBACK_STATUS_UPDATED,
        status: TransactionStatus.COMPLETED,
        description: `Statusul feedback-ului #${feedbackId.slice(-6)} a fost schimbat în "${newStatus}".`,
        details: {
            feedbackId,
            changedFields: [{
                fieldName: "Status",
                oldValue: oldStatus,
                newValue: newStatus
            }]
        }
    });

    await exportData('feedback', updatedFeedbackList);
    addNotification(`Statusul feedback-ului a fost actualizat.`, NotificationType.SUCCESS);
  }, [appData?.feedback, updateAppData, addTransactionInternal, exportData, addNotification]);

  const getPlatformSettingValue = useCallback((key: PlatformSettingKey, defaultValue?: string): string => {
    const setting = appData?.platformSettings?.find(s => s.key === key);
    if (setting && setting.value !== undefined) {
      return setting.value;
    }
    if (key === PlatformSettingKey.TELEGRAM_USERNAME) return defaultValue ?? ADMIN_TELEGRAM_USERNAME_FALLBACK;
    if (key === PlatformSettingKey.TELEGRAM_PREDEFINED_MESSAGE) return defaultValue ?? TELEGRAM_PREDEFINED_MESSAGE_FALLBACK;
    if (key === PlatformSettingKey.UI_TEXT_TAGLINE) return defaultValue ?? UI_TEXT_ROMANIAN.tagline;
    if (key === PlatformSettingKey.UI_TEXT_HOMEPAGE_WELCOME_MESSAGE) return defaultValue ?? UI_TEXT_ROMANIAN.homepageWelcomeMessage;
    return defaultValue ?? '';
  }, [appData?.platformSettings]);

  const updatePlatformSettings = useCallback(async (updatedSettings: PlatformSetting[]) => {
    if (!authUser) {
        addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
        return;
    }
    if (!appData?.platformSettings) {
        addNotification("Setările platformei nu sunt disponibile pentru actualizare.", NotificationType.ERROR);
        return;
    }

    const oldSettingsMap = appData.platformSettings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {} as Record<string, string>);

    const newSettingsMap = updatedSettings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {} as Record<string, string>);

    const settingLabels = appData.platformSettings.reduce((acc, s) => {
        acc[s.key] = s.label;
        return acc;
    }, {} as Record<string, string>);


    const changes = generateAuditDetails(
        oldSettingsMap,
        newSettingsMap,
        Object.keys(oldSettingsMap), // Audit all keys
        settingLabels // Use labels for audit
    );

    updateAppData({ platformSettings: updatedSettings });

    if (changes.length > 0) {
        addTransactionInternal({
            adminId: authUser.id,
            type: TransactionType.PLATFORM_SETTINGS_UPDATED,
            status: TransactionStatus.COMPLETED,
            description: `Setările platformei au fost actualizate de ${authUser.name}.`,
            details: { changedFields: changes }
        });
    }

    await exportData('platformSettings', updatedSettings);
    addNotification(UI_TEXT_ROMANIAN.settingsSavedSuccessfully, NotificationType.SUCCESS);
  }, [authUser, appData?.platformSettings, addNotification, updateAppData, addTransactionInternal, exportData]);

  // FIX: Implement updateUserCookieConsent
  const updateUserCookieConsent = useCallback(async (userId: string, consentData: CookieConsentData) => {
    if (!appData?.users) {
        addNotification("Datele utilizatorilor nu sunt disponibile.", NotificationType.ERROR);
        return;
    }

    const userToUpdate = appData.users.find(u => u.id === userId);
    if (!userToUpdate) {
        // This might happen if user logs out before async operation finishes
        console.warn(`updateUserCookieConsent: User with id ${userId} not found.`);
        return;
    }

    const updatedUser: User = {
        ...userToUpdate,
        profileData: {
            ...userToUpdate.profileData,
            cookieConsent: consentData,
        }
    };

    const updatedUsersList = appData.users.map(u => u.id === userId ? updatedUser : u);
    
    updateAppData({ users: updatedUsersList });

    addTransactionInternal({
        userId: userId,
        type: TransactionType.COOKIE_CONSENT_UPDATED,
        status: TransactionStatus.COMPLETED,
        description: `Consimțământul pentru cookie-uri a fost actualizat.`,
        details: { consent: consentData }
    });

    await exportData('users', updatedUsersList);
  }, [appData?.users, addNotification, updateAppData, addTransactionInternal, exportData]);

  const getOrGenerateUserReferralCode = useCallback(async (userId: string): Promise<string> => {
    console.warn("getOrGenerateUserReferralCode is not fully implemented.");
    addNotification('Funcționalitatea nu este complet implementată.', NotificationType.WARNING);
    return `DUMMYCODE_${userId.substring(0, 4)}`;
  }, [addNotification]);

  const linkReferral = useCallback(async (referredUserId: string, referralCode: string, referredUserName: string): Promise<boolean> => {
    console.warn("linkReferral is not fully implemented.");
    addNotification('Funcționalitatea nu este complet implementată.', NotificationType.WARNING);
    return false;
  }, [addNotification]);

  const completeReferral = useCallback(async (referredUserId: string) => {
    console.warn("completeReferral is not fully implemented.");
    addNotification('Funcționalitatea nu este complet implementată.', NotificationType.WARNING);
  }, [addNotification]);

  const addInvestmentGoal = useCallback((goalData: Omit<InvestmentGoal, 'id' | 'startDate' | 'status'> & { userId: string }): InvestmentGoal | null => {
    if (!authUser) return null;
    let newGoal: InvestmentGoal | null = null;
    
    setAppData(prev => {
        if (!prev) return null;
        
        let currentAmountAtCreation = 0;
        const currentUser = prev.users.find(u => u.id === goalData.userId);
        if (currentUser) {
            if (goalData.goalType === GoalType.TARGET_BALANCE) {
                currentAmountAtCreation = (currentUser.profileData.investedAmount || 0) + (currentUser.profileData.totalProfitEarned || 0);
            } else if (goalData.goalType === GoalType.TARGET_PROFIT_TOTAL) {
                currentAmountAtCreation = currentUser.profileData.totalProfitEarned || 0;
            }
        }

        newGoal = {
            ...goalData,
            id: generateId('goal'),
            startDate: new Date().toISOString(),
            status: GoalStatus.ACTIVE,
            currentAmountAtCreation,
        };
        const updatedGoals = [newGoal, ...(prev.investmentGoals || [])];
        return { ...prev, investmentGoals: updatedGoals };
    });

    if (newGoal) {
        exportData('investmentGoals', [newGoal, ...(appData?.investmentGoals || [])]);
        addTransactionInternal({
            userId: authUser.id,
            type: TransactionType.GOAL_CREATED,
            status: TransactionStatus.COMPLETED,
            description: `Obiectiv nou creat: "${newGoal.name}"`,
            details: { goalId: newGoal.id, ...goalData }
        });
        addNotification(UI_TEXT_ROMANIAN.goalCreatedSuccessfully, NotificationType.SUCCESS);
    } else {
         addNotification(UI_TEXT_ROMANIAN.failedToCreateGoal, NotificationType.ERROR);
    }
    return newGoal;
  }, [appData?.investmentGoals, authUser, exportData, addTransactionInternal, addNotification]);

  const updateInvestmentGoal = useCallback((goalId: string, updates: Partial<Omit<InvestmentGoal, 'id' | 'userId' | 'startDate'>>): InvestmentGoal | null => {
    if (!authUser || !appData?.investmentGoals) return null;
    let updatedGoal: InvestmentGoal | null = null;
    let oldGoal: InvestmentGoal | undefined;

    setAppData(prev => {
        if (!prev || !prev.investmentGoals) return prev;
        oldGoal = prev.investmentGoals.find(g => g.id === goalId);
        if (!oldGoal) return prev;
        
        updatedGoal = { ...oldGoal, ...updates };
        const updatedGoals = prev.investmentGoals.map(g => g.id === goalId ? updatedGoal! : g);
        return { ...prev, investmentGoals: updatedGoals };
    });

    if (updatedGoal && oldGoal) {
        exportData('investmentGoals', appData.investmentGoals.map(g => g.id === goalId ? updatedGoal! : g));
        const changes = generateAuditDetails(
            oldGoal, 
            updatedGoal,
            ['name', 'goalType', 'targetAmount', 'targetDate', 'notes'],
            { name: "Nume", goalType: "Tip", targetAmount: "Sumă Țintă", targetDate: "Dată Țintă", notes: "Notițe" }
        );
        addTransactionInternal({
            userId: authUser.id,
            type: TransactionType.GOAL_UPDATED,
            status: TransactionStatus.COMPLETED,
            description: `Obiectivul "${updatedGoal.name}" a fost actualizat.`,
            details: { goalId, changedFields: changes }
        });
        addNotification(UI_TEXT_ROMANIAN.goalUpdatedSuccessfully, NotificationType.SUCCESS);
    } else {
        addNotification(UI_TEXT_ROMANIAN.failedToUpdateGoal, NotificationType.ERROR);
    }
    return updatedGoal;
  }, [authUser, appData?.investmentGoals, exportData, addTransactionInternal, addNotification]);

  const deleteInvestmentGoal = useCallback((goalId: string): boolean => {
    if (!authUser || !appData?.investmentGoals) return false;
    let goalToCancel: InvestmentGoal | undefined;

    let success = false;
    setAppData(prev => {
        if (!prev || !prev.investmentGoals) return prev;
        goalToCancel = prev.investmentGoals.find(g => g.id === goalId);
        if (!goalToCancel || goalToCancel.status !== GoalStatus.ACTIVE) return prev;
        
        const updatedGoals = prev.investmentGoals.map(g => g.id === goalId ? { ...g, status: GoalStatus.CANCELLED } : g);
        success = true;
        return { ...prev, investmentGoals: updatedGoals };
    });

    if (success && goalToCancel) {
        exportData('investmentGoals', appData.investmentGoals.map(g => g.id === goalId ? { ...g, status: GoalStatus.CANCELLED } : g));
        addTransactionInternal({
            userId: authUser.id,
            type: TransactionType.GOAL_CANCELLED,
            status: TransactionStatus.COMPLETED,
            description: `Obiectivul "${goalToCancel.name}" a fost anulat.`,
            details: { goalId }
        });
    }
    return success;
  }, [authUser, appData?.investmentGoals, exportData, addTransactionInternal]);

  const checkAndCompleteGoals = useCallback(async (userId: string) => {
    if (!appData?.users || !appData.investmentGoals) {
      return;
    }

    const user = appData.users.find(u => u.id === userId);
    if (!user) {
      return;
    }

    const activeGoalsForUser = appData.investmentGoals.filter(
      g => g.userId === userId && g.status === GoalStatus.ACTIVE
    );

    if (activeGoalsForUser.length === 0) {
      return;
    }

    let goalsWereCompleted = false;
    const updatedGoalsList = [...appData.investmentGoals]; // Create a mutable copy

    for (const goal of activeGoalsForUser) {
      let currentValue = 0;
      if (goal.goalType === GoalType.TARGET_BALANCE) {
        currentValue = (user.profileData.investedAmount || 0) + (user.profileData.totalProfitEarned || 0);
      } else if (goal.goalType === GoalType.TARGET_PROFIT_TOTAL) {
        currentValue = user.profileData.totalProfitEarned || 0;
      }

      if (currentValue >= goal.targetAmount) {
        goalsWereCompleted = true;
        const goalIndex = updatedGoalsList.findIndex(g => g.id === goal.id);
        if (goalIndex !== -1) {
          const completedGoal: InvestmentGoal = {
            ...goal,
            status: GoalStatus.COMPLETED,
            completedDate: new Date().toISOString(),
          };
          updatedGoalsList[goalIndex] = completedGoal;
          
          addTransactionInternal({
            userId: userId,
            type: TransactionType.GOAL_COMPLETED,
            status: TransactionStatus.COMPLETED,
            description: `Obiectivul "${goal.name}" a fost atins.`,
            details: {
              goalId: goal.id,
              goalName: goal.name,
              targetAmount: goal.targetAmount,
              completedAmount: currentValue,
            },
          });

          addUserMessage({
            userId: userId,
            title: UI_TEXT_ROMANIAN.goalAchieved,
            content: UI_TEXT_ROMANIAN.goalAchievedMessage.replace('{goalName}', goal.name),
            type: UserMessageType.GOAL_ACHIEVED,
            linkTo: '/user/goals',
            relatedGoalId: goal.id,
          });

          checkAndAwardBadges(userId, 'GOAL_COMPLETED', goal.name);
        }
      }
    }

    if (goalsWereCompleted) {
      updateAppData({ investmentGoals: updatedGoalsList });
      await exportData('investmentGoals', updatedGoalsList);
      addNotification("Felicitări! Ai atins unul sau mai multe obiective!", NotificationType.SUCCESS);
    }
  }, [appData, addTransactionInternal, addUserMessage, checkAndAwardBadges, updateAppData, exportData, addNotification]);

  const addBet = useCallback(async (betData: Omit<Bet, 'id' | 'status' | 'processedInDailyHistory' | 'groupId' | 'betType' | 'middleDetails'>): Promise<Bet | null> => {
    if (!authUser || !appData || !appData.bets) {
      addNotification("Eroare: Datele sau permisiunile necesare lipsesc.", NotificationType.ERROR);
      return null;
    }

    const newBet: Bet = {
      ...betData,
      id: generateId('bet'),
      groupId: generateId('grp'), // A single bet still gets a group ID for consistency
      betType: BetType.VALUE,
      status: BetStatus.PENDING,
      processedInDailyHistory: false,
    };

    const updatedBets = [newBet, ...appData.bets];
    updateAppData({ bets: updatedBets });

    addTransactionInternal({
      adminId: authUser.id,
      type: TransactionType.BET_PLACED,
      status: TransactionStatus.COMPLETED,
      description: `Pariu nou (Value) plasat pentru ${betData.event}.`,
      details: {
        betId: newBet.id,
        groupId: newBet.groupId,
        selection: newBet.selection,
        odds: newBet.odds,
        stake: newBet.stake,
      }
    });

    await exportData('bets', updatedBets);
    addNotification("Pariul a fost adăugat cu succes.", NotificationType.SUCCESS);
    return newBet;
  }, [authUser, appData, updateAppData, addTransactionInternal, exportData, addNotification]);

  const addValueMiddlePair = useCallback(async (valueBetData: ValueBetData, middleBetData: MiddleBetData) => {
    if (!authUser || !appData || !appData.bets) {
      addNotification("Eroare: Datele sau permisiunile necesare lipsesc.", NotificationType.ERROR);
      return;
    }

    const groupId = generateId('grp');
    const valueBetId = generateId('bet');
    const middleBetId = generateId('bet');

    const newValueBet: Bet = {
      ...valueBetData,
      id: valueBetId,
      groupId: groupId,
      betType: BetType.VALUE,
      status: BetStatus.PENDING,
      processedInDailyHistory: false,
    };

    const newMiddleBet: Bet = {
      ...middleBetData,
      id: middleBetId,
      groupId: groupId,
      betType: BetType.MIDDLE,
      status: BetStatus.PENDING,
      processedInDailyHistory: false,
    };

    const updatedBets = [newValueBet, newMiddleBet, ...appData.bets];
    updateAppData({ bets: updatedBets });

    addTransactionInternal({
      adminId: authUser.id,
      type: TransactionType.BET_PLACED,
      status: TransactionStatus.COMPLETED,
      description: `Grup nou de pariuri (Value + Middle) plasat pentru ${valueBetData.event}.`,
      details: {
        groupId: groupId,
        valueBet: { selection: newValueBet.selection, odds: newValueBet.odds, stake: newValueBet.stake },
        middleBet: { selection: newMiddleBet.selection, odds: newMiddleBet.odds, stake: newMiddleBet.stake },
      }
    });

    await exportData('bets', updatedBets);
    addNotification("Grupul de pariuri a fost adăugat cu succes.", NotificationType.SUCCESS);
  }, [authUser, appData, updateAppData, addTransactionInternal, exportData, addNotification]);


  const updateBet = useCallback(async (betId: string, updates: Partial<Omit<Bet, 'id'>>) => {
    if (!appData?.bets || !authUser || authUser.role !== Role.ADMIN) {
        addNotification("Datele necesare (sau permisiunile) pentru actualizarea pariului nu sunt disponibile.", NotificationType.ERROR);
        return null;
    }

    const betIndex = appData.bets.findIndex(b => b.id === betId);
    if (betIndex === -1) {
        addNotification(`Pariul cu ID ${betId} nu a fost găsit.`, NotificationType.ERROR);
        return null;
    }

    const oldBet = appData.bets[betIndex];
    const updatedBet: Bet = { ...oldBet, ...updates };

    // Recalculate profit if status, odds, or stake change for a resolved bet.
    // Also handles setting status to PENDING.
    if (updates.status === BetStatus.PENDING) {
      delete updatedBet.profit;
      delete updatedBet.resolvedAt;
    } else {
        const isResolved = updatedBet.status !== BetStatus.PENDING;
        const needsProfitRecalculation = isResolved && (
            (updates.status && updates.status !== oldBet.status) ||
            (updates.odds !== undefined && updates.odds !== oldBet.odds) ||
            (updates.stake !== undefined && updates.stake !== oldBet.stake)
        );

        if (needsProfitRecalculation) {
            switch (updatedBet.status) {
                case BetStatus.WON:
                    updatedBet.profit = updatedBet.stake * (updatedBet.odds - 1);
                    break;
                case BetStatus.LOST:
                    updatedBet.profit = -updatedBet.stake;
                    break;
                case BetStatus.VOID:
                    updatedBet.profit = 0;
                    break;
                case BetStatus.HALF_WON:
                    updatedBet.profit = (updatedBet.stake * (updatedBet.odds - 1)) / 2;
                    break;
                case BetStatus.HALF_LOST:
                    updatedBet.profit = -updatedBet.stake / 2;
                    break;
                default:
                    // Should not happen if isResolved is true and status is not PENDING
                    break;
            }
        }
    }
    
    // Set resolvedAt timestamp if status changes from pending to resolved
    if (oldBet.status === BetStatus.PENDING && updatedBet.status !== BetStatus.PENDING) {
        updatedBet.resolvedAt = new Date().toISOString();
    }
    
    const updatedBets = [...appData.bets];
    updatedBets[betIndex] = updatedBet;

    updateAppData({ bets: updatedBets });

    const changes = generateAuditDetails(
        oldBet,
        updatedBet,
        ['status', 'odds', 'stake', 'notes'], // Fields to audit on update
        { status: 'Status', odds: 'Cotă', stake: 'Miză', notes: 'Notițe' }
    );
    
    if (changes.length > 0) {
        addTransactionInternal({
            adminId: authUser.id,
            type: TransactionType.BET_UPDATED,
            status: TransactionStatus.COMPLETED,
            description: `Pariul "${updatedBet.selection}" pentru ${updatedBet.event} a fost actualizat.`,
            details: {
                betId: updatedBet.id,
                groupId: updatedBet.groupId,
                changedFields: changes,
            }
        });
    }

    await exportData('bets', updatedBets);
    
    addNotification(`Pariul a fost actualizat.`, NotificationType.SUCCESS);

    return updatedBet;

  }, [appData, authUser, updateAppData, addTransactionInternal, exportData, addNotification]);

  const deleteBet = useCallback(async (betId: string): Promise<boolean> => {
    console.warn("deleteBet is not fully implemented.");
    addNotification('Funcționalitatea nu este complet implementată.', NotificationType.WARNING);
    return false;
  }, [addNotification]);

  const deleteBetGroup = useCallback(async (groupId: string) => {
    if (!appData?.bets || !authUser) {
      addNotification("Datele sau permisiunile necesare lipsesc.", NotificationType.ERROR);
      return;
    }

    const betsInGroup = appData.bets.filter(b => b.groupId === groupId);
    if (betsInGroup.length === 0) {
      addNotification("Grupul de pariuri nu a fost găsit.", NotificationType.WARNING);
      return;
    }

    const updatedBets = appData.bets.filter(b => b.groupId !== groupId);

    updateAppData({ bets: updatedBets });

    addTransactionInternal({
      adminId: authUser.id,
      type: TransactionType.BET_DELETED,
      status: TransactionStatus.COMPLETED,
      description: `Grupul de pariuri pentru evenimentul "${betsInGroup[0].event}" a fost șters.`,
      details: {
        groupId: groupId,
        deletedBetsCount: betsInGroup.length,
        deletedValues: betsInGroup.map(b => ({ id: b.id, selection: b.selection, stake: b.stake }))
      }
    });

    await exportData('bets', updatedBets);
    addNotification("Grupul de pariuri a fost șters cu succes.", NotificationType.SUCCESS);
  }, [appData, authUser, updateAppData, addTransactionInternal, exportData, addNotification]);
  
  const resolveDayAndDistribute = useCallback(async (date: string, adminId: string) => {
    if (!appData || !appData.bets || !appData.users || !appData.dailyHistory || !appData.globalStats) {
        addNotification("Datele necesare pentru închiderea zilei lipsesc.", NotificationType.ERROR);
        return;
    }

    const betsToProcess = appData.bets.filter(
        (bet) => bet.date === date && bet.status !== BetStatus.PENDING && !bet.processedInDailyHistory
    );

    if (betsToProcess.length === 0) {
        addNotification(UI_TEXT_ROMANIAN.noUnprocessedBets, NotificationType.INFO);
        return;
    }

    const dailyGrossProfit = betsToProcess.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const turnover = betsToProcess.reduce((sum, bet) => sum + bet.stake, 0);

    const lastHistoryRecord = [...appData.dailyHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const totalBankValueStart = lastHistoryRecord ? lastHistoryRecord.totalBankValueEnd : appData.globalStats.totalInvested;

    const { updatedUsers, totalDistributedNetProfit, totalCollectedFees } = distributeDailyProfit(
        appData.users,
        dailyGrossProfit,
        appData.globalStats.platformFeeRate
    );

    const newHistoryRecord: DailyHistoryRecord = {
        day: (lastHistoryRecord ? lastHistoryRecord.day : 0) + 1,
        date: date,
        dailyGrossProfit,
        turnover,
        numBets: betsToProcess.length,
        totalBankValueStart,
        totalBankValueEnd: totalBankValueStart + dailyGrossProfit,
        notes: "Zi generată automat din pariuri rezolvate.",
        distributedNetProfit: totalDistributedNetProfit,
        collectedFees: totalCollectedFees,
    };

    const updatedBets = appData.bets.map(bet => 
        betsToProcess.some(b => b.id === bet.id) ? { ...bet, processedInDailyHistory: true } : bet
    );
    
    const updatedDailyHistory = [...appData.dailyHistory, newHistoryRecord];
    
    const updatedGlobalStats: GlobalStats = {
        ...appData.globalStats,
        totalProfitDistributed: appData.globalStats.totalProfitDistributed + totalDistributedNetProfit,
        currentTurnover: (appData.globalStats.currentTurnover || 0) + turnover,
        totalBetsPlaced: appData.globalStats.totalBetsPlaced + betsToProcess.length,
        lastProfitUpdateTime: new Date().toISOString(),
    };

    addTransactionInternal({
        adminId,
        type: TransactionType.BETS_RESOLVED,
        status: TransactionStatus.COMPLETED,
        description: `${betsToProcess.length} pariuri pentru data de ${formatDate(date, {day:'numeric', month:'long', year:'numeric'})} au fost procesate. Profit brut: ${formatCurrency(dailyGrossProfit)}.`,
        details: { date, numBets: betsToProcess.length, betIds: betsToProcess.map(b => b.id) },
    });
    
    addTransactionInternal({
        adminId,
        type: TransactionType.PROFIT_DISTRIBUTION,
        status: TransactionStatus.COMPLETED,
        description: `Profit distribuit pentru ${formatDate(date, {day:'numeric', month:'long', year:'numeric'})}. Net: ${formatCurrency(totalDistributedNetProfit)}, Taxe: ${formatCurrency(totalCollectedFees)}.`,
        details: { date, totalDistributedNetProfit, totalCollectedFees },
    });
    
    // Trigger user-specific checks after their profiles have been updated
    for (const u of updatedUsers) {
      if (u.role === Role.USER) {
        const profitForUser = u.profileData.investmentHistory.find(h => h.date === newHistoryRecord.date && h.type === 'PROFIT_PAYOUT');
        if(profitForUser && profitForUser.amount > 0) {
            await checkAndAwardBadges(u.id, 'PROFIT_DISTRIBUTION', profitForUser.amount);
        }
        await checkAndCompleteGoals(u.id);
      }
    }

    if (appData.investmentAlerts.length > 0) {
        await checkAndTriggerInvestmentAlerts(updatedUsers, appData.investmentAlerts);
    }
    
    updateAppData({
        users: updatedUsers,
        dailyHistory: updatedDailyHistory,
        globalStats: updatedGlobalStats,
        bets: updatedBets,
    });
    
    await exportData('users', updatedUsers);
    await exportData('dailyHistory', updatedDailyHistory);
    await exportData('globalStats', updatedGlobalStats);
    await exportData('bets', updatedBets);
    await exportData('transactions', [
        ...appData.transactions, 
    ]);

    addNotification(`Ziua de ${formatDate(date)} a fost închisă și profitul a fost distribuit cu succes!`, NotificationType.SUCCESS, 7000);
  }, [appData, addNotification, updateAppData, addTransactionInternal, exportData, distributeDailyProfit, checkAndAwardBadges, checkAndCompleteGoals, checkAndTriggerInvestmentAlerts]);

  const dataContextValue: DataContextType = {
    appData,
    loading,
    error,
    fetchData,
    updateAppData,
    exportData,
    exportAllAppData,
    importData,
    addTransaction: addTransactionInternal,
    updateUserInContext,
    addUserInContext,
    updateUserAndExport,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addUserMessage,
    sendBulkUserMessages,
    markUserMessageAsRead,
    markAllUserMessagesAsRead,
    getUnreadMessageCount,
    addInvestmentAlert,
    updateInvestmentAlert,
    deleteInvestmentAlert,
    checkAndTriggerInvestmentAlerts,
    updateCurrentUserWidgetConfigAndExport,
    checkUserBadgesOnLoad,
    checkAndAwardBadges,
    addFeedbackItem,
    updateFeedbackStatus,
    getPlatformSettingValue,
    updatePlatformSettings,
    updateUserCookieConsent,
    getOrGenerateUserReferralCode,
    linkReferral,
    completeReferral,
    addInvestmentGoal,
    updateInvestmentGoal,
    deleteInvestmentGoal,
    checkAndCompleteGoals,
    addBet,
    addValueMiddlePair,
    updateBet,
    deleteBet,
    deleteBetGroup,
    resolveDayAndDistribute,
  };

  return (
    <DataContext.Provider value={dataContextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};