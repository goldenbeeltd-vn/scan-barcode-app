"use client";

import { useState } from "react";
import { TicketForm } from "@/components/TicketForm";
import { QRGenerator } from "@/components/QRGenerator";
import { TicketCard } from "@/components/TicketCard";

type CreatedTicket = Parameters<
  Parameters<typeof TicketForm>[0]["onTicketCreated"]
>[0];

export default function CreateTicketPage() {
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(
    null
  );

  const handleTicketCreated = (ticket: CreatedTicket) => {
    setCreatedTicket(ticket);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo Vé Mới</h1>
          <p className="text-gray-600">
            Tạo vé tham quan với mã QR. Hoạt động offline và tự động đồng bộ.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ticket Form */}
          <div>
            <TicketForm
              onTicketCreated={handleTicketCreated}
              className="w-full"
            />
          </div>

          {/* Created Ticket Display */}
          <div className="space-y-6">
            {createdTicket ? (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    Tạo Vé Thành Công!
                  </h2>
                  <TicketCard
                    ticket={
                      createdTicket as Parameters<
                        typeof TicketCard
                      >[0]["ticket"]
                    }
                    showDetails={true}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Mã QR</h3>
                  <QRGenerator
                    value={createdTicket.qrCode}
                    title={`${createdTicket.eventName} - ${createdTicket.ticketType}`}
                    size={200}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">Chưa có vé nào</p>
                  <p className="text-sm">Điền form để tạo vé</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
