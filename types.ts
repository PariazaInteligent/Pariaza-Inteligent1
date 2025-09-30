// All type definitions are now correctly defined and exported from this file.

// Enums
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum AdminPermission {
  CAN_MANAGE_USERS = 'CAN_MANAGE_USERS',
  CAN_VIEW_STATS = 'CAN_VIEW_STATS',
  CAN_MANAGE_DATA = 'CAN_MANAGE_DATA',
  CAN_APPROVE_REQUESTS = 'CAN_APPROVE_REQUESTS',
  CAN_VIEW_SYSTEM_LOG = 'CAN_VIEW_SYSTEM_LOG',
  CAN_MANAGE_ADMIN_PERMISSIONS = 'CAN_MANAGE_ADMIN_PERMISSIONS',
  CAN_USE_GEMINI_ANALYSIS = 'CAN_USE_GEMINI_ANALYSIS',
  CAN_MANAGE_ANNOUNCEMENTS = 'CAN_MANAGE_ANNOUNCEMENTS',
  CAN_VIEW_FEEDBACK = 'CAN_VIEW_FEEDBACK',
  CAN_MANAGE_PLATFORM_SETTINGS = 'CAN_MANAGE_PLATFORM_SETTINGS',
  CAN_MANAGE_CALENDAR_EVENTS = 'CAN_MANAGE_CALENDAR_EVENTS',
  CAN_MANAGE_INVESTMENT_GOALS = 'CAN_MANAGE_INVESTMENT_GOALS',
}

export enum BadgeType {
    FIRST_PROFIT = 'FIRST_PROFIT',
    PLATFORM_VETERAN_30_DAYS = 'PLATFORM_VETERAN_30_DAYS',
    MILESTONE_INVESTMENT_1K = 'MILESTONE_INVESTMENT_1K',
    HIGH_ROLLER_SINGLE_INVESTMENT_500 = 'HIGH_ROLLER_SINGLE_INVESTMENT_500',
    REFERRAL_MADE = 'REFERRAL_MADE',
    WAS_REFERRED = 'WAS_REFERRED',
    GOAL_ACHIEVER = 'GOAL_ACHIEVER',
}

export enum DashboardWidgetType {
    SUMMARY_INVESTED_AMOUNT = 'SUMMARY_INVESTED_AMOUNT',
    SUMMARY_TOTAL_PROFIT = 'SUMMARY_TOTAL_PROFIT',
    SUMMARY_TOTAL_BALANCE = 'SUMMARY_TOTAL_BALANCE',
    SUMMARY_FUND_GROWTH_PERCENTAGE = 'SUMMARY_FUND_GROWTH_PERCENTAGE',
    INVESTMENT_GOALS_OVERVIEW = 'INVESTMENT_GOALS_OVERVIEW',
    PERSONAL_PROFIT_CHART = 'PERSONAL_PROFIT_CHART',
    FUND_GROWTH_CHART = 'FUND_GROWTH_CHART',
    RECENT_TRANSACTIONS = 'RECENT_TRANSACTIONS',
    QUICK_ACTIONS = 'QUICK_ACTIONS',
    FINANCIAL_PROJECTIONS = 'FINANCIAL_PROJECTIONS',
    GEMINI_ADVANCED_ANALYSIS = 'GEMINI_ADVANCED_ANALYSIS',
    GEMINI_LUMEN_INSIGHT = 'GEMINI_LUMEN_INSIGHT',
    COMMUNITY_CHAT = 'COMMUNITY_CHAT',
    PLATFORM_FEE_INFO = 'PLATFORM_FEE_INFO',
    PROFIT_SHARE_INFO = 'PROFIT_SHARE_INFO',
}

