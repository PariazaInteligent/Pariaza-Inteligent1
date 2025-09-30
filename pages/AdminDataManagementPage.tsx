import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData, ValueBetData, MiddleBetData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Modal, { ConfirmationModal } from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, BET_STATUS_FRIENDLY_NAMES, POPULAR_SPORTS, POPULAR_LEAGUES, POPULAR_SELECTIONS } from '../constants';
import { Bet, BetStatus, BetType, NotificationType, PlatformSettingKey } from '../types';
import {
  formatDate,
  formatCurrency,
  calculateMiddleSuggestion,
  MiddleSuggestion,
  computeMiddleProfits,
  calculateValueSuggestion,
  ValueSuggestion
} from '../utils/helpers';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '../components/ui/Icons';
import Confetti from '../components/ui/Confetti';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import SwitchToggle from '../components/ui/SwitchToggle';


// ------------ Helpers (locale) ------------
type BetGroup = {
  groupId: string;
  valueBet: Bet;
  middleBet?: Bet;
  sport: string;
  league: string;
  event: string;
  eventTimestamp: string;
};

const getIsoDateString = (date: Date): string => date.toISOString().split('T')[0];
const getIsoDateTimeString = (date: Date): string => date.toISOString().substring(0, 16);

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

// ------------ Main Page ------------
const AdminDataManagementPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, resolveDayAndDistribute, updateBet, deleteBetGroup } = useData();
  const { addNotification } = useNotifications();
  const location = useLocation();

  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [betToEdit, setBetToEdit] = useState<Bet | null>(null);

  const [dateForClosure, setDateForClosure] = useState(getIsoDateString(new Date()));

  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [boomedGroupIds, setBoomedGroupIds] = useState<Set<string>>(new Set());

  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [betForScoreUpdate, setBetForScoreUpdate] = useState<Bet | null>(null);
  const [scoreInputValue, setScoreInputValue] = useState("");
  
  const preFilterStatus = location.state?.preFilterStatus;
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>(preFilterStatus || 'ALL');


  const openEditModal = (bet: Bet) => {
    setBetToEdit(bet);
    setIsEditModalOpen(true);
  };

  const openScoreModal = (bet: Bet) => {
    setBetForScoreUpdate(bet);
    const scoreRegex = /Scor: (.*?)\./;
    const scoreMatch = bet.notes?.match(scoreRegex);
    setScoreInputValue(scoreMatch ? scoreMatch[1] : "");
    setIsScoreModalOpen(true);
  };

  const handleSaveScore = async () => {
    if (!betForScoreUpdate || !scoreInputValue.trim()) {
        addNotification("Scorul nu poate fi gol.", NotificationType.ERROR);
        return;
    }

    const scoreText = `Scor: ${scoreInputValue.trim()}.`;
    const existingNotes = betForScoreUpdate.notes || '';
    const scoreRegex = /Scor: .*?\./;
    let newNotes = '';

    if (scoreRegex.test(existingNotes)) {
        newNotes = existingNotes.replace(scoreRegex, scoreText);
    } else {
        newNotes = `${scoreText} ${existingNotes}`.trim();
    }

    await updateBet(betForScoreUpdate.id, { notes: newNotes });
    addNotification("Scorul a fost salvat.", NotificationType.SUCCESS);
    setIsScoreModalOpen(false);
    setBetForScoreUpdate(null);
  };


  // Grupează pariurile în perechi Value + Middle
  const betGroups = useMemo((): Record<string, BetGroup> => {
    if (!appData?.bets) return {};
    const allGroups: Record<string, BetGroup> = {};
    const sorted = [...appData.bets].sort(
      (a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
    );

    // 1. Group ALL bets first
    for (const bet of sorted) {
      if (!allGroups[bet.groupId]) {
        const valueBet = sorted.find(b => b.groupId === bet.groupId && b.betType === BetType.VALUE);
        if (valueBet) {
             allGroups[bet.groupId] = {
                groupId: bet.groupId,
                valueBet: valueBet,
                middleBet: sorted.find(b => b.groupId === bet.groupId && b.betType === BetType.MIDDLE),
                sport: valueBet.sport,
                league: valueBet.league,
                event: valueBet.event,
                eventTimestamp: valueBet.eventTimestamp,
            };
        }
      }
    }

    // 2. Filter the GROUPS based on statusFilter
    if (statusFilter === 'ALL') {
      return allGroups;
    }
    
    const filteredGroups: Record<string, BetGroup> = {};
    for (const groupId in allGroups) {
      const group = allGroups[groupId];
      // A group is pending if AT LEAST ONE of its bets is pending.
      const isGroupPending = group.valueBet.status === BetStatus.PENDING || (group.middleBet && group.middleBet.status === BetStatus.PENDING);
      
      if (statusFilter === 'PENDING' && isGroupPending) {
        filteredGroups[groupId] = group;
      } else if (statusFilter === 'RESOLVED' && !isGroupPending) {
        filteredGroups[groupId] = group;
      }
    }

    return filteredGroups;

  }, [appData?.bets, statusFilter]);
  
  // Confetti pentru grupuri rezolvate cu profit pozitiv
  useEffect(() => {
    const newlyBoomed = new Set<string>();
    Object.values(betGroups).forEach((group) => {
      const { valueBet, middleBet, groupId } = group;
      if (valueBet.status !== BetStatus.PENDING && middleBet?.status !== BetStatus.PENDING) {
        const total = (valueBet.profit ?? 0) + (middleBet?.profit ?? 0);
        if (total > 0 && !boomedGroupIds.has(groupId)) {
          newlyBoomed.add(groupId);
        }
      }
    });
    if (newlyBoomed.size > 0) {
      setConfettiTrigger((c) => c + 1);
      setBoomedGroupIds((prev) => new Set([...prev, ...newlyBoomed]));
    }
  }, [betGroups, boomedGroupIds]);


  // === Profit Summary pentru data selectată (până acum) ===
  const daySummary = useMemo(() => {
    const bets = (appData?.bets || []).filter(b => b.date === dateForClosure);
    const setGroups = new Set<string>();
    let resolvedProfit = 0;
    let resolvedCount = 0;
    let pendingCount = 0;

    for (const b of bets) {
      setGroups.add(b.groupId);
      if (b.status !== BetStatus.PENDING) {
        resolvedCount += 1;
        resolvedProfit += b.profit ?? 0;
      } else {
        pendingCount += 1;
      }
    }

    return {
      totalProfit: resolvedProfit,
      resolvedCount,
      pendingCount,
      totalBets: bets.length,
      totalGroups: setGroups.size,
      completion: bets.length > 0 ? Math.min(100, Math.round((resolvedCount / bets.length) * 100)) : 0,
    };
  }, [appData?.bets, dateForClosure]);

  // Confetti când profitul pe zi devine pozitiv pentru prima dată
  const [dayProfitWentPositive, setDayProfitWentPositive] = useState(false);
  useEffect(() => {
    if (daySummary.totalProfit > 0 && !dayProfitWentPositive) {
      setDayProfitWentPositive(true);
      setConfettiTrigger(c => c + 1);
    }
    if (daySummary.totalProfit <= 0 && dayProfitWentPositive) {
      setDayProfitWentPositive(false);
    }
  }, [daySummary.totalProfit, dayProfitWentPositive]);

  const unprocessedBetsForClosure = useMemo(() => {
    return (
      appData?.bets?.filter(
        (bet) => bet.date === dateForClosure && bet.status !== BetStatus.PENDING && !bet.processedInDailyHistory
      ).length || 0
    );
  }, [appData?.bets, dateForClosure]);

  const handleCloseDay = async () => {
    if (!adminUser) return;
    await resolveDayAndDistribute(dateForClosure, adminUser.id);
  };

  if (loading || !adminUser || !appData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <Confetti trigger={confettiTrigger} />
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
          {UI_TEXT_ROMANIAN.dataManagement}
        </h1>

        {/* 1) Filtru Închidere Zi & Distribuire */}
        <Card title={UI_TEXT_ROMANIAN.closeDayTitle} icon={<CalendarDaysIcon className="h-6 w-6" />}>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            {UI_TEXT_ROMANIAN.closeDayDescription}
          </p>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <Input
              label={UI_TEXT_ROMANIAN.selectDateForClosure}
              type="date"
              value={dateForClosure}
              onChange={(e) => setDateForClosure(e.target.value)}
              max={getIsoDateString(new Date())}
              containerClassName="flex-grow"
            />
            <div className="flex-shrink-0">
              <Button onClick={handleCloseDay} variant="primary" disabled={unprocessedBetsForClosure === 0}>
                {UI_TEXT_ROMANIAN.closeDayAndDistribute} ({unprocessedBetsForClosure} pariuri)
              </Button>
            </div>
          </div>
        </Card>

        {/* 2) Profit Summary Bar (mutată SUB filtrul de închidere zi) */}
        <div
          className={`rounded-xl border shadow-sm p-4 transition-colors
            ${daySummary.totalProfit >= 0
              ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
            }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                Profit pentru <b>{formatDate(dateForClosure, { day: '2-digit', month: 'long', year: 'numeric' })}</b> (până acum)
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-100">
                  Rezolvate: {daySummary.resolvedCount}
                </span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-100">
                  În așteptare: {daySummary.pendingCount}
                </span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-100">
                  Grupuri: {daySummary.totalGroups}
                </span>
              </div>
            </div>

            <div className="text-3xl font-extrabold">
              {formatCurrency(daySummary.totalProfit)}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-2 ${daySummary.totalProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${daySummary.completion}%` }}
              />
            </div>
            <div className="text-[11px] mt-1 text-neutral-500 dark:text-neutral-400">
              Progres rezolvare pariuri: {daySummary.completion}%
            </div>
          </div>
        </div>

        {/* 3) Management Pariuri */}
        <Card title={UI_TEXT_ROMANIAN.betManagementTitle}>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <Button
              onClick={() => setIsBetModalOpen(true)}
              variant="secondary"
              leftIcon={<PlusCircleIcon className="h-5 w-5" />}
            >
              Adaugă Grup
            </Button>
            <div className="flex gap-2">
                <Button variant={statusFilter === 'ALL' ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter('ALL')}>Toate</Button>
                <Button variant={statusFilter === 'PENDING' ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter('PENDING')}>În Așteptare</Button>
                <Button variant={statusFilter === 'RESOLVED' ? 'primary' : 'outline'} size="sm" onClick={() => setStatusFilter('RESOLVED')}>Finalizate</Button>
            </div>
          </div>
          <div className="space-y-4">
            {Object.values(betGroups).length > 0 ? (
              Object.values(betGroups).map((group) => (
                <BetGroupDisplay key={group.groupId} group={group} onEdit={openEditModal} onOpenScoreModal={openScoreModal} onDelete={deleteBetGroup} />
              ))
            ) : (
              <p className="text-center py-6 text-neutral-500 dark:text-neutral-400">
                Niciun pariu găsit pentru filtrul selectat.
              </p>
            )}
          </div>
        </Card>

        <BetFormModal isOpen={isBetModalOpen} onClose={() => setIsBetModalOpen(false)} />
        <EditBetFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          bet={betToEdit}
        />
        <Modal
            isOpen={isScoreModalOpen}
            onClose={() => setIsScoreModalOpen(false)}
            title="Introdu Scorul Final"
        >
            <Input
                label={`Scor pentru meciul: ${betForScoreUpdate?.event}`}
                value={scoreInputValue}
                onChange={(e) => setScoreInputValue(e.target.value)}
                placeholder="ex: 2-1"
                autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setIsScoreModalOpen(false)}>Anulează</Button>
                <Button variant="primary" onClick={handleSaveScore}>Salvează Scorul</Button>
            </div>
        </Modal>
      </div>
    </>
  );
};

