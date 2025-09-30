import React, { useState, useMemo } from 'react';
// FIX: Import the generic `Chart` component to support mixed chart types.
import { Chart } from "react-chartjs-2";
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, CHART_COLORS } from '../constants';
import { BetStatus, NotificationType, AdminPermission } from '../types';
import { PresentationChartLineIcon, SparklesIcon } from '../components/ui/Icons';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js/auto';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Structure for the AI report response
interface AiReportData {
  reportTitle: string;
  overallSummary: string;
  analysisPeriods: { periodName: string; description: string; }[];
  keyTakeaways: string[];
  charts: {
    chartTitle: string;
    chartType: 'line' | 'bar';
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      yAxisID?: string;
      type?: 'line' | 'bar';
      backgroundColor?: string;
      borderColor?: string;
      tension?: number;
      fill?: boolean;
    }[];
  }[];
}

const AdminMarketPulsePage: React.FC = () => {
    const { user: adminUser } = useAuth();
    const { appData, loading: dataLoading } = useData();
    const { addNotification } = useNotifications();
    const { theme: appTheme } = useAppTheme();
    
    const [reportData, setReportData] = useState<AiReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canUseGemini = adminUser?.isGlobalAdmin || adminUser?.adminPermissions?.[AdminPermission.CAN_USE_GEMINI_ANALYSIS];

    const handleGenerateReport = async () => {
        if (!canUseGemini) {
            addNotification(UI_TEXT_ROMANIAN.accessDenied, NotificationType.ERROR);
            return;
        }
        if (!process.env.API_KEY) {
            addNotification(UI_TEXT_ROMANIAN.geminiApiKeyMissing, NotificationType.ERROR);
            return;
        }
        if (!appData?.bets) {
            addNotification("Datele despre pariuri nu sunt disponibile.", NotificationType.ERROR);
            return;
        }

        const resolvedBets = appData.bets.filter(b => b.status !== BetStatus.PENDING && b.resolvedAt);
        if (resolvedBets.length < 10) {
            addNotification(UI_TEXT_ROMANIAN.noBetsForAnalysis, NotificationType.WARNING);
            return;
        }

        setIsLoading(true);
        setError(null);
        setReportData(null);

        try {
            // Data Preparation
            const weeklyData: Record<string, { profit: number; turnover: number; count: number }> = {};
            const perfBySport: Record<string, { profit: number; count: number }> = {};
            const perfByMarket: Record<string, { profit: number; count: number }> = {};
            
            resolvedBets.forEach(bet => {
                const d = new Date(bet.resolvedAt!);
                const startOfYear = new Date(d.getFullYear(), 0, 1);
                const weekNumber = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
                const key = `${d.getFullYear()}-S${String(weekNumber).padStart(2, '0')}`;
                
                if (!weeklyData[key]) weeklyData[key] = { profit: 0, turnover: 0, count: 0 };
                weeklyData[key].profit += bet.profit ?? 0;
                weeklyData[key].turnover += bet.stake;
                weeklyData[key].count++;

                if (!perfBySport[bet.sport]) perfBySport[bet.sport] = { profit: 0, count: 0 };
                perfBySport[bet.sport].profit += bet.profit ?? 0;
                perfBySport[bet.sport].count++;

                if (!perfByMarket[bet.market]) perfByMarket[bet.market] = { profit: 0, count: 0 };
                perfByMarket[bet.market].profit += bet.profit ?? 0;
                perfByMarket[bet.market].count++;
            });

            const promptData = { weeklyData, perfBySport, perfByMarket };

            // Gemini API Call
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analizează următoarele date de performanță a pariurilor sportive și generează un raport structurat JSON. Datele includ agregate săptămânale de profit/turnover și performanța pe sport/piață. Datele de intrare: ${JSON.stringify(promptData)}`,
                config: {
                    responseMimeType: "application/json",
                    systemInstruction: "Ești un analist expert în date de pariuri sportive. Generează un raport JSON detaliat bazat pe datele furnizate, conform schemei. Analizează tendințele, identifică perioade cheie, extrage concluzii acționabile și creează date pentru două grafice: (1) un grafic combinat linie/bare pentru evoluția săptămânală a profitului și a turnover-ului, și (2) un grafic de bare cu profitul pentru top 5 cele mai active sporturi. Toate textele trebuie să fie în limba română.",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            reportTitle: { type: Type.STRING },
                            overallSummary: { type: Type.STRING },
                            analysisPeriods: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { periodName: { type: Type.STRING }, description: { type: Type.STRING } } } },
                            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                            charts: { type: Type.ARRAY, items: {
                                type: Type.OBJECT,
                                properties: {
                                    chartTitle: { type: Type.STRING },
                                    chartType: { type: Type.STRING },
                                    labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    datasets: { type: Type.ARRAY, items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            label: { type: Type.STRING },
                                            data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                            type: { type: Type.STRING }, // 'line' or 'bar'
                                            yAxisID: { type: Type.STRING },
                                        }
                                    }}
                                }
                            }}
                        }
                    }
                }
            });

            const parsedReport = JSON.parse(response.text) as AiReportData;
            setReportData(parsedReport);

        } catch (err) {
            console.error("Gemini Market Pulse Error:", err);
            const errorMessage = (err as Error).message || UI_TEXT_ROMANIAN.geminiAnalysisError;
            setError(errorMessage);
            addNotification(errorMessage, NotificationType.ERROR);
        } finally {
            setIsLoading(false);
        }
    };
    
    const baseChartOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: false, ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }, grid: { color: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}, x: { ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }, grid: { display: false }} },
        plugins: { legend: { labels: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }}}
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                <PresentationChartLineIcon className="h-8 w-8 mr-3 text-primary-500" />
                {UI_TEXT_ROMANIAN.adminMarketPulse}
            </h1>

            <Card>
                {!reportData && !isLoading && (
                    <div className="text-center p-6">
                        <SparklesIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">{UI_TEXT_ROMANIAN.geminiMarketPulseReportTitle}</h2>
                        <p className="text-neutral-600 dark:text-neutral-300 mb-6 max-w-2xl mx-auto">{UI_TEXT_ROMANIAN.geminiMarketPulseReportDescription}</p>
                        <Button onClick={handleGenerateReport} variant="primary" size="lg" disabled={!canUseGemini}>
                            {UI_TEXT_ROMANIAN.generateMarketPulseReport}
                        </Button>
                        {!canUseGemini && <p className="text-xs text-red-500 mt-2">{UI_TEXT_ROMANIAN.accessDenied}</p>}
                    </div>
                )}
                {isLoading && (
                    <div className="text-center p-10">
                        <Spinner size="lg" />
                        <p className="mt-4 text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.marketPulseAnalysisInProgress}</p>
                    </div>
                )}
                {error && <p className="text-red-500 p-4">{error}</p>}

                {reportData && (
                    <div className="space-y-8 p-2">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{reportData.reportTitle}</h2>
                            <p className="mt-2 text-neutral-700 dark:text-neutral-200 max-w-3xl mx-auto">{reportData.overallSummary}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {(reportData.charts || []).map((chart, index) => {
                                // FIX: Dynamically configure chart scales based on AI response to prevent errors.
                                const hasCustomYAxes = (chart.datasets || []).some(ds => ds.yAxisID);
                                
                                // FIX: Use 'as const' to assert literal types for scale properties, satisfying Chart.js's strict typing.
                                const chartOptions = hasCustomYAxes 
                                ? {
                                    ...baseChartOptions,
                                    scales: {
                                        x: baseChartOptions.scales.x, // Keep x-axis config
                                        y_profit: { type: 'linear' as const, position: 'left' as const, title: { display: true, text: 'Profit (EUR)' }, ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' }, grid: { color: appTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } },
                                        y_turnover: { type: 'linear' as const, position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'Turnover (EUR)' }, ticks: { color: appTheme === 'dark' ? '#e5e7eb' : '#374151' } }
                                    }
                                }
                                : baseChartOptions;

                                return (
                                <Card key={index} title={chart.chartTitle} className={((reportData.charts && reportData.charts.length) || 0) === 1 ? 'lg:col-span-2' : ''}>
                                    <div className="h-80">
                                        <Chart
                                            type={chart.chartType || 'bar'}
                                            data={{
                                                labels: chart.labels || [],
                                                datasets: (chart.datasets || []).map(ds => ({
                                                    ...ds,
                                                    backgroundColor: ds.label?.toLowerCase().includes('profit') ? CHART_COLORS.backgroundColorProfit : (ds.type === 'line' ? 'transparent' : CHART_COLORS.backgroundColorUser),
                                                    borderColor: ds.label?.toLowerCase().includes('profit') ? CHART_COLORS.borderColorProfit : CHART_COLORS.borderColorUser,
                                                }))
                                            }}
                                            options={chartOptions}
                                        />
                                    </div>
                                </Card>
                                )
                            })}
                        </div>

                        {reportData.analysisPeriods?.length > 0 && (
                             <Card title="Analiza Perioadelor">
                                <div className="space-y-4">
                                {reportData.analysisPeriods.map((period, index) => (
                                    <div key={index} className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                        <h4 className="font-semibold text-primary-700 dark:text-primary-300">{period.periodName}</h4>
                                        <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{period.description}</p>
                                    </div>
                                ))}
                                </div>
                             </Card>
                        )}

                        {reportData.keyTakeaways?.length > 0 && (
                            <Card title="Concluzii Cheie">
                                <ul className="list-disc list-inside space-y-2 text-neutral-700 dark:text-neutral-200">
                                    {reportData.keyTakeaways.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </Card>
                        )}

                        <div className="text-center pt-4">
                            <Button onClick={handleGenerateReport} variant="secondary">Generează un Raport Nou</Button>
                        </div>

                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminMarketPulsePage;
