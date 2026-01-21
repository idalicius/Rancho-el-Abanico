import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Arete, EstadoArete, Tab } from './types';
import { SupabaseService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';
import Scanner from './components/Scanner';
import TagItem from './components/TagItem';
import ExportButton from './components/ExportButton';
import Stats from './components/Stats';
import { ScanLine, List, CalendarRange, Search, Trash, Wifi, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lista');
  const [aretes, setAretes] = useState<Arete[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial data and Setup Realtime Subscription
  useEffect(() => {
    const loadData = async (silent = false) => {
      if (!silent) setIsLoadingData(true);
      const data = await SupabaseService.obtenerAretes();
      setAretes(data);
      if (!silent) setIsLoadingData(false);
    };

    loadData();

    const channel = supabase
      .channel('cambios_aretes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aretes' },
        (payload) => {
          console.log('Cambio detectado en tiempo real:', payload);
          loadData(true);
          
          if (document.hidden || activeTab === 'lista') {
             // Sonido opcional
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScan = async (decodedText: string) => {
    // 1. VALIDACIÓN DE DUPLICADOS
    const existe = aretes.find(a => a.codigo === decodedText);

    if (existe) {
      // Alerta al usuario
      alert(`⚠️ DUPLICADO DETECTADO\n\nEl arete ${decodedText} ya fue escaneado el ${new Date(existe.fechaEscaneo).toLocaleDateString('es-MX')}.`);
      
      // Cerrar escáner inmediatamente
      setActiveTab('lista');
      return; // Detener ejecución, no guardar
    }

    // 2. Guardar en Supabase (si no es duplicado)
    await SupabaseService.guardarArete(decodedText);
    
    // 3. Cerrar el escáner
    setActiveTab('lista');
    
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const handleUpdateStatus = async (id: string, status: EstadoArete) => {
    setAretes(prev => prev.map(a => a.id === id ? { ...a, estado: status } : a));
    await SupabaseService.actualizarEstado(id, status);
  };

  const handleDelete = async (id: string) => {
    if(confirm('¿Estás seguro de eliminar este registro de la base de datos?')) {
      setAretes(prev => prev.filter(a => a.id !== id));
      await SupabaseService.eliminarArete(id);
    }
  };

  const handleClearAll = async () => {
    if(confirm('PELIGRO: Esto borrará TODOS los aretes de la base de datos para TODOS los usuarios. ¿Continuar?')) {
      setAretes([]);
      await SupabaseService.limpiarTodo();
    }
  };

  const filteredAretes = aretes.filter(a => 
    a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupación para el reporte por fechas
  const reportePorFecha = useMemo(() => {
    const grupos: Record<string, Arete[]> = {};
    
    aretes.forEach(arete => {
      const fecha = new Date(arete.fechaEscaneo).toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(arete);
    });

    return Object.entries(grupos).sort((a, b) => {
      // Ordenar por fecha descendente (asumiendo que los aretes ya vienen ordenados o usando el primer elemento)
      return new Date(b[1][0].fechaEscaneo).getTime() - new Date(a[1][0].fechaEscaneo).getTime();
    });
  }, [aretes]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-2xl">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-50 shadow-md transition-colors duration-500">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ScanLine className="text-emerald-300" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">GanadoScan <span className="text-xs font-normal opacity-75 block -mt-1">SINIIGA Cloud</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isConnected ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'}`} 
                title={isConnected ? "Conectado a Tiempo Real" : "Desconectado"}
            >
                <Wifi size={12} className={isConnected ? "" : "opacity-50"} />
                <span className="hidden sm:inline">{isConnected ? 'LIVE' : 'OFF'}</span>
            </div>
            {activeTab === 'lista' && (
              <ExportButton aretes={aretes} />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        
        {/* VIEW: SCANNER */}
        {activeTab === 'escanear' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h2 className="text-xl font-semibold text-slate-800">Escáner de Aretes</h2>
            <div className="w-full bg-white p-4 rounded-xl shadow-lg">
               <Scanner onScanSuccess={handleScan} isScanning={activeTab === 'escanear'} />
            </div>
            
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Apunta la cámara al código de barras. 
              <br/>
              <span className="font-semibold text-emerald-600">El sistema cerrará el escáner automáticamente.</span>
            </p>
          </div>
        )}

        {/* VIEW: LIST */}
        {activeTab === 'lista' && (
          <div className="space-y-4">
            
            {/* Loading Indicator (Only initial) */}
            {isLoadingData && (
                <div className="flex justify-center items-center py-8 text-emerald-600 animate-pulse gap-2">
                    <RefreshCw size={20} className="animate-spin" />
                    <span className="font-medium">Sincronizando datos...</span>
                </div>
            )}

            {/* Stats Summary */}
            {!isLoadingData && <Stats aretes={aretes} />}

            {/* Search and Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar arete..." 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {!isLoadingData && filteredAretes.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ScanLine size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No hay aretes registrados en la nube.</p>
                  <p className="text-sm">Ve a la pestaña "Escanear" para comenzar.</p>
                </div>
              ) : (
                filteredAretes.map(arete => (
                  <TagItem 
                    key={arete.id} 
                    arete={arete} 
                    onUpdateStatus={handleUpdateStatus} 
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
            
             {aretes.length > 0 && (
                <div className="mt-8 flex justify-center">
                   <button onClick={handleClearAll} className="text-red-400 text-xs hover:text-red-600 flex items-center gap-1 border border-red-100 px-3 py-2 rounded bg-red-50">
                      <Trash size={12} /> Limpiar Base de Datos (Admin)
                   </button>
                </div>
             )}
          </div>
        )}

        {/* VIEW: REPORT BY DATE */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-6 border-b pb-4 border-slate-100">
                <div className="bg-violet-100 p-2 rounded-lg">
                  <CalendarRange size={24} className="text-violet-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Reporte Histórico</h2>
              </div>

              {reportePorFecha.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay datos para mostrar.</p>
              ) : (
                <div className="space-y-6">
                  {reportePorFecha.map(([fecha, items]) => {
                    const confirmados = items.filter(i => i.estado === EstadoArete.ALTA_CONFIRMADA).length;
                    const pendientes = items.filter(i => i.estado === EstadoArete.PENDIENTE).length;
                    const bajas = items.filter(i => i.estado === EstadoArete.BAJA).length;
                    const noReg = items.filter(i => i.estado === EstadoArete.NO_REGISTRADO).length;

                    return (
                      <div key={fecha} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-200">
                           <h3 className="font-bold text-slate-700 capitalize">{fecha}</h3>
                           <span className="bg-white px-2 py-1 rounded text-xs font-bold text-slate-600 border shadow-sm">
                             {items.length} Total
                           </span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                           <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 size={16} />
                              <span>{confirmados} Altas</span>
                           </div>
                           <div className="flex items-center gap-2 text-slate-500">
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>
                              <span>{pendientes} Pendientes</span>
                           </div>
                           <div className="flex items-center gap-2 text-red-600">
                              <XCircle size={16} />
                              <span>{noReg} No Reg.</span>
                           </div>
                           <div className="flex items-center gap-2 text-yellow-600">
                              <AlertTriangle size={16} />
                              <span>{bajas} Bajas</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {aretes.length > 0 && (
                <div className="flex justify-center">
                    <ExportButton aretes={aretes} />
                </div>
            )}
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-2xl bg-white border-t border-slate-200 p-2 pb-safe flex justify-around shadow-lg z-50">
        <button 
          onClick={() => setActiveTab('lista')}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${activeTab === 'lista' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}
        >
          <List size={24} />
          <span className="text-xs font-medium mt-1">Lista</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('escanear')}
          className="flex flex-col items-center justify-center -mt-8 bg-emerald-600 text-white rounded-full w-16 h-16 shadow-xl border-4 border-slate-50 hover:bg-emerald-700 hover:scale-105 transition-all"
        >
          <ScanLine size={28} />
        </button>

        <button 
          onClick={() => setActiveTab('analisis')}
          className={`flex flex-col items-center p-2 rounded-lg transition-all ${activeTab === 'analisis' ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}
        >
          <CalendarRange size={24} />
          <span className="text-xs font-medium mt-1">Reporte</span>
        </button>
      </nav>
    </div>
  );
};

// Root rendering logic
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;