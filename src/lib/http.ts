// src/lib/http.ts
const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3333";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    body: init?.body,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
