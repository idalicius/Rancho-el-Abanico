import React from 'react';
import { Arete, EstadoArete } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatsProps {
  aretes: Arete[];
}

const Stats: React.FC<StatsProps> = ({ aretes }) => {
  const data = [
    { name: 'Alta', value: aretes.filter(a => a.estado === EstadoArete.ALTA_CONFIRMADA).length, color: '#16a34a' },
    { name: 'Pendiente', value: aretes.filter(a => a.estado === EstadoArete.PENDIENTE).length, color: '#94a3b8' },
    { name: 'No Reg.', value: aretes.filter(a => a.estado === EstadoArete.NO_REGISTRADO).length, color: '#dc2626' },
    { name: 'Baja', value: aretes.filter(a => a.estado === EstadoArete.BAJA).length, color: '#ca8a04' },
  ].filter(d => d.value > 0);

  if (aretes.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-2">Resumen del Hato</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm text-slate-500 mt-2">
        Total escaneado: <span className="font-bold text-slate-900">{aretes.length}</span>
      </div>
    </div>
  );
};

export default Stats;