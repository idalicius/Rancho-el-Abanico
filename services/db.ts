import Dexie, { Table } from 'dexie';
import { Arete, Lote } from '../types';

export class GanadoDB extends Dexie {
  aretes!: Table<Arete>;
  lotes!: Table<Lote>;

  constructor() {
    super('GanadoScanDB');
    
    // Definición del esquema
    // id: Primary Key
    // loteId, sincronizado, codigo: Índices para búsquedas rápidas
    (this as any).version(1).stores({
      aretes: 'id, loteId, codigo, sincronizado, fechaEscaneo', 
      lotes: 'id, fechaCreacion, sincronizado' 
    });
  }
}

export const db = new GanadoDB();

// --- MIGRACIÓN DE LOCALSTORAGE A INDEXEDDB ---
// Esta función se ejecuta al iniciar la app para rescatar datos viejos
export const migrateFromLocalStorage = async () => {
  try {
    const KEYS = {
      OFFLINE_QUEUE: 'ganadoscan_offline_queue_v1',
      OFFLINE_LOTES: 'ganadoscan_offline_lotes_queue_v1',
      LOTES_CACHE: 'ganadoscan_lotes_cache_v1',
      ARETES_CACHE: 'ganadoscan_aretes_cache_v1' // La key nueva que introdujimos
    };

    const hasMigrated = localStorage.getItem('ganadoscan_db_migrated_v1');
    if (hasMigrated) return; // Ya se migró anteriormente

    console.log("Iniciando migración a IndexedDB...");

    // 1. Migrar Lotes
    const lotesCacheRaw = localStorage.getItem(KEYS.LOTES_CACHE);
    const lotesColaRaw = localStorage.getItem(KEYS.OFFLINE_LOTES);
    
    const lotesCache: Lote[] = lotesCacheRaw ? JSON.parse(lotesCacheRaw) : [];
    const lotesCola: Lote[] = lotesColaRaw ? JSON.parse(lotesColaRaw) : [];

    // En Dexie, 'sincronizado' nos dice si vino del server o es local
    // Cache del server -> sincronizado: true (asumimos, aunque la interfaz Lote no lo tenía explícito, lo manejaremos internamente)
    // Cola local -> sincronizado: false
    
    // Nota: Lote en types.ts no tiene 'sincronizado', lo agregamos dinámicamente para la DB local
    const lotesToPut = [
        ...lotesCache.map(l => ({ ...l, sincronizado: true })),
        ...lotesCola.map(l => ({ ...l, sincronizado: false })) // Prioridad al local
    ];

    if (lotesToPut.length > 0) {
        await db.lotes.bulkPut(lotesToPut);
    }

    // 2. Migrar Aretes
    const aretesCacheRaw = localStorage.getItem(KEYS.ARETES_CACHE); // Puede ser null si venimos de version vieja
    const aretesColaRaw = localStorage.getItem(KEYS.OFFLINE_QUEUE); // La cola vieja
    const aretesLegacyRaw = localStorage.getItem('ganadoscan_aretes_v1'); // Cache muy viejo (services/storageService.ts)

    const aretesCache: Arete[] = aretesCacheRaw ? JSON.parse(aretesCacheRaw) : [];
    const aretesCola: Arete[] = aretesColaRaw ? JSON.parse(aretesColaRaw) : [];
    const aretesLegacy: Arete[] = aretesLegacyRaw ? JSON.parse(aretesLegacyRaw) : [];

    const aretesToPut = [
        ...aretesLegacy.map(a => ({ ...a, sincronizado: false })), // Legacy se trata como local/no sync
        ...aretesCache.map(a => ({ ...a, sincronizado: true })),
        ...aretesCola.map(a => ({ ...a, sincronizado: false }))
    ];

    if (aretesToPut.length > 0) {
        await db.aretes.bulkPut(aretesToPut);
    }

    // Marcar como migrado y limpiar
    localStorage.setItem('ganadoscan_db_migrated_v1', 'true');
    
    // Opcional: Limpiar localStorage para ahorrar espacio
    // localStorage.removeItem(KEYS.OFFLINE_QUEUE);
    // localStorage.removeItem(KEYS.LOTES_CACHE);
    // ... etc

    console.log("Migración completada con éxito.");

  } catch (e) {
    console.error("Error en migración:", e);
  }
};