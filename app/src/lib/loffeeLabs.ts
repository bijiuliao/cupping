import type { Bean } from './types';

const BASE_URL = 'https://loffeelabs.com/api/v2';

export const hasLoffeeApiKey = Boolean(import.meta.env.VITE_LOFFEE_API_KEY);

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

/** Searches Loffee Labs' bean database. Throws a Chinese, user-facing message on failure. */
export async function searchLoffeeBeans(query: string, limit = 20): Promise<Bean[]> {
  const apiKey = import.meta.env.VITE_LOFFEE_API_KEY;
  if (!apiKey) throw new Error('尚未設定 Loffee Labs API key');

  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
    fields: 'roaster,roast-name,origin,process,variety,producer',
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/beans?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    throw new Error('無法連線到 Loffee Labs，請檢查網路連線');
  }

  if (res.status === 401) throw new Error('Loffee Labs API key 無效或未授權');
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

// ---- public, unauthenticated lookup-list endpoints (no API key required) --------

async function fetchFlatList(endpoint: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}?flat=true`);
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
