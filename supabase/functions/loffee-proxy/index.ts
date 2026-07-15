// Supabase Edge Function: server-side proxy for Loffee Labs' bean database API.
//
// loffeelabs.com sends no Access-Control-Allow-Origin header on any endpoint,
// so a browser can never call it directly no matter how the request is
// authenticated — the request reaches their server and gets a 200, but the
// browser refuses to hand the response to our JS. Server-to-server calls
// (this function, running on Deno, not in a browser) aren't subject to CORS,
// so this function calls Loffee Labs on the app's behalf and re-serves the
// result with our own permissive CORS headers.
//
// The frontend calls this function, not loffeelabs.com, for every Loffee
// Labs request: /beans (search), /origins, /processes, /varieties, /roasters.
// Whatever path follows "loffee-proxy/" is forwarded as-is to
// https://loffeelabs.com/api/v2/<that path>, with our own api_key appended
// server-side — the key never reaches the browser.
//
// Deploy (from the repo root, with the Supabase CLI installed + `supabase login` done):
//   supabase link --project-ref <your-project-ref>
//   supabase functions deploy loffee-proxy
//   supabase secrets set LOFFEE_API_KEY=your_actual_key_here
//
// Then in app/.env.local, set VITE_LOFFEE_PROXY_ENABLED=true to reveal the
// "搜尋 Loffee Labs" option in the app (VITE_SUPABASE_URL/ANON_KEY must also
// be set, since the frontend calls this function through your Supabase project).

const LOFFEE_BASE = 'https://loffeelabs.com/api/v2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const apiKey = Deno.env.get('LOFFEE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'LOFFEE_API_KEY secret is not set on this Supabase project' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  // Strip everything up to and including the function's own name, so
  // ".../functions/v1/loffee-proxy/beans" forwards to ".../api/v2/beans".
  const subPath = url.pathname.replace(/^.*\/loffee-proxy/, '') || '/beans';

  const upstreamParams = new URLSearchParams(url.search);
  upstreamParams.set('api_key', apiKey);

  try {
    const upstreamRes = await fetch(`${LOFFEE_BASE}${subPath}?${upstreamParams.toString()}`);
    const body = await upstreamRes.text();
    return new Response(body, {
      status: upstreamRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream request to Loffee Labs failed' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
