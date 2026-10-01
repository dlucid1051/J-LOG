import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FuelRecord } from '../types/fuel';

interface PDFExportOptions {
  records: FuelRecord[];
  carrierName?: string;
  unitNumber?: string;
  reportDate?: string;
  driverName?: string;
  driverSignatureDataUrl?: string | null;
}

export async function generateFuelPurchasePDF({
  records,
  carrierName = '',
  unitNumber = '',
  reportDate = new Date().toISOString().split('T')[0],
  driverName = '',
  driverSignatureDataUrl = null,
}: PDFExportOptions): Promise<void> {
  // Create letter portrait PDF (8.5 x 11 inches = 612 x 792 pt)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch margins

  // 1. Header Metadata Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  const headerY = 40;
  doc.text(`CARRIER: ${carrierName || '____________________'}`, margin, headerY);
  doc.text(`UNIT / TRUCK #: ${unitNumber || '__________'}`, 240, headerY);
  doc.text(`PERIOD / DATE: ${reportDate || '__________'}`, 440, headerY);

  // Divider line under metadata
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.8);
  doc.line(margin, headerY + 8, pageWidth - margin, headerY + 8);

  // 2. Form Title & Subtitle (matching original photo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleText = 'FUEL PURCHASES';
  const titleWidth = doc.getTextWidth(titleText);
  const titleX = (pageWidth - titleWidth) / 2;
  const titleY = headerY + 32;
  doc.text(titleText, titleX, titleY);

  // Underline title
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(titleX - 10, titleY + 4, titleX + titleWidth + 10, titleY + 4);

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const subtitleText = '(Attach Original Receipts)';
  const subWidth = doc.getTextWidth(subtitleText);
  doc.text(subtitleText, (pageWidth - subWidth) / 2, titleY + 18);

  // 3. Table Rows Data
  const tableBody = records.map((r) => [
    r.date,
    r.state || 'IL',
    r.gallons.toFixed(3),
    r.fuelType,
    r.purchasedFrom.toUpperCase(),
    r.invoiceNumber || '—',
    `$${r.amount.toFixed(2)}`,
  ]);

  // If fewer than 8 records, add empty rows to replicate paper sheet
  const minRows = Math.max(8, records.length);
  for (let i = records.length; i < minRows; i++) {
    tableBody.push(['', '', '', '', '', '', '']);
  }

  // Calculate totals
  const totalGallons = records.reduce((sum, r) => sum + r.gallons, 0);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const avgPpg = totalGallons > 0 ? (totalAmount / totalGallons).toFixed(3) : '0.000';

  // 4. Render Table with exact grid styling from the photo
  autoTable(doc, {
    startY: titleY + 28,
    margin: { left: margin, right: margin },
    head: [
      [
        'Date',
        'State',
        'Gallons',
        'Type\nD=Diesel | G=Gas',
        'Purchased From and Location',
        'Invoice Number',
        'Amount',
      ],
    ],
    body: tableBody,
    foot: [
      [
        { content: 'Total:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: totalGallons.toFixed(3), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `$${avgPpg}/gal`, styles: { halign: 'center', fontSize: 7 } },
        {
          content: `Total Purchases (${records.length}):`,
          colSpan: 2,
          styles: { halign: 'right', fontStyle: 'bold' },
        },
        { content: `$${totalAmount.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } },
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      lineColor: [15, 23, 42],
      lineWidth: 1.2,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8.5,
      lineColor: [15, 23, 42],
      lineWidth: 0.8,
      cellPadding: 4.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: [15, 23, 42],
      lineWidth: 1.5,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'center' }, // Date
      1: { cellWidth: 42, halign: 'center', fontStyle: 'bold' }, // State
      2: { cellWidth: 70, halign: 'right' }, // Gallons
      3: { cellWidth: 75, halign: 'center', fontStyle: 'bold' }, // Type
      4: { cellWidth: 'auto', halign: 'left' }, // Station
      5: { cellWidth: 75, halign: 'center' }, // Invoice #
      6: { cellWidth: 68, halign: 'right', fontStyle: 'bold' }, // Amount
    },
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 28;

  // 5. Driver Signature & Date Block (Exact recreation of handwritten form bottom)
  const sigLineWidth = 280;
  const dateLineWidth = 160;
  const dateLineX = pageWidth - margin - dateLineWidth;

  // Driver signature image if provided
  if (driverSignatureDataUrl) {
    try {
      doc.addImage(driverSignatureDataUrl, 'PNG', margin + 10, finalY - 32, 220, 38);
    } catch (e) {
      console.warn('Could not embed signature image into PDF', e);
    }
  }

  // Signature line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(margin, finalY + 8, margin + sigLineWidth, finalY + 8);

  // Date line
  doc.line(dateLineX, finalY + 8, pageWidth - margin, finalY + 8);

  // Labels below lines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Driver's Signature", margin, finalY + 22);

  if (driverName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Printed: ${driverName}`, margin + 110, finalY + 22);
  }

  // Date value centered over date line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const reportDateText = reportDate || new Date().toLocaleDateString();
  const dateValWidth = doc.getTextWidth(reportDateText);
  doc.text(reportDateText, dateLineX + (dateLineWidth - dateValWidth) / 2, finalY + 3);

  // Date label below line
  doc.text('Date', dateLineX + (dateLineWidth - doc.getTextWidth('Date')) / 2, finalY + 22);

  // 6. Attached Original Receipts Pages
  const recordsWithReceipts = records.filter((r) => r.receiptImage);

  if (recordsWithReceipts.length > 0) {
    // Add receipt audit documentation page(s)
    let currentReceiptIndex = 0;

    while (currentReceiptIndex < recordsWithReceipts.length) {
      doc.addPage('letter', 'portrait');

      // Page Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('ATTACHED ORIGINAL RECEIPTS - AUDIT DOCUMENTATION', margin, 45);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Supporting documentation for Fuel Purchases Log (${reportDate || 'Current Period'})`,
        margin,
        60
      );

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(1);
      doc.line(margin, 68, pageWidth - margin, 68);

      // Render up to 2 receipts per page
      const receiptsOnThisPage = recordsWithReceipts.slice(
        currentReceiptIndex,
        currentReceiptIndex + 2
      );

      let receiptY = 82;
      const boxHeight = 315;
      const boxWidth = pageWidth - margin * 2;

      for (const rec of receiptsOnThisPage) {
        // Receipt Box Outline
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, receiptY, boxWidth, boxHeight, 6, 6, 'FD');

        // Receipt Header in box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `Record: ${rec.date} • ${rec.purchasedFrom} • ${rec.state || 'IL'}`,
          margin + 12,
          receiptY + 18
        );

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald
        doc.text(`$${rec.amount.toFixed(2)}`, pageWidth - margin - 60, receiptY + 18);

        // Subheader specs
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Volume: ${rec.gallons.toFixed(3)} Gal (${rec.fuelType === 'D' ? 'Diesel' : 'Gas'})   |   Invoice: #${rec.invoiceNumber || 'N/A'}`,
          margin + 12,
          receiptY + 31
        );

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 10, receiptY + 36, pageWidth - margin - 10, receiptY + 36);

        // Receipt image inside box
        if (rec.receiptImage) {
          try {
            const imgY = receiptY + 42;
            const imgMaxHeight = boxHeight - 50;
            const imgMaxWidth = boxWidth - 24;

            // Embed image with contain aspect ratio
            doc.addImage(
              rec.receiptImage,
              'JPEG',
              margin + 12,
              imgY,
              imgMaxWidth,
              imgMaxHeight,
              undefined,
              'FAST'
            );
          } catch (imgErr) {
            console.warn('Could not embed receipt image:', imgErr);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text('[Receipt photo attached in digital log]', margin + 20, receiptY + 80);
          }
        }

        receiptY += boxHeight + 18;
      }

      currentReceiptIndex += receiptsOnThisPage.length;
    }
  }

  // Save the generated PDF file directly to user's device
  const cleanDate = (reportDate || 'export').replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`fuel-purchases-report-${cleanDate}.pdf`);
}
