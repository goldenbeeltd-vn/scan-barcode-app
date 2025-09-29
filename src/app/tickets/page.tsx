"use client";

import { useState, useEffect } from "react";
import { TicketCard } from "@/components/TicketCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { refreshTicketCache } from "@/lib/sync";
import { toast } from "react-hot-toast";
import { Search, RefreshCw, Ticket as TicketIcon, Filter } from "lucide-react";

interface Ticket {
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
  scanLogs?: unknown[];
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const isOnline = useOnlineStatus();
  const { getAllCachedTickets } = useIndexedDB();

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      let loadedTickets: Ticket[] = [];

      if (isOnline) {
        // Try to load from server first
        try {
          const response = await fetch("/api/tickets?limit=100");
          if (response.ok) {
            const serverTickets = await response.json();
            loadedTickets = serverTickets.map(
              (ticket: Record<string, unknown>) => ({
                ...ticket,
                createdAt: new Date(ticket.createdAt as string),
                updatedAt: new Date(ticket.updatedAt as string),
                usedAt: ticket.usedAt
                  ? new Date(ticket.usedAt as string)
                  : undefined,
              })
            );

            // Also refresh the cache
            await refreshTicketCache();
            toast.success(`Loaded ${loadedTickets.length} tickets from server`);
          } else {
            throw new Error("Server request failed");
          }
        } catch (error) {
          console.error("Failed to load from server:", error);
          // Fall back to cache
          loadedTickets = await getAllCachedTickets();
          toast.error("Server unavailable - showing cached tickets");
        }
      } else {
        // Load from cache when offline
        loadedTickets = await getAllCachedTickets();
        if (loadedTickets.length === 0) {
          toast.success("No cached tickets available offline");
        } else {
          toast.success(`Showing ${loadedTickets.length} cached tickets`);
        }
      }

      setTickets(loadedTickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.error("Failed to load tickets");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      toast.error("Cannot refresh while offline");
      return;
    }
    await loadTickets();
  };

  // Filter tickets based on search and status
  useEffect(() => {
    let filtered = tickets;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.eventName.toLowerCase().includes(term) ||
          ticket.ticketType.toLowerCase().includes(term) ||
          ticket.holderName?.toLowerCase().includes(term) ||
          ticket.holderEmail?.toLowerCase().includes(term) ||
          ticket.id.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchTerm, statusFilter]);

  // Load tickets on mount
  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]); // Reload when online status changes

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const getStatusCounts = () => {
    return {
      all: tickets.length,
      ACTIVE: tickets.filter((t) => t.status === "ACTIVE").length,
      USED: tickets.filter((t) => t.status === "USED").length,
      CANCELLED: tickets.filter((t) => t.status === "CANCELLED").length,
      INVALID: tickets.filter((t) => t.status === "INVALID").length,
    };
  };

  const statusCounts = getStatusCounts();

  if (selectedTicket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              ← Back to Tickets
            </Button>
          </div>

          <h1 className="text-2xl font-bold mb-4">Ticket Details</h1>
          <TicketCard
            ticket={
              selectedTicket as Parameters<typeof TicketCard>[0]["ticket"]
            }
            showDetails={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              All Tickets
            </h1>
            <p className="text-gray-600">View and manage all event tickets</p>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={!isOnline || isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets by event, type, holder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="ACTIVE">
                    Active ({statusCounts.ACTIVE})
                  </SelectItem>
                  <SelectItem value="USED">
                    Used ({statusCounts.USED})
                  </SelectItem>
                  <SelectItem value="CANCELLED">
                    Cancelled ({statusCounts.CANCELLED})
                  </SelectItem>
                  <SelectItem value="INVALID">
                    Invalid ({statusCounts.INVALID})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Loading tickets...</span>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && filteredTickets.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {tickets.length === 0
                  ? "No tickets found"
                  : "No matching tickets"}
              </h3>
              <p className="text-gray-600 mb-4">
                {tickets.length === 0
                  ? "Create your first ticket to get started"
                  : "Try adjusting your search or filter criteria"}
              </p>
              {tickets.length === 0 && (
                <Button onClick={() => (window.location.href = "/create")}>
                  Create First Ticket
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Tickets Grid */}
        {!isLoading && filteredTickets.length > 0 && (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredTickets.length} of {tickets.length} tickets
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket as Parameters<typeof TicketCard>[0]["ticket"]}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