export enum PlatformSettingKey {
    TELEGRAM_USERNAME = 'TELEGRAM_USERNAME',
    TELEGRAM_PREDEFINED_MESSAGE = 'TELEGRAM_PREDEFINED_MESSAGE',
    UI_TEXT_TAGLINE = 'UI_TEXT_TAGLINE',
    UI_TEXT_HOMEPAGE_WELCOME_MESSAGE = 'UI_TEXT_HOMEPAGE_WELCOME_MESSAGE',
    GITHUB_URL_GLOBAL_STATS = 'GITHUB_URL_GLOBAL_STATS',
    GITHUB_URL_USERS = 'GITHUB_URL_USERS',
    GITHUB_URL_TRANSACTIONS = 'GITHUB_URL_TRANSACTIONS',
    GITHUB_URL_DAILY_HISTORY = 'GITHUB_URL_DAILY_HISTORY',
    GITHUB_URL_BETS = 'GITHUB_URL_BETS',
    FEATURE_ALLOW_REFERRALS = 'FEATURE_ALLOW_REFERRALS',
    AI_WATCHDOG_STAKE_THRESHOLD_PERCENT = 'AI_WATCHDOG_STAKE_THRESHOLD_PERCENT',
    AI_WATCHDOG_MIDDLE_PROFIT_THRESHOLD_PERCENT = 'AI_WATCHDOG_MIDDLE_PROFIT_THRESHOLD_PERCENT',
}

export enum CalendarEventType {
    SPORT_EVENT = 'SPORT_EVENT',
    MAINTENANCE = 'MAINTENANCE',
    ADMIN_REMINDER = 'ADMIN_REMINDER',
    OTHER = 'OTHER',
}

export enum InterfaceDensity {
    COMFORTABLE = 'COMFORTABLE',
    COMPACT = 'COMPACT',
}

export enum TransactionType {
    INVESTMENT_REQUEST = 'INVESTMENT_REQUEST',
    INVESTMENT_APPROVAL = 'INVESTMENT_APPROVAL',
    INVESTMENT_REJECTION = 'INVESTMENT_REJECTION',
    WITHDRAWAL_REQUEST = 'WITHDRAWAL_REQUEST',
    WITHDRAWAL_APPROVAL = 'WITHDRAWAL_APPROVAL',
    WITHDRAWAL_REJECTION = 'WITHDRAWAL_REJECTION',
    PROFIT_DISTRIBUTION = 'PROFIT_DISTRIBUTION',
    FEE_COLLECTION = 'FEE_COLLECTION',
    DATA_EXPORT = 'DATA_EXPORT',
    DATA_IMPORT = 'DATA_IMPORT',
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_DELETED = 'USER_DELETED',
    ADMIN_ACTION = 'ADMIN_ACTION',
    DAILY_DATA_INPUT = 'DAILY_DATA_INPUT',
    ANNOUNCEMENT_CREATED = 'ANNOUNCEMENT_CREATED',
    ANNOUNCEMENT_UPDATED = 'ANNOUNCEMENT_UPDATED',
    ANNOUNCEMENT_DELETED = 'ANNOUNCEMENT_DELETED',
    USER_ALERT_CREATED = 'USER_ALERT_CREATED',
    USER_ALERT_UPDATED = 'USER_ALERT_UPDATED',
    USER_ALERT_DELETED = 'USER_ALERT_DELETED',
    USER_ALERT_TRIGGERED = 'USER_ALERT_TRIGGERED',
    GEMINI_BET_RISK_ANALYSIS = 'GEMINI_BET_RISK_ANALYSIS',
    USER_DASHBOARD_CONFIG_UPDATED = 'USER_DASHBOARD_CONFIG_UPDATED',
    BADGE_EARNED = 'BADGE_EARNED',
    FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED',
    FEEDBACK_STATUS_UPDATED = 'FEEDBACK_STATUS_UPDATED',
    PLATFORM_SETTINGS_UPDATED = 'PLATFORM_SETTINGS_UPDATED',
    REFERRAL_CODE_GENERATED = 'REFERRAL_CODE_GENERATED',
    REFERRAL_LINKED = 'REFERRAL_LINKED',
    REFERRAL_COMPLETED = 'REFERRAL_COMPLETED',
    CALENDAR_EVENT_CREATED = 'CALENDAR_EVENT_CREATED',
    CALENDAR_EVENT_UPDATED = 'CALENDAR_EVENT_UPDATED',
    CALENDAR_EVENT_DELETED = 'CALENDAR_EVENT_DELETED',
    USER_INTERFACE_PREFERENCES_UPDATED = 'USER_INTERFACE_PREFERENCES_UPDATED',
    COOKIE_CONSENT_UPDATED = 'COOKIE_CONSENT_UPDATED',
    GOAL_CREATED = 'GOAL_CREATED',
    GOAL_UPDATED = 'GOAL_UPDATED',
    GOAL_COMPLETED = 'GOAL_COMPLETED',
    GOAL_CANCELLED = 'GOAL_CANCELLED',
    BET_PLACED = 'BET_PLACED',
    BET_UPDATED = 'BET_UPDATED',
    BET_DELETED = 'BET_DELETED',
    BETS_RESOLVED = 'BETS_RESOLVED',
    BULK_MESSAGE_SENT = 'BULK_MESSAGE_SENT',
}

