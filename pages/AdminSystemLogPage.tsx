import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import { UI_TEXT_ROMANIAN, TRANSACTION_TYPE_FRIENDLY_NAMES } from '../constants';
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon } from '../components/ui/Icons';
import Button from '../components/ui/Button'; // Import Button component
import { useData } from '../contexts/DataContext';
import Spinner from '../components/ui/Spinner';
import { formatDate } from '../utils/helpers';
import { Transaction, AuditDetail, Role, TransactionType } from '../types';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter'; // Import DateRangeFilter

const AuditDetailsDisplay: React.FC<{ details?: AuditDetail[], initialValues?: Record<string, any>, deletedValues?: Record<string, any> }> = ({ details, initialValues, deletedValues }) => {
  if (details && details.length > 0) {
    return (
      <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-700/70 rounded-md shadow-inner text-xs">
        <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1.5">Detalii Modificări:</h4>
        <ul className="list-disc list-inside space-y-1 pl-3">
          {details.map((change, index) => (
            <li key={index} className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <span className="font-medium">{change.fieldName}:</span> 
              <em className="text-neutral-500 dark:text-neutral-400 mx-1 break-all">{String(change.oldValue)}</em> 
              <span className="font-bold text-primary-600 dark:text-primary-400 mx-1">➔</span> 
              <strong className="text-neutral-700 dark:text-neutral-200 break-all">{String(change.newValue)}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (initialValues && Object.keys(initialValues).length > 0) {
     return (
      <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-700/70 rounded-md shadow-inner text-xs">
        <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1.5">Valori Inițiale:</h4>
        <ul className="list-disc list-inside space-y-1 pl-3">
          {Object.entries(initialValues).map(([key, value]) => (
            <li key={key} className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <span className="font-medium">{key}:</span> <span className="break-all">{String(value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
   if (deletedValues && Object.keys(deletedValues).length > 0) {
     return (
      <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-700/70 rounded-md shadow-inner text-xs">
        <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1.5">Valori Șterse:</h4>
        <ul className="list-disc list-inside space-y-1 pl-3">
          {Object.entries(deletedValues).map(([key, value]) => (
            <li key={key} className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <span className="font-medium">{key}:</span> <span className="break-all">{String(value)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 italic">Nicio modificare specifică sau valoare detaliată înregistrată.</p>;
};


const AdminSystemLogPage: React.FC = () => {
  const { appData, loading } = useData();
  const [expandedLogRowId, setExpandedLogRowId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('ALL');
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const allTransactionTypes = useMemo(() => Object.values(TransactionType), []);
  const adminUsers = useMemo(() => appData?.users.filter(u => u.role === Role.ADMIN) || [], [appData?.users]);


  const filteredLogs = useMemo(() => {
    if (!appData?.transactions) return [];
    let logs = [...appData.transactions];

    // Date Range Filter
    if (dateRange.startDate) {
      logs = logs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] >= dateRange.startDate!);
    }
    if (dateRange.endDate) {
      logs = logs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] <= dateRange.endDate!);
    }

    // Transaction Type Filter
    if (selectedTypes.length > 0) {
      logs = logs.filter(log => selectedTypes.includes(log.type));
    }

    // Admin Filter
    if (selectedAdminId !== 'ALL') {
      logs = logs.filter(log => log.adminId === selectedAdminId);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [appData?.transactions, dateRange, selectedTypes, selectedAdminId]);


  const toggleExpandRow = (logId: string) => {
    setExpandedLogRowId(expandedLogRowId === logId ? null : logId);
  };
  
  const handleTypeChange = (type: TransactionType) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  if (loading || !appData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
          <DocumentTextIcon className="h-8 w-8 mr-3 text-primary-500" />
          {UI_TEXT_ROMANIAN.systemLog}
        </h1>
        <Button 
            variant="outline" 
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
            leftIcon={<FilterIcon className="h-5 w-5"/>}
        >
            {isFiltersVisible ? "Ascunde Filtre" : "Afișează Filtre"}
        </Button>
      </div>
      
      {isFiltersVisible && (
        <Card title="Filtre Avansate" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Interval de Date</h3>
                    <DateRangeFilter onRangeChange={setDateRange} initialRangeType="all" />
                </div>
                <div>
                    <label htmlFor="adminFilter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Filtrează după Admin</label>
                    <select 
                        id="adminFilter" 
                        value={selectedAdminId} 
                        onChange={(e) => setSelectedAdminId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="ALL">Toți Adminii</option>
                        {adminUsers.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="mt-6">
                <h3 className="text-md font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Tipul Acțiunii</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-2 border rounded-md dark:border-neutral-700">
                    {allTransactionTypes.map(type => (
                        <label key={type} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={selectedTypes.includes(type)} 
                                onChange={() => handleTypeChange(type)}
                                className="form-checkbox h-4 w-4 text-primary-600 rounded border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 focus:ring-primary-500 dark:focus:ring-primary-400 dark:ring-offset-neutral-800"
                            />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">{TRANSACTION_TYPE_FRIENDLY_NAMES[type] || type}</span>
                        </label>
                    ))}
                </div>
                 <div className="mt-3 flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedTypes([...allTransactionTypes])}>{UI_TEXT_ROMANIAN.selectAllTransactionTypes}</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedTypes([])}>{UI_TEXT_ROMANIAN.deselectAllTransactionTypes}</Button>
                </div>
            </div>
        </Card>
      )}


      <Card>
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Tip</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Descriere</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Utilizator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase">Detalii Scurte</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800/50 divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredLogs.map((log: Transaction) => {
                  const userInvolved = log.userId ? appData.users.find(u => u.id === log.userId) : null;
                  const adminInvolved = log.adminId ? appData.users.find(u => u.id === log.adminId) : null;
                  
                  const hasExpandableDetails = log.details && (
                    (Array.isArray(log.details.changedFields) && log.details.changedFields.length > 0) ||
                    (log.details.initialValues && Object.keys(log.details.initialValues).length > 0) ||
                    (log.details.deletedValues && Object.keys(log.details.deletedValues).length > 0)
                  );
                  const isExpanded = expandedLogRowId === log.id;
                  let shortDetailsText = '-';
                  if (log.details?.changedFields?.length) shortDetailsText = `${log.details.changedFields.length} câmp(uri) modificate.`;
                  else if (log.details?.initialValues) shortDetailsText = `Valori inițiale înregistrate.`;
                  else if (log.details?.deletedValues) shortDetailsText = `Valori șterse înregistrate.`;
                  else if (log.details) shortDetailsText = Object.keys(log.details).slice(0,2).map(k => `${k}: ${String(log.details![k]).substring(0,15)}...`).join(', ');


                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                        <td className="px-2 py-3 whitespace-nowrap">
                          {hasExpandableDetails && (
                            <button
                              onClick={() => toggleExpandRow(log.id)}
                              className="p-1 text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400"
                              aria-expanded={isExpanded}
                              aria-controls={`details-${log.id}`}
                            >
                              {isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                              <span className="sr-only">Extinde detalii</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{formatDate(log.timestamp)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{TRANSACTION_TYPE_FRIENDLY_NAMES[log.type] || log.type}</td>
                        <td className="px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100 max-w-sm break-words">{log.description}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{userInvolved ? `${userInvolved.name}` : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-300">{adminInvolved ? `${adminInvolved.name}` : '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                           <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 
                              log.status === 'COMPLETED' || log.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                              log.status === 'REJECTED' || log.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' :
                              'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs truncate" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                           {shortDetailsText}
                        </td>
                      </tr>
                      {isExpanded && hasExpandableDetails && log.details && (
                        <tr>
                          <td colSpan={8} className="p-0">
                             <AuditDetailsDisplay 
                                details={log.details.changedFields} 
                                initialValues={log.details.initialValues} 
                                deletedValues={log.details.deletedValues} 
                             />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-10 text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable} (pentru filtrele selectate).</p>
        )}
      </Card>
    </div>
  );
};

export default AdminSystemLogPage;
