import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  baseURL: "http://localhost:3000",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("/");
await page.screenshot({ path: "docs/screenshots/landing.png", fullPage: true });
await page.goto("/bills/new");
await page
  .locator("input[type=file]")
  .setInputFiles(path.resolve("public/fixtures/internet-rental.pdf"));
await page.getByLabel("Provider name").waitFor();
await page.screenshot({ path: "docs/screenshots/review.png", fullPage: true });
await page.getByRole("button", { name: "Confirm & analyze" }).click();
await page.waitForURL(/analysis\//);
await page
  .getByRole("heading", { name: "Review your equipment charge" })
  .waitFor();
await page.screenshot({
  path: "docs/screenshots/analysis.png",
  fullPage: true,
});
await page.goto("/dashboard");
await page.getByText("Northstar Fiber", { exact: true }).first().waitFor();
await page.screenshot({
  path: "docs/screenshots/dashboard.png",
  fullPage: true,
});
for (const route of [
  "/",
  "/dashboard",
  "/bills/new",
  "/pricing",
  "/settings",
]) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await page.waitForTimeout(400);
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error(`Horizontal overflow on ${route}`);
  if (route === "/dashboard")
    await page.screenshot({
      path: "docs/screenshots/mobile.png",
      fullPage: true,
    });
}
await context.request.delete("/api/v1/privacy/workspace", {
  headers: { origin: "http://localhost:3000" },
});
await browser.close();
if (errors.length) throw new Error(`Browser errors: ${errors.join(", ")}`);
console.log(
  "Captured five product screenshots; no page errors or mobile horizontal overflow.",
);
