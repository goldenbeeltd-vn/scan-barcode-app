"use client";

import { useCallback } from "react";
import {
  indexedDBOperations,
  PendingTicket,
  PendingScanLog,
  CachedTicket,
} from "@/lib/indexedDB";

export const useIndexedDB = () => {
  // Pending Tickets
  const addPendingTicket = useCallback(
    async (ticket: Omit<PendingTicket, "synced">) => {
      return await indexedDBOperations.addPendingTicket(ticket);
    },
    []
  );

  const getPendingTickets = useCallback(async () => {
    return await indexedDBOperations.getPendingTickets();
  }, []);

  // Pending Scan Logs
  const addPendingScanLog = useCallback(
    async (scanLog: Omit<PendingScanLog, "synced">) => {
      return await indexedDBOperations.addPendingScanLog(scanLog);
    },
    []
  );

  const getPendingScanLogs = useCallback(async () => {
    return await indexedDBOperations.getPendingScanLogs();
  }, []);

  // Cached Tickets
  const cacheTicket = useCallback(
    async (ticket: Omit<CachedTicket, "lastSync">) => {
      return await indexedDBOperations.cacheTicket(ticket);
    },
    []
  );

  const getCachedTicket = useCallback(async (id: string) => {
    return await indexedDBOperations.getCachedTicket(id);
  }, []);

  const getCachedTicketByQR = useCallback(async (qrCode: string) => {
    return await indexedDBOperations.getCachedTicketByQR(qrCode);
  }, []);

  const getAllCachedTickets = useCallback(async () => {
    return await indexedDBOperations.getAllCachedTickets();
  }, []);

  const updateCachedTicketStatus = useCallback(
    async (id: string, status: CachedTicket["status"], usedAt?: Date) => {
      return await indexedDBOperations.updateCachedTicketStatus(
        id,
        status,
        usedAt
      );
    },
    []
  );

  // Bulk operations
  const cacheMultipleTickets = useCallback(
    async (tickets: Omit<CachedTicket, "lastSync">[]) => {
      return await indexedDBOperations.cacheMultipleTickets(tickets);
    },
    []
  );

  // Sync operations
  const getPendingSyncCount = useCallback(async () => {
    return await indexedDBOperations.getPendingSyncCount();
  }, []);

  const clearSyncedData = useCallback(async () => {
    await Promise.all([
      indexedDBOperations.clearSyncedTickets(),
      indexedDBOperations.clearSyncedScanLogs(),
    ]);
  }, []);

  // Cache management
  const clearOldCache = useCallback(async (olderThan: Date) => {
    return await indexedDBOperations.clearOldCache(olderThan);
  }, []);

  const clearAllData = useCallback(async () => {
    return await indexedDBOperations.clearAllData();
  }, []);

  return {
    // Pending tickets
    addPendingTicket,
    getPendingTickets,

    // Pending scan logs
    addPendingScanLog,
    getPendingScanLogs,

    // Cached tickets
    cacheTicket,
    getCachedTicket,
    getCachedTicketByQR,
    getAllCachedTickets,
    updateCachedTicketStatus,

    // Bulk operations
    cacheMultipleTickets,

    // Sync operations
    getPendingSyncCount,
    clearSyncedData,

    // Cache management
    clearOldCache,
    clearAllData,
  };
};
