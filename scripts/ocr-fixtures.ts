import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PDFParse } from "pdf-parse";
import { createCanvas } from "@napi-rs/canvas";

const parser = new PDFParse({
  data: await readFile("public/fixtures/internet-rental.pdf"),
});
try {
  const result = await parser.getScreenshot({
    desiredWidth: 1600,
    imageDataUrl: false,
    imageBuffer: true,
  });
  const scan = await PDFDocument.create();
  const image = await scan.embedPng(result.pages[0].data);
  scan
    .addPage([612, 792])
    .drawImage(image, { x: 0, y: 0, width: 612, height: 792 });
  await writeFile("public/fixtures/internet-scanned.pdf", await scan.save());
} finally {
  await parser.destroy();
}
const mixed = await PDFDocument.create();
const font = await mixed.embedFont(StandardFonts.Helvetica);
const page = mixed.addPage([612, 792]);
for (const [i, line] of [
  "SYNTHETIC FIXTURE - NOT A REAL BILL",
  "Provider: Northstar Fiber",
  "Statement date: 2026-11-01",
  "Internet service $75.01",
  "Total amount due $99.01",
].entries())
  page.drawText(line, { x: 45, y: 750 - i * 30, size: 14, font });
const canvas = createCanvas(1400, 360);
const context = canvas.getContext("2d");
context.fillStyle = "white";
context.fillRect(0, 0, 1400, 360);
context.fillStyle = "#101010";
context.font = "38px Arial";
context.fillText("Equipment rental $15.00", 40, 110);
context.fillText("Security add-on $9.00", 40, 220);
const table = await mixed.embedPng(canvas.toBuffer("image/png"));
page.drawImage(table, { x: 45, y: 390, width: 520, height: 134 });
await writeFile("public/fixtures/internet-mixed.pdf", await mixed.save());
console.log(
  "Generated an image-only scanned bill and a mixed native-text/image bill.",
);
