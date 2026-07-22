import { API_BASE_URL, apiRequest } from "@/lib/api";

export type User = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Session = {
  access_token: string;
  user: User;
};

type Filter = {
  column: string;
  operator: string;
  value: unknown;
};

type QueryState = {
  table: string;
  select?: string;
  filters: Filter[];
  order?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
  single?: boolean;
  countOnly?: boolean;
};

const TOKEN_KEY = "r2p_access_token";
const USER_KEY = "r2p_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function storeSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function phpRequest<T>(path: string, body: unknown = {}) {
  return apiRequest<T>(path, {
    method: "POST",
    token: getToken(),
    body: JSON.stringify(body),
  });
}

class PhpQueryBuilder implements PromiseLike<{ data: any; error: any; count?: number }> {
  private state: QueryState;
  private action: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private values: unknown = null;
  private shouldReturn = false;

  constructor(table: string) {
    this.state = { table, filters: [] };
  }

  select(columns = "*", options: { count?: string; head?: boolean } = {}) {
    if (this.action !== "select") {
      this.shouldReturn = true;
    }
    this.state.select = columns;
    this.state.countOnly = Boolean(options.head);
    return this;
  }

  insert(values: unknown, options: { returning?: string } = {}) {
    this.action = "insert";
    this.values = values;
    this.shouldReturn = options.returning !== "minimal";
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.values = values;
    return this;
  }

  upsert(values: unknown, _options: Record<string, unknown> = {}) {
    this.action = "upsert";
    this.values = values;
    this.shouldReturn = true;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    return this.addFilter(column, "eq", value);
  }

  neq(column: string, value: unknown) {
    return this.addFilter(column, "neq", value);
  }

  gt(column: string, value: unknown) {
    return this.addFilter(column, "gt", value);
  }

  gte(column: string, value: unknown) {
    return this.addFilter(column, "gte", value);
  }

  lt(column: string, value: unknown) {
    return this.addFilter(column, "lt", value);
  }

  lte(column: string, value: unknown) {
    return this.addFilter(column, "lte", value);
  }

  like(column: string, value: unknown) {
    return this.addFilter(column, "like", value);
  }

  ilike(column: string, value: unknown) {
    return this.addFilter(column, "ilike", value);
  }

  in(column: string, value: unknown[]) {
    return this.addFilter(column, "in", value);
  }

  is(column: string, value: unknown) {
    return this.addFilter(column, "is", value);
  }

  not(column: string, operator: string, value: unknown) {
    return this.addFilter(column, operator === "is" ? "is_not" : `not_${operator}`, value);
  }

  filter(column: string, operator: string, value: unknown) {
    return this.addFilter(column, operator, value);
  }

  match(values: Record<string, unknown>) {
    Object.entries(values).forEach(([column, value]) => this.eq(column, value));
    return this;
  }

  or(_expression: string) {
    return this;
  }

  contains(column: string, value: unknown) {
    return this.like(column, `%${String(value)}%`);
  }

