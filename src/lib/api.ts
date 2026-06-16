import { friendlyErrorMessage } from "@/lib/errorMessage";

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}?${normalizedPath}`, {
      ...requestOptions,
      body,
      headers: {
        Accept: "application/json",
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    throw new ApiError(friendlyErrorMessage(error), 0, null);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const responseObject = typeof data === "object" && data ? data as Record<string, unknown> : null;
    const nestedData = responseObject && typeof responseObject.data === "object" && responseObject.data
      ? responseObject.data as Record<string, unknown>
      : null;
    const validationMessage =
      responseObject && "errors" in responseObject
        ? Object.entries((responseObject as { errors?: Record<string, string[] | string> }).errors || {})
            .flatMap(([field, value]) => {
              const label = field.replace(/_/g, " ");
              if (Array.isArray(value)) {
                return value.map((message) => String(message || "").trim()).filter(Boolean);
              }
              const message = String(value || "").trim();
              return message ? [`${label}: ${message}`] : [];
            })
            .join("\n")
        : "";
    const message =
      validationMessage ||
      (nestedData && "error" in nestedData
        ? friendlyErrorMessage(nestedData.error)
        : responseObject && "error" in responseObject && responseObject.error
        ? friendlyErrorMessage(responseObject.error)
        : responseObject && "message" in responseObject
          ? friendlyErrorMessage(responseObject.message)
          : `Request failed with status ${response.status}`);
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
