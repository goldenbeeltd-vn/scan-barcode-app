"use client";

import { useRef, useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import QrScanner from "qr-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scan, Square, Upload, Camera } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const QRScanner = ({ onScan, onError, className }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");

  const startScanning = async () => {
    if (!elementRef.current || scannerRef.current || scanMode !== "camera")
      return;

    try {
      setError(null);

      const html5QrCode = new Html5Qrcode("qr-scanner");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText) => {
          console.log("QR Code scanned:", decodedText);
          onScan(decodedText);
        },
        () => {
          // This error happens constantly during scanning, so we ignore it
        }
      );

      setIsScanning(true);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start camera";
      setError(errorMsg);
      onError?.(errorMsg);
      console.error("Error starting QR scanner:", err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping QR scanner:", err);
      }
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);

      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file");
      }

      // Use qr-scanner library to scan the uploaded file
      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });

      console.log("QR Code from file:", result.data);
      onScan(result.data);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Could not read QR code from image";
      setError(errorMsg);
      onError?.(errorMsg);
      console.error("Error scanning uploaded file:", err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Stop scanning when switching modes
  useEffect(() => {
    if (scanMode === "upload" && isScanning) {
      stopScanning();
    }
  }, [scanMode, isScanning]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scan className="h-5 w-5" />
            QR Code Scanner
          </h3>

          <div className="flex gap-2">
            {/* Mode Toggle Buttons */}
            <Button
              onClick={() => setScanMode("camera")}
              variant={scanMode === "camera" ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Camera
            </Button>

            <Button
              onClick={() => setScanMode("upload")}
              variant={scanMode === "upload" ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        {/* Camera Mode */}
        {scanMode === "camera" && (
          <div className="flex justify-end">
            <Button
              onClick={isScanning ? stopScanning : startScanning}
              variant={isScanning ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isScanning ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  Start Camera
                </>
              )}
            </Button>
          </div>
        )}

        {/* Upload Mode */}
        {scanMode === "upload" && (
          <div className="flex justify-center">
            <Button
              onClick={handleUploadClick}
              variant="default"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Select QR Code Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Camera Scanner Area */}
        {scanMode === "camera" && (
          <>
            <div className="flex justify-center">
              <div
                id="qr-scanner"
                ref={elementRef}
                className="max-w-full border-2 border-dashed border-gray-300 rounded-lg"
                style={{ minHeight: isScanning ? "auto" : "200px" }}
              />
            </div>

            {!isScanning && !error && (
              <div className="text-center text-gray-500 text-sm">
                Click &ldquo;Start Camera&rdquo; to begin scanning QR codes with
                your camera
              </div>
            )}
          </>
        )}

        {/* Upload Mode Instructions */}
        {scanMode === "upload" && !error && (
          <div className="text-center text-gray-500 text-sm space-y-2">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p>
                Click &ldquo;Select QR Code Image&rdquo; to upload an image
                containing a QR code
              </p>
              <p className="text-xs mt-1">
                Supported formats: PNG, JPG, GIF, WebP
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
