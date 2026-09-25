import PDFDocument from "pdfkit";
import type { Response } from "express";

export interface InvoiceLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceData {
  orderNumber: string;
  createdAt: Date;
  /** "Glido Food" or "Glido Grocery" — shown as the line-of-business under the seller name. */
  businessLine: string;
  /** Restaurant name for food orders; omitted for grocery. */
  sellerName?: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  addressLine: string;
  items: InvoiceLineItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee?: number;
  taxAmount: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

const CURRENCY = "Rs.";

/** Streams a simple, print-friendly A4 invoice PDF for a Food or Grocery order
 *  directly to the given response. Kept deliberately plain (no logo/fonts) so
 *  it renders identically without bundling extra font/image assets. */
export function streamInvoicePdf(res: Response, invoice: InvoiceData) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice.orderNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text("Glido", { continued: false });
  doc.fontSize(10).font("Helvetica").fillColor("#666").text(invoice.businessLine);
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(16).font("Helvetica-Bold").text("Invoice");
  doc.fontSize(10).font("Helvetica").fillColor("#333");
  doc.text(`Order #: ${invoice.orderNumber}`);
  doc.text(`Date: ${invoice.createdAt.toLocaleString("en-IN")}`);
  if (invoice.sellerName) doc.text(`Sold by: ${invoice.sellerName}`);
  doc.moveDown();

  doc.font("Helvetica-Bold").text("Billed to");
  doc.font("Helvetica").fillColor("#333");
  doc.text(invoice.customerName);
  if (invoice.customerPhone) doc.text(invoice.customerPhone);
  if (invoice.customerEmail) doc.text(invoice.customerEmail);
  doc.text(invoice.addressLine, { width: 495 });
  doc.moveDown();

  const tableTop = doc.y + 5;
  const col = { name: 50, qty: 300, price: 360, subtotal: 460 };
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
  doc.text("Item", col.name, tableTop);
  doc.text("Qty", col.qty, tableTop);
  doc.text("Price", col.price, tableTop);
  doc.text("Amount", col.subtotal, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor("#ccc").stroke();

  let y = tableTop + 22;
  doc.font("Helvetica").fillColor("#333");
  for (const item of invoice.items) {
    doc.text(item.name, col.name, y, { width: 240 });
    doc.text(String(item.quantity), col.qty, y);
    doc.text(`${CURRENCY} ${item.unitPrice.toFixed(2)}`, col.price, y);
    doc.text(`${CURRENCY} ${item.subtotal.toFixed(2)}`, col.subtotal, y);
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor("#ccc").stroke();
  y += 15;

  const totals: [string, number][] = [
    ["Subtotal", invoice.subtotal],
    ["Delivery fee", invoice.deliveryFee],
    ...(invoice.packagingFee ? ([["Packaging fee", invoice.packagingFee]] as [string, number][]) : []),
    ["Tax", invoice.taxAmount],
    ...(invoice.tipAmount > 0 ? ([["Delivery tip", invoice.tipAmount]] as [string, number][]) : []),
    ...(invoice.discountAmount > 0 ? ([["Discount", -invoice.discountAmount]] as [string, number][]) : []),
  ];

  doc.fontSize(10);
  for (const [label, amount] of totals) {
    doc.text(label, 380, y);
    doc.text(`${amount < 0 ? "-" : ""}${CURRENCY} ${Math.abs(amount).toFixed(2)}`, col.subtotal, y);
    y += 16;
  }

  doc.moveTo(380, y + 2).lineTo(545, y + 2).strokeColor("#000").stroke();
  y += 10;
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Total", 380, y);
  doc.text(`${CURRENCY} ${invoice.totalAmount.toFixed(2)}`, col.subtotal, y);
  y += 25;

  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text(`Payment: ${invoice.paymentMethod} - ${invoice.paymentStatus}`, 50, y);

  doc.moveDown(3);
  doc.fontSize(8).fillColor("#999").text("This is a system-generated invoice from Glido.", 50, doc.y, { width: 495, align: "center" });

  doc.end();
}
