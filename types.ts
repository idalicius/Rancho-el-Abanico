export enum EstadoArete {
  PENDIENTE = 'PENDIENTE',
  ALTA_CONFIRMADA = 'ALTA_CONFIRMADA',
  NO_REGISTRADO = 'NO_REGISTRADO',
  BAJA = 'BAJA'
}

export interface Lote {
  id: string;
  nombre: string;
  fechaCreacion: string;
  cerrado: boolean;
}

export interface Arete {
  id: string;
  codigo: string;
  fechaEscaneo: string; // ISO String
  estado: EstadoArete;
  notas?: string;
  loteId?: string; // Nuevo campo para vincular al lote
}

export type Tab = 'lista' | 'escanear' | 'analisis' | 'lotes';

export interface ScanResult {
  decodedText: string;
  result: any;
}