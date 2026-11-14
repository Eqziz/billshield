"use client";
import { useEffect, useState } from "react";
let initialization: Promise<void> | null = null;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch(`/api/v1/${path}`, {
    method,
    credentials: "same-origin",
    headers: form ? {} : body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message || "The request could not be completed.",
    );
  return result.data as T;
}
export function initialize() {
  if (!initialization)
    initialization = api("demo/session", "POST")
      .then(() => {})
      .catch((e) => {
        initialization = null;
        throw e;
      });
  return initialization;
}
export function resetSession() {
  initialization = null;
}
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    initialize()
      .then(() => api<T>(path))
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to load data.");
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error, reload: () => setRevision((r) => r + 1) };
}
