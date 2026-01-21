import { Arete, EstadoArete } from '../types';

const STORAGE_KEY = 'ganadoscan_aretes_v1';

export const StorageService = {
  obtenerAretes: (): Arete[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error al leer storage", e);
      return [];
    }
  },

  guardarArete: (codigo: string): Arete => {
    const aretes = StorageService.obtenerAretes();
    
    // Evitar duplicados exactos en el mismo día si se desea, 
    // pero para este caso permitiremos entradas múltiples con timestamps diferentes
    const nuevoArete: Arete = {
      id: crypto.randomUUID(),
      codigo: codigo,
      fechaEscaneo: new Date().toISOString(),
      estado: EstadoArete.PENDIENTE
    };

    const nuevosAretes = [nuevoArete, ...aretes];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevosAretes));
    return nuevoArete;
  },

  actualizarEstado: (id: string, nuevoEstado: EstadoArete): Arete[] => {
    const aretes = StorageService.obtenerAretes();
    const actualizados = aretes.map(arete => 
      arete.id === id ? { ...arete, estado: nuevoEstado } : arete
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
    return actualizados;
  },

  eliminarArete: (id: string): Arete[] => {
    const aretes = StorageService.obtenerAretes();
    const filtrados = aretes.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));
    return filtrados;
  },

  limpiarTodo: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};