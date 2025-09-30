import { User, DailyHistoryRecord, Role, UserProfileData, AuditDetail, AdminPermissionsRecord, AdminPermission, CalendarEventType } from '../types'; // Added CalendarEventType
import { AVAILABLE_ADMIN_PERMISSIONS, UI_TEXT_ROMANIAN } from '../constants';

/** Întoarce un Date valid sau null. Acceptă Date/string/number/undefined/null. */
export const asDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isNaN(+value) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(+d) ? null : d;
  }
  return null;
};

/** Formatează sigur data (implicit cu oră, ca înainte). Dacă e invalidă/lipsește -> '—'. */
export const formatDate = (
  value: unknown,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = asDate(value);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  if (!d) return '—';
  return d.toLocaleDateString('ro-RO', options || defaultOptions);
};

/** Formatează sigur data+ora (folosește toLocaleString). */
export const formatDateTimeSafe = (
  value: unknown,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'ro-RO'
): string => {
  const d = asDate(value);
  if (!d) return '—';
  return d.toLocaleString(
    locale,
    options ?? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );
};

export const formatCurrency = (amount: number | undefined, currency: string = 'EUR'): string => {
  if (typeof amount !== 'number' || !isFinite(amount)) return '—';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: currency }).format(amount);
};

/**
 * Calculates the platform fee rate based on the number of active investors.
 * The fee structure is tiered, potentially reaching up to the Romanian VAT rate (19%).
 */
export const calculatePlatformFeeRate = (activeInvestors: number): number => {
  if (activeInvestors < 2) return 0;       // 0% (sub 2 investitori)
  if (activeInvestors <= 5) return 0.01;  // 1% (pentru 2-5 investitori)
  if (activeInvestors <= 10) return 0.015; // 1.5% (pentru 6-10 investitori)
  if (activeInvestors <= 20) return 0.02;  // 2% (pentru 11-20 investitori)
  if (activeInvestors <= 50) return 0.025; // 2.5% (pentru 21-50 investitori)
  if (activeInvestors <= 100) return 0.05; // 5% (pentru 51-100 investitori)
  if (activeInvestors <= 200) return 0.10; // 10% (pentru 101-200 investitori)
  if (activeInvestors <= 500) return 0.15; // 15% (pentru 201-500 investitori)
  return 0.19; // 19% (pentru >500 investitori) - VAT level cap
};

/**
 * Returns a string description of the fee tier based on the number of active investors.
 */
export const getFeeTierDescription = (activeInvestors: number): string => {
  if (activeInvestors < 2) return "sub 2 investitori activi";
  if (activeInvestors <= 5) return "2-5 investitori activi";
  if (activeInvestors <= 10) return "6-10 investitori activi";
  if (activeInvestors <= 20) return "11-20 investitori activi";
  if (activeInvestors <= 50) return "21-50 investitori activi";
  if (activeInvestors <= 100) return "51-100 investitori activi";
  if (activeInvestors <= 200) return "101-200 investitori activi";
  if (activeInvestors <= 500) return "201-500 investitori activi";
  return "peste 500 investitori activi";
};

/**
 * Distributes daily profit (or loss) among active investors.
 * Updates user profiles with gross profit/loss, fee (if applicable), and net profit/loss for the day.
 */
