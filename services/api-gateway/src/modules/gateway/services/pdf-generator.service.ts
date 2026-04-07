import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface FleetAssignmentPdfData {
  schoolName: string;
  routeName: string;
  vehicleId: string;
  driverId?: string;
  effectiveDate?: string;
  proposedBy: string;
  reviewedBy?: string;
  status: string;
  createdAt: string;
}

export interface RoutePlanPdfData {
  routeName: string;
  direction: string;
  stops: Array<{
    name: string;
    sequence: number;
    arrivalTime: string;
  }>;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generate a PDF document for a fleet assignment record.
   */
  async generateFleetAssignmentPdf(
    data: FleetAssignmentPdfData,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();

    let y = height - 50;

    // Header
    page.drawText('SBTM Fleet Assignment Report', {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 30;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 1,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 30;

    // Details table
    const details: [string, string][] = [
      ['School', data.schoolName],
      ['Route', data.routeName],
      ['Vehicle ID', data.vehicleId],
      ['Driver ID', data.driverId || 'N/A'],
      ['Status', data.status],
      ['Effective Date', data.effectiveDate || 'N/A'],
      ['Proposed By', data.proposedBy],
      ['Reviewed By', data.reviewedBy || 'N/A'],
      ['Created At', data.createdAt],
    ];

    for (const [label, value] of details) {
      page.drawText(`${label}:`, {
        x: 50,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      page.drawText(value, {
        x: 200,
        y,
        size: 11,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 22;
    }

    // Signature lines
    y -= 40;
    page.drawText('Signatures', {
      x: 50,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 30;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 250, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    page.drawText('Proposed By', {
      x: 50,
      y: y - 15,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawLine({
      start: { x: 320, y },
      end: { x: 520, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    page.drawText('Reviewed By', {
      x: 320,
      y: y - 15,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Generate a PDF document for a route plan.
   */
  async generateRoutePlanPdf(data: RoutePlanPdfData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();

    let y = height - 50;

    // Header
    page.drawText('SBTM Route Plan', {
      x: 50,
      y,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 30;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 1,
      color: rgb(0.1, 0.1, 0.4),
    });

    y -= 25;
    page.drawText(`Route: ${data.routeName}`, {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });

    y -= 20;
    page.drawText(`Direction: ${data.direction}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    y -= 30;

    // Table header
    page.drawText('#', { x: 50, y, size: 10, font: boldFont });
    page.drawText('Stop Name', { x: 80, y, size: 10, font: boldFont });
    page.drawText('Arrival Time', { x: 350, y, size: 10, font: boldFont });

    y -= 5;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= 15;

    // Table rows
    for (const stop of data.stops) {
      if (y < 50) break; // Prevent drawing below page

      page.drawText(String(stop.sequence), { x: 50, y, size: 10, font });
      page.drawText(stop.name, { x: 80, y, size: 10, font });
      page.drawText(stop.arrivalTime, { x: 350, y, size: 10, font });
      y -= 18;
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
