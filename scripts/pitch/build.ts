import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { renderDeck, LIVE_URL } from "./deck";

const source = await readFile("docs/PITCH.md", "utf8");
const sections = source.split(/\r?\n## \d+\. /).slice(1);
if (sections.length !== 10)
  throw new Error("The pitch source must contain exactly ten numbered slides.");
const notes = sections.map(
  (s) => s.split("### Speaker notes")[1]?.trim() || "",
);
const font = await readFile(
  "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
);
const theme = await readFile("scripts/pitch/theme.css", "utf8");
const license = await readFile(
  "node_modules/@fontsource-variable/inter/LICENSE",
  "utf8",
);
async function asset(name: string, fallback?: string) {
  let bytes: Buffer;
  try {
    bytes = await readFile(`docs/pitch-assets/${name}.png`);
  } catch {
    if (!fallback)
      throw new Error(
        `Missing pitch asset ${name}. Run npm run pitch:capture first.`,
      );
    bytes = await readFile(`docs/screenshots/${fallback}.png`);
  }
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
const assets = {
  dashboard: await asset("dashboard", "dashboard"),
  analysis: await asset("analysis", "analysis"),
  review: await asset("review", "review"),
  action: await asset("action", "analysis"),
  script: await asset("script"),
};
const qr = await QRCode.toDataURL(LIVE_URL, {
  width: 440,
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#0b1020", light: "#ffffff" },
});
const html = renderDeck({
  assets,
  qr,
  notes,
  css: `@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');font-style:normal;font-weight:100 900;font-display:block;}\n${theme}`,
  fontLicense: license,
});
await writeFile("docs/BillShield-pitch.html", html);
await mkdir(".local/pitch-preview", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    pathToFileURL(path.resolve("docs/BillShield-pitch.html")).href,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: ".deck-controls,.speaker-notes{display:none!important}",
  });
  const thumbnails: string[] = [];
  for (let i = 0; i < 10; i++) {
    await page.evaluate((index) => {
      window.location.hash = String(index + 1);
    }, i);
    const slide = page.locator(`.slide[data-slide="${i + 1}"].active`);
    await slide.waitFor({ state: "visible" });
    const overflowing = await slide.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return Array.from(
        root.querySelectorAll("h1,h2,h3,p,.pill,.big-number,.price,.url"),
      )
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return (
            box.width > 0 &&
            (box.left < bounds.left - 1 ||
              box.right > bounds.right + 1 ||
              box.top < bounds.top - 1 ||
              box.bottom > bounds.bottom + 1)
          );
        })
        .map((el) => el.textContent?.slice(0, 90));
    });
    if (overflowing.length)
      throw new Error(
        `Slide ${i + 1} has overflowing content: ${overflowing.join("; ")}`,
      );
    const png = await slide.screenshot({
      path: `.local/pitch-preview/${String(i + 1).padStart(2, "0")}.png`,
    });
    thumbnails.push(`data:image/png;base64,${png.toString("base64")}`);
  }
  await page.evaluate(() =>
    document
      .querySelectorAll(".slide")
      .forEach((s) => s.removeAttribute("aria-hidden")),
  );
  await page.pdf({
    path: "docs/BillShield-pitch.pdf",
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
  });
  const pdf = await PDFDocument.load(
    await readFile("docs/BillShield-pitch.pdf"),
  );
  if (pdf.getPageCount() !== 10)
    throw new Error(`Expected 10 pages, generated ${pdf.getPageCount()}.`);
  const sheet = await browser.newPage({
    viewport: { width: 1360, height: 410 },
    deviceScaleFactor: 1,
  });
  await sheet.setContent(
    `<html><body style="margin:0;padding:20px;background:#111729;color:#c3c9df;font:13px Arial"><div style="display:flex;justify-content:space-between;margin:0 2px 18px"><b>BILLSHIELD · PITCH OVERVIEW</b><span>10 slides · real product · labeled assumptions</span></div><div style="display:grid;grid-template-columns:repeat(5,256px);gap:12px">${thumbnails.map((src, i) => `<div><img src="${src}" style="width:256px;height:144px;display:block;border-radius:5px"><span style="font-size:10px;display:block;margin-top:4px;opacity:.6">${String(i + 1).padStart(2, "0")}</span></div>`).join("")}</div></body></html>`,
  );
  await sheet.screenshot({ path: "docs/BillShield-pitch-preview.png" });
  console.log(
    "Generated 10-slide widescreen PDF, standalone HTML with speaker notes, and preview. All slides passed bounds checks.",
  );
} finally {
  await browser.close();
}
