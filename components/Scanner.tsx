import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2 } from 'lucide-react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning }) => {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Limpieza al desmontar el componente
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    const startScanner = async () => {
      const elementId = "reader";
      
      // @ts-ignore
      if (!window.Html5Qrcode) {
        setErrorMessage("Librería no cargada");
        return;
      }

      try {
        // Instancia simple y directa
        // @ts-ignore
        const html5QrCode = new window.Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, // Cámara trasera estándar
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            // Éxito
            html5QrCode.pause(true);
            const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
            audio.play().catch(() => {});
            onScanSuccess(decodedText);
          },
          (errorMessage: string) => {
            // Silencio absoluto en errores de frame para evitar saturación
          }
        );
      } catch (err) {
        console.warn(err);
        setErrorMessage("No se pudo acceder a la cámara.");
      }
    };

    // Pequeño delay para asegurar renderizado del div
    const t = setTimeout(startScanner, 300);
    return () => clearTimeout(t);
  }, [isScanning, onScanSuccess]);

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden relative shadow-lg">
      {/* Altura explícita para evitar colapso (el "puntito") */}
      <div id="reader" className="w-full h-80 bg-black"></div>
      
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center z-20">
          <CameraOff size={32} className="text-red-500 mb-2" />
          <p className="font-bold">Error de Cámara</p>
          <p className="text-sm text-slate-400">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default Scanner;