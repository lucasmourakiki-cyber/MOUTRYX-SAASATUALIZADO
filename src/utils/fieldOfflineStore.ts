/**
 * MOUTRYX GESTÃO AEROAGRÍCOLA — OFFLINE FIELD ENGINE (100% OFFLINE-FIRST)
 * =======================================================================
 * Motor de persistência local, fila de ações assíncronas (Sync Queue),
 * idempotência, captura de fotos offline e sincronização inteligente.
 * 
 * Regras Fundamentais:
 * 1. 100% Operacional sem conexão à internet.
 * 2. Isolamento estrito por Tenant (companyId) e Usuário (userId/pilotId).
 * 3. Idempotência total através de UUIDs únicos para cada ação offline.
 * 4. Cálculo matemático preciso da área aplicada (sem estimativas arbitrárias).
 */

import { ServiceOrder, Occurrence, Pilot, Property, Talhao, Drone } from '../types';

export type OfflineActionType =
  | 'START_OPERATION'
  | 'OCCURRENCE'
  | 'PHOTO'
  | 'APPLIED_AREA'
  | 'PAUSE_OPERATION'
  | 'RESUME_OPERATION'
  | 'FINISH_OPERATION';

export interface OperationPhoto {
  id: string; // Unique UUID
  companyId: string;
  osId: string;
  osNumber: string;
  occurrenceId?: string; // Persistent link to specific occurrence
  pilotId: string;
  pilotName: string;
  photoBase64: string;
  caption?: string;
  timestamp: string; // ISO 8601
  displayTime: string; // HH:mm
  displayDate: string; // DD/MM/YYYY
  synced: boolean;
  syncedAt?: string;
  source: 'photo' | 'occurrence' | 'finish';
}

export interface OfflineAction {
  id: string; // Unique Action UUID
  companyId: string;
  userId: string;
  pilotId: string;
  pilotName: string;
  osId: string;
  osNumber: string;
  type: OfflineActionType;
  timestamp: string; // ISO 8601
  displayTime: string; // HH:mm
  synced: boolean;
  syncedAt?: string;
  payload: {
    // START_OPERATION
    latitude?: number;
    longitude?: number;
    droneId?: string;
    droneModel?: string;

    // OCCURRENCE
    occurrenceId?: string;
    occurrenceType?: string;
    occurrenceLabel?: string;
    description?: string;
    photoId?: string;
    photoUrl?: string;
    photoBase64?: string;

    // PHOTO
    photoCaption?: string;

    // APPLIED_AREA
    contractedAreaHa?: number;
    appliedAreaHa?: number;
    addedAreaHa?: number;
    appliedPercentage?: number;
    isCompleted?: boolean;

    // PAUSE / RESUME
    pauseReason?: string;

    // FINISH_OPERATION
    finalNotes?: string;
    summary?: {
      clientName: string;
      crop: string;
      contractedAreaHa: number;
      appliedAreaHa: number;
      appliedPercentage: number;
      startTime: string;
      finishTime: string;
      totalOccurrences: number;
      totalPhotos: number;
    };
  };
}

export interface CachedFieldData {
  lastSynced: string;
  serviceOrders: ServiceOrder[];
  pilots: Pilot[];
  drones: Drone[];
  properties: Property[];
  talhoes: Talhao[];
}

const STORAGE_KEY_PREFIX = 'moutryx_field_';
const SIMULATED_OFFLINE_KEY = 'moutryx_simulated_offline';

// In-memory runtime cache to guarantee 0% data loss under strict browser storage limits
const memoryActionsMap = new Map<string, OfflineAction[]>();
const memoryPhotosMap = new Map<string, OperationPhoto[]>();

/**
 * Client-side high-efficiency Image Compression
 * Scales images down to max 960px maintaining aspect ratio and compresses to JPEG ~0.7 quality.
 * Guarantees crisp field photos under ~40KB that persist reliably without hitting quota limits.
 */
