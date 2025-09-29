"use client";

import { useState, useEffect, useCallback } from "react";
import { indexedDBOperations } from "@/lib/indexedDB";

interface SyncStatus {
  tickets: number;
  scanLogs: number;
  total: number;
}

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    tickets: 0,
    scanLogs: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = await indexedDBOperations.getPendingSyncCount();
      setSyncStatus(status);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refresh();

    // Set up interval to refresh sync status
    const intervalId = setInterval(refresh, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [refresh]);

  // Listen for service worker messages about sync events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "SYNC_SUCCESS" ||
        event.data?.type === "SYNC_ERROR"
      ) {
        // Refresh status after sync attempt
        refresh();
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }
  }, [refresh]);

  return {
    syncStatus,
    isLoading,
    refresh,
    hasPendingData: syncStatus.total > 0,
  };
};
