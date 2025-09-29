import Dexie, { Table } from "dexie";

export interface PendingTicket {
  id: string;
  eventName: string;
  ticketType: string;
  price: number;
  qrCode: string;
  holderName?: string;
  holderEmail?: string;
  createdAt: Date;
  synced: number; // 0 = false, 1 = true
}

export interface PendingScanLog {
  id: string;
  ticketId: string;
  scannedAt: Date;
  scannedBy?: string;
  location?: string;
  deviceInfo?: string;
  synced: number; // 0 = false, 1 = true
}

export interface CachedTicket {
  id: string;
  eventName: string;
  ticketType: string;
  price: number;
  qrCode: string;
  status: "ACTIVE" | "USED" | "CANCELLED" | "INVALID";
  holderName?: string;
  holderEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  usedAt?: Date;
  lastSync: Date;
}

export class TicketScannerDB extends Dexie {
  pendingTickets!: Table<PendingTicket>;
  pendingScanLogs!: Table<PendingScanLog>;
  cachedTickets!: Table<CachedTicket>;

  constructor() {
    super("TicketScannerDB");

    this.version(1).stores({
      pendingTickets: "id, eventName, ticketType, qrCode, synced, createdAt",
      pendingScanLogs: "id, ticketId, scannedAt, synced",
      cachedTickets: "id, qrCode, status, eventName, lastSync",
    });
  }
}

// Create a singleton instance
export const db = new TicketScannerDB();

// IndexedDB operations
export const indexedDBOperations = {
  // Pending Tickets
  async addPendingTicket(
    ticket: Omit<PendingTicket, "synced">
  ): Promise<string> {
    const pendingTicket: PendingTicket = {
      ...ticket,
      synced: 0,
    };
    return await db.pendingTickets.add(pendingTicket);
  },

  async getPendingTickets(): Promise<PendingTicket[]> {
    return await db.pendingTickets.where("synced").equals(0).toArray();
  },

  async markTicketAsSynced(id: string): Promise<void> {
    await db.pendingTickets.update(id, { synced: 1 });
  },

  async clearSyncedTickets(): Promise<void> {
    await db.pendingTickets.where("synced").equals(1).delete();
  },

  // Pending Scan Logs
  async addPendingScanLog(
    scanLog: Omit<PendingScanLog, "synced">
  ): Promise<string> {
    const pendingScanLog: PendingScanLog = {
      ...scanLog,
      synced: 0,
    };
    return await db.pendingScanLogs.add(pendingScanLog);
  },

  async getPendingScanLogs(): Promise<PendingScanLog[]> {
    return await db.pendingScanLogs.where("synced").equals(0).toArray();
  },

  async markScanLogAsSynced(id: string): Promise<void> {
    await db.pendingScanLogs.update(id, { synced: 1 });
  },

  async clearSyncedScanLogs(): Promise<void> {
    await db.pendingScanLogs.where("synced").equals(1).delete();
  },

  // Cached Tickets
  async cacheTicket(ticket: Omit<CachedTicket, "lastSync">): Promise<string> {
    const cachedTicket: CachedTicket = {
      ...ticket,
      lastSync: new Date(),
    };
    return await db.cachedTickets.put(cachedTicket);
  },

  async getCachedTicket(id: string): Promise<CachedTicket | undefined> {
    return await db.cachedTickets.get(id);
  },

  async getCachedTicketByQR(qrCode: string): Promise<CachedTicket | undefined> {
    return await db.cachedTickets.where("qrCode").equals(qrCode).first();
  },

  async getAllCachedTickets(): Promise<CachedTicket[]> {
    return await db.cachedTickets.orderBy("createdAt").reverse().toArray();
  },

  async updateCachedTicketStatus(
    id: string,
    status: CachedTicket["status"],
    usedAt?: Date
  ): Promise<void> {
    const updateData: Partial<CachedTicket> = {
      status,
      lastSync: new Date(),
    };
    if (usedAt) {
      updateData.usedAt = usedAt;
    }
    await db.cachedTickets.update(id, updateData);
  },

  async clearOldCache(olderThan: Date): Promise<void> {
    await db.cachedTickets.where("lastSync").below(olderThan).delete();
  },

  // Bulk operations
  async cacheMultipleTickets(
    tickets: Omit<CachedTicket, "lastSync">[]
  ): Promise<void> {
    const cachedTickets = tickets.map((ticket) => ({
      ...ticket,
      lastSync: new Date(),
    }));
    await db.cachedTickets.bulkPut(cachedTickets);
  },

  // Sync status
  async getPendingSyncCount(): Promise<{
    tickets: number;
    scanLogs: number;
    total: number;
  }> {
    const [ticketCount, scanLogCount] = await Promise.all([
      db.pendingTickets.where("synced").equals(0).count(),
      db.pendingScanLogs.where("synced").equals(0).count(),
    ]);

    return {
      tickets: ticketCount,
      scanLogs: scanLogCount,
      total: ticketCount + scanLogCount,
    };
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    await Promise.all([
      db.pendingTickets.clear(),
      db.pendingScanLogs.clear(),
      db.cachedTickets.clear(),
    ]);
  },
};

// Initialize database
export const initializeDB = async (): Promise<void> => {
  try {
    await db.open();
    console.log("IndexedDB initialized successfully");
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
  }
};