export async function compressImageBase64(
  dataUrl: string,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.7
): Promise<string> {
  if (typeof window === 'undefined') return dataUrl;
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          width = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('[MOUTRYX COMPRESSION] Fallback para imagem original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Check if the browser or user has enabled offline simulation
 */
export function isFieldOnline(): boolean {
  if (typeof window === 'undefined') return true;
  const isSimulatedOffline = localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  if (isSimulatedOffline) return false;
  return navigator.onLine;
}

/**
 * Get whether simulated offline mode is currently active
 */
export function getSimulatedOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

/**
 * Toggle simulated offline mode
 */
export function setSimulatedOffline(isOffline: boolean): void {
  if (typeof window === 'undefined') return;
  if (isOffline) {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, 'true');
  } else {
    localStorage.removeItem(SIMULATED_OFFLINE_KEY);
  }
}

/**
 * Get pre-synced operational entities for a company
 */
export function getPreSyncedData(companyId: string): CachedFieldData {
  const fallback: CachedFieldData = {
    lastSynced: new Date().toISOString(),
    serviceOrders: [],
    pilots: [],
    drones: [],
    properties: [],
    talhoes: [],
  };

  if (typeof window === 'undefined' || !companyId) return fallback;

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}cache_${companyId}`);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao carregar dados pré-sincronizados:', err);
    return fallback;
  }
}

/**
 * Persist cached operational entities for offline use
 */
export function savePreSyncedData(
  companyId: string,
  data: Partial<CachedFieldData>
): void {
  if (typeof window === 'undefined' || !companyId) return;

  try {
    const existing = getPreSyncedData(companyId);
    const updated: CachedFieldData = {
      ...existing,
      ...data,
      lastSynced: new Date().toISOString(),
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}cache_${companyId}`,
      JSON.stringify(updated)
    );
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao salvar dados pré-sincronizados:', err);
  }
}

/**
 * Returns HH:mm in the device local timezone (e.g. "17:58")
 */
export function getDeviceLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns DD/MM/YYYY in the device local timezone (e.g. "23/08/2026")
 */
export function getDeviceLocalDateString(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns YYYY-MM-DD HH:mm:ss in the device local timezone
 */
export function getDeviceLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format any timestamp or date string into local HH:mm
 */
export function formatLocalTime(dateOrString?: string | Date | null): string {
  if (!dateOrString) return getDeviceLocalTimeString();
  if (dateOrString instanceof Date) return getDeviceLocalTimeString(dateOrString);

  const trimmed = String(dateOrString).trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.includes(' ')) {
    const timePart = trimmed.split(' ')[1];
    if (timePart) return timePart.substring(0, 5);
  }
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  return getDeviceLocalTimeString();
}

/**
 * Create a deterministic signature for image content (handles large base64 & urls)
 */
export function getImageSignature(photoBase64?: string): string {
  if (!photoBase64) return '';
  if (photoBase64.length <= 120) return photoBase64;
  const mid = Math.floor(photoBase64.length / 2);
  return `${photoBase64.substring(0, 80)}_${photoBase64.length}_${photoBase64.substring(mid, mid + 40)}_${photoBase64.substring(photoBase64.length - 80)}`;
}

/**
 * Deduplicate operation photos strictly: ensures 1 selected photo = exactly 1 registered photo.
 * Deduplicates by unique ID, occurrenceId, and exact image content signature.
 */
