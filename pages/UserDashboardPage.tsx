
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Link, HashRouter } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData, DataProvider } from '../contexts/DataContext';
import { useNotifications, NotificationProvider } from '../contexts/NotificationContext';
import { ThemeProvider, useTheme as useAppTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import { UI_TEXT_ROMANIAN, CHART_COLORS, DEFAULT_USER_DASHBOARD_WIDGETS_CONFIG, AVAILABLE_DASHBOARD_WIDGETS, GOAL_TYPE_FRIENDLY_NAMES } from '../constants';
import { formatCurrency, getGreeting, calculatePlatformFeeRate, getFeeTierDescription, formatDate } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';
import { BanknotesIcon, ArrowTrendingUpIcon, UserCircleIcon, InformationCircleIcon, WalletIcon, SparklesIcon, CogIcon, CheckIcon, ArrowPathIcon, ChartPieIcon, DocumentTextIcon, SunIcon, MoonIcon, PresentationChartLineIcon, ChartBarSquareIcon, FlagIcon } from '../components/ui/Icons';
import { Line, Bar } from 'react-chartjs-2';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter';
import { TransactionType, NotificationType, DashboardWidgetType, DashboardWidgetConfig, User, AppData, GoalStatus, InvestmentGoal, GoalType } from '../types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import DraggableWidgetWrapper from '../components/ui/DraggableWidgetWrapper';
import StatsPage from './StatsPage'; // Import StatsPage for PDF generation
// @ts-ignore
import jsPDF from 'jspdf'; // Assuming jspdf is available (e.g. via importmap or global)
// @ts-ignore
import html2canvas from 'html2canvas'; // Assuming html2canvas is available
import SwitchToggle from '../components/ui/SwitchToggle';
import { AuthProvider } from '../contexts/AuthContext';
import LumenAiCard from '../components/ui/LumenAiCard';
import CommunityChatWidget from '../components/ui/CommunityChatWidget';


const getIsoDateString = (date: Date): string => date.toISOString().split('T')[0];

interface ProjectionResults {
  grossProfit: number;
  fee: number;
  netProfit: number;
  finalBalance: number;
}

// Helper object for goal calculations within JSX
const GoalHelper = {
  calculateProgress: (goal: InvestmentGoal, userData: User | null | undefined): { percentage: number; currentValue: number } => {
    if (!userData) return { percentage: 0, currentValue: 0 };
    let currentValue = 0;
    if (goal.goalType === GoalType.TARGET_BALANCE) {
      currentValue = (userData.profileData.investedAmount || 0) + (userData.profileData.totalProfitEarned || 0);
    } else if (goal.goalType === GoalType.TARGET_PROFIT_TOTAL) {
      currentValue = userData.profileData.totalProfitEarned || 0;
    }
    const percentage = goal.targetAmount > 0 ? Math.min(Math.max((currentValue / goal.targetAmount) * 100, 0), 100) : 0;
    return { percentage, currentValue };
  },
};

const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading, updateCurrentUserWidgetConfigAndExport, checkUserBadgesOnLoad, checkAndCompleteGoals } = useData();
  const { addNotification } = useNotifications();
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });

  const [hypotheticalInvestment, setHypotheticalInvestment] = useState<string>('');
  const [projectionScenario, setProjectionScenario] = useState<string>('moderate');
  const [customGrowthRate, setCustomGrowthRate] = useState<string>('');
  const [projectionPeriodDays, setProjectionPeriodDays] = useState<string>('30');
  const [projectionResults, setProjectionResults] = useState<ProjectionResults | null>(null);

  const [geminiAnalysisInvestment, setGeminiAnalysisInvestment] = useState<string>('');
  const [geminiAnalysisPeriod, setGeminiAnalysisPeriod] = useState<string>('30');
  const [geminiUserQuery, setGeminiUserQuery] = useState<string>('');
  const [geminiResponseText, setGeminiResponseText] = useState<string>('');
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [currentWidgetsConfig, setCurrentWidgetsConfig] = useState<DashboardWidgetConfig[]>([]);
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetType | null>(null);
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfTheme, setPdfTheme] = useState<'light' | 'dark'>('dark');

  // Chart customization states for Fund Growth Chart
  const [showFundChartSettings, setShowFundChartSettings] = useState(false);
  const [fundChartShowTotalFundValue, setFundChartShowTotalFundValue] = useState(true);
  const [fundChartShowInvestedAmount, setFundChartShowInvestedAmount] = useState(false);
  const [fundChartShowAccumulatedProfit, setFundChartShowAccumulatedProfit] = useState(false);
  const [fundChartType, setFundChartType] = useState<'line' | 'bar'>('line');

  // Chart customization states for Personal Profit Chart
  const [showPersonalProfitChartSettings, setShowPersonalProfitChartSettings] = useState(false);
  const [personalProfitChartShowProfit, setPersonalProfitChartShowProfit] = useState(true);
  const [personalProfitChartType, setPersonalProfitChartType] = useState<'line' | 'bar'>('line');


  const currentUserData = useMemo(() => appData?.users.find(u => u.id === user?.id), [appData?.users, user?.id]);
  const userActiveGoals = useMemo(() => {
    if (!user || !appData?.investmentGoals) return [];
    return appData.investmentGoals.filter(g => g.userId === user.id && g.status === GoalStatus.ACTIVE)
      .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [appData?.investmentGoals, user]);


  useEffect(() => {
    if (user?.id && currentUserData?.profileData) { // Check if currentUserData is available
      checkAndCompleteGoals(user.id);
    }
  }, [user?.id, currentUserData?.profileData, checkAndCompleteGoals]);


  useEffect(() => {
    const initialInvestmentAmount = currentUserData?.profileData.investedAmount?.toString() || '1000';
    setHypotheticalInvestment(initialInvestmentAmount);
    setGeminiAnalysisInvestment(initialInvestmentAmount);
  }, [currentUserData]);

  useEffect(() => {
    setGeminiAnalysisInvestment(hypotheticalInvestment);
  }, [hypotheticalInvestment]);

  useEffect(() => {
    setGeminiAnalysisPeriod(projectionPeriodDays);
  }, [projectionPeriodDays]);

  useEffect(() => {
    if (currentUserData?.profileData.dashboardWidgetsConfig) {
      const userConfigIds = new Set(currentUserData.profileData.dashboardWidgetsConfig.map(w => w.id));
      const missingWidgets = AVAILABLE_DASHBOARD_WIDGETS
        .filter(widgetId => !userConfigIds.has(widgetId))
        .map((widgetId, index) => ({
          id: widgetId,
          isVisible: true, 
          order: (currentUserData.profileData.dashboardWidgetsConfig?.length || 0) + index + 1000, 
        }));
      
      const mergedConfig = [...currentUserData.profileData.dashboardWidgetsConfig, ...missingWidgets];
      setCurrentWidgetsConfig(mergedConfig.sort((a, b) => a.order - b.order));
    } else {
      setCurrentWidgetsConfig([...DEFAULT_USER_DASHBOARD_WIDGETS_CONFIG].sort((a, b) => a.order - b.order));
    }
  }, [currentUserData?.profileData.dashboardWidgetsConfig]);

   useEffect(() => {
    if (user && currentUserData) { 
      checkUserBadgesOnLoad(user.id);
    }
  }, [user, currentUserData, checkUserBadgesOnLoad]);


  const handleRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const calculateProjection = () => {
    const investmentNum = parseFloat(hypotheticalInvestment);
    const periodNum = parseInt(projectionPeriodDays, 10);
    let dailyGrossROI: number;

    if (isNaN(investmentNum) || investmentNum <= 0 || isNaN(periodNum) || periodNum <= 0) {
      addNotification(UI_TEXT_ROMANIAN.invalidProjectionInput, NotificationType.ERROR);
      return;
    }

    switch (projectionScenario) {
      case 'conservative': dailyGrossROI = 0.0025; break;
      case 'moderate': dailyGrossROI = 0.005; break;
      case 'optimistic': dailyGrossROI = 0.01; break;
      case 'custom':
        const customRateNum = parseFloat(customGrowthRate);
        if (isNaN(customRateNum) || customRateNum < 0) {
          addNotification(UI_TEXT_ROMANIAN.invalidProjectionInput, NotificationType.ERROR);
          return;
        }
        dailyGrossROI = customRateNum / 100;
        break;
      default: dailyGrossROI = 0.005;
    }

    if (!appData?.globalStats) {
        addNotification("Datele globale (rata taxei) nu sunt disponibile pentru proiecție.", NotificationType.ERROR);
        return;
    }
    const platformFeeRate = appData.globalStats.platformFeeRate;

    let totalProjectedGrossProfit = 0;
    let totalProjectedFee = 0;
    let totalProjectedNetProfit = 0;
    let currentSimulatedBalance = investmentNum;

    for (let i = 0; i < periodNum; i++) {
      const dailyGrossProfitEarned = currentSimulatedBalance * dailyGrossROI;
      const dailyFee = dailyGrossProfitEarned > 0 ? dailyGrossProfitEarned * platformFeeRate : 0;
      const dailyNetProfitEarned = dailyGrossProfitEarned - dailyFee;
      
      currentSimulatedBalance += dailyNetProfitEarned;
      totalProjectedGrossProfit += dailyGrossProfitEarned;
      totalProjectedFee += dailyFee;
      totalProjectedNetProfit += dailyNetProfitEarned;
    }
    
    setProjectionResults({
      grossProfit: totalProjectedGrossProfit,
      fee: totalProjectedFee,
      netProfit: totalProjectedNetProfit,
      finalBalance: currentSimulatedBalance,
    });
  };

  const handleGeminiAnalysis = async () => {
    if (!geminiUserQuery.trim() || geminiUserQuery.trim().length < 10) {
      addNotification(UI_TEXT_ROMANIAN.geminiPromptTooShort, NotificationType.WARNING);
      return;
    }
    if (!process.env.API_KEY) {
      addNotification(UI_TEXT_ROMANIAN.geminiApiKeyMissing, NotificationType.ERROR);
      setIsGeminiLoading(false);
      return;
    }
    if (!appData || !appData.globalStats || !appData.dailyHistory || !currentUserData) {
      addNotification("Datele contextuale necesare pentru analiza Gemini nu sunt disponibile.", NotificationType.ERROR);
      return;
    }

    setIsGeminiLoading(true);
    setGeminiResponseText('');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const periodInDaysForHistory = parseInt(geminiAnalysisPeriod, 10) || 30;
    const maxHistoryItemsToSend = 90; 

    const relevantHistoryData = appData.dailyHistory
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
        .slice(0, Math.min(periodInDaysForHistory, maxHistoryItemsToSend)) 
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

    const historySummaryForGemini = relevantHistoryData.map(d => 
        `- Data: ${formatDate(d.date, { day: 'numeric', month: 'short', year: 'numeric' })}, Profit Brut Zilnic: ${formatCurrency(d.dailyGrossProfit)}`
    ).join('\n') || "Nu există istoric relevant pentru perioada selectată.";

    const contextForGemini = `
Context pentru analiză:
- Suma utilizatorului pentru analiză: ${formatCurrency(parseFloat(geminiAnalysisInvestment))} EUR.
- Perioada de analiză specificată de utilizator (pentru context istoric): ${periodInDaysForHistory} zile. Datele istorice furnizate mai jos corespund acestei perioade (sau maxim ${maxHistoryItemsToSend} cele mai recente zile din aceasta).
- Rata curentă a taxei de platformă: ${(appData.globalStats.platformFeeRate * 100).toFixed(2)}%.
- Număr investitori activi: ${appData.globalStats.activeInvestors}.
- Performanța băncii (date istorice selectate):
${historySummaryForGemini}

Întrebarea/Scenariul utilizatorului:
${geminiUserQuery}
`;
    const systemInstructionForGemini = "Ești un analist financiar expert pentru o platformă de investiții. Pe baza datelor de context (suma utilizatorului, perioada de analiză, statistici ale platformei, istoric relevant furnizat) și a întrebării/scenariului specific al utilizatorului, generează o analiză predictivă detaliată. Analiza trebuie să fie în limba română, să evidențieze potențiale rezultate, riscuri implicate, și ipotezele făcute. Dacă utilizatorul specifică un interval de date în întrebarea sa (ex: 'de la 1 iunie'), folosește datele istorice furnizate pentru a te concentra pe acel interval, dacă este acoperit de datele primite. Include un disclaimer proeminent că aceasta este o estimare generată de AI și nu constituie consultanță financiară și nu este o garanție a rezultatelor viitoare.";

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contextForGemini,
        config: {
          systemInstruction: systemInstructionForGemini,
        }
      });
      
      setGeminiResponseText(response.text);
      addNotification("Analiza Gemini a fost generată cu succes.", NotificationType.SUCCESS);

    } catch (error: any) {
      console.error("Gemini API error (User Dashboard):", error);
      let errorMessage = UI_TEXT_ROMANIAN.geminiAnalysisError;
      if (error.message) {
        errorMessage += ` Detaliu: ${error.message}`;
      }
      setGeminiResponseText(errorMessage); 
      addNotification(errorMessage, NotificationType.ERROR);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const handleToggleCustomization = () => setIsCustomizing(prev => !prev);

  const handleSavePreferences = async () => {
    if (user) {
      await updateCurrentUserWidgetConfigAndExport(user.id, currentWidgetsConfig);
      setIsCustomizing(false); 
    }
  };

  const handleResetToDefault = () => {
    setCurrentWidgetsConfig([...DEFAULT_USER_DASHBOARD_WIDGETS_CONFIG].sort((a, b) => a.order - b.order));
    addNotification(UI_TEXT_ROMANIAN.dashboardResetSuccess, NotificationType.INFO);
  };

  const handleWidgetVisibilityToggle = (widgetId: DashboardWidgetType) => {
    setCurrentWidgetsConfig(prevConfig =>
      prevConfig.map(widget =>
        widget.id === widgetId ? { ...widget, isVisible: !widget.isVisible } : widget
      )
    );
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: DashboardWidgetType) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id); 
    e.currentTarget.classList.add('opacity-50', 'ring-2', 'ring-primary-500');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetWidgetId: DashboardWidgetType) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      return;
    }

    const newConfig = [...currentWidgetsConfig];
    const draggedIndex = newConfig.findIndex(w => w.id === draggedWidgetId);
    const targetIndex = newConfig.findIndex(w => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidgetId(null);
      return;
    }
    
    const draggedOrder = newConfig[draggedIndex].order;
    newConfig[draggedIndex].order = newConfig[targetIndex].order;
    newConfig[targetIndex].order = draggedOrder;
    
    setCurrentWidgetsConfig(newConfig.sort((a, b) => a.order - b.order));
    setDraggedWidgetId(null);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'ring-2', 'ring-primary-500');
    setDraggedWidgetId(null);
  };

  const handleGenerateStatsPdf = async () => {
    if (!appData) {
      addNotification("Datele aplicației nu sunt încărcate.", NotificationType.ERROR);
      return;
    }
    setIsGeneratingPdf(true);
    addNotification("Se generează PDF-ul statisticilor...", NotificationType.INFO);

    const offscreenDiv = document.createElement('div');
    offscreenDiv.style.position = 'absolute';
    offscreenDiv.style.left = '-9999px';
    offscreenDiv.style.top = '-9999px';
    offscreenDiv.style.width = '1200px'; 
    offscreenDiv.style.height = 'auto';
    // Background color will be set by html2canvas options
    document.body.appendChild(offscreenDiv);

    const pdfRoot = ReactDOM.createRoot(offscreenDiv);

    // Pass pdfTheme to StatsPage
    pdfRoot.render(
      <React.StrictMode>
        <HashRouter>
          <NotificationProvider>
            <AuthProvider>
              <DataProvider>
                <ThemeProvider forcedTheme={pdfTheme}>
                  <StatsPage forcedDateRange={dateRange} isForPdfMode={true} forcedPdfTheme={pdfTheme} />
                </ThemeProvider>
              </DataProvider>
            </AuthProvider>
          </NotificationProvider>
        </HashRouter>
      </React.StrictMode>
    );
    
    await new Promise(resolve => setTimeout(resolve, 2500)); // Increased delay slightly

    try {
      // @ts-ignore
      const canvas = await html2canvas(offscreenDiv, {
        scale: 2, 
        useCORS: true,
        logging: false, 
        backgroundColor: pdfTheme === 'dark' ? '#0f172a' : '#ffffff', // Tailwind neutral-900 or white
        onclone: (documentClone) => { 
            if (pdfTheme === 'dark') {
                documentClone.documentElement.classList.add('dark');
                documentClone.documentElement.classList.remove('light');
            } else {
                documentClone.documentElement.classList.remove('dark');
                documentClone.documentElement.classList.add('light');
            }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      
      // @ts-ignore
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt', 
        format: [canvas.width, canvas.height] 
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      
      const startDateStr = dateRange.startDate ? formatDate(dateRange.startDate, {year:'numeric',month:'2-digit',day:'2-digit'}) : 'inceput';
      const endDateStr = dateRange.endDate ? formatDate(dateRange.endDate, {year:'numeric',month:'2-digit',day:'2-digit'}) : 'prezent';
      pdf.save(`Statistici_Globale_${startDateStr}_${endDateStr}_(${pdfTheme}).pdf`);
      addNotification("PDF generat cu succes!", NotificationType.SUCCESS);

    } catch (pdfError) {
      console.error("Eroare la generarea PDF-ului:", pdfError);
      addNotification("Eroare la generarea PDF-ului.", NotificationType.ERROR);
    } finally {
      pdfRoot.unmount();
      document.body.removeChild(offscreenDiv);
      setIsGeneratingPdf(false);
    }
  };


  if (dataLoading || !appData || !user || !appData.globalStats || !currentUserData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const { 
    investedAmount: currentGlobalInvested, 
    totalProfitEarned: currentGlobalTotalProfit, 
    currentGrossProfit: liveCurrentGrossProfit, 
    platformFeePaid: livePlatformFeePaid, 
    currentNetProfit: liveCurrentNetProfit, 
    investmentHistory 
  } = currentUserData.profileData;
  
  const activeInvestorsCount = appData.globalStats.activeInvestors;
  const currentLiveFeeRate = calculatePlatformFeeRate(activeInvestorsCount);
  const currentTierDescription = getFeeTierDescription(activeInvestorsCount);

  const periodMetrics = useMemo(() => {
    const isAllTimeSelected = !dateRange.startDate || !dateRange.endDate;

    let investedAtPeriodEnd = 0;
    let profitAtPeriodEnd = 0;

    (investmentHistory || []).forEach(item => {
        const itemDateStr = item.date.split('T')[0];
        if (isAllTimeSelected || itemDateStr <= dateRange.endDate!) {
            if (item.type === 'DEPOSIT') investedAtPeriodEnd += item.amount;
            else if (item.type === 'WITHDRAWAL') investedAtPeriodEnd -= item.amount;
            else if (item.type === 'PROFIT_PAYOUT') profitAtPeriodEnd += item.amount;
            else if (item.type === 'FEE') profitAtPeriodEnd += item.amount;
        }
    });
    
    if (isAllTimeSelected) {
        investedAtPeriodEnd = currentGlobalInvested;
        profitAtPeriodEnd = currentGlobalTotalProfit;
    }
    const balanceAtPeriodEnd = investedAtPeriodEnd + profitAtPeriodEnd;

    let cycleGrossForPeriod = 0;
    let cycleFeeForPeriod = 0;
    let cycleNetForPeriod = 0;

    if (isAllTimeSelected) {
        cycleGrossForPeriod = liveCurrentGrossProfit || 0;
        cycleFeeForPeriod = livePlatformFeePaid || 0;
        cycleNetForPeriod = liveCurrentNetProfit || 0;
    } else {
        (investmentHistory || []).forEach(item => {
            const itemDateStr = item.date.split('T')[0];
            if (itemDateStr >= dateRange.startDate! && itemDateStr <= dateRange.endDate!) {
                if (item.type === 'PROFIT_PAYOUT') cycleNetForPeriod += item.amount;
                else if (item.type === 'FEE') cycleFeeForPeriod += Math.abs(item.amount);
            }
        });
        cycleGrossForPeriod = cycleNetForPeriod + cycleFeeForPeriod;
    }

    let fundValueAtStartOfPeriod = 0;
    if (!isAllTimeSelected && dateRange.startDate) {
        let investedAtStart = 0;
        let profitAtStart = 0;
        (investmentHistory || []).forEach(item => {
            const itemDateStr = item.date.split('T')[0];
            if (itemDateStr < dateRange.startDate!) {
                if (item.type === 'DEPOSIT') investedAtStart += item.amount;
                else if (item.type === 'WITHDRAWAL') investedAtStart -= item.amount;
                else if (item.type === 'PROFIT_PAYOUT') profitAtStart += item.amount;
                else if (item.type === 'FEE') profitAtStart += item.amount;
            }
        });
        fundValueAtStartOfPeriod = investedAtStart + profitAtStart;
    }
    
    let fundGrowthPercentage = 0;
    if (isAllTimeSelected) {
        if (currentGlobalInvested > 0) {
            fundGrowthPercentage = (currentGlobalTotalProfit / currentGlobalInvested) * 100;
        } else if (currentGlobalTotalProfit > 0) {
            fundGrowthPercentage = Infinity;
        }
    } else {
        if (fundValueAtStartOfPeriod > 0) {
            fundGrowthPercentage = ((balanceAtPeriodEnd - fundValueAtStartOfPeriod) / fundValueAtStartOfPeriod) * 100;
        } else if (balanceAtPeriodEnd > 0 && fundValueAtStartOfPeriod === 0) {
            fundGrowthPercentage = Infinity;
        } else if (balanceAtPeriodEnd > fundValueAtStartOfPeriod && fundValueAtStartOfPeriod < 0) {
            fundGrowthPercentage = Infinity; 
        }
    }

    return {
        invested: investedAtPeriodEnd,
        profit: profitAtPeriodEnd,
        balance: balanceAtPeriodEnd,
        cycleGross: cycleGrossForPeriod,
        cycleFee: cycleFeeForPeriod,
        cycleNet: cycleNetForPeriod,
        isAllTime: isAllTimeSelected,
        fundGrowthPercentage: fundGrowthPercentage,
    };

  }, [currentGlobalInvested, currentGlobalTotalProfit, liveCurrentGrossProfit, livePlatformFeePaid, liveCurrentNetProfit, investmentHistory, dateRange.startDate, dateRange.endDate]);


  const filteredInvestmentHistoryForChartLoop = useMemo(() => {
    if (!investmentHistory) return [];
    let sortedFullHistory = [...investmentHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dateRange.startDate && dateRange.endDate) {
      return sortedFullHistory.filter(item => {
        const itemDate = item.date.split('T')[0]; 
        return itemDate >= dateRange.startDate! && itemDate <= dateRange.endDate!;
      });
    }
    return sortedFullHistory; 
  }, [investmentHistory, dateRange.startDate, dateRange.endDate]);


  const profitEvolutionChartData = useMemo(() => {
    const evolutionData: { date: string, profit: number }[] = [];
    const fullSortedHistory = [...(investmentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentRunningProfit = 0;
    const isAllTimeSelected = !dateRange.startDate || !dateRange.endDate;

    if (isAllTimeSelected) {
        if (fullSortedHistory.length > 0) {
            const firstTransactionDate = new Date(fullSortedHistory[0].date);
            const dayBeforeFirstTransaction = new Date(firstTransactionDate);
            dayBeforeFirstTransaction.setDate(firstTransactionDate.getDate() - 1);
            evolutionData.push({ date: getIsoDateString(dayBeforeFirstTransaction), profit: 0 });
        } else {
           evolutionData.push({ date: getIsoDateString(new Date()), profit: 0 });
        }
    } else { 
        let initialProfitForPeriod = 0;
        if (dateRange.startDate) {
            for (const item of fullSortedHistory) {
                if (item.date.split('T')[0] < dateRange.startDate) {
                    if (item.type === 'PROFIT_PAYOUT' || item.type === 'FEE') {
                        initialProfitForPeriod += item.amount;
                    }
                } else {
                    break; 
                }
            }
            evolutionData.push({ date: dateRange.startDate, profit: initialProfitForPeriod });
            currentRunningProfit = initialProfitForPeriod;
        }
    }
    
    filteredInvestmentHistoryForChartLoop.forEach(item => {
      if (item.type === 'PROFIT_PAYOUT' || item.type === 'FEE') {
        currentRunningProfit += item.amount;
      }
      const itemDateForChart = item.date.split('T')[0];
      const lastDataPoint = evolutionData[evolutionData.length - 1];
      if (lastDataPoint && lastDataPoint.date.split('T')[0] === itemDateForChart) {
         lastDataPoint.profit = currentRunningProfit;
      } else {
         evolutionData.push({ date: item.date, profit: currentRunningProfit });
      }
    });

    if (!isAllTimeSelected && dateRange.endDate) {
        const lastDataPoint = evolutionData[evolutionData.length - 1];
        if (lastDataPoint && lastDataPoint.date.split('T')[0] < dateRange.endDate) {
            evolutionData.push({ date: dateRange.endDate, profit: lastDataPoint.profit });
        } else if (evolutionData.length === 0 && dateRange.startDate && new Date(dateRange.startDate) <= new Date(dateRange.endDate) ) {
           evolutionData.push({ date: dateRange.startDate, profit: 0 });
           if(dateRange.startDate !== dateRange.endDate) {
             evolutionData.push({ date: dateRange.endDate, profit: 0 });
           }
        }
    }
    return evolutionData;
  }, [investmentHistory, dateRange.startDate, dateRange.endDate, filteredInvestmentHistoryForChartLoop]);

  const fundValueEvolutionChartData = useMemo(() => {
    const evolutionData: { date: string; value: number; invested: number; profit: number }[] = [];
    const fullSortedHistory = [...(investmentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningInvestedAmount = 0;
    let runningProfit = 0;
    const isAllTimeSelected = !dateRange.startDate || !dateRange.endDate;

    const addDataPoint = (dateStr: string, val: number, inv: number, prof: number) => {
        const lastPoint = evolutionData[evolutionData.length - 1];
        if (lastPoint && lastPoint.date === dateStr) {
            lastPoint.value = val;
            lastPoint.invested = inv;
            lastPoint.profit = prof;
        } else {
            evolutionData.push({ date: dateStr, value: val, invested: inv, profit: prof });
        }
    };
    
    if (isAllTimeSelected) {
        if (fullSortedHistory.length > 0) {
            const firstTransactionDate = new Date(fullSortedHistory[0].date);
            const dayBeforeFirstTransaction = new Date(firstTransactionDate);
            dayBeforeFirstTransaction.setDate(firstTransactionDate.getDate() - 1);
            addDataPoint(getIsoDateString(dayBeforeFirstTransaction), 0, 0, 0);
        } else {
           addDataPoint(getIsoDateString(new Date()), 0, 0, 0);
        }
    } else {
        if (dateRange.startDate) {
            for (const item of fullSortedHistory) {
                if (item.date.split('T')[0] < dateRange.startDate) {
                    if (item.type === 'DEPOSIT') runningInvestedAmount += item.amount;
                    else if (item.type === 'WITHDRAWAL') runningInvestedAmount -= item.amount; 
                    else if (item.type === 'PROFIT_PAYOUT' || item.type === 'FEE') runningProfit += item.amount;
                } else {
                    break;
                }
            }
            addDataPoint(dateRange.startDate, runningInvestedAmount + runningProfit, runningInvestedAmount, runningProfit);
        }
    }

    let currentIteratedInvested = runningInvestedAmount;
    let currentIteratedProfit = runningProfit;

    filteredInvestmentHistoryForChartLoop.forEach(item => {
        if (item.type === 'DEPOSIT') currentIteratedInvested += item.amount;
        else if (item.type === 'WITHDRAWAL') currentIteratedInvested -= item.amount; 
        else if (item.type === 'PROFIT_PAYOUT' || item.type === 'FEE') currentIteratedProfit += item.amount;
        
        const currentFundValue = currentIteratedInvested + currentIteratedProfit;
        const itemDateForChart = item.date.split('T')[0];
        addDataPoint(itemDateForChart, currentFundValue, currentIteratedInvested, currentIteratedProfit);
    });
    
    if (!isAllTimeSelected && dateRange.endDate) {
        const lastDataPoint = evolutionData[evolutionData.length - 1];
        if (lastDataPoint && lastDataPoint.date < dateRange.endDate) { // Ensure we fill up to endDate if no transaction happened
            addDataPoint(dateRange.endDate, lastDataPoint.value, lastDataPoint.invested, lastDataPoint.profit);
        } else if (evolutionData.length === 0 && dateRange.startDate && new Date(dateRange.startDate) <= new Date(dateRange.endDate) ) {
           addDataPoint(dateRange.startDate, 0, 0, 0);
           if(dateRange.startDate !== dateRange.endDate) {
             addDataPoint(dateRange.endDate, 0, 0, 0);
           }
        }
    }
    return evolutionData;
  }, [investmentHistory, dateRange.startDate, dateRange.endDate, filteredInvestmentHistoryForChartLoop]);

  const { theme: appTheme } = useAppTheme(); // Get current app theme
  
  const baseChartOptions = { 
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: false, ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }, grid: { color: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }},
      x: { ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }, grid: { display: false }}
    },
    plugins: { 
      legend: { labels: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }},
      zoom: {
          pan: { enabled: true, mode: 'xy' as const, threshold: 5 },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' as const }
      }
    }
  };

  const widgetComponentMap: Record<DashboardWidgetType, React.ReactNode> = {
    [DashboardWidgetType.SUMMARY_INVESTED_AMOUNT]: (
      <Card title={periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.investedAmount : `${UI_TEXT_ROMANIAN.investedAmount} (Sfârșit Perioadă)`} icon={<BanknotesIcon className="h-8 w-8" />} className="hover:border-primary-500 border-2 border-transparent">
        <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(periodMetrics.invested)}</p>
      </Card>
    ),
    [DashboardWidgetType.SUMMARY_TOTAL_PROFIT]: (
      <Card title={periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.totalProfit : `${UI_TEXT_ROMANIAN.totalProfit} (Sfârșit Perioadă)`} icon={<ArrowTrendingUpIcon className="h-8 w-8" />}>
        <p className="text-3xl font-bold text-green-500">{formatCurrency(periodMetrics.profit)}</p>
        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.currentCycleDetails : `Detalii Perioadă Selectată:`}
          </p>
          {(periodMetrics.cycleGross !== undefined && periodMetrics.cycleGross !== 0) || (periodMetrics.cycleNet !== undefined && periodMetrics.cycleNet !== 0) || (periodMetrics.cycleFee !== undefined && periodMetrics.cycleFee !==0) ? (
            <>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.currentCycleGrossProfitLabel} {formatCurrency(periodMetrics.cycleGross)}</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.currentCycleNetProfitLabel} {formatCurrency(periodMetrics.cycleNet)}</p>
            </>
          ) : (<p className="text-xs text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noCurrentCycleProfit}</p>)}
        </div>
      </Card>
    ),
    [DashboardWidgetType.SUMMARY_TOTAL_BALANCE]: (
      <Card title={periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.totalBalance : `${UI_TEXT_ROMANIAN.totalBalance} (Sfârșit Perioadă)`} icon={<WalletIcon className="h-8 w-8" />} className="hover:border-purple-500 border-2 border-transparent">
        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(periodMetrics.balance)}</p>
      </Card>
    ),
    [DashboardWidgetType.SUMMARY_FUND_GROWTH_PERCENTAGE]: (
      <Card title={UI_TEXT_ROMANIAN.userDashboardFundGrowthPercentageTitle + (periodMetrics.isAllTime ? "" : " (Perioadă)")} icon={<ArrowTrendingUpIcon className="h-8 w-8" />}>
        <p className="text-3xl font-bold text-teal-500 dark:text-teal-400">
          {
            periodMetrics.fundGrowthPercentage === Infinity 
              ? "N/A" 
              : `${periodMetrics.fundGrowthPercentage.toFixed(2)}%`
          }
        </p>
        <div className="mt-3 space-y-2">
            <SwitchToggle
                id="pdfThemeToggle"
                label={`Temă PDF: ${pdfTheme === 'dark' ? 'Întunecat' : 'Luminos'}`}
                checked={pdfTheme === 'dark'}
                onChange={(isChecked) => setPdfTheme(isChecked ? 'dark' : 'light')}
                description="Alege tema pentru PDF-ul generat."
            />
            <Button 
                onClick={handleGenerateStatsPdf} 
                variant="outline" 
                size="sm"
                isLoading={isGeneratingPdf}
                disabled={isGeneratingPdf}
                leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                className="w-full"
            >
                {isGeneratingPdf ? "Se generează..." : "Generează PDF Statistici"}
            </Button>
        </div>
      </Card>
    ),
    [DashboardWidgetType.INVESTMENT_GOALS_OVERVIEW]: (
      <Card title="Obiective Active" icon={<FlagIcon className="h-7 w-7 text-indigo-500" />} className="hover:border-indigo-500 border-2 border-transparent">
        {userActiveGoals.length > 0 ? (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {userActiveGoals.slice(0,3).map(goal => { // Show max 3 goals in overview
                const progress = GoalHelper.calculateProgress(goal, currentUserData);
                return (
                  <div key={goal.id} className="text-sm">
                    <div className="flex justify-between items-center mb-0.5">
                        <Link to="/user/goals" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate" title={goal.name}>
                            {goal.name}
                        </Link>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{progress.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5">
                        <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress.percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {GOAL_TYPE_FRIENDLY_NAMES[goal.goalType]}: {formatCurrency(progress.currentValue)} / {formatCurrency(goal.targetAmount)}
                    </p>
                  </div>
                );
            })}
            {userActiveGoals.length > 3 && (
                <Link to="/user/goals" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline block text-center mt-2">
                    Vezi toate obiectivele ({userActiveGoals.length})
                </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <FlagIcon className="h-8 w-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noGoalsSet}</p>
            <Link to="/user/goals">
                <Button variant="ghost" size="sm" className="mt-2">Setează Obiective</Button>
            </Link>
          </div>
        )}
      </Card>
    ),
    [DashboardWidgetType.PLATFORM_FEE_INFO]: (
      <Card title={periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.platformFee : `Taxă Platformă (Perioadă Selectată)`} icon={<InformationCircleIcon className="h-8 w-8" />}>
        <p className="text-3xl font-bold text-red-500">{formatCurrency(periodMetrics.cycleFee)}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{periodMetrics.isAllTime ? UI_TEXT_ROMANIAN.platformFeePaidCumulativeInfo : `Suma taxelor de platformă plătite în perioada selectată.`}</p>
        <p className="text-sm text-neutral-800 dark:text-neutral-200 mt-3 font-semibold">{UI_TEXT_ROMANIAN.platformFeeLiveRateInfo} <span className="text-primary-600 dark:text-primary-400">{(currentLiveFeeRate * 100).toFixed(2)}%</span>.</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{UI_TEXT_ROMANIAN.platformFeeLiveRateReason.replace('{activeInvestorsCount}', activeInvestorsCount.toString()).replace('{tierDescription}', currentTierDescription)}</p>
      </Card>
    ),
    [DashboardWidgetType.PROFIT_SHARE_INFO]: (
      <Card title={UI_TEXT_ROMANIAN.userProfitShareTitle} icon={<ChartPieIcon className="h-8 w-8 text-indigo-500" />}>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2">
          {UI_TEXT_ROMANIAN.userProfitShareDescription}
        </p>
        <p className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
          {UI_TEXT_ROMANIAN.userProfitShareValueLabel}
        </p>
        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
          {
            appData.globalStats && currentUserData.profileData.investedAmount > 0 && appData.globalStats.totalInvested > 0
              ? `${((currentUserData.profileData.investedAmount / appData.globalStats.totalInvested) * 100).toFixed(2)}%`
              : '0.00%'
          }
        </p>
      </Card>
    ),
    [DashboardWidgetType.PERSONAL_PROFIT_CHART]: (
      <Card title={`${UI_TEXT_ROMANIAN.userDashboardChartTitle} (Perioada Selectată)`} 
        footerContent={
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPersonalProfitChartSettings(!showPersonalProfitChartSettings)}
              leftIcon={<CogIcon className="h-4 w-4"/>}
            >
              {UI_TEXT_ROMANIAN.customizeChartButton}
            </Button>
          </div>
        }
      >
        {showPersonalProfitChartSettings && (
            <div className="p-3 mb-3 border rounded-md bg-neutral-50 dark:bg-neutral-700/30">
                <p className="text-sm font-medium mb-2">{UI_TEXT_ROMANIAN.seriesVisibility}</p>
                <SwitchToggle
                    id="personalProfitShowProfit"
                    label={UI_TEXT_ROMANIAN.userDashboardShowPersonalProfitLabel}
                    checked={personalProfitChartShowProfit}
                    onChange={setPersonalProfitChartShowProfit}
                />
                <p className="text-sm font-medium mt-3 mb-1">{UI_TEXT_ROMANIAN.chartType}</p>
                <div className="flex space-x-3">
                    <Button variant={personalProfitChartType === 'line' ? "secondary" : "outline"} size="sm" onClick={() => setPersonalProfitChartType('line')} leftIcon={<PresentationChartLineIcon className="h-4 w-4"/>}>{UI_TEXT_ROMANIAN.lineChart}</Button>
                    <Button variant={personalProfitChartType === 'bar' ? "secondary" : "outline"} size="sm" onClick={() => setPersonalProfitChartType('bar')} leftIcon={<ChartBarSquareIcon className="h-4 w-4"/>}>{UI_TEXT_ROMANIAN.barChart}</Button>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{UI_TEXT_ROMANIAN.zoomAndPanInfo}</p>
            </div>
        )}
        <div className="h-72 md:h-96">
          {profitEvolutionChartData.length > 0 ? (
            personalProfitChartType === 'line' ? (
                <Line 
                    data={{
                        labels: profitEvolutionChartData.map(d => formatDate(d.date, { month: 'short', day: 'numeric' })), 
                        datasets: [
                            ...(personalProfitChartShowProfit ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardChartLabel, 
                                data: profitEvolutionChartData.map(d => d.profit), 
                                fill: true, 
                                backgroundColor: CHART_COLORS.backgroundColorProfit, 
                                borderColor: CHART_COLORS.borderColorProfit, 
                                tension: 0.1,
                            }] : [])
                        ],
                    }} 
                    options={baseChartOptions} 
                />
            ) : (
                 <Bar
                    data={{
                        labels: profitEvolutionChartData.map(d => formatDate(d.date, { month: 'short', day: 'numeric' })),
                        datasets: [
                            ...(personalProfitChartShowProfit ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardChartLabel,
                                data: profitEvolutionChartData.map(d => d.profit),
                                backgroundColor: CHART_COLORS.backgroundColorProfit,
                                borderColor: CHART_COLORS.borderColorProfit,
                                borderWidth: 1,
                            }] : [])
                        ],
                    }}
                    options={baseChartOptions}
                />
            )
          ) : (<div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable} pentru grafic.</div>)}
        </div>
      </Card>
    ),
    [DashboardWidgetType.FUND_GROWTH_CHART]: (
      <Card title={`${UI_TEXT_ROMANIAN.userDashboardFundGrowthChartTitle} (Perioada Selectată)`}
        footerContent={
          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowFundChartSettings(!showFundChartSettings)}
              leftIcon={<CogIcon className="h-4 w-4"/>}
            >
              {UI_TEXT_ROMANIAN.customizeChartButton}
            </Button>
          </div>
        }
      >
        {showFundChartSettings && (
            <div className="p-3 mb-3 border rounded-md bg-neutral-50 dark:bg-neutral-700/30">
                <p className="text-sm font-medium mb-2">{UI_TEXT_ROMANIAN.seriesVisibility}</p>
                <SwitchToggle id="fundShowTotal" label={UI_TEXT_ROMANIAN.userDashboardShowTotalFundValueLabel} checked={fundChartShowTotalFundValue} onChange={setFundChartShowTotalFundValue} />
                <SwitchToggle id="fundShowInvested" label={UI_TEXT_ROMANIAN.userDashboardShowInvestedAmountLabel} checked={fundChartShowInvestedAmount} onChange={setFundChartShowInvestedAmount} />
                <SwitchToggle id="fundShowProfit" label={UI_TEXT_ROMANIAN.userDashboardShowAccumulatedProfitLabel} checked={fundChartShowAccumulatedProfit} onChange={setFundChartShowAccumulatedProfit} />
                
                <p className="text-sm font-medium mt-3 mb-1">{UI_TEXT_ROMANIAN.chartType}</p>
                <div className="flex space-x-3">
                    <Button variant={fundChartType === 'line' ? "secondary" : "outline"} size="sm" onClick={() => setFundChartType('line')} leftIcon={<PresentationChartLineIcon className="h-4 w-4"/>}>{UI_TEXT_ROMANIAN.lineChart}</Button>
                    <Button variant={fundChartType === 'bar' ? "secondary" : "outline"} size="sm" onClick={() => setFundChartType('bar')} leftIcon={<ChartBarSquareIcon className="h-4 w-4"/>}>{UI_TEXT_ROMANIAN.barChart}</Button>
                </div>
                 <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{UI_TEXT_ROMANIAN.zoomAndPanInfo}</p>
            </div>
        )}
        <div className="h-72 md:h-96">
          {fundValueEvolutionChartData.length > 0 ? (
            fundChartType === 'line' ? (
                <Line 
                    data={{
                        labels: fundValueEvolutionChartData.map(d => formatDate(d.date, { month: 'short', day: 'numeric' })), 
                        datasets: [
                            ...(fundChartShowTotalFundValue ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowTotalFundValueLabel, 
                                data: fundValueEvolutionChartData.map(d => d.value), 
                                fill: true, 
                                backgroundColor: CHART_COLORS.backgroundColorBankValue, 
                                borderColor: CHART_COLORS.borderColorBankValue, 
                                tension: 0.1,
                            }] : []),
                            ...(fundChartShowInvestedAmount ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowInvestedAmountLabel,
                                data: fundValueEvolutionChartData.map(d => d.invested),
                                fill: false,
                                borderColor: CHART_COLORS.borderColorInvestedAmount,
                                tension: 0.1,
                            }] : []),
                            ...(fundChartShowAccumulatedProfit ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowAccumulatedProfitLabel,
                                data: fundValueEvolutionChartData.map(d => d.profit),
                                fill: false,
                                borderColor: CHART_COLORS.borderColorProfit,
                                tension: 0.1,
                            }] : [])
                        ],
                    }} 
                    options={baseChartOptions} 
                />
            ) : (
                 <Bar
                    data={{
                        labels: fundValueEvolutionChartData.map(d => formatDate(d.date, { month: 'short', day: 'numeric' })),
                        datasets: [
                             ...(fundChartShowTotalFundValue ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowTotalFundValueLabel, 
                                data: fundValueEvolutionChartData.map(d => d.value), 
                                backgroundColor: CHART_COLORS.backgroundColorBankValue, 
                                borderColor: CHART_COLORS.borderColorBankValue, 
                                borderWidth: 1,
                            }] : []),
                            ...(fundChartShowInvestedAmount ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowInvestedAmountLabel,
                                data: fundValueEvolutionChartData.map(d => d.invested),
                                backgroundColor: CHART_COLORS.backgroundColorInvestedAmount,
                                borderColor: CHART_COLORS.borderColorInvestedAmount,
                                borderWidth: 1,
                            }] : []),
                            ...(fundChartShowAccumulatedProfit ? [{
                                label: UI_TEXT_ROMANIAN.userDashboardShowAccumulatedProfitLabel,
                                data: fundValueEvolutionChartData.map(d => d.profit),
                                backgroundColor: CHART_COLORS.backgroundColorProfit,
                                borderColor: CHART_COLORS.borderColorProfit,
                                borderWidth: 1,
                            }] : [])
                        ],
                    }}
                    options={baseChartOptions}
                />
            )
          ) : (<div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable} pentru grafic.</div>)}
        </div>
      </Card>
    ),
    [DashboardWidgetType.GEMINI_LUMEN_INSIGHT]: (
      <LumenAiCard />
    ),
    [DashboardWidgetType.COMMUNITY_CHAT]: (
      <CommunityChatWidget />
    ),
    [DashboardWidgetType.FINANCIAL_PROJECTIONS]: (
      <Card title={UI_TEXT_ROMANIAN.financialProjectionsTitle} icon={<SparklesIcon className="h-7 w-7 text-yellow-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input label={UI_TEXT_ROMANIAN.hypotheticalInvestmentLabel} type="number" value={hypotheticalInvestment} onChange={(e) => setHypotheticalInvestment(e.target.value)} placeholder="ex: 1000"/>
          <div>
            <label htmlFor="projectionScenario" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.performanceScenarioLabel}</label>
            <select id="projectionScenario" value={projectionScenario} onChange={(e) => setProjectionScenario(e.target.value)} className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500">
              <option value="conservative">{UI_TEXT_ROMANIAN.scenarioConservative}</option>
              <option value="moderate">{UI_TEXT_ROMANIAN.scenarioModerate}</option>
              <option value="optimistic">{UI_TEXT_ROMANIAN.scenarioOptimistic}</option>
              <option value="custom">{UI_TEXT_ROMANIAN.scenarioCustom}</option>
            </select>
          </div>
          {projectionScenario === 'custom' && (<Input label={UI_TEXT_ROMANIAN.customDailyGrossROILabel} type="number" step="0.01" value={customGrowthRate} onChange={(e) => setCustomGrowthRate(e.target.value)} placeholder="ex: 0.75"/>)}
          <Input label={UI_TEXT_ROMANIAN.projectionPeriodLabel} type="number" value={projectionPeriodDays} onChange={(e) => setProjectionPeriodDays(e.target.value)} placeholder="ex: 30"/>
        </div>
        <Button onClick={calculateProjection} variant="primary" className="mb-4">{UI_TEXT_ROMANIAN.calculateProjectionButton}</Button>
        {projectionResults && (
          <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">{UI_TEXT_ROMANIAN.projectionResultsTitle}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <p><strong>{UI_TEXT_ROMANIAN.projectedGrossProfitLabel}:</strong> <span className="text-green-500">{formatCurrency(projectionResults.grossProfit)}</span></p>
              <p><strong>{UI_TEXT_ROMANIAN.projectedPlatformFeeLabel}:</strong> <span className="text-red-500">{formatCurrency(projectionResults.fee)}</span></p>
              <p><strong>{UI_TEXT_ROMANIAN.projectedNetProfitLabel}:</strong> <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(projectionResults.netProfit)}</span></p>
              <p><strong>{UI_TEXT_ROMANIAN.projectedFinalBalanceLabel}:</strong> <span className="text-purple-600 dark:text-purple-400 font-bold">{formatCurrency(projectionResults.finalBalance)}</span></p>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{UI_TEXT_ROMANIAN.projectionDisclaimer} (Rata curentă: {(appData.globalStats.platformFeeRate * 100).toFixed(2)}%, Investitori: {activeInvestorsCount}, Nivel: {currentTierDescription})</p>
          </div>
        )}
      </Card>
    ),
    [DashboardWidgetType.GEMINI_ADVANCED_ANALYSIS]: (
      <Card title={UI_TEXT_ROMANIAN.geminiAdvancedAnalysisTitle} icon={<SparklesIcon className="h-7 w-7 text-purple-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input label={UI_TEXT_ROMANIAN.geminiAnalysisInvestmentLabel} type="number" value={geminiAnalysisInvestment} onChange={(e) => setGeminiAnalysisInvestment(e.target.value)} placeholder="ex: 1000"/>
          <Input label={UI_TEXT_ROMANIAN.geminiAnalysisPeriodLabel} type="number" value={geminiAnalysisPeriod} onChange={(e) => setGeminiAnalysisPeriod(e.target.value)} placeholder="ex: 90"/>
        </div>
        <Textarea label={UI_TEXT_ROMANIAN.geminiUserQueryLabel} value={geminiUserQuery} onChange={(e) => setGeminiUserQuery(e.target.value)} placeholder={UI_TEXT_ROMANIAN.geminiUserQueryPlaceholder} rows={4} containerClassName="mb-4"/>
        <Button onClick={handleGeminiAnalysis} variant="secondary" className="mb-4" isLoading={isGeminiLoading} disabled={isGeminiLoading}>{UI_TEXT_ROMANIAN.generateGeminiAnalysisButton}</Button>
        {isGeminiLoading && <Spinner className="my-4" />}
        {geminiResponseText && !isGeminiLoading && (
          <div className="mt-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">{UI_TEXT_ROMANIAN.geminiAnalysisResultTitle}</h4>
            <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200 font-sans">{geminiResponseText}</pre>
          </div>
        )}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{UI_TEXT_ROMANIAN.geminiProjectionDisclaimer}</p>
      </Card>
    ),
    [DashboardWidgetType.QUICK_ACTIONS]: (
      <Card title="Acțiuni Rapide">
        <div className="space-y-3">
          <Link to="/user/investitii"><Button variant="primary" className="w-full">{UI_TEXT_ROMANIAN.requestInvestment}</Button></Link>
          <Link to="/user/retrageri"><Button variant="secondary" className="w-full">{UI_TEXT_ROMANIAN.requestWithdrawal}</Button></Link>
          <Link to="/user/profil"><Button variant="outline" className="w-full" leftIcon={<UserCircleIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.editProfile}</Button></Link>
        </div>
      </Card>
    ),
    [DashboardWidgetType.RECENT_TRANSACTIONS]: (
      <Card title="Ultimele Tale Tranzacții (Toată Perioada)" className="md:col-span-2"> 
        {appData.transactions && appData.transactions.filter(t => t.userId === currentUserData.id).length > 0 ? (
          <ul className="space-y-2 text-sm max-h-72 overflow-y-auto">
            {appData.transactions.filter(t => t.userId === currentUserData.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10) 
              .map(tx => {
                let amountColorClass = 'text-neutral-600 dark:text-neutral-300';
                if (tx.amount && tx.amount > 0) {
                  if (tx.type === TransactionType.INVESTMENT_APPROVAL || tx.type === TransactionType.INVESTMENT_REQUEST) amountColorClass = 'text-green-500';
                  else if (tx.type === TransactionType.WITHDRAWAL_APPROVAL || tx.type === TransactionType.WITHDRAWAL_REQUEST) amountColorClass = 'text-red-500';
                } else if (tx.amount && tx.amount < 0) amountColorClass = 'text-red-500'; 
                return (
                  <li key={tx.id} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-100">{tx.description}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Tip: {tx.type} | Status: <span className={`font-semibold ${tx.status === 'PENDING' ? 'text-yellow-500' : tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? 'text-green-500' : tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'text-red-500' :'text-neutral-500'}`}>{tx.status}</span></p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {tx.amount !== undefined && (<p className={`font-semibold ${amountColorClass}`}>{formatCurrency(tx.amount)}</p>)}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(tx.timestamp, {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  </li>);})}
          </ul>
        ) : (<p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>)}
      </Card>
    ),
  };

  return (
    <div className="space-y-6 animate-slide-in-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
          {getGreeting()}, {currentUserData.name}!
        </h1>
        <div className="flex space-x-2">
            <Button 
                onClick={handleToggleCustomization} 
                variant={isCustomizing ? "secondary" : "outline"} 
                leftIcon={isCustomizing ? <CheckIcon className="h-5 w-5"/> : <CogIcon className="h-5 w-5"/>}
                size="sm"
            >
                {isCustomizing ? UI_TEXT_ROMANIAN.save : UI_TEXT_ROMANIAN.customizeDashboard}
            </Button>
            {isCustomizing && (
                 <>
                    <Button onClick={handleSavePreferences} variant="primary" size="sm" leftIcon={<CheckIcon className="h-5 w-5"/>}>
                        {UI_TEXT_ROMANIAN.saveDashboardPreferences}
                    </Button>
                    <Button onClick={handleResetToDefault} variant="ghost" size="sm" leftIcon={<ArrowPathIcon className="h-5 w-5"/>}>
                        {UI_TEXT_ROMANIAN.resetDashboardToDefault}
                    </Button>
                 </>
            )}
        </div>
      </div>
      
      <DateRangeFilter onRangeChange={handleRangeChange} initialRangeType="all" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentWidgetsConfig.map(widgetConfig => (
          <DraggableWidgetWrapper
            key={widgetConfig.id}
            id={widgetConfig.id}
            isCustomizing={isCustomizing}
            isVisible={widgetConfig.isVisible}
            onVisibilityToggle={handleWidgetVisibilityToggle}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`
              ${widgetConfig.id === DashboardWidgetType.PERSONAL_PROFIT_CHART || 
                widgetConfig.id === DashboardWidgetType.FUND_GROWTH_CHART ||
                widgetConfig.id === DashboardWidgetType.FINANCIAL_PROJECTIONS || 
                widgetConfig.id === DashboardWidgetType.GEMINI_ADVANCED_ANALYSIS ||
                widgetConfig.id === DashboardWidgetType.RECENT_TRANSACTIONS ||
                widgetConfig.id === DashboardWidgetType.INVESTMENT_GOALS_OVERVIEW
                ? 'md:col-span-2 lg:col-span-3' : ''} 
              ${widgetConfig.id === DashboardWidgetType.QUICK_ACTIONS && 
                (currentWidgetsConfig.find(w => w.id === DashboardWidgetType.RECENT_TRANSACTIONS)?.isVisible === false || 
                 currentWidgetsConfig.filter(w => w.isVisible).length % 3 === 1 || 
                 currentWidgetsConfig.filter(w => w.isVisible).length % 2 === 1 && window.innerWidth < 1024)
                ? 'md:col-span-2 lg:col-span-3' : ''} 
            `}
          >
            {widgetComponentMap[widgetConfig.id]}
          </DraggableWidgetWrapper>
        ))}
      </div>
    </div>
  );
};

export default UserDashboardPage;