// ------------ Bet Group ------------
const BetGroupDisplay: React.FC<{ group: BetGroup; onEdit: (bet: Bet) => void; onOpenScoreModal: (bet: Bet) => void; onDelete: (groupId: string) => Promise<void>; }> = ({
  group,
  onEdit,
  onOpenScoreModal,
  onDelete,
}) => {
  const { updateBet } = useData();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { valueBet, middleBet } = group;
  
  const handleStatusChange = async (betId: string, newStatus: BetStatus) => {
    const wasValueResolved = group.valueBet.status !== BetStatus.PENDING;
    const wasMiddleResolved = !group.middleBet || group.middleBet.status !== BetStatus.PENDING;
    const wasGroupResolved = wasValueResolved && wasMiddleResolved;

    const updatedBet = await updateBet(betId, { status: newStatus });
    if (!updatedBet) return;
    
    const isValueBetTheOneChanged = updatedBet.id === group.valueBet.id;
    const isValueNowResolved = isValueBetTheOneChanged ? newStatus !== BetStatus.PENDING : group.valueBet.status !== BetStatus.PENDING;
    const isMiddleNowResolved = !group.middleBet || (!isValueBetTheOneChanged ? newStatus !== BetStatus.PENDING : group.middleBet.status !== BetStatus.PENDING);

    if (!wasGroupResolved && isValueNowResolved && isMiddleNowResolved) {
      onOpenScoreModal(updatedBet);
    }
  };

  const isPending = valueBet.status === BetStatus.PENDING || (middleBet && middleBet.status === BetStatus.PENDING);

  const startTs = group.eventTimestamp ? new Date(group.eventTimestamp).getTime() : null;
  const isLive = isPending && startTs ? nowTs >= startTs : false;
  const beforeStart = isPending && startTs ? nowTs < startTs : false;
  const countdownText = startTs ? formatCountdown(startTs - nowTs) : null;

  const confirmDelete = async () => {
    await onDelete(group.groupId);
    setIsDeleteConfirmOpen(false);
  };

  const totalProfit = (valueBet.profit ?? 0) + (middleBet?.profit ?? 0);
  const isGroupResolved = valueBet.status !== BetStatus.PENDING && (middleBet ? middleBet.status !== BetStatus.PENDING : true);
  
  const scoreRegex = /Scor: (.*?)\./;
  const valueScoreMatch = group.valueBet.notes?.match(scoreRegex);
  const middleScoreMatch = group.middleBet?.notes?.match(scoreRegex);
  const finalScore = valueScoreMatch?.[1] || middleScoreMatch?.[1];

  return (
    <>
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 shadow-lg transition-all hover:border-primary-600/50">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b border-dashed border-neutral-600 pb-3 mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-lg text-neutral-100">{group.event}</h3>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
            {isPending ? (
              isLive ? (
                <span className="flex items-center font-bold text-red-500 animate-pulse"><span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>LIVE</span>
              ) : (
                countdownText && <span className="font-semibold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full">Începe în {countdownText}</span>
              )
            ) : (
              <span className="font-semibold text-green-300 bg-green-900/60 px-2 py-0.5 rounded-full">Finalizat</span>
            )}
            {finalScore && <span className="font-bold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full">Scor: {finalScore}</span>}
            <span className="text-neutral-400">{formatDate(group.eventTimestamp, {day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'})}</span>
            <span className="text-neutral-400">• {group.sport} • {group.league}</span>
          </div>
        </div>
        <button onClick={() => setIsDetailsExpanded(!isDetailsExpanded)} className="text-primary-400 font-bold text-sm px-4 py-2 bg-primary-900/50 hover:bg-primary-800/50 rounded-md transition-colors flex items-center gap-2">
          {isDetailsExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
          {isDetailsExpanded ? 'Ascunde' : 'Detalii'}
        </button>
      </div>

      {/* BODY (Expanded) */}
      {isDetailsExpanded && (
        <div className="space-y-4 animate-fade-in">
          {/* Bet Lines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BetLine bet={valueBet} type="Value" onStatusChange={handleStatusChange} onEdit={onEdit} />
            {middleBet && <BetLine bet={middleBet} type="Middle" onStatusChange={handleStatusChange} onEdit={onEdit} />}
          </div>
          
          {/* Middle Details */}
          {middleBet?.middleDetails && (
            <div>
              <h5 className="text-xs font-semibold text-neutral-400 mb-2">PROFITURI POTENȚIALE (MIDDLE)</h5>
              <div className="p-2 bg-neutral-900/50 rounded text-xs grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                <div><span className="text-neutral-400 block">Dacă iese Value Bet</span><b className={`text-sm ${(middleBet.middleDetails.p1 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(middleBet.middleDetails.p1)}</b></div>
                <div><span className="text-neutral-400 block">Dacă iese Middle Bet</span><b className={`text-sm ${(middleBet.middleDetails.p2 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(middleBet.middleDetails.p2)}</b></div>
                <div><span className="text-neutral-400 block">Dacă ies ambele</span><b className="text-sm text-green-400">{formatCurrency(middleBet.middleDetails.pb)}</b></div>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end items-center gap-2 pt-2 border-t border-neutral-700/50">
              <Button variant="ghost" size="sm" onClick={() => onOpenScoreModal(valueBet)}>Scor</Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDeleteConfirmOpen(true)} className="text-red-500/80 hover:text-red-500"><TrashIcon className="h-5 w-5"/></Button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      {isGroupResolved && (
        <div className={`mt-3 p-3 rounded-md flex justify-between items-center font-bold text-lg ${ totalProfit >= 0 ? 'bg-green-900/40 text-green-200' : 'bg-red-900/40 text-red-200' }`}>
          <span>{totalProfit >= 0 ? 'Profit Total Grup' : 'Pierdere Totală Grup'}</span>
          <span>{formatCurrency(totalProfit)}</span>
        </div>
      )}
    </div>
    <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDelete} title="Confirmă Ștergere Grup" message={`Ești sigur că vrei să ștergi ambele pariuri (Value și Middle) pentru meciul ${group.event}?`} />
    </>
  );
};


const BetLine: React.FC<{ bet: Bet; type: 'Value' | 'Middle'; onStatusChange: (betId: string, newStatus: BetStatus) => void; onEdit: (bet: Bet) => void; }> = ({ bet, type, onStatusChange, onEdit }) => {
  return (
    <div className="bg-neutral-700/50 p-3 rounded-md border border-neutral-600/50">
        <div className="flex justify-between items-center mb-2">
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${ type === 'Value' ? 'bg-blue-900/60 text-blue-300' : 'bg-teal-900/60 text-teal-300' }`}>
                {type}
            </span>
            <div className="flex items-center gap-1">
                <select
                value={bet.status}
                onChange={(e) => onStatusChange(bet.id, e.target.value as BetStatus)}
                className="text-xs px-2 py-1 rounded bg-neutral-800 border border-neutral-600 focus:ring-primary-500 text-neutral-100"
                >
                {Object.values(BetStatus).map((s) => (
                    <option key={s} value={s}>{BET_STATUS_FRIENDLY_NAMES[s]}</option>
                ))}
                </select>
                <Button variant="ghost" size="sm" onClick={() => onEdit(bet)} className="p-1 h-auto text-neutral-400 hover:text-white">
                    <PencilSquareIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <p className="font-semibold text-neutral-100 text-base">{bet.selection}</p>
        <div className="flex justify-between items-end mt-2">
            <div>
                <p className="text-xs text-neutral-400">Cotă: <span className="font-mono text-sm text-neutral-200">{bet.odds.toFixed(2)}</span></p>
                <p className="text-xs text-neutral-400">Miză: <span className="font-mono text-sm text-neutral-200">{formatCurrency(bet.stake)}</span></p>
            </div>
            {bet.profit !== undefined && (
                 <p className={`text-lg font-bold ${bet.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(bet.profit)}</p>
            )}
        </div>
    </div>
  );
};

// ------------ Add Form (with AI) ------------
const BetFormModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { appData, addValueMiddlePair, getPlatformSettingValue, addBet } = useData();
  const { user: adminUser } = useAuth();
  const { addNotification } = useNotifications();

  // Mode state
  const [betMode, setBetMode] = useState<'value' | 'valueAndMiddle'>('value');

  // Common details state
  const [eventTimestamp, setEventTimestamp] = useState(getIsoDateTimeString(new Date()));
  const [sport, setSport] = useState('');
  const [league, setLeague] = useState('');
  const [event, setEvent] = useState('');
  const [market, setMarket] = useState('');
  const [notes, setNotes] = useState('');

  // Value + Middle Mode State
  const [valueSelection, setValueSelection] = useState('');
  const [middleSelection, setMiddleSelection] = useState('');
  const [calculationMode, setCalculationMode] = useState<'fromMiddle' | 'fromValue'>('fromMiddle');
  const [primaryOdds, setPrimaryOdds] = useState(2.1);
  const [primaryStake, setPrimaryStake] = useState(100);
  const [profitPct, setProfitPct] = useState(10);
  const [buffer, setBuffer] = useState(0);

  // Value Only Mode State
  const [valueOnlySelection, setValueOnlySelection] = useState('');
  const [valueOnlyOdds, setValueOnlyOdds] = useState('');
  const [valueOnlyStake, setValueOnlyStake] = useState('');

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const valueOnlyProfit = useMemo(() => {
    const odds = parseFloat(valueOnlyOdds);
    const stake = parseFloat(valueOnlyStake);
    if (!isNaN(odds) && !isNaN(stake) && odds > 1 && stake > 0) {
        return stake * (odds - 1);
    }
    return null;
  }, [valueOnlyOdds, valueOnlyStake]);

  const { valueOdds, valueStake, middleOdds, middleStake, suggestion } = useMemo(() => {
    if (calculationMode === 'fromValue') {
      const sugg = calculateMiddleSuggestion(primaryOdds, primaryStake, profitPct, buffer);
      return { valueOdds: primaryOdds, valueStake: primaryStake, middleOdds: sugg.feasible && sugg.o2 ? parseFloat(sugg.o2.toFixed(3)) : 0, middleStake: sugg.feasible && sugg.s2 ? parseFloat(sugg.s2.toFixed(2)) : 0, suggestion: sugg };
    } else {
      const sugg = calculateValueSuggestion(primaryOdds, primaryStake, profitPct, buffer);
      return { middleOdds: primaryOdds, middleStake: primaryStake, valueOdds: sugg.feasible && sugg.o1 ? parseFloat(sugg.o1.toFixed(3)) : 0, valueStake: sugg.feasible && sugg.s1 ? parseFloat(sugg.s1.toFixed(2)) : 0, suggestion: sugg };
    }
  }, [calculationMode, primaryOdds, primaryStake, profitPct, buffer]);

  const watchdogAnalysis = useMemo(() => {
    const warnings: { stake: string | null; middle: string | null } = { stake: null, middle: null };
    if (!appData || !suggestion.feasible) return warnings;
    const totalStake = valueStake + middleStake;
    const stakeThresholdPercent = parseFloat(getPlatformSettingValue(PlatformSettingKey.AI_WATCHDOG_STAKE_THRESHOLD_PERCENT, '5'));
    const lastHistory = appData.dailyHistory.length > 0 ? [...appData.dailyHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    const totalBank = lastHistory ? lastHistory.totalBankValueEnd : appData.globalStats.totalInvested;
    if (totalBank > 0 && totalStake > 0) {
        const stakePercentage = (totalStake / totalBank) * 100;
        if (stakePercentage > stakeThresholdPercent) warnings.stake = UI_TEXT_ROMANIAN.watchdogStakeWarning.replace('{totalStake}', formatCurrency(totalStake)).replace('{stakePercentage}', stakePercentage.toFixed(1)).replace('{thresholdPercentage}', stakeThresholdPercent.toString());
    }
    const middleProfitThresholdPercent = parseFloat(getPlatformSettingValue(PlatformSettingKey.AI_WATCHDOG_MIDDLE_PROFIT_THRESHOLD_PERCENT, '1'));
    if (suggestion.pb !== undefined && totalStake > 0) {
        const middleProfitPercentage = (suggestion.pb / totalStake) * 100;
        if (middleProfitPercentage < middleProfitThresholdPercent) warnings.middle = UI_TEXT_ROMANIAN.watchdogMiddleWarning.replace('{middleProfit}', formatCurrency(suggestion.pb)).replace('{middleProfitPercentage}', middleProfitPercentage.toFixed(2));
    }
    return warnings;
  }, [appData, suggestion, valueStake, middleStake, getPlatformSettingValue]);

  const resetForm = useCallback(() => {
    setEventTimestamp(getIsoDateTimeString(new Date()));
    setSport(''); setLeague(''); setEvent(''); setMarket(''); setNotes('');
    setValueSelection(''); setMiddleSelection(''); setCalculationMode('fromMiddle');
    setPrimaryOdds(2.1); setPrimaryStake(100); setProfitPct(10); setBuffer(0);
    setValueOnlySelection(''); setValueOnlyOdds(''); setValueOnlyStake('');
    setAiSuggestions([]); setAiError(null); setIsAiLoading(false);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
        resetForm();
    }
  }, [isOpen, resetForm]);

  const handleGenerateSuggestions = async () => {
    const mainSelection = calculationMode === 'fromValue' ? valueSelection : middleSelection;
    if (!mainSelection.trim()) { addNotification(`Introdu o selecție pentru ${calculationMode === 'fromValue' ? 'Value Bet' : 'Middle Bet'} pentru a genera sugestii.`, NotificationType.WARNING); return; }
    if (!process.env.API_KEY) { addNotification(UI_TEXT_ROMANIAN.geminiApiKeyMissing, NotificationType.ERROR); return; }
    setIsAiLoading(true); setAiError(null); setAiSuggestions([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Pariul principal este: "${mainSelection}" pentru evenimentul "${event || 'necunoscut'}", sport "${sport || 'necunoscut'}". Sugerează pariul opus pentru un middle.`;
      const systemInstruction = `Ești expert în pariuri. Oferă sugestii pentru un "middle bet" bazat pe pariul principal. Răspunde doar cu un array JSON de string-uri. Ex: ["Under 3.5 goluri", "Over 1.5 goluri"]`;
      const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', systemInstruction } });
      const arr = JSON.parse(response.text.trim());
      if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) {
        setAiSuggestions(arr);
        if (calculationMode === 'fromValue') setMiddleSelection(arr[0] || ''); else setValueSelection(arr[0] || '');
      } else throw new Error('Format JSON neașteptat.');
    } catch (e) {
        console.error('Gemini suggestion error:', e);
        const msg = 'Eroare la generarea sugestiilor.';
        setAiError(msg); addNotification(msg, NotificationType.ERROR);
    } finally { setIsAiLoading(false); }
  };

  const handleSaveValueAndMiddle = async () => {
    if (!adminUser || !suggestion.feasible) { addNotification('Setările nu sunt fezabile sau datele sunt incomplete.', NotificationType.ERROR); return; }
    const eventDate = new Date(eventTimestamp);
    if (isNaN(eventDate.getTime())) { addNotification('Data și ora evenimentului sunt invalide.', NotificationType.ERROR); return; }
    const accountingDate = eventDate.toISOString().split('T')[0];
    const commonData = { date: accountingDate, eventTimestamp, sport, league, event, createdByAdminId: adminUser.id, notes };
    const valueBetData: ValueBetData = { ...commonData, market: market || valueSelection, selection: valueSelection, odds: valueOdds, stake: valueStake };
    const middleBetData: MiddleBetData = { ...commonData, market: market || middleSelection, selection: middleSelection, odds: middleOdds, stake: middleStake, middleDetails: { p1: suggestion.p1!, p2: suggestion.p2!, pb: suggestion.pb! } };
    await addValueMiddlePair(valueBetData, middleBetData);
    setTimeout(() => { resetForm(); onClose(); }, 150);
  };

  const handleSaveValueOnly = async () => {
      if (!adminUser) { addNotification('Utilizator neautentificat.', NotificationType.ERROR); return; }
      const oddsNum = parseFloat(valueOnlyOdds);
      const stakeNum = parseFloat(valueOnlyStake);
      if (isNaN(oddsNum) || isNaN(stakeNum) || oddsNum <= 1 || stakeNum <= 0) { addNotification('Cota și miza trebuie să fie numere valide și pozitive.', NotificationType.ERROR); return; }
      const eventDate = new Date(eventTimestamp);
      if (isNaN(eventDate.getTime())) { addNotification('Data și ora evenimentului sunt invalide.', NotificationType.ERROR); return; }
      const accountingDate = eventDate.toISOString().split('T')[0];
      const betData: Omit<Bet, 'id' | 'status' | 'processedInDailyHistory' | 'groupId' | 'betType' | 'middleDetails'> = {
          date: accountingDate, eventTimestamp, sport, league, event, market: market || valueOnlySelection, selection: valueOnlySelection, odds: oddsNum, stake: stakeNum, createdByAdminId: adminUser.id, notes
      };
      await addBet(betData);
      setTimeout(() => { resetForm(); onClose(); }, 150);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Grup de Pariuri" size="xl">
      <div className="flex justify-center items-center gap-2 p-2 mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <Button variant={betMode === 'value' ? 'primary' : 'ghost'} onClick={() => setBetMode('value')} size="sm">Doar Value</Button>
          <Button variant={betMode === 'valueAndMiddle' ? 'primary' : 'ghost'} onClick={() => setBetMode('valueAndMiddle')} size="sm">Value + Middle</Button>
      </div>

      {/* --- SHARED FORM --- */}
      <div className="space-y-4 mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
        <Input label="Data și Ora Eveniment" type="datetime-local" value={eventTimestamp} onChange={(e) => setEventTimestamp(e.target.value)} required />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ComboboxInput label="Sport" value={sport} onChange={setSport} placeholder="ex. Fotbal" suggestions={POPULAR_SPORTS} />
          <ComboboxInput label="Ligă/Campionat" value={league} onChange={setLeague} placeholder="ex. Premier League" suggestions={POPULAR_LEAGUES} />
          <Input label="Eveniment" value={event} onChange={(e) => setEvent(e.target.value)} placeholder="ex. Liverpool vs Man City" />
        </div>
        <Input label="Piață (opțional)" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="ex. Total Goluri" />
        <Textarea label="Notițe (opțional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {/* --- VALUE ONLY MODE --- */}
      {betMode === 'value' && (
          <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Detalii Pariu Value</h2>
              <ComboboxInput label="Selecție" value={valueOnlySelection} onChange={setValueOnlySelection} required suggestions={POPULAR_SELECTIONS} />
              <div className="grid grid-cols-2 gap-4">
                  <Input label="Cotă" type="number" step="0.01" min="1.01" value={valueOnlyOdds} onChange={(e) => setValueOnlyOdds(e.target.value)} required />
                  <Input label="Miză (€)" type="number" step="1" min="1" value={valueOnlyStake} onChange={(e) => setValueOnlyStake(e.target.value)} required />
              </div>
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                <p className="text-sm text-green-800 dark:text-green-200">Profit Potențial</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {valueOnlyProfit !== null ? formatCurrency(valueOnlyProfit) : '—'}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                  <Button variant="ghost" type="button" onClick={onClose}>Anulează</Button>
                  <Button variant="primary" type="button" onClick={handleSaveValueOnly}>Salvează Pariu</Button>
              </div>
          </div>
      )}

      {/* --- VALUE + MIDDLE MODE --- */}
      {betMode === 'valueAndMiddle' && (
          <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <ComboboxInput label="Selecție (Value Bet)" value={valueSelection} onChange={setValueSelection} placeholder="ex. Peste 2.5" suggestions={POPULAR_SELECTIONS} />
                <ComboboxInput label="Selecție (Middle)" value={middleSelection} onChange={setMiddleSelection} placeholder="ex. Sub 3.5" suggestions={POPULAR_SELECTIONS} />
              </div>
              <div className="text-right -mt-2">
                <Button onClick={handleGenerateSuggestions} isLoading={isAiLoading} disabled={isAiLoading || (!valueSelection.trim() && !middleSelection.trim())} leftIcon={<SparklesIcon className="h-5 w-5" />} size="sm" variant="ghost">{UI_TEXT_ROMANIAN.generateMiddleSuggestions}</Button>
              </div>
              
              <div className="pl-2">
                {isAiLoading && <Spinner size="sm" />}
                {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                {aiSuggestions.length > 0 && !isAiLoading && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 self-center">Sugestii:</span>
                    {aiSuggestions.map((sugg, idx) => ( <Button key={idx} variant="outline" size="sm" onClick={() => calculationMode === 'fromValue' ? setMiddleSelection(sugg) : setValueSelection(sugg)}>{sugg}</Button>))}
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600"><SwitchToggle id="calcModeToggle" label={calculationMode === 'fromMiddle' ? 'Optimizare pe baza Middle Bet' : 'Optimizare pe baza Value Bet'} description="Schimbă care pariu este considerat principal pentru calculul optimizărilor." checked={calculationMode === 'fromMiddle'} onChange={(isChecked) => setCalculationMode(isChecked ? 'fromMiddle' : 'fromValue')} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={`Cota ${calculationMode === 'fromMiddle' ? 'Middle (P2)' : 'Value (P1)'}`} type="number" step="0.01" min="1.01" value={primaryOdds} onChange={(e) => setPrimaryOdds(parseFloat(e.target.value) || 0)} />
                  <Input label={`Miza ${calculationMode === 'fromMiddle' ? 'Middle (P2)' : 'Value (P1)'} (€)`} type="number" step="1" min="1" value={primaryStake} onChange={(e) => setPrimaryStake(parseFloat(e.target.value) || 0)} />
              </div>
              <h3 className="text-md font-semibold pt-2 border-t border-neutral-300 dark:border-neutral-600">Setări & Rezultate Calculator</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Profit minim dorit (% din miza principală)" type="number" step="0.1" min="0" value={profitPct} onChange={(e) => setProfitPct(parseFloat(e.target.value) || 0)} />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Buffer cotă secundară</label>
                  <div className="flex gap-2">{[0, 0.03, 0.05, 0.1].map((b) => (<Button key={b} variant={buffer === b ? 'primary' : 'outline'} size="sm" onClick={() => setBuffer(b)}>+{b.toFixed(2)}</Button>))}</div>
                </div>
              </div>
              <div className="p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <p>Fezabil: <b className={suggestion.feasible ? 'text-green-500' : 'text-red-500'}>{suggestion.feasible ? 'DA' : 'NU'}</b></p>
                  {calculationMode === 'fromValue' && <p>Cota min. P2: <b>{(suggestion as MiddleSuggestion).o2min?.toFixed(3) || '—'}</b></p>}
                  {calculationMode === 'fromMiddle' && <p>Cota min. P1: <b>{(suggestion as ValueSuggestion).o1min?.toFixed(3) || '—'}</b></p>}
                  <p>Cota rec. secundară: <b>{calculationMode === 'fromValue' ? (suggestion as MiddleSuggestion).o2?.toFixed(3) : (suggestion as ValueSuggestion).o1?.toFixed(3) || '—'}</b></p>
                  <p>Miza rec. secundară: <b>{formatCurrency(calculationMode === 'fromValue' ? (suggestion as MiddleSuggestion).s2 : (suggestion as ValueSuggestion).s1)}</b></p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-2 border-t border-neutral-300 dark:border-neutral-600">
                  <p>Profit P1: <b className={(suggestion.p1 ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(suggestion.p1)}</b></p>
                  <p>Profit P2: <b className={(suggestion.p2 ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(suggestion.p2)}</b></p>
                  <p>Profit Middle: <b className="text-green-500">{formatCurrency(suggestion.pb)}</b></p>
                </div>
              </div>
              {(watchdogAnalysis.stake || watchdogAnalysis.middle) && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg space-y-2">
                      <h4 className="flex items-center text-sm font-semibold text-yellow-800 dark:text-yellow-200"><ExclamationTriangleIcon className="h-5 w-5 mr-2" />AI Watchdog - Avertizări de Risc</h4>
                      {watchdogAnalysis.stake && (<p className="text-xs text-yellow-700 dark:text-yellow-300">{watchdogAnalysis.stake}</p>)}
                      {watchdogAnalysis.middle && (<p className="text-xs text-yellow-700 dark:text-yellow-300">{watchdogAnalysis.middle}</p>)}
                  </div>
              )}
              <div className="flex justify-end space-x-3 pt-3">
                <Button variant="ghost" type="button" onClick={onClose}>Anulează</Button>
                <Button variant="primary" type="button" onClick={handleSaveValueAndMiddle} disabled={!suggestion.feasible}>Salvează Grup</Button>
              </div>
          </div>
      )}
    </Modal>
  );
};

// ------------ Edit Form (recalculează middleDetails) ------------
const EditBetFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
}> = ({ isOpen, onClose, bet }) => {
  const { appData, updateBet } = useData();
  const { addNotification } = useNotifications();

  const [formData, setFormData] = useState({
    date: '',
    eventTimestamp: '',
    sport: '',
    league: '',
    event: '',
    selection: '',
    market: '',
    odds: '',
    stake: '',
    notes: '',
  });

  useEffect(() => {
    if (bet) {
      setFormData({
        date: bet.date,
        eventTimestamp: bet.eventTimestamp ? getIsoDateTimeString(new Date(bet.eventTimestamp)) : '',
        sport: bet.sport,
        league: bet.league,
        event: bet.event,
        selection: bet.selection,
        market: bet.market,
        odds: String(bet.odds),
        stake: String(bet.stake),
        notes: bet.notes || '',
      });
    }
  }, [bet]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!bet) return;

    const odds = parseFloat(formData.odds);
    const stake = parseFloat(formData.stake);
    if (isNaN(odds) || isNaN(stake) || odds <= 1 || stake <= 0) {
      addNotification('Cota și miza trebuie să fie numere valide și pozitive.', NotificationType.ERROR);
      return;
    }

    const eventDate = new Date(formData.eventTimestamp);
    if (isNaN(eventDate.getTime())) {
      addNotification('Data și ora evenimentului sunt invalide.', NotificationType.ERROR);
      return;
    }

    const updates: Partial<Omit<Bet, 'id'>> = {
      date: eventDate.toISOString().split('T')[0],
      eventTimestamp: formData.eventTimestamp,
      sport: formData.sport,
      league: formData.league,
      event: formData.event,
      selection: formData.selection,
      market: formData.market,
      odds,
      stake,
      notes: formData.notes,
    };

    // găsește perechea
    const pairValue = appData?.bets?.find(
      (b) => b.groupId === bet.groupId && b.betType === BetType.VALUE
    );
    const pairMiddle = appData?.bets?.find(
      (b) => b.groupId === bet.groupId && b.betType === BetType.MIDDLE
    );

    if (bet.betType === BetType.MIDDLE && pairValue) {
      // s-a editat Middle ⇒ middleDetails se calculează cu Value existent + NOUL Middle
      updates.middleDetails = computeMiddleProfits(pairValue.odds, pairValue.stake, odds, stake);
      await updateBet(bet.id, updates);
    } else if (bet.betType === BetType.VALUE && pairMiddle) {
      // s-a editat Value ⇒ middleDetails pe Middle cu NOUL Value + Middle existent
      await updateBet(bet.id, updates);
      const md = computeMiddleProfits(odds, stake, pairMiddle.odds, pairMiddle.stake);
      await updateBet(pairMiddle.id, { middleDetails: md });
    } else {
      await updateBet(bet.id, updates);
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Modifică Pariu: ${bet?.selection || ''}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data și Ora Eveniment"
            type="datetime-local"
            name="eventTimestamp"
            value={formData.eventTimestamp}
            onChange={handleChange}
            required
          />
          <Input label="Sport" name="sport" value={formData.sport} onChange={handleChange} />
          <Input label="Ligă" name="league" value={formData.league} onChange={handleChange} />
          <Input label="Eveniment" name="event" value={formData.event} onChange={handleChange} />
          <Input label="Piață" name="market" value={formData.market} onChange={handleChange} />
          <Input label="Selecție" name="selection" value={formData.selection} onChange={handleChange} />
          <Input
            label="Cotă"
            name="odds"
            type="number"
            step="0.01"
            value={formData.odds}
            onChange={handleChange}
          />
          <Input
            label="Miză (€)"
            name="stake"
            type="number"
            step="1"
            value={formData.stake}
            onChange={handleChange}
          />
        </div>
        <Textarea label="Notițe" name="notes" value={formData.notes} onChange={handleChange} />

        <div className="flex justify-end space-x-3 pt-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            Anulează
          </Button>
          <Button variant="primary" type="button" onClick={handleSave}>
            Salvează Modificările
          </Button>
        </div>
      </div>
    </Modal>
  );
};


// ------------ NEW: Combobox Component for Suggestions ------------
interface ComboboxInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: string[];
  required?: boolean;
}

const ComboboxInput: React.FC<ComboboxInputProps> = ({ label, value, onChange, placeholder, suggestions, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions;
    return suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 text-sm text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 cursor-pointer"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


export default AdminDataManagementPage;