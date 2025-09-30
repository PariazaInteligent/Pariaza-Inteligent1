
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client'; // For PDF generation
import { HashRouter } from 'react-router-dom'; // For PDF generation
import { useAuth, AuthProvider } from '../contexts/AuthContext';
import { useData, DataProvider } from '../contexts/DataContext';
import { useNotifications, NotificationProvider } from '../contexts/NotificationContext';
import { ThemeProvider, useTheme as useAppTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import SwitchToggle from '../components/ui/SwitchToggle';
import { UI_TEXT_ROMANIAN, MONTH_NAMES_ROMANIAN } from '../constants';
import { InvestorCycleReportData, NotificationType, TransactionType } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { DocumentChartBarIcon, DocumentTextIcon } from '../components/ui/Icons';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter';

const getInitialDateRange = (): DateRange => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
    };
};


const UserCycleReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();
  const { theme: currentAppTheme } = useAppTheme();

  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange());
  const [reportData, setReportData] = useState<InvestorCycleReportData | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfReportTheme, setPdfReportTheme] = useState<'light' | 'dark'>(currentAppTheme);

  const currentUserData = useMemo(() => {
    if (!user || !appData?.users) return null;
    return appData.users.find(u => u.id === user.id);
  }, [appData?.users, user]);

  useEffect(() => {
    setPdfReportTheme(currentAppTheme);
  }, [currentAppTheme]);
  
  useEffect(() => {
    if (currentUserData && currentUserData.profileData.investmentHistory) {
      generateReportData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserData, dateRange]);
  
  const handleRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const generateReportData = () => {
    if (!currentUserData || !currentUserData.profileData.investmentHistory) {
      setReportData(null);
      return;
    }

    const isAllTime = !dateRange.startDate || !dateRange.endDate;
    if (isAllTime) {
      addNotification("Te rugăm să selectezi un interval de date valid pentru a genera raportul.", NotificationType.INFO);
      setReportData(null);
      return;
    }
    
    const cycleStartDateStr = dateRange.startDate!;
    const cycleEndDateStr = dateRange.endDate!;

    let balanceAtStart = 0;
    let depositsInCycle = 0;
    let withdrawalsInCycle = 0;
    let netProfitInCycle = 0;
    let feesPaidInCycle = 0;

    currentUserData.profileData.investmentHistory.forEach(item => {
      const itemDate = item.date.split('T')[0];

      // Calculate balance at start of cycle
      if (itemDate < cycleStartDateStr) {
        if (item.type === 'DEPOSIT') balanceAtStart += item.amount;
        else if (item.type === 'WITHDRAWAL') balanceAtStart -= item.amount;
        else if (item.type === 'PROFIT_PAYOUT') balanceAtStart += item.amount;
        else if (item.type === 'FEE') balanceAtStart += item.amount; // Fees are negative
      }
      // Calculate metrics within the cycle
      else if (itemDate >= cycleStartDateStr && itemDate <= cycleEndDateStr) {
        if (item.type === 'DEPOSIT') depositsInCycle += item.amount;
        else if (item.type === 'WITHDRAWAL') withdrawalsInCycle += item.amount;
        else if (item.type === 'PROFIT_PAYOUT') netProfitInCycle += item.amount;
        else if (item.type === 'FEE') feesPaidInCycle += Math.abs(item.amount); // Fees are stored negative
      }
    });

    const grossProfitInCycle = netProfitInCycle + feesPaidInCycle;
    const balanceAtEnd = balanceAtStart + depositsInCycle - withdrawalsInCycle + netProfitInCycle;
    
    let percentageGrowth = 0;
    if (balanceAtStart > 0) {
      percentageGrowth = (netProfitInCycle / balanceAtStart) * 100;
    } else if (netProfitInCycle > 0) { // Handle growth from 0 or negative start if profit is made
      percentageGrowth = Infinity; 
    }
    
    const reportStartDate = new Date(cycleStartDateStr);
    setReportData({
      cycleYear: reportStartDate.getFullYear(),
      cycleMonth: reportStartDate.getMonth() + 1,
      investorName: currentUserData.name,
      investorId: currentUserData.id,
      startDate: cycleStartDateStr,
      endDate: cycleEndDateStr,
      balanceAtStart,
      depositsInCycle,
      withdrawalsInCycle,
      grossProfitInCycle,
      feesPaidInCycle,
      netProfitInCycle,
      balanceAtEnd,
      percentageGrowth,
    });
  };
  
  const handleGeneratePdf = async () => {
    if (!reportData) {
      addNotification(UI_TEXT_ROMANIAN.noDataForCycleReport, NotificationType.WARNING);
      return;
    }
    setIsGeneratingPdf(true);
    addNotification(UI_TEXT_ROMANIAN.reportPdfGenerating, NotificationType.INFO);

    const offscreenDiv = document.createElement('div');
    offscreenDiv.style.position = 'absolute';
    offscreenDiv.style.left = '-9999px';
    offscreenDiv.style.top = '-9999px';
    offscreenDiv.style.width = '1000px'; // A4-like width
    offscreenDiv.style.padding = '40px'; // Simulate padding for content within PDF page
    document.body.appendChild(offscreenDiv);

    const pdfRoot = ReactDOM.createRoot(offscreenDiv);

    pdfRoot.render(
      <React.StrictMode>
        <HashRouter>
          <NotificationProvider>
            <AuthProvider>
              <DataProvider>
                <ThemeProvider forcedTheme={pdfReportTheme}>
                  <div className={`pdf-render-area ${pdfReportTheme === 'dark' ? 'dark bg-neutral-900 text-neutral-100' : 'bg-white text-neutral-800'} p-5`}>
                    {renderReportContent(reportData, true, pdfReportTheme)}
                  </div>
                </ThemeProvider>
              </DataProvider>
            </AuthProvider>
          </NotificationProvider>
        </HashRouter>
      </React.StrictMode>
    );

    await new Promise(resolve => setTimeout(resolve, 1500)); // Allow time for rendering

    try {
      // @ts-ignore
      const canvas = await html2canvas(offscreenDiv.querySelector('.pdf-render-area'), { // Target the specific div
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: pdfReportTheme === 'dark' ? '#0f172a' : '#ffffff',
         onclone: (documentClone) => {
            const body = documentClone.body;
            if (pdfReportTheme === 'dark') {
                body.classList.add('dark', 'bg-neutral-900', 'text-neutral-100');
                body.classList.remove('light', 'bg-white', 'text-neutral-800');
            } else {
                body.classList.add('light', 'bg-white', 'text-neutral-800');
                body.classList.remove('dark', 'bg-neutral-900', 'text-neutral-100');
            }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      // @ts-ignore
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min((pdfWidth - 40) / imgProps.width, (pdfHeight - 40) / imgProps.height); // Add margins
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = (pdfHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      pdf.save(`Raport_Performanta_${formatDate(reportData.startDate, {day:'2-digit',month:'2-digit',year:'numeric'})}_${formatDate(reportData.endDate, {day:'2-digit',month:'2-digit',year:'numeric'})}_${reportData.investorName.replace(/\s/g, '_')}_(${pdfReportTheme}).pdf`);
      addNotification(UI_TEXT_ROMANIAN.reportPdfGeneratedSuccess, NotificationType.SUCCESS);
    } catch (pdfError) {
      console.error("Eroare la generarea PDF-ului pentru raportul de ciclu:", pdfError);
      addNotification(UI_TEXT_ROMANIAN.reportPdfGeneratedError, NotificationType.ERROR);
    } finally {
      pdfRoot.unmount();
      document.body.removeChild(offscreenDiv);
      setIsGeneratingPdf(false);
    }
  };

  const renderReportContent = (data: InvestorCycleReportData, forPdf = false, themeForPdf: 'light' | 'dark' = 'light') => {
    const textColor = forPdf ? (themeForPdf === 'dark' ? 'text-neutral-100' : 'text-neutral-800') : 'text-neutral-800 dark:text-neutral-100';
    const lightTextColor = forPdf ? (themeForPdf === 'dark' ? 'text-neutral-300' : 'text-neutral-600') : 'text-neutral-600 dark:text-neutral-300';
    const strongTextColor = forPdf ? (themeForPdf === 'dark' ? 'text-primary-400' : 'text-primary-600') : 'text-primary-600 dark:text-primary-400';
    const valuePositiveColor = forPdf ? (themeForPdf === 'dark' ? 'text-green-400' : 'text-green-600') : 'text-green-500';
    const valueNegativeColor = forPdf ? (themeForPdf === 'dark' ? 'text-red-400' : 'text-red-600') : 'text-red-500';
    const cardBg = forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-800' : 'bg-white') : 'bg-white dark:bg-neutral-800';

    return (
      <div className={`${forPdf ? `p-4 ${cardBg}` : ''}`}>
        <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>
          Raport de Performanță
        </h2>
        <p className={`text-sm mb-4 ${lightTextColor}`}>{UI_TEXT_ROMANIAN.reportPeriod} {formatDate(data.startDate)} - {formatDate(data.endDate)}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.balanceAtCycleStart}</span>
                <p className={`font-semibold text-lg ${textColor}`}>{formatCurrency(data.balanceAtStart)}</p>
            </div>
            <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.balanceAtCycleEnd}</span>
                <p className={`font-semibold text-lg ${strongTextColor}`}>{formatCurrency(data.balanceAtEnd)}</p>
            </div>
             <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.depositsInCycle}</span>
                <p className={`font-semibold ${valuePositiveColor}`}>{formatCurrency(data.depositsInCycle)}</p>
            </div>
            <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.withdrawalsInCycle}</span>
                <p className={`font-semibold ${valueNegativeColor}`}>{formatCurrency(data.withdrawalsInCycle)}</p>
            </div>
            <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.grossProfitInCycle}</span>
                <p className={`font-semibold ${data.grossProfitInCycle >= 0 ? valuePositiveColor : valueNegativeColor}`}>{formatCurrency(data.grossProfitInCycle)}</p>
            </div>
            <div className={`p-3 rounded-md ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.feesPaidInCycle}</span>
                <p className={`font-semibold ${valueNegativeColor}`}>{formatCurrency(data.feesPaidInCycle)}</p>
            </div>
            <div className={`p-3 rounded-md md:col-span-2 ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.netProfitInCycle}</span>
                <p className={`font-semibold text-xl ${data.netProfitInCycle >= 0 ? valuePositiveColor : valueNegativeColor}`}>{formatCurrency(data.netProfitInCycle)}</p>
            </div>
            <div className={`p-3 rounded-md md:col-span-2 ${forPdf ? (themeForPdf === 'dark' ? 'bg-neutral-700' : 'bg-neutral-50') : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                <span className={`${lightTextColor}`}>{UI_TEXT_ROMANIAN.percentageGrowthInCycle}</span>
                <p className={`font-semibold text-xl ${data.percentageGrowth >= 0 ? valuePositiveColor : valueNegativeColor}`}>
                    {data.percentageGrowth === Infinity ? "N/A (Balanță inițială zero)" : `${data.percentageGrowth.toFixed(2)}%`}
                </p>
            </div>
        </div>
      </div>
    );
  };

  if (dataLoading || !currentUserData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <DocumentChartBarIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.userCycleReportsTitle}
      </h1>

      <DateRangeFilter onRangeChange={handleRangeChange} initialRangeType="last30days" />

      {reportData ? (
        <Card>
          {renderReportContent(reportData, false, currentAppTheme)}
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
            <SwitchToggle
                id="pdfReportThemeToggle"
                label={`Temă PDF Raport: ${pdfReportTheme === 'dark' ? 'Întunecat' : 'Luminos'}`}
                checked={pdfReportTheme === 'dark'}
                onChange={(isChecked) => setPdfReportTheme(isChecked ? 'dark' : 'light')}
            />
            <Button 
                onClick={handleGeneratePdf} 
                variant="secondary"
                isLoading={isGeneratingPdf}
                disabled={isGeneratingPdf}
                leftIcon={<DocumentTextIcon className="h-5 w-5" />}
                className="w-full sm:w-auto"
            >
              {UI_TEXT_ROMANIAN.generatePdfReportButton}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">{UI_TEXT_ROMANIAN.noDataForCycleReport}</p>
        </Card>
      )}
    </div>
  );
};

export default UserCycleReportsPage;