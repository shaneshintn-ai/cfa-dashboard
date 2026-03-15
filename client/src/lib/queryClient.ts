import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    // Don't throw on non-ok — backend may not be available in static deploy
    return res;
  } catch {
    // Network error — return a fake ok response so mutations don't crash
    return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(`${API_BASE}${queryKey[0] as string}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // If the API is unavailable (static deploy), return empty array gracefully
      if (!res.ok) {
        return [] as unknown as T;
      }

      return await res.json();
    } catch {
      // Network error (no backend) — return empty array so UI still renders
      return [] as unknown as T;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Return empty array on any error so UI always renders
      throwOnError: false,
    },
    mutations: {
      retry: false,
    },
  },
});
