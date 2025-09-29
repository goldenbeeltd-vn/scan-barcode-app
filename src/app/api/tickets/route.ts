import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { TicketStatus, Prisma } from "@prisma/client";

const createTicketSchema = z.object({
  eventName: z.string().min(1, "Event name is required"),
  ticketType: z.string().min(1, "Ticket type is required"),
  price: z.number().min(0, "Price must be non-negative"),
  holderName: z.string().optional(),
  holderEmail: z.string().email().optional().or(z.literal("")),
});

const getTicketsSchema = z.object({
  status: z.enum(["ACTIVE", "USED", "CANCELLED", "INVALID"]).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Generate UUID and QR code
    const id = uuidv4();
    const qrCode = id; // Simple QR code - just use the UUID

    const ticket = await prisma.ticket.create({
      data: {
        id,
        qrCode,
        ...validatedData,
        holderEmail: validatedData.holderEmail || null,
      },
      include: {
        scanLogs: {
          orderBy: { scannedAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams);
    const validatedQuery = getTicketsSchema.parse(query);

    const where: Prisma.TicketWhereInput = {};
    if (validatedQuery.status) {
      where.status = validatedQuery.status as TicketStatus;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        scanLogs: {
          orderBy: { scannedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: validatedQuery.limit || 50,
      skip: validatedQuery.offset || 0,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
