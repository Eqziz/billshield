import { describe, expect, it } from "vitest";
// @ts-expect-error Standalone host launcher intentionally runs as plain Node ESM.
import { hostedConfiguration } from "../scripts/start-hosted.mjs";
const base = {
  DATABASE_URL: "postgresql://example.invalid/billshield",
  RATE_LIMIT_SECRET: "test-only-secret-with-more-than-32-characters",
};
describe("Hosted startup configuration", () => {
  it("uses Render-provided HTTPS origin and port", () =>
    expect(
      hostedConfiguration({
        ...base,
        RENDER_EXTERNAL_URL: "https://billshield-example.onrender.com",
        PORT: "10000",
      }),
    ).toEqual({
      origin: "https://billshield-example.onrender.com",
      port: 10000,
    }));
  it("preserves explicit custom-domain origin", () =>
    expect(
      hostedConfiguration({
        ...base,
        APP_ORIGIN: "https://bills.example.com",
        RENDER_EXTERNAL_URL: "https://other.onrender.com",
      }).origin,
    ).toBe("https://bills.example.com"));
  it("allows local production verification", () =>
    expect(
      hostedConfiguration({ ...base, APP_ORIGIN: "http://localhost:3000" })
        .port,
    ).toBe(3000));
  it.each([
    { ...base },
    { ...base, APP_ORIGIN: "https://example.com/path" },
    { ...base, APP_ORIGIN: "http://example.com" },
    { ...base, APP_ORIGIN: "https://example.com", PORT: "oops" },
    {
      ...base,
      APP_ORIGIN: "https://example.com",
      RATE_LIMIT_SECRET: "replace-with-a-random-secret-in-production",
    },
    { ...base, APP_ORIGIN: "https://example.com", DATABASE_URL: "" },
  ])("fails closed for unsafe or missing configuration", (env) =>
    expect(() => hostedConfiguration(env)).toThrow(),
  );
});
