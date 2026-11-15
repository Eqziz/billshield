import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { processPdf, extractText } from "../src/server/extraction";

describe.sequential("Real image OCR", () => {
  it("reads actual amounts from a PDF containing only a page image", async () => {
    const result = await processPdf(
      await readFile("public/fixtures/internet-scanned.pdf"),
    );
    const bill = extractText(result.text);
    expect(result.ocrUsed).toBe(true);
    expect(result.ocrPages).toEqual([1]);
    expect(bill.providerName).toBe("Northstar Fiber");
    expect(bill.totalCents).toBe(9900);
    expect(
      bill.lineItems.map((l) => l.amountCents).sort((a, b) => a - b),
    ).toEqual([900, 1500, 7500]);
  }, 60000);
  it("recognizes image charges even when the page already has native financial text", async () => {
    const result = await processPdf(
      await readFile("public/fixtures/internet-mixed.pdf"),
    );
    const bill = extractText(result.text);
    expect(result.ocrUsed).toBe(true);
    expect(bill.totalCents).toBe(9901);
    expect(
      bill.lineItems
        .filter((l) => l.category === "SERVICE")
        .map((l) => l.amountCents),
    ).toEqual([7501]);
    expect(
      bill.lineItems.some(
        (l) => l.category === "EQUIPMENT" && l.amountCents === 1500,
      ),
    ).toBe(true);
    expect(
      bill.lineItems.some(
        (l) => l.category === "ADDON" && l.amountCents === 900,
      ),
    ).toBe(true);
    expect(bill.lineItems.reduce((sum, l) => sum + l.amountCents, 0)).toBe(
      9901,
    );
  }, 60000);
  it("keeps text PDFs on the fast native path", async () => {
    const result = await processPdf(
      await readFile("public/fixtures/internet-rental.pdf"),
    );
    expect(result.ocrUsed).toBe(false);
    expect(extractText(result.text).totalCents).toBe(9900);
  });
  it("preserves the manual fallback for an actually blank document", async () => {
    const result = await processPdf(
      await readFile("public/fixtures/no-text.pdf"),
    );
    expect(result.ocrUsed).toBe(false);
    expect(extractText(result.text).totalCents).toBeNull();
  });
});