  overlaps(column: string, value: unknown) {
    return this.like(column, `%${String(Array.isArray(value) ? value[0] ?? "" : value)}%`);
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.state.order = { column, ascending: options.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.state.limit = value;
    return this;
  }

  range(from: number, to: number) {
    this.state.offset = from;
    this.state.limit = Math.max(0, to - from + 1);
    return this;
  }

  single() {
    this.state.single = true;
    return this;
  }

  maybeSingle() {
    this.state.single = true;
    return this;
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private addFilter(column: string, operator: string, value: unknown) {
    this.state.filters.push({ column, operator, value });
    return this;
  }

  private async execute() {
    try {
      const payload = {
        ...this.state,
        values: this.values,
        returning: this.shouldReturn,
      };
      const endpoint = `/data/${this.action === "select" ? "query" : this.action}`;
      const result = await phpRequest<{ data: unknown; error?: unknown; count?: number }>(endpoint, payload);
      const data = this.state.single && Array.isArray(result.data) ? result.data[0] ?? null : result.data ?? null;
      return { data, error: result.error ?? null, count: result.count };
    } catch (error) {
      return { data: null, error };
    }
  }
}

function createStorageBucket(bucket: string) {
  const encodePublicPath = (path: string) => {
    const bytes = new TextEncoder().encode(path);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  return {
    async upload(path: string, file: File | Blob) {
      const form = new FormData();
      form.append("path", path);
      form.append("file", file);

      try {
        const response = await fetch(`${API_BASE_URL}?/storage/${bucket}/upload`, {
          method: "POST",
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined,
          body: form,
        });
        const result = await response.json();
        return { data: result.data ?? null, error: response.ok ? null : result };
      } catch (error) {
        return { data: null, error };
      }
    },
    async createSignedUrl(path: string, _expiresIn?: number) {
      return phpRequest<{ data: { signedUrl: string }; error: unknown }>(`/storage/${bucket}/signed-url`, { path });
    },
    async download(path: string) {
      try {
        const { data: { publicUrl } } = this.getPublicUrl(path);
        const response = await fetch(publicUrl, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined,
        });
        if (!response.ok) {
          return { data: null, error: new Error(`Download failed with status ${response.status}`) };
        }

        return { data: await response.blob(), error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `${API_BASE_URL}?/storage/${encodeURIComponent(bucket)}/public/${encodePublicPath(path)}` } };
    },
  };
}

export const supabase = {
  from(table: string) {
    return new PhpQueryBuilder(table);
  },
  auth: {
    async getUser() {
      return { data: { user: getStoredUser() }, error: null };
    },
    async getSession() {
      const token = getToken();
      const user = getStoredUser();
      return { data: { session: token && user ? { access_token: token, user } : null }, error: null };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      const token = getToken();
      const user = getStoredUser();
      setTimeout(() => callback("INITIAL_SESSION", token && user ? { access_token: token, user } : null), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword(credentials: { email: string; password: string }) {
      try {
        const result = await apiRequest<{ data: { token: string; user: User } }>("/auth/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        storeSession(result.data.token, result.data.user);
        return { data: { user: result.data.user, session: { access_token: result.data.token, user: result.data.user } }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    },
    async signUp(payload: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const data = {
          email: payload.email,
          password: payload.password,
          ...(payload.options?.data ?? {}),
          first_name: payload.options?.data?.first_name ?? payload.options?.data?.firstName ?? "",
          last_name: payload.options?.data?.last_name ?? payload.options?.data?.lastName ?? "",
        };
        const result = await apiRequest<{ data: { token: string; user: User } }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(data),
        });
        storeSession(result.data.token, result.data.user);
        return { data: { user: result.data.user, session: { access_token: result.data.token, user: result.data.user } }, error: null };
      } catch (error) {
        return { data: { user: null, session: null }, error };
      }
    },
    async signOut() {
      clearSession();
      return { error: null };
    },
    async updateUser(values: { password?: string; currentPassword?: string; current_password?: string; data?: Record<string, unknown> }) {
      try {
        if (values.password) {
          await apiRequest("/users/password/change", {
            method: "POST",
            token: getToken(),
            body: JSON.stringify({
              current_password: values.currentPassword ?? values.current_password,
              new_password: values.password,
            }),
          });
        }

        if (values.data) {
          const user = getStoredUser();
          const token = getToken();
          if (user && token) {
            const updatedUser = {
              ...user,
              user_metadata: {
                ...(user.user_metadata ?? {}),
                ...values.data,
              },
            };
            storeSession(token, updatedUser);
          }
        }

        return { data: { user: getStoredUser() }, error: null };
      } catch (error) {
        return { data: { user: getStoredUser() }, error };
      }
    },
  },
  functions: {
    async invoke(name: string, options: { body?: unknown } = {}) {
      try {
        return await phpRequest(`/functions/${name}`, options.body ?? {});
      } catch (error) {
        return { data: null, error };
      }
    },
  },
  storage: {
    from(bucket: string) {
      return createStorageBucket(bucket);
    },
  },
  rpc(name: string, body: unknown = {}) {
    return phpRequest(`/functions/${name}`, body);
  },
  channel() {
    return {
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
      unsubscribe() {},
    };
  },
  removeChannel() {},
};
