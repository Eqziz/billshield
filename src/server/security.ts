import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const cookieName = "billshield_guest";
export const hash = (token: string | Uint8Array) =>
  createHash("sha256").update(token).digest("hex");
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new ApiError(
      403,
      "CSRF_REJECTED",
      "Request origin could not be verified. Reload BillShield and try again.",
    );
}
export async function rateLimit(
  request: NextRequest,
  bucket: string,
  max = 90,
) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!secret || secret.startsWith("replace-"))
  )
    throw new ApiError(
      503,
      "CONFIGURATION_REQUIRED",
      "Secure rate limiting must be configured before production use.",
    );
  // Vercel overwrites x-vercel-forwarded-for. Other hosts must set TRUST_PROXY=1 only behind a trusted proxy.
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")
    : process.env.TRUST_PROXY === "1"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]
      : "local";
  const key = createHmac("sha256", secret || "development-only")
    .update(`${ip || "unknown"}:${bucket}:${Math.floor(Date.now() / 60000)}`)
    .digest("hex");
  const record = await db.rateLimit.upsert({
    where: { key },
    create: { key, expiresAt: new Date(Date.now() + 120000) },
    update: { count: { increment: 1 } },
  });
  if (record.count > max)
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many requests. Please wait a minute before trying again.",
    );
}
export async function session(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(
      401,
      "SESSION_REQUIRED",
      "Start a private guest workspace to continue.",
    );
  const found = await db.guestSession.findUnique({
    where: { tokenHash: hash(token) },
    include: { workspace: true },
  });
  if (
    !found ||
    found.expiresAt <= new Date() ||
    found.workspace.expiresAt <= new Date()
  )
    throw new ApiError(
      401,
      "SESSION_EXPIRED",
      "Your guest workspace has expired. Start a fresh session.",
    );
  await db.guestSession.update({
    where: { id: found.id },
    data: { lastAccessedAt: new Date() },
  });
  return found.workspace;
}
export async function startSession(request: NextRequest) {
  // Reuse existing valid sessions; parallel first-load calls do not erase data.
  try {
    const existing = await session(request);
    return { workspace: existing, token: null };
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  await cleanup();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  const workspace = await db.workspace.create({
    data: {
      expiresAt,
      sessions: { create: { tokenHash: hash(token), expiresAt } },
    },
  });
  return { workspace, token };
}
export function sessionCookie(response: NextResponse, token: string) {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function cleanup() {
  await db.workspace.deleteMany({
    where: { kind: "GUEST", expiresAt: { lt: new Date() } },
  });
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
export function notFound(): never {
  throw new ApiError(
    404,
    "NOT_FOUND",
    "This record was not found in your workspace.",
  );
}
