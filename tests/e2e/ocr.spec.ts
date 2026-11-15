import { test, expect } from "@playwright/test";
import path from "node:path";

test("image-only PDF → reviewed actual amounts → analysis", async ({
  page,
}) => {
  test.setTimeout(120000);
  try {
    await page.goto("/bills/new");
    await page
      .locator("input[type=file]")
      .setInputFiles(path.resolve("public/fixtures/internet-scanned.pdf"));
    await expect(page.getByLabel("Provider name")).toHaveValue(
      "Northstar Fiber",
      { timeout: 60000 },
    );
    await expect(
      page.getByLabel("Statement total (USD)", { exact: true }),
    ).toHaveValue("99.00");
    await expect(
      page.getByText("Image OCR was used for this document.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm & analyze" }).click();
    await expect(
      page.getByRole("heading", { name: "Review your equipment charge" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Decide whether this add-on earns its keep",
      }),
    ).toBeVisible();
  } finally {
    await page
      .context()
      .request.delete("/api/v1/privacy/workspace", {
        headers: { origin: "http://localhost:3000" },
      });
  }
});
