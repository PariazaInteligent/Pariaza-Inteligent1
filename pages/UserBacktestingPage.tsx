import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, CHART_COLORS } from '../constants';
import { DailyHistoryRecord, NotificationType } from '../types';
import { formatCurrency, formatDate, calculatePlatformFeeRate } from '../utils/helpers';
import { CalculatorIcon } from '../components/ui/Icons';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js/auto';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface BacktestingResult {
  initialInvestment: number;
  finalBalance: number;
  totalGrossProfit: number;
  totalFeesPaid: number;
  totalNetProfit: number;
  growthPercentage: number;
  period: string;
  dailyEvolution: Array<{ date: string; value: number }>;
}

const getIsoDateString = (date: Date): string => date.toISOString().split('T')[0];

const UserBacktestingPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const today = getIsoDateString(new Date());
  const oneMonthAgo = getIsoDateString(new Date(new Date().setMonth(new Date().getMonth() - 1)));

  const [simulatedAmount, setSimulatedAmount] = useState<string>('1000');
  const [startDate, setStartDate] = useState<string>(oneMonthAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [backtestingResult, setBacktestingResult] = useState<BacktestingResult | null>(null);
  const [isLoadingSimulation, setIsLoadingSimulation] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSimulation(true);
    setBacktestingResult(null);

    const amount = parseFloat(simulatedAmount);
    if (isNaN(amount) || amount <= 0 || !startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      addNotification(UI_TEXT_ROMANIAN.backtestingInvalidInput, NotificationType.ERROR);
      setIsLoadingSimulation(false);
      return;
    }

    if (!appData?.dailyHistory || appData.dailyHistory.length === 0) {
      addNotification(UI_TEXT_ROMANIAN.backtestingNoDataForPeriod, NotificationType.WARNING);
      setIsLoadingSimulation(false);
      return;
    }

    const relevantHistory = appData.dailyHistory
      .filter(record => record.date >= startDate && record.date <= endDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (relevantHistory.length === 0) {
      addNotification(UI_TEXT_ROMANIAN.backtestingNoDataForPeriod, NotificationType.WARNING);
      setIsLoadingSimulation(false);
      return;
    }

    let currentBalance = amount;
    let totalGrossProfit = 0;
    let totalFeesPaid = 0;
    const dailyEvolution: Array<{ date: string; value: number }> = [{ date: startDate, value: currentBalance }];

    relevantHistory.forEach(record => {
      const dailyBankProfit = record.dailyGrossProfit;
      const bankAtStartOfDay = record.totalBankValueStart;

      if (bankAtStartOfDay <= 0) return; // Cannot calculate share if bank is zero or negative

      const userShareOfBank = currentBalance / bankAtStartOfDay;
      const userDailyGrossProfit = dailyBankProfit * userShareOfBank;
      
      // Calculate historical fee rate for that day
      // This assumes fees were applied to positive gross profit.
      // If collectedFees is 0 and dailyGrossProfit > 0, it means fee rate was 0 or not applied.
      // If dailyGrossProfit <= 0, no fee.
      let historicalFeeRateToday = 0;
      if (record.dailyGrossProfit > 0 && record.collectedFees !== undefined && record.collectedFees >= 0) {
        historicalFeeRateToday = record.collectedFees / record.dailyGrossProfit;
      }
      
      const userDailyFee = userDailyGrossProfit > 0 ? userDailyGrossProfit * historicalFeeRateToday : 0;
      const userDailyNetProfit = userDailyGrossProfit - userDailyFee;

      currentBalance += userDailyNetProfit;
      totalGrossProfit += userDailyGrossProfit;
      totalFeesPaid += userDailyFee;
      
      // Add data point only if the date changes or it's the last record for the day
      const lastEvoDate = dailyEvolution[dailyEvolution.length - 1]?.date;
      if (lastEvoDate !== record.date) {
        dailyEvolution.push({ date: record.date, value: currentBalance });
      } else if (dailyEvolution.length > 0) {
        dailyEvolution[dailyEvolution.length - 1].value = currentBalance;
      }
    });
    
    // Ensure the last day of the selected range is included if no transaction happened
    if (dailyEvolution[dailyEvolution.length - 1]?.date < endDate) {
        dailyEvolution.push({ date: endDate, value: currentBalance });
    }


    const totalNetProfit = totalGrossProfit - totalFeesPaid;
    const growthPercentage = amount > 0 ? (totalNetProfit / amount) * 100 : (totalNetProfit > 0 ? Infinity : 0);

    setBacktestingResult({
      initialInvestment: amount,
      finalBalance: currentBalance,
      totalGrossProfit,
      totalFeesPaid,
      totalNetProfit,
      growthPercentage,
      period: `${formatDate(startDate, {year:'numeric',month:'short',day:'numeric'})} - ${formatDate(endDate, {year:'numeric',month:'short',day:'numeric'})}`,
      dailyEvolution,
    });

    setIsLoadingSimulation(false);
  };

  const chartData = useMemo(() => {
    if (!backtestingResult) return null;
    return {
      labels: backtestingResult.dailyEvolution.map(d => formatDate(d.date, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: UI_TEXT_ROMANIAN.backtestingChartLabel,
          data: backtestingResult.dailyEvolution.map(d => d.value),
          borderColor: CHART_COLORS.borderColorUser,
          backgroundColor: CHART_COLORS.backgroundColorUser,
          tension: 0.1,
          fill: true,
        },
      ],
    };
  }, [backtestingResult]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: false } },
    plugins: { legend: { display: true } },
  };

  if (dataLoading || !user) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <CalculatorIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.userBacktestingTitle}
      </h1>

      <Card title="Parametri Simulare">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          {UI_TEXT_ROMANIAN.backtestingIntro}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={UI_TEXT_ROMANIAN.simulatedInvestmentAmountLabel}
            type="number"
            name="simulatedAmount"
            value={simulatedAmount}
            onChange={(e) => setSimulatedAmount(e.target.value)}
            placeholder="ex: 1000"
            min="1"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={UI_TEXT_ROMANIAN.simulationStartDateLabel}
              type="date"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={today}
              required
            />
            <Input
              label={UI_TEXT_ROMANIAN.simulationEndDateLabel}
              type="date"
              name="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              max={today}
              required
            />
          </div>
          <Button type="submit" variant="primary" isLoading={isLoadingSimulation} disabled={isLoadingSimulation}>
            {UI_TEXT_ROMANIAN.runSimulationButton}
          </Button>
        </form>
      </Card>

      {isLoadingSimulation && (
        <div className="text-center py-6">
          <Spinner />
          <p className="mt-2 text-neutral-600 dark:text-neutral-300">Se procesează simularea...</p>
        </div>
      )}

      {backtestingResult && !isLoadingSimulation && (
        <Card title={UI_TEXT_ROMANIAN.backtestingResultsTitle}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-sm">
            <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.initialSimulatedInvestment}</p>
              <p className="text-xl font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(backtestingResult.initialInvestment)}</p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.finalSimulatedBalance}</p>
              <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(backtestingResult.finalBalance)}</p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.totalSimulatedGrossProfit}</p>
              <p className={`text-lg font-semibold ${backtestingResult.totalGrossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(backtestingResult.totalGrossProfit)}</p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.totalSimulatedFeesPaid}</p>
              <p className="text-lg font-semibold text-red-500">{formatCurrency(backtestingResult.totalFeesPaid)}</p>
            </div>
            <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.totalSimulatedNetProfit}</p>
              <p className={`text-xl font-bold ${backtestingResult.totalNetProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(backtestingResult.totalNetProfit)}</p>
            </div>
             <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
              <p className="font-medium text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.totalSimulatedGrowthPercentage}</p>
              <p className={`text-xl font-bold ${backtestingResult.growthPercentage >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {backtestingResult.growthPercentage === Infinity ? 'N/A' : `${backtestingResult.growthPercentage.toFixed(2)}%`}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{UI_TEXT_ROMANIAN.simulationPeriod} {backtestingResult.period}</p>
          
          {chartData && (
            <div className="mt-4 h-72 md:h-96">
              <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{UI_TEXT_ROMANIAN.backtestingChartTitle}</h3>
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6">{UI_TEXT_ROMANIAN.backtestingDisclaimer}</p>
        </Card>
      )}
    </div>
  );
};

export default UserBacktestingPage;
