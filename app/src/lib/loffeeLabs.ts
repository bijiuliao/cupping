import type { Bean } from './types';

// loffeelabs.com sends no CORS headers on any endpoint, so the browser can
// never call it directly (confirmed live: requests reach their server and
// get a 200, but the browser blocks the response from reaching our JS). All
// calls go through a Supabase Edge Function proxy instead — see
// supabase/functions/loffee-proxy/index.ts for the server side and its
// deploy instructions.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const PROXY_BASE = supabaseUrl ? `${supabaseUrl}/functions/v1/loffee-proxy` : null;

export const hasLoffeeProxy = Boolean(PROXY_BASE && supabaseAnonKey && import.meta.env.VITE_LOFFEE_PROXY_ENABLED);

function proxyFetch(path: string, params: URLSearchParams): Promise<Response> {
  return fetch(`${PROXY_BASE}${path}?${params}`, {
    headers: { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey! },
  });
}

function mapRow(r: Record<string, unknown>): Bean {
  return {
    name: String(r['roast-name'] ?? ''),
    origin: String(r.origin ?? ''),
    process: String(r.process ?? ''),
    variety: String(r.variety ?? ''),
    roaster: String(r.roaster ?? ''),
    producer: String(r.producer ?? ''),
  };
}

/** Searches Loffee Labs' bean database (via the Supabase proxy). Throws a Chinese, user-facing message on failure. */
export async function searchLoffeeBeans(query: string, limit = 20): Promise<Bean[]> {
  if (!PROXY_BASE) throw new Error('尚未設定 Loffee Labs 代理（需要先設定 Supabase）');

  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
    fields: 'roaster,roast-name,origin,process,variety,producer',
  });

  let res: Response;
  try {
    res = await proxyFetch('/beans', params);
  } catch {
    throw new Error('無法連線到 Loffee Labs 代理，請檢查網路連線');
  }

  if (res.status === 429) throw new Error('已超過 Loffee Labs 查詢額度或頻率限制，請稍後再試');
  if (!res.ok) throw new Error('Loffee Labs 查詢失敗（狀態碼 ' + res.status + '）');

  const data: unknown = await res.json();
  const rows = Array.isArray(data)
    ? data
    : ((data as { data?: unknown[]; results?: unknown[]; beans?: unknown[] })?.data ??
        (data as { results?: unknown[] })?.results ??
        (data as { beans?: unknown[] })?.beans ??
        []);
  return (rows as Record<string, unknown>[]).map(mapRow).filter((b) => b.name.trim());
}

// ---- Loffee Labs' public lookup lists (still routed through the proxy — they have no CORS either) --------

async function fetchFlatList(endpoint: string): Promise<string[]> {
  if (!PROXY_BASE) return [];
  try {
    const res = await proxyFetch(`/${endpoint}`, new URLSearchParams({ flat: 'true' }));
    if (!res.ok) return [];
    const data: unknown = await res.json();
    const rows = Array.isArray(data) ? data : ((data as { data?: unknown[] })?.data ?? []);
    return (rows as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  } catch {
    return [];
  }
}

// Memoized per page load — these lists rarely change and every caller wants the same data.
let originsPromise: Promise<string[]> | null = null;
let processesPromise: Promise<string[]> | null = null;
let varietiesPromise: Promise<string[]> | null = null;

export function fetchLoffeeOrigins(): Promise<string[]> {
  return (originsPromise ??= fetchFlatList('origins'));
}

export function fetchLoffeeProcesses(): Promise<string[]> {
  return (processesPromise ??= fetchFlatList('processes'));
}

export function fetchLoffeeVarieties(): Promise<string[]> {
  return (varietiesPromise ??= fetchFlatList('varieties'));
}
