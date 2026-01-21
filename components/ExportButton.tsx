import React from 'react';
import { Arete } from '../types';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  aretes: Arete[];
}

const ExportButton: React.FC<ExportButtonProps> = ({ aretes }) => {
  const handleExport = () => {
    if (aretes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ['ID Interno', 'Código Arete', 'Fecha Escaneo', 'Estado', 'Validado Por'];
    const rows = aretes.map(a => [
      a.id,
      a.codigo,
      new Date(a.fechaEscaneo).toLocaleString('es-MX'),
      a.estado,
      '' // Placeholder for manual signature if printed
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `siniiga_barrido_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg shadow font-medium text-sm"
    >
      <Download size={16} />
      Exportar Excel/CSV
    </button>
  );
};

export default ExportButton;