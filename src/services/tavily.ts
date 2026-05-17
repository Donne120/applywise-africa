/**
 * Tavily web search — purpose-built for LLM-driven discovery flows.
 *
 * Tavily returns a list of real web pages with titles, URLs, snippets, and
 * (optionally) a synthesized answer. We use it to ground Discover's
 * scholarship search in actual scholarship pages rather than AI guesses.
 *
 * Free tier: 1,000 searches/month. Get a key at https://tavily.com.
 * Set VITE_TAVILY_API_KEY in .env to enable.
 */

export interface TavilyResult {
  title: string;
  url: string;
  content: string;     // page snippet
  score: number;       // 0..1 relevance
  publishedDate?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;     // AI summary if requested
  results: TavilyResult[];
}

export function isTavilyConfigured(): boolean {
  return !!(import.meta.env.VITE_TAVILY_API_KEY as string | undefined)?.trim();
}

/**
 * Search the live web for scholarship pages matching the user's filters.
 * Returns up to `maxResults` results. Throws on hard failures; caller
 * should catch and fall back gracefully.
 */
export async function tavilySearch(query: string, opts?: {
  maxResults?: number;
  includeAnswer?: boolean;
  searchDepth?: 'basic' | 'advanced';
  /** Restrict to certain domains, e.g. official scholarship sites. */
  includeDomains?: string[];
}): Promise<TavilySearchResponse> {
  const key = (import.meta.env.VITE_TAVILY_API_KEY as string | undefined)?.trim();
  if (!key) {
    throw new Error('Tavily API key not configured. Set VITE_TAVILY_API_KEY in .env.');
  }

  const body = {
    api_key: key,
    query,
    search_depth: opts?.searchDepth ?? 'advanced',
    include_answer: opts?.includeAnswer ?? false,
    max_results: opts?.maxResults ?? 8,
    include_domains: opts?.includeDomains ?? [],
  };

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tavily error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    query: data.query ?? query,
    answer: data.answer,
    results: (data.results ?? []) as TavilyResult[],
  };
}
