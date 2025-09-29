const CACHE_NAME = "ticket-scanner-v1";
const OFFLINE_URL = "/offline.html";

// Files to cache
const urlsToCache = [
  "/",
  "/create",
  "/scan",
  "/tickets",
  "/history",
  "/offline.html",
  "/manifest.json",
  // Add your static assets here
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, return a generic error response
            return new Response(
              JSON.stringify({
                error: "Offline - request will be synced when online",
              }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            );
          });
        })
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails, serve offline page
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Background Sync event - handle offline data sync
self.addEventListener("sync", (event) => {
  console.log("Background sync event:", event.tag);

  if (event.tag === "sync-data") {
    event.waitUntil(syncOfflineData());
  }
});

// Function to sync offline data
async function syncOfflineData() {
  try {
    console.log("Starting offline data sync...");

    // Open IndexedDB to get pending data
    const db = await openIndexedDB();
    const pendingTickets = await getPendingTickets(db);
    const pendingScanLogs = await getPendingScanLogs(db);

    if (pendingTickets.length === 0 && pendingScanLogs.length === 0) {
      console.log("No pending data to sync");
      return;
    }

    // Sync data with server
    const syncData = {
      tickets: pendingTickets,
      scanLogs: pendingScanLogs,
    };

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(syncData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Sync successful:", result);

      // Clear synced data from IndexedDB
      await clearSyncedData(db, result.synced);

      // Notify clients about successful sync
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_SUCCESS",
          data: result,
        });
      });
    } else {
      console.error("Sync failed with status:", response.status);
      throw new Error("Sync failed");
    }
  } catch (error) {
    console.error("Error during sync:", error);

    // Notify clients about sync error
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_ERROR",
        error: error.message,
      });
    });
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TicketScannerDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("pendingTickets")) {
        const ticketStore = db.createObjectStore("pendingTickets", {
          keyPath: "id",
        });
        ticketStore.createIndex("synced", "synced");
      }

      if (!db.objectStoreNames.contains("pendingScanLogs")) {
        const scanLogStore = db.createObjectStore("pendingScanLogs", {
          keyPath: "id",
        });
        scanLogStore.createIndex("synced", "synced");
      }

      if (!db.objectStoreNames.contains("cachedTickets")) {
        const cachedStore = db.createObjectStore("cachedTickets", {
          keyPath: "id",
        });
        cachedStore.createIndex("lastSync", "lastSync");
      }
    };
  });
}

function getPendingTickets(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pendingTickets"], "readonly");
    const store = transaction.objectStore("pendingTickets");
    const index = store.index("synced");
    const request = index.getAll(false);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingScanLogs(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["pendingScanLogs"], "readonly");
    const store = transaction.objectStore("pendingScanLogs");
    const index = store.index("synced");
    const request = index.getAll(false);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function clearSyncedData(db, syncedData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      ["pendingTickets", "pendingScanLogs"],
      "readwrite"
    );

    // Clear synced tickets
    const ticketStore = transaction.objectStore("pendingTickets");
    syncedData.tickets.forEach((ticketId) => {
      ticketStore.delete(ticketId);
    });

    // Clear synced scan logs
    const scanLogStore = transaction.objectStore("pendingScanLogs");
    syncedData.scanLogs.forEach((logId) => {
      scanLogStore.delete(logId);
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "MANUAL_SYNC") {
    // Trigger manual sync
    syncOfflineData();
  }
});
