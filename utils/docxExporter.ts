import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  BorderStyle, WidthType, ShadingType 
} from 'docx';

// Core layout constants matching your architectural system
const FONT = 'Arial';
const PAGE_W = 9360; // Total printable page content area width in DXA units

const C = {
  primary: '004850',   // Rosewood Signature Deep Teal
  accentBg: 'D6E4F0',  // Muted background fill tint
  gray: '5A5A5A',
};

// Helper utilities for element styling assembly
const tr = (text: string, opts = {}) => new TextRun({ text, font: FONT, size: 20, ...opts });
const bold = (text: string, opts = {}) => tr(text, { bold: true, ...opts });
const bullet = (text: string) => new Paragraph({ children: [tr('· ', { color: C.primary }), tr(text)], indent: { left: 300 } });
const numbered = (text: string) => new Paragraph({ children: [tr('1. ', { color: C.primary }), tr(text)], indent: { left: 300 } });

function createTableCellBar(title: string, subtitle: string) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [PAGE_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: C.primary },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: C.primary },
              left: { style: BorderStyle.SINGLE, size: 4, color: C.primary },
              right: { style: BorderStyle.SINGLE, size: 4, color: C.primary }
            },
            shading: { fill: C.accentBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  bold(`${title}: `, { size: 22, color: C.primary }),
                  tr(subtitle, { size: 22 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Main Orchestration Compiler: Translates raw state text into a styled document binary
 */
export async function exportRunbookToDocx(automationItems: any[], imageTitle: string): Promise<Blob> {
  const childrenElements: any[] = [];

  // Document Title Header Layout Block
  childrenElements.push(
    new Paragraph({
      children: [bold('Rosewood Engine Runbook', { size: 44, color: C.primary })],
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [tr(`Configuration Target: ${imageTitle}  ·  Generated via Gemini 3.1 Flash Lite`, { size: 18, color: C.gray, italics: true })],
      spacing: { after: 300 }
    })
  );
  
  // Programmatically iterate through the clean JSON array to assemble visual grids
  automationItems.forEach((item) => {
    childrenElements.push(
      // 1. Full-width colored stage title bar block
      createTableCellBar(`Automation [${item.automationNumber}]`, item.stageName),
      
      // 2. Programmatic structural data row insertion
      new Paragraph({ children: [bold("Operational Goal: "), tr(item.operationalGoal)], spacing: { before: 200 } }),
      
      // 3. Nested table or bullet block parsing
      new Paragraph({ children: [bold("Impacted Personnel Registry:")], spacing: { before: 100 } }),
      ...item.impactedRoles.map((role: string) => bullet(role)),
      
      new Paragraph({ children: [bold("Click-by-Click Configuration Steps:")], spacing: { before: 100 } }),
      ...item.setupSteps.map((step: string) => numbered(step)),

      new Paragraph({ children: [bold("Governance Notes: "), tr(item.governanceNotes)], spacing: { before: 100, after: 200 } })
    );
  });

  // Instantiates the document engine shell wrap template
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // Classic 8.5" x 11" page layout definitions
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // Standard uniform 1" margins
        }
      },
      children: childrenElements
    }]
  });

  // Compiles structural layout arrays cleanly down into browser memory space array blobs
  return await Packer.toBlob(doc);
}