export const distributeDailyProfit = (
  users: User[], 
  dailyGrossProfit: number, 
  globalFeeRate: number
): { updatedUsers: User[], totalDistributedNetProfit: number, totalCollectedFees: number } => {
  
  const activeInvestors = users.filter(u => u.role === Role.USER && (u.profileData.investedAmount || 0) > 0 && u.isActive);
  if (activeInvestors.length === 0) {
    return { updatedUsers: users, totalDistributedNetProfit: 0, totalCollectedFees: 0 };
  }

  const totalInvestedByActive = activeInvestors.reduce((sum, user) => sum + (user.profileData.investedAmount || 0), 0);
  if (totalInvestedByActive === 0) {
    return { updatedUsers: users, totalDistributedNetProfit: 0, totalCollectedFees: 0 };
  }

  let totalDistributedNetProfit = 0;
  let totalCollectedFees = 0;

  const updatedUsersMapped = users.map(user => {
    if (user.role === Role.USER && (user.profileData.investedAmount || 0) > 0 && user.isActive) {
      const userInvestment = user.profileData.investedAmount || 0;
      const userShareOfInvestment = userInvestment / totalInvestedByActive;
      const userGrossProfit = dailyGrossProfit * userShareOfInvestment; // Can be negative

      let platformFeeForUser = 0;
      if (userGrossProfit > 0) { // Apply fees only on positive gross profit
        platformFeeForUser = userGrossProfit * globalFeeRate;
      }
      
      const userNetProfit = userGrossProfit - platformFeeForUser; // Can be negative

      totalDistributedNetProfit += userNetProfit;
      totalCollectedFees += platformFeeForUser; // Will be 0 if userGrossProfit <= 0

      const newHistoryProfitEntry: UserProfileData['investmentHistory'][0] = { 
        date: new Date().toISOString(), 
        amount: userNetProfit, // This will be negative for a loss
        type: 'PROFIT_PAYOUT' 
      };
      const newHistoryFeeEntry: UserProfileData['investmentHistory'][0] = { 
        date: new Date().toISOString(), 
        amount: -platformFeeForUser, // Will be 0 if no fee, or negative if fee paid
        type: 'FEE' 
      };
      
      const updatedInvestmentHistory: UserProfileData['investmentHistory'] = [
          ...(user.profileData.investmentHistory || []),
          newHistoryProfitEntry,
      ];
      // Only add fee entry if a fee was actually calculated
      if (platformFeeForUser > 0) {
          updatedInvestmentHistory.push(newHistoryFeeEntry);
      }

      return {
        ...user,
        profileData: {
          ...user.profileData,
          currentGrossProfit: (user.profileData.currentGrossProfit || 0) + userGrossProfit,
          platformFeePaid: (user.profileData.platformFeePaid || 0) + platformFeeForUser,
          currentNetProfit: (user.profileData.currentNetProfit || 0) + userNetProfit,
          totalProfitEarned: (user.profileData.totalProfitEarned || 0) + userNetProfit, // This will subtract if userNetProfit is negative
          investmentHistory: updatedInvestmentHistory,
        }
      };
    }
    return user;
  });

  return { updatedUsers: updatedUsersMapped, totalDistributedNetProfit, totalCollectedFees };
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bună dimineața";
  if (hour < 18) return "Bună ziua";
  return "Bună seara";
};

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Helper function to generate audit details
export const generateAuditDetails = (
    oldObj: any, 
    newObj: any, 
    fieldsToAudit: string[],
    fieldLabels?: Record<string, string> // Optional labels for fields
): AuditDetail[] => {
    const changes: AuditDetail[] = [];
    const getLabel = (field: string) => fieldLabels?.[field] || field;

    for (const field of fieldsToAudit) {
        const oldValue = oldObj[field];
        const newValue = newObj[field];

        if (field === 'adminPermissions' && typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
            const oldPerms = oldValue as AdminPermissionsRecord;
            const newPerms = newValue as AdminPermissionsRecord;
            const allPermissionKeys = new Set([...Object.keys(oldPerms), ...Object.keys(newPerms)]) as Set<AdminPermission>;
            
            for (const permKey of allPermissionKeys) {
                const permDefinition = AVAILABLE_ADMIN_PERMISSIONS.find(p => p.key === permKey);
                const permLabel = permDefinition ? permDefinition.label : permKey;
                if (oldPerms[permKey] !== newPerms[permKey]) {
                    changes.push({
                        fieldName: `${getLabel('adminPermissions')}: ${permLabel}`,
                        oldValue: oldPerms[permKey] === undefined ? 'Nedefinit' : (oldPerms[permKey] ? UI_TEXT_ROMANIAN.permissionStateActive : UI_TEXT_ROMANIAN.permissionStateInactive),
                        newValue: newPerms[permKey] === undefined ? 'Nedefinit' : (newPerms[permKey] ? UI_TEXT_ROMANIAN.permissionStateActive : UI_TEXT_ROMANIAN.permissionStateInactive)
                    });
                }
            }
        } else if (oldValue !== newValue) {
            changes.push({
                fieldName: getLabel(field),
                oldValue: typeof oldValue === 'boolean' ? (oldValue ? UI_TEXT_ROMANIAN.userIsActive : UI_TEXT_ROMANIAN.userIsInactive) : (oldValue === undefined || oldValue === null ? 'Nespecificat' : oldValue),
                newValue: typeof newValue === 'boolean' ? (newValue ? UI_TEXT_ROMANIAN.userIsActive : UI_TEXT_ROMANIAN.userIsInactive) : (newValue === undefined || newValue === null ? 'Nespecificat' : newValue)
            });
        }
    }
    return changes;
};

