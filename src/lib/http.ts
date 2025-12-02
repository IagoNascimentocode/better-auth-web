// src/lib/http.ts
const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3333";

export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body,
    credentials: "include",
  });

  // ❌ se erro → tenta ler texto, mas não tenta fazer JSON
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  // 🔥 LÊ O CORPO COMO TEXTO (para evitar UNEXPECTED END OF JSON)
  const responseText = await res.text().catch(() => "");

  // 🧩 Caso o backend retorne vazio (204, 200 sem body, etc.)
  if (!responseText) {
    return {} as T;
  }

  // Tenta fazer parse do JSON
  try {
    return JSON.parse(responseText);
  } catch (err) {
    console.warn("⚠️ Resposta não é JSON válido:", responseText);
    return {} as T;
  }
}
