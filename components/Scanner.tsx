import React, { useEffect, useRef, useState } from 'react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>('');
  
  const isMountedRef = useRef(true);
  // Add a lock ref to prevent multiple scans in the brief moment before unmounting
  const isProcessingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    isProcessingRef.current = false; // Reset lock on mount

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
        aspectRatio: 1.0 
    };

    const startScanner = async () => {
      try {
        // 1. Get list of cameras to avoid "Requested device not found" errors with generic constraints
        // @ts-ignore
        const devices = await window.Html5Qrcode.getCameras();
        
        if (!devices || devices.length === 0) {
            throw new Error("No se detectaron cámaras en el dispositivo.");
        }

        // 2. Try to find a back camera
        let cameraId = devices[0].id; // Default to first available
        const backCamera = devices.find((device: any) => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera') ||
            device.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
            cameraId = backCamera.id;
        }

        // Check mount status before starting
        if (!isMountedRef.current) return;

        // 3. Start scanning with specific device ID
        await html5QrCode.start(
          cameraId, 
          config, 
          (decodedText: string) => {
              // Critical: check if we already processed a scan
              if (isProcessingRef.current) return;
              isProcessingRef.current = true;

              // Play beep sound
              const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
              audio.play().catch(e => console.log('Audio error', e));
              
              // Pause scanner immediately to prevent further frames
              try {
                if (html5QrCode.isScanning) {
                    html5QrCode.pause(true);
                }
              } catch (e) {
                // Ignore if pause fails
              }

              onScanSuccess(decodedText);
          },
          (errorMessage: string) => {
              // parse error, ignore
          }
        );
        
        if (isMountedRef.current) setError("");
        
      } catch (err: any) {
        console.error("Error starting scanner", err);
        if (isMountedRef.current) {
            let msg = "No se pudo iniciar la cámara.";
            if (err?.name === "NotAllowedError") msg = "Permiso de cámara denegado.";
            if (err?.name === "NotFoundError") msg = "Cámara no encontrada.";
            // Fallback for getting cameras error
            if (String(err).includes("No se detectaron")) msg = "No se detectaron cámaras.";
            
            setError(msg);
        }
      }
    };

    if (isScanning) {
        startScanner();
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (scannerRef.current) {
        // Safe stop logic to prevent "Cannot stop, scanner is not running"
        // We catch the promise rejection.
        scannerRef.current.stop()
            .then(() => {
                 try { scannerRef.current.clear(); } catch(e) {}
            })
            .catch((err: any) => {
                // This usually happens if stop is called while it's still starting or already stopped
                // console.log("Scanner cleanup handled:", err);
                try { scannerRef.current.clear(); } catch(e) {}
            });
      }
    };
  }, [isScanning, onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden relative">
      <div id="reader" className="w-full h-80 bg-gray-900"></div>
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-6 z-10">
          <div className="text-center">
             <p className="text-red-400 font-bold mb-2">Error de Cámara</p>
             <p className="text-sm text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {!error && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            Cámara Activa
          </div>
        </div>
      )}
      
      {/* Overlay guide for user */}
      <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-8 rounded-lg flex items-center justify-center">
         <div className="w-64 h-1 bg-red-500/50"></div>
      </div>
    </div>
  );
};

export default Scanner;