// New function ported from the user's source code for Middle bet calculations
export interface MiddleSuggestion {
    feasible: boolean;
    o2min?: number;
    o2?: number;
    s2?: number;
    p1?: number;
    p2?: number;
    pb?: number;
    T?: number;
}

export interface ValueSuggestion {
    feasible: boolean;
    o1min?: number;
    o1?: number;
    s1?: number;
    p1?: number;
    p2?: number;
    pb?: number;
    T?: number;
}


export const calculateMiddleSuggestion = (o1: number, s1: number, rPct: number, buffer: number): MiddleSuggestion => {
    if (!isFinite(o1) || !isFinite(s1) || !isFinite(rPct) || !isFinite(buffer) || o1 <= 1 || s1 <= 0 || rPct < 0) {
        return { feasible: false };
    }
    const r = rPct / 100;
    const T = s1 * r;
    const feasible = r < (o1 - 1);
    if (!feasible) return { feasible: false };

    const o2min = 1 + (s1 + T) / (s1 * (o1 - 1) - T);
    if (!isFinite(o2min) || o2min <= 1) return { feasible: false };

    const o2 = o2min + (buffer || 0);
    const s2_low = (s1 + T) / (o2 - 1);
    const s2_high = s1 * (o1 - 1) - T;
    const s2 = Math.min(Math.max(s2_low, 0), s2_high);

    const { p1, p2, pb } = computeMiddleProfits(o1, s1, o2, s2);

    return { feasible: true, o2min, o2, s2, p1, p2, pb, T };
};

export const calculateValueSuggestion = (o2: number, s2: number, rPct: number, buffer: number): ValueSuggestion => {
    if (!isFinite(o2) || !isFinite(s2) || !isFinite(rPct) || !isFinite(buffer) || o2 <= 1 || s2 <= 0 || rPct < 0) {
        return { feasible: false };
    }
    const r = rPct / 100;
    const T = s2 * r; // Target profit is % of middle stake

    // Feasibility check: s1 must be positive. s2 * (o2 - 1 - r) > 0 => o2 > 1 + r
    const feasible = (o2 - 1) > r;
    if (!feasible) return { feasible: false };
    
    const s1 = s2 * (o2 - 1 - r);
    if (s1 <= 0) return { feasible: false }; // Redundant but safe

    const o1min = 1 + (T + s2) / s1;
    if (!isFinite(o1min) || o1min <= 1) return { feasible: false };

    const o1 = o1min + (buffer || 0);

    const { p1, p2, pb } = computeMiddleProfits(o1, s1, o2, s2);

    return { feasible: true, o1min, o1, s1, p1, p2, pb, T };
};


/** Calculează profituri pentru o pereche Value+Middle. */
export const computeMiddleProfits = (
  o1: number, s1: number, // Value
  o2: number, s2: number  // Middle
) => {
  const p1 = s1 * (o1 - 1) - s2;          // dacă iese P1
  const p2 = s2 * (o2 - 1) - s1;          // dacă iese P2
  const pb = s1 * (o1 - 1) + s2 * (o2 - 1); // dacă ies ambele (middle)
  return { p1, p2, pb };
};

export const timeAgo = (date: string | Date): string => {
  const d = asDate(date);
  if (!d) return 'demult';

  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);

  if (seconds < 2) {
    return 'chiar acum';
  }
  if (seconds < 60) {
    return `acum ${seconds} secunde`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `acum ${minutes} minut${minutes > 1 ? 'e' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `acum ${hours} or${hours > 1 ? 'e' : 'ă'}`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `acum ${days} zi${days > 1 ? 'le' : ''}`;
  }
  
  const months = Math.floor(days / 30.44); // Average month length
  if (months < 12) {
    return `acum ${months} lun${months > 1 ? 'i' : 'ă'}`;
  }

  const years = Math.floor(days / 365.25);
  return `acum ${years} an${years > 1 ? 'i' : ''}`;
};
