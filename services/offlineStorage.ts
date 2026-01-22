import { Arete, Lote } from '../types';

const STORAGE_KEY_OFFLINE_QUEUE = 'ganadoscan_offline_queue_v1';
const STORAGE_KEY_OFFLINE_LOTES_QUEUE = 'ganadoscan_offline_lotes_queue_v1';
const STORAGE_KEY_LOTES_CACHE = 'ganadoscan_lotes_cache_v1';
const STORAGE_KEY_ARETES_CACHE = 'ganadoscan_aretes_cache_v1'; // Nueva clave para aretes del servidor
const STORAGE_KEY_ACTIVE_LOTE_ID = 'ganadoscan_active_lote_id_v1';

export const OfflineStorage = {
  // --- COLA DE ARETES OFFLINE (LO QUE TÚ ESCANEAS SIN INTERNET) ---
  
  agregarACola: (arete: Arete): void => {
    const queue = OfflineStorage.obtenerCola();
    if (!queue.find(a => a.id === arete.id)) {
        const itemToSave = { ...arete, sincronizado: false };
        localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify([itemToSave, ...queue]));
    }
  },

  obtenerCola: (): Arete[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error leyendo cola offline", e);
      return [];
    }
  },

  removerDeCola: (id: string): void => {
    const queue = OfflineStorage.obtenerCola();
    const filtered = queue.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(filtered));
  },

  limpiarCola: (): void => {
    localStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
  },

  // --- COLA DE LOTES OFFLINE ---

  agregarLoteCola: (lote: Lote): void => {
    const queue = OfflineStorage.obtenerLotesCola();
    if (!queue.find(l => l.id === lote.id)) {
        localStorage.setItem(STORAGE_KEY_OFFLINE_LOTES_QUEUE, JSON.stringify([lote, ...queue]));
    }
  },

  obtenerLotesCola: (): Lote[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFLINE_LOTES_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  removerLoteCola: (id: string): void => {
    const queue = OfflineStorage.obtenerLotesCola();
    const filtered = queue.filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY_OFFLINE_LOTES_QUEUE, JSON.stringify(filtered));
  },

  // --- CACHÉ ESPEJO (DATOS DEL SERVIDOR GUARDADOS LOCALMENTE) ---
  
  guardarLotesCache: (lotes: Lote[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY_LOTES_CACHE, JSON.stringify(lotes));
    } catch (e) {
      console.error("Error guardando cache lotes", e);
    }
  },

  obtenerLotesCache: (): Lote[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOTES_CACHE);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  // NUEVO: Guardar todos los aretes del servidor localmente
  guardarAretesCache: (aretes: Arete[]): void => {
    try {
      // Guardamos solo los datos necesarios para ahorrar espacio si son muchos
      localStorage.setItem(STORAGE_KEY_ARETES_CACHE, JSON.stringify(aretes));
    } catch (e) {
      console.error("Error guardando cache aretes", e);
    }
  },

  obtenerAretesCache: (): Arete[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ARETES_CACHE);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  // --- PERSISTENCIA DE LOTE ACTIVO (STICKY SESSION) ---
  
  guardarLoteActivo: (id: string | null): void => {
      if (id) {
          localStorage.setItem(STORAGE_KEY_ACTIVE_LOTE_ID, id);
      } else {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_LOTE_ID);
      }
  },

  obtenerLoteActivo: (): string | null => {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_LOTE_ID);
  }
};