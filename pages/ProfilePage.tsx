import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client'; // For PDF generation
import { useAuth, AuthProvider } from '../contexts/AuthContext'; // Import AuthProvider
import { useData, DataProvider } from '../contexts/DataContext'; // Import DataProvider
import { useNotifications, NotificationProvider } from '../contexts/NotificationContext'; // Import NotificationProvider
import { useTheme as useAppTheme, ThemeProvider, useTheme } from '../contexts/ThemeContext'; // useTheme is also ThemeContext's hook, Import ThemeProvider
import Card from '../components/ui/Card';
import Input, {Textarea} from '../components/ui/Input';
import Button from '../components/ui/Button';
import SwitchToggle from '../components/ui/SwitchToggle';
import { UI_TEXT_ROMANIAN, BADGE_DEFINITIONS, ACCENT_COLOR_PALETTES, INTERFACE_DENSITY_OPTIONS, TRANSACTION_TYPE_FRIENDLY_NAMES } from '../constants';
import { User, Role, NotificationType, TransactionType, TransactionStatus, UserBadge, AuditDetail, UserProfileData, Transaction, AccentPaletteKey, InterfaceDensity } from '../types'; 
import Spinner from '../components/ui/Spinner';
import { UserCircleIcon, PencilSquareIcon, TrophyIcon, DocumentTextIcon, TableCellsIcon, ArrowDownTrayIcon, CogIcon, FilterIcon, ArrowsUpDownIcon, ChevronDownIcon, ChevronUpIcon, ChatBubbleLeftEllipsisIcon } from '../components/ui/Icons'; 
import { formatDate, formatCurrency, generateAuditDetails } from '../utils/helpers';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
import { exportToXLSX } from '../utils/exportService'; 
import Modal from '../components/ui/Modal'; 
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter'; 
import { HashRouter } from 'react-router-dom';
import BadgeCard from '../components/ui/BadgeCard';

const relevantTransactionTypes: TransactionType[] = [
  TransactionType.INVESTMENT_REQUEST,
  TransactionType.INVESTMENT_APPROVAL,
  TransactionType.INVESTMENT_REJECTION,
  TransactionType.WITHDRAWAL_REQUEST,
  TransactionType.WITHDRAWAL_APPROVAL,
  TransactionType.WITHDRAWAL_REJECTION,
  TransactionType.PROFIT_DISTRIBUTION,
  TransactionType.FEE_COLLECTION,
];

const relevantTransactionStatuses: TransactionStatus[] = [
    TransactionStatus.PENDING,
    TransactionStatus.APPROVED,
    TransactionStatus.REJECTED,
    TransactionStatus.COMPLETED,
];


