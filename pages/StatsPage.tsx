import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { UI_TEXT_ROMANIAN, CHART_COLORS } from '../constants';
import { formatCurrency, formatDate, calculatePlatformFeeRate, getFeeTierDescription } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';
import { ChartBarIcon, CalendarDaysIcon, BanknotesIcon, UsersIcon, ArrowTrendingUpIcon, SparklesIcon } from '../components/ui/Icons';
import { Line } from 'react-chartjs-2';
import { DailyHistoryRecord, BetStatus, Role } from '../types';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter';
import Input from '../components/ui/Input';

// Props for allowing external control for PDF generation
export interface StatsPageProps {
  forcedDateRange?: DateRange | null;
  isForPdfMode?: boolean;
  forcedPdfTheme?: 'light' | 'dark'; // New prop for PDF theme
}

const FeeSimulator: React.FC = () => {
  const [investorCount, setInvestorCount] = useState<number>(10);
  const [grossProfit, setGrossProfit] = useState<string>('100');

  const simulationResults = useMemo(() => {
    const profitNum = parseFloat(grossProfit) || 0;
    const feeRate = calculatePlatformFeeRate(investorCount);
    const feeTier = getFeeTierDescription(investorCount);
    const estimatedFee = profitNum > 0 ? profitNum * feeRate : 0;
    const netProfit = profitNum - estimatedFee;

    return {
      profitNum,
      feeRate,
      feeTier,
      estimatedFee,
      netProfit,
    };
  }, [investorCount, grossProfit]);

  return (
    <Card title={UI_TEXT_ROMANIAN.interactiveFeeSimulatorTitle} icon={<SparklesIcon className="h-6 w-6 text-yellow-500" />}>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
        {UI_TEXT_ROMANIAN.feeSimulatorDescription}
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="investorSlider" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            {UI_TEXT_ROMANIAN.simulatedInvestorsLabel}: <span className="font-bold text-primary-600 dark:text-primary-400">{investorCount}{investorCount >= 501 ? '+' : ''}</span>
          </label>
          <input
            id="investorSlider"
            type="range"
            min="1"
            max="501"
            step="1"
            value={investorCount}
            onChange={(e) => setInvestorCount(Number(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer dark:bg-neutral-700 accent-primary-500"
          />
        </div>
        <Input
          label={UI_TEXT_ROMANIAN.simulatedGrossProfitLabel}
          type="number"
          value={grossProfit}
          onChange={(e) => setGrossProfit(e.target.value)}
          placeholder="ex: 100"
          containerClassName="mb-0"
        />
      </div>

      <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg font-semibold mb-2 text-neutral-800 dark:text-neutral-100">Rezultate Simulare</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.resultingFeeRateLabel}</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{(simulationResults.feeRate * 100).toFixed(2)}%</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">({simulationResults.feeTier})</p>
          </div>
          <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.estimatedPlatformFeeLabel}</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(simulationResults.estimatedFee)}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-xs font-medium text-green-700 dark:text-green-300">{UI_TEXT_ROMANIAN.estimatedNetProfitLabel}</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(simulationResults.netProfit)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};


const StatsPage: React.FC<StatsPageProps> = ({ 
  forcedDateRange, 
  isForPdfMode = false,
  forcedPdfTheme = 'light' // Default to light for PDF if not specified
}) => {
  const { appData, loading } = useData();
  const { user } = useAuth(); // Get current user
  const [dateRange, setDateRange] = useState<DateRange>(forcedDateRange || { startDate: null, endDate: null });

  useEffect(() => {
    if (forcedDateRange) {
      setDateRange(forcedDateRange);
    }
  }, [forcedDateRange]);

  const handleRangeChange = (newRange: DateRange) => {
    if (!isForPdfMode) { 
      setDateRange(newRange);
    }
  };

  const filteredDailyHistoryForTableAndChart = useMemo(() => {
    if (!appData?.dailyHistory) return [];
    let history = [...appData.dailyHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dateRange.startDate && dateRange.endDate) {
      history = history.filter(record => {
        const recordDate = record.date; 
        return recordDate >= dateRange.startDate! && recordDate <= dateRange.endDate!;
      });
    }
    return history;
  }, [appData?.dailyHistory, dateRange]);


  const chartDisplayData = useMemo(() => {
    const dataForChart = filteredDailyHistoryForTableAndChart; 
    const cumulativeGrossProfitData: number[] = [];
    let currentCumulativeGrossProfit = 0;
    for (const record of dataForChart) {
      currentCumulativeGrossProfit += record.dailyGrossProfit;
      cumulativeGrossProfitData.push(currentCumulativeGrossProfit);
    }

    const cumulativeBankValueData: number[] = [];
    if (dataForChart.length > 0) {
      let runningBankValue = dataForChart[0].totalBankValueStart;
       for (const record of dataForChart) {
         runningBankValue += record.dailyGrossProfit;
         cumulativeBankValueData.push(runningBankValue);
       }
    }
    
    return {
      labels: dataForChart.map(d => formatDate(d.date, { day: 'numeric', month: 'short' })),
      cumulativeGrossProfitData,
      cumulativeBankValueData,
      hasData: dataForChart.length > 0,
    };
  }, [filteredDailyHistoryForTableAndChart]);

  useEffect(() => {
    if (isForPdfMode) {
      if (forcedPdfTheme === 'dark') {
      } else {
      }
    }
  }, [isForPdfMode, forcedPdfTheme]);

  if (loading || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const { globalStats, bets } = appData; 
  const totalBets = bets?.length || globalStats?.totalBetsPlaced || 0;
  const pendingBets = bets?.filter(b => b.status === BetStatus.PENDING).length || 0;
  const completedBets = totalBets - pendingBets;

  const sumTotalProfitDistributedFromFilteredHistory = filteredDailyHistoryForTableAndChart.reduce((acc, record) => {
    if (record.dailyGrossProfit < 0) { 
      return acc + record.dailyGrossProfit; 
    }
    return acc + (record.distributedNetProfit || 0); 
  }, 0);

  const sumCurrentTurnoverFromFilteredHistory = filteredDailyHistoryForTableAndChart.reduce((acc, record) => acc + record.turnover, 0);
  
  const dailyHistoryChartDataConfig = {
    labels: chartDisplayData.labels,
    datasets: [
      {
        label: UI_TEXT_ROMANIAN.chartLabelCumulativeGrossProfit,
        data: chartDisplayData.cumulativeGrossProfitData,
        borderColor: CHART_COLORS.borderColorGlobalProfit,
        backgroundColor: CHART_COLORS.backgroundColorGlobalProfit,
        tension: 0.1,
        fill: true,
      },
      {
        label: UI_TEXT_ROMANIAN.chartLabelCumulativeBankValue,
        data: chartDisplayData.cumulativeBankValueData,
        borderColor: CHART_COLORS.borderColorBankValue,
        backgroundColor: CHART_COLORS.backgroundColorBankValue,
        tension: 0.1,
        fill: false, 
      }
    ],
  };

  const currentChartTheme = isForPdfMode ? forcedPdfTheme : (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const tickColor = currentChartTheme === 'dark' ? '#cbd5e1' : '#4b5563';
  const gridColor = currentChartTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const legendColor = currentChartTheme === 'dark' ? '#e5e7eb' : '#374151';
  
  const chartOptions = { 
    responsive: true, 
    maintainAspectRatio: false,
    animation: isForPdfMode ? false : {}, 
    scales: {
      y: { beginAtZero: false, ticks: { color: tickColor }, grid: { color: gridColor } },
      x: { ticks: { color: tickColor }, grid: { color: gridColor } }
    },
    plugins: { legend: { labels: { color: legendColor }}}
  };
  
  const pdfModeRootClasses = isForPdfMode 
    ? `stats-page-pdf-render p-6 ${forcedPdfTheme === 'dark' ? 'dark bg-neutral-900 text-neutral-100' : 'light bg-white text-neutral-900'}`
    : '';

  return (
    <div className={`space-y-8 animate-fade-in ${pdfModeRootClasses}`}>
      {!isForPdfMode && (
        <div className="flex justify-center mb-6">
          <NavLink 
            to="/" 
            aria-label={UI_TEXT_ROMANIAN.home} 
            className="focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-md"
          >
            <img 
              src="https://i.ibb.co/zgtmkSY/IMG-4094-1.webp" 
              alt={UI_TEXT_ROMANIAN.appName + " Logo"} 
              className="h-14 object-contain" 
            />
          </NavLink>
        </div>
      )}

      <h1 className={`text-3xl font-bold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-800' : 'text-neutral-800 dark:text-neutral-100'} flex items-center`}>
        <ChartBarIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.statistics} Globale {isForPdfMode && dateRange.startDate && dateRange.endDate ? `(${formatDate(dateRange.startDate, {day:'2-digit', month:'2-digit', year:'numeric'})} - ${formatDate(dateRange.endDate, {day:'2-digit', month:'2-digit', year:'numeric'})})` : ''}
      </h1>
      
      {!isForPdfMode && (
        <DateRangeFilter onRangeChange={handleRangeChange} initialRangeType="all" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Total Investit în Platformă" icon={<BanknotesIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
          <p className={`text-4xl font-bold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-primary-600' : 'text-primary-600 dark:text-primary-400'}`}>{formatCurrency(globalStats?.totalInvested)}</p>
        </Card>
        <Card title="Investitori Activi" icon={<UsersIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
          <p className={`text-4xl font-bold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-secondary-600' : 'text-secondary-600 dark:text-secondary-400'}`}>{globalStats?.activeInvestors || 0}</p>
        </Card>
        <Card title="Profit Total Distribuit (Perioadă)" icon={<ArrowTrendingUpIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
          <p className="text-4xl font-bold text-green-500">{formatCurrency(sumTotalProfitDistributedFromFilteredHistory)}</p>
        </Card>
        <Card title="Turnover Total (Perioadă)" icon={<ChartBarIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
          <p className={`text-2xl font-semibold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-700 dark:text-neutral-200'}`}>{formatCurrency(sumCurrentTurnoverFromFilteredHistory)}</p>
        </Card>
        
        <Card title="Total Pariuri Plasate" icon={<CalendarDaysIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
            <p className={`text-4xl font-bold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-700 dark:text-neutral-200'}`}>{totalBets}</p>
            <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
                <p>Finalizate: <span className="font-semibold text-green-500">{completedBets}</span></p>
                <div className="flex items-center">
                    <span>În Așteptare:</span>
                    <span className="font-semibold text-yellow-500 ml-1">{pendingBets}</span>
                    {user && pendingBets > 0 && (
                        <Link 
                            to={user.role === Role.ADMIN ? "/admin/date" : "/user/bets"} 
                            state={{ preFilterStatus: 'PENDING' }}
                            className="ml-2 text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 underline"
                        >
                            (Vezi detalii)
                        </Link>
                    )}
                </div>
            </div>
        </Card>

        <Card title="Pariuri Finalizate" icon={<CalendarDaysIcon className="h-7 w-7"/>} className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
           <p className={`text-4xl font-bold ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-700 dark:text-neutral-200'}`}>{completedBets}</p>
        </Card>

      </div>

      <Card title="Evoluție Zilnică (Perioada Selectată în Filtru)" className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
        <div className="h-80 md:h-96">
          {chartDisplayData.hasData ? (
            <Line data={dailyHistoryChartDataConfig} options={chartOptions} />
          ) : (
             <div className="h-full flex items-center justify-center text-neutral-500 dark:text-neutral-400">
               {UI_TEXT_ROMANIAN.noDataAvailable} pentru intervalul selectat.
             </div>
          )}
        </div>
      </Card>

      {!isForPdfMode && <FeeSimulator />}

      <Card title="Istoric Zilnic Detaliat (Perioada Selectată în Filtru)" className={isForPdfMode ? 'bg-white dark:bg-neutral-800 border dark:border-neutral-700' : ''}>
        {filteredDailyHistoryForTableAndChart.length > 0 ? (
          <div className={isForPdfMode ? '' : "overflow-x-auto max-h-[500px]"}>
            <table className={`min-w-full divide-y ${isForPdfMode && forcedPdfTheme === 'light' ? 'divide-neutral-300' : 'divide-neutral-200 dark:divide-neutral-700'}`}>
              <thead className={isForPdfMode && forcedPdfTheme === 'light' ? 'bg-neutral-100' : 'bg-neutral-50 dark:bg-neutral-800 sticky top-0'}>
                <tr>
                  {['Ziua', 'Data', 'Profit Brut', 'Turnover', 'Nr. Pariuri', 'Bancă Start', 'Bancă Final', 'Profit Distribuit Net', 'Taxe Colectate', 'Note'].map(header => (
                    <th key={header} scope="col" className={`px-4 py-3 text-left text-xs font-medium ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-600' : 'text-neutral-500 dark:text-neutral-300'} uppercase tracking-wider`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`${isForPdfMode && forcedPdfTheme === 'light' ? 'bg-white divide-neutral-300' : 'bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700'}`}>
                {filteredDailyHistoryForTableAndChart.sort((a,b) => b.day - a.day).map((record) => (
                  <tr key={record.day} className={isForPdfMode ? '' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors'}>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-900' : 'text-neutral-900 dark:text-neutral-100'}`}>{record.day}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'}`}>{formatDate(record.date, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${record.dailyGrossProfit >= 0 ? (isForPdfMode && forcedPdfTheme === 'light' ? 'text-green-700' : 'text-green-600 dark:text-green-400') : (isForPdfMode && forcedPdfTheme === 'light' ? 'text-red-700' : 'text-red-600 dark:text-red-400')}`}>{formatCurrency(record.dailyGrossProfit)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'}`}>{formatCurrency(record.turnover)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'}`}>{record.numBets}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'}`}>{formatCurrency(record.totalBankValueStart)}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-700' : 'text-neutral-600 dark:text-neutral-300'}`}>{formatCurrency(record.totalBankValueEnd)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-500">{formatCurrency(record.distributedNetProfit)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-500">{formatCurrency(record.collectedFees)}</td>
                    <td className={`px-4 py-3 text-sm ${isForPdfMode && forcedPdfTheme === 'light' ? 'text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'} max-w-xs ${isForPdfMode ? '' : 'truncate'}`} title={record.notes}>{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-10 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable} pentru intervalul selectat.</p>
        )}
      </Card>
    </div>
  );
};

export default StatsPage;