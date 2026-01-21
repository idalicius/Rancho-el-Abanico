import React from 'react';
import { Lote } from '../types';
import { FolderOpen, FolderClosed, CalendarClock, ArrowRight, Trash2 } from 'lucide-react';

interface LotItemProps {
  lote: Lote;
  isActive: boolean;
  totalAretes: number;
  onActivate: (lote: Lote) => void;
  onDelete?: (loteId: string) => void;
}

const LotItem: React.FC<LotItemProps> = ({ lote, isActive, totalAretes, onActivate, onDelete }) => {
  return (
    <div 
      onClick={() => onActivate(lote)}
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group
        ${isActive 
          ? 'bg-emerald-50 border-emerald-500 shadow-md' 
          : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-sm'
        }
        ${lote.cerrado ? 'opacity-80 grayscale-[0.3]' : ''}
      `}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
          {lote.cerrado ? <FolderClosed size={20} /> : <FolderOpen size={20} />}
        </div>
        <div>
          <h4 className={`font-bold ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>
            {lote.nombre}
          </h4>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <CalendarClock size={12} />
            <span>{new Date(lote.fechaCreacion).toLocaleString('es-MX')}</span>
          </div>
          <div className="mt-1">
             <span className="text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
               {totalAretes} registros
             </span>
             {isActive && <span className="ml-2 text-xs font-bold text-emerald-600">● ACTIVO</span>}
             {lote.cerrado && <span className="ml-2 text-xs font-bold text-slate-400">● CERRADO</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onDelete && (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(lote.id);
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="Eliminar Lote"
            >
                <Trash2 size={18} />
            </button>
        )}
        
        <div className={`text-emerald-600 transition-transform ${isActive ? 'translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`}>
          <ArrowRight size={20} />
        </div>
      </div>
    </div>
  );
};

export default LotItem;