import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Arete, EstadoArete, Tab } from './types';
import { SupabaseService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';
import { GeminiService } from './services/geminiService';
import Scanner from './components/Scanner';
import TagItem from './components/TagItem';
import ExportButton from './components/ExportButton';
import Stats from './components/Stats';
import { ScanLine, List, BarChart3, Bot, Search, Trash, Wifi, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lista');
  const [aretes, setAretes] = useState<Arete[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial data and Setup Realtime Subscription
  useEffect(() => {
    // Función para cargar datos. 
    // 'silent' es true cuando es una actualización automática de fondo para no mostrar el spinner grande.
    const loadData = async (silent = false) => {
      if (!silent) setIsLoadingData(true);
      
      const data = await SupabaseService.obtenerAretes();
      setAretes(data);
      
      if (!silent) setIsLoadingData(false);
    };

    // Carga inicial
    loadData();

    // Configuración de Realtime (Suscripción a cambios)
    const channel = supabase
      .channel('cambios_aretes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aretes' },
        (payload) => {
          console.log('Cambio detectado en tiempo real:', payload);
          // Recargamos silenciosamente para que aparezca mágicamente en la pantalla
          loadData(true);
          
          // Efecto de sonido sutil opcional para la laptop (Dashboard)
          // Solo si no estamos escaneando activamente (para no duplicar sonido en el móvil)
          if (document.hidden || activeTab === 'lista') {
             // Un sonido muy suave o nada. Dejaremos que la UI hable.
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Dependencias vacías para correr solo al montar

  const handleScan = async (decodedText: string) => {
    // 1. Guardar en Supabase (Async)
    await SupabaseService.guardarArete(decodedText);
    
    // 2. Cerrar el escáner inmediatamente
    setActiveTab('lista');
    
    // Opcional: Vibración del celular para confirmar
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const handleUpdateStatus = async (id: string, status: EstadoArete) => {
    // Optimista: Actualizamos la UI inmediatamente antes de que el servidor responda
    setAretes(prev => prev.map(a => a.id === id ? { ...a, estado: status } : a));
    
    // Enviamos a Supabase
    await SupabaseService.actualizarEstado(id, status);
  };

  const handleDelete = async (id: string) => {
    if(confirm('¿Estás seguro de eliminar este registro de la base de datos?')) {
      // Optimista
      setAretes(prev => prev.filter(a => a.id !== id));
      await SupabaseService.eliminarArete(id);
    }
  };

  const handleClearAll = async () => {
    if(confirm('PELIGRO: Esto borrará TODOS los aretes de la base de datos para TODOS los usuarios. ¿Continuar?')) {
      // Optimista
      setAretes([]);
      await SupabaseService.limpiarTodo();
    }
  };

  const generateAiAnalysis = async () => {
    setLoadingAi(true);
    const report = await GeminiService.analizarLote(aretes);
    setAiReport(report);
    setLoadingAi(false);
  };

  const filteredAretes = aretes.filter(a => 
    a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <span className="font-semibold text-emerald-600">Se guardará en la nube automáticamente.</span>
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

        {/* VIEW: ANALYSIS (GEMINI) */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Bot size={32} className="text-indigo-200" />
                <h2 className="text-2xl font-bold">Asistente IA</h2>
              </div>
              <p className="text-indigo-100 mb-6">
                Analiza los datos sincronizados en la nube para detectar inconsistencias o preparar tu reporte SINIIGA.
              </p>
              <button 
                onClick={generateAiAnalysis}
                disabled={loadingAi}
                className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl shadow hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                {loadingAi ? 'Analizando...' : 'Generar Reporte Inteligente'}
              </button>
            </div>

            {aiReport && (
              <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 prose prose-slate max-w-none">
                <h3 className="text-lg font-bold text-slate-800 mb-2 border-b pb-2">Reporte Generado</h3>
                <div className="whitespace-pre-line text-slate-600">
                  {aiReport}
                </div>
              </div>
            )}
            
            {!aiReport && !loadingAi && (
               <div className="text-center text-slate-400 mt-10">
                  <p>Presiona el botón para analizar tus datos.</p>
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
          <BarChart3 size={24} />
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