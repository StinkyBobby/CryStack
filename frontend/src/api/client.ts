const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, token, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(normalizeErrorMessage(message, response.status));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeErrorMessage(raw: string, status: number): string {
  if (!raw) {
    return `HTTP ${status}`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed?.error) {
      return parsed.error;
    }
  } catch {
    return raw;
  }

  return raw;
}
