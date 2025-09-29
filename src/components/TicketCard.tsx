"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRGenerator } from "@/components/QRGenerator";
import {
  Calendar,
  DollarSign,
  User,
  Mail,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface TicketCardProps {
  ticket: {
    id: string;
    eventName: string;
    ticketType: string;
    price: number;
    qrCode: string;
    status: "ACTIVE" | "USED" | "CANCELLED" | "INVALID";
    holderName?: string;
    holderEmail?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    usedAt?: Date | string;
    scanLogs?: { scannedAt: string; scannedBy?: string; location?: string }[];
  };
  showDetails?: boolean;
  onViewDetails?: (ticket: TicketCardProps["ticket"]) => void;
  className?: string;
}

export const TicketCard = ({
  ticket,
  showDetails = false,
  onViewDetails,
  className,
}: TicketCardProps) => {
  const [showQR, setShowQR] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "USED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "INVALID":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "USED":
        return <Clock className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "INVALID":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const createdDate = new Date(ticket.createdAt);
  const usedDate = ticket.usedAt ? new Date(ticket.usedAt) : null;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{ticket.eventName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{ticket.ticketType}</Badge>
              <Badge className={getStatusColor(ticket.status)}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1">{ticket.status}</span>
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center text-green-600 font-semibold">
              <DollarSign className="h-4 w-4" />
              {ticket.price.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Created: {format(createdDate, "PPP p")}
          </div>

          {usedDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Used: {format(usedDate, "PPP p")}
            </div>
          )}

          {ticket.holderName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {ticket.holderName}
            </div>
          )}

          {ticket.holderEmail && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {ticket.holderEmail}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {showQR ? "Hide QR" : "Show QR"}
          </Button>

          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(ticket)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Details
            </Button>
          )}
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="mt-4">
            <QRGenerator
              value={ticket.qrCode}
              title={`${ticket.eventName} - ${ticket.ticketType}`}
              size={150}
            />
          </div>
        )}

        {/* Extended Details */}
        {showDetails && (
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div>
                <strong>Ticket ID:</strong>
                <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                  {ticket.id}
                </code>
              </div>

              <div>
                <strong>QR Code:</strong>
                <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                  {ticket.qrCode}
                </code>
              </div>

              {ticket.scanLogs && ticket.scanLogs.length > 0 && (
                <div>
                  <strong>Scan History:</strong>
                  <div className="mt-2 space-y-1">
                    {ticket.scanLogs.map(
                      (
                        log: {
                          scannedAt: string;
                          scannedBy?: string;
                          location?: string;
                        },
                        index
                      ) => (
                        <div
                          key={index}
                          className="text-sm text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          <div>
                            Scanned: {format(new Date(log.scannedAt), "PPP p")}
                          </div>
                          {log.scannedBy && <div>By: {log.scannedBy}</div>}
                          {log.location && <div>Location: {log.location}</div>}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