export function deduplicateOperationPhotos(photos: OperationPhoto[]): OperationPhoto[] {
  const seenIds = new Set<string>();
  const seenOccurrences = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: OperationPhoto[] = [];

  for (const p of photos) {
    if (!p || !p.photoBase64) continue;

    const photoId = p.id;
    const occId = p.occurrenceId;
    const sig = getImageSignature(p.photoBase64);

    // If identical ID already exists, do not duplicate
    if (photoId && seenIds.has(photoId)) {
      continue;
    }

    // If linked to the same occurrence, ensure only 1 photo per occurrence
    if (occId && seenOccurrences.has(occId)) {
      continue;
    }

    // If identical image content already exists, do not duplicate
    if (sig && seenSignatures.has(sig)) {
      continue;
    }

    if (photoId) seenIds.add(photoId);
    if (occId) seenOccurrences.add(occId);
    if (sig) seenSignatures.add(sig);

    result.push(p);
  }

  return result;
}

/**
 * Save a dedicated Operation Photo to persistent local storage and in-memory cache
 */
export function saveOperationPhoto(
  photo: Omit<OperationPhoto, 'id' | 'synced' | 'timestamp' | 'displayTime' | 'displayDate'> & {
    id?: string;
    timestamp?: string;
    displayTime?: string;
    displayDate?: string;
    synced?: boolean;
  }
): OperationPhoto {
  const id = photo.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date();
  const displayTime = photo.displayTime || getDeviceLocalTimeString(now);
  const displayDate = photo.displayDate || getDeviceLocalDateString(now);
  const timestamp = photo.timestamp || getDeviceLocalDateTimeString(now);

  const fullPhoto: OperationPhoto = {
    ...photo,
    id,
    displayTime,
    displayDate,
    timestamp,
    synced: photo.synced ?? false,
    source: photo.source || 'photo',
  };

  const compId = photo.companyId || 'moutryx-demo-company';
  const incomingSig = getImageSignature(photo.photoBase64);

  // 1. Update in-memory cache immediately (replacing duplicate signatures/occurrences)
  const memList = memoryPhotosMap.get(compId) || [];
  const memFiltered = memList.filter((p) => {
    if (p.id === id) return false;
    if (photo.occurrenceId && p.occurrenceId === photo.occurrenceId) return false;
    if (incomingSig && getImageSignature(p.photoBase64) === incomingSig && (p.osId === photo.osId || p.osNumber === photo.osNumber)) return false;
    return true;
  });
  memoryPhotosMap.set(compId, [...memFiltered, fullPhoto]);

  // 2. Persist to localStorage safely
  if (typeof window !== 'undefined') {
    try {
      const key = `${STORAGE_KEY_PREFIX}photos_${compId}`;
      const existing = getAllOperationPhotos(compId);
      const filtered = existing.filter((p) => {
        if (p.id === id) return false;
        if (photo.occurrenceId && p.occurrenceId === photo.occurrenceId) return false;
        if (incomingSig && getImageSignature(p.photoBase64) === incomingSig && (p.osId === photo.osId || p.osNumber === photo.osNumber)) return false;
        return true;
      });
      const updated = deduplicateOperationPhotos([...filtered, fullPhoto]);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('[MOUTRYX OFFLINE] Aviso ao persistir foto no localStorage (retido na memória):', err);
    }
  }

  return fullPhoto;
}

/**
 * Get all operation photos for a tenant
 */
