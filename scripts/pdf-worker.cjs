/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node PDF/OCR process. */
const path = require("node:path");

function nativeLines(items) {
  const rows = [];
  for (const item of items
    .filter((i) => typeof i.str === "string" && i.str.trim())
    .sort(
      (a, b) =>
        b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
    )) {
    let row = rows.find((r) => Math.abs(r.y - item.transform[5]) < 3);
    if (!row) {
      row = { y: item.transform[5], items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  return rows
    .map((r) =>
      r.items
        .sort((a, b) => a.transform[4] - b.transform[4])
        .map((i) => i.str)
        .join(" ")
        .trim(),
    )
    .join("\n");
}
function mergeText(native, ocr) {
  const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const description = (s) =>
    key(s.replace(/[-(]?\$?\s*\d[\d,]*[.]\d{2}\)?/g, ""));
  const original = native
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set(original.map(key));
  const nativeCharges = new Set(
    original.filter((s) => /\d[.]\d{2}/.test(s)).map(description),
  );
  for (const line of ocr
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const normalized = key(line);
    if (!normalized || seen.has(normalized)) continue;
    // Keep exact native amounts when OCR sees the same charge again.
    if (/\d[.]\d{2}/.test(line) && nativeCharges.has(description(line)))
      continue;
    original.push(line);
    seen.add(normalized);
  }
  return original.join("\n");
}

process.once("message", async (buffer) => {
  let document, ocr;
  try {
    const { createCanvas } = require("@napi-rs/canvas");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    class CanvasFactory {
      create(width, height) {
        const canvas = createCanvas(width, height);
        return { canvas, context: canvas.getContext("2d") };
      }
      reset(target, width, height) {
        target.canvas.width = width;
        target.canvas.height = height;
      }
      destroy(target) {
        target.canvas.width = 1;
        target.canvas.height = 1;
        target.canvas = null;
        target.context = null;
      }
    }
    document = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      CanvasFactory,
      maxImageSize: 16_000_000,
      standardFontDataUrl:
        path.join(
          path.dirname(require.resolve("pdfjs-dist/package.json")),
          "standard_fonts",
        ) + path.sep,
      cMapUrl:
        path.join(
          path.dirname(require.resolve("pdfjs-dist/package.json")),
          "cmaps",
        ) + path.sep,
      cMapPacked: true,
      wasmUrl:
        path.join(
          path.dirname(require.resolve("pdfjs-dist/package.json")),
          "wasm",
        ) + path.sep,
      verbosity: 0,
    }).promise;
    if (document.numPages > 20) throw new Error("TOO_MANY_PAGES");
    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintInlineImageXObjectGroup,
    ]);
    const textPaintOps = new Set([
      pdfjs.OPS.showText,
      pdfjs.OPS.showSpacedText,
      pdfjs.OPS.nextLineShowText,
      pdfjs.OPS.nextLineSetSpacingShowText,
    ]);
    const pages = [],
      ocrPages = [],
      warnings = [];
    let confidenceTotal = 0,
      attempts = 0;
    for (let num = 1; num <= document.numPages; num++) {
      const page = await document.getPage(num);
      const text = nativeLines((await page.getTextContent()).items);
      const operations = await page.getOperatorList();
      const largeImage = operations.fnArray.some((op, index) => {
        if (!imageOps.has(op)) return false;
        const args = operations.argsArray[index];
        return (
          op !== pdfjs.OPS.paintImageXObject ||
          ((args[1] || 0) >= 400 && (args[2] || 0) >= 160)
        );
      });
      const sparse =
        text.replace(/\s/g, "").length < 25 && operations.fnArray.length > 0;
      let combined = text;
      if (largeImage || sparse) {
        if (attempts >= 5)
          warnings.push(
            `OCR page limit reached; page ${num} needs manual review.`,
          );
        else {
          attempts++;
          try {
            if (!ocr) {
              const { createWorker } = require("tesseract.js");
              ocr = await createWorker("eng", 1, {
                langPath: path.join(
                  path.dirname(
                    require.resolve("@tesseract.js-data/eng/package.json"),
                  ),
                  "4.0.0_best_int",
                ),
                cacheMethod: "none",
                gzip: true,
                logger: () => {},
                errorHandler: () => {},
              });
              await ocr.setParameters({ preserve_interword_spaces: "1" });
            }
            const base = page.getViewport({ scale: 1 });
            const scale = Math.min(
              2.5,
              1600 / base.width,
              2200 / base.height,
              Math.sqrt(3_000_000 / (base.width * base.height)),
            );
            const viewport = page.getViewport({ scale });
            const canvas = createCanvas(
              Math.ceil(viewport.width),
              Math.ceil(viewport.height),
            );
            try {
              await page.render({
                canvasContext: canvas.getContext("2d"),
                canvas,
                viewport,
                background: "rgb(255,255,255)",
                // Native text has already been extracted exactly. OCR only the
                // remaining artwork/images so font rasterization cannot add a
                // second, slightly misspelled copy of an authoritative charge.
                operationsFilter: text.trim()
                  ? (index) => !textPaintOps.has(operations.fnArray[index])
                  : undefined,
              }).promise;
              const result = await ocr.recognize(canvas.toBuffer("image/png"), {
                rotateAuto: true,
              });
              if (result.data.text.trim()) {
                combined = mergeText(text, result.data.text);
                ocrPages.push(num);
                confidenceTotal += result.data.confidence;
              } else warnings.push(`No readable image text on page ${num}.`);
            } finally {
              canvas.width = 1;
              canvas.height = 1;
            }
          } catch {
            warnings.push(
              `Image text on page ${num} could not be recognized. Review it manually.`,
            );
          }
        }
      }
      pages.push(combined);
      page.cleanup();
    }
    process.send({
      text: pages.join("\n\n").slice(0, 150000),
      ocrUsed: ocrPages.length > 0,
      ocrPages,
      ocrConfidence: ocrPages.length ? confidenceTotal / ocrPages.length : null,
      warnings,
    });
  } catch (error) {
    process.send({
      error:
        error?.message === "TOO_MANY_PAGES"
          ? "TOO_MANY_PAGES"
          : "UNREADABLE_PDF",
    });
  } finally {
    if (ocr) await ocr.terminate().catch(() => {});
    if (document) await document.destroy().catch(() => {});
    process.disconnect();
  }
});
