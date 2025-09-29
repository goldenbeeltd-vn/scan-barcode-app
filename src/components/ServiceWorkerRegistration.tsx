"use client";

import { useEffect } from "react";
import { toast } from "react-hot-toast";

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  toast.success(
                    "App updated! Refresh to use the latest version."
                  );
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, data, error } = event.data;

        switch (type) {
          case "SYNC_SUCCESS":
            if (data?.summary) {
              const { ticketsSynced, scanLogsSynced, totalErrors } =
                data.summary;
              if (ticketsSynced > 0 || scanLogsSynced > 0) {
                toast.success(
                  `Sync completed! ${ticketsSynced} tickets, ${scanLogsSynced} scans synced.`
                );
              }
              if (totalErrors > 0) {
                toast.error(`${totalErrors} items failed to sync.`);
              }
            }
            break;

          case "SYNC_ERROR":
            toast.error(`Sync failed: ${error || "Unknown error"}`);
            break;

          default:
            break;
        }
      });

      // Listen for online/offline events to trigger sync
      const handleOnline = () => {
        console.log("Browser came online, checking for pending sync data...");
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "MANUAL_SYNC",
          });
        }
      };

      window.addEventListener("online", handleOnline);

      return () => {
        window.removeEventListener("online", handleOnline);
      };
    }
  }, []);

  return null; // This component doesn't render anything
};
