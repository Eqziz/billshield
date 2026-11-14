import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export function hostedConfiguration(env) {
  const origin = env.APP_ORIGIN || env.RENDER_EXTERNAL_URL;
  if (!origin)
    throw new Error("APP_ORIGIN or RENDER_EXTERNAL_URL is required.");
  const parsed = new URL(origin);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.origin !== origin
  )
    throw new Error(
      "The application origin must be an exact HTTP(S) origin without a trailing slash.",
    );
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(parsed.hostname)
  )
    throw new Error("Public hosting requires HTTPS.");
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (
    !env.RATE_LIMIT_SECRET ||
    env.RATE_LIMIT_SECRET.length < 32 ||
    env.RATE_LIMIT_SECRET.startsWith("replace-")
  )
    throw new Error(
      "A generated RATE_LIMIT_SECRET of at least 32 characters is required.",
    );
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be a valid TCP port.");
  return { origin, port };
}

function nodeScript(relativePath, args) {
  const script = fileURLToPath(new URL(relativePath, import.meta.url));
  return spawn(process.execPath, [script, ...args], {
    stdio: "inherit",
    windowsHide: true,
  });
}

async function applyMigrations() {
  const child = nodeScript("../node_modules/prisma/build/index.js", [
    "migrate",
    "deploy",
  ]);
  await new Promise((resolve, reject) => {
    child.once("error", () =>
      reject(new Error("Could not start database migrations.")),
    );
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              "Database migrations failed; application startup stopped.",
            ),
          ),
    );
  });
}

async function cleanupExpired() {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ log: [] });
  try {
    await db.workspace.deleteMany({
      where: { kind: "GUEST", expiresAt: { lt: new Date() } },
    });
    await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } finally {
    await db.$disconnect();
  }
}

export async function startHosted() {
  const config = hostedConfiguration(process.env);
  process.env.APP_ORIGIN = config.origin;
  process.env.NODE_ENV = "production";
  await applyMigrations();
  await cleanupExpired();
  const app = spawn(
    process.execPath,
    [
      "--max-old-space-size=192",
      fileURLToPath(
        new URL("../node_modules/next/dist/bin/next", import.meta.url),
      ),
      "start",
      "--hostname",
      "0.0.0.0",
      "--port",
      String(config.port),
    ],
    { stdio: "inherit", windowsHide: true },
  );
  let cleaning = false;
  const timer = setInterval(
    async () => {
      if (cleaning) return;
      cleaning = true;
      try {
        await cleanupExpired();
      } catch {
        console.error(
          "Scheduled guest cleanup failed; it will retry while the service is awake.",
        );
      } finally {
        cleaning = false;
      }
    },
    60 * 60 * 1000,
  );
  timer.unref();
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => app.kill(signal));
  app.once("error", () => {
    clearInterval(timer);
    console.error("Could not start the application server.");
    process.exitCode = 1;
  });
  app.once("exit", (code) => {
    clearInterval(timer);
    process.exitCode = code ?? 1;
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startHosted().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Hosted startup failed.",
    );
    process.exitCode = 1;
  });
}
