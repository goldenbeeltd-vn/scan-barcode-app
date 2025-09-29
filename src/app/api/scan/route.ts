import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const scanTicketSchema = z.object({
  qrCode: z.string().min(1, "QR code is required"),
  scannedBy: z.string().optional(),
  location: z.string().optional(),
  deviceInfo: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = scanTicketSchema.parse(body);

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Find the ticket by QR code
      const ticket = await tx.ticket.findUnique({
        where: { qrCode: validatedData.qrCode },
      });

      if (!ticket) {
        throw new Error("TICKET_NOT_FOUND");
      }

      if (ticket.status !== "ACTIVE") {
        throw new Error(`TICKET_${ticket.status}`);
      }

      // Update ticket status to USED
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "USED",
          usedAt: new Date(),
        },
      });

      // Create scan log
      const scanLog = await tx.scanLog.create({
        data: {
          id: uuidv4(),
          ticketId: ticket.id,
          scannedBy: validatedData.scannedBy,
          location: validatedData.location,
          deviceInfo: validatedData.deviceInfo,
        },
      });

      return { ticket: updatedTicket, scanLog };
    });

    return NextResponse.json({
      success: true,
      message: "Ticket scanned successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error scanning ticket:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      switch (error.message) {
        case "TICKET_NOT_FOUND":
          return NextResponse.json(
            {
              success: false,
              error: "Ticket not found",
              message: "The QR code does not match any ticket in the system",
            },
            { status: 404 }
          );

        case "TICKET_USED":
          return NextResponse.json(
            {
              success: false,
              error: "Ticket already used",
              message: "This ticket has already been scanned and used",
            },
            { status: 409 }
          );

        case "TICKET_CANCELLED":
          return NextResponse.json(
            {
              success: false,
              error: "Ticket cancelled",
              message: "This ticket has been cancelled and cannot be used",
            },
            { status: 409 }
          );

        case "TICKET_INVALID":
          return NextResponse.json(
            {
              success: false,
              error: "Ticket invalid",
              message: "This ticket is invalid and cannot be used",
            },
            { status: 409 }
          );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
