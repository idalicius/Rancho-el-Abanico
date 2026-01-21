import { Arete, EstadoArete, Lote } from '../types';

const STORAGE_KEY_ARETES = 'ganadoscan_aretes_v1';
const STORAGE_KEY_LOTES = 'ganadoscan_lotes_v1';

export const StorageService = {
  // Helpers internos síncronos
  _getAretes: (): Arete[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ARETES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  },
  _getLotes: (): Lote[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOTES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  },

  // --- INTERFAZ ASÍNCRONA PARA COMPATIBILIDAD CON APP ---

  // Lotes
  obtenerLotes: async (): Promise<Lote[]> => {
    const lotes = StorageService._getLotes();
    return lotes.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  },

  crearLote: async (nombre: string): Promise<Lote> => {
    const lotes = StorageService._getLotes();
    const nuevoLote: Lote = {
      id: crypto.randomUUID(),
      nombre,
      fechaCreacion: new Date().toISOString(),
      cerrado: false
    };
    localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify([nuevoLote, ...lotes]));
    return nuevoLote;
  },

  actualizarEstadoLote: async (id: string, cerrado: boolean): Promise<void> => {
    const lotes = StorageService._getLotes();
    const updated = lotes.map(l => l.id === id ? { ...l, cerrado } : l);
    localStorage.setItem(STORAGE_KEY_LOTES, JSON.stringify(updated));
  },

  // Aretes
  obtenerAretes: async (): Promise<Arete[]> => {
    const aretes = StorageService._getAretes();
    return aretes.sort((a, b) => new Date(b.fechaEscaneo).getTime() - new Date(a.fechaEscaneo).getTime());
  },

  guardarArete: async (codigo: string, loteId?: string): Promise<void> => {
    const aretes = StorageService._getAretes();
    // Validar si loteId es 'unassigned', guardarlo como undefined o null
    const finalLoteId = loteId === 'unassigned' ? undefined : loteId;
    
    const nuevoArete: Arete = {
      id: crypto.randomUUID(),
      codigo,
      fechaEscaneo: new Date().toISOString(),
      estado: EstadoArete.PENDIENTE,
      loteId: finalLoteId
    };
    localStorage.setItem(STORAGE_KEY_ARETES, JSON.stringify([nuevoArete, ...aretes]));
  },

  actualizarEstado: async (id: string, nuevoEstado: EstadoArete): Promise<void> => {
    const aretes = StorageService._getAretes();
    const updated = aretes.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a);
    localStorage.setItem(STORAGE_KEY_ARETES, JSON.stringify(updated));
  },

  eliminarArete: async (id: string): Promise<void> => {
    const aretes = StorageService._getAretes();
    const filtered = aretes.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_ARETES, JSON.stringify(filtered));
  },

  limpiarTodo: async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEY_ARETES);
    localStorage.removeItem(STORAGE_KEY_LOTES);
  }
};