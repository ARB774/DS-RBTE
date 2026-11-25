import { Document, HeadingLevel, Packer, Paragraph, Tab, TabStopType, TextRun } from 'docx';

function reportParagraph(line: string): Paragraph {
 const heading = /^(#{1,3})\s+(.+)$/.exec(line);
 if (heading) {
  return new Paragraph({
   text: heading[2],
   heading: heading[1].length === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
  });
 }

 const bullet = /^[-*•]\s+(.+)$/.exec(line);
 if (bullet) return new Paragraph({ text: bullet[1], bullet: { level: 0 } });

 const numbered = /^(\d+[.)])\s+(.+)$/.exec(line);
 if (numbered) {
  return new Paragraph({
   children: [new TextRun({ children: [numbered[1], new Tab(), numbered[2]] })],
   indent: { left: 480, hanging: 480 },
   tabStops: [{ type: TabStopType.LEFT, position: 480 }],
  });
 }

 return new Paragraph({ text: line });
}

export async function buildAgentWordReport(situationTitle: string, report: string) {
 const document = new Document({
  creator: 'RBTE Pilot',
  title: 'Отчёт агента',
  styles: {
   default: {
    document: {
     run: { font: 'Calibri', size: 22 },
     paragraph: { spacing: { after: 100, line: 276 } },
    },
   },
  },
  sections: [{
   properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
   children: [
    new Paragraph({
     heading: HeadingLevel.TITLE,
     children: [new TextRun({ text: 'Отчёт агента', color: '000000' })],
     keepNext: true,
    }),
    new Paragraph({ children: [new TextRun({ text: situationTitle, italics: true, size: 24 })], keepNext: true }),
    ...report.split(/\r?\n/u).map(line => line.trim()).filter(Boolean).map(reportParagraph),
   ],
  }],
 });
 return Packer.toBuffer(document);
}
