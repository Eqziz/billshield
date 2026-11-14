/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CJS PDF worker, outside Next.js bundling. */
process.once("message", async (buffer) => {
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
    });
    try {
      const info = await parser.getInfo();
      if (info.total > 20) throw new Error("TOO_MANY_PAGES");
      const result = await parser.getText();
      await parser.destroy();
      process.send({ text: result.text.slice(0, 150000) });
    } finally {
      await parser.destroy();
    }
  } catch {
    process.send({ error: "UNREADABLE_PDF" });
  } finally {
    process.disconnect();
  }
});
