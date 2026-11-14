import { test, expect } from "@playwright/test";
import path from "node:path";
const origin = "http://localhost:3000";
const headers = { origin };
test("real PDF → review → analysis → action → confirmed savings → persistence → deletion", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your bills shouldn’t/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Analyze my bill", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start my private workspace" })
    .click();
  await expect(page).toHaveURL(/bills\/new/);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/fixtures/internet-rental.pdf"));
  await expect(page.getByLabel("Provider name")).toHaveValue("Northstar Fiber");
  await expect(
    page.getByLabel("Statement total (USD)", { exact: true }),
  ).toHaveValue("99.00");
  await page.getByLabel("Charge 1 amount", { exact: true }).fill("76.00");
  await expect(page.getByText("Difference: -$1.00")).toBeVisible();
  await page
    .getByLabel("I have reviewed and acknowledge this discrepancy.")
    .check();
  await page.getByRole("button", { name: "Confirm & analyze" }).click();
  await expect(page).toHaveURL(/analysis\//);
  await expect(
    page.getByRole("heading", { name: "Review your equipment charge" }),
  ).toBeVisible();
  const analysisUrl = page.url();
  await page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Review your equipment charge" }),
    })
    .getByRole("button", { name: "Prepare my script" })
    .click();
  await expect(page).toHaveURL(/actions\//);
  await expect(page.locator(".script-text")).toContainText("$99.00");
  await expect(page.locator(".script-text")).toContainText("$15.00");
  await page.getByLabel("Action status").selectOption("SUCCESSFUL");
  await page
    .getByLabel("Provider response")
    .fill(
      "Confirmed compatible customer-owned modem, removes $15 recurring rental.",
    );
  await page.getByLabel("Record a recurring cost outcome").check();
  await page.getByLabel("Previous recurring cost (USD)").fill("99.00");
  await page.getByLabel("New recurring cost (USD)").fill("84.00");
  await page.getByLabel("Effective date").fill("2026-01-01");
  await page
    .getByLabel("My provider has confirmed this new recurring price.")
    .check();
  await page.getByRole("button", { name: "Save outcome" }).click();
  await page.getByRole("link", { name: "View your dashboard" }).click();
  await expect(page.locator(".stat-green")).toContainText("$180.00");
  await page.reload();
  await expect(page.locator(".stat-green")).toContainText("$180.00");
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(analysisUrl);
  await expect(otherPage.locator(".error")).toContainText("not found");
  await otherPage.goto("/settings");
  await otherPage
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await otherPage.getByRole("button", { name: "Delete all my data" }).click();
  await other.close();
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete all my data" }).click();
  await expect(page).toHaveURL(/deleted=1/);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", {
      name: "A clearer picture starts with one bill.",
    }),
  ).toBeVisible();
});
test("mobile empty state and invalid files", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your bills, in perspective." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/bills/new");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  await expect(page.locator(".error")).toContainText("valid PDF signature");
  await page.locator("input[type=file]").setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.locator(".error")).toContainText("smaller than 10 MB");
});
test("API persistence, authorization, comparisons, stale analysis and idempotency", async ({
  playwright,
}) => {
  const a = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const b = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  expect((await a.post("/api/v1/demo/session")).ok()).toBe(true);
  expect((await b.post("/api/v1/demo/session")).ok()).toBe(true);
  const uploaded = await a.post("/api/v1/uploads", {
    multipart: {
      file: {
        name: "bill.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile("public/fixtures/internet-rental.pdf"),
      },
    },
  });
  expect(uploaded.status()).toBe(201);
  const bill = (await uploaded.json()).data.bill;
  const repeated = await a.post("/api/v1/uploads", {
    multipart: {
      file: {
        name: "same-bill.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile("public/fixtures/internet-rental.pdf"),
      },
    },
  });
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).data.bill.id).toBe(bill.id);
  expect((await b.get(`/api/v1/bills/${bill.id}`)).status()).toBe(404);
  expect(
    (await b.patch(`/api/v1/bills/${bill.id}`, { data: {} })).status(),
  ).toBe(422);
  await a.post(`/api/v1/bills/${bill.id}/confirm`);
  const analyzed = await a.post(`/api/v1/bills/${bill.id}/analyze`);
  const analysis = (await analyzed.json()).data;
  expect(analyzed.ok()).toBe(true);
  expect(
    (await (await a.post(`/api/v1/bills/${bill.id}/analyze`)).json()).data.id,
  ).toBe(analysis.id);
  const op = analysis.opportunities.find(
    (o: { type: string }) => o.type === "EQUIPMENT_RENTAL",
  );
  const action = (
    await (await a.post(`/api/v1/opportunities/${op.id}/actions`)).json()
  ).data;
  expect((await b.get(`/api/v1/actions/${action.id}`)).status()).toBe(404);
  expect(
    (await b.post(`/api/v1/opportunities/${op.id}/actions`)).status(),
  ).toBe(404);
  const data = {
    providerName: "Northstar Fiber",
    displayName: "Home internet",
    totalCents: 10000,
    statementDate: "2026-10-01",
    lineItems: bill.lineItems.map(
      (l: {
        description: string;
        category: string;
        amountCents: number;
        recurrenceType: string;
        confidence: number;
        evidence: string;
      }) => l,
    ),
    discrepancyAcknowledged: true,
  };
  expect((await a.patch(`/api/v1/bills/${bill.id}`, { data })).ok()).toBe(true);
  expect(
    (await (await a.get(`/api/v1/analyses/${analysis.id}`)).json()).data.status,
  ).toBe("STALE");
  expect(
    (await a.post(`/api/v1/opportunities/${op.id}/actions`)).status(),
  ).toBe(409);
  await a.post(`/api/v1/bills/${bill.id}/confirm`);
  const second = await a.post("/api/v1/uploads", {
    multipart: {
      serviceAccountId: bill.serviceAccountId,
      file: {
        name: "second.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile("public/fixtures/internet-increase.pdf"),
      },
    },
  });
  expect(second.ok()).toBe(true);
  const secondBill = (await second.json()).data.bill;
  await a.post(`/api/v1/bills/${secondBill.id}/confirm`);
  const comparison = (
    await (await a.post(`/api/v1/bills/${secondBill.id}/analyze`)).json()
  ).data;
  expect(
    comparison.opportunities.some(
      (o: { type: string }) => o.type === "BILL_INCREASE",
    ),
  ).toBe(true);
  expect(
    (
      await a.post("/api/v1/bills", {
        headers: { origin: "https://attacker.example" },
        data,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await a.post("/api/v1/uploads", {
        multipart: {
          file: {
            name: "bad.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-broken"),
          },
        },
      })
    ).status(),
  ).toBe(422);
  const scanned = await a.post("/api/v1/uploads", {
    multipart: {
      file: {
        name: "scan.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile("public/fixtures/no-text.pdf"),
      },
    },
  });
  expect(scanned.ok()).toBe(true);
  const scanData = (await scanned.json()).data;
  expect(scanData.manualRequired).toBe(true);
  expect((await a.delete(`/api/v1/bills/${scanData.bill.id}`)).ok()).toBe(true);
  const scanAgain = await a.post("/api/v1/uploads", {
    multipart: {
      file: {
        name: "scan-again.pdf",
        mimeType: "application/pdf",
        buffer: await (
          await import("node:fs/promises")
        ).readFile("public/fixtures/no-text.pdf"),
      },
    },
  });
  expect(scanAgain.status()).toBe(201);
  expect((await a.delete("/api/v1/privacy/workspace")).ok()).toBe(true);
  expect((await a.get(`/api/v1/bills/${bill.id}`)).status()).toBe(401);
  await b.delete("/api/v1/privacy/workspace");
  await a.dispose();
  await b.dispose();
});
