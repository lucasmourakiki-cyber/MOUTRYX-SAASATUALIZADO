import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ServiceOrder, ServiceStatus } from '../../types';
import {
  isFieldOnline,
  getSimulatedOffline,
  setSimulatedOffline,
  savePreSyncedData,
  getPreSyncedData,
  recordOfflineAction,
  recordOfflineOccurrence,
  getActionsForOS,
  getOperationPhotosForOS,
  saveOperationPhoto,
  deduplicateOperationPhotos,
  getPendingActions,
  flushOfflineSyncQueue,
  OfflineAction,
  OperationPhoto,
  calculateAppliedPercentage,
  getDeviceLocalTimeString,
  getDeviceLocalDateString,
  getDeviceLocalDateTimeString,
  formatLocalTime,
} from '../../utils/fieldOfflineStore';
import { FieldOccurrenceModal } from './field/FieldOccurrenceModal';
import { FieldPauseModal } from './field/FieldPauseModal';
import { FieldPhotoModal } from './field/FieldPhotoModal';
import { FieldAppliedAreaModal } from './field/FieldAppliedAreaModal';
import { FieldFinishModal } from './field/FieldFinishModal';
import { FieldSummaryModal } from './field/FieldSummaryModal';
import { FieldPhotoGallery } from './field/FieldPhotoGallery';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Ruler,
  Play,
  Pause,
  ArrowLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  MapPin,
  Sprout,
  User,
  Plane,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
  Check,
  FileText,
  X,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FieldModeView: React.FC = () => {
  const {
    serviceOrders,
    pilots,
    drones,
    properties,
    talhoes,
    currentCompany,
    apiSync,
    updateServiceOrderStatus,
    occurrences,
    registerFieldOccurrence,
  } = useApp();
  const { user: authUser } = useAuth();

  const companyId = currentCompany?.id || 'moutryx-demo-company';

  // Online / Offline state
  const [isOnlineState, setIsOnlineState] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Selected OS for Conversational Thread
  const [selectedOSId, setSelectedOSId] = useState<string | null>(null);

  // OS Filter
  const [activeFilter, setActiveFilter] = useState<'hoje' | 'em_andamento' | 'todas' | 'concluidas'>('hoje');

  // Date filter for "CONCLUÍDAS" (start date and end date range)
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [appliedFilterStartDate, setAppliedFilterStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [appliedFilterEndDate, setAppliedFilterEndDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Conflict state when trying to open a new operation while one is in progress
  const [conflictTargetOS, setConflictTargetOS] = useState<ServiceOrder | null>(null);

  // Modals
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isAppliedAreaModalOpen, setIsAppliedAreaModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    title?: string;
    description?: string;
    time?: string;
    date?: string;
  } | null>(null);

  // Toast notification state for immediate field feedback
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    subMessage?: string;
    type: 'success' | 'offline' | 'info';
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Local timeline actions state (refreshed whenever offline action is added)
  const [localActionsVersion, setLocalActionsVersion] = useState(0);

  // Scroll to bottom of chat ref
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Determine current pilot name
  const currentPilotName = useMemo(() => {
    if (authUser?.name) return authUser.name;
    if (pilots && pilots.length > 0) return pilots[0].name;
    return 'Piloto';
  }, [authUser, pilots]);

  const currentPilotId = useMemo(() => {
    const p = pilots.find((item) => item.name === currentPilotName);
    return p ? p.id : 'pilot-default';
  }, [pilots, currentPilotName]);

  // Pre-sync operational data on mount and update connection state
  useEffect(() => {
    const updateConn = () => {
      setIsOnlineState(isFieldOnline());
      setIsSimulated(getSimulatedOffline());
      setPendingCount(getPendingActions(companyId).length);
    };

    updateConn();
    window.addEventListener('online', updateConn);
    window.addEventListener('offline', updateConn);

    // Pre-cache data
    if (serviceOrders.length > 0) {
      savePreSyncedData(companyId, {
        serviceOrders,
        pilots,
        drones,
        properties,
        talhoes,
      });
    }

    return () => {
      window.removeEventListener('online', updateConn);
      window.removeEventListener('offline', updateConn);
    };
  }, [companyId, serviceOrders, pilots, drones, properties, talhoes]);

  // Update pending count when actions change
  useEffect(() => {
    setPendingCount(getPendingActions(companyId).length);
  }, [companyId, localActionsVersion]);

  // Combined OS list (from Context or Cached LocalStorage fallback)
  const effectiveOSList = useMemo(() => {
    if (serviceOrders && serviceOrders.length > 0) {
      return serviceOrders;
    }
    const cached = getPreSyncedData(companyId);
    return cached.serviceOrders || [];
  }, [serviceOrders, companyId]);

  // Helper to get computed status of any OS incorporating pending local offline actions
  const getOSLiveStatus = (os: ServiceOrder): ServiceStatus => {
    const actions = getActionsForOS(companyId, os.id);
    if (actions.length > 0) {
      // Check total applied area from actions vs contracted area
      const areaActions = actions.filter((a) => a.type === 'APPLIED_AREA' || a.type === 'FINISH_OPERATION');
      const latestApplied = areaActions.length > 0 && areaActions[areaActions.length - 1].payload.appliedAreaHa !== undefined
        ? areaActions[areaActions.length - 1].payload.appliedAreaHa!
        : (os.actualAreaSprayedHa || 0);

      const isAreaFullyFinished = os.areaHa > 0 ? latestApplied >= os.areaHa : false;

      const hasFinish = actions.some((a) => a.type === 'FINISH_OPERATION');
      if (hasFinish && isAreaFullyFinished) {
        return 'concluido';
      }

      const stateActions = actions.filter((a) =>
        ['START_OPERATION', 'PAUSE_OPERATION', 'RESUME_OPERATION', 'APPLIED_AREA', 'OCCURRENCE', 'PHOTO', 'FINISH_OPERATION'].includes(a.type)
      );
      if (stateActions.length > 0) {
        const last = stateActions[stateActions.length - 1];
        if (last.type === 'PAUSE_OPERATION') return 'pausado' as any;
        return 'em_operacao';
      }
    }
    if (os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago') {
      return 'concluido';
    }
    if ((os.status as any) === 'pausado') {
      return 'pausado' as any;
    }
    if (os.status === 'em_operacao') {
      return 'em_operacao';
    }
    if (os.status === 'cancelado') {
      return 'cancelado';
    }
    return os.status || 'agendado';
  };

  // Helper: Format date string to DD/MM/YYYY
  const formatDateBR = (dateStr?: string): string => {
    if (!dateStr || !dateStr.trim()) return 'Sem data programada';
    const trimmed = dateStr.trim();
    if (trimmed.includes('/')) return trimmed;
    const parts = trimmed.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return trimmed;
  };

  // Helper: Extract local YYYY-MM-DD from any date/string/timestamp without UTC timezone shifts
  const extractLocalDateKey = (val?: any): string => {
    if (!val) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val !== 'string') return '';
    const str = val.trim();
    if (!str) return '';

    // 1. Format DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
    if (str.includes('/')) {
      const clean = str.split(' ')[0].split('T')[0];
      const parts = clean.split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${d}`;
      }
    }

    // 2. ISO 8601 with time or timezone (e.g. 2026-08-23T15:30:00.000Z or 2026-08-23T23:30:00-03:00)
    if (str.includes('T') || str.includes('Z')) {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // 3. Simple YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    if (str.includes('-')) {
      const clean = str.split(' ')[0].split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    return '';
  };

  // Helper: Shift days from today to get canonical YYYY-MM-DD in local time
  const getShiftedDateStr = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper: Get first day of current month YYYY-MM-01
  const getMonthStartDateStr = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  };

  // Helper: Get real completion date for completed OS (strictly from finalizedAt / FINISH_OPERATION or completedDate)
  const getOSCompletionDate = (os: ServiceOrder): string => {
    const actions = getActionsForOS(companyId, os.id);
    const finishAct = [...actions].reverse().find((a) => a.type === 'FINISH_OPERATION');
    if (finishAct) {
      if (finishAct.timestamp) {
        const k = extractLocalDateKey(finishAct.timestamp);
        if (k) return k;
      }
      if ((finishAct.payload as any)?.completedDate) {
        const k = extractLocalDateKey((finishAct.payload as any).completedDate);
        if (k) return k;
      }
    }
    if ((os as any).finalizedAt) {
      const k = extractLocalDateKey((os as any).finalizedAt);
      if (k) return k;
    }
    if (os.completedDate) {
      const k = extractLocalDateKey(os.completedDate);
      if (k) return k;
    }
    if ((os as any).finishedAt) {
      const k = extractLocalDateKey((os as any).finishedAt);
      if (k) return k;
    }
    if ((os as any).completedAt) {
      const k = extractLocalDateKey((os as any).completedAt);
      if (k) return k;
    }
    return '';
  };

  // Helper: Get weekday name in Portuguese
  const getDayOfWeekName = (dateStr?: string): string => {
    if (!dateStr || !dateStr.trim()) return '';
    let dt: Date;
    const trimmed = dateStr.trim().split('T')[0];
    if (trimmed.includes('/')) {
      const p = trimmed.split('/');
      dt = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    } else {
      const p = trimmed.split('-');
      dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }
    if (isNaN(dt.getTime())) return '';
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    return days[dt.getDay()];
  };

  // Helper: Convert YYYY-MM-DD + HH:MM into sorting score (timestamp)
  const getChronologicalScore = (dateStr?: string, timeStr?: string): number => {
    if (!dateStr || !dateStr.trim()) {
      return 9999999999999; // Items without scheduled date always go to the end
    }
    let y = 2026, m = 1, d = 1;
    const trimmedDate = dateStr.trim().split('T')[0];
    if (trimmedDate.includes('/')) {
      const p = trimmedDate.split('/');
      d = parseInt(p[0], 10) || 1;
      m = parseInt(p[1], 10) || 1;
      y = parseInt(p[2], 10) || 2026;
    } else if (trimmedDate.includes('-')) {
      const p = trimmedDate.split('-');
      y = parseInt(p[0], 10) || 2026;
      m = parseInt(p[1], 10) || 1;
      d = parseInt(p[2], 10) || 1;
    } else {
      return 9999999999999;
    }

    let hh = 23, mm = 59, ss = 59;
    if (timeStr && timeStr.trim()) {
      const tParts = timeStr.trim().split(':');
      hh = parseInt(tParts[0], 10) || 0;
      mm = parseInt(tParts[1], 10) || 0;
      ss = parseInt(tParts[2], 10) || 0;
    }

    const dt = new Date(y, m - 1, d, hh, mm, ss);
    return isNaN(dt.getTime()) ? 9999999999999 : dt.getTime();
  };

  // Helper: Normalize date to YYYY-MM-DD
  const normalizeDateStr = (dateStr?: string): string => {
    if (!dateStr || !dateStr.trim()) return '';
    const trimmed = dateStr.trim().split('T')[0];
    if (trimmed.includes('/')) {
      const p = trimmed.split('/');
      if (p.length === 3) {
        return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  };

  // Active ongoing operation (if any is currently started and not completed)
  const ongoingOperation = useMemo(() => {
    return effectiveOSList.find((os) => getOSLiveStatus(os) === 'em_operacao') || null;
  }, [effectiveOSList, companyId, localActionsVersion]);

  // Current applied area of ongoing operation
  const ongoingAppliedArea = useMemo(() => {
    if (!ongoingOperation) return 0;
    const actions = getActionsForOS(companyId, ongoingOperation.id);
    const areaActions = actions.filter((a) => a.type === 'APPLIED_AREA' || a.type === 'FINISH_OPERATION');
    if (areaActions.length > 0) {
      const last = areaActions[areaActions.length - 1];
      if (last.payload.appliedAreaHa !== undefined) {
        return last.payload.appliedAreaHa;
      }
    }
    return ongoingOperation.actualAreaSprayedHa || 0;
  }, [ongoingOperation, companyId, localActionsVersion]);

  // Last action timestamp / display time of ongoing operation
  const ongoingLastRecordTime = useMemo(() => {
    if (!ongoingOperation) return '--:--';
    const actions = getActionsForOS(companyId, ongoingOperation.id);
    if (actions.length > 0) {
      const last = actions[actions.length - 1];
      return last.displayTime || formatLocalTime(last.timestamp);
    }
    return ongoingOperation.scheduledTime || '--:--';
  }, [ongoingOperation, companyId, localActionsVersion]);

  // PRÓXIMA OPERAÇÃO PENDENTE (Closest pending service in time)
  const nextPendingOS = useMemo(() => {
    const pendingList = effectiveOSList.filter((os) => {
      const liveStatus = getOSLiveStatus(os);
      return (
        liveStatus !== 'concluido' &&
        liveStatus !== 'cancelado' &&
        liveStatus !== 'faturado' &&
        liveStatus !== 'pago' &&
        liveStatus !== 'em_operacao'
      );
    });

    if (pendingList.length === 0) return null;

    const sortedPending = [...pendingList].sort((a, b) => {
      const scoreA = getChronologicalScore(a.scheduledDate, a.scheduledTime);
      const scoreB = getChronologicalScore(b.scheduledDate, b.scheduledTime);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.osNumber || '').localeCompare(b.osNumber || '');
    });

    return sortedPending[0] || null;
  }, [effectiveOSList, companyId, localActionsVersion]);

  // Tab count indicators for badges
  const tabCounts = useMemo(() => {
    const now = new Date();
    const todayNormalized = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let hoje = 0;
    let em_andamento = 0;
    let todas = 0;
    let concluidas = 0;

    effectiveOSList.forEach((os) => {
      const liveStatus = getOSLiveStatus(os);
      const normDate = normalizeDateStr(os.scheduledDate);
      const isFinal =
        liveStatus === 'concluido' ||
        liveStatus === 'faturado' ||
        liveStatus === 'pago';
      const isCancelled = liveStatus === 'cancelado';
      const isRunning = liveStatus === 'em_operacao' || (liveStatus as any) === 'pausado';

      if (isFinal) {
        concluidas++;
      } else if (!isCancelled) {
        todas++;
        if (isRunning) {
          em_andamento++;
        }
        if (normDate === todayNormalized || isRunning) {
          hoje++;
        }
      }
    });

    return { hoje, em_andamento, todas, concluidas };
  }, [effectiveOSList, companyId, localActionsVersion]);

  // Grouped OS list (Chronologically sorted and grouped by date)
  const groupedOSList = useMemo(() => {
    const now = new Date();
    const todayNormalized = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowNormalized = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // 1. Filter by active filter tab
    const filtered = effectiveOSList.filter((os) => {
      const liveStatus = getOSLiveStatus(os);
      const normDate = normalizeDateStr(os.scheduledDate);
      const isFinal =
        liveStatus === 'concluido' ||
        liveStatus === 'faturado' ||
        liveStatus === 'pago';
      const isCancelled = liveStatus === 'cancelado';
      const isRunning = liveStatus === 'em_operacao' || (liveStatus as any) === 'pausado';

      if (activeFilter === 'hoje') {
        // Strict "HOJE": must be today or currently ongoing, and NOT concluded or cancelled
        if (isFinal || isCancelled) return false;
        return normDate === todayNormalized || isRunning;
      }
      if (activeFilter === 'em_andamento') {
        // Strict "EM ANDAMENTO": only operations that were started and not yet finished
        if (isFinal || isCancelled) return false;
        return isRunning;
      }
      if (activeFilter === 'concluidas') {
        // Strict "CONCLUIDAS": exclusively completed OS
        return isFinal;
      }
      // activeFilter === 'todas': All active OS (today, future, scheduled, in-progress), EXCLUDING completed and cancelled
      return !isFinal && !isCancelled;
    });

    // 2. Sort chronologically: 1º Date, 2º Time (concluded sorted by most recent first)
    const sorted = [...filtered].sort((a, b) => {
      if (activeFilter === 'concluidas') {
        const compDateA = getOSCompletionDate(a);
        const compDateB = getOSCompletionDate(b);
        const scoreA = getChronologicalScore(compDateA, a.scheduledTime);
        const scoreB = getChronologicalScore(compDateB, b.scheduledTime);
        return scoreB - scoreA;
      }
      const scoreA = getChronologicalScore(a.scheduledDate, a.scheduledTime);
      const scoreB = getChronologicalScore(b.scheduledDate, b.scheduledTime);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.osNumber || '').localeCompare(b.osNumber || '');
    });

    // 3. Group by date categories
    const groupsMap = new Map<
      string,
      {
        key: string;
        category: 'hoje' | 'em_andamento' | 'amanha' | 'proximos' | 'anteriores' | 'concluidas' | 'sem_data';
        title: string;
        subTitle: string;
        dateStr?: string;
        orders: ServiceOrder[];
      }
    >();

    if (activeFilter === 'em_andamento') {
      if (sorted.length === 0) {
        return [];
      }
      const key = 'em_andamento_todas';
      groupsMap.set(key, {
        key,
        category: 'em_andamento',
        title: 'OPERAÇÕES EM ANDAMENTO',
        subTitle: `${sorted.length} ${
          sorted.length === 1 ? 'operação em execução no campo' : 'operações em execução no campo'
        }`,
        orders: sorted,
      });
      return Array.from(groupsMap.values());
    }

    if (activeFilter === 'concluidas') {
      let normStart = appliedFilterStartDate ? extractLocalDateKey(appliedFilterStartDate) : '';
      let normEnd = appliedFilterEndDate ? extractLocalDateKey(appliedFilterEndDate) : '';

      // Auto-swap if start is after end
      if (normStart && normEnd && normStart > normEnd) {
        const temp = normStart;
        normStart = normEnd;
        normEnd = temp;
      }

      const filteredConcluidas = sorted.filter((os) => {
        // Must be a finished OS
        const liveStatus = getOSLiveStatus(os);
        const isFinal = liveStatus === 'concluido' || liveStatus === 'faturado' || liveStatus === 'pago';
        if (!isFinal) return false;

        // Strictly compare the real completion date key (YYYY-MM-DD local time)
        const compDateKey = getOSCompletionDate(os);
        if (!compDateKey) return false;

        if (normStart && compDateKey < normStart) return false;
        if (normEnd && compDateKey > normEnd) return false;
        return true;
      });

      if (filteredConcluidas.length === 0) {
        return [];
      }

      const key = `concluidas_${normStart}_${normEnd}`;
      const title =
        normStart === normEnd && normStart
          ? `OPERAÇÕES CONCLUÍDAS EM ${formatDateBR(normStart)}`
          : normStart && normEnd
          ? `OPERAÇÕES CONCLUÍDAS DE ${formatDateBR(normStart)} ATÉ ${formatDateBR(normEnd)}`
          : normStart
          ? `OPERAÇÕES CONCLUÍDAS A PARTIR DE ${formatDateBR(normStart)}`
          : normEnd
          ? `OPERAÇÕES CONCLUÍDAS ATÉ ${formatDateBR(normEnd)}`
          : 'TODAS AS OPERAÇÕES CONCLUÍDAS';

      groupsMap.set(key, {
        key,
        category: 'concluidas',
        title,
        subTitle: `Quantidade encontrada: ${filteredConcluidas.length} ${
          filteredConcluidas.length === 1 ? 'operação' : 'operações'
        }`,
        dateStr: normStart || normEnd,
        orders: filteredConcluidas,
      });
      return Array.from(groupsMap.values());
    }

    sorted.forEach((os) => {
      const normDate = normalizeDateStr(os.scheduledDate);

      if (!normDate) {
        const key = 'sem_data';
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            category: 'sem_data',
            title: '⚠️ SEM DATA PROGRAMADA',
            subTitle: 'Ordens de serviço aguardando agendamento formal',
            orders: [],
          });
        }
        groupsMap.get(key)!.orders.push(os);
        return;
      }

      if (normDate === todayNormalized) {
        const key = 'hoje';
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            category: 'hoje',
            title: `HOJE — ${formatDateBR(normDate)}`,
            subTitle: getDayOfWeekName(normDate),
            dateStr: normDate,
            orders: [],
          });
        }
        groupsMap.get(key)!.orders.push(os);
      } else if (normDate === tomorrowNormalized) {
        const key = 'amanha';
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            category: 'amanha',
            title: `AMANHÃ — ${formatDateBR(normDate)}`,
            subTitle: getDayOfWeekName(normDate),
            dateStr: normDate,
            orders: [],
          });
        }
        groupsMap.get(key)!.orders.push(os);
      } else if (normDate > tomorrowNormalized) {
        const key = `futuro_${normDate}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            category: 'proximos',
            title: `📅 ${formatDateBR(normDate)}`,
            subTitle: getDayOfWeekName(normDate),
            dateStr: normDate,
            orders: [],
          });
        }
        groupsMap.get(key)!.orders.push(os);
      } else {
        const key = `passado_${normDate}`;
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            category: 'anteriores',
            title: `📅 ${formatDateBR(normDate)}`,
            subTitle: `${getDayOfWeekName(normDate)} (Anterior)`,
            dateStr: normDate,
            orders: [],
          });
        }
        groupsMap.get(key)!.orders.push(os);
      }
    });

    return Array.from(groupsMap.values());
  }, [effectiveOSList, activeFilter, appliedFilterStartDate, appliedFilterEndDate, companyId, localActionsVersion]);

  // Selected OS Object
  const selectedOS = useMemo(() => {
    if (!selectedOSId) return null;
    return effectiveOSList.find((os) => os.id === selectedOSId) || null;
  }, [effectiveOSList, selectedOSId]);

  // Actions for the selected OS (merged from offline store and AppContext)
  const osActions = useMemo(() => {
    if (!selectedOSId) return [];
    const local = getActionsForOS(companyId, selectedOSId);

    // Merge any occurrences from AppContext for this OS
    const contextOccs = (occurrences || []).filter(
      (o) =>
        (o.osId === selectedOSId || (selectedOS && o.osNumber === selectedOS.osNumber)) &&
        (!companyId || !o.companyId || o.companyId === companyId)
    );

    const merged: OfflineAction[] = [...local];

    contextOccs.forEach((co) => {
      const alreadyInLocal = merged.some(
        (a) => a.id === co.id || (a.type === 'OCCURRENCE' && a.payload.occurrenceId === co.id)
      );
      if (!alreadyInLocal) {
        merged.push({
          id: co.id,
          companyId: co.companyId || companyId,
          userId: authUser?.id || 'user-default',
          pilotId: co.pilotId || currentPilotId,
          pilotName: co.pilotName || currentPilotName,
          osId: selectedOSId,
          osNumber: selectedOS?.osNumber || '',
          type: 'OCCURRENCE',
          timestamp: co.timestamp ? new Date(co.timestamp).toISOString() : new Date().toISOString(),
          displayTime: co.timestamp ? co.timestamp.split(' ')[1]?.substring(0, 5) || '12:00' : '12:00',
          synced: true,
          payload: {
            occurrenceId: co.id,
            occurrenceType: co.type,
            occurrenceLabel: co.description.split(':')[0] || 'Ocorrência',
            description: co.description.includes(':')
              ? co.description.split(':').slice(1).join(':').trim()
              : co.description,
            photoUrl: co.photoUrl || undefined,
            photoBase64: co.photoUrl || undefined,
            photoId: co.photoUrl ? `photo_${co.id}` : undefined,
          },
        });
      }
    });

    return merged.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [companyId, selectedOSId, selectedOS, occurrences, localActionsVersion, authUser, currentPilotId, currentPilotName]);

  // Persistent photos for the selected OS (from direct photo store + actions)
  const currentOSPhotos = useMemo<OperationPhoto[]>(() => {
    if (!selectedOSId) return [];
    const stored = getOperationPhotosForOS(companyId, selectedOSId);

    const actionPhotos: OperationPhoto[] = osActions
      .filter((a) => a.type === 'PHOTO' && a.payload.photoBase64)
      .map((a) => ({
        id: `act_${a.id}`,
        companyId: a.companyId,
        osId: a.osId,
        osNumber: a.osNumber,
        pilotId: a.pilotId,
        pilotName: a.pilotName,
        photoBase64: a.payload.photoBase64!,
        caption: a.payload.photoCaption || 'Foto registrada no campo',
        timestamp: a.timestamp,
        displayTime: a.displayTime,
        displayDate: formatDateBR(a.timestamp.split('T')[0]),
        synced: a.synced,
        source: 'photo' as const,
      }));

    const occurrencePhotos: OperationPhoto[] = osActions
      .filter((a) => a.type === 'OCCURRENCE' && (a.payload.photoUrl || a.payload.photoBase64))
      .map((a) => ({
        id: a.payload.photoId || `occ_${a.id}`,
        companyId: a.companyId,
        osId: a.osId,
        osNumber: a.osNumber,
        pilotId: a.pilotId,
        pilotName: a.pilotName,
        photoBase64: (a.payload.photoUrl || a.payload.photoBase64)!,
        caption: `Ocorrência: ${a.payload.occurrenceLabel || 'Campo'}${a.payload.description ? ` - ${a.payload.description}` : ''}`,
        timestamp: a.timestamp,
        displayTime: a.displayTime,
        displayDate: formatDateBR(a.timestamp.split('T')[0]),
        synced: a.synced,
        source: 'occurrence' as const,
      }));

    return deduplicateOperationPhotos([...stored, ...actionPhotos, ...occurrencePhotos]).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [companyId, selectedOSId, osActions, localActionsVersion]);

  // Computed state of selected OS (incorporating offline actions)
  const osOperationalState = useMemo<'agendado' | 'em_operacao' | 'pausado' | 'concluido'>(() => {
    if (!selectedOS) return 'agendado';
    
    // Check offline actions
    if (osActions.length > 0) {
      const areaActions = osActions.filter((a) => a.type === 'APPLIED_AREA' || a.type === 'FINISH_OPERATION');
      const latestApplied = areaActions.length > 0 && areaActions[areaActions.length - 1].payload.appliedAreaHa !== undefined
        ? areaActions[areaActions.length - 1].payload.appliedAreaHa!
        : (selectedOS.actualAreaSprayedHa || 0);

      const isAreaFullyFinished = selectedOS.areaHa > 0 ? latestApplied >= selectedOS.areaHa : false;

      const hasFinish = osActions.some((a) => a.type === 'FINISH_OPERATION');
      if (hasFinish && isAreaFullyFinished) return 'concluido';

      const stateActions = osActions.filter((a) =>
        ['START_OPERATION', 'PAUSE_OPERATION', 'RESUME_OPERATION', 'APPLIED_AREA', 'OCCURRENCE', 'PHOTO', 'FINISH_OPERATION'].includes(a.type)
      );
      if (stateActions.length > 0) {
        const last = stateActions[stateActions.length - 1];
        if (last.type === 'PAUSE_OPERATION') return 'pausado';
        return 'em_operacao';
      }
    }

    if (
      selectedOS.status === 'concluido' ||
      selectedOS.status === 'faturado' ||
      selectedOS.status === 'pago'
    ) {
      return 'concluido';
    }
    if ((selectedOS.status as any) === 'pausado') {
      return 'pausado';
    }
    if (selectedOS.status === 'em_operacao') {
      return 'em_operacao';
    }

    return 'agendado';
  }, [selectedOS, osActions]);

  // Last pause metadata when paused
  const lastPauseInfo = useMemo(() => {
    if (osOperationalState !== 'pausado') return null;
    const pauses = osActions.filter((a) => a.type === 'PAUSE_OPERATION');
    if (pauses.length > 0) {
      const last = pauses[pauses.length - 1];
      return {
        reason: last.payload?.pauseReason || 'Pausa operacional',
        time: last.displayTime || formatLocalTime(last.timestamp),
      };
    }
    return {
      reason: 'Pausa operacional',
      time: ongoingLastRecordTime || '--:--',
    };
  }, [osOperationalState, osActions, ongoingLastRecordTime]);

  // Computed applied area (incorporating offline area updates)
  const currentAppliedArea = useMemo(() => {
    if (!selectedOS) return 0;
    const areaActions = osActions.filter((a) => a.type === 'APPLIED_AREA' || a.type === 'FINISH_OPERATION');
    if (areaActions.length > 0) {
      const last = areaActions[areaActions.length - 1];
      if (last.payload.appliedAreaHa !== undefined) {
        return last.payload.appliedAreaHa;
      }
    }
    return selectedOS.actualAreaSprayedHa || 0;
  }, [selectedOS, osActions]);

  // Handle selecting an OS with ongoing conflict prevention
  const handleSelectOS = (os: ServiceOrder) => {
    const liveStatus = getOSLiveStatus(os);
    if (ongoingOperation && ongoingOperation.id !== os.id && liveStatus === 'agendado') {
      setConflictTargetOS(os);
      return;
    }
    setSelectedOSId(os.id);
  };

  // Scroll to bottom when actions update
  useEffect(() => {
    if (selectedOSId && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedOSId, osActions.length, osOperationalState]);

  // Toggle Simulated Offline
  const handleToggleOfflineMode = () => {
    const nextState = !isSimulated;
    setSimulatedOffline(nextState);
    setIsSimulated(nextState);
    setIsOnlineState(!nextState);
    setPendingCount(getPendingActions(companyId).length);
  };

  // Trigger Sync
  const handleManualSync = async () => {
    if (!isFieldOnline()) {
      alert('O dispositivo está operando sem conexão com a internet.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: pendingCount });

    try {
      const res = await flushOfflineSyncQueue(companyId, apiSync, (cur, tot) => {
        setSyncProgress({ current: cur, total: tot });
      });

      setLocalActionsVersion((v) => v + 1);
      setPendingCount(getPendingActions(companyId).length);

      if (res.success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('[SYNC ERROR]', err);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // --- Operational Actions Handlers ---
  const handleStartOperation = () => {
    if (!selectedOS) return;

    if (ongoingOperation && ongoingOperation.id !== selectedOS.id) {
      setConflictTargetOS(selectedOS);
      return;
    }

    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const timestamp = getDeviceLocalDateTimeString(now);

    recordOfflineAction({
      companyId,
      userId: authUser?.id || 'user-default',
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      type: 'START_OPERATION',
      timestamp,
      displayTime,
      payload: {
        droneId: selectedOS.droneId,
        droneModel: selectedOS.droneModel,
      },
    });

    updateServiceOrderStatus(selectedOS.id, 'em_operacao');
    setLocalActionsVersion((v) => v + 1);

    // If online, trigger background flush
    if (isFieldOnline()) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  const handlePauseOperation = (pauseReason: string) => {
    if (!selectedOS) return;

    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const timestamp = getDeviceLocalDateTimeString(now);

    recordOfflineAction({
      companyId,
      userId: authUser?.id || 'user-default',
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      type: 'PAUSE_OPERATION',
      timestamp,
      displayTime,
      payload: {
        pauseReason,
      },
    });

    updateServiceOrderStatus(selectedOS.id, 'pausado' as any);
    setLocalActionsVersion((v) => v + 1);

    const isOnline = isFieldOnline();
    setToastNotification({
      message: 'Operação pausada',
      subMessage: `${pauseReason} • Início às ${displayTime}`,
      type: isOnline ? 'info' : 'offline',
    });

    if (isOnline) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  const handleResumeOperation = () => {
    if (!selectedOS) return;

    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const timestamp = getDeviceLocalDateTimeString(now);

    recordOfflineAction({
      companyId,
      userId: authUser?.id || 'user-default',
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      type: 'RESUME_OPERATION',
      timestamp,
      displayTime,
      payload: {},
    });

    updateServiceOrderStatus(selectedOS.id, 'em_operacao');
    setLocalActionsVersion((v) => v + 1);

    const isOnline = isFieldOnline();
    setToastNotification({
      message: 'Operação retomada com sucesso',
      subMessage: `Retorno registrado às ${displayTime}`,
      type: 'success',
    });

    if (isOnline) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  const handleSaveOccurrence = async (data: {
    occurrenceType: string;
    occurrenceLabel: string;
    description: string;
    photoBase64?: string;
  }) => {
    if (!selectedOS) return;

    try {
      const now = new Date();
      const displayTime = getDeviceLocalTimeString(now);
      const timestamp = getDeviceLocalDateTimeString(now);

      const { occurrenceAction } = await recordOfflineOccurrence({
        companyId,
        userId: authUser?.id || 'user-default',
        pilotId: currentPilotId,
        pilotName: currentPilotName,
        osId: selectedOS.id,
        osNumber: selectedOS.osNumber,
        occurrenceType: data.occurrenceType,
        occurrenceLabel: data.occurrenceLabel,
        description: data.description,
        photoBase64: data.photoBase64,
        timestamp,
        displayTime,
      });

      // Synchronize immediately with AppContext occurrence state
      try {
        registerFieldOccurrence({
          id: occurrenceAction.id,
          companyId,
          osId: selectedOS.id,
          osNumber: selectedOS.osNumber,
          pilotId: currentPilotId,
          pilotName: currentPilotName,
          type: (data.occurrenceType as any) || 'outro',
          description: data.description
            ? `${data.occurrenceLabel}: ${data.description}`
            : data.occurrenceLabel,
          photoUrl: data.photoBase64 || '',
          timestamp,
        });
      } catch (appErr) {
        console.warn('[AppContext occurrence registration]', appErr);
      }

      setLocalActionsVersion((v) => v + 1);

      const isOnline = isFieldOnline();
      setToastNotification({
        message: 'Ocorrência registrada com sucesso',
        subMessage: isOnline
          ? `${data.occurrenceLabel} • Sincronizada`
          : `${data.occurrenceLabel} • Salva offline e vinculada à OS`,
        type: isOnline ? 'success' : 'offline',
      });

      if (isOnline) {
        flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
      }
    } catch (err) {
      console.error('[ERRO AO SALVAR OCORRÊNCIA]', err);
    }
  };

  const handleSavePhoto = (data: { photoBase64: string; photoCaption?: string }) => {
    if (!selectedOS) return;

    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const displayDate = getDeviceLocalDateString(now);
    const timestamp = getDeviceLocalDateTimeString(now);
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Direct persistent photo storage
    saveOperationPhoto({
      id: photoId,
      companyId,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      photoBase64: data.photoBase64,
      caption: data.photoCaption || 'Foto da Operação',
      timestamp,
      displayTime,
      displayDate,
      source: 'photo',
    });

    // 2. Action feed recording & sync queue
    recordOfflineAction({
      id: `act_${photoId}`,
      companyId,
      userId: authUser?.id || 'user-default',
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      type: 'PHOTO',
      timestamp,
      displayTime,
      payload: {
        photoId,
        photoBase64: data.photoBase64,
        photoCaption: data.photoCaption,
      },
    });

    setLocalActionsVersion((v) => v + 1);

    if (isFieldOnline()) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  const handleSaveAppliedArea = (data: {
    appliedAreaHa: number;
    appliedPercentage: number;
  }) => {
    if (!selectedOS) return;

    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const displayDate = getDeviceLocalDateString(now);
    const timestamp = getDeviceLocalDateTimeString(now);
    const isoTimestamp = now.toISOString();

    const isFullyDone = data.appliedAreaHa >= selectedOS.areaHa;

    recordOfflineAction({
      companyId,
      userId: authUser?.id || 'user-default',
      pilotId: currentPilotId,
      pilotName: currentPilotName,
      osId: selectedOS.id,
      osNumber: selectedOS.osNumber,
      type: 'APPLIED_AREA',
      timestamp,
      displayTime,
      payload: {
        contractedAreaHa: selectedOS.areaHa,
        appliedAreaHa: data.appliedAreaHa,
        appliedPercentage: data.appliedPercentage,
        isCompleted: isFullyDone,
      },
    });

    if (isFullyDone) {
      // 100% of contracted area fulfilled -> Conclude the OS automatically
      recordOfflineAction({
        companyId,
        userId: authUser?.id || 'user-default',
        pilotId: currentPilotId,
        pilotName: currentPilotName,
        osId: selectedOS.id,
        osNumber: selectedOS.osNumber,
        type: 'FINISH_OPERATION',
        timestamp: isoTimestamp,
        displayTime,
        payload: {
          finalNotes: 'Área 100% executada no campo',
          appliedAreaHa: data.appliedAreaHa,
          appliedPercentage: 100,
          summary: {
            clientName: selectedOS.clientName,
            crop: selectedOS.crop,
            contractedAreaHa: selectedOS.areaHa,
            appliedAreaHa: data.appliedAreaHa,
            appliedPercentage: 100,
            startTime: selectedOS.scheduledTime || '08:00',
            finishTime: displayTime,
            totalOccurrences: osActions.filter((a) => a.type === 'OCCURRENCE').length,
            totalPhotos: currentOSPhotos.length,
          },
        },
      });

      updateServiceOrderStatus(selectedOS.id, 'concluido', {
        actualAreaSprayedHa: data.appliedAreaHa,
        completedDate: displayDate,
        finalizedAt: isoTimestamp,
        completedAt: isoTimestamp,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setToastNotification({
        message: '🎉 Operação Concluída com Sucesso!',
        subMessage: `100% da área aplicada (${data.appliedAreaHa.toLocaleString('pt-BR')} ha)`,
        type: 'success',
      });
    } else {
      // Still has remaining balance -> Keep in operation
      updateServiceOrderStatus(selectedOS.id, 'em_operacao', {
        actualAreaSprayedHa: data.appliedAreaHa,
      });

      const remaining = Math.max(0, Math.round((selectedOS.areaHa - data.appliedAreaHa) * 100) / 100);
      const isOnline = isFieldOnline();
      setToastNotification({
        message: 'Área aplicada acumulada salva',
        subMessage: `${data.appliedAreaHa.toLocaleString('pt-BR')} ha acumulados • Saldo restante: ${remaining.toLocaleString('pt-BR')} ha`,
        type: isOnline ? 'success' : 'offline',
      });
    }

    setLocalActionsVersion((v) => v + 1);

    if (isFieldOnline()) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  const handleConfirmFinish = (finalNotes: string, isFullyCompleted: boolean = true) => {
    if (!selectedOS) return;

    const startAction = osActions.find((a) => a.type === 'START_OPERATION');
    const startTime = startAction?.displayTime || selectedOS.scheduledTime || '08:00';
    const now = new Date();
    const displayTime = getDeviceLocalTimeString(now);
    const displayDate = getDeviceLocalDateString(now);
    const isoTimestamp = now.toISOString();
    const occurrencesCount = osActions.filter((a) => a.type === 'OCCURRENCE').length;
    const photosCount = currentOSPhotos.length;
    const appliedPct = calculateAppliedPercentage(currentAppliedArea, selectedOS.areaHa);
    const isReallyConcluded = isFullyCompleted || currentAppliedArea >= selectedOS.areaHa;

    if (isReallyConcluded) {
      recordOfflineAction({
        companyId,
        userId: authUser?.id || 'user-default',
        pilotId: currentPilotId,
        pilotName: currentPilotName,
        osId: selectedOS.id,
        osNumber: selectedOS.osNumber,
        type: 'FINISH_OPERATION',
        timestamp: isoTimestamp,
        displayTime,
        payload: {
          finalNotes,
          appliedAreaHa: currentAppliedArea,
          appliedPercentage: appliedPct,
          summary: {
            clientName: selectedOS.clientName,
            crop: selectedOS.crop,
            contractedAreaHa: selectedOS.areaHa,
            appliedAreaHa: currentAppliedArea,
            appliedPercentage: appliedPct,
            startTime,
            finishTime: displayTime,
            totalOccurrences: occurrencesCount,
            totalPhotos: photosCount,
          },
        },
      });

      updateServiceOrderStatus(selectedOS.id, 'concluido', {
        actualAreaSprayedHa: currentAppliedArea,
        completedDate: displayDate,
        finalizedAt: isoTimestamp,
        completedAt: isoTimestamp,
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      // Se ainda resta saldo de área, a OS permanece em andamento (em_operacao)
      updateServiceOrderStatus(selectedOS.id, 'em_operacao', {
        actualAreaSprayedHa: currentAppliedArea,
      });
    }

    setLocalActionsVersion((v) => v + 1);

    // Automatically display the full operational summary voucher after finishing
    setIsFinishModalOpen(false);
    setIsSummaryModalOpen(true);

    if (isFieldOnline()) {
      flushOfflineSyncQueue(companyId, apiSync).catch(() => {});
    }
  };

  // External GPS links
  const openGPS = (type: 'maps' | 'waze') => {
    if (!selectedOS) return;
    const lat = selectedOS.propertyCoords?.lat || -12.5422;
    const lng = selectedOS.propertyCoords?.lng || -55.7214;
    if (type === 'maps') {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F8F7] text-[#111827] relative">
      {/* Real-time Toast Feedback Notification */}
      {toastNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
              toastNotification.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toastNotification.type === 'offline'
                ? 'bg-amber-900 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                toastNotification.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : toastNotification.type === 'offline'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-500/20 text-slate-300'
              }`}
            >
              {toastNotification.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : toastNotification.type === 'offline' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-black leading-tight">
                {toastNotification.message}
              </h5>
              {toastNotification.subMessage && (
                <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
                  {toastNotification.subMessage}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* 1. TOP HEADER & STATUS BAR */}
      <div className="sticky top-0 z-20 bg-[#111827] text-white border-b border-[#05521F]/40 px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Greeting */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#05521F] text-white shadow-inner">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black tracking-widest text-[#667085] uppercase">
                  MODO CAMPO
                </span>
                <span className="px-1.5 py-0.2 rounded-sm bg-white/10 text-[9px] font-bold text-white/80">
                  OFFLINE 100%
                </span>
              </div>
              <h1 className="text-sm font-extrabold text-white">
                Olá, {currentPilotName.split(' ')[0]} 👋
              </h1>
            </div>
          </div>

          {/* Connection Status Badge (Automatic Sync) */}
          <div className="flex items-center gap-2">
            {/* Sync Progress / Online / Offline Badge */}
            {isSyncing ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>
                  🔄 Sincronizando {syncProgress?.current || 1}/{syncProgress?.total || 1}...
                </span>
              </div>
            ) : isOnlineState ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>🟢 Sincronizado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  🟠 Offline
                  {pendingCount > 0 ? ` (${pendingCount})` : ''}
                </span>
              </div>
            )}

            {/* Offline Simulation Toggle */}
            <button
              type="button"
              onClick={handleToggleOfflineMode}
              title={isSimulated ? 'Desativar modo offline simulado' : 'Simular modo offline'}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSimulated
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {isSimulated ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN VIEW ROUTER (SCREEN 1: OS LIST vs SCREEN 2: OPERATIONAL THREAD) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 pb-36 sm:pb-44">
        {!selectedOS ? (
          /* =========================================================================
             SCREEN 1: LISTA DE OPERAÇÕES CRONOLÓGICA (CARDS AGRUPADOS POR DATA)
             ========================================================================= */
          <div className="space-y-6 animate-in fade-in">
            {/* Greeting & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <h2 className="text-xl font-black text-[#111827]">Operações em Campo</h2>
                <p className="text-xs text-slate-600">
                  Escala cronológica de serviços programados para aplicação aérea agrícola.
                </p>
              </div>

              {/* Tabs with accurate real-time count badges */}
              <div className="flex rounded-2xl bg-slate-200/80 p-1 text-xs font-bold self-start w-full sm:w-auto overflow-x-auto shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter('hoje')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeFilter === 'hoje'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Hoje</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                      activeFilter === 'hoje'
                        ? 'bg-[#111827] text-[#667085]'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tabCounts.hoje}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('em_andamento')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeFilter === 'em_andamento'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Em andamento</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                      activeFilter === 'em_andamento'
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tabCounts.em_andamento}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('todas')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeFilter === 'todas'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Todas as OS</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                      activeFilter === 'todas'
                        ? 'bg-[#111827] text-[#667085]'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tabCounts.todas}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('concluidas')}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    activeFilter === 'concluidas'
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Concluídas</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                      activeFilter === 'concluidas'
                        ? 'bg-[#111827] text-[#667085]'
                        : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {tabCounts.concluidas}
                  </span>
                </button>
              </div>
            </div>

            {/* FILTRO POR PERÍODO (DATA INICIAL E DATA FINAL) PARA OPERAÇÕES CONCLUÍDAS */}
            {activeFilter === 'concluidas' && (
              <div className="bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-200 shadow-sm space-y-4">
                {/* Header with Title */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#111827] uppercase tracking-wider">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-[#05521F]" />
                    <span>📅 FILTRAR POR PERÍODO DE CONCLUSÃO</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    Selecione a data de início e a data de fim
                  </span>
                </div>

                {/* Quick Date Shortcuts (ATALHOS DE PERÍODO) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Atalhos de período:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const today = getShiftedDateStr(0);
                        setFilterStartDate(today);
                        setFilterEndDate(today);
                        setAppliedFilterStartDate(today);
                        setAppliedFilterEndDate(today);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        appliedFilterStartDate === getShiftedDateStr(0) && appliedFilterEndDate === getShiftedDateStr(0)
                          ? 'bg-[#111827] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      <span>HOJE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = getShiftedDateStr(1);
                        setFilterStartDate(yesterday);
                        setFilterEndDate(yesterday);
                        setAppliedFilterStartDate(yesterday);
                        setAppliedFilterEndDate(yesterday);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        appliedFilterStartDate === getShiftedDateStr(1) && appliedFilterEndDate === getShiftedDateStr(1)
                          ? 'bg-[#111827] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>ONTEM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const start = getShiftedDateStr(7);
                        const end = getShiftedDateStr(0);
                        setFilterStartDate(start);
                        setFilterEndDate(end);
                        setAppliedFilterStartDate(start);
                        setAppliedFilterEndDate(end);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        appliedFilterStartDate === getShiftedDateStr(7) && appliedFilterEndDate === getShiftedDateStr(0)
                          ? 'bg-[#111827] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>ÚLTIMOS 7 DIAS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const start = getShiftedDateStr(30);
                        const end = getShiftedDateStr(0);
                        setFilterStartDate(start);
                        setFilterEndDate(end);
                        setAppliedFilterStartDate(start);
                        setAppliedFilterEndDate(end);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        appliedFilterStartDate === getShiftedDateStr(30) && appliedFilterEndDate === getShiftedDateStr(0)
                          ? 'bg-[#111827] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>ÚLTIMOS 30 DIAS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const start = getMonthStartDateStr();
                        const end = getShiftedDateStr(0);
                        setFilterStartDate(start);
                        setFilterEndDate(end);
                        setAppliedFilterStartDate(start);
                        setAppliedFilterEndDate(end);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        appliedFilterStartDate === getMonthStartDateStr() && appliedFilterEndDate === getShiftedDateStr(0)
                          ? 'bg-[#111827] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>ESTE MÊS</span>
                    </button>

                    {(appliedFilterStartDate || appliedFilterEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                          setAppliedFilterStartDate('');
                          setAppliedFilterEndDate('');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>VER TODAS</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Inputs (Data Inicial + Data Final) + Filter Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end pt-1">
                  <div className="lg:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full text-sm font-black px-4 py-3 rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-[#05521F] focus:ring-1 focus:ring-[#05521F] outline-none text-[#111827]"
                    />
                  </div>

                  <div className="lg:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Data final
                    </label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full text-sm font-black px-4 py-3 rounded-2xl border-2 border-slate-300 bg-slate-50 focus:bg-white focus:border-[#05521F] focus:ring-1 focus:ring-[#05521F] outline-none text-[#111827]"
                    />
                  </div>

                  <div className="lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => {
                        let start = filterStartDate;
                        let end = filterEndDate;
                        if (start && end && start > end) {
                          const temp = start;
                          start = end;
                          end = temp;
                          setFilterStartDate(start);
                          setFilterEndDate(end);
                        }
                        setAppliedFilterStartDate(start);
                        setAppliedFilterEndDate(end);
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-[#111827] hover:bg-[#111827] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md min-h-[48px]"
                    >
                      <Search className="h-4 w-4" />
                      <span>FILTRAR</span>
                    </button>
                  </div>
                </div>

                {/* Filter Result Status Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <span className="font-semibold">Exibindo operações concluídas:</span>
                    <span className="font-black text-[#111827] bg-[#111827]/10 px-2.5 py-1 rounded-lg">
                      {appliedFilterStartDate && appliedFilterEndDate && appliedFilterStartDate === appliedFilterEndDate
                        ? `📅 ${formatDateBR(appliedFilterStartDate)}`
                        : appliedFilterStartDate && appliedFilterEndDate
                        ? `📅 ${formatDateBR(appliedFilterStartDate)} até ${formatDateBR(appliedFilterEndDate)}`
                        : appliedFilterStartDate
                        ? `📅 A partir de ${formatDateBR(appliedFilterStartDate)}`
                        : appliedFilterEndDate
                        ? `📅 Até ${formatDateBR(appliedFilterEndDate)}`
                        : '📅 Todas as datas'}
                    </span>
                  </div>
                  {(appliedFilterStartDate !== filterStartDate || appliedFilterEndDate !== filterEndDate) && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠️ Clique em &quot;FILTRAR&quot; para atualizar
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* HERO CARD: OPERAÇÃO EM ANDAMENTO (DESTAQUE MÁXIMO) */}
            {ongoingOperation ? (
              <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-950 via-slate-900 to-[#111827] text-white shadow-xl border-2 border-amber-500/70 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3.5 w-3.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                        🟠 OPERAÇÃO EM ANDAMENTO
                      </span>
                    </div>

                    {/* Last record time */}
                    <div className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-black text-amber-200 flex items-center gap-1.5 shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>
                        Último registro: {ongoingLastRecordTime}
                      </span>
                    </div>
                  </div>

                  {/* Client & Crop Summary */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-amber-300/80 uppercase tracking-wider block">
                      {ongoingOperation.osNumber}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {ongoingOperation.clientName}
                    </h3>
                    <p className="text-sm font-semibold text-amber-100/90">
                      {ongoingOperation.crop} • {ongoingOperation.talhaoName || 'Talhão Principal'} • {ongoingOperation.propertyName || 'Fazenda Principal'}
                    </p>
                  </div>

                  {/* Operational Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/15 text-xs">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                      <span className="text-[10px] text-amber-200/70 block uppercase font-bold tracking-wider">
                        Progresso de Área
                      </span>
                      <span className="text-lg sm:text-xl font-black text-amber-300">
                        {ongoingAppliedArea.toLocaleString('pt-BR')} / {ongoingOperation.areaHa.toLocaleString('pt-BR')} ha
                      </span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                      <span className="text-[10px] text-amber-200/70 block uppercase font-bold tracking-wider">
                        Drone Designado
                      </span>
                      <span className="text-xs font-black text-white truncate block mt-1">
                        {ongoingOperation.droneModel || 'DJI Agras'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                      <span className="text-[10px] text-amber-200/70 block uppercase font-bold tracking-wider">
                        Piloto em Campo
                      </span>
                      <span className="text-xs font-black text-white truncate block mt-1">
                        {ongoingOperation.pilotName || currentPilotName}
                      </span>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedOSId(ongoingOperation.id)}
                    className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                  >
                    <span>RETOMAR OPERAÇÃO</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* HERO CARD: PRÓXIMA OPERAÇÃO AGENDADA (quando nenhuma está em andamento) */
              nextPendingOS && activeFilter !== 'concluidas' && (
                <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#111827] via-[#164732] to-[#111827] text-white shadow-xl border-2 border-[#05521F]/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-72 h-72 bg-[#05521F]/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3.5 w-3.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          PRÓXIMA OPERAÇÃO
                        </span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/20 text-xs font-black text-[#667085] flex items-center gap-1.5 shadow-xs">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        <span>
                          📅 {formatDateBR(nextPendingOS.scheduledDate)} — {nextPendingOS.scheduledTime || '08:00'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold text-white/70 uppercase tracking-wider block">
                        {nextPendingOS.osNumber}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {nextPendingOS.clientName}
                      </h3>
                      <p className="text-sm font-semibold text-emerald-200">
                        {nextPendingOS.crop} • {nextPendingOS.talhaoName || 'Talhão Principal'} • {nextPendingOS.propertyName || 'Fazenda Principal'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/15 text-xs">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <span className="text-[10px] text-white/70 block uppercase font-bold tracking-wider">
                          Área a Aplicar
                        </span>
                        <span className="text-xl font-black text-emerald-300">
                          {nextPendingOS.areaHa.toLocaleString('pt-BR')} ha
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <span className="text-[10px] text-white/70 block uppercase font-bold tracking-wider">
                          Drone Designado
                        </span>
                        <span className="text-xs font-black text-white truncate block mt-1">
                          {nextPendingOS.droneModel || 'DJI Agras T100'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                        <span className="text-[10px] text-white/70 block uppercase font-bold tracking-wider">
                          Piloto em Campo
                        </span>
                        <span className="text-xs font-black text-white truncate block mt-1">
                          {nextPendingOS.pilotName || currentPilotName}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectOS(nextPendingOS)}
                      className="w-full py-3.5 px-5 rounded-2xl bg-[#05521F] hover:bg-[#4d773d] text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                    >
                      <span>INICIAR OPERAÇÃO</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )
            )}

            {/* EMPTY STATE */}
            {groupedOSList.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 p-8 text-center bg-white space-y-3 shadow-xs">
                <div className="p-3 bg-slate-100 rounded-2xl w-fit mx-auto text-slate-500">
                  <Calendar className="h-8 w-8 text-[#05521F]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    {activeFilter === 'em_andamento'
                      ? 'Nenhuma operação em andamento no momento.'
                      : activeFilter === 'concluidas'
                      ? 'Nenhuma operação concluída no período selecionado.'
                      : 'Nenhuma Ordem de Serviço encontrada nesta categoria.'}
                  </h3>
                  {activeFilter === 'concluidas' && (
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      Período consultado:{' '}
                      <strong className="text-[#111827]">
                        {appliedFilterStartDate && appliedFilterEndDate && appliedFilterStartDate === appliedFilterEndDate
                          ? formatDateBR(appliedFilterStartDate)
                          : appliedFilterStartDate && appliedFilterEndDate
                          ? `de ${formatDateBR(appliedFilterStartDate)} até ${formatDateBR(appliedFilterEndDate)}`
                          : appliedFilterStartDate
                          ? `a partir de ${formatDateBR(appliedFilterStartDate)}`
                          : appliedFilterEndDate
                          ? `até ${formatDateBR(appliedFilterEndDate)}`
                          : 'todas as datas'}
                      </strong>{' '}
                      • Quantidade encontrada: <strong>0 operações</strong>
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeFilter === 'em_andamento'
                    ? 'Inicie uma OS na aba "Hoje" ou "Todas as OS" para acompanhar o progresso aqui.'
                    : activeFilter === 'concluidas'
                    ? 'Ajuste a data inicial e final nos atalhos rápidos ou campos acima para consultar operações concluídas em outros períodos.'
                    : 'Você pode selecionar "Todas as OS" para ver a escala completa.'}
                </p>
              </div>
            ) : (
              /* CRONOLOGICAL GROUPED SECTIONS */
              <div className="space-y-8">
                {groupedOSList.map((group) => (
                  <div key={group.key} className="space-y-3.5">
                    {/* Section Date Header */}
                    <div className="flex items-center justify-between gap-2 pb-1 border-b-2 border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl text-white font-black text-xs ${
                            group.category === 'hoje'
                              ? 'bg-[#111827]'
                              : group.category === 'amanha'
                              ? 'bg-[#05521F]'
                              : group.category === 'sem_data'
                              ? 'bg-amber-600'
                              : 'bg-slate-700'
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 leading-tight">
                            {group.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500">
                            {group.subTitle}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-black text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full">
                        {group.orders.length} {group.orders.length === 1 ? 'OS' : 'OSs'}
                      </span>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {group.orders.map((os) => {
                        const liveStatus = getOSLiveStatus(os);
                        const isPaused = (liveStatus as any) === 'pausado';
                        const isRunning = liveStatus === 'em_operacao';
                        const isFinished = liveStatus === 'concluido' || liveStatus === 'faturado' || liveStatus === 'pago';
                        const isCancelled = liveStatus === 'cancelado';

                        return (
                          <div
                            key={os.id}
                            onClick={() => handleSelectOS(os)}
                            className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-xs hover:shadow-md ${
                              isPaused
                                ? 'border-amber-400 bg-gradient-to-br from-amber-50/80 to-white ring-2 ring-amber-400/30'
                                : isRunning
                                ? 'border-amber-400 bg-gradient-to-br from-amber-50/90 to-white ring-2 ring-amber-400/20'
                                : isFinished
                                ? 'border-slate-200 bg-slate-50/80 opacity-95'
                                : isCancelled
                                ? 'border-rose-200 bg-rose-50/40 opacity-80'
                                : 'border-slate-200 hover:border-[#05521F] bg-white'
                            }`}
                          >
                            {/* 1. DATA E HORÁRIO EM GRANDE DESTAQUE NO TOPO */}
                            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-[#111827]/5 border border-[#111827]/10 mb-3.5">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#111827]" />
                                <span className="text-sm font-black text-[#111827] tracking-tight">
                                  {isFinished ? (
                                    <span>
                                      Concluída em: {formatDateBR(getOSCompletionDate(os) || os.completedDate || os.scheduledDate)}
                                    </span>
                                  ) : (
                                    <span>
                                      📅 {formatDateBR(os.scheduledDate)} — {os.scheduledTime || '08:00'}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                                {os.osNumber}
                              </span>
                            </div>

                            {/* 2. CLIENTE E STATUS BADGE */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`p-2.5 rounded-2xl ${
                                    isPaused || isRunning
                                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                                      : isFinished
                                      ? 'bg-blue-800 text-white'
                                      : isCancelled
                                      ? 'bg-rose-700 text-white'
                                      : 'bg-[#05521F]/15 text-[#111827]'
                                  }`}
                                >
                                  <Plane className="h-5 w-5" />
                                </div>
                                <div>
                                  <h3 className="text-base font-black text-slate-900 leading-tight">
                                    {os.clientName}
                                  </h3>
                                  <p className="text-xs text-slate-600 font-medium">
                                    {os.crop} • {os.talhaoName || 'Talhão Principal'}
                                  </p>
                                </div>
                              </div>

                              {/* Visual Status Badges */}
                              {isPaused ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-xs">
                                  <Pause className="h-3 w-3 text-slate-950" />
                                  <span>🟡 EM PAUSA</span>
                                </span>
                              ) : isRunning ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs animate-pulse">
                                  <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
                                  <span>🟠 EM ANDAMENTO</span>
                                </span>
                              ) : isFinished ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300">
                                  <Check className="h-3 w-3 text-blue-700" />
                                  <span>🔵 CONCLUÍDA</span>
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                                  <span>🔴 CANCELADA</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-300">
                                  <span>🟡 AGENDADA</span>
                                </span>
                              )}
                            </div>

                              {/* 3. OPERATIONAL DETAILS */}
                            {(() => {
                              const actions = getActionsForOS(companyId, os.id);
                              const areaActions = actions.filter((a) => a.type === 'APPLIED_AREA' || a.type === 'FINISH_OPERATION');
                              const appliedHa = areaActions.length > 0 && areaActions[areaActions.length - 1].payload.appliedAreaHa !== undefined
                                ? areaActions[areaActions.length - 1].payload.appliedAreaHa!
                                : (os.actualAreaSprayedHa || 0);
                              const remainingHa = Math.max(0, os.areaHa - appliedHa);
                              const hasPartialProgress = appliedHa > 0 && remainingHa > 0;

                              return (
                                <>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs py-2.5 border-y border-slate-100 mb-3 bg-slate-50/60 rounded-2xl px-3">
                                    <div>
                                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                                        Propriedade
                                      </span>
                                      <span className="font-extrabold text-slate-800 truncate block">
                                        {os.propertyName || 'Fazenda Principal'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                                        Área Contratada
                                      </span>
                                      <span className="font-black text-[#111827] text-sm">
                                        {os.areaHa.toLocaleString('pt-BR')} ha
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                                        Drone
                                      </span>
                                      <span className="font-extrabold text-slate-800 truncate block">
                                        {os.droneModel || 'DJI Agras'}
                                      </span>
                                    </div>
                                    <div className="col-span-2 sm:col-span-3 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                      <span className="text-slate-500 font-bold">
                                        Piloto: <span className="text-slate-800 font-extrabold">{os.pilotName || currentPilotName}</span>
                                      </span>
                                      {os.serviceType && (
                                        <span className="text-slate-600 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-md text-[10px]">
                                          {os.serviceType}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Saldo de Área (Área realizada vs Saldo restante) */}
                                  {(hasPartialProgress || isRunning || isPaused) && appliedHa > 0 && (
                                    <div className="mb-3.5 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        <span>Realizado: <strong>{appliedHa.toLocaleString('pt-BR')} ha</strong></span>
                                      </div>
                                      <div className="text-amber-800 font-extrabold">
                                        Restante: <span className="text-amber-950 underline">{remainingHa.toLocaleString('pt-BR')} ha</span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {/* 4. ACTION BUTTON */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOS(os);
                              }}
                              className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isPaused || isRunning
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md font-black'
                                  : isFinished
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-[#05521F] hover:bg-[#2E7D32] text-white shadow-sm'
                              }`}
                            >
                              <span>
                                {isPaused || isRunning
                                  ? 'RETOMAR OPERAÇÃO'
                                  : isFinished
                                  ? 'VER RESUMO'
                                  : 'INICIAR OPERAÇÃO'}
                              </span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             SCREEN 2: CONVERSA OPERACIONAL DA OS (STREAM ESTILO WHATSAPP MOUTRYX)
             ========================================================================= */
          <div className="space-y-4 animate-in slide-in-from-right-4">
            {/* Top Bar inside the OS */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedOSId(null)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#111827] p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar à lista</span>
              </button>

              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {selectedOS.osNumber}
                </span>
                <h3 className="text-xs font-black text-slate-900 truncate max-w-[180px] sm:max-w-xs">
                  {selectedOS.clientName}
                </h3>
              </div>

              {/* Live Status Pill */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  osOperationalState === 'pausado'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                    : osOperationalState === 'em_operacao'
                    ? 'bg-amber-500 text-slate-950 font-black animate-pulse shadow-xs'
                    : osOperationalState === 'concluido'
                    ? 'bg-slate-800 text-white'
                    : 'bg-[#111827]/10 text-[#111827]'
                }`}
              >
                {osOperationalState === 'pausado'
                  ? '🟡 EM PAUSA'
                  : osOperationalState === 'em_operacao'
                  ? '🟠 EM ANDAMENTO'
                  : osOperationalState === 'concluido'
                  ? '🔴 CONCLUÍDA'
                  : '🟡 AGENDADA'}
              </span>
            </div>

            {/* BANNER DE PAUSA ATIVA */}
            {osOperationalState === 'pausado' && lastPauseInfo && (
              <div className="p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black">
                    <Pause className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-900 tracking-wide">
                      Operação em Pausa • {lastPauseInfo.reason}
                    </h4>
                    <p className="text-[11px] font-bold text-amber-800">
                      Início da pausa registrado às {lastPauseInfo.time}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResumeOperation}
                  className="py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>RETOMAR OPERAÇÃO</span>
                </button>
              </div>
            )}

            {/* CONVERSATIONAL TIMELINE FEED */}
            <div className="space-y-3.5 bg-slate-100/70 p-3 sm:p-4 rounded-3xl border border-slate-200 min-h-[420px]">
              {/* Message 1: Initial Briefing from MOUTRYX System */}
              <div className="flex items-start gap-2.5 max-w-xl">
                <div className="p-2 rounded-2xl bg-[#111827] text-[#667085] shrink-0 mt-1 shadow-sm">
                  <Plane className="h-4 w-4" />
                </div>
                <div className="rounded-3xl rounded-tl-sm bg-white p-4 shadow-sm border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-[#111827] text-sm">
                      Briefing Operacional MOUTRYX
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {selectedOS.scheduledTime || '08:00'}
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    Olá, <strong>{currentPilotName}</strong>. Sua operação está programada com os seguintes parâmetros:
                  </p>

                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#05521F]" />
                      <span><strong>Cliente:</strong> {selectedOS.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#05521F]" />
                      <span><strong>Propriedade:</strong> {selectedOS.propertyName || 'Fazenda'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sprout className="h-3.5 w-3.5 text-[#05521F]" />
                      <span><strong>Talhão:</strong> {selectedOS.talhaoName || 'Talhão 01'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sprout className="h-3.5 w-3.5 text-[#05521F]" />
                      <span><strong>Cultura:</strong> {selectedOS.crop}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5 text-[#05521F]" />
                      <span>
                        <strong>Área contratada:</strong>{' '}
                        <span className="text-emerald-700 font-bold">
                          {selectedOS.areaHa.toLocaleString('pt-BR')} ha
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Plane className="h-3.5 w-3.5 text-[#05521F]" />
                      <span><strong>Drone:</strong> {selectedOS.droneModel || 'DJI Agras T100'}</span>
                    </div>
                    {selectedOS.products && selectedOS.products.length > 0 && (
                      <div className="flex items-start gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-600">Calda/Defensivos:</span>
                        <span className="text-[11px] text-slate-800">
                          {selectedOS.products.map((p) => p.commercialName || (p as any).name || 'Produto').join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fast GPS Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openGPS('maps')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <MapPin className="h-3.5 w-3.5 text-rose-600" />
                      <span>Google Maps</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openGPS('waze')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                      <span>Waze</span>
                    </button>
                  </div>

                  {osOperationalState === 'agendado' && (
                    <div className="pt-2 text-center text-xs font-black text-[#111827]">
                      Pronto para iniciar? Toque no botão verde abaixo.
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Chronological Action Bubbles */}
              {osActions.map((action) => {
                switch (action.type) {
                  case 'START_OPERATION':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-emerald-600 text-white shrink-0 mt-1 shadow-sm">
                          <Play className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-emerald-50 border-2 border-emerald-300 p-4 shadow-sm space-y-1.5 text-xs text-emerald-950">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-black text-sm uppercase tracking-wide text-emerald-900">
                              🟢 Operação Iniciada
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">
                              {action.displayTime}
                            </span>
                          </div>
                          <p className="font-medium">
                            Drone {action.payload.droneModel || 'DJI Agras'} conectado e parâmetros de voo registrados.
                          </p>
                          <p className="text-[11px] font-bold text-[#05521F]">
                            Boa operação, {action.pilotName || currentPilotName}.
                          </p>
                        </div>
                      </div>
                    );

                  case 'OCCURRENCE':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl animate-in fade-in">
                        <div className="p-2 rounded-2xl bg-amber-500 text-white shrink-0 mt-1 shadow-sm">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-amber-50/90 border border-amber-200/90 p-4 shadow-sm space-y-2.5 text-xs text-amber-950 flex-1">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-amber-900">
                                ⚠️ {action.payload.occurrenceLabel || 'Ocorrência no Campo'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                                {action.displayTime}
                              </span>
                              {action.synced ? (
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Sincronizado
                                </span>
                              ) : (
                                <span className="text-[9px] font-black text-amber-700 bg-amber-200/80 px-1.5 py-0.5 rounded uppercase">
                                  Salvo offline
                                </span>
                              )}
                            </div>
                          </div>

                          {action.payload.description && (
                            <p className="text-slate-800 bg-white/90 p-3 rounded-2xl border border-amber-100/80 font-medium leading-relaxed">
                              {action.payload.description}
                            </p>
                          )}

                          {action.payload.photoUrl && (
                            <div className="pt-1 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                                <span className="flex items-center gap-1">
                                  <Camera className="h-3.5 w-3.5 text-amber-700" />
                                  Foto do problema
                                </span>
                              </div>
                              <div className="relative group rounded-2xl overflow-hidden border border-amber-200 bg-slate-900 max-w-sm aspect-4/3 shadow-xs">
                                <img
                                  src={action.payload.photoUrl}
                                  alt="Foto da ocorrência"
                                  onClick={() => {
                                    setPreviewPhotoUrl(action.payload.photoUrl || null);
                                    setPreviewPhotoData({
                                      title: action.payload.occurrenceLabel || 'Ocorrência no Campo',
                                      description: action.payload.description,
                                      time: action.displayTime,
                                    });
                                  }}
                                  className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                  <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 font-extrabold text-xs shadow-md">
                                    Visualizar foto
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewPhotoUrl(action.payload.photoUrl || null);
                                  setPreviewPhotoData({
                                    title: action.payload.occurrenceLabel || 'Ocorrência no Campo',
                                    description: action.payload.description,
                                    time: action.displayTime,
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>Visualizar foto</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  case 'PHOTO':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-[#111827] text-[#667085] shrink-0 mt-1 shadow-sm">
                          <Camera className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-white border border-slate-200 p-4 shadow-sm space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-slate-900">
                              📷 Foto do campo adicionada
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {action.displayTime}
                            </span>
                          </div>
                          {action.payload.photoCaption && (
                            <p className="text-slate-700 font-medium">
                              {action.payload.photoCaption}
                            </p>
                          )}
                          {action.payload.photoBase64 && (
                            <img
                              src={action.payload.photoBase64}
                              alt="Foto do campo"
                              onClick={() => setPreviewPhotoUrl(action.payload.photoBase64 || null)}
                              className="w-full max-w-xs h-40 object-cover rounded-2xl border border-slate-200 cursor-pointer hover:opacity-95"
                            />
                          )}
                        </div>
                      </div>
                    );

                  case 'APPLIED_AREA':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-[#05521F] text-white shrink-0 mt-1 shadow-sm">
                          <Ruler className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-emerald-50 border border-emerald-200 p-4 shadow-sm space-y-1 text-xs text-emerald-950">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-sm text-emerald-900">
                              📏 Área aplicada informada
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">
                              {action.displayTime}
                            </span>
                          </div>
                          <p className="font-black text-base text-[#111827]">
                            {action.payload.appliedAreaHa?.toLocaleString('pt-BR')} ha aplicados
                          </p>
                          <p className="text-xs font-bold text-[#05521F]">
                            ({action.payload.appliedPercentage?.toLocaleString('pt-BR')}% da área contratada de {action.payload.contractedAreaHa} ha)
                          </p>
                        </div>
                      </div>
                    );

                  case 'PAUSE_OPERATION':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-amber-500 text-slate-950 shrink-0 mt-1 shadow-sm">
                          <Pause className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-amber-50 border border-amber-300 p-3.5 shadow-sm space-y-1 text-xs text-amber-950">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-amber-900">
                              ⏸ Operação Pausada
                            </span>
                            <span className="text-[10px] font-bold text-amber-700">
                              {action.displayTime}
                            </span>
                          </div>
                          <p className="font-medium text-amber-900">
                            Motivo: <strong>{action.payload.pauseReason || 'Pausa operacional'}</strong>
                          </p>
                        </div>
                      </div>
                    );

                  case 'RESUME_OPERATION':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-emerald-600 text-white shrink-0 mt-1 shadow-sm">
                          <Play className="h-4 w-4" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-emerald-50 border border-emerald-300 p-3.5 shadow-sm space-y-1 text-xs text-emerald-950">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-emerald-900">
                              ▶️ Operação Retomada
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">
                              {action.displayTime}
                            </span>
                          </div>
                          <p className="font-medium text-emerald-900">
                            Voo e aplicação continuados com sucesso.
                          </p>
                        </div>
                      </div>
                    );

                  case 'FINISH_OPERATION':
                    return (
                      <div key={action.id} className="flex items-start gap-2.5 max-w-xl">
                        <div className="p-2 rounded-2xl bg-[#111827] text-[#667085] shrink-0 mt-1 shadow-sm">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="rounded-3xl rounded-tl-sm bg-[#111827] text-white p-5 shadow-lg border border-emerald-600/40 space-y-3 text-xs">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-black text-sm text-[#667085] uppercase tracking-wider">
                              🔴 OPERAÇÃO FINALIZADA
                            </span>
                            <span className="text-[10px] font-bold text-white/70">
                              {action.displayTime}
                            </span>
                          </div>
                          <div className="space-y-1 text-white/90">
                            <p>
                              <strong>Área aplicada:</strong> {action.payload.appliedAreaHa || currentAppliedArea} ha ({action.payload.appliedPercentage}%)
                            </p>
                            <p>
                              <strong>Duração:</strong> {action.payload.summary?.startTime} às {action.payload.summary?.finishTime}
                            </p>
                            {action.payload.finalNotes && (
                              <p className="p-2.5 rounded-xl bg-white/10 text-white/90 text-[11px] italic">
                                &ldquo;{action.payload.finalNotes}&rdquo;
                              </p>
                            )}
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
                            ✓ Os dados foram salvos com segurança neste dispositivo.
                          </div>
                        </div>
                      </div>
                    );

                  default:
                    return null;
                }
              })}

              <div ref={chatBottomRef} />
            </div>

            {/* FOTOS DA OPERAÇÃO (VISÍVEIS E PERSISTENTES DURANTE E APÓS A OPERAÇÃO) */}
            {(osOperationalState !== 'agendado' || currentOSPhotos.length > 0) && (
              <FieldPhotoGallery
                photos={currentOSPhotos}
                onAddPhoto={
                  osOperationalState === 'em_operacao' || osOperationalState === 'pausado'
                    ? () => setIsPhotoModalOpen(true)
                    : undefined
                }
                isReadOnly={osOperationalState === 'agendado' || osOperationalState === 'concluido'}
                osNumber={selectedOS.osNumber}
                clientName={selectedOS.clientName}
              />
            )}
          </div>
        )}
      </main>

      {/* 3. FIXED BOTTOM ACTION BAR (FINGER-FRIENDLY CONTROLS) */}
      {selectedOS && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            {osOperationalState === 'agendado' && (
              <button
                type="button"
                onClick={handleStartOperation}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="h-6 w-6 fill-current" />
                <span>INICIAR OPERAÇÃO</span>
              </button>
            )}

            {osOperationalState === 'pausado' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1 text-slate-700">
                  <span className="font-extrabold flex items-center gap-1.5 text-amber-800">
                    <Pause className="h-3.5 w-3.5 text-amber-600" />
                    Operação em pausa ({lastPauseInfo?.reason || 'Refeição'})
                  </span>
                  <span className="font-bold text-slate-600 truncate max-w-[200px] text-right">
                    Pausada às {lastPauseInfo?.time || '--:--'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResumeOperation}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Play className="h-6 w-6 fill-current" />
                  <span>RETOMAR OPERAÇÃO</span>
                </button>
              </div>
            )}

            {osOperationalState === 'em_operacao' && (
              <div className="space-y-2">
                {/* Status Indicator banner */}
                <div className="flex items-center justify-between text-xs px-1 text-slate-700">
                  <span className="font-extrabold flex items-center gap-1.5 text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    Operação em andamento
                  </span>
                  <span className="font-bold text-slate-600 truncate max-w-[200px] text-right">
                    {selectedOS.clientName} • {currentAppliedArea} ha
                  </span>
                </div>

                {/* 5 Big Touch Action Buttons Grid (Pausar, Ocorrência, Foto, Área, Finalizar) */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPauseModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[62px]"
                  >
                    <Pause className="h-5 w-5 mb-0.5 text-amber-700" />
                    <span className="text-[9px] sm:text-[11px] font-black leading-tight uppercase tracking-tight">Pausar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOccurrenceModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[62px]"
                  >
                    <AlertTriangle className="h-5 w-5 mb-0.5 text-rose-600" />
                    <span className="text-[9px] sm:text-[11px] font-black leading-tight uppercase tracking-tight">Ocorrência</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[62px]"
                  >
                    <Camera className="h-5 w-5 mb-0.5 text-emerald-700" />
                    <span className="text-[9px] sm:text-[11px] font-black leading-tight uppercase tracking-tight">Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAppliedAreaModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 transition-all cursor-pointer shadow-xs active:scale-95 min-h-[62px]"
                  >
                    <Ruler className="h-5 w-5 mb-0.5 text-sky-600" />
                    <span className="text-[9px] sm:text-[11px] font-black leading-tight uppercase tracking-tight">Área</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFinishModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-950 text-white transition-all cursor-pointer shadow-sm active:scale-95 min-h-[62px]"
                  >
                    <CheckCircle2 className="h-5 w-5 mb-0.5 text-[#667085]" />
                    <span className="text-[9px] sm:text-[11px] font-black leading-tight uppercase tracking-tight">Finalizar</span>
                  </button>
                </div>
              </div>
            )}

            {osOperationalState === 'concluido' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-[#111827] hover:bg-[#111827] active:bg-[#111827] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer min-h-[52px]"
                >
                  <FileText className="h-4 w-4 text-[#667085]" />
                  <span>VER RESUMO DA OPERAÇÃO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOSId(null)}
                  className="py-3.5 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-xs sm:text-sm cursor-pointer min-h-[52px]"
                >
                  Voltar à Lista
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODALS & SUB-COMPONENTS */}
      {selectedOS && (
        <>
          <FieldOccurrenceModal
            isOpen={isOccurrenceModalOpen}
            onClose={() => setIsOccurrenceModalOpen(false)}
            onSave={handleSaveOccurrence}
          />

          <FieldPauseModal
            isOpen={isPauseModalOpen}
            onClose={() => setIsPauseModalOpen(false)}
            onConfirmPause={handlePauseOperation}
          />

          <FieldPhotoModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onSave={handleSavePhoto}
          />

          <FieldAppliedAreaModal
            isOpen={isAppliedAreaModalOpen}
            onClose={() => setIsAppliedAreaModalOpen(false)}
            contractedAreaHa={selectedOS.areaHa}
            initialAppliedHa={currentAppliedArea}
            onSave={handleSaveAppliedArea}
          />

          <FieldFinishModal
            isOpen={isFinishModalOpen}
            onClose={() => setIsFinishModalOpen(false)}
            clientName={selectedOS.clientName}
            crop={selectedOS.crop}
            contractedAreaHa={selectedOS.areaHa}
            appliedAreaHa={currentAppliedArea}
            startTime={selectedOS.scheduledTime || '08:00'}
            finishTime={new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            totalOccurrences={osActions.filter((a) => a.type === 'OCCURRENCE').length}
            totalPhotos={currentOSPhotos.length}
            onConfirmFinish={handleConfirmFinish}
          />
        </>
      )}

      {/* Modal de Conflito de Operação Ativa */}
      {conflictTargetOS && ongoingOperation && (
        <div
          onClick={() => setConflictTargetOS(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-amber-300 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Você possui uma operação em andamento.
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {ongoingOperation.osNumber} • {ongoingOperation.clientName}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <p>
                A Ordem de Serviço <strong className="font-extrabold text-amber-900">{ongoingOperation.osNumber}</strong> ({ongoingOperation.clientName}) está em andamento.
              </p>
              <p className="text-[11px] text-amber-800">
                Para iniciar ou trabalhar em outra OS, continue ou finalize a operação ativa atual.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConflictTargetOS(null);
                  setSelectedOSId(ongoingOperation.id);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-colors cursor-pointer shadow-sm"
              >
                CONTINUAR OPERAÇÃO
              </button>
              <button
                type="button"
                onClick={() => setConflictTargetOS(null)}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                VER OPERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => {
            setPreviewPhotoUrl(null);
            setPreviewPhotoData(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[92vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-white/10 text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">
                    {previewPhotoData?.title || 'Registro Fotográfico • Campo'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {selectedOS ? `${selectedOS.osNumber} • ${selectedOS.clientName}` : 'Modo Campo'}
                    {previewPhotoData?.time && ` • ${previewPhotoData.time}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewPhotoUrl(null);
                  setPreviewPhotoData(null);
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Image display */}
            <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-2 min-h-[300px] max-h-[65vh]">
              <img
                src={previewPhotoUrl}
                alt="Foto do campo ampliada"
                className="max-w-full max-h-[62vh] object-contain rounded-xl"
              />
            </div>

            {/* Footer observation info */}
            <div className="px-4 py-3 bg-slate-950/90 border-t border-white/10 text-white flex items-center justify-between gap-4">
              <p className="text-xs text-slate-300 font-medium truncate">
                {previewPhotoData?.description || 'Foto registrada e vinculada operacionalmente à OS.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPreviewPhotoUrl(null);
                  setPreviewPhotoData(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal for Concluded OS - Full Operational Voucher */}
      {selectedOS && (
        <FieldSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          serviceOrder={selectedOS}
          appliedAreaHa={currentAppliedArea}
          pilotName={currentPilotName}
          osActions={osActions}
          osPhotos={currentOSPhotos}
        />
      )}
    </div>
  );
};
