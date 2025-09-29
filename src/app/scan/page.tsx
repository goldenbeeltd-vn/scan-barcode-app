"use client";

import { useState } from "react";
import { QRScanner } from "@/components/QRScanner";
import { TicketCard } from "@/components/TicketCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { toast } from "react-hot-toast";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ScanResult {
  success: boolean;
  ticket?: unknown;
  scanLog?: unknown;
  error?: string;
  message?: string;
  isOffline?: boolean;
}

export default function ScanTicketPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");

  const isOnline = useOnlineStatus();
  const { getCachedTicketByQR, addPendingScanLog, updateCachedTicketStatus } =
    useIndexedDB();

  const processTicketScan = async (qrCode: string) => {
    if (isProcessing) return;
    if (lastScannedCode === qrCode) {
      toast.error(
        "This ticket was just scanned. Please scan a different ticket."
      );
      return;
    }

    setIsProcessing(true);
    setLastScannedCode(qrCode);

    try {
      if (isOnline) {
        // Try online scan first
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qrCode,
            scannedBy: "Scanner App",
            location: "Event Entrance",
            deviceInfo: navigator.userAgent,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setScanResult({
            success: true,
            ticket: result.ticket,
            scanLog: result.scanLog,
            message: "Ticket scanned successfully online!",
          });
          toast.success("Ticket validated successfully!");
        } else {
          setScanResult({
            success: false,
            error: result.error,
            message: result.message,
          });
          toast.error(result.message || "Scan failed");
        }
      } else {
        // Offline scan
        await performOfflineScan(qrCode);
      }
    } catch (error) {
      console.error("Scan error:", error);

      if (!isOnline) {
        // If offline and fetch fails, perform offline scan
        await performOfflineScan(qrCode);
      } else {
        setScanResult({
          success: false,
          error: "Network error",
          message: "Failed to validate ticket. Please try again.",
        });
        toast.error("Network error during scan");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const performOfflineScan = async (qrCode: string) => {
    try {
      // Look for ticket in cache
      const cachedTicket = await getCachedTicketByQR(qrCode);

      if (!cachedTicket) {
        setScanResult({
          success: false,
          error: "TICKET_NOT_FOUND",
          message:
            "Ticket not found in offline cache. Connect to internet to validate.",
          isOffline: true,
        });
        toast.error("Ticket not found offline");
        return;
      }

      if (cachedTicket.status !== "ACTIVE") {
        setScanResult({
          success: false,
          error: `TICKET_${cachedTicket.status}`,
          message: `This ticket is ${cachedTicket.status.toLowerCase()} and cannot be used.`,
          ticket: cachedTicket,
          isOffline: true,
        });
        toast.error(`Ticket is ${cachedTicket.status.toLowerCase()}`);
        return;
      }

      // Create offline scan log
      const scanLogId = uuidv4();
      const now = new Date();

      const scanLog = {
        id: scanLogId,
        ticketId: cachedTicket.id,
        scannedAt: now,
        scannedBy: "Scanner App (Offline)",
        location: "Event Entrance",
        deviceInfo: navigator.userAgent,
      };

      // Add to pending scan logs
      await addPendingScanLog(scanLog);

      // Update cached ticket status
      await updateCachedTicketStatus(cachedTicket.id, "USED", now);

      setScanResult({
        success: true,
        ticket: { ...cachedTicket, status: "USED", usedAt: now },
        scanLog,
        message: "Ticket scanned offline successfully! Will sync when online.",
        isOffline: true,
      });

      toast.success("Ticket validated offline - will sync when online");
    } catch (error) {
      console.error("Offline scan error:", error);
      setScanResult({
        success: false,
        error: "OFFLINE_ERROR",
        message: "Failed to process ticket offline. Please try again.",
        isOffline: true,
      });
      toast.error("Offline scan failed");
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setLastScannedCode("");
  };

  const getResultIcon = (result: ScanResult) => {
    if (result.success) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    } else {
      return <XCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getResultColor = (result: ScanResult) => {
    if (result.success) {
      return result.isOffline
        ? "bg-orange-50 border-orange-200"
        : "bg-green-50 border-green-200";
    } else {
      return "bg-red-50 border-red-200";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scan Tickets
          </h1>
          <p className="text-gray-600">
            Scan QR codes to validate and check-in event tickets. Works offline
            with automatic sync.
          </p>

          <div className="mt-4 flex items-center space-x-4">
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Online Mode" : "Offline Mode"}
            </Badge>
            {!isOnline && (
              <div className="flex items-center text-orange-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Limited validation in offline mode
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner */}
          <div>
            <QRScanner
              onScan={processTicketScan}
              onError={(error) => toast.error(`Scanner error: ${error}`)}
              className="w-full"
            />

            {isProcessing && (
              <Card className="p-4 mt-4">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing ticket...</span>
                </div>
              </Card>
            )}
          </div>

          {/* Scan Result */}
          <div>
            {scanResult ? (
              <div className="space-y-4">
                <Card className={`p-6 ${getResultColor(scanResult)}`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getResultIcon(scanResult)}
                    </div>

                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">
                          {scanResult.success
                            ? "Scan Successful"
                            : "Scan Failed"}
                        </h3>
                        {scanResult.isOffline && (
                          <Badge variant="outline" className="text-orange-600">
                            Offline
                          </Badge>
                        )}
                      </div>

                      <p className="text-gray-700 mb-4">{scanResult.message}</p>

                      {scanResult.error && (
                        <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                          Error: {scanResult.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button onClick={resetScan} variant="outline" size="sm">
                      Scan Another Ticket
                    </Button>
                  </div>
                </Card>

                {scanResult.ticket ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Ticket Details
                    </h3>
                    <TicketCard
                      ticket={
                        scanResult.ticket as Parameters<
                          typeof TicketCard
                        >[0]["ticket"]
                      }
                      showDetails={true}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Ready to Scan</h3>
                  <p className="text-sm">
                    Point your camera at a QR code to validate the ticket
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
