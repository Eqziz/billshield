import { describe, expect, it, vi } from "vitest";
import {
  analyze,
  classify,
  confirmedSavings,
  money,
  negotiationScript,
  normalizeDate,
  parseMoney,
  potential,
  recurringCost,
} from "../src/lib/domain";
import { billSchema, dateSchema, lineSchema } from "../src/lib/validation";
import {
  extractText,
  hasAmount,
  enhanceExtraction,
  pdfText,
} from "../src/server/extraction";
import { readFile } from "node:fs/promises";
const line = (description: string, amountCents: number) =>
  lineSchema.parse({ description, amountCents, ...classify(description) });
describe("Financial domain", () => {
  it("does not annualize equipment purchases or ambiguous equipment charges", () => {
    expect(classify("Router purchase").recurrenceType).toBe("ONE_TIME");
    const f = analyze({
      totalCents: 10000,
      lineItems: [
        line("Router purchase", 10000),
        line("Equipment charge", 1000),
      ],
    });
    expect(potential(f, 10000).monthly).toBe(0);
  });
  it.each([
    ["$1,234.56", 123456],
    ["0.10", 10],
    ["-10.25", -1025],
    ["($9.99)", -999],
    ["1", 100],
    ["0.01", 1],
  ])("parses %s exactly", (input, expected) =>
    expect(parseMoney(input)).toBe(expected),
  );
  it.each(["1.999", "NaN", "1e3", "", "-", "999999999999999", "1.2.3"])(
    "rejects invalid money %s",
    (input) => expect(() => parseMoney(input)).toThrow(),
  );
  it("formats USD cents", () => expect(money(1099)).toBe("$10.99"));
  it("normalizes valid dates and rejects impossible dates", () => {
    expect(normalizeDate("Due date: 2/28/2026")).toBe("2026-02-28");
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(dateSchema.safeParse("2026-02-30").success).toBe(false);
  });
  it("rejects reversed billing periods", () =>
    expect(
      billSchema.safeParse({
        providerName: "ISP",
        totalCents: 100,
        lineItems: [],
        periodStart: "2026-11-20",
        periodEnd: "2026-11-01",
      }).success,
    ).toBe(false));
  it("finds rental and add-on with zero lower bounds", () => {
    const f = analyze({
      totalCents: 9900,
      lineItems: [line("Equipment rental", 1500), line("Security add-on", 900)],
    });
    expect(f.filter((o) => o.maxMonthlySavingsCents > 0)).toHaveLength(2);
    expect(f.every((o) => o.minMonthlySavingsCents === 0)).toBe(true);
    expect(potential(f, 9900)).toEqual({
      monthly: 2400,
      annual: 28800,
      oneTime: 0,
    });
  });
  it("never annualizes a one-time fee", () => {
    const f = analyze({
      totalCents: 5000,
      lineItems: [line("Installation fee", 5000)],
    });
    expect(potential(f, 5000)).toEqual({
      monthly: 0,
      annual: 0,
      oneTime: 5000,
    });
  });
  it("does not count an existing promotion as new savings", () => {
    const f = analyze({
      totalCents: 6500,
      lineItems: [line("Promo discount expires 2026-12-01", -1000)],
    });
    expect(f.some((o) => o.type === "PROMO_EXPIRATION")).toBe(true);
    expect(potential(f, 6500).monthly).toBe(0);
  });
  it("excludes one-time charges from bill-increase comparisons", () => {
    const f = analyze(
      { totalCents: 10000, lineItems: [line("Installation fee", 2500)] },
      { totalCents: 7000, lineItems: [] },
    );
    expect(f.find((o) => o.type === "BILL_INCREASE")?.currentChargeCents).toBe(
      500,
    );
    expect(
      recurringCost({
        totalCents: 10000,
        lineItems: [line("Installation fee", 2500)],
      }),
    ).toBe(7500);
  });
  it("groups overlaps and caps monthly savings to recurring total", () => {
    expect(
      potential(
        [
          {
            overlapGroup: "a",
            maxMonthlySavingsCents: 1500,
            oneTimeSavingsCents: 0,
          },
          {
            overlapGroup: "a",
            maxMonthlySavingsCents: 1000,
            oneTimeSavingsCents: 0,
          },
          {
            overlapGroup: "b",
            maxMonthlySavingsCents: 2000,
            oneTimeSavingsCents: 0,
          },
        ],
        3000,
      ).monthly,
    ).toBe(3000);
  });
  it("does not double count outcomes on the same account", () => {
    const base = {
      serviceAccountId: "a",
      confirmationStatus: "CONFIRMED",
      createdAt: "2026-10-01",
    };
    expect(
      confirmedSavings(
        [
          {
            ...base,
            previousMonthlyCents: 10000,
            newMonthlyCents: 8500,
            effectiveAt: "2026-10-01",
          },
          {
            ...base,
            previousMonthlyCents: 10000,
            newMonthlyCents: 8000,
            effectiveAt: "2026-11-01",
          },
        ],
        new Date("2026-11-14"),
      ),
    ).toEqual({ monthly: 2000, annual: 24000 });
  });
  it("ignores unconfirmed and future reductions", () =>
    expect(
      confirmedSavings([
        {
          serviceAccountId: "a",
          previousMonthlyCents: 10000,
          newMonthlyCents: 8000,
          effectiveAt: "2099-01-01",
          createdAt: "2026-11-01",
          confirmationStatus: "CONFIRMED",
        },
        {
          serviceAccountId: "b",
          previousMonthlyCents: 10000,
          newMonthlyCents: 8000,
          effectiveAt: "2026-01-01",
          createdAt: "2026-01-01",
          confirmationStatus: "UNCONFIRMED",
        },
      ]).monthly,
    ).toBe(0));
  it("uses real bill amounts in scripts", () => {
    const f = analyze({ totalCents: 12345, lineItems: [] })[0];
    expect(
      negotiationScript("Example ISP", 12345, f, ["Review charge"]),
    ).toContain("$123.45");
  });
  it("rejects ungrounded AI amounts", () => {
    expect(hasAmount("Rental $15.00", 1500)).toBe(true);
    expect(hasAmount("Rental $15.00", 2500)).toBe(false);
  });
  it("preserves missing financial data as null", () => {
    const data = extractText("This bill has no readable amount or dates.");
    expect(data.totalCents).toBeNull();
    expect(data.statementDate).toBeNull();
  });
  it("retains deterministic extraction when configured AI returns an outage", async () => {
    const old = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-only";
    const stub = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 503 }));
    try {
      const fallback = extractText(
        "Provider: ISP\nInternet $75.00\nTotal amount due $75.00",
      );
      expect((await enhanceExtraction("Bill text", fallback)).data).toEqual(
        fallback,
      );
    } finally {
      stub.mockRestore();
      if (old) process.env.OPENAI_API_KEY = old;
      else delete process.env.OPENAI_API_KEY;
    }
  });
  it("rejects ungrounded structured AI output and falls back", async () => {
    const old = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-only";
    const stub = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                totalCents: 7500,
                lineItems: [
                  {
                    description: "Invented rental",
                    amountCents: 1500,
                    evidence: "Never in document $15.00",
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
    try {
      const fallback = extractText(
        "Provider: ISP\nInternet $75.00\nTotal amount due $75.00",
      );
      expect(
        (await enhanceExtraction("Real bill $75.00", fallback)).enhanced,
      ).toBe(false);
    } finally {
      stub.mockRestore();
      if (old) process.env.OPENAI_API_KEY = old;
      else delete process.env.OPENAI_API_KEY;
    }
  });
  it("falls back on AI outage or invalid key", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const fallback = extractText(
      "Provider: ISP\nInternet service $75.00\nTotal amount due $75.00",
    );
    expect(await enhanceExtraction("text", fallback)).toEqual({
      data: fallback,
      enhanced: false,
    });
    if (original) process.env.OPENAI_API_KEY = original;
  });
  it("extracts real synthetic PDF text without fixture-specific code", async () => {
    const text = await pdfText(
      await readFile("public/fixtures/internet-rental.pdf"),
    );
    const result = extractText(text);
    expect(result.providerName).toBe("Northstar Fiber");
    expect(result.totalCents).toBe(9900);
    expect(result.lineItems).toHaveLength(3);
    expect(result.statementDate).toBe("2026-10-01");
    expect(result.periodEnd).toBe("2026-10-31");
  });
  it("handles the other fixture documents", async () => {
    for (const [name, total] of [
      ["internet-increase", 11400],
      ["internet-addon", 8000],
    ] as const) {
      const result = extractText(
        await pdfText(await readFile(`public/fixtures/${name}.pdf`)),
      );
      expect(result.totalCents).toBe(total);
    }
  });
});
