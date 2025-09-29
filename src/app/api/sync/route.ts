import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const syncDataSchema = z.object({
  tickets: z.array(
    z.object({
      id: z.string(),
      eventName: z.string(),
      ticketType: z.string(),
      price: z.number(),
      qrCode: z.string(),
      holderName: z.string().optional(),
      holderEmail: z.string().email().optional().or(z.literal("")),
      createdAt: z.string().transform((str) => new Date(str)),
    })
  ),
  scanLogs: z.array(
    z.object({
      id: z.string(),
      ticketId: z.string(),
      scannedAt: z.string().transform((str) => new Date(str)),
      scannedBy: z.string().optional(),
      location: z.string().optional(),
      deviceInfo: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = syncDataSchema.parse(body);

    const syncResult = {
      synced: {
        tickets: [] as string[],
        scanLogs: [] as string[],
      },
      errors: [] as { type: string; id: string; error: string }[],
    };

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Process tickets
      for (const ticketData of validatedData.tickets) {
        try {
          // Check if ticket already exists
          const existingTicket = await tx.ticket.findUnique({
            where: { id: ticketData.id },
          });

          if (!existingTicket) {
            // Create new ticket
            await tx.ticket.create({
              data: {
                ...ticketData,
                holderEmail: ticketData.holderEmail || null,
              },
            });
          }

          syncResult.synced.tickets.push(ticketData.id);
        } catch (error) {
          console.error(`Error syncing ticket ${ticketData.id}:`, error);
          syncResult.errors.push({
            type: "ticket",
            id: ticketData.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Process scan logs
      for (const scanLogData of validatedData.scanLogs) {
        try {
          // Check if scan log already exists
          const existingScanLog = await tx.scanLog.findUnique({
            where: { id: scanLogData.id },
          });

          if (!existingScanLog) {
            // Verify ticket exists
            const ticket = await tx.ticket.findUnique({
              where: { id: scanLogData.ticketId },
            });

            if (ticket) {
              // Create scan log
              await tx.scanLog.create({
                data: scanLogData,
              });

              // Update ticket status to USED if not already
              if (ticket.status === "ACTIVE") {
                await tx.ticket.update({
                  where: { id: scanLogData.ticketId },
                  data: {
                    status: "USED",
                    usedAt: scanLogData.scannedAt,
                  },
                });
              }
            } else {
              throw new Error("Associated ticket not found");
            }
          }

          syncResult.synced.scanLogs.push(scanLogData.id);
        } catch (error) {
          console.error(`Error syncing scan log ${scanLogData.id}:`, error);
          syncResult.errors.push({
            type: "scanLog",
            id: scanLogData.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      ...syncResult,
      summary: {
        ticketsProcessed: validatedData.tickets.length,
        scanLogsProcessed: validatedData.scanLogs.length,
        ticketsSynced: syncResult.synced.tickets.length,
        scanLogsSynced: syncResult.synced.scanLogs.length,
        totalErrors: syncResult.errors.length,
      },
    });
  } catch (error) {
    console.error("Error during sync:", error);

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

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
