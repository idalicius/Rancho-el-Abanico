import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Arete, EstadoArete, Tab, Lote } from './types';
import { SupabaseService } from './services/supabaseService';
import { StorageService } from './services/storageService'; // Volvemos al servicio original
import { supabase } from './services/supabaseClient';
import Scanner from './components/Scanner';
import TagItem from './components/TagItem';
import ExportButton from './components/ExportButton';
import Stats from './components/Stats';
import LotItem from './components/LotItem';
import { ScanLine, List, CalendarRange, Search, FolderPlus, Lock, Unlock, AlertTriangle, CheckCircle2, XCircle, Archive, X, FileText, WifiOff, Loader2, CloudUpload, CloudDownload, Folder } from 'lucide-react';

const UNASSIGNED_LOTE_ID = 'unassigned';

// Helper seguro para UUID
const safeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lista');
  const [aretes, setAretes] = useState<Arete[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  
  // Persistencia simple para el ID del lote activo
  const [activeLoteId, setActiveLoteId] = useState<string | null>(() => {
      return localStorage.getItem('ganadoscan_active_lote_id');
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessingScan, setIsProcessingScan] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({ isOpen: false, type: 'alert', title: '', message: '' });

  useEffect(() => {
      if (activeLoteId) localStorage.setItem('ganadoscan_active_lote_id', activeLoteId);
      else localStorage.removeItem('ganadoscan_active_lote_id');
  }, [activeLoteId]);

  const loadData = useCallback(async () => {
      // Carga INMEDIATA de local (rápido y estable)
      const localAretes = await StorageService.obtenerAretes();
      const localLotes = await StorageService.obtenerLotes();
      setAretes(localAretes);
      setLotes(localLotes);
      setIsLoadingData(false);

      // Si hay red, intentar actualizar en segundo plano
      if (navigator.onLine) {
          try {
              const serverAretes = await SupabaseService.obtenerAretes();
              const serverLotes = await SupabaseService.obtenerLotes();
              
              if (serverAretes && serverLotes) {
                  // Mezcla simple: Servidor tiene prioridad
                  setAretes(serverAretes);
                  setLotes(serverLotes);
                  // Opcional: Podrías actualizar localStorage aquí si quisieras cachear lo del server
              }
          } catch (e) {
              console.warn("Error sync server", e);
          }
      }
  }, []);

  useEffect(() => {
    loadData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  // Realtime de Supabase (solo visualización)
  useEffect(() => {
    if (!isOnline) return;
    const channel = supabase.channel('realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          // Recargar datos si algo cambia en la nube
          if (document.visibilityState === 'visible') loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline, loadData]);

  const activeLote = useMemo(() => lotes.find(l => l.id === activeLoteId), [lotes, activeLoteId]);
  const isUnassignedView = activeLoteId === UNASSIGNED_LOTE_ID;

  const aretesDelLote = useMemo(() => {
    if (isUnassignedView) return aretes.filter(a => !a.loteId);
    if (!activeLoteId) return [];
    return aretes.filter(a => a.loteId === activeLoteId);
  }, [aretes, activeLoteId, isUnassignedView]);

  const handleCreateLote = useCallback(() => {
    const consecutivo = lotes.length + 1;
    const fechaHora = new Date().toLocaleString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit'
    }).replace('.', '');
    setCreateName(`Lote ${consecutivo} - ${fechaHora}`);
    setShowCreateModal(true);
  }, [lotes.length]);

  const executeCreateLote = async () => {
    if (!createName.trim()) return;
    
    // Crear localmente
    const nuevoLote = await StorageService.crearLote(createName);
    setLotes(prev => [nuevoLote, ...prev]);
    setActiveLoteId(nuevoLote.id);
    setActiveTab('lista');
    setShowCreateModal(false);

    // Intentar subir
    if (isOnline) {
        try {
            await SupabaseService.crearLote(createName, nuevoLote.id);
            if (activeLote && !activeLote.cerrado) {
                 await SupabaseService.actualizarEstadoLote(activeLote.id, true);
            }
        } catch(e) { console.error(e); }
    }
  };

  const handleToggleLoteStatus = (lote: Lote) => {
    const nuevoEstado = !lote.cerrado;
    // Actualizar local
    StorageService.actualizarEstadoLote(lote.id, nuevoEstado);
    setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, cerrado: nuevoEstado } : l));

    if (isOnline) {
        SupabaseService.actualizarEstadoLote(lote.id, nuevoEstado);
    }
  };

  const handleScan = async (decodedText: string) => {
    if (!activeLoteId) {
      setAlertConfig({ isOpen: true, type: 'alert', title: 'Atención', message: 'Selecciona un lote primero.' });
      return;
    }
    
    // Checar duplicados en memoria
    if (aretesDelLote.some(a => a.codigo === decodedText)) {
         setAlertConfig({ isOpen: true, type: 'alert', title: 'Duplicado', message: 'Este arete ya está en la lista.' });
         return;
    }

    setIsProcessingScan(true);
    
    // Guardar Local
    const loteDestino = activeLoteId === UNASSIGNED_LOTE_ID ? undefined : activeLoteId;
    await StorageService.guardarArete(decodedText, loteDestino);
    
    // Actualizar Estado UI rápido
    const nuevoArete: Arete = {
        id: safeUUID(), 
        codigo: decodedText, 
        fechaEscaneo: new Date().toISOString(), 
        estado: EstadoArete.PENDIENTE, 
        loteId: loteDestino,
        sincronizado: false
    };
    setAretes(prev => [nuevoArete, ...prev]);

    // Guardar Nube
    if (isOnline) {
        SupabaseService.guardarArete(decodedText, loteDestino)
            .then(() => {
                 setAretes(prev => prev.map(a => a.codigo === decodedText ? {...a, sincronizado: true} : a));
            })
            .catch(console.error);
    }

    setTimeout(() => {
        setIsProcessingScan(false);
        setActiveTab('lista');
    }, 500);
  };

  const handleUpdateStatus = async (id: string, status: EstadoArete) => {
    setAretes(prev => prev.map(a => a.id === id ? { ...a, estado: status } : a));
    await StorageService.actualizarEstado(id, status);
    if (isOnline) await SupabaseService.actualizarEstado(id, status);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar registro?")) {
        setAretes(prev => prev.filter(a => a.id !== id));
        await StorageService.eliminarArete(id);
        if (isOnline) await SupabaseService.eliminarArete(id);
    }
  };

  const filteredAretes = useMemo(() => {
      return aretesDelLote.filter(a => a.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [aretesDelLote, searchTerm]);

  // Reporte logic
  const reportePorFecha = useMemo(() => {
    const grupos: Record<string, Arete[]> = {};
    aretes.forEach(arete => {
      const fecha = new Date(arete.fechaEscaneo).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(arete);
    });
    return Object.entries(grupos);
  }, [aretes]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-2xl relative">
      <header className={`text-white p-4 sticky top-0 z-50 shadow-md ${isOnline ? 'bg-emerald-700' : 'bg-slate-700'}`}>
        <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold flex items-center gap-2">
                <ScanLine /> {isOnline ? 'Grupo El Rebozo' : 'Modo Offline'}
            </h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-28 overflow-y-auto">
        {activeTab === 'escanear' && (
          <div className="flex flex-col items-center h-full pt-4">
             {activeLoteId && (!activeLote || !activeLote.cerrado) ? (
                 <>
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Escaneando...</h2>
                    <Scanner onScanSuccess={handleScan} isScanning={activeTab === 'escanear' && !isProcessingScan} />
                    <p className="mt-4 text-slate-500">Apunta al código de barras</p>
                 </>
             ) : (
                 <div className="bg-yellow-100 text-yellow-800 p-6 rounded-xl text-center">
                     <AlertTriangle size={40} className="mx-auto mb-2" />
                     <p className="font-bold">No se puede escanear</p>
                     <p>Selecciona un lote abierto primero.</p>
                     <button onClick={() => setActiveTab('lotes')} className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded">Ir a Lotes</button>
                 </div>
             )}
          </div>
        )}

        {(activeTab === 'lista' || activeTab === 'lotes') && (
            <div className="space-y-4">
                <div className="flex bg-white p-1 rounded-lg shadow border border-slate-200">
                    <button onClick={() => setActiveTab('lista')} className={`flex-1 py-2 font-bold rounded ${activeTab === 'lista' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500'}`}>Lista</button>
                    <button onClick={() => setActiveTab('lotes')} className={`flex-1 py-2 font-bold rounded ${activeTab === 'lotes' ? 'bg-blue-100 text-blue-800' : 'text-slate-500'}`}>Lotes</button>
                </div>

                {activeTab === 'lista' && (
                    <>
                         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                             <h2 className="text-xl font-bold mb-2">{activeLote ? activeLote.nombre : 'Sin Lote'}</h2>
                             <div className="flex gap-2">
                                <input type="text" placeholder="Buscar..." className="flex-1 border p-2 rounded" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                <ExportButton aretes={filteredAretes} />
                             </div>
                         </div>
                         {activeLoteId && <Stats aretes={aretesDelLote} />}
                         <div className="space-y-2">
                             {filteredAretes.map(a => (
                                 <TagItem key={a.id} arete={a} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} />
                             ))}
                         </div>
                    </>
                )}

                {activeTab === 'lotes' && (
                    <div className="space-y-3">
                        <button onClick={handleCreateLote} className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold shadow flex justify-center gap-2">
                            <FolderPlus /> Crear Lote Nuevo
                        </button>
                        {lotes.map(l => (
                            <LotItem key={l.id} lote={l} isActive={l.id === activeLoteId} totalAretes={aretes.filter(a => a.loteId === l.id).length} onActivate={() => { setActiveLoteId(l.id); setActiveTab('lista'); }} />
                        ))}
                    </div>
                )}
            </div>
        )}
        
        {activeTab === 'analisis' && (
            <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="font-bold text-lg mb-4">Reporte por Fechas</h2>
                {reportePorFecha.map(([fecha, items]) => (
                    <div key={fecha} className="border-b py-2 flex justify-between">
                        <span>{fecha}</span>
                        <span className="font-bold">{items.length} aretes</span>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* MODAL CREAR LOTE */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4">Nuevo Lote</h3>
                <input autoFocus type="text" className="w-full border p-2 rounded mb-4" value={createName} onChange={e => setCreateName(e.target.value)} />
                <div className="flex gap-2">
                    <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2 bg-slate-200 rounded">Cancelar</button>
                    <button onClick={executeCreateLote} className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold">Crear</button>
                </div>
            </div>
        </div>
      )}

      {/* ALERTAS */}
      {alertConfig.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center">
                  <h3 className="font-bold text-lg mb-2">{alertConfig.title}</h3>
                  <p className="mb-4 text-slate-600">{alertConfig.message}</p>
                  <button onClick={() => setAlertConfig(prev => ({...prev, isOpen: false}))} className="bg-emerald-600 text-white px-6 py-2 rounded font-bold">OK</button>
              </div>
          </div>
      )}

      <nav className="fixed bottom-0 w-full max-w-2xl bg-white border-t border-slate-200 p-2 flex justify-between items-end z-40">
        <button onClick={() => setActiveTab('lista')} className={`flex-1 flex flex-col items-center p-2 rounded ${activeTab === 'lista' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}><List size={24} /><span className="text-xs">Lista</span></button>
        <div className="relative -top-5">
            <button onClick={() => setActiveTab('escanear')} className="bg-emerald-600 text-white p-4 rounded-full shadow-lg border-4 border-slate-50"><ScanLine size={28} /></button>
        </div>
        <button onClick={() => setActiveTab('analisis')} className={`flex-1 flex flex-col items-center p-2 rounded ${activeTab === 'analisis' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}><CalendarRange size={24} /><span className="text-xs">Reporte</span></button>
      </nav>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;