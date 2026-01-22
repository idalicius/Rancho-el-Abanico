import { Arete, Lote } from '../types';
import { db } from './db';

const STORAGE_KEY_ACTIVE_LOTE_ID = 'ganadoscan_active_lote_id_v1';

export const OfflineStorage = {
  
  // --- ARETES ---
  
  agregarACola: async (arete: Arete): Promise<void> => {
    // En IndexedDB, la "cola" es simplemente un registro con sincronizado: false
    await db.aretes.put({ ...arete, sincronizado: false });
  },

  obtenerCola: async (): Promise<Arete[]> => {
    // Buscar todo lo que no esté sincronizado (0 = false)
    return await db.aretes.where('sincronizado').equals(0).toArray();
  },

  removerDeCola: async (id: string): Promise<void> => {
    // Marcar como sincronizado en lugar de borrar, para mantener la cache
    await db.aretes.update(id, { sincronizado: true });
  },

  eliminarLocalmente: async (id: string): Promise<void> => {
      await db.aretes.delete(id);
  },

  // --- LOTES ---

  agregarLoteCola: async (lote: Lote): Promise<void> => {
    await db.lotes.put({ ...lote, sincronizado: false } as any);
  },

  obtenerLotesCola: async (): Promise<Lote[]> => {
    return await db.lotes.where('sincronizado').equals(0).toArray();
  },

  removerLoteCola: async (id: string): Promise<void> => {
    await db.lotes.update(id, { sincronizado: true } as any);
  },

  eliminarLoteLocalmente: async (id: string): Promise<void> => {
    await (db as any).transaction('rw', db.lotes, db.aretes, async () => {
        await db.lotes.delete(id);
        // También borrar aretes asociados
        await db.aretes.where('loteId').equals(id).delete();
    });
  },

  // --- CACHÉ GENERAL (LECTURA/ESCRITURA MASIVA) ---
  
  // Guardar lo que viene del servidor (upsert masivo)
  guardarLotesCache: async (lotes: Lote[]): Promise<void> => {
    const lotesConSync = lotes.map(l => ({ ...l, sincronizado: true }));
    await db.lotes.bulkPut(lotesConSync as any);
  },

  obtenerTodosLotes: async (): Promise<Lote[]> => {
    return await db.lotes.orderBy('fechaCreacion').reverse().toArray();
  },

  guardarAretesCache: async (aretes: Arete[]): Promise<void> => {
    const aretesConSync = aretes.map(a => ({ ...a, sincronizado: true }));
    await db.aretes.bulkPut(aretesConSync);
  },

  obtenerTodosAretes: async (): Promise<Arete[]> => {
    return await db.aretes.orderBy('fechaEscaneo').reverse().toArray();
  },

  actualizarAreteLocal: async (id: string, changes: Partial<Arete>): Promise<void> => {
      await db.aretes.update(id, changes);
  },

  actualizarLoteLocal: async (id: string, changes: Partial<Lote>): Promise<void> => {
      await db.lotes.update(id, changes);
  },

  // --- PERSISTENCIA DE LOTE ACTIVO (MANTENEMOS LOCALSTORAGE POR SIMPLICIDAD UI) ---
  // Guardar un string pequeño en localStorage es más eficiente para el estado inicial de la UI
  
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