import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export type UnauthorizedBehavior = "throw" | "returnNull";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      // 🔧 추가: 캐시 방지 헤더로 실시간 데이터 보장
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // 🔧 수정: 실시간 연동 최적화
      refetchInterval: 3000, // 3초마다 자동 갱신
      refetchOnWindowFocus: true, // 윈도우 포커스시 갱신
      staleTime: 1000, // 1초 후 stale 처리 (실시간 반영)
      gcTime: 5 * 60 * 1000, // 5분 후 가비지 컬렉션
      retry: 1, // 1회 재시도
      refetchOnMount: true, // 마운트시 항상 갱신
      refetchOnReconnect: true, // 재연결시 갱신
    },
    mutations: {
      retry: 1, // 1회 재시도
    },
  },
});
