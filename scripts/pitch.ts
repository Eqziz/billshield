import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile, writeFile } from "node:fs/promises";
const source = await readFile("docs/PITCH.md", "utf8");
const slides = source.split(/\n## /).slice(1);
const doc = await PDFDocument.create();
doc.setTitle("BillShield - Hackathon pitch");
doc.setAuthor("BillShield");
const regular = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
function ascii(s: string) {
  return s
    .replace(/→/g, " > ")
    .replace(/×/g, " x ")
    .replace(/≈/g, "~")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}
for (const [index, slide] of slides.entries()) {
  const [title, ...body] = slide.trim().split(/\r?\n/);
  const page = doc.addPage([960, 540]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    color: rgb(0.043, 0.063, 0.125),
  });
  page.drawRectangle({
    x: 0,
    y: 530,
    width: 960,
    height: 10,
    color: rgb(0.4, 0.345, 0.96),
  });
  page.drawText("BILLSHIELD / CLARITY BEFORE COMMITMENTS", {
    x: 55,
    y: 482,
    size: 10,
    font: bold,
    color: rgb(0.62, 0.58, 0.85),
  });
  page.drawText(ascii(title.replace(/^\d+\.\s*/, "")), {
    x: 55,
    y: 405,
    size: 36,
    font: bold,
    color: rgb(0.97, 0.97, 1),
  });
  let y = 340;
  for (const paragraph of body.filter(Boolean)) {
    let current = "";
    for (const word of ascii(paragraph).split(" ")) {
      if (regular.widthOfTextAtSize(current + " " + word, 18) > 825) {
        page.drawText(current, {
          x: 57,
          y,
          size: 18,
          font: regular,
          color: rgb(0.69, 0.73, 0.83),
        });
        y -= 29;
        current = word;
      } else current += (current ? " " : "") + word;
    }
    if (current) {
      page.drawText(current, {
        x: 57,
        y,
        size: 18,
        font: regular,
        color: rgb(0.69, 0.73, 0.83),
      });
      y -= 29;
    }
    y -= 16;
  }
  page.drawText(
    "BillShield | Hackathon product pitch | Assumptions are labeled",
    { x: 55, y: 35, size: 9, font: regular, color: rgb(0.44, 0.49, 0.61) },
  );
  page.drawText(`${String(index + 1).padStart(2, "0")} / 10`, {
    x: 850,
    y: 35,
    size: 10,
    font: bold,
    color: rgb(0.64, 0.61, 0.86),
  });
}
await writeFile("docs/BillShield-pitch.pdf", await doc.save());
console.log(`Generated docs/BillShield-pitch.pdf (${slides.length} slides).`);
