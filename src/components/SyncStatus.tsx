"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { toast } from "react-hot-toast";

export const SyncStatus = () => {
  const { syncStatus, hasPendingData } = useSyncStatus();
  const isOnline = useOnlineStatus();

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error("Không thể đồng bộ khi ngoại tuyến");
      return;
    }

    try {
      // Trigger manual sync via service worker
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "MANUAL_SYNC",
        });
        toast.success("Đã bắt đầu đồng bộ thủ công");
      } else {
        toast.error("Service worker không khả dụng");
      }
    } catch (error) {
      console.error("Error triggering manual sync:", error);
      toast.error("Không thể bắt đầu đồng bộ");
    }
  };

  if (!hasPendingData) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3" />
        {syncStatus.total} đang chờ
      </Badge>

      {isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          className="h-6 px-2 text-xs"
        >
          Đồng bộ ngay
        </Button>
      )}
    </div>
  );
};
