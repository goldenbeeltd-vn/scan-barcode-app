"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { toast } from "react-hot-toast";
import { Loader2, Ticket } from "lucide-react";

const ticketFormSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  ticketType: z.string().min(1, "Please select a ticket type"),
  price: z.number().min(0, "Price must be non-negative"),
  holderName: z.string().optional(),
  holderEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

interface CreatedTicket {
  id: string;
  qrCode: string;
  eventName: string;
  ticketType: string;
  price: number;
  status: string;
  holderName?: string;
  holderEmail?: string;
  createdAt: Date;
  updatedAt: Date;
  usedAt?: Date;
  scanLogs?: unknown[];
}

interface TicketFormProps {
  onTicketCreated: (ticket: CreatedTicket) => void;
  className?: string;
}

export const TicketForm = ({ onTicketCreated, className }: TicketFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const isOnline = useOnlineStatus();
  const { addPendingTicket, cacheTicket } = useIndexedDB();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      eventName: "",
      ticketType: "",
      price: 0,
      holderName: "",
      holderEmail: "",
    },
  });

  const watchedTicketType = watch("ticketType");

  const onSubmit = async (data: TicketFormData) => {
    setIsLoading(true);

    try {
      const ticketId = uuidv4();
      const qrCode = ticketId;
      const now = new Date();

      const ticketData = {
        id: ticketId,
        qrCode,
        eventName: data.eventName,
        ticketType: data.ticketType,
        price: data.price,
        holderName: data.holderName || undefined,
        holderEmail: data.holderEmail || undefined,
        createdAt: now,
      };

      if (isOnline) {
        // Try to create ticket online
        try {
          const response = await fetch("/api/tickets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(ticketData),
          });

          if (response.ok) {
            const createdTicket = await response.json();

            // Cache the ticket for offline access
            await cacheTicket({
              ...createdTicket,
              status: "ACTIVE" as const,
              updatedAt: now,
            });

            toast.success("Ticket created successfully!");
            onTicketCreated(createdTicket);
            reset();
            return;
          } else {
            throw new Error("Server error");
          }
        } catch (error) {
          console.error("Failed to create ticket online:", error);
          // Fall through to offline creation
        }
      }

      // Create ticket offline
      await addPendingTicket(ticketData);

      const offlineTicket = {
        ...ticketData,
        status: "ACTIVE" as const,
        updatedAt: now,
        usedAt: undefined,
        scanLogs: [],
      };

      // Also cache it for immediate access
      await cacheTicket(offlineTicket);

      toast.success(
        isOnline
          ? "Created offline - will sync when server is available"
          : "Created offline - will sync when online"
      );

      onTicketCreated(offlineTicket);
      reset();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Create New Ticket</h2>
          {!isOnline && (
            <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
              Offline Mode
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              placeholder="Enter event name"
              {...register("eventName")}
            />
            {errors.eventName && (
              <p className="text-sm text-red-600">{errors.eventName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketType">Ticket Type</Label>
            <Select
              value={watchedTicketType}
              onValueChange={(value) => setValue("ticketType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ticket type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Early Bird">Early Bird</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
            {errors.ticketType && (
              <p className="text-sm text-red-600">
                {errors.ticketType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("price", { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-sm text-red-600">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="holderName">Holder Name (Optional)</Label>
            <Input
              id="holderName"
              placeholder="Enter holder name"
              {...register("holderName")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holderEmail">Holder Email (Optional)</Label>
            <Input
              id="holderEmail"
              type="email"
              placeholder="Enter holder email"
              {...register("holderEmail")}
            />
            {errors.holderEmail && (
              <p className="text-sm text-red-600">
                {errors.holderEmail.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Ticket...
              </>
            ) : (
              "Create Ticket"
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};
