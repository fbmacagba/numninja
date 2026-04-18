import 'server-only';

const DEFAULT_FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;
const MAX_CACHE_AGE_MS = 172_800_000;

export type FirecrawlScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links';

export interface FirecrawlScrapeRequest {
  url: string;
  formats?: FirecrawlScrapeFormat[];
  onlyMainContent?: boolean;
  maxAge?: number;
  timeout?: number;
  storeInCache?: boolean;
}

interface FirecrawlMetadata {
  title?: string;
  description?: string;
  language?: string;
  sourceURL?: string;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

export interface FirecrawlScrapeResponse {
  success: boolean;
  data: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    metadata?: FirecrawlMetadata;
    warning?: string;
  };
}

export interface FirecrawlService {
  scrape(request: FirecrawlScrapeRequest): Promise<FirecrawlScrapeResponse>;
  validateUrl(value: string): URL;
}

export class FirecrawlRequestError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = 'FirecrawlRequestError';
    this.status = status;
    this.details = details;
  }
}

export function validateFirecrawlTargetUrl(value: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new FirecrawlRequestError('A valid absolute URL is required.', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new FirecrawlRequestError('Only http and https URLs are supported.', 400);
  }

  if (parsed.username || parsed.password) {
    throw new FirecrawlRequestError('Embedded URL credentials are not allowed.', 400);
  }

  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new FirecrawlRequestError(
      'Private, loopback, and local-network targets are not allowed.',
      400,
    );
  }

  parsed.hash = '';

  return parsed;
}

async function performFirecrawlScrape(
  request: FirecrawlScrapeRequest,
): Promise<FirecrawlScrapeResponse> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();

  if (!apiKey) {
    throw new FirecrawlRequestError(
      'FIRECRAWL_API_KEY is missing. Add it to your local environment before using Firecrawl.',
      500,
    );
  }

  const apiUrl = getFirecrawlApiUrl();
  const response = await fetch(`${apiUrl}/scrape`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: request.url,
      formats: request.formats?.length ? request.formats : ['markdown'],
      onlyMainContent: request.onlyMainContent ?? true,
      maxAge: normalizeInteger(request.maxAge, 0, MAX_CACHE_AGE_MS, 0),
      timeout: normalizeInteger(request.timeout, 1_000, MAX_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
      storeInCache: request.storeInCache ?? false,
    }),
  });

  const payload = await readFirecrawlResponse(response);

  if (!response.ok) {
    const message =
      getErrorMessage(payload) ?? `Firecrawl request failed with status ${response.status}.`;
    throw new FirecrawlRequestError(message, response.status, payload);
  }

  if (!payload || typeof payload !== 'object' || !('success' in payload) || !('data' in payload)) {
    throw new FirecrawlRequestError('Firecrawl returned an unexpected response shape.', 502, payload);
  }

  return payload as FirecrawlScrapeResponse;
}

function createFirecrawlService(): FirecrawlService {
  return {
    scrape: performFirecrawlScrape,
    validateUrl: validateFirecrawlTargetUrl,
  };
}

const globalScope = globalThis as typeof globalThis & {
  firecrawl?: FirecrawlService;
};

export const firecrawl = globalScope.firecrawl ?? createFirecrawlService();

if (!globalScope.firecrawl) {
  globalScope.firecrawl = firecrawl;
}

export async function scrapeWithFirecrawl(
  request: FirecrawlScrapeRequest,
): Promise<FirecrawlScrapeResponse> {
  return firecrawl.scrape(request);
}

function getFirecrawlApiUrl(): string {
  const raw = process.env.FIRECRAWL_API_URL?.trim() || DEFAULT_FIRECRAWL_API_URL;
  return raw.replace(/\/+$/, '');
}

function normalizeInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value as number);
  return Math.min(Math.max(normalized, min), max);
}

async function readFirecrawlResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }

  if ('message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  return null;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const isIpv6Address = normalized.includes(':');

  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal')
  ) {
    return true;
  }

  if (isIpv6Address) {
    if (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }

    if (normalized.startsWith('fe80:')) {
      return true;
    }

    return false;
  }

  const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const octets = ipv4Match.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  if (first === 10 || first === 127 || first === 0) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 100 && second >= 64 && second <= 127) {
    return true;
  }

  return false;
}
