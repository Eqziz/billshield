// Report sanitized operational metadata only. Never attach requests, documents or error messages.
export async function reportError(requestId: string) {
  console.error(
    JSON.stringify({ level: "error", code: "INTERNAL_ERROR", requestId }),
  );
  if (!process.env.SENTRY_DSN) return;
  try {
    const dsn = new URL(process.env.SENTRY_DSN);
    const project = dsn.pathname.split("/").pop();
    await fetch(
      `${dsn.protocol}//${dsn.host}/api/${project}/store/?sentry_version=7&sentry_key=${dsn.username}`,
      {
        method: "POST",
        signal: AbortSignal.timeout(2000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: requestId.replaceAll("-", ""),
          level: "error",
          platform: "node",
          message: "BillShield internal request failure",
          tags: { requestId },
        }),
      },
    );
  } catch {
    /* Error reporting must not break user requests. */
  }
}
