import React, { useState, useRef, useEffect } from 'react';
import { FuelRecord } from '../types/fuel';
import { generateFuelPurchasePDF } from '../utils/generateFuelPDF';
import {
  X,
  Printer,
  FileSpreadsheet,
  PenTool,
  RotateCcw,
  Check,
  Receipt,
  FileDown,
  Info,
  Loader2,
  Download,
} from 'lucide-react';

interface FuelReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FuelRecord[];
}

export const FuelReportModal: React.FC<FuelReportModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [driverName, setDriverName] = useState(
    () => localStorage.getItem('fuel_driver_name') || ''
  );
  const [reportDate, setReportDate] = useState(
    () => localStorage.getItem('fuel_report_date') || new Date().toISOString().split('T')[0]
  );
  const [carrierName, setCarrierName] = useState(
    () => localStorage.getItem('fuel_carrier_name') || ''
  );
  const [unitNumber, setUnitNumber] = useState(
    () => localStorage.getItem('fuel_unit_number') || ''
  );

  // Digital Signature Pad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // PDF Export states
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  // Load saved signature from localStorage if available
  useEffect(() => {
    if (isOpen) {
      const savedSig = localStorage.getItem('fuel_driver_sig');
      if (savedSig && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          setHasSignature(true);
        };
        img.src = savedSig;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate totals
  const totalGallons = records.reduce((sum, r) => sum + r.gallons, 0);
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const avgPpg = totalGallons > 0 ? (totalAmount / totalGallons).toFixed(3) : '0.000';

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        localStorage.setItem('fuel_driver_sig', dataUrl);
      } catch (err) {
        console.warn('Could not save signature to local storage', err);
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    localStorage.removeItem('fuel_driver_sig');
  };

  // Save meta on change
  const handleDriverChange = (val: string) => {
    setDriverName(val);
    localStorage.setItem('fuel_driver_name', val);
  };
  const handleDateChange = (val: string) => {
    setReportDate(val);
    localStorage.setItem('fuel_report_date', val);
  };
  const handleCarrierChange = (val: string) => {
    setCarrierName(val);
    localStorage.setItem('fuel_carrier_name', val);
  };
  const handleUnitChange = (val: string) => {
    setUnitNumber(val);
    localStorage.setItem('fuel_unit_number', val);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'State',
      'Gallons',
      'Type (D/G)',
      'Purchased From and Location',
      'Invoice Number',
      'Amount ($)',
      'Price Per Gallon ($)',
      'Has Receipt Image',
      'Notes',
    ];

    const rows = records.map((r) => [
      `"${r.date}"`,
      `"${r.state || 'IL'}"`,
      r.gallons.toFixed(3),
      `"${r.fuelType}"`,
      `"${(r.purchasedFrom || '').replace(/"/g, '""')}"`,
      `"${(r.invoiceNumber || '').replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
      r.gallons > 0 ? (r.amount / r.gallons).toFixed(3) : '0.000',
      r.receiptImage ? 'YES' : 'NO',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    // Summary row
    rows.push([
      '"TOTAL"',
      '""',
      totalGallons.toFixed(3),
      '""',
      '""',
      '""',
      totalAmount.toFixed(2),
      avgPpg,
      '""',
      '""',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fuel-purchases-log-${reportDate || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct PDF File Generation & Download
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setPrintNotice(null);
      const signatureDataUrl = localStorage.getItem('fuel_driver_sig');
      await generateFuelPurchasePDF({
        records,
        carrierName,
        unitNumber,
        reportDate,
        driverName,
        driverSignatureDataUrl: signatureDataUrl,
      });
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setPrintNotice('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Browser Print trigger (with iframe fallback)
  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Browser print blocked or unsupported in iframe:', err);
      setPrintNotice('Browser print dialog was blocked in this frame. Downloading direct PDF instead...');
      handleDownloadPDF();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Control Bar (Hidden during print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-400" />
              <span>Fuel Log Report & Audit Sheet</span>
            </h2>
            <p className="text-xs text-slate-400">
              Official form reproduction with signature and receipt attachments.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Download raw records as CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Generate and download PDF file directly"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print via Browser */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer"
              title="Print via browser dialog"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational banner about PDF printing */}
        <div className="print:hidden bg-slate-900/60 border-b border-slate-800 px-5 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
            <span>
              {printNotice ? (
                <strong className="text-amber-400">{printNotice}</strong>
              ) : (
                <span>
                  Click <strong>"Download PDF"</strong> to export an official <strong>.pdf</strong> file containing the form table, driver signature, and all attached receipts.
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Scrollable Document Content */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-950 print:bg-white print:p-0 print:overflow-visible">
          {/* Paper sheet container replicating the uploaded image form */}
          <div
            id="printable-fuel-form"
            className="mx-auto max-w-[850px] bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-4 print:max-w-none font-sans"
          >
            {/* Header info inputs (carrier, truck #) */}
            <div className="mb-4 pb-3 border-b border-slate-300 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Carrier:</span>
                <input
                  type="text"
                  placeholder="Enter carrier / company"
                  value={carrierName}
                  onChange={(e) => handleCarrierChange(e.target.value)}
                  className="border-b border-slate-400 font-semibold px-1 py-0.5 text-xs text-slate-800 focus:outline-none print:border-none print:p-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Unit / Truck #:</span>
                <input
                  type="text"
                  placeholder="Unit #"
                  value={unitNumber}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="border-b border-slate-400 font-semibold px-1 py-0.5 text-xs text-slate-800 w-28 focus:outline-none print:border-none print:p-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Period / Date:</span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="border-b border-slate-400 font-semibold px-1 py-0.5 text-xs text-slate-800 focus:outline-none print:border-none print:p-0"
                />
              </div>
            </div>

            {/* Official Form Title */}
            <div className="text-center mb-5">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900 border-b-2 border-slate-900 inline-block pb-0.5">
                FUEL PURCHASES
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-700 mt-1 tracking-wide">
                (Attach Original Receipts)
              </p>
            </div>

            {/* Form Table - Matching the Image */}
            <div className="overflow-x-auto border-2 border-slate-900 rounded-xs">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold divide-x-2 divide-slate-900 text-center">
                    <th className="py-2.5 px-2 w-[14%] uppercase">Date</th>
                    <th className="py-2.5 px-2 w-[8%] uppercase">State</th>
                    <th className="py-2.5 px-2 w-[14%] uppercase">Gallons</th>
                    <th className="py-2.5 px-2 w-[14%] leading-tight text-[11px] sm:text-xs uppercase">
                      Type<br />
                      <span className="font-normal text-[10px] sm:text-[11px]">D=Diesel | G=Gas</span>
                    </th>
                    <th className="py-2.5 px-2 w-[24%] leading-tight uppercase">
                      Purchased From<br />and Location
                    </th>
                    <th className="py-2.5 px-2 w-[13%] uppercase">Invoice Number</th>
                    <th className="py-2.5 px-2 w-[13%] uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-900">
                  {records.map((r, index) => (
                    <tr
                      key={r.id || index}
                      className="divide-x-2 divide-slate-900 hover:bg-slate-50 transition"
                    >
                      <td className="py-2 px-2.5 font-medium text-slate-900 text-center whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">
                        {r.state || 'IL'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900">
                        {r.gallons.toFixed(3)}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">
                        {r.fuelType}
                      </td>
                      <td className="py-2 px-2.5 font-medium text-slate-900 uppercase">
                        {r.purchasedFrom}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-900">
                        {r.invoiceNumber || '—'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                        ${r.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* If fewer than 8 rows, fill empty rows to look just like a paper log sheet */}
                  {Array.from({ length: Math.max(0, 8 - records.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="divide-x-2 divide-slate-900 h-8">
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  ))}

                  {/* Summary Totals Row */}
                  <tr className="border-t-4 border-slate-900 bg-slate-100/90 font-bold divide-x-2 divide-slate-900">
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-900">
                      Total:
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-black text-slate-900 text-sm">
                      {totalGallons.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-xs text-slate-600">
                      {avgPpg}/gal
                    </td>
                    <td colSpan={2} className="py-2.5 px-2 text-right text-xs uppercase text-slate-700">
                      Total Purchases ({records.length}):
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-black text-slate-900 text-sm">
                      ${totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature & Date Footer - Exact Reproduction of handwritten log bottom */}
            <div className="mt-8 pt-4 flex flex-col sm:flex-row items-end justify-between gap-6">
              {/* Driver's Signature Section */}
              <div className="w-full sm:w-2/3">
                <div className="relative border-b-2 border-slate-900 pb-1">
                  {/* Digital Signature Canvas */}
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={70}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-16 cursor-crosshair bg-transparent touch-none"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic print:hidden">
                      <PenTool className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Sign here with finger, stylus, or mouse
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-800">
                  <span className="font-bold uppercase tracking-wider">
                    Driver's Signature
                  </span>
                  <div className="flex items-center gap-2 print:hidden">
                    <input
                      type="text"
                      placeholder="Printed Driver Name"
                      value={driverName}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      className="border-b border-slate-300 text-xs px-1 text-slate-700 focus:outline-none"
                    />
                    {hasSignature && (
                      <button
                        onClick={clearSignature}
                        type="button"
                        className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                        title="Clear signature"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Section */}
              <div className="w-full sm:w-1/3">
                <div className="border-b-2 border-slate-900 pb-1 text-center font-mono font-bold text-slate-900 h-16 flex items-end justify-center">
                  <span>{reportDate || new Date().toLocaleDateString()}</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-800 font-bold uppercase tracking-wider text-center">
                  Date
                </div>
              </div>
            </div>

            {/* Attached Original Receipts Section */}
            <div className="mt-12 pt-6 border-t-2 border-dashed border-slate-400 page-break-before">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-800" />
                  <span>ATTACHED ORIGINAL RECEIPTS ({records.filter((r) => r.receiptImage).length})</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Required supporting documentation for audit verification
                </span>
              </div>

              {records.some((r) => r.receiptImage) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {records
                    .filter((r) => r.receiptImage)
                    .map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className="border border-slate-300 rounded-lg p-3 bg-slate-50 break-inside-avoid shadow-xs flex flex-col"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2 text-xs font-bold text-slate-800">
                          <span>
                            {r.date} • {r.purchasedFrom}
                          </span>
                          <span className="font-mono text-slate-900">
                            ${r.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-white rounded-sm border border-slate-200 p-2 min-h-48 max-h-72 overflow-hidden">
                          <img
                            src={r.receiptImage}
                            alt={`Receipt for ${r.purchasedFrom} on ${r.date}`}
                            className="max-h-64 object-contain max-w-full"
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 flex justify-between font-mono">
                          <span>Invoice: #{r.invoiceNumber || 'N/A'}</span>
                          <span>{r.gallons.toFixed(3)} Gal ({r.fuelType})</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 text-xs">
                  <Receipt className="w-6 h-6 mx-auto mb-2 text-slate-400 opacity-60" />
                  No digital receipt photos have been attached to these records yet.
                  <p className="mt-1 text-[11px] text-slate-400">
                    Snap or upload receipt images when adding or editing fuel purchases.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="print:hidden px-5 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <span>{records.length} Fuel purchases in this report</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
