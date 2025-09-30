
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { UI_TEXT_ROMANIAN } from '../constants';
import { TransactionType, TransactionStatus, Role } from '../types';
import Spinner from '../components/ui/Spinner';
import { BanknotesIcon } from '../components/ui/Icons';
import { formatCurrency, formatDate } from '../utils/helpers';

// TypeScript type for <stripe-buy-button> is defined in global.d.ts

// Workaround for TypeScript not recognizing the custom element
const StripeBuyButton = 'stripe-buy-button' as any;

const InvestmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading } = useData();

  if (dataLoading || !user || user.role !== Role.USER) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const currentUserData = appData?.users.find(u => u.id === user.id);
  
  const pendingInvestmentRequests = appData?.transactions
    .filter(t => t.userId === user.id && t.type === TransactionType.INVESTMENT_REQUEST && t.status === TransactionStatus.PENDING)
    .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <BanknotesIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.investments}
      </h1>

      <Card title="Adaugă Fonduri în Contul Tău (via Stripe)">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
          Pentru a adăuga fonduri, te rugăm să utilizezi butonul de plată securizat Stripe de mai jos. Suma investiției este predefinită.
          După finalizarea plății, un administrator va confirma și actualiza balanța ta.
        </p>
        
        <div className="my-6 flex justify-center">
          <StripeBuyButton
            buy-button-id="buy_btn_1RYXMPLMPT8gUuC7zON5udv4"
            publishable-key="pk_live_51O442uLMPT8gUuC7BXrpkQCUBE2SahyaiHovarYnmiDIUh7OA3dqwSPlBDMZWjPrTAx8XpKT2F1qm07g8x5uwP3j00afKnZc6I"
          >
          </StripeBuyButton>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
          Plățile sunt procesate în siguranță prin Stripe. {UI_TEXT_ROMANIAN.appName} nu stochează informațiile cardului tău.
          Investiția va fi reflectată în cont după confirmarea plății.
        </p>
      </Card>

      <Card title="Statutul Cererilor Anterioare de Investiție">
        <p className="mb-4 text-lg">Suma totală investită și aprobată: <span className="font-bold text-green-500">{formatCurrency(currentUserData?.profileData.investedAmount)}</span></p>
        
        <h3 className="text-xl font-semibold mb-3 text-neutral-700 dark:text-neutral-200">Cereri de Investiție (Non-Stripe) în Așteptare</h3>
        {pendingInvestmentRequests && pendingInvestmentRequests.length > 0 ? (
          <ul className="space-y-3">
            {pendingInvestmentRequests.map(req => (
              <li key={req.id} className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">Suma: {formatCurrency(req.amount)}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Data cererii: {formatDate(req.timestamp)}</p>
                  </div>
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100">
                    {req.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">Nu ai cereri de investiție (non-Stripe) în așteptare.</p>
        )}
         <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">Notă: Investițiile noi realizate prin Stripe nu vor apărea aici ca cereri în așteptare. Ele vor fi adăugate direct în istoricul de mai jos după procesare.</p>
      </Card>
      
      <Card title="Istoricul Investițiilor Aprobate">
            {currentUserData?.profileData.investmentHistory && currentUserData.profileData.investmentHistory.filter(h => h.type === 'DEPOSIT').length > 0 ? (
                <ul className="max-h-60 overflow-y-auto space-y-2">
                    {currentUserData.profileData.investmentHistory
                        .filter(h => h.type === 'DEPOSIT')
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((item, index) => (
                        <li key={index} className="flex justify-between items-center p-3 rounded-md bg-neutral-50 dark:bg-neutral-700/50">
                            <div>
                                <p className="font-medium text-neutral-800 dark:text-neutral-100">Investiție</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(item.date)}</p>
                            </div>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(item.amount)}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
            )}
        </Card>

    </div>
  );
};

export default InvestmentsPage;
