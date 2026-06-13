const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, TableOfContents, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, Header, Footer, PageBreak,
} = require("/usr/local/lib/node_modules_global/lib/node_modules/docx");

// ---------- shared helpers ----------
const FONT = "Arial";
const BLUE = "1F4E79";
const LIGHT = "D5E8F0";
const GREY = "F2F2F2";
const CONTENT_W = 9360;

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })],
  });
}
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function H3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] }); }
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun(text)] });
}
function num(text) {
  return new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 },
    children: Array.isArray(text) ? text : [new TextRun(text)] });
}
function runs(parts) { return new Paragraph({ spacing: { after: 120 }, children: parts }); }
function R(text, opts = {}) { return new TextRun({ text, bold: opts.bold, italics: opts.italics, color: opts.color }); }

function cell(content, opts = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(c =>
    typeof c === "string"
      ? new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: c, bold: opts.bold, color: opts.color, size: opts.size })] })
      : c);
  return new TableCell({
    borders, margins: cellMargins, width: { size: opts.w, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: paras,
  });
}
function table(widths, rows) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: r.map((c, j) =>
          cell(c, { w: widths[j], fill: i === 0 ? BLUE : (i % 2 === 0 ? GREY : undefined), bold: i === 0, color: i === 0 ? "FFFFFF" : undefined })),
      })),
  });
}
function spacer() { return new Paragraph({ spacing: { after: 80 }, children: [] }); }

const baseStyles = {
  default: { document: { run: { font: FONT, size: 22 } } },
  paragraphStyles: [
    { id: "Title", name: "Title", basedOn: "Normal", next: "Normal",
      run: { size: 52, bold: true, font: FONT, color: BLUE },
      paragraph: { spacing: { after: 120 } } },
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 30, bold: true, font: FONT, color: BLUE },
      paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 25, bold: true, font: FONT, color: "2E5496" },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 22, bold: true, font: FONT, color: "404040" },
      paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
  ],
};
const numbering = {
  config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 280 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 280 } } } },
    ] },
    { reference: "numbers", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } },
    ] },
  ],
};
function sectionProps(title) {
  return {
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [ new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
      children: [new TextRun({ text: title, size: 16, color: "808080" })] }) ] }) },
    footers: { default: new Footer({ children: [ new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [ new TextRun({ text: "Revspot · Confidential — Page ", size: 16, color: "808080" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "808080" }) ] }) ] }) },
  };
}
function titleBlock(title, subtitle, meta) {
  const out = [
    new Paragraph({ spacing: { before: 1200, after: 60 }, children: [new TextRun({ text: title, bold: true, size: 52, color: BLUE, font: FONT })] }),
    new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: subtitle, size: 28, color: "595959", font: FONT })] }),
  ];
  out.push(table([2600, 6760], meta));
  out.push(new Paragraph({ children: [new PageBreak()] }));
  out.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "Contents", bold: true, size: 30, color: BLUE })] }));
  out.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }));
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function build(filename, sectionChildren) {
  const doc = new Document({ styles: baseStyles, numbering, features: { updateFields: true }, sections: sectionChildren });
  return Packer.toBuffer(doc).then(b => fs.writeFileSync(filename, b));
}

module.exports = { P, H1, H2, H3, bullet, num, runs, R, table, spacer, sectionProps, titleBlock, build, PageBreak: () => new Paragraph({ children: [new PageBreak()] }) };
