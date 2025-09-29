import { indexedDBOperations } from "./indexedDB";
import { toast } from "react-hot-toast";

export interface SyncResult {
  success: boolean;
  ticketsSynced: number;
  scanLogsSynced: number;
  errors: Array<{
    type: string;
    id: string;
    error: string;
  }>;
}

/**
 * Manual sync function that can be called from the UI
 */
export async function performManualSync(): Promise<SyncResult> {
  try {
    const [pendingTickets, pendingScanLogs] = await Promise.all([
      indexedDBOperations.getPendingTickets(),
      indexedDBOperations.getPendingScanLogs(),
    ]);

    if (pendingTickets.length === 0 && pendingScanLogs.length === 0) {
      return {
        success: true,
        ticketsSynced: 0,
        scanLogsSynced: 0,
        errors: [],
      };
    }

    // Convert data for API
    const syncData = {
      tickets: pendingTickets.map((ticket) => ({
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        holderEmail: ticket.holderEmail || "",
      })),
      scanLogs: pendingScanLogs.map((log) => ({
        ...log,
        scannedAt: log.scannedAt.toISOString(),
      })),
    };

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(syncData),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      // Clear synced data from IndexedDB
      if (result.synced.tickets.length > 0) {
        await indexedDBOperations.clearSyncedTickets();
      }
      if (result.synced.scanLogs.length > 0) {
        await indexedDBOperations.clearSyncedScanLogs();
      }

      return {
        success: true,
        ticketsSynced: result.synced.tickets.length,
        scanLogsSynced: result.synced.scanLogs.length,
        errors: result.errors || [],
      };
    } else {
      throw new Error(result.error || "Sync failed");
    }
  } catch (error) {
    console.error("Manual sync error:", error);
    throw error;
  }
}

/**
 * Auto sync function that runs periodically
 */
export async function performAutoSync(): Promise<void> {
  try {
    const result = await performManualSync();

    if (result.ticketsSynced > 0 || result.scanLogsSynced > 0) {
      toast.success(
        `Auto-sync: ${result.ticketsSynced} tickets, ${result.scanLogsSynced} scans synced`
      );
    }

    if (result.errors.length > 0) {
      toast.error(`Auto-sync: ${result.errors.length} items failed`);
    }
  } catch (error) {
    console.error("Auto sync failed:", error);
    // Don't show error toast for auto sync failures to avoid spam
  }
}

/**
 * Initialize auto sync with interval
 */
export function initializeAutoSync(): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let isOnline = navigator.onLine;

  const checkAndSync = async () => {
    if (isOnline) {
      const syncCount = await indexedDBOperations.getPendingSyncCount();
      if (syncCount.total > 0) {
        await performAutoSync();
      }
    }
  };

  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    // Check every 30 seconds when online and has pending data
    intervalId = setInterval(checkAndSync, 30000);
  };

  const stopInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Handle online/offline events
  const handleOnline = () => {
    isOnline = true;
    startInterval();
    // Immediate sync when coming online
    setTimeout(checkAndSync, 1000);
  };

  const handleOffline = () => {
    isOnline = false;
    stopInterval();
  };

  // Set up event listeners
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Start if online
  if (isOnline) {
    startInterval();
  }

  // Return cleanup function
  return () => {
    stopInterval();
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Cache fresh data from server
 */
export async function refreshTicketCache(): Promise<void> {
  try {
    const response = await fetch("/api/tickets?limit=100");
    if (!response.ok) {
      throw new Error("Failed to fetch tickets");
    }

    const tickets = await response.json();

    // Cache the fresh tickets
    if (tickets.length > 0) {
      await indexedDBOperations.cacheMultipleTickets(
        tickets.map((ticket: Record<string, unknown>) => ({
          ...ticket,
          createdAt: new Date(ticket.createdAt as string),
          updatedAt: new Date(ticket.updatedAt as string),
          usedAt: ticket.usedAt ? new Date(ticket.usedAt as string) : undefined,
        }))
      );
    }
  } catch (error) {
    console.error("Failed to refresh ticket cache:", error);
    throw error;
  }
}

/**
 * Clean old cached data
 */
export async function cleanOldCache(): Promise<void> {
  try {
    // Remove cache older than 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    await indexedDBOperations.clearOldCache(oneDayAgo);
  } catch (error) {
    console.error("Failed to clean old cache:", error);
  }
}
