export enum EstadoArete {
  PENDIENTE = 'PENDIENTE',
  ALTA_CONFIRMADA = 'ALTA_CONFIRMADA',
  NO_REGISTRADO = 'NO_REGISTRADO',
  BAJA = 'BAJA'
}

export interface Arete {
  id: string;
  codigo: string;
  fechaEscaneo: string; // ISO String
  estado: EstadoArete;
  notas?: string;
}

export type Tab = 'lista' | 'escanear' | 'analisis';

export interface ScanResult {
  decodedText: string;
  result: any;
}