import { supabase } from './supabaseClient';
import { Arete, EstadoArete, Lote } from '../types';

export const SupabaseService = {
  // --- LOTES ---

  obtenerLotes: async (): Promise<Lote[] | null> => {
    const { data, error } = await supabase
      .from('lotes')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching lotes:', error);
      // RETORNAR NULL EN LUGAR DE [] ES CRÍTICO PARA NO BORRAR LA CACHÉ OFFLINE
      return null;
    }

    return data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      fechaCreacion: item.fecha_creacion,
      cerrado: item.cerrado
    }));
  },

  // MODIFICADO: Acepta ID opcional para sincronización offline
  crearLote: async (nombre: string, id?: string): Promise<Lote | null> => {
    const payload: any = { nombre, cerrado: false };
    if (id) payload.id = id;

    const { data, error } = await supabase
      .from('lotes')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creando lote:', error);
      return null;
    }

    return {
      id: data.id,
      nombre: data.nombre,
      fechaCreacion: data.fecha_creacion,
      cerrado: data.cerrado
    };
  },

  actualizarEstadoLote: async (id: string, cerrado: boolean): Promise<void> => {
    const { error } = await supabase
      .from('lotes')
      .update({ cerrado })
      .eq('id', id);

    if (error) console.error('Error actualizando estado del lote:', error);
  },

  eliminarLote: async (id: string): Promise<void> => {
    // Primero eliminamos los aretes asociados
    const { error: errorAretes } = await supabase
        .from('aretes')
        .delete()
        .eq('lote_id', id);
    
    if (errorAretes) {
        console.error('Error eliminando aretes del lote:', errorAretes);
        throw new Error("No se pudieron eliminar los aretes del lote.");
    }

    // Luego eliminamos el lote
    const { error } = await supabase
      .from('lotes')
      .delete()
      .eq('id', id);

    if (error) {
        console.error('Error eliminando lote:', error);
        throw error;
    }
  },

  // --- ARETES ---

  obtenerAretes: async (): Promise<Arete[] | null> => {
    const { data, error } = await supabase
      .from('aretes')
      .select('*')
      .order('fecha_escaneo', { ascending: false });

    if (error) {
      console.error('Error fetching aretes:', error);
      // RETORNAR NULL EN LUGAR DE [] ES CRÍTICO PARA NO BORRAR LA CACHÉ OFFLINE
      return null;
    }

    return data.map((item: any) => ({
      id: item.id,
      codigo: item.codigo,
      fechaEscaneo: item.fecha_escaneo,
      estado: item.estado as EstadoArete,
      notas: item.notas,
      loteId: item.lote_id
    }));
  },

  guardarArete: async (codigo: string, loteId?: string): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .insert([
        { 
          codigo, 
          estado: EstadoArete.PENDIENTE,
          fecha_escaneo: new Date().toISOString(),
          lote_id: loteId || null
        }
      ]);

    if (error) console.error('Error insertando arete:', error);
  },

  actualizarEstado: async (id: string, nuevoEstado: EstadoArete): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) console.error('Error actualizando estado:', error);
  },

  eliminarArete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .delete()
      .eq('id', id);

    if (error) console.error('Error eliminando arete:', error);
  },

  limpiarTodo: async (): Promise<void> => {
     await supabase.from('aretes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
};