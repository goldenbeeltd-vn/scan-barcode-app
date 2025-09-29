"use client";

import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer, QrCode } from "lucide-react";

interface QRGeneratorProps {
  value: string;
  size?: number;
  title?: string;
  className?: string;
}

export const QRGenerator = ({
  value,
  size = 200,
  title = "QR Code",
  className,
}: QRGeneratorProps) => {
  const downloadQR = () => {
    const canvas = document.querySelector("#qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `ticket-qr-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const printQR = () => {
    const canvas = document.querySelector("#qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket QR Code</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center;
                  font-family: Arial, sans-serif;
                }
                .qr-container {
                  text-align: center;
                  page-break-inside: avoid;
                }
                h1 { 
                  margin-bottom: 20px; 
                  color: #333;
                }
                img {
                  border: 2px solid #ddd;
                  border-radius: 8px;
                }
                .ticket-id {
                  margin-top: 10px;
                  font-size: 12px;
                  color: #666;
                  word-break: break-all;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <h1>${title}</h1>
                <img src="${canvas.toDataURL()}" alt="QR Code" />
                <div class="ticket-id">ID: ${value}</div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {title}
          </h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQR}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={printQR}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <QRCodeCanvas
              id="qr-canvas"
              value={value}
              size={size}
              level="M"
              includeMargin={true}
              imageSettings={{
                src: "", // You can add a logo here if needed
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 break-all">Ticket ID: {value}</p>
        </div>
      </div>
    </Card>
  );
};
