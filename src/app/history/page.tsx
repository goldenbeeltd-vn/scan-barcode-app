"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  History as HistoryIcon,
  Calendar,
  User,
  MapPin,
  Clock,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";

interface ScanLog {
  id: string;
  ticketId: string;
  scannedAt: Date | string;
  scannedBy?: string;
  location?: string;
  deviceInfo?: string;
  ticket?: {
    id: string;
    eventName: string;
    ticketType: string;
    holderName?: string;
    holderEmail?: string;
  };
}

export default function ScanHistoryPage() {
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ScanLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const isOnline = useOnlineStatus();

  const loadScanHistory = async () => {
    if (!isOnline) {
      toast.error("Scan history requires internet connection");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Since we don't have a dedicated scan logs API endpoint,
      // we'll fetch tickets and extract scan logs from them
      const response = await fetch("/api/tickets?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch scan history");
      }

      const tickets = await response.json();
      const allScanLogs: ScanLog[] = [];

      // Extract scan logs from all tickets
      tickets.forEach((ticket: Record<string, unknown>) => {
        const scanLogs = ticket.scanLogs as unknown[];
        if (scanLogs && Array.isArray(scanLogs)) {
          (scanLogs as Record<string, unknown>[]).forEach(
            (log: Record<string, unknown>) => {
              allScanLogs.push({
                id: log.id as string,
                ticketId: log.ticketId as string,
                scannedAt: new Date(log.scannedAt as string),
                scannedBy: log.scannedBy as string,
                location: log.location as string,
                deviceInfo: log.deviceInfo as string,
                ticket: {
                  id: ticket.id as string,
                  eventName: ticket.eventName as string,
                  ticketType: ticket.ticketType as string,
                  holderName: ticket.holderName as string,
                  holderEmail: ticket.holderEmail as string,
                },
              });
            }
          );
        }
      });

      // Sort by scan date (newest first)
      allScanLogs.sort((a, b) => {
        const dateA = new Date(a.scannedAt);
        const dateB = new Date(b.scannedAt);
        return dateB.getTime() - dateA.getTime();
      });

      setScanLogs(allScanLogs);
      toast.success(`Loaded ${allScanLogs.length} scan records`);
    } catch (error) {
      console.error("Error loading scan history:", error);
      toast.error("Failed to load scan history");
      setScanLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      toast.error("Cannot refresh while offline");
      return;
    }
    await loadScanHistory();
  };

  // Filter scan logs based on search
  useEffect(() => {
    let filtered = scanLogs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.ticket?.eventName.toLowerCase().includes(term) ||
          log.ticket?.ticketType.toLowerCase().includes(term) ||
          log.ticket?.holderName?.toLowerCase().includes(term) ||
          log.scannedBy?.toLowerCase().includes(term) ||
          log.location?.toLowerCase().includes(term) ||
          log.ticketId.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [scanLogs, searchTerm]);

  // Load scan history on mount
  useEffect(() => {
    if (isOnline) {
      loadScanHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const getTimeAgo = (date: Date | string) => {
    const scanDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - scanDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Scan History
            </h1>
            <p className="text-gray-600">
              View all ticket scanning activity and check-ins
            </p>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={!isOnline || isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
            <div className="flex items-center space-x-2 text-orange-700">
              <HistoryIcon className="h-5 w-5" />
              <span>Scan history requires an internet connection</span>
            </div>
          </Card>
        )}

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search scan history by event, ticket, holder, or scanner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={!isOnline}
            />
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading scan history...</span>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isOnline && (
          <Card className="p-8">
            <div className="text-center">
              <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Offline Mode
              </h3>
              <p className="text-gray-600">
                Connect to the internet to view scan history
              </p>
            </div>
          </Card>
        )}

        {!isLoading && isOnline && filteredLogs.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {scanLogs.length === 0
                  ? "No scan history"
                  : "No matching scans"}
              </h3>
              <p className="text-gray-600">
                {scanLogs.length === 0
                  ? "Start scanning tickets to see history here"
                  : "Try adjusting your search criteria"}
              </p>
            </div>
          </Card>
        )}

        {/* Scan History List */}
        {!isLoading && filteredLogs.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredLogs.length} of {scanLogs.length} scans
            </div>

            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">
                          {log.ticket?.eventName}
                        </h3>
                        <Badge variant="outline">
                          {log.ticket?.ticketType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(log.scannedAt), "PPP p")}
                          </span>
                        </div>

                        {log.ticket?.holderName && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{log.ticket.holderName}</span>
                          </div>
                        )}

                        {log.scannedBy && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>Scanned by: {log.scannedBy}</span>
                          </div>
                        )}

                        {log.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{log.location}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>Ticket ID: {log.ticketId.slice(0, 8)}...</span>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{getTimeAgo(log.scannedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
