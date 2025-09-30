
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { useAuth, AuthProvider } from '../contexts/AuthContext'; // Import AuthProvider
import { useData, DataProvider } from '../contexts/DataContext';
import { useNotifications, NotificationProvider } from '../contexts/NotificationContext';
import { ThemeProvider, useTheme as useAppTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter';
import { UI_TEXT_ROMANIAN, TRANSACTION_TYPE_FRIENDLY_NAMES } from '../constants';
import { Transaction, TransactionType, TransactionStatus, NotificationType, Role } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { TableCellsIcon, DocumentTextIcon, ArrowDownTrayIcon } from '../components/ui/Icons';
import { exportToXLSX } from '../utils/exportService';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

const relevantTransactionTypesForUserReport: TransactionType[] = [
  TransactionType.INVESTMENT_APPROVAL,
  TransactionType.WITHDRAWAL_APPROVAL,
  TransactionType.PROFIT_DISTRIBUTION, // This will map to 'PROFIT_PAYOUT' from investmentHistory
  TransactionType.FEE_COLLECTION,     // This will map to 'FEE' from investmentHistory
  TransactionType.INVESTMENT_REQUEST,
  TransactionType.WITHDRAWAL_REQUEST,
];

const UserAdvancedReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();
  const { theme: currentAppTheme } = useAppTheme();

  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<TransactionType[]>(() => [...relevantTransactionTypesForUserReport]);
  const [pdfReportTheme, setPdfReportTheme] = useState<'light' | 'dark'>(currentAppTheme);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setPdfReportTheme(currentAppTheme);
  }, [currentAppTheme]);

  const handleTransactionTypeChange = (type: TransactionType) => {
    setSelectedTransactionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleSelectAllTransactionTypes = (select: boolean) => {
    setSelectedTransactionTypes(select ? [...relevantTransactionTypesForUserReport] : []);
  };

  const filteredTransactions = useMemo(() => {
    if (!appData || !user) return [];

    const currentUserData = appData.users.find(u => u.id === user.id);
    let combinedTransactions: Transaction[] = [];

    // 1. Process transactions from the main appData.transactions log (excluding those synthesized from history)
    const mainUserTransactions = (appData.transactions || [])
      .filter(t => {
        if (t.userId !== user.id) return false;

        // Exclude system-level PROFIT_DISTRIBUTION and FEE_COLLECTION from main log for this user report,
        // as we'll synthesize them from their personal investmentHistory.
        if (t.type === TransactionType.PROFIT_DISTRIBUTION || t.type === TransactionType.FEE_COLLECTION) {
            return false;
        }
        // Include other relevant types if selected
        if (selectedTransactionTypes.length > 0 && !selectedTransactionTypes.includes(t.type)) {
          return false;
        }
        // Apply date range
        if (dateRange.startDate && new Date(t.timestamp).toISOString().split('T')[0] < dateRange.startDate) {
          return false;
        }
        if (dateRange.endDate && new Date(t.timestamp).toISOString().split('T')[0] > dateRange.endDate) {
          return false;
        }
        return true;
      });
    combinedTransactions.push(...mainUserTransactions);

    // 2. Synthesize PROFIT_PAYOUT and FEE from investmentHistory
    if (currentUserData?.profileData.investmentHistory) {
      const historyTransactions = currentUserData.profileData.investmentHistory
        .map((item, index): Transaction | null => {
          let transactionTypeForReport: TransactionType | null = null;
          let description = '';

          if (item.type === 'PROFIT_PAYOUT' && selectedTransactionTypes.includes(TransactionType.PROFIT_DISTRIBUTION)) {
            transactionTypeForReport = TransactionType.PROFIT_DISTRIBUTION;
            description = item.amount >= 0 ? 'Distribuire profit (din istoric personal)' : 'Acoperire pierdere (din istoric personal)';
          } else if (item.type === 'FEE' && selectedTransactionTypes.includes(TransactionType.FEE_COLLECTION)) {
            transactionTypeForReport = TransactionType.FEE_COLLECTION;
            description = 'Colectare taxă platformă (din istoric personal)';
          }
          // Note: 'DEPOSIT' and 'WITHDRAWAL' from history are generally covered by INVESTMENT_APPROVAL/WITHDRAWAL_APPROVAL
          // from the main transaction log, which are more event-driven for this report type.
          // If specific ledger entries for DEPOSIT/WITHDRAWAL are needed distinct from approvals, they can be added here.

          if (!transactionTypeForReport) return null; // Only include if relevant type is selected and mapped

          return {
            id: `hist_${user.id}_${item.date}_${index}`, // Synthetic ID
            timestamp: item.date,
            userId: user.id,
            type: transactionTypeForReport,
            amount: item.amount,
            status: TransactionStatus.COMPLETED, // History items are facts
            description: description,
          };
        })
        .filter((t): t is Transaction => t !== null) // Type guard to remove nulls
        .filter(t => { // Apply date range to synthesized transactions
          if (dateRange.startDate && new Date(t.timestamp).toISOString().split('T')[0] < dateRange.startDate) {
            return false;
          }
          if (dateRange.endDate && new Date(t.timestamp).toISOString().split('T')[0] > dateRange.endDate) {
            return false;
          }
          return true;
        });
      combinedTransactions.push(...historyTransactions);
    }

    return combinedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [appData, user, selectedTransactionTypes, dateRange]);


  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      addNotification(UI_TEXT_ROMANIAN.noTransactionsFoundForFilters, NotificationType.WARNING);
      return;
    }
    setIsGenerating(true);
    addNotification(UI_TEXT_ROMANIAN.exportGeneratingCsv, NotificationType.INFO);

    setTimeout(() => {
        try {
            const dataForCsv = filteredTransactions.map(t => ({
                Data: formatDate(t.timestamp, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                Tip: TRANSACTION_TYPE_FRIENDLY_NAMES[t.type] || t.type,
                Descriere: `"${t.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
                Suma: t.amount !== undefined ? t.amount.toFixed(2) : '',
                Status: t.status,
            }));
            
            const csvHeaders = "Data,Tip,Descriere,Suma (EUR),Status\n";
            const csvRows = dataForCsv.map(row => `${row.Data},${row.Tip},${row.Descriere},${row.Suma},${row.Status}`).join("\n");
            const csvContent = csvHeaders + csvRows;

            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const safeUserName = user?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'raport';
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `Raport_Avansat_${safeUserName}_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addNotification(UI_TEXT_ROMANIAN.exportCsvSuccess, NotificationType.SUCCESS);
        } catch (error) {
            addNotification(UI_TEXT_ROMANIAN.exportError, NotificationType.ERROR);
            console.error("CSV Export Error:", error);
        } finally {
            setIsGenerating(false);
        }
    }, 500);
  };

  const handleExportXLSX = () => {
    if (filteredTransactions.length === 0) {
      addNotification(UI_TEXT_ROMANIAN.noTransactionsFoundForFilters, NotificationType.WARNING);
      return;
    }
    setIsGenerating(true);
    try {
      const dataForXLSX = filteredTransactions.map(t => ({
        date: t.timestamp, 
        type: TRANSACTION_TYPE_FRIENDLY_NAMES[t.type] || t.type,
        description: t.description,
        amount: t.amount,
        status: t.status,
      }));

      const headers = {
        date: UI_TEXT_ROMANIAN.tableHeaderDate,
        type: UI_TEXT_ROMANIAN.tableHeaderType,
        description: UI_TEXT_ROMANIAN.tableHeaderDescription,
        amount: UI_TEXT_ROMANIAN.tableHeaderAmount,
        status: UI_TEXT_ROMANIAN.tableHeaderStatus,
      };
      const safeUserName = user?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'raport';
      const timestamp = new Date().toISOString().split('T')[0];
      exportToXLSX(dataForXLSX, `Raport_Avansat_${safeUserName}_${timestamp}.xlsx`, "Tranzacții", headers);
      addNotification(UI_TEXT_ROMANIAN.xlsxExportSuccess, NotificationType.SUCCESS);
    } catch (error) {
      addNotification(UI_TEXT_ROMANIAN.xlsxExportFailed, NotificationType.ERROR);
      console.error("XLSX Export Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const PdfReportContent: React.FC<{theme: 'light' | 'dark'}> = ({theme}) => {
    // Re-access user from context within this component if needed for its own logic,
    // or ensure all necessary data is passed down as props.
    // For this specific content, user name is the only direct usage.
    const { user: pdfUser } = useAuth();


    const bgColor = theme === 'dark' ? 'bg-neutral-900' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-neutral-100' : 'text-neutral-800';
    const lightTextColor = theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600';
    const borderColor = theme === 'dark' ? 'border-neutral-700' : 'border-neutral-300';
    const thClass = `p-2 text-left text-xs font-semibold ${theme === 'dark' ? 'text-neutral-300 bg-neutral-800' : 'text-neutral-600 bg-neutral-100'}`;
    const tdClass = `p-2 text-sm ${borderColor} ${theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`;
    
    const periodText = (dateRange.startDate && dateRange.endDate) 
        ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}` 
        : UI_TEXT_ROMANIAN.allTime;
    const selectedTypesText = selectedTransactionTypes.map(t => TRANSACTION_TYPE_FRIENDLY_NAMES[t] || t).join(', ') || "Toate Tipurile";

    return (
        React.createElement('div', { className: `pdf-render-advanced-report p-4 ${bgColor} ${textColor}` },
            React.createElement('h1', { className: 'text-xl font-bold mb-2' }, UI_TEXT_ROMANIAN.reportPdfTitle),
            React.createElement('p', { className: `text-sm mb-1 ${lightTextColor}` }, `${UI_TEXT_ROMANIAN.reportUserLabel} ${pdfUser?.name || user?.name}`),
            React.createElement('p', { className: `text-sm mb-1 ${lightTextColor}` }, `${UI_TEXT_ROMANIAN.reportPeriodLabel} ${periodText}`),
            React.createElement('p', { className: `text-sm mb-3 ${lightTextColor}` }, `${UI_TEXT_ROMANIAN.reportFiltersAppliedLabel} ${selectedTypesText}`),
            
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '10px' } },
                React.createElement('thead', null,
                    React.createElement('tr', null,
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, UI_TEXT_ROMANIAN.tableHeaderDate),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, UI_TEXT_ROMANIAN.tableHeaderType),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, UI_TEXT_ROMANIAN.tableHeaderDescription),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}`, textAlign: 'right' } }, UI_TEXT_ROMANIAN.tableHeaderAmount),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, UI_TEXT_ROMANIAN.tableHeaderStatus)
                    )
                ),
                React.createElement('tbody', null,
                    filteredTransactions.map((item) => 
                        React.createElement('tr', { key: item.id, style: { borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } },
                            React.createElement('td', { className: tdClass }, formatDate(item.timestamp, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
                            React.createElement('td', { className: tdClass }, TRANSACTION_TYPE_FRIENDLY_NAMES[item.type] || item.type),
                            React.createElement('td', { className: tdClass, style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'} }, item.description),
                            React.createElement('td', { className: tdClass, style: { textAlign: 'right', color: (item.amount || 0) >= 0 ? (theme === 'dark' ? '#4ade80': '#16a34a') : (theme === 'dark' ? '#f87171': '#dc2626') } }, item.amount !== undefined ? formatCurrency(item.amount) : '-'),
                            React.createElement('td', { className: tdClass }, item.status)
                        )
                    )
                )
            ),
            React.createElement('p', { className: `text-xs mt-4 ${lightTextColor}` }, `${UI_TEXT_ROMANIAN.reportGeneratedDateLabel} ${formatDate(new Date().toISOString())}`)
        )
    );
  };

  const handleExportPDF = async () => {
    if (filteredTransactions.length === 0) {
      addNotification(UI_TEXT_ROMANIAN.noTransactionsFoundForFilters, NotificationType.WARNING);
      return;
    }
    setIsGenerating(true);
    addNotification(UI_TEXT_ROMANIAN.exportGeneratingPdf, NotificationType.INFO);

    const offscreenDiv = document.createElement('div');
    offscreenDiv.style.position = 'absolute';
    offscreenDiv.style.left = '-9999px';
    offscreenDiv.style.top = '-9999px';
    offscreenDiv.style.width = '1000px'; 
    document.body.appendChild(offscreenDiv);
    
    const pdfRoot = ReactDOM.createRoot(offscreenDiv);
    pdfRoot.render(
         <React.StrictMode>
             <HashRouter>
               <NotificationProvider>
                    <AuthProvider>
                        <DataProvider>
                           <ThemeProvider forcedTheme={pdfReportTheme}>
                               <PdfReportContent theme={pdfReportTheme} />
                           </ThemeProvider>
                        </DataProvider>
                    </AuthProvider>
               </NotificationProvider>
            </HashRouter>
        </React.StrictMode>
    );

    await new Promise(resolve => setTimeout(resolve, 1500)); 

    try {
        const reportElement = offscreenDiv.querySelector('.pdf-render-advanced-report') as HTMLElement;
        if (!reportElement) {
            throw new Error("PDF content element not found after rendering.");
        }
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: pdfReportTheme === 'dark' ? '#0f172a' : '#ffffff',
            onclone: (documentClone) => { 
                if (pdfReportTheme === 'dark') {
                    documentClone.documentElement.classList.add('dark');
                    documentClone.documentElement.classList.remove('light');
                } else {
                    documentClone.documentElement.classList.remove('dark');
                    documentClone.documentElement.classList.add('light');
                }
            }
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape', 
            unit: 'pt',
            format: 'a4',
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const margin = 40;
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;
        let newImgWidth = imgProps.width;
        let newImgHeight = imgProps.height;
        if (imgProps.width > availableWidth) {
            const ratio = availableWidth / imgProps.width;
            newImgWidth = availableWidth;
            newImgHeight = imgProps.height * ratio;
        }
        if (newImgHeight > availableHeight) {
            const ratio = availableHeight / newImgHeight;
            newImgHeight = availableHeight;
            newImgWidth = newImgWidth * ratio;
        }
        const xOffset = (pdfWidth - newImgWidth) / 2;
        const yOffset = (pdfHeight - newImgHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, newImgWidth, newImgHeight);
        const safeUserName = user?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'raport';
        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`Raport_Financiar_${safeUserName}_${timestamp}_(${pdfReportTheme}).pdf`);
        addNotification(UI_TEXT_ROMANIAN.exportPdfSuccess, NotificationType.SUCCESS);
    } catch (pdfError) {
        addNotification(UI_TEXT_ROMANIAN.exportError, NotificationType.ERROR);
        console.error("PDF Export Error:", pdfError);
    } finally {
        pdfRoot.unmount();
        if (document.body.contains(offscreenDiv)) {
          document.body.removeChild(offscreenDiv);
        }
        setIsGenerating(false);
    }
  };


  if (dataLoading || !user || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <TableCellsIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.advancedReportsPageTitle}
      </h1>

      <Card title="Filtre Raport">
        <DateRangeFilter onRangeChange={setDateRange} initialRangeType="all" />
        <div className="mt-4">
          <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-200 mb-2">
            {UI_TEXT_ROMANIAN.filterByTransactionType}
          </h3>
          <div className="mb-3 flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => toggleSelectAllTransactionTypes(true)}>
                {UI_TEXT_ROMANIAN.selectAllTransactionTypes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleSelectAllTransactionTypes(false)}>
                {UI_TEXT_ROMANIAN.deselectAllTransactionTypes}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {relevantTransactionTypesForUserReport.map(type => (
              <label key={type} className="flex items-center space-x-2 p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-primary-600 rounded border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 focus:ring-primary-500 dark:focus:ring-primary-400 dark:ring-offset-neutral-800"
                  checked={selectedTransactionTypes.includes(type)}
                  onChange={() => handleTransactionTypeChange(type)}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {TRANSACTION_TYPE_FRIENDLY_NAMES[type] || type}
                </span>
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Rezultate Raport">
        <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
            <Button onClick={handleExportCSV} variant="secondary" leftIcon={<DocumentTextIcon className="h-5 w-5" />} disabled={isGenerating} isLoading={isGenerating && false }>
                {UI_TEXT_ROMANIAN.exportToCsvButton}
            </Button>
            <Button onClick={handleExportXLSX} variant="secondary" leftIcon={<TableCellsIcon className="h-5 w-5" />} disabled={isGenerating} isLoading={isGenerating && false}>
                {UI_TEXT_ROMANIAN.exportToXlsxButton}
            </Button>
            <div className="flex items-center space-x-3">
                <Button onClick={handleExportPDF} variant="primary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />} disabled={isGenerating} isLoading={isGenerating}>
                    {UI_TEXT_ROMANIAN.exportToPdfButton}
                </Button>
                 <select 
                    value={pdfReportTheme} 
                    onChange={(e) => setPdfReportTheme(e.target.value as 'light' | 'dark')}
                    className="px-3 py-2 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500 text-sm h-full"
                    aria-label="Temă PDF"
                    disabled={isGenerating}
                >
                    <option value="light">{UI_TEXT_ROMANIAN.lightMode}</option>
                    <option value="dark">{UI_TEXT_ROMANIAN.darkMode}</option>
                </select>
            </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderDate}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderType}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderDescription}</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderAmount}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderStatus}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{formatDate(t.timestamp)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{TRANSACTION_TYPE_FRIENDLY_NAMES[t.type] || t.type}</td>
                    <td className="px-3 py-2 text-sm text-neutral-800 dark:text-neutral-100 max-w-xs truncate" title={t.description}>{t.description}</td>
                    <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-semibold ${(t.amount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.amount !== undefined ? formatCurrency(t.amount) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${t.status === TransactionStatus.PENDING ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 
                        t.status === TransactionStatus.COMPLETED || t.status === TransactionStatus.APPROVED ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                        t.status === TransactionStatus.REJECTED || t.status === TransactionStatus.FAILED ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' :
                        'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-10 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noTransactionsFoundForFilters}</p>
        )}
      </Card>
    </div>
  );
};

export default UserAdvancedReportsPage;