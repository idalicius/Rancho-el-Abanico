import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Arete, EstadoArete, Tab, Lote } from './types';
import { SupabaseService } from './services/supabaseService'; // Cambiado a Supabase
import { supabase } from './services/supabaseClient'; // Cliente para Realtime
import Scanner from './components/Scanner';
import TagItem from './components/TagItem';
import ExportButton from './components/ExportButton';
import Stats from './components/Stats';
import LotItem from './components/LotItem';
import { ScanLine, List, CalendarRange, Search, FolderPlus, FolderOpen, History, Lock, Unlock, AlertTriangle, CheckCircle2, XCircle, Archive, X, Folder, FileText, Wifi, WifiOff, Loader2 } from 'lucide-react';

const UNASSIGNED_LOTE_ID = 'unassigned';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lista');
  const [aretes, setAretes] = useState<Arete[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [activeLoteId, setActiveLoteId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessingScan, setIsProcessingScan] = useState(false); // Nuevo estado para prevenir crash
  
  // Estado de conexión Realtime
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');

  // --- ESTADOS PARA MODALES ---
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

  // Función para cargar datos (reutilizable)
  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) setIsLoadingData(true);
    try {
      const [aretesData, lotesData] = await Promise.all([
        SupabaseService.obtenerAretes(),
        SupabaseService.obtenerLotes()
      ]);
      
      setAretes(aretesData);
      setLotes(lotesData);
      
      return { aretesData, lotesData };
    } catch (e) {
      console.error("Error fetching data", e);
      return null;
    } finally {
      if (isInitialLoad) setIsLoadingData(false);
    }
  }, []);

  // 1. CARGA INICIAL Y REALTIME
  useEffect(() => {
    // Carga inicial
    fetchData(true).then((data) => {
        if (data && !activeLoteId) {
            const ultimoAbierto = data.lotesData.find(l => !l.cerrado);
            if (ultimoAbierto) {
                setActiveLoteId(ultimoAbierto.id);
            } else {
                const hayAretesSinLote = data.aretesData.some(a => !a.loteId);
                if (hayAretesSinLote) {
                    setActiveLoteId(UNASSIGNED_LOTE_ID);
                }
            }
        }
    });

    // Configuración de Realtime ROBUSTA
    const channel = supabase.channel('global-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aretes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new;
            const newArete: Arete = {
              id: newRow.id,
              codigo: newRow.codigo,
              fechaEscaneo: newRow.fecha_escaneo,
              estado: newRow.estado as EstadoArete,
              loteId: newRow.lote_id,
              notas: newRow.notas
            };
            setAretes(prev => {
                if (prev.some(a => a.id === newArete.id)) return prev;
                return [newArete, ...prev];
            });
            // Vibrar solo si NO soy yo quien está escaneando (para evitar doble vibración)
            if (!document.hidden) {
                if (navigator.vibrate) navigator.vibrate(50);
            }
          } else if (payload.eventType === 'UPDATE') {
             const updatedRow = payload.new;
             setAretes(prev => prev.map(a => a.id === updatedRow.id ? {
                ...a,
                estado: updatedRow.estado as EstadoArete,
                notas: updatedRow.notas,
                loteId: updatedRow.lote_id
             } : a));
          } else if (payload.eventType === 'DELETE') {
             setAretes(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lotes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
             const newRow = payload.new;
             const newLote: Lote = {
                id: newRow.id,
                nombre: newRow.nombre,
                fechaCreacion: newRow.fecha_creacion,
                cerrado: newRow.cerrado
             };
             setLotes(prev => [newLote, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
             const updatedRow = payload.new;
             setLotes(prev => prev.map(l => l.id === updatedRow.id ? {
                ...l,
                cerrado: updatedRow.cerrado,
                nombre: updatedRow.nombre
             } : l));
          } else if (payload.eventType === 'DELETE') {
             setLotes(prev => prev.filter(l => l.id !== payload.old.id));
             // Si el lote borrado era el activo, desasignar
             setActiveLoteId(prevId => prevId === payload.old.id ? null : prevId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            setConnectionStatus('CONNECTED');
            fetchData(false); 
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionStatus('DISCONNECTED');
            setTimeout(() => {
                channel.subscribe();
            }, 5000);
        } else {
            setConnectionStatus('CONNECTING');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };

  }, [fetchData]);

  // --- LÓGICA DE LOTES ---

  const activeLote = lotes.find(l => l.id === activeLoteId);
  const isUnassignedView = activeLoteId === UNASSIGNED_LOTE_ID;

  const aretesDelLote = useMemo(() => {
    if (isUnassignedView) {
        return aretes.filter(a => !a.loteId);
    }
    if (!activeLoteId) return [];
    return aretes.filter(a => a.loteId === activeLoteId);
  }, [aretes, activeLoteId, isUnassignedView]);

  // Handler para ABRIR el modal de creación CON CONSECUTIVO AUTOMÁTICO
  const handleCreateLote = () => {
    const consecutivo = lotes.length + 1;
    const fechaHora = new Date().toLocaleString('es-MX', {
        day: '2-digit', 
        month: 'short',
        hour: '2-digit', 
        minute:'2-digit'
    }).replace('.', ''); // remove dots from abbr months if any

    const defaultName = `Lote ${consecutivo} - ${fechaHora}`;
    setCreateName(defaultName);
    setShowCreateModal(true);
  };

  // Handler para EJECUTAR la creación
  const executeCreateLote = async () => {
    if (!createName.trim()) return;
    
    try {
      if (activeLote && !activeLote.cerrado) {
        await SupabaseService.actualizarEstadoLote(activeLote.id, true);
      }

      const nuevoLote = await SupabaseService.crearLote(createName);
      if (nuevoLote) {
        setActiveLoteId(nuevoLote.id);
        setActiveTab('lista');
      }
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
      setAlertConfig({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        message: 'No se pudo crear el lote. Intenta de nuevo.'
      });
    }
  };

  const handleToggleLoteStatus = (lote: Lote) => {
    const nuevoEstadoCerrado = !lote.cerrado;
    const accion = nuevoEstadoCerrado ? "CERRAR" : "REABRIR";
    
    setAlertConfig({
        isOpen: true,
        type: 'confirm',
        title: `${accion} Lote`,
        message: `¿Estás seguro de ${accion.toLowerCase()} el lote "${lote.nombre}"?`,
        confirmText: accion === "CERRAR" ? "Sí, Cerrar" : "Sí, Reabrir",
        isDestructive: accion === "CERRAR",
        onConfirm: async () => {
           await SupabaseService.actualizarEstadoLote(lote.id, nuevoEstadoCerrado);
           if (!nuevoEstadoCerrado) {
             setActiveLoteId(lote.id);
             setActiveTab('lista');
           }
           setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handleDeleteLote = (loteId: string) => {
    const lote = lotes.find(l => l.id === loteId);
    if (!lote) return;

    setAlertConfig({
        isOpen: true,
        type: 'confirm',
        title: 'Eliminar Lote Completo',
        message: `Estás a punto de eliminar el "${lote.nombre}" y TODOS los aretes que contiene. Esta acción no se puede deshacer.`,
        isDestructive: true,
        confirmText: 'Sí, Eliminar Todo',
        onConfirm: async () => {
            try {
                // Optimista: remover de la lista local
                setLotes(prev => prev.filter(l => l.id !== loteId));
                if (activeLoteId === loteId) setActiveLoteId(null);
                
                await SupabaseService.eliminarLote(loteId);
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            } catch (e) {
                console.error(e);
                setAlertConfig({
                    isOpen: true,
                    type: 'alert',
                    title: 'Error',
                    message: 'Hubo un problema al eliminar el lote. Intenta de nuevo.'
                });
            }
        }
    });
  };

  const handleActivateLote = (loteId: string) => {
    setActiveLoteId(loteId);
    setActiveTab('lista');
  };

  // --- LÓGICA DE ESCANEO ---

  const handleScan = async (decodedText: string) => {
    // 1. Validaciones previas
    if (!activeLoteId) {
      setAlertConfig({
        isOpen: true,
        type: 'alert',
        title: 'Sin Lote Activo',
        message: 'Debes crear o seleccionar un lote antes de escanear.'
      });
      setActiveTab('lotes');
      return;
    }

    if (!isUnassignedView && activeLote?.cerrado) {
       setAlertConfig({
         isOpen: true,
         type: 'alert',
         title: 'Lote Cerrado',
         message: `El lote "${activeLote.nombre}" está cerrado. Reábrelo para continuar.`
       });
       setActiveTab('lotes');
       return;
    }

    const existeEnLote = aretesDelLote.find(a => a.codigo === decodedText);

    if (existeEnLote) {
      setAlertConfig({
         isOpen: true,
         type: 'alert',
         title: '⚠️ Duplicado',
         message: `El arete ${decodedText} ya está en esta lista.`
      });
      return;
    }

    // 2. Iniciar proceso de guardado (Bloqueo UI)
    setIsProcessingScan(true);
    if (navigator.vibrate) navigator.vibrate(200);

    try {
        await SupabaseService.guardarArete(decodedText, activeLoteId === UNASSIGNED_LOTE_ID ? undefined : activeLoteId);
        
        setTimeout(() => {
            setIsProcessingScan(false);
            setActiveTab('lista');
        }, 800); 

    } catch (error) {
        console.error(error);
        setIsProcessingScan(false);
        setAlertConfig({
            isOpen: true,
            type: 'alert',
            title: 'Error de Guardado',
            message: 'No se pudo guardar el arete en la nube. Revisa tu conexión.'
        });
    }
  };

  // --- GESTIÓN DE ARETES ---

  const handleUpdateStatus = async (id: string, status: EstadoArete) => {
    setAretes(prev => prev.map(a => a.id === id ? { ...a, estado: status } : a));
    await SupabaseService.actualizarEstado(id, status);
  };

  const handleDelete = (id: string) => {
    setAlertConfig({
        isOpen: true,
        type: 'confirm',
        title: '¿Eliminar arete?',
        message: 'Esta acción eliminará el registro de la base de datos para todos. ¿Continuar?',
        isDestructive: true,
        confirmText: 'Eliminar',
        onConfirm: async () => {
            setAretes(prev => prev.filter(a => a.id !== id));
            await SupabaseService.eliminarArete(id);
            setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const filteredAretes = aretesDelLote.filter(a => 
    a.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const aretesSinLoteCount = aretes.filter(a => !a.loteId).length;

  // --- REPORTE ---
  const reportePorFecha = useMemo(() => {
    const grupos: Record<string, Arete[]> = {};
    aretes.forEach(arete => {
      const fecha = new Date(arete.fechaEscaneo).toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(arete);
    });
    return Object.entries(grupos).sort((a, b) => {
      if (b[1].length > 0 && a[1].length > 0) {
        return new Date(b[1][0].fechaEscaneo).getTime() - new Date(a[1][0].fechaEscaneo).getTime();
      }
      return 0;
    });
  }, [aretes]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-2xl relative">
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 sticky top-0 z-50 shadow-md transition-colors duration-500">
        <div className="relative flex justify-between items-center min-h-[40px]">
          <div className="flex items-center gap-3 z-10 relative">
            <div className="flex items-center gap-2">
              <ScanLine className="text-emerald-300" />
              <div className="flex flex-col leading-none">
                 <span className="text-sm font-bold text-white">SINIIGA</span>
                 <div className="flex items-center gap-1">
                    {connectionStatus === 'CONNECTED' ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-200 font-medium">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            Sincronizado
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] text-red-200 font-medium">
                             <WifiOff size={10} /> Desconectado
                        </span>
                    )}
                 </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white drop-shadow-md whitespace-nowrap">
              Grupo El Rebozo
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-28 overflow-y-auto bg-slate-50">
        
        {/* VIEW: SCANNER */}
        {activeTab === 'escanear' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <h2 className="text-xl font-semibold text-slate-800">Escáner de Aretes</h2>
            
            {/* Overlay de Procesamiento para prevenir crashes */}
            {isProcessingScan && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-emerald-800">Guardando...</h3>
                    <p className="text-sm text-emerald-600">Sincronizando con la nube</p>
                </div>
            )}

            {!activeLoteId ? (
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl text-center max-w-xs">
                    <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-3" />
                    <h3 className="font-bold text-yellow-800 mb-2">Sin Lote Activo</h3>
                    <p className="text-sm text-yellow-700 mb-4">Debes registrar o seleccionar un lote antes de escanear.</p>
                    <button onClick={() => setActiveTab('lotes')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg w-full font-medium">
                        Ir a Lotes
                    </button>
                </div>
            ) : activeLote?.cerrado ? (
                <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center max-w-xs">
                    <Lock size={48} className="mx-auto text-red-500 mb-3" />
                    <h3 className="font-bold text-red-800 mb-2">Lote Cerrado</h3>
                    <p className="text-sm text-red-700 mb-4">El lote actual está cerrado. Reábrelo para continuar.</p>
                    <button onClick={() => setActiveTab('lotes')} className="bg-red-600 text-white px-4 py-2 rounded-lg w-full font-medium">
                        Gestionar Lotes
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-full bg-white p-4 rounded-xl shadow-lg relative">
                        <div className="absolute -top-3 left-0 right-0 flex justify-center">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                                Guardando en: {isUnassignedView ? 'Sin Lote Asignado' : activeLote?.nombre}
                            </span>
                        </div>
                        {/* Pasamos el estado al scanner para que sepa cuándo detenerse */}
                        <Scanner onScanSuccess={handleScan} isScanning={activeTab === 'escanear' && !isProcessingScan} />
                    </div>
                    <p className="text-sm text-slate-500 text-center max-w-xs">
                        Apunta la cámara al código de barras.
                    </p>
                </>
            )}
          </div>
        )}

        {/* VIEW: LISTA Y LOTES (Unified View) */}
        {(activeTab === 'lista' || activeTab === 'lotes') && (
            <div className="space-y-4">
                
                {/* Unified Toggle / Switcher */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex mb-4">
                    <button 
                        onClick={() => setActiveTab('lista')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all
                            ${activeTab === 'lista' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <FileText size={16} /> Lista Actual
                    </button>
                    <button 
                        onClick={() => setActiveTab('lotes')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all
                            ${activeTab === 'lotes' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Folder size={16} /> Historial Lotes
                    </button>
                </div>

                {/* --- SUB-VIEW: LISTA --- */}
                {activeTab === 'lista' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                            {!activeLoteId ? (
                                <div className="text-center py-4">
                                    <p className="text-slate-500 mb-3">No hay un lote seleccionado.</p>
                                    <button 
                                        onClick={handleCreateLote}
                                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:scale-105 transition-transform"
                                    >
                                        Crear Primer Lote
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                {isUnassignedView ? "Aretes Sin Lote" : (activeLote?.nombre || 'Lote No Encontrado')}
                                                {!isUnassignedView && activeLote?.cerrado && <Lock size={16} className="text-red-500" />}
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                {isUnassignedView 
                                                    ? "Registros antiguos o sin asignar" 
                                                    : (activeLote ? `Creado: ${new Date(activeLote.fechaCreacion).toLocaleString('es-MX')}` : 'Seleccione otro lote')
                                                }
                                            </p>
                                        </div>
                                        
                                        {!isUnassignedView && activeLote && (
                                            <button 
                                                onClick={() => handleToggleLoteStatus(activeLote)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-colors
                                                    ${activeLote.cerrado 
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                                                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                    }`}
                                            >
                                                {activeLote.cerrado ? <Unlock size={14} /> : <Lock size={14} />}
                                                {activeLote.cerrado ? "REABRIR" : "CERRAR"}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                            type="text" 
                                            placeholder="Buscar arete..." 
                                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <ExportButton aretes={filteredAretes} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {activeLoteId && (
                            <>
                                {/* Siempre mostrar Stats (que contiene la imagen del toro) */}
                                <Stats aretes={aretesDelLote} />

                                <div className="space-y-3">
                                {!isLoadingData && filteredAretes.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <div className="inline-block p-3 bg-slate-100 rounded-full mb-2">
                                            <List size={24} className="opacity-40" />
                                        </div>
                                        <p className="text-sm">Lista vacía. Usa el botón central para escanear.</p>
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
                            </>
                        )}
                    </div>
                )}

                {/* --- SUB-VIEW: LOTES (HISTORIAL) --- */}
                {activeTab === 'lotes' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <button 
                            onClick={handleCreateLote}
                            className="w-full bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all group"
                        >
                            <FolderPlus className="group-hover:scale-110 transition-transform" />
                            Crear Nuevo Lote
                        </button>

                        {aretesSinLoteCount > 0 && (
                            <div 
                            onClick={() => handleActivateLote(UNASSIGNED_LOTE_ID)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group
                                ${activeLoteId === UNASSIGNED_LOTE_ID 
                                ? 'bg-amber-50 border-amber-500 shadow-md' 
                                : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-sm'
                                }
                            `}
                            >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${activeLoteId === UNASSIGNED_LOTE_ID ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                <Archive size={20} />
                                </div>
                                <div>
                                <h4 className={`font-bold ${activeLoteId === UNASSIGNED_LOTE_ID ? 'text-amber-900' : 'text-slate-700'}`}>
                                    Sin Lote / Antiguos
                                </h4>
                                <div className="mt-1">
                                    <span className="text-xs font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                    {aretesSinLoteCount} registros
                                    </span>
                                    {activeLoteId === UNASSIGNED_LOTE_ID && <span className="ml-2 text-xs font-bold text-amber-600">● VIENDO</span>}
                                </div>
                                </div>
                            </div>
                            </div>
                        )}

                        {lotes.length === 0 && aretesSinLoteCount === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400">No hay historial de lotes.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lotes.map(lote => (
                                    <LotItem 
                                        key={lote.id} 
                                        lote={lote} 
                                        isActive={activeLoteId === lote.id}
                                        totalAretes={aretes.filter(a => a.loteId === lote.id).length}
                                        onActivate={() => handleActivateLote(lote.id)}
                                        onDelete={handleDeleteLote}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* VIEW: REPORT */}
        {activeTab === 'analisis' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-6 border-b pb-4 border-slate-100">
                <div className="bg-violet-100 p-2 rounded-lg">
                  <CalendarRange size={24} className="text-violet-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Reporte Global</h2>
                    <p className="text-xs text-slate-500">Histórico de todos los lotes</p>
                </div>
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
          </div>
        )}
      </main>

      {/* --- MODALES PERSONALIZADOS --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FolderPlus size={20} /> Nuevo Lote
                    </h3>
                    <button onClick={() => setShowCreateModal(false)} className="hover:bg-emerald-700 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Lote</label>
                        <input 
                            type="text" 
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                            placeholder="Ej. Lote 12 Octubre"
                            autoFocus
                        />
                    </div>

                    {activeLote && !activeLote.cerrado && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                            <div className="text-xs text-amber-800">
                                <span className="font-bold">Nota:</span> El lote actual <strong>"{activeLote.nombre}"</strong> se cerrará automáticamente.
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeCreateLote}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg shadow-emerald-200 transition-all"
                        >
                            Crear Lote
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className={`p-4 flex items-center gap-3 border-b ${alertConfig.isDestructive ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                    {alertConfig.isDestructive || alertConfig.type === 'alert' ? (
                         <AlertTriangle className={alertConfig.isDestructive ? "text-red-500" : "text-amber-500"} size={24} />
                    ) : (
                         <CheckCircle2 className="text-emerald-500" size={24} />
                    )}
                    <h3 className={`font-bold text-lg ${alertConfig.isDestructive ? 'text-red-800' : 'text-slate-800'}`}>
                        {alertConfig.title}
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        {alertConfig.message}
                    </p>
                    <div className="flex gap-3 justify-end">
                        {alertConfig.type === 'confirm' && (
                            <button 
                                onClick={() => setAlertConfig(prev => ({...prev, isOpen: false}))}
                                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (alertConfig.onConfirm) alertConfig.onConfirm();
                                else setAlertConfig(prev => ({...prev, isOpen: false}));
                            }}
                            className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition-all
                                ${alertConfig.isDestructive 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                }`}
                        >
                            {alertConfig.confirmText || "Aceptar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Bottom Navigation Refactored */}
      <nav className="fixed bottom-0 w-full max-w-2xl bg-white border-t border-slate-200 p-2 pb-safe flex justify-between items-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        
        {/* BOTÓN IZQUIERDO: Registros (Lista + Lotes) */}
        <button 
          onClick={() => setActiveTab('lista')}
          className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all 
            ${(activeTab === 'lista' || activeTab === 'lotes') ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <List size={26} strokeWidth={activeTab === 'lista' || activeTab === 'lotes' ? 2.5 : 2} />
          <span className="text-[11px] font-medium mt-1">Registros</span>
        </button>
        
        {/* BOTÓN CENTRAL: Escanear (Flotante) */}
        <div className="relative -top-6 px-2">
            <button 
            onClick={() => setActiveTab('escanear')}
            className={`flex flex-col items-center justify-center bg-emerald-600 text-white rounded-full w-16 h-16 shadow-xl border-4 border-slate-50 hover:bg-emerald-700 hover:scale-105 transition-all
                ${activeTab === 'escanear' ? 'ring-4 ring-emerald-200' : ''}`}
            >
            <ScanLine size={30} />
            </button>
        </div>

        {/* BOTÓN DERECHO: Reportes */}
        <button 
          onClick={() => setActiveTab('analisis')}
          className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all 
            ${activeTab === 'analisis' ? 'text-violet-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <CalendarRange size={26} strokeWidth={activeTab === 'analisis' ? 2.5 : 2} />
          <span className="text-[11px] font-medium mt-1">Reporte</span>
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