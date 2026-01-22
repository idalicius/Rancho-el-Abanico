import React, { memo } from 'react';
import { Arete, EstadoArete } from '../types';
import { Check, X, AlertTriangle, Trash2, Calendar, CloudUpload, CloudCheck } from 'lucide-react';

interface TagItemProps {
  arete: Arete;
  onUpdateStatus: (id: string, status: EstadoArete) => void;
  onDelete: (id: string) => void;
}

const TagItem: React.FC<TagItemProps> = ({ arete, onUpdateStatus, onDelete }) => {
  const getStatusColor = (status: EstadoArete) => {
    switch (status) {
      case EstadoArete.ALTA_CONFIRMADA: return 'bg-green-100 border-green-500 text-green-800';
      case EstadoArete.NO_REGISTRADO: return 'bg-red-100 border-red-500 text-red-800';
      case EstadoArete.BAJA: return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default: return 'bg-white border-slate-200 text-slate-700';
    }
  };

  return (
    <div className={`p-4 mb-3 rounded-lg border-l-4 shadow-sm transition-all relative ${getStatusColor(arete.estado)}`}>
      
      {/* Indicador de Sincronización */}
      <div className="absolute top-2 right-2">
         {arete.sincronizado === false ? (
             <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                <CloudUpload size={12} /> Pendiente
             </span>
         ) : (
            <span className="text-slate-300">
               <CloudCheck size={14} />
            </span>
         )}
      </div>

      <div className="flex justify-between items-start gap-4 mt-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold flex items-center gap-2 truncate">
             <span className="opacity-70 flex-shrink-0">#</span> 
             <span className="truncate">{arete.codigo}</span>
          </h3>
          <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
            <Calendar size={12} className="flex-shrink-0" />
            <span className="truncate">{new Date(arete.fechaEscaneo).toLocaleString('es-MX')}</span>
          </div>
          <div className="text-xs font-semibold mt-1 uppercase tracking-wide">
            {arete.estado.replace('_', ' ')}
          </div>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(arete.id);
          }}
          className="flex-shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors mt-1"
          aria-label="Eliminar registro"
          title="Eliminar registro"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(arete.id, EstadoArete.ALTA_CONFIRMADA); }}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.ALTA_CONFIRMADA ? 'bg-green-600 text-white shadow-md' : 'bg-white hover:bg-green-50 text-green-700 border border-green-200'}`}
        >
          <Check size={14} /> Alta
        </button>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(arete.id, EstadoArete.NO_REGISTRADO); }}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.NO_REGISTRADO ? 'bg-red-600 text-white shadow-md' : 'bg-white hover:bg-red-50 text-red-700 border border-red-200'}`}
        >
          <X size={14} /> No Reg.
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); onUpdateStatus(arete.id, EstadoArete.BAJA); }}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.BAJA ? 'bg-yellow-600 text-white shadow-md' : 'bg-white hover:bg-yellow-50 text-yellow-700 border border-yellow-200'}`}
        >
          <AlertTriangle size={14} /> Baja
        </button>
      </div>
    </div>
  );
};

// Optimization: Only re-render if props change significantly
export default memo(TagItem, (prev, next) => {
    return (
        prev.arete.id === next.arete.id &&
        prev.arete.estado === next.arete.estado &&
        prev.arete.sincronizado === next.arete.sincronizado &&
        prev.arete.codigo === next.arete.codigo
    );
});