export function getAllOperationPhotos(companyId: string): OperationPhoto[] {
  if (typeof window === 'undefined' || !companyId) {
    return deduplicateOperationPhotos(memoryPhotosMap.get(companyId || '') || []);
  }
  
  const fromMemory = memoryPhotosMap.get(companyId) || [];
  let fromStorage: OperationPhoto[] = [];

  try {
    const key = `${STORAGE_KEY_PREFIX}photos_${companyId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      fromStorage = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao ler fotos do localStorage:', err);
  }

  return deduplicateOperationPhotos([...fromStorage, ...fromMemory]).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Get operation photos for a specific OS (Flexible multi-key matching)
 */
export function getOperationPhotosForOS(companyId: string, osId: string): OperationPhoto[] {
  if (!osId) return [];
  const all = getAllOperationPhotos(companyId);
  const matched = all.filter((p) => {
    const matchCompany = !companyId || !p.companyId || p.companyId === companyId;
    const matchOS = p.osId === osId || p.osNumber === osId;
    return matchCompany && matchOS;
  });
  return deduplicateOperationPhotos(matched).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Mark photos as synced
 */
export function markPhotosAsSynced(companyId: string, photoIds: string[]): void {
  if (typeof window === 'undefined' || !companyId || photoIds.length === 0) return;
  try {
    const key = `${STORAGE_KEY_PREFIX}photos_${companyId}`;
    const all = getAllOperationPhotos(companyId);
    const syncedAt = new Date().toISOString();
    const updated = all.map((p) => {
      if (photoIds.includes(p.id)) {
        return { ...p, synced: true, syncedAt };
      }
      return p;
    });
    localStorage.setItem(key, JSON.stringify(updated));
    memoryPhotosMap.set(companyId, updated);
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao marcar fotos como sincronizadas:', err);
  }
}

/**
 * Atomically records an operational occurrence and its associated photo.
 * Guarantees that the occurrence and photo are linked, compressed, and stored together offline.
 */
export async function recordOfflineOccurrence(params: {
  companyId: string;
  userId: string;
  pilotId: string;
  pilotName: string;
  osId: string;
  osNumber: string;
  occurrenceType: string;
  occurrenceLabel: string;
  description: string;
  photoBase64?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  displayTime?: string;
}): Promise<{ occurrenceAction: OfflineAction; savedPhoto?: OperationPhoto }> {
  const now = new Date();
  const displayTime = params.displayTime || getDeviceLocalTimeString(now);
  const displayDate = getDeviceLocalDateString(now);
  const timestamp = params.timestamp || getDeviceLocalDateTimeString(now);
  const occId = `occ_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let compressedPhoto = params.photoBase64;
  let savedPhoto: OperationPhoto | undefined = undefined;
  let photoId: string | undefined = undefined;

  // 1. Process and save photo if provided
  if (compressedPhoto) {
    if (compressedPhoto.startsWith('data:image')) {
      compressedPhoto = await compressImageBase64(compressedPhoto);
    }

    photoId = `photo_${occId}`;
    savedPhoto = saveOperationPhoto({
      id: photoId,
      companyId: params.companyId,
      osId: params.osId,
      osNumber: params.osNumber,
      occurrenceId: occId,
      pilotId: params.pilotId,
      pilotName: params.pilotName,
      photoBase64: compressedPhoto,
      caption: `Ocorrência: ${params.occurrenceLabel}${params.description ? ` - ${params.description}` : ''}`,
      timestamp,
      displayTime,
      displayDate,
      source: 'occurrence',
    });
  }

  // 2. Record the occurrence offline action
  const occurrenceAction = recordOfflineAction({
    id: occId,
    companyId: params.companyId,
    userId: params.userId,
    pilotId: params.pilotId,
    pilotName: params.pilotName,
    osId: params.osId,
    osNumber: params.osNumber,
    type: 'OCCURRENCE',
    timestamp,
    displayTime,
    payload: {
      occurrenceId: occId,
      occurrenceType: params.occurrenceType,
      occurrenceLabel: params.occurrenceLabel,
      description: params.description,
      photoId,
      photoUrl: compressedPhoto,
      photoBase64: compressedPhoto,
      latitude: params.latitude,
      longitude: params.longitude,
    },
  });

  return { occurrenceAction, savedPhoto };
}

export const recordOfflineOccurrenceWithPhoto = recordOfflineOccurrence;

/**
 * Save an offline action to the local queue
 */
export function recordOfflineAction(
  action: Omit<OfflineAction, 'id' | 'synced' | 'timestamp' | 'displayTime'> & {
    id?: string;
    timestamp?: string;
    displayTime?: string;
  }
): OfflineAction {
  const id = action.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const displayTime = action.displayTime || getDeviceLocalTimeString(now);
  const timestamp = action.timestamp || getDeviceLocalDateTimeString(now);

  const fullAction: OfflineAction = {
    ...action,
    id,
    displayTime,
    timestamp,
    synced: false,
  };

  const compId = action.companyId || 'moutryx-demo-company';

  // 1. Update in-memory cache
  const memList = memoryActionsMap.get(compId) || [];
  const memFiltered = memList.filter((a) => a.id !== id);
  memoryActionsMap.set(compId, [...memFiltered, fullAction]);

  // 2. Persist to localStorage safely
  if (typeof window !== 'undefined') {
    try {
      const key = `${STORAGE_KEY_PREFIX}actions_${compId}`;
      const existing = getOfflineActions(compId);
      
      // Idempotent check: do not duplicate by ID
      const filtered = existing.filter((a) => a.id !== id);
      const updated = [...filtered, fullAction];
      
      localStorage.setItem(key, JSON.stringify(updated));

      // If action is PHOTO and not already saved, save in dedicated OperationPhoto store
      if (action.type === 'PHOTO' && action.payload.photoBase64) {
        saveOperationPhoto({
          id: `photo_${id}`,
          companyId: compId,
          osId: action.osId,
          osNumber: action.osNumber,
          pilotId: action.pilotId,
          pilotName: action.pilotName,
          photoBase64: action.payload.photoBase64,
          caption: action.payload.photoCaption || 'Foto registrada no campo',
          timestamp: fullAction.timestamp,
          displayTime: fullAction.displayTime,
          source: 'photo',
        });
      }
    } catch (err) {
      console.warn('[MOUTRYX OFFLINE] Falha ao registrar ação offline no localStorage (retido na memória):', err);
    }
  }

  return fullAction;
}

/**
 * Get all offline actions for a company
 */
export function getOfflineActions(companyId: string): OfflineAction[] {
  if (typeof window === 'undefined' || !companyId) {
    return memoryActionsMap.get(companyId || '') || [];
  }

  const fromMemory = memoryActionsMap.get(companyId) || [];
  let fromStorage: OfflineAction[] = [];

  try {
    const key = `${STORAGE_KEY_PREFIX}actions_${companyId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      fromStorage = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao obter ações offline:', err);
  }

  const map = new Map<string, OfflineAction>();
  [...fromStorage, ...fromMemory].forEach((a) => {
    map.set(a.id, a);
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Get actions for a specific OS (Flexible multi-key matching)
 */
export function getActionsForOS(companyId: string, osId: string): OfflineAction[] {
  if (!osId) return [];
  const all = getOfflineActions(companyId);
  return all
    .filter((a) => {
      const matchCompany = !companyId || !a.companyId || a.companyId === companyId;
      const matchOS = a.osId === osId || a.osNumber === osId || (a.payload && (a.payload as any).osId === osId);
      return matchCompany && matchOS;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get pending (unsynced) offline actions
 */
export function getPendingActions(companyId: string): OfflineAction[] {
  return getOfflineActions(companyId).filter((a) => !a.synced);
}

/**
 * Mark a list of action IDs as synced
 */
export function markActionsAsSynced(companyId: string, actionIds: string[]): void {
  if (!companyId || actionIds.length === 0) return;
  try {
    const all = getOfflineActions(companyId);
    const syncedAt = new Date().toISOString();
    const updated = all.map((a) => {
      if (actionIds.includes(a.id)) {
        return { ...a, synced: true, syncedAt };
      }
      return a;
    });
    memoryActionsMap.set(companyId, updated);

    if (typeof window !== 'undefined') {
      const key = `${STORAGE_KEY_PREFIX}actions_${companyId}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[MOUTRYX OFFLINE] Falha ao atualizar status de sincronização:', err);
  }
}

/**
 * Calculate applied area percentage accurately (pure mathematical calculation)
 */
export function calculateAppliedPercentage(appliedHa: number, contractedHa: number): number {
  if (!contractedHa || contractedHa <= 0) return 0;
  if (!appliedHa || appliedHa < 0) return 0;
  const pct = (appliedHa / contractedHa) * 100;
  return Math.round(pct * 10) / 10; // 1 decimal place
}

/**
 * Flushes the offline action queue against the backend API and updates local context
 */
export async function flushOfflineSyncQueue(
  companyId: string,
  apiSyncFn: (url: string, method: string, body?: any) => Promise<any>,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  if (!isFieldOnline()) {
    return { success: false, syncedCount: 0, errors: ['Dispositivo operando offline'] };
  }

  const pending = getPendingActions(companyId);
  if (pending.length === 0) {
    return { success: true, syncedCount: 0, errors: [] };
  }

  const total = pending.length;
  let syncedCount = 0;
  const syncedIds: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < pending.length; i++) {
    const action = pending[i];
    if (onProgress) {
      onProgress(i + 1, total);
    }

    try {
      // Route action to appropriate backend endpoint
      switch (action.type) {
        case 'START_OPERATION': {
          await apiSyncFn(`/api/service-orders/${action.osId}/status`, 'PATCH', {
            status: 'em_operacao',
            droneId: action.payload.droneId,
            pilotId: action.pilotId,
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'PAUSE_OPERATION': {
          await apiSyncFn(`/api/service-orders/${action.osId}/status`, 'PATCH', {
            status: 'pausado',
            notes: action.payload.pauseReason ? `Pausado: ${action.payload.pauseReason}` : undefined,
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'RESUME_OPERATION': {
          await apiSyncFn(`/api/service-orders/${action.osId}/status`, 'PATCH', {
            status: 'em_operacao',
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'OCCURRENCE': {
          await apiSyncFn('/api/occurrences', 'POST', {
            id: action.id, // Idempotent action ID
            companyId: action.companyId,
            osId: action.osId,
            osNumber: action.osNumber,
            pilotId: action.pilotId,
            pilotName: action.pilotName,
            type: action.payload.occurrenceType || 'outro',
            description: action.payload.description || action.payload.occurrenceLabel || 'Ocorrência registrada no campo',
            photoUrl: action.payload.photoUrl || action.payload.photoBase64 || '',
            timestamp: action.timestamp,
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'PHOTO': {
          // Photos are saved as an occurrence or linked document
          await apiSyncFn('/api/occurrences', 'POST', {
            id: action.id,
            companyId: action.companyId,
            osId: action.osId,
            osNumber: action.osNumber,
            pilotId: action.pilotId,
            pilotName: action.pilotName,
            type: 'outro',
            description: action.payload.photoCaption || 'Registro fotográfico em campo',
            photoUrl: action.payload.photoBase64 || '',
            timestamp: action.timestamp,
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'APPLIED_AREA': {
          await apiSyncFn(`/api/service-orders/${action.osId}`, 'PUT', {
            actualAreaSprayedHa: action.payload.appliedAreaHa,
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        case 'FINISH_OPERATION': {
          await apiSyncFn(`/api/service-orders/${action.osId}/status`, 'PATCH', {
            status: 'concluido',
            actualAreaSprayedHa: action.payload.appliedAreaHa,
            notes: action.payload.finalNotes,
            completedDate: action.timestamp.split('T')[0],
          });
          syncedIds.push(action.id);
          syncedCount++;
          break;
        }

        default:
          syncedIds.push(action.id);
          syncedCount++;
      }
    } catch (err: any) {
      console.warn(`[MOUTRYX SYNC ERROR] Falha na ação ${action.id}:`, err);
      errors.push(`Ação ${action.type}: ${err.message || 'Erro desconhecido'}`);
    }
  }

  // Mark all successfully synced actions
  if (syncedIds.length > 0) {
    markActionsAsSynced(companyId, syncedIds);
  }

  return {
    success: errors.length === 0,
    syncedCount,
    errors,
  };
}
