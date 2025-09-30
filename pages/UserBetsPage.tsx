import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, BET_STATUS_FRIENDLY_NAMES } from '../constants';
import { Bet, BetStatus, BetType } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import { DocumentChartBarIcon, ChevronDownIcon, ChevronUpIcon, CurrencyEuroIcon, FilterIcon, Bars3Icon, CalendarDaysIcon, ArrowsUpDownIcon } from '../components/ui/Icons';
import DateRangeFilter, { DateRange } from '../components/ui/DateRangeFilter';
import Button from '../components/ui/Button';
import Confetti from '../components/ui/Confetti';
import Input from '../components/ui/Input';


type StatusFilter = 'ALL' | 'ACTIVE' | 'PROFIT' | 'LOSS' | 'ZERO_PROFIT';
type TypeFilter = 'ALL' | 'VALUE' | 'MIDDLE';
type SortKey = 'eventTimestamp' | 'event' | 'totalStake' | 'totalProfit' | 'primaryOdds' | 'primarySelection';


type BetGroup = {
  groupId: string;
  bets: Bet[];
  // Add common properties for easy access
  event: string;
  sport: string;
  league: string;
  eventTimestamp: string;
};

const clampNN = (n: number) => (n < 0 ? 0 : n);
const formatCountdown = (ms: number): string => {
  const total = clampNN(ms);
  const s = Math.floor(total / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}z ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

const MiddleProfitDetails: React.FC<{ details: Bet['middleDetails'] }> = ({ details }) => {
  if (!details) return null;

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-neutral-600">
        <h5 className="text-xs font-semibold text-neutral-400 mb-2">PROFITURI POTENȚIALE (MIDDLE)</h5>
        <div className="p-2 bg-neutral-900/50 rounded text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div>
                <span className="text-neutral-400 block">Dacă iese Value Bet</span>
                <b className={`text-sm ${(details.p1 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(details.p1)}
                </b>
            </div>
            <div>
                <span className="text-neutral-400 block">Dacă iese Middle Bet</span>
                <b className={`text-sm ${(details.p2 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(details.p2)}
                </b>
            </div>
            <div>
                <span className="text-neutral-400 block">Dacă ies ambele</span>
                <b className="text-sm text-green-400">{formatCurrency(details.pb)}</b>
            </div>
        </div>
    </div>
  );
};


const UserBetsPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, loading: dataLoading } = useData();
  const location = useLocation();
  
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
  
  const preFilterStatus = location.state?.preFilterStatus;
  const initialStatusFilter: StatusFilter = preFilterStatus === 'PENDING' ? 'ACTIVE' : 'ALL';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'daily'>('list');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({
    key: 'eventTimestamp',
    direction: 'descending',
  });

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  const filteredBetGroups = useMemo((): BetGroup[] => {
    if (!appData?.bets) return [];
    
    // 1. Filter by Date
    let dateFilteredBets = appData.bets;
    if (dateRange.startDate && dateRange.endDate) {
        dateFilteredBets = dateFilteredBets.filter(bet => {
            const betDate = bet.date;
            return betDate >= dateRange.startDate! && betDate <= dateRange.endDate!;
        });
    }

    // 2. Group bets
    const groupsMap: Record<string, Bet[]> = {};
    for (const bet of dateFilteredBets) {
      if (!groupsMap[bet.groupId]) {
        groupsMap[bet.groupId] = [];
      }
      groupsMap[bet.groupId].push(bet);
    }

    let betGroups: BetGroup[] = Object.values(groupsMap).map(betsInGroup => ({
      groupId: betsInGroup[0].groupId,
      bets: betsInGroup,
      event: betsInGroup[0].event,
      sport: betsInGroup[0].sport,
      league: betsInGroup[0].league,
      eventTimestamp: betsInGroup[0].eventTimestamp,
    }));
    
    // 3. Filter by Search Term
    if (searchTerm.trim() !== '') {
        const lowercasedSearch = searchTerm.toLowerCase().trim();
        betGroups = betGroups.filter(group => {
            const eventMatch = group.event.toLowerCase().includes(lowercasedSearch);
            const selectionMatch = group.bets.some(bet => bet.selection.toLowerCase().includes(lowercasedSearch));
            const statusMatch = group.bets.some(bet => 
                BET_STATUS_FRIENDLY_NAMES[bet.status].toLowerCase().includes(lowercasedSearch)
            );
            return eventMatch || selectionMatch || statusMatch;
        });
    }

    // 4. Filter by Status
    if (statusFilter !== 'ALL') {
      betGroups = betGroups.filter(group => {
        const isResolved = group.bets.every(b => b.status !== BetStatus.PENDING);
        const totalProfit = group.bets.reduce((sum, bet) => sum + (bet.profit ?? 0), 0);
        
        switch (statusFilter) {
          case 'ACTIVE':
            return !isResolved;
          case 'PROFIT':
            return isResolved && totalProfit > 0;
          case 'LOSS':
            return isResolved && totalProfit < 0;
          case 'ZERO_PROFIT':
            return isResolved && totalProfit === 0;
          default:
            return true;
        }
      });
    }
    
    // 5. Sort groups based on sortConfig
    betGroups.sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        switch (sortConfig.key) {
            case 'totalStake':
                aVal = a.bets.reduce((sum, bet) => sum + bet.stake, 0);
                bVal = b.bets.reduce((sum, bet) => sum + bet.stake, 0);
                break;
            case 'totalProfit':
                const isAPending = a.bets.some(bet => bet.status === BetStatus.PENDING);
                const isBPending = b.bets.some(bet => bet.status === BetStatus.PENDING);
                aVal = isAPending ? -Infinity : a.bets.reduce((sum, bet) => sum + (bet.profit ?? 0), 0);
                bVal = isBPending ? -Infinity : b.bets.reduce((sum, bet) => sum + (bet.profit ?? 0), 0);
                break;
            case 'primaryOdds':
                aVal = a.bets.find(b => b.betType === BetType.VALUE)?.odds ?? 0;
                bVal = b.bets.find(b => b.betType === BetType.VALUE)?.odds ?? 0;
                break;
            case 'primarySelection':
                 aVal = a.bets.find(b => b.betType === BetType.VALUE)?.selection ?? '';
                 bVal = b.bets.find(b => b.betType === BetType.VALUE)?.selection ?? '';
                 break;
            case 'eventTimestamp':
            case 'event':
                aVal = a[sortConfig.key];
                bVal = b[sortConfig.key];
                break;
            default:
                aVal = 0;
                bVal = 0;
        }

        if (aVal < bVal) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        // Secondary sort by date for stability
        const dateA = new Date(a.eventTimestamp).getTime();
        const dateB = new Date(b.eventTimestamp).getTime();
        return dateB - dateA;
    });

    return betGroups;
  }, [appData?.bets, dateRange, statusFilter, searchTerm, sortConfig]);

  const summaryData = useMemo(() => {
    let totalProfit = 0;
    let resolvedCount = 0;
    let pendingCount = 0;

    filteredBetGroups.forEach(group => {
      const betsToConsider = group.bets.filter(bet => {
        if (typeFilter === 'VALUE') return bet.betType === BetType.VALUE;
        if (typeFilter === 'MIDDLE') return bet.betType === BetType.MIDDLE;
        return true; // 'ALL'
      });

      betsToConsider.forEach(bet => {
        if (bet.status === BetStatus.PENDING) {
          pendingCount++;
        } else {
          resolvedCount++;
          totalProfit += bet.profit ?? 0;
        }
      });
    });

    const totalCount = resolvedCount + pendingCount;
    const completion = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0;

    return { totalProfit, resolvedCount, pendingCount, totalCount, completion };
  }, [filteredBetGroups, typeFilter]);
  
  const betsGroupedByDay = useMemo(() => {
    if (viewMode !== 'daily') return null;
    const grouped: Record<string, BetGroup[]> = {};
    for (const group of filteredBetGroups) {
      const dateKey = group.bets[0].date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(group);
    }
    // Sort keys (dates) descending
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredBetGroups, viewMode]);


  if (dataLoading || !user) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const statusFilterOptions: { key: StatusFilter, label: string }[] = [
      { key: 'ALL', label: 'Toate' },
      { key: 'ACTIVE', label: 'Active' },
      { key: 'PROFIT', label: 'Profit' },
      { key: 'LOSS', label: 'Pierdere' },
      { key: 'ZERO_PROFIT', label: 'Profit 0' },
  ];
  
  const typeFilterOptions: { key: TypeFilter, label: string }[] = [
      { key: 'ALL', label: 'Toate Tipurile' },
      { key: 'VALUE', label: 'Doar Value' },
      { key: 'MIDDLE', label: 'Doar Middle' },
  ];
  
  const tableHeaders: { key: SortKey; label: string; className?: string; }[] = [
    { key: 'event', label: 'Eveniment & Data', className: 'w-1/3' },
    { key: 'primarySelection', label: 'Selecție Principală' },
    { key: 'primaryOdds', label: 'Cotă Principală', className: 'text-right' },
    { key: 'totalStake', label: 'Miză Totală', className: 'text-right' },
    { key: 'totalProfit', label: 'Profit Total', className: 'text-right' },
  ];
  
  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
        return <ArrowsUpDownIcon className="h-4 w-4 ml-1 text-neutral-400 inline" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ChevronUpIcon className="h-4 w-4 ml-1 inline text-primary-400" />;
    }
    return <ChevronDownIcon className="h-4 w-4 ml-1 inline text-primary-400" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <DocumentChartBarIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.betHistory}
      </h1>
      
      <Card title="Filtrează Istoricul" icon={<FilterIcon className="h-6 w-6"/>}>
         <div className="space-y-4">
            <DateRangeFilter onRangeChange={setDateRange} initialRangeType="all" />
            <div className="pt-2">
                <Input
                    label="Caută"
                    placeholder="Caută după eveniment, selecție, status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Filtrează după Status</h4>
                    <div className="flex flex-wrap gap-2">
                        {statusFilterOptions.map(({key, label}) => (
                            <Button key={key} variant={statusFilter === key ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter(key)}>
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Filtrează după Tipul Pariului</h4>
                    <div className="flex flex-wrap gap-2">
                        {typeFilterOptions.map(({key, label}) => (
                             <Button key={key} variant={typeFilter === key ? 'primary' : 'outline'} size="sm" onClick={() => setTypeFilter(key)}>
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-700">
             <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Mod Vizualizare</h4>
             <div className="flex flex-wrap gap-2">
                 <Button variant={viewMode === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('list')} leftIcon={<Bars3Icon className="h-5 w-5"/>}>
                    Listă Sortabilă
                 </Button>
                 <Button variant={viewMode === 'daily' ? 'primary' : 'outline'} size="sm" onClick={() => setViewMode('daily')} leftIcon={<CalendarDaysIcon className="h-5 w-5"/>}>
                    Grupat pe Zile
                 </Button>
             </div>
         </div>
         </div>
      </Card>

      <Card 
        title="Sumar Performanță (Filtre Aplicate)" 
        icon={<CurrencyEuroIcon className="h-6 w-6"/>}
        className={`transition-colors duration-300 ${summaryData.totalProfit >= 0 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'}`
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-1 text-center p-4 rounded-lg bg-white/50 dark:bg-black/20 shadow-inner">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Profit Total (Net)</p>
                <p className={`text-4xl font-bold transition-colors duration-300 ${summaryData.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(summaryData.totalProfit)}
                </p>
            </div>
            <div className="md:col-span-2 space-y-4">
                <div className="flex justify-around text-center">
                    <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Pariuri Finalizate</p>
                        <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">{summaryData.resolvedCount}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Pariuri în Așteptare</p>
                        <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">{summaryData.pendingCount}</p>
                    </div>
                </div>
                <div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div
                            className="h-2.5 rounded-full bg-primary-500 transition-all duration-500 ease-out"
                            style={{ width: `${summaryData.completion}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-center mt-1 text-neutral-500 dark:text-neutral-400">
                        {summaryData.completion.toFixed(0)}% Finalizat ({summaryData.resolvedCount} din {summaryData.totalCount} pariuri)
                    </p>
                </div>
            </div>
        </div>
      </Card>


      <div className="space-y-3">
        {filteredBetGroups.length > 0 ? (
           <>
            {viewMode === 'list' && (
                 <div className="space-y-3">
                    {filteredBetGroups.map(group => (
                        <BetGroupDisplay key={group.groupId} group={group} typeFilter={typeFilter} />
                    ))}
                </div>
            )}

            {viewMode === 'daily' && betsGroupedByDay && betsGroupedByDay.map(([date, groupsForDay]) => (
              <div key={date}>
                <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-2 mt-4 p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-md">
                  {formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <div className="space-y-3">
                    {groupsForDay.map(group => (
                        <BetGroupDisplay key={group.groupId} group={group} typeFilter={typeFilter} />
                    ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <Card>
            <p className="text-center text-neutral-500 dark:text-neutral-400 py-10">
              Niciun pariu găsit pentru filtrele selectate.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};


// Sub-component for displaying a single bet group (Daily View & List View now use this)
const BetGroupDisplay: React.FC<{ group: BetGroup; typeFilter: TypeFilter }> = ({ group, typeFilter }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const middleBet = group.bets.find(b => b.betType === BetType.MIDDLE);
  const isPending = group.bets.some(b => b.status === BetStatus.PENDING);
  
  useEffect(() => {
    if (isPending) {
        const id = window.setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }
  }, [isPending]);
  
  const startTs = new Date(group.eventTimestamp).getTime();
  const isLive = !isPending ? false : startTs <= nowTs;
  const beforeStart = isPending && nowTs < startTs;
  const countdownText = beforeStart ? formatCountdown(startTs - nowTs) : null;

  const totalProfit = group.bets.reduce((sum, bet) => sum + (bet.profit ?? 0), 0);
  const isWinningGroup = !isPending && totalProfit > 0;
  
  useEffect(() => {
    if(isWinningGroup && isExpanded) {
        setConfettiTrigger(c => c + 1);
    }
  }, [isWinningGroup, isExpanded]);
  
  const scoreRegex = /Scor: (.*?)\./;
  const noteWithScore = group.bets.find(b => b.notes?.match(scoreRegex));
  const finalScore = noteWithScore?.notes?.match(scoreRegex)?.[1];

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 shadow-lg transition-all hover:border-primary-600/50">
       <Confetti trigger={confettiTrigger} />
       <div className="flex justify-between items-start border-b border-dashed border-neutral-600 pb-3 mb-3 flex-wrap gap-2">
            <div>
                <h3 className="font-bold text-neutral-100">{group.event}</h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
                    {!isPending && finalScore && (
                      <span className="font-bold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full">Scor: {finalScore}</span>
                    )}
                    {isPending ? (
                        isLive ? (
                            <span className="flex items-center font-bold text-red-500 animate-pulse"><span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>LIVE</span>
                        ) : (
                           countdownText && <span className="font-semibold text-amber-300">Începe în {countdownText}</span>
                        )
                    ) : (
                        <span className="font-semibold text-green-400">Finalizat</span>
                    )}
                    <span className="text-neutral-400">{formatDate(group.eventTimestamp, {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="text-neutral-400">• {group.sport} • {group.league}</span>
                </div>
            </div>
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-primary-400 font-bold text-sm px-4 py-2 bg-primary-900/50 hover:bg-primary-800/50 rounded-md transition-colors flex items-center gap-2">
              {isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
              {isExpanded ? 'Ascunde' : 'Detalii'}
            </button>
        </div>
        
        {isExpanded && (
            <div className="space-y-2 animate-fade-in">
                {group.bets.filter(b => typeFilter === 'ALL' || b.betType === typeFilter).map(bet => (
                    <BetLine key={bet.id} bet={bet} />
                ))}
                {middleBet?.middleDetails && <MiddleProfitDetails details={middleBet.middleDetails} />}
            </div>
        )}

        {!isPending && (
             <div className={`mt-3 p-3 rounded-md flex justify-between items-center font-bold text-lg ${totalProfit >= 0 ? 'bg-green-900/40 text-green-200' : 'bg-red-900/40 text-red-200'}`}>
                <span>Profit Total Grup</span>
                <span>{formatCurrency(totalProfit)}</span>
            </div>
        )}
    </div>
  );
};

const BetLine: React.FC<{ bet: Bet }> = ({ bet }) => {
  const getStatusPill = (status: BetStatus) => {
    let colorClass = '';
    switch(status) {
        case BetStatus.WON:
        case BetStatus.HALF_WON: colorClass = 'bg-green-900/60 text-green-300'; break;
        case BetStatus.LOST:
        case BetStatus.HALF_LOST: colorClass = 'bg-red-900/60 text-red-300'; break;
        case BetStatus.VOID: colorClass = 'bg-neutral-700 text-neutral-300'; break;
        default: colorClass = 'bg-yellow-900/60 text-yellow-300';
    }
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>{BET_STATUS_FRIENDLY_NAMES[status]}</span>;
  }

  return (
    <div className="grid grid-cols-[auto_1fr_repeat(4,auto)] items-center gap-x-4 gap-y-1 p-2 rounded bg-neutral-700/50 text-sm">
        {/* Bet Type */}
        <div className="font-bold">
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${bet.betType === BetType.VALUE ? 'bg-blue-900/60 text-blue-300' : 'bg-teal-900/60 text-teal-300'}`}>
            {bet.betType}
            </span>
        </div>

        {/* Selection */}
        <div className="text-neutral-100 font-medium truncate" title={bet.selection}>
            {bet.selection}
        </div>

        {/* Stake */}
        <div className="text-neutral-300 text-right whitespace-nowrap">
            <span className="text-neutral-400 text-xs">Miză:</span> {formatCurrency(bet.stake)}
        </div>

        {/* Odds */}
        <div className="text-neutral-300 text-right whitespace-nowrap">
            <span className="text-neutral-400 text-xs">Cotă:</span> {bet.odds.toFixed(2)}
        </div>

        {/* Status */}
        <div className="w-28 text-center">{getStatusPill(bet.status)}</div>

        {/* Profit */}
        <div className={`w-24 text-right font-bold ${bet.profit === undefined ? 'text-neutral-300' : bet.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {bet.profit !== undefined ? formatCurrency(bet.profit) : '-'}
        </div>
    </div>
  );
};

export default UserBetsPage;