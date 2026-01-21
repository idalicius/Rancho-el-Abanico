import React from 'react';
import { Arete, EstadoArete } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatsProps {
  aretes: Arete[];
}

const Stats: React.FC<StatsProps> = ({ aretes }) => {
  // Preparamos datos, incluso si están vacíos para que no falle el render
  const hasData = aretes.length > 0;
  
  const data = [
    { name: 'Alta', value: aretes.filter(a => a.estado === EstadoArete.ALTA_CONFIRMADA).length, color: '#16a34a' },
    { name: 'Pendiente', value: aretes.filter(a => a.estado === EstadoArete.PENDIENTE).length, color: '#94a3b8' },
    { name: 'No Reg.', value: aretes.filter(a => a.estado === EstadoArete.NO_REGISTRADO).length, color: '#dc2626' },
    { name: 'Baja', value: aretes.filter(a => a.estado === EstadoArete.BAJA).length, color: '#ca8a04' },
  ].filter(d => d.value > 0);

  // Si no hay datos, usamos un dataset "fantasma" transparente para que el gráfico ocupe su espacio
  // y la imagen se vea centrada correctamente.
  const emptyData = [{ name: 'Sin datos', value: 1, color: '#f1f5f9' }];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-slate-100 relative overflow-hidden">
      <h3 className="text-lg font-bold text-slate-800 mb-2 relative z-10">Resumen del Hato</h3>
      
      {/* Contenedor relativo para posicionar la imagen en el centro */}
      <div className="h-64 w-full relative">
        
        {/* Imagen Central */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
          <img 
            src="https://i.postimg.cc/9XJwdP5D/Gemini-Generated-Image-de79xde79xde79xd-removebg-preview.png" 
            alt="Logo Central" 
            className={`w-72 h-72 object-contain ${hasData ? 'opacity-80' : 'opacity-100 grayscale-[0.2]'}`}
          />
        </div>

        <ResponsiveContainer width="100%" height="100%" className="relative z-10">
          <PieChart>
            <Pie
              data={hasData ? data : emptyData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {(hasData ? data : emptyData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {hasData && <Tooltip />}
            {hasData && <Legend verticalAlign="bottom" height={36}/>}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-sm text-slate-500 mt-2 relative z-10">
        Total escaneado: <span className="font-bold text-slate-900">{aretes.length}</span>
      </div>
    </div>
  );
};

export default Stats;