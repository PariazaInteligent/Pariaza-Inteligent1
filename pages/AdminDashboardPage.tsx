import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UI_TEXT_ROMANIAN } from '../constants';
import { formatCurrency, getGreeting } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';
import { UsersIcon, ClipboardDocumentListIcon, DocumentTextIcon, ChartBarIcon, SparklesIcon, PresentationChartLineIcon } from '../components/ui/Icons';
import { TransactionStatus, TransactionType } from '../types';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading, fetchData } = useData();

  if (dataLoading || !appData || !user) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const { globalStats, transactions, users } = appData;
  const pendingInvestmentRequests = transactions?.filter(t => t.type === TransactionType.INVESTMENT_REQUEST && t.status === TransactionStatus.PENDING).length || 0;
  const pendingWithdrawalRequests = transactions?.filter(t => t.type === TransactionType.WITHDRAWAL_REQUEST && t.status === TransactionStatus.PENDING).length || 0;
  
  return (
    <div className="space-y-6 animate-slide-in-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
          {getGreeting()}, {user.name}! ({UI_TEXT_ROMANIAN.adminPanel})
        </h1>
        <Button onClick={() => fetchData(true)} variant="outline" size="sm">
          {UI_TEXT_ROMANIAN.refreshData}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Investit (Global)" icon={<ChartBarIcon className="h-8 w-8"/>}>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(globalStats?.totalInvested)}</p>
        </Card>
        <Card title="Investitori Activi (Global)" icon={<UsersIcon className="h-8 w-8"/>}>
          <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">{globalStats?.activeInvestors || 0}</p>
        </Card>
        <Card title="Cereri Investiții (Așteptare)" icon={<ClipboardDocumentListIcon className="h-8 w-8"/>}>
          <p className="text-3xl font-bold text-yellow-500">{pendingInvestmentRequests}</p>
          {pendingInvestmentRequests > 0 && <Link to="/admin/aprobari"><Button size="sm" variant="ghost" className="mt-2">Vezi Cereri</Button></Link>}
        </Card>
        <Card title="Cereri Retrageri (Așteptare)" icon={<ClipboardDocumentListIcon className="h-8 w-8"/>}>
          <p className="text-3xl font-bold text-orange-500">{pendingWithdrawalRequests}</p>
          {pendingWithdrawalRequests > 0 && <Link to="/admin/aprobari"><Button size="sm" variant="ghost" className="mt-2">Vezi Cereri</Button></Link>}
        </Card>
      </div>

       <Card title={UI_TEXT_ROMANIAN.adminMarketPulse} icon={<PresentationChartLineIcon className="h-7 w-7 text-purple-500" />}>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              {UI_TEXT_ROMANIAN.geminiMarketPulseReportDescription}
          </p>
          <Link to="/admin/market-pulse">
              <Button variant="secondary">
                  Accesează Pagina de Analiză
              </Button>
          </Link>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Acțiuni Administrative Rapide">
          <div className="space-y-3">
            <Link to="/admin/utilizatori">
              <Button variant="primary" className="w-full" leftIcon={<UsersIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.manageUsers}</Button>
            </Link>
            <Link to="/admin/date">
              <Button variant="secondary" className="w-full" leftIcon={<DocumentTextIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.dataManagement}</Button>
            </Link>
            <Link to="/admin/aprobari">
              <Button variant="outline" className="w-full" leftIcon={<ClipboardDocumentListIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.pendingRequests}</Button>
            </Link>
             <Link to="/admin/jurnal">
              <Button variant="ghost" className="w-full" leftIcon={<DocumentTextIcon className="h-5 w-5"/>}>{UI_TEXT_ROMANIAN.systemLog}</Button>
            </Link>
          </div>
        </Card>

        <Card title="Ultimele Activități din Sistem (Max 10)">
           {transactions && transactions.length > 0 ? (
            <ul className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {transactions
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 10) 
                .map(tx => (
                  <li key={tx.id} className="p-2 rounded bg-neutral-50 dark:bg-neutral-700/50">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-neutral-800 dark:text-neutral-100">{tx.description.substring(0,60)}{tx.description.length > 60 ? '...' : ''}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{new Date(tx.timestamp).toLocaleTimeString('ro-RO', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-300">
                        Tip: {tx.type} | Status: <span className={`font-semibold ${tx.status === 'PENDING' ? 'text-yellow-500' : tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'}`}>{tx.status}</span>
                        {tx.userId && ` | User: ${appData.users.find(u=>u.id === tx.userId)?.name.substring(0,15) || tx.userId.substring(0,5)}`}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;