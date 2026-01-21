import React from 'react';
import { Arete, EstadoArete } from '../types';
import { Check, X, AlertTriangle, Trash2, Calendar, Hash } from 'lucide-react';

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

  const getStatusIcon = (status: EstadoArete) => {
    switch (status) {
      case EstadoArete.ALTA_CONFIRMADA: return <Check size={16} />;
      case EstadoArete.NO_REGISTRADO: return <X size={16} />;
      case EstadoArete.BAJA: return <AlertTriangle size={16} />;
      default: return <Hash size={16} />;
    }
  };

  return (
    <div className={`p-4 mb-3 rounded-lg border-l-4 shadow-sm transition-all ${getStatusColor(arete.estado)}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
             <span className="opacity-70">#</span> {arete.codigo}
          </h3>
          <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
            <Calendar size={12} />
            {new Date(arete.fechaEscaneo).toLocaleString('es-MX')}
          </div>
          <div className="text-xs font-semibold mt-1 uppercase tracking-wide">
            {arete.estado.replace('_', ' ')}
          </div>
        </div>
        
        <button 
          onClick={() => onDelete(arete.id)}
          className="text-slate-400 hover:text-red-500 p-1"
          aria-label="Eliminar"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
        <button 
          onClick={() => onUpdateStatus(arete.id, EstadoArete.ALTA_CONFIRMADA)}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.ALTA_CONFIRMADA ? 'bg-green-600 text-white shadow-md' : 'bg-white hover:bg-green-50 text-green-700 border border-green-200'}`}
        >
          <Check size={14} /> Alta
        </button>
        
        <button 
          onClick={() => onUpdateStatus(arete.id, EstadoArete.NO_REGISTRADO)}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.NO_REGISTRADO ? 'bg-red-600 text-white shadow-md' : 'bg-white hover:bg-red-50 text-red-700 border border-red-200'}`}
        >
          <X size={14} /> No Reg.
        </button>

        <button 
          onClick={() => onUpdateStatus(arete.id, EstadoArete.BAJA)}
          className={`flex-1 py-2 rounded flex justify-center items-center gap-1 text-sm font-medium transition-colors
            ${arete.estado === EstadoArete.BAJA ? 'bg-yellow-600 text-white shadow-md' : 'bg-white hover:bg-yellow-50 text-yellow-700 border border-yellow-200'}`}
        >
          <AlertTriangle size={14} /> Baja
        </button>
      </div>
    </div>
  );
};

export default TagItem;