export enum GoalType {
    TARGET_BALANCE = 'TARGET_BALANCE',
    TARGET_PROFIT_TOTAL = 'TARGET_PROFIT_TOTAL',
}

export enum BetType {
    VALUE = 'VALUE',
    MIDDLE = 'MIDDLE',
}

export enum BetStatus {
    PENDING = 'PENDING',
    WON = 'WON',
    LOST = 'LOST',
    VOID = 'VOID',
    HALF_WON = 'HALF_WON',
    HALF_LOST = 'HALF_LOST',
}

export enum NotificationType {
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    INFO = 'INFO',
    WARNING = 'WARNING',
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED', // for requests
    REJECTED = 'REJECTED', // for requests
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

export enum MessageImportance {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
}

export enum UserMessageType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    ERROR = 'ERROR',
    ALERT = 'ALERT',
    ACTION_REQUIRED = 'ACTION_REQUIRED',
    BADGE = 'BADGE',
    GOAL_ACHIEVED = 'GOAL_ACHIEVED'
}

export enum InvestmentAlertConditionType {
    PROFIT_GAIN_PERCENT = 'PROFIT_GAIN_PERCENT',
    PROFIT_LOSS_PERCENT = 'PROFIT_LOSS_PERCENT',
    INVESTMENT_VALUE_REACHES_ABOVE = 'INVESTMENT_VALUE_REACHES_ABOVE',
    INVESTMENT_VALUE_DROPS_BELOW = 'INVESTMENT_VALUE_DROPS_BELOW',
}

export enum FeedbackCategory {
    BUG_REPORT = 'BUG_REPORT',
    SUGGESTION = 'SUGGESTION',
    GENERAL_FEEDBACK = 'GENERAL_FEEDBACK',
}

export enum ReferralStatus {
    LINKED = 'LINKED', // User has registered with the code
    COMPLETED = 'COMPLETED', // Referred user has made their first investment
}

export enum GoalStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum FeedbackStatus {
    NEW = 'NEW',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
}


// Interfaces & Type Aliases
export type AccentPaletteKey = 'DEFAULT_BLUE' | 'EMERALD_GREEN' | 'INDIGO_PURPLE' | 'ROSE_RED' | 'AMBER_ORANGE';

export interface FAQItem {
    question: string;
    answer: string;
}

export interface GlossaryTermItem {
    term: string;
    explanation: string;
}

export interface AppNotification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

export interface DashboardWidgetConfig {
    id: DashboardWidgetType;
    isVisible: boolean;
    order: number;
}

export interface UserBadge {
    badgeType: BadgeType;
    earnedAt: string; // ISO string date
    details?: string;
}

export interface CookieConsentData {
    preferences: boolean;
    statistics: boolean;
    marketing: boolean;
    timestamp: string; // ISO string date
}


export interface UserProfileData {
    investedAmount: number;
    totalProfitEarned: number;
    currentGrossProfit?: number;
    platformFeePaid?: number;
    currentNetProfit?: number;
    joinDate: string; // ISO string date
    investmentHistory: Array<{
        date: string; // ISO string date
        amount: number;
        type: 'DEPOSIT' | 'WITHDRAWAL' | 'PROFIT_PAYOUT' | 'FEE';
    }>;
    badges: UserBadge[];
    dashboardWidgetsConfig?: DashboardWidgetConfig[];
    contactPhone?: string;
    address?: string;
    accentPalette?: AccentPaletteKey;
    interfaceDensity?: InterfaceDensity;
    cookieConsent?: CookieConsentData;
}

export type AdminPermissionsRecord = {
  [key in AdminPermission]?: boolean;
};


export interface User {
  id: string;
  email: string;
  password?: string; // Should be handled carefully
  role: Role;
  name: string;
  avatar: string;
  isActive: boolean;
  isGlobalAdmin?: boolean;
  adminPermissions?: AdminPermissionsRecord;
  profileData: UserProfileData;
  lastLogin?: string;
}

export interface GlobalStats {
  totalInvested: number;
  totalProfitDistributed: number;
  activeInvestors: number;
  currentTurnover: number;
  totalBetsPlaced: number;
  platformFeeRate: number;
  lastProfitUpdateTime: string; // ISO string date
  achievedBankMilestones: string[];
}

export interface AuditDetail {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

export interface TransactionDetails {
  [key: string]: any;
  changedFields?: AuditDetail[];
  initialValues?: Record<string, any>;
  deletedValues?: Record<string, any>;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO string date
  userId?: string;
  adminId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount?: number;
  description: string;
  details?: TransactionDetails;
}

export interface DailyHistoryRecord {
  day: number;
  date: string; // "YYYY-MM-DD"
  dailyGrossProfit: number;
  turnover: number;
  numBets: number;
  totalBankValueStart: number;
  totalBankValueEnd: number;
  notes?: string;
  distributedNetProfit?: number;
  collectedFees?: number;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string; // ISO string date
    createdBy: string; // Admin user ID
    importance: MessageImportance;
}

export interface UserMessage {
    id: string;
    userId: string;
    title: string;
    content: string;
    createdAt: string; // ISO string date
    isRead: boolean;
    type: UserMessageType;
    linkTo?: string;
    relatedAlertId?: string;
    relatedBadgeType?: BadgeType;
    relatedGoalId?: string;
}

export interface InvestmentAlert {
    id: string;
    userId: string;
    type: InvestmentAlertConditionType;
    thresholdValue: number;
    referenceInvestedAmount?: number; // Only for percentage-based alerts
    isActive: boolean;
    lastTriggeredAt?: string; // ISO string date
    createdAt: string; // ISO string date
    notes?: string;
}

export interface FeedbackItem {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    timestamp: string; // ISO string date
    category: FeedbackCategory;
    subject: string;
    description: string;
    status: FeedbackStatus;
}

export interface PlatformSetting {
    key: PlatformSettingKey;
    value: string;
    label: string;
    description: string;
    type: 'text' | 'textarea' | 'number' | 'boolean';
    isPublic: boolean;
}

export type PlatformSettingsData = PlatformSetting[];

export interface Referral {
    id: string;
    referrerUserId: string;
    referredUserId: string;
    codeUsed: string;
    status: ReferralStatus;
    linkedTimestamp: string; // ISO string date
    completedTimestamp?: string; // ISO string date
    rewardAmount?: number;
}

export interface CalendarEvent {
    id: string;
    date: string; // "YYYY-MM-DD"
    title: string;
    type: CalendarEventType;
    description?: string;
    createdByAdminId: string;
    createdAt: string; // ISO string date
}

export interface InvestmentGoal {
    id: string;
    userId: string;
    name: string;
    goalType: GoalType;
    targetAmount: number;
    startDate: string; // ISO string date
    targetDate?: string; // "YYYY-MM-DD"
    status: GoalStatus;
    notes?: string;
    completedDate?: string; // ISO string date
    currentAmountAtCreation?: number; // Snapshot of relevant value when goal was created
}

export interface Bet {
    id: string;
    groupId: string;
    date: string; // "YYYY-MM-DD" for accounting
    eventTimestamp: string; // ISO string for actual event time
    sport: string;
    league: string;
    event: string;
    market: string;
    selection: string;
    odds: number;
    stake: number;
    betType: BetType;
    status: BetStatus;
    profit?: number;
    createdByAdminId: string;
    resolvedAt?: string; // ISO string date
    processedInDailyHistory: boolean;
    notes?: string;
    middleDetails?: {
        p1: number;
        p2: number;
        pb: number;
    };
}

export interface AppData {
    globalStats: GlobalStats;
    users: User[];
    transactions: Transaction[];
    dailyHistory: DailyHistoryRecord[];
    announcements: Announcement[];
    userMessages: UserMessage[];
    investmentAlerts: InvestmentAlert[];
    feedback: FeedbackItem[];
    platformSettings: PlatformSettingsData;
    referrals: Referral[];
    calendarEvents: CalendarEvent[];
    investmentGoals: InvestmentGoal[];
    bets: Bet[];
}

export interface InvestorCycleReportData {
    cycleYear: number;
    cycleMonth: number;
    investorName: string;
    investorId: string;
    startDate: string;
    endDate: string;
    balanceAtStart: number;
    depositsInCycle: number;
    withdrawalsInCycle: number;
    grossProfitInCycle: number;
    feesPaidInCycle: number;
    netProfitInCycle: number;
    balanceAtEnd: number;
    percentageGrowth: number;
}