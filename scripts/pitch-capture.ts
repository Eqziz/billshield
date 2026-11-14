import { chromium, expect as baseExpect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const origin = "https://billshield-tyxt.onrender.com";
const expect = baseExpect.configure({ timeout: 45000 });
const folder = "docs/pitch-assets";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: origin,
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(45000);
page.setDefaultNavigationTimeout(90000);
try {
  await page.goto("/bills/new");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/fixtures/internet-rental.pdf"));
  await expect(page.getByLabel("Provider name")).toHaveValue("Northstar Fiber");
  await page.screenshot({ path: `${folder}/review.png` });
  await page.getByRole("button", { name: "Confirm & analyze" }).click();
  await expect(
    page.getByRole("heading", { name: "Review your equipment charge" }),
  ).toBeVisible();
  await page.screenshot({ path: `${folder}/analysis.png` });
  await page
    .locator(".analysis-summary")
    .screenshot({ path: `${folder}/analysis-summary.png` });
  const opportunity = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "Review your equipment charge" }),
    });
  await opportunity.screenshot({ path: `${folder}/opportunity.png` });
  await opportunity.getByRole("button", { name: "Prepare my script" }).click();
  await expect(page.locator(".script-text")).toContainText("$99.00");
  await page.screenshot({ path: `${folder}/action.png` });
  await page
    .locator(".script-text")
    .screenshot({ path: `${folder}/script.png` });
  await page.goto("/dashboard");
  await expect(
    page.getByText("Northstar Fiber", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: `${folder}/dashboard.png` });
  console.log(
    "Captured seven real hosted-product screenshots from a fictional bill; no provider contacted.",
  );
} finally {
  try {
    const response = await context.request.delete("/api/v1/privacy/workspace", {
      headers: { origin },
    });
    if (!response.ok())
      console.warn("Synthetic workspace cleanup needs checking.");
  } catch {
    console.warn("Synthetic workspace cleanup could not be verified.");
  }
  await browser.close();
}
