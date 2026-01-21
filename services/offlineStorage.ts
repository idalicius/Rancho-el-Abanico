import { Arete } from '../types';

const STORAGE_KEY_OFFLINE_QUEUE = 'ganadoscan_offline_queue_v1';

export const OfflineStorage = {
  // Guardar un arete en la cola local
  agregarACola: (arete: Arete): void => {
    const queue = OfflineStorage.obtenerCola();
    // Evitar duplicados exactos en la cola
    if (!queue.find(a => a.id === arete.id)) {
        // Aseguramos que se marque como NO sincronizado localmente
        const itemToSave = { ...arete, sincronizado: false };
        localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify([itemToSave, ...queue]));
    }
  },

  // Obtener toda la cola pendiente
  obtenerCola: (): Arete[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error leyendo cola offline", e);
      return [];
    }
  },

  // Eliminar un item específico de la cola (cuando ya se subió)
  removerDeCola: (id: string): void => {
    const queue = OfflineStorage.obtenerCola();
    const filtered = queue.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(filtered));
  },

  // Limpiar toda la cola (opcional)
  limpiarCola: (): void => {
    localStorage.removeItem(STORAGE_KEY_OFFLINE_QUEUE);
  }
};