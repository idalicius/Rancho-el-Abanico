import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanning: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, isScanning }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Dynamically access the library from window since it's loaded via CDN in index.html
    // @ts-ignore
    const Html5QrcodeScanner = window.Html5QrcodeScanner;

    if (!isScanning) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
      return;
    }

    if (isScanning && !scannerRef.current && Html5QrcodeScanner) {
      try {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] // All standard barcodes
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText: string) => {
             // Play beep sound
             const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
             audio.play().catch(e => console.log('Audio error', e));
             
             onScanSuccess(decodedText);
             // Optional: Pause scanning briefly to avoid duplicates? 
             // Currently handled by parent or user flow.
          },
          (errorMessage: string) => {
            // Ignore scan errors as they happen every frame no code is detected
          }
        );
        scannerRef.current = scanner;
      } catch (err) {
        console.error("Error starting scanner", err);
        setError("No se pudo iniciar la cámara.");
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isScanning, onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden relative">
      <div id="reader" className="w-full h-64 bg-gray-900"></div>
      {error && <p className="text-red-500 text-center p-2">{error}</p>}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        Apuntar al código de barras
      </div>
    </div>
  );
};

export default Scanner;