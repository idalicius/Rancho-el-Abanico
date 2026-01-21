import { supabase } from './supabaseClient';
import { Arete, EstadoArete, Lote } from '../types';

export const SupabaseService = {
  // --- LOTES ---

  obtenerLotes: async (): Promise<Lote[]> => {
    const { data, error } = await supabase
      .from('lotes')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error fetching lotes:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      fechaCreacion: item.fecha_creacion,
      cerrado: item.cerrado
    }));
  },

  crearLote: async (nombre: string): Promise<Lote | null> => {
    const { data, error } = await supabase
      .from('lotes')
      .insert([{ nombre, cerrado: false }])
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
    // Primero eliminamos los aretes asociados para asegurar integridad 
    // (aunque la DB podría tener CASCADE, es mejor ser explícito desde el cliente si no controlamos la DB)
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

  // Obtener todos los aretes
  obtenerAretes: async (): Promise<Arete[]> => {
    const { data, error } = await supabase
      .from('aretes')
      .select('*')
      .order('fecha_escaneo', { ascending: false });

    if (error) {
      console.error('Error fetching aretes:', error);
      return [];
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

  // Guardar un nuevo arete vinculado a un lote
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

  // Actualizar estado
  actualizarEstado: async (id: string, nuevoEstado: EstadoArete): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) console.error('Error actualizando estado:', error);
  },

  // Eliminar arete
  eliminarArete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .delete()
      .eq('id', id);

    if (error) console.error('Error eliminando arete:', error);
  },

  // Eliminar todo (peligroso, para el botón de limpiar)
  limpiarTodo: async (): Promise<void> => {
     // Borra aretes primero por FK
     await supabase.from('aretes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
     // Podría borrar lotes, pero por seguridad mejor dejarlos o borrarlos aparte
  }
};