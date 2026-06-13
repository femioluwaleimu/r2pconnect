export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://r2papi.sunnyfex.com/backend/api.php"
).replace(/\/$/, "");

type ApiOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { token, headers, body, ...requestOptions } = options;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}?${normalizedPath}`, {
    ...requestOptions,
    body,
    headers: {
      Accept: "application/json",
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  put: <T = unknown>(path: string, body?: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  delete: <T = unknown>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