export const ProfilePage: React.FC = () => {
  const { user, loadingAuth } = useAuth();
  const { appData, loading: dataLoading, updateUserInContext, addTransaction, checkUserBadgesOnLoad, exportData } = useData(); 
  const { addNotification } = useNotifications();
  const { theme: currentAppTheme, accentPalette: currentAccentPalette, interfaceDensity: currentInterfaceDensity, setAccentPalette, setInterfaceDensity } = useTheme();


  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [profileDataForm, setProfileDataForm] = useState<Partial<UserProfileData>>({});
  
  const [formAccentPalette, setFormAccentPalette] = useState<AccentPaletteKey>(currentAccentPalette);
  const [formInterfaceDensity, setFormInterfaceDensity] = useState<InterfaceDensity>(currentInterfaceDensity);

  // Filters and Sorting for transaction history
  const [transactionDateRange, setTransactionDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedTransactionTypes, setSelectedTransactionTypes] = useState<TransactionType[]>(() => [...relevantTransactionTypes]);
  const [selectedTransactionStatuses, setSelectedTransactionStatuses] = useState<TransactionStatus[]>(() => [...relevantTransactionStatuses]);
  const [sortConfig, setSortConfig] = useState<{ key: 'timestamp' | 'amount'; direction: 'ascending' | 'descending' }>({
    key: 'timestamp',
    direction: 'descending',
  });
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);


  const [pdfExportTheme, setPdfExportTheme] = useState<'light' | 'dark'>(currentAppTheme);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [isXlsxExportModalOpen, setIsXlsxExportModalOpen] = useState(false);
  const [xlsxExportDateRange, setXlsxExportDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState(false);


  const currentUserDetails = appData?.users.find(u => u.id === user?.id);

  useEffect(() => {
    if (user && currentUserDetails) {
      setFormData({
        name: currentUserDetails.name,
        email: currentUserDetails.email, 
        avatar: currentUserDetails.avatar,
      });
      setProfileDataForm({
          contactPhone: currentUserDetails.profileData.contactPhone,
          address: currentUserDetails.profileData.address,
          accentPalette: currentUserDetails.profileData.accentPalette || currentAccentPalette,
          interfaceDensity: currentUserDetails.profileData.interfaceDensity || currentInterfaceDensity,
      });
      setFormAccentPalette(currentUserDetails.profileData.accentPalette || currentAccentPalette);
      setFormInterfaceDensity(currentUserDetails.profileData.interfaceDensity || currentInterfaceDensity);

      if (!isEditing) { 
        checkUserBadgesOnLoad(user.id);
      }
      setPdfExportTheme(currentAppTheme); 
    }
  }, [user, currentUserDetails, isEditing, checkUserBadgesOnLoad, currentAppTheme, currentAccentPalette, currentInterfaceDensity]); 

  const userMessages = useMemo(() => {
    if (!appData?.userMessages || !user) return [];
    return [...appData.userMessages]
      .filter(msg => msg.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [appData?.userMessages, user]);

  const filteredTransactions = useMemo(() => {
    if (!appData || !user) return [];

    const currentUserData = appData.users.find(u => u.id === user.id);
    let combinedTransactions: Transaction[] = [];

    const mainUserTransactions = (appData.transactions || [])
      .filter(t => t.userId === user.id && t.type !== TransactionType.PROFIT_DISTRIBUTION && t.type !== TransactionType.FEE_COLLECTION);
    combinedTransactions.push(...mainUserTransactions);

    if (currentUserData?.profileData.investmentHistory) {
      const historyTransactions = currentUserData.profileData.investmentHistory
        .map((item, index): Transaction | null => {
          let transactionTypeForReport: TransactionType | null = null;
          let description = '';
          if (item.type === 'PROFIT_PAYOUT') {
             transactionTypeForReport = TransactionType.PROFIT_DISTRIBUTION;
             description = item.amount >= 0 ? 'Distribuire profit (din istoric)' : 'Acoperire pierdere (din istoric)';
          } else if (item.type === 'FEE') {
             transactionTypeForReport = TransactionType.FEE_COLLECTION;
             description = 'Colectare taxă platformă (din istoric)';
          } else if (item.type === 'DEPOSIT') {
             transactionTypeForReport = TransactionType.INVESTMENT_APPROVAL;
             description = 'Depunere aprobată (din istoric)';
          } else if (item.type === 'WITHDRAWAL') {
             transactionTypeForReport = TransactionType.WITHDRAWAL_APPROVAL;
             description = 'Retragere aprobată (din istoric)';
          }
          if (!transactionTypeForReport) return null;
          return {
            id: `hist_${user.id}_${item.date}_${index}`,
            timestamp: item.date,
            userId: user.id,
            type: transactionTypeForReport,
            amount: item.amount,
            status: TransactionStatus.COMPLETED,
            description: description,
          };
        }).filter((t): t is Transaction => t !== null);
      combinedTransactions.push(...historyTransactions);
    }
    
    const uniqueTransactions = Array.from(new Map(combinedTransactions.map(t => [t.id, t])).values());

    const filtered = uniqueTransactions.filter(t => {
        if (selectedTransactionTypes.length > 0 && !selectedTransactionTypes.includes(t.type)) return false;
        if (selectedTransactionStatuses.length > 0 && !selectedTransactionStatuses.includes(t.status)) return false;
        if (transactionDateRange.startDate && new Date(t.timestamp).toISOString().split('T')[0] < transactionDateRange.startDate) return false;
        if (transactionDateRange.endDate && new Date(t.timestamp).toISOString().split('T')[0] > transactionDateRange.endDate) return false;
        return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if ((aVal === undefined || aVal === null) && (bVal !== undefined && bVal !== null)) return 1;
        if ((bVal === undefined || bVal === null) && (aVal !== undefined && aVal !== null)) return -1;
        if ((aVal === undefined || aVal === null) && (bVal === undefined || bVal === null)) return 0;
        
        if (aVal! < bVal!) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal! > bVal!) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    return filtered;

  }, [appData, user, selectedTransactionTypes, selectedTransactionStatuses, transactionDateRange, sortConfig]);


  if (loadingAuth || dataLoading || !user || !appData || !currentUserDetails) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const handleTransactionTypeChange = (type: TransactionType) => {
    setSelectedTransactionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleStatusChange = (status: TransactionStatus) => {
    setSelectedTransactionStatuses(prev =>
        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };
  
  const toggleSelectAllTransactionTypes = (select: boolean) => {
    setSelectedTransactionTypes(select ? [...relevantTransactionTypes] : []);
  };
  
  const toggleSelectAllStatuses = (select: boolean) => {
    setSelectedTransactionStatuses(select ? [...relevantTransactionStatuses] : []);
  };

  const requestSort = (key: 'timestamp' | 'amount') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: 'timestamp' | 'amount') => {
    if (sortConfig.key !== key) {
        return <ArrowsUpDownIcon className="h-4 w-4 ml-1 text-neutral-400 inline" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ChevronUpIcon className="h-4 w-4 ml-1 inline text-primary-500" />;
    }
    return <ChevronDownIcon className="h-4 w-4 ml-1 inline text-primary-500" />;
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['contactPhone', 'address'].includes(name)) { 
        setProfileDataForm(prev => ({ ...prev, [name]: value }));
    } else { 
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserDetails) return;
    
    const updatedUserDataPart: Partial<User> = {
      name: formData.name,
      avatar: formData.avatar,
    };

    const updatedProfileDataPart: Partial<User['profileData']> = {
        contactPhone: profileDataForm.contactPhone,
        address: profileDataForm.address,
        accentPalette: formAccentPalette,
        interfaceDensity: formInterfaceDensity,
    };
    
    const updatedUser: User = {
      ...currentUserDetails,
      ...updatedUserDataPart,
      profileData: {
        ...currentUserDetails.profileData,
        ...updatedProfileDataPart,
      }
    };
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const fieldsToAuditUser: string[] = ['name', 'avatar'];
      const fieldsToAuditProfile: (keyof UserProfileData)[] = ['contactPhone', 'address', 'accentPalette', 'interfaceDensity'];
      
      const userChanges = generateAuditDetails(currentUserDetails, updatedUser, fieldsToAuditUser, {
        name: 'Nume', avatar: 'URL Avatar'
      });
      const profileChanges = generateAuditDetails(currentUserDetails.profileData, updatedUser.profileData, fieldsToAuditProfile as string[], {
        contactPhone: 'Telefon Contact', address: 'Adresă', accentPalette: 'Paletă Accent', interfaceDensity: 'Densitate Interfață'
      });
      
      const allChangedFields = [...userChanges, ...profileChanges];

      updateUserInContext(updatedUser);
      
      setAccentPalette(formAccentPalette);
      setInterfaceDensity(formInterfaceDensity);
      
      if (allChangedFields.length > 0) {
        addTransaction({
            userId: user.id,
            type: TransactionType.USER_UPDATED,
            status: TransactionStatus.COMPLETED,
            description: `Profilul utilizatorului ${user.name} a fost actualizat.`,
            details: { changedFields: allChangedFields }
        });
        const themeChanges = profileChanges.filter(c => c.fieldName === 'Paletă Accent' || c.fieldName === 'Densitate Interfață');
        if (themeChanges.length > 0 && allChangedFields.length === themeChanges.length) {
            addTransaction({
                userId: user.id,
                type: TransactionType.USER_INTERFACE_PREFERENCES_UPDATED,
                status: TransactionStatus.COMPLETED,
                description: `Preferințele de interfață pentru ${user.name} au fost actualizate.`,
                details: { changedFields: themeChanges }
            });
        }

      }
      addNotification(UI_TEXT_ROMANIAN.profileUpdated, NotificationType.SUCCESS);
      setIsEditing(false);
      const updatedUsersList = appData.users.map(u => u.id === updatedUser.id ? updatedUser : u);
      await exportData('users', updatedUsersList);


    } catch (err) {
      addNotification(`Eroare la actualizarea profilului: ${(err as Error).message}`, NotificationType.ERROR);
    }
  };

  const earnedBadges = currentUserDetails.profileData.badges || [];

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      addNotification("Nicio tranzacție de exportat conform filtrelor selectate.", NotificationType.INFO);
      return;
    }
    setIsGeneratingCsv(true);
    addNotification(UI_TEXT_ROMANIAN.exportGeneratingCsv, NotificationType.INFO);

    setTimeout(() => { 
        try {
            let csvContent = "Data,Tip Tranzactie,Suma (EUR),Descriere,Status\n";
            filteredTransactions.forEach(item => {
                const row = [
                    formatDate(item.timestamp, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    TRANSACTION_TYPE_FRIENDLY_NAMES[item.type] || item.type,
                    item.amount !== undefined ? item.amount.toFixed(2) : '',
                    `"${item.description.replace(/"/g, '""')}"`, // Escape quotes
                    item.status
                ].join(',');
                csvContent += row + "\n";
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const safeUserName = currentUserDetails.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `Istoric_Tranzactii_${safeUserName}_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addNotification(UI_TEXT_ROMANIAN.exportCsvSuccess, NotificationType.SUCCESS);
        } catch (error) {
            addNotification(UI_TEXT_ROMANIAN.exportError, NotificationType.ERROR);
            console.error("CSV Export Error:", error);
        } finally {
            setIsGeneratingCsv(false);
        }
    }, 500);
  };

  const PdfTransactionHistoryContent: React.FC<{history: Transaction[], userName: string, theme: 'light' | 'dark'}> = ({history, userName, theme}) => {
    const bgColor = theme === 'dark' ? 'bg-neutral-900' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-neutral-100' : 'text-neutral-800';
    const borderColor = theme === 'dark' ? 'border-neutral-700' : 'border-neutral-300';
    const thClass = `p-2 text-left text-xs font-semibold ${theme === 'dark' ? 'text-neutral-300 bg-neutral-800' : 'text-neutral-600 bg-neutral-100'}`;
    const tdClass = `p-2 text-sm ${borderColor} ${theme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`;

    return (
        React.createElement('div', { className: `pdf-render-area-profile p-4 ${bgColor} ${textColor}` }, 
            React.createElement('h1', { className: 'text-xl font-bold mb-4' }, `Istoric Tranzacții - ${userName}`),
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                React.createElement('thead', null,
                    React.createElement('tr', null,
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, 'Data'),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, 'Tip'),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } }, 'Status'),
                        React.createElement('th', { className: thClass, style: { border: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}`, textAlign: 'right' } }, 'Suma (EUR)')
                    )
                ),
                React.createElement('tbody', null,
                    history.map((item) =>
                        React.createElement('tr', { key: item.id, style: { borderBottom: `1px solid ${theme === 'dark' ? '#404040' : '#e0e0e0'}` } },
                            React.createElement('td', { className: tdClass }, formatDate(item.timestamp, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
                            React.createElement('td', { className: tdClass }, TRANSACTION_TYPE_FRIENDLY_NAMES[item.type] || item.type),
                            React.createElement('td', { className: tdClass }, item.status),
                            React.createElement('td', { className: tdClass, style: { textAlign: 'right', color: (item.amount || 0) >= 0 ? (theme === 'dark' ? '#4ade80': '#16a34a') : (theme === 'dark' ? '#f87171': '#dc2626') } }, item.amount !== undefined ? formatCurrency(item.amount) : '-')
                        )
                    )
                )
            )
        )
    );
  };


  const handleExportPdf = async () => {
    if (filteredTransactions.length === 0) {
        addNotification("Nicio tranzacție de exportat conform filtrelor selectate.", NotificationType.INFO);
        return;
    }
    
    setIsGeneratingPdf(true);
    addNotification(UI_TEXT_ROMANIAN.exportGeneratingPdf, NotificationType.INFO);
    
    const offscreenDiv = document.createElement('div');
    offscreenDiv.style.position = 'absolute';
    offscreenDiv.style.left = '-9999px'; 
    offscreenDiv.style.top = '-9999px';
    offscreenDiv.style.width = '800px'; 
    document.body.appendChild(offscreenDiv);

    const pdfRoot = ReactDOM.createRoot(offscreenDiv);
    pdfRoot.render(
      <React.StrictMode>
        <HashRouter>
          <NotificationProvider>
            <AuthProvider>
              <DataProvider>
                <ThemeProvider forcedTheme={pdfExportTheme}>
                  <PdfTransactionHistoryContent history={filteredTransactions} userName={currentUserDetails.name} theme={pdfExportTheme} />
                </ThemeProvider>
              </DataProvider>
            </AuthProvider>
          </NotificationProvider>
        </HashRouter>
      </React.StrictMode>
    );

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const reportElement = offscreenDiv.querySelector('.pdf-render-area-profile') as HTMLElement;
        if(!reportElement) throw new Error("PDF content element not found.");

        const canvas = await html2canvas(reportElement, { 
            scale: 2, useCORS: true, logging: false, backgroundColor: pdfExportTheme === 'dark' ? '#0f172a' : '#ffffff', 
            onclone: (doc) => { if (pdfExportTheme === 'dark') doc.documentElement.classList.add('dark'); }
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const { width: pdfWidth, height: pdfHeight } = pdf.internal.pageSize;
        const imgProps = pdf.getImageProperties(imgData);
        const margin = 40;
        const ratio = Math.min((pdfWidth - margin * 2) / imgProps.width, (pdfHeight - margin * 2) / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
        const safeUserName = currentUserDetails.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const timestamp = new Date().toISOString().split('T')[0];
        pdf.save(`Istoric_Tranzactii_${safeUserName}_${timestamp}_(${pdfExportTheme}).pdf`);
        addNotification(UI_TEXT_ROMANIAN.exportPdfSuccess, NotificationType.SUCCESS);
    } catch (pdfError) {
        addNotification(UI_TEXT_ROMANIAN.exportError, NotificationType.ERROR);
        console.error("PDF Export Error:", pdfError);
    } finally {
        pdfRoot.unmount();
        document.body.removeChild(offscreenDiv);
        setIsGeneratingPdf(false);
    }
  };

  const handleExportXlsx = () => {
    setIsGeneratingXlsx(true);
    addNotification("Se pregătește fișierul XLSX...", NotificationType.INFO);
    try {
      const transactionsForExport = (appData.transactions || [])
        .filter(t => {
            if (t.userId !== user?.id) return false;
            if (xlsxExportDateRange.startDate && new Date(t.timestamp).toISOString().split('T')[0] < xlsxExportDateRange.startDate) return false;
            if (xlsxExportDateRange.endDate && new Date(t.timestamp).toISOString().split('T')[0] > xlsxExportDateRange.endDate) return false;
            return true;
        })
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if(transactionsForExport.length === 0){
            addNotification("Nu s-au găsit tranzacții pentru intervalul selectat.", NotificationType.WARNING);
            return;
        }

      const headers = {
        timestamp: UI_TEXT_ROMANIAN.tableHeaderDate,
        type: UI_TEXT_ROMANIAN.tableHeaderType,
        description: UI_TEXT_ROMANIAN.tableHeaderDescription,
        amount: UI_TEXT_ROMANIAN.tableHeaderAmount,
        status: UI_TEXT_ROMANIAN.tableHeaderStatus,
      };
      
      const dataForXLSX = transactionsForExport.map(t => ({
        timestamp: t.timestamp,
        type: TRANSACTION_TYPE_FRIENDLY_NAMES[t.type] || t.type,
        description: t.description,
        amount: t.amount,
        status: t.status,
      }));

      const safeUserName = currentUserDetails.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().split('T')[0];

      exportToXLSX(dataForXLSX, `Istoric_Avansat_${safeUserName}_${timestamp}.xlsx`, 'Tranzacții', headers);
      addNotification(UI_TEXT_ROMANIAN.xlsxExportSuccess, NotificationType.SUCCESS);

    } catch(err) {
      addNotification(UI_TEXT_ROMANIAN.xlsxExportFailed, NotificationType.ERROR);
      console.error(err);
    } finally {
      setIsGeneratingXlsx(false);
      setIsXlsxExportModalOpen(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header Card */}
      <Card>
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <img
            src={currentUserDetails.avatar}
            alt={currentUserDetails.name}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-4 border-primary-300 dark:border-primary-500"
          />
          <div className="flex-grow text-center md:text-left">
            <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{currentUserDetails.name}</h1>
            <p className="text-neutral-600 dark:text-neutral-300">{currentUserDetails.email}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Membru din: {formatDate(currentUserDetails.profileData.joinDate)}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Ultima autentificare: {currentUserDetails.lastLogin ? formatDate(currentUserDetails.lastLogin) : 'N/A'}</p>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? 'secondary' : 'primary'}
              size="sm"
              leftIcon={<PencilSquareIcon className="h-5 w-5" />}
              className="mt-4"
            >
              {isEditing ? UI_TEXT_ROMANIAN.cancel : UI_TEXT_ROMANIAN.editProfile}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Edit Form Card (Conditional) */}
      {isEditing && (
        <Card title={UI_TEXT_ROMANIAN.editProfile}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nume" name="name" value={formData.name || ''} onChange={handleInputChange} />
                <Input label="URL Avatar" name="avatar" value={formData.avatar || ''} onChange={handleInputChange} />
                <Input label="Telefon Contact (Opțional)" name="contactPhone" value={profileDataForm.contactPhone || ''} onChange={handleInputChange} />
                <Input label="Adresă (Opțional)" name="address" value={profileDataForm.address || ''} onChange={handleInputChange} />
            </div>
            
             <Card title={UI_TEXT_ROMANIAN.themeCustomizationTitle} icon={<CogIcon className="h-5 w-5"/>} bodyClassName="space-y-4">
                <div>
                  <label htmlFor="accentPalette" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.accentColorLabel}</label>
                  <select
                    id="accentPalette"
                    value={formAccentPalette}
                    onChange={(e) => setFormAccentPalette(e.target.value as AccentPaletteKey)}
                    className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {Object.entries(ACCENT_COLOR_PALETTES).map(([key, { name }]) => (
                        <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                    <label htmlFor="interfaceDensity" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{UI_TEXT_ROMANIAN.interfaceDensityLabel}</label>
                    <select
                        id="interfaceDensity"
                        value={formInterfaceDensity}
                        onChange={(e) => setFormInterfaceDensity(e.target.value as InterfaceDensity)}
                        className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
                    >
                         {Object.entries(INTERFACE_DENSITY_OPTIONS).map(([key, { name }]) => (
                            <option key={key} value={key}>{name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">{UI_TEXT_ROMANIAN.updateProfile}</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Badges Card */}
      <Card title={UI_TEXT_ROMANIAN.badgesSectionTitle} icon={<TrophyIcon className="h-6 w-6 text-yellow-500"/>}>
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {earnedBadges.map((badge: UserBadge) => (
              <BadgeCard key={badge.badgeType} badge={badge} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">{UI_TEXT_ROMANIAN.noBadgesEarned}</p>
        )}
      </Card>
      
      {/* Messages from Admin */}
      {userMessages.length > 0 && (
         <Card title="Mesaje de la Administrator" icon={<ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-primary-500"/>}>
             <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                 {userMessages.slice(0, 5).map(msg => ( // Show latest 5 messages
                     <div key={msg.id} className={`p-3 rounded-lg border-l-4 ${msg.isRead ? 'border-neutral-300 dark:border-neutral-600' : 'border-primary-500'}`}>
                         <h4 className="font-semibold text-neutral-800 dark:text-neutral-100">{msg.title}</h4>
                         <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{formatDate(msg.createdAt)}</p>
                         <p className="text-sm text-neutral-600 dark:text-neutral-300">{msg.content}</p>
                     </div>
                 ))}
             </div>
         </Card>
      )}


       {/* Transaction History Card */}
      <Card title={UI_TEXT_ROMANIAN.profileExportCardTitle}>
        <div className="space-y-4">
            <Button 
                variant="outline" 
                onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                leftIcon={<FilterIcon className="h-5 w-5"/>}
            >
                {isFiltersVisible ? "Ascunde Filtre" : "Filtrează Istoricul"}
            </Button>
            {isFiltersVisible && (
                 <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg animate-fade-in space-y-4">
                    <DateRangeFilter onRangeChange={setTransactionDateRange} initialRangeType="all" />
                    <div>
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Tip Tranzacție</h4>
                         <div className="flex space-x-2 mb-2">
                            <Button size="sm" variant="outline" onClick={() => toggleSelectAllTransactionTypes(true)}>{UI_TEXT_ROMANIAN.selectAllTransactionTypes}</Button>
                            <Button size="sm" variant="outline" onClick={() => toggleSelectAllTransactionTypes(false)}>{UI_TEXT_ROMANIAN.deselectAllTransactionTypes}</Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {relevantTransactionTypes.map(type => (
                                <label key={type} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer">
                                    <input type="checkbox" checked={selectedTransactionTypes.includes(type)} onChange={() => handleTransactionTypeChange(type)} className="form-checkbox h-4 w-4 text-primary-600 rounded" />
                                    <span className="text-xs">{TRANSACTION_TYPE_FRIENDLY_NAMES[type] || type}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Status Tranzacție</h4>
                         <div className="flex space-x-2 mb-2">
                            <Button size="sm" variant="outline" onClick={() => toggleSelectAllStatuses(true)}>{UI_TEXT_ROMANIAN.selectAllTransactionTypes.replace('Tipuri', 'Statusuri')}</Button>
                            <Button size="sm" variant="outline" onClick={() => toggleSelectAllStatuses(false)}>{UI_TEXT_ROMANIAN.deselectAllTransactionTypes.replace('Tipuri', 'Statusuri')}</Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {relevantTransactionStatuses.map(status => (
                                <label key={status} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer">
                                    <input type="checkbox" checked={selectedTransactionStatuses.includes(status)} onChange={() => handleStatusChange(status)} className="form-checkbox h-4 w-4 text-primary-600 rounded" />
                                    <span className="text-xs">{status}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <Button onClick={handleExportCsv} variant="secondary" leftIcon={<DocumentTextIcon className="h-5 w-5"/>} isLoading={isGeneratingCsv} disabled={isGeneratingPdf}>{UI_TEXT_ROMANIAN.exportTransactionsCsvButton}</Button>
              <Button onClick={() => setIsXlsxExportModalOpen(true)} variant="secondary" leftIcon={<TableCellsIcon className="h-5 w-5"/>} disabled={isGeneratingPdf}>{UI_TEXT_ROMANIAN.advancedExportXLSXButton}</Button>
              <div className="flex items-center gap-2">
                <Button onClick={handleExportPdf} variant="primary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5"/>} isLoading={isGeneratingPdf} disabled={isGeneratingCsv}>{UI_TEXT_ROMANIAN.exportTransactionsPdfButton}</Button>
                 <select value={pdfExportTheme} onChange={(e) => setPdfExportTheme(e.target.value as 'light' | 'dark')} className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-xs">
                    <option value="light">{UI_TEXT_ROMANIAN.lightMode}</option>
                    <option value="dark">{UI_TEXT_ROMANIAN.darkMode}</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase cursor-pointer" onClick={() => requestSort('timestamp')}>
                                {UI_TEXT_ROMANIAN.tableHeaderDate} {getSortIcon('timestamp')}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderType}</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderDescription}</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase cursor-pointer" onClick={() => requestSort('amount')}>
                                {UI_TEXT_ROMANIAN.tableHeaderAmount} {getSortIcon('amount')}
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">{UI_TEXT_ROMANIAN.tableHeaderStatus}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDate(t.timestamp)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">{TRANSACTION_TYPE_FRIENDLY_NAMES[t.type] || t.type}</td>
                                <td className="px-3 py-2 text-sm max-w-sm truncate" title={t.description}>{t.description}</td>
                                <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-semibold ${(t.amount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {t.amount !== undefined ? formatCurrency(t.amount) : '-'}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : t.status === 'COMPLETED' || t.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {t.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredTransactions.length === 0 && <p className="text-center py-6 text-neutral-500">{UI_TEXT_ROMANIAN.noTransactionsFoundForFilters}</p>}
            </div>
        </div>
      </Card>

      <Modal isOpen={isXlsxExportModalOpen} onClose={() => setIsXlsxExportModalOpen(false)} title={UI_TEXT_ROMANIAN.exportOptionsTitle}>
        <div className="space-y-4">
            <DateRangeFilter onRangeChange={setXlsxExportDateRange} initialRangeType="all" />
            <div className="flex justify-end pt-4">
                <Button variant="primary" onClick={handleExportXlsx} isLoading={isGeneratingXlsx} disabled={isGeneratingXlsx}>
                    {UI_TEXT_ROMANIAN.exportButton}
                </Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};
