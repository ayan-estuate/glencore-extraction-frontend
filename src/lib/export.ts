import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Document as DocxDocument, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from "docx";
import { StoredDocument, ObligationData } from "../types/api";

// 1. JSON Export
export function exportDocumentToJson(doc: StoredDocument) {
  const jsonString = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  saveAs(blob, `${doc.documentId || "Document"}_Export.json`);
}

export function exportBulkToJson(documents: StoredDocument[]) {
  const jsonString = JSON.stringify(documents, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  saveAs(blob, `Document_Library_Export_${new Date().toISOString().slice(0, 10)}.json`);
}

// 2. Excel Export
export function exportDocumentToExcel(doc: StoredDocument) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Document Info
  const docInfoData = [
    ["Property", "Value"],
    ["Document ID", doc.documentId],
    ["Title", doc.documentTitle],
    ["Entity", doc.entity],
    ["Description", doc.documentDescription],
    ["Extracted At", doc.extractedAt],
    ["Total Obligations", doc.obligations.length],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(docInfoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, "Document Summary");

  // Sheet 2: Obligations
  const obligationsData = doc.obligations.map((ob) => ({
    "ID": ob.obligationId,
    "Title": ob.obligationTitle,
    "Status": ob.obligationStatus,
    "Due Date": ob.dueDate,
    "Section": ob.section,
    "Owner": ob.obligationOwner,
    "Description": ob.obligationDescription,
  }));
  const wsObligations = XLSX.utils.json_to_sheet(obligationsData);
  XLSX.utils.book_append_sheet(wb, wsObligations, "Obligations");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${doc.documentId || "Document"}_Export.xlsx`);
}

export function exportBulkToExcel(documents: StoredDocument[]) {
  const wb = XLSX.utils.book_new();

  // Overview Sheet
  const overviewData = documents.map((d) => ({
    "Doc ID": d.documentId,
    "Title": d.documentTitle,
    "Entity": d.entity,
    "Obligation Count": d.obligations.length,
    "Extracted Date": d.extractedAt,
  }));
  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "All Documents");

  // Consolidated Obligations Sheet
  const allObligations: any[] = [];
  documents.forEach((d) => {
    d.obligations.forEach((ob) => {
      allObligations.push({
        "Doc ID": d.documentId,
        "Entity": d.entity,
        "Obligation ID": ob.obligationId,
        "Title": ob.obligationTitle,
        "Status": ob.obligationStatus,
        "Due Date": ob.dueDate,
        "Section": ob.section,
        "Owner": ob.obligationOwner,
        "Description": ob.obligationDescription,
      });
    });
  });
  const wsAllObligations = XLSX.utils.json_to_sheet(allObligations);
  XLSX.utils.book_append_sheet(wb, wsAllObligations, "All Obligations");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Document_Library_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 3. PDF Export
export function exportDocumentToPdf(doc: StoredDocument) {
  const pdf = new jsPDF("p", "pt", "a4");

  // Header
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.text("Compliance Document Extraction Report", 40, 40);

  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  pdf.text(`Generated on ${new Date().toLocaleDateString()} | Document ID: ${doc.documentId}`, 40, 56);

  // Divider
  pdf.setDrawColor(226, 232, 240);
  pdf.line(40, 68, 555, 68);

  // Document Summary Block
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`Title: ${doc.documentTitle}`, 40, 90);
  pdf.text(`Entity: ${doc.entity}`, 40, 108);

  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  const descLines = pdf.splitTextToSize(`Description: ${doc.documentDescription}`, 515);
  pdf.text(descLines, 40, 126);

  let currentY = 126 + descLines.length * 12 + 16;

  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Extracted Compliance Obligations", 40, currentY);

  currentY += 12;

  // AutoTable
  const tableData = doc.obligations.map((ob) => [
    ob.obligationId,
    ob.obligationTitle,
    ob.obligationStatus,
    ob.section,
    ob.dueDate,
    ob.obligationOwner,
  ]);

  autoTable(pdf, {
    startY: currentY,
    head: [["ID", "Title", "Status", "Section", "Due Date", "Owner"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 150 },
      2: { cellWidth: 60 },
      3: { cellWidth: 50 },
      4: { cellWidth: 65 },
      5: { cellWidth: 120 },
    },
    margin: { left: 40, right: 40 },
  });

  pdf.save(`${doc.documentId || "Document"}_Report.pdf`);
}

// 4. DOCX Export
export async function exportDocumentToDocx(doc: StoredDocument) {
  const docxDoc = new DocxDocument({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Compliance Extraction Summary Report",
                bold: true,
                size: 32,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Document ID: ${doc.documentId} | Entity: ${doc.entity}`,
                italics: true,
                size: 20,
                color: "64748B",
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Title: ", bold: true }),
              new TextRun({ text: doc.documentTitle }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Description: ", bold: true }),
              new TextRun({ text: doc.documentDescription }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Extracted Obligations",
                bold: true,
                size: 24,
                color: "1E293B",
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: ["ID", "Title", "Status", "Section", "Due Date", "Owner"].map(
                  (headerText) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: headerText, bold: true, color: "FFFFFF" })] })],
                      shading: { fill: "1E3A8A" },
                    })
                ),
              }),
              // Data Rows
              ...doc.obligations.map(
                (ob) =>
                  new TableRow({
                    children: [
                      ob.obligationId,
                      ob.obligationTitle,
                      ob.obligationStatus,
                      ob.section,
                      ob.dueDate,
                      ob.obligationOwner,
                    ].map(
                      (val) =>
                        new TableCell({
                          children: [new Paragraph({ children: [new TextRun({ text: val || "", size: 18 })] })],
                          borders: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" },
                          },
                        })
                    ),
                  })
              ),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(docxDoc);
  saveAs(blob, `${doc.documentId || "Document"}_Report.docx`);
}
