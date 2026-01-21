import React, { useEffect, useRef, useState } from 'react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // Ref to track if component is mounted to prevent state updates on unmount
  const isMountedRef = useRef(true);
  // Ref to prevent double scanning
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    isProcessingRef.current = false;

    // @ts-ignore
    if (!window.Html5Qrcode) {
      setError("Librería de escáner no cargada.");
      return;
    }

    const elementId = "reader";
    // @ts-ignore
    const html5QrCode = new window.Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false 
    };

    const startScanner = async () => {
      try {
        // @ts-ignore
        const devices = await window.Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
            throw new Error("No se detectaron cámaras.");
        }

        // Prefer back camera
        let cameraId = devices[0].id;
        const backCamera = devices.find((device: any) => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera') ||
            device.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
            cameraId = backCamera.id;
        }

        if (!isMountedRef.current) return;

        await html5QrCode.start(
          cameraId, 
          config, 
          (decodedText: string) => {
              if (isProcessingRef.current) return;
              isProcessingRef.current = true;

              // Play sound
              const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
              audio.play().catch(() => {});
              
              // Pause scanner visually
              try {
                 html5QrCode.pause(true);
              } catch (e) {}

              onScanSuccess(decodedText);
          },
          (errorMessage: string) => {
              // Ignore parse errors
          }
        );
        
        if (isMountedRef.current) {
            setPermissionGranted(true);
            setError("");
        }
        
      } catch (err: any) {
        console.error("Error scanner:", err);
        if (isMountedRef.current) {
            let msg = "Error al iniciar cámara.";
            if (err?.name === "NotAllowedError") msg = "Permiso denegado.";
            if (err?.name === "NotFoundError") msg = "Cámara no encontrada.";
            setError(msg);
        }
      }
    };

    if (isScanning) {
        // Small delay to ensure DOM is ready and previous instance is cleared
        setTimeout(() => {
            startScanner();
        }, 300);
    }

    // Cleanup crucial para evitar pantalla blanca
    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        // Intentar detener si está corriendo
        if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
                .then(() => {
                    scannerRef.current.clear();
                })
                .catch((err: any) => {
                    // Si falla el stop, forzamos clear
                    try { scannerRef.current.clear(); } catch(e) {}
                });
        } else {
             try { scannerRef.current.clear(); } catch(e) {}
        }
      }
    };
  }, [isScanning, onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden relative shadow-2xl">
      <div id="reader" className="w-full h-80 bg-gray-900"></div>
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-6 z-10">
          <div className="text-center">
             <p className="text-red-400 font-bold mb-2">Error de Cámara</p>
             <p className="text-sm text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state visual */}
      {!permissionGranted && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {permissionGranted && !error && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm animate-pulse">
            Escaneando...
          </div>
        </div>
      )}
      
      <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-8 rounded-lg flex items-center justify-center">
         <div className="w-64 h-0.5 bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
      </div>
    </div>
  );
};

export default Scanner;