import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
const bills = [
  {
    name: "internet-rental",
    provider: "Northstar Fiber",
    date: "2026-10-01",
    end: "2026-10-31",
    due: "2026-10-20",
    charges: [
      ["Internet service", 75],
      ["Equipment rental", 15],
      ["Security add-on", 9],
    ],
    total: 99,
  },
  {
    name: "internet-increase",
    provider: "Northstar Fiber",
    date: "2026-11-01",
    end: "2026-11-30",
    due: "2026-11-20",
    charges: [
      ["Internet service", 90],
      ["Equipment rental", 15],
      ["Security add-on", 9],
    ],
    total: 114,
  },
  {
    name: "internet-addon",
    provider: "Horizon Internet",
    date: "2026-11-01",
    end: "2026-11-30",
    due: "2026-11-21",
    charges: [
      ["Internet service", 65],
      ["Premium security add-on", 12],
      ["Taxes", 3],
    ],
    total: 80,
  },
];
await mkdir("public/fixtures", { recursive: true });
for (const b of bills) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);
  page.drawText("SYNTHETIC FIXTURE - NOT A REAL BILL", {
    x: 45,
    y: 745,
    size: 11,
    font: bold,
    color: rgb(0.45, 0.35, 0.7),
  });
  page.drawText("Internet statement", { x: 45, y: 702, size: 24, font: bold });
  const lines = [
    `Provider: ${b.provider}`,
    "Account category: Residential internet",
    `Statement date: ${b.date}`,
    `Billing period: ${b.date} - ${b.end}`,
    `Due date: ${b.due}`,
    "",
    ...b.charges.map(
      ([label, amount]) => `${label} $${Number(amount).toFixed(2)}`,
    ),
    "",
    `Total amount due $${b.total.toFixed(2)}`,
    "",
    "All providers, charges and dates in this document are fictional.",
  ];
  lines.forEach((line, i) =>
    page.drawText(line, { x: 45, y: 655 - i * 27, size: 12, font }),
  );
  await writeFile(`public/fixtures/${b.name}.pdf`, await doc.save());
}
const blank = await PDFDocument.create();
blank.addPage();
await writeFile("public/fixtures/no-text.pdf", await blank.save());
console.log("Generated 3 labeled synthetic bills and one textless PDF.");
