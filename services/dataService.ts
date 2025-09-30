import { GlobalStats, User, Transaction, DailyHistoryRecord, Announcement, UserMessage, InvestmentAlert, FeedbackItem, PlatformSettingsData, Referral, CalendarEvent, InvestmentGoal, Bet } from '../types'; // Added InvestmentGoal, Bet

// Helper to fetch and parse JSON from a URL
async function fetchJson<T,>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' }); // Ensure fresh data from GitHub
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export const dataService = {
  fetchGlobalStats: (url: string): Promise<GlobalStats> => fetchJson<GlobalStats>(url),
  fetchUsers: (url: string): Promise<User[]> => fetchJson<User[]>(url),
  fetchTransactions: (url: string): Promise<Transaction[]> => fetchJson<Transaction[]>(url),
  fetchDailyHistory: (url: string): Promise<DailyHistoryRecord[]> => fetchJson<DailyHistoryRecord[]>(url),
  fetchAnnouncements: (url: string): Promise<Announcement[]> => fetchJson<Announcement[]>(url),
  fetchUserMessages: (url: string): Promise<UserMessage[]> => fetchJson<UserMessage[]>(url),
  fetchInvestmentAlerts: (url: string): Promise<InvestmentAlert[]> => fetchJson<InvestmentAlert[]>(url),
  fetchFeedback: (url: string): Promise<FeedbackItem[]> => fetchJson<FeedbackItem[]>(url),
  fetchPlatformSettings: (url: string): Promise<PlatformSettingsData> => fetchJson<PlatformSettingsData>(url), 
  fetchReferrals: (url: string): Promise<Referral[]> => fetchJson<Referral[]>(url), 
  fetchCalendarEvents: (url: string): Promise<CalendarEvent[]> => fetchJson<CalendarEvent[]>(url),
  fetchInvestmentGoals: (url: string): Promise<InvestmentGoal[]> => fetchJson<InvestmentGoal[]>(url), // New
  fetchBets: (url: string): Promise<Bet[]> => fetchJson<Bet[]>(url), // New

  exportToJson: (data: any, filename: string): void => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  },

  importFromJson: <T,>(file: File): Promise<T> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (event.target && typeof event.target.result === 'string') {
            const jsonData = JSON.parse(event.target.result);
            resolve(jsonData as T);
          } else {
            reject(new Error('Failed to read file content.'));
          }
        } catch (error) {
          reject(new Error(`Error parsing JSON file: ${(error as Error).message}`));
        }
      };
      reader.onerror = (error) => {
        // Safely access error message from ProgressEvent or provide a generic one
        const message = (error.target as any)?.error?.message || (error as any).message || 'Unknown file reading error';
        reject(new Error(`File reading error: ${message}`));
      };
      reader.readAsText(file);
    });
  },
};
