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
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;

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

    // Explicitly request environment (back) camera
    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, 
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
                html5QrCode.pause();
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
      } catch (err) {
        console.error("Error starting scanner", err);
        if (isMountedRef.current) {
            setError("No se pudo iniciar la cámara trasera. Asegúrate de dar permisos de cámara y estar usando HTTPS.");
        }
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      if (html5QrCode) {
        // We use a try-catch for stop because sometimes it might not be running fully yet
        html5QrCode.stop().catch((e: any) => {
            console.log("Scanner stop info:", e); 
        }).finally(() => {
            html5QrCode.clear();
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
            Cámara Trasera Activa
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