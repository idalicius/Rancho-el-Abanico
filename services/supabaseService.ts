import { supabase } from './supabaseClient';
import { Arete, EstadoArete } from '../types';

export const SupabaseService = {
  // Obtener todos los aretes (carga inicial)
  obtenerAretes: async (): Promise<Arete[]> => {
    const { data, error } = await supabase
      .from('aretes')
      .select('*')
      .order('fecha_escaneo', { ascending: false });

    if (error) {
      console.error('Error fetching aretes:', error);
      return [];
    }

    // Mapear de snake_case (DB) a camelCase (Frontend)
    return data.map((item: any) => ({
      id: item.id,
      codigo: item.codigo,
      fechaEscaneo: item.fecha_escaneo,
      estado: item.estado as EstadoArete,
      notas: item.notas
    }));
  },

  // Guardar un nuevo arete
  guardarArete: async (codigo: string): Promise<void> => {
    const { error } = await supabase
      .from('aretes')
      .insert([
        { 
          codigo, 
          estado: EstadoArete.PENDIENTE,
          fecha_escaneo: new Date().toISOString()
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
     // Nota: En un entorno real, esto debería estar protegido o no existir.
     // Supabase no permite delete sin where por defecto a menos que se configure,
     // así que iteramos o usamos una condición amplia.
     const { error } = await supabase
       .from('aretes')
       .delete()
       .neq('id', '00000000-0000-0000-0000-000000000000'); // Borrar todo lo que tenga ID válido
     
     if (error) console.error('Error limpiando BD:', error);
  }
};