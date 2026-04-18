import { NextResponse } from 'next/server';
import {
  FirecrawlRequestError,
  FirecrawlScrapeFormat,
  firecrawl,
} from '../../../../lib/firecrawl';

export const runtime = 'edge';

const ALLOWED_FORMATS = new Set<FirecrawlScrapeFormat>(['markdown', 'html', 'rawHtml', 'links']);

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'The Firecrawl smoke-test route is disabled outside development.' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const targetUrl = validateRequestBody(body);

    const result = await firecrawl.scrape({
      url: targetUrl.toString(),
      formats: getFormats(body?.formats),
      onlyMainContent: body?.onlyMainContent !== false,
      maxAge: body?.maxAge,
      timeout: body?.timeout,
      storeInCache: body?.storeInCache === true,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: targetUrl.toString(),
        title: result.data.metadata?.title ?? null,
        description: result.data.metadata?.description ?? null,
        markdown: result.data.markdown ?? null,
        html: result.data.html ?? null,
        rawHtml: result.data.rawHtml ?? null,
        links: result.data.links ?? [],
        warning: result.data.warning ?? null,
        metadata: result.data.metadata ?? {},
      },
    });
  } catch (error) {
    if (error instanceof FirecrawlRequestError) {
      return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.status });
    }

    console.error('Firecrawl scrape setup error:', error);
    return NextResponse.json({ error: 'Firecrawl request failed.' }, { status: 500 });
  }
}

function validateRequestBody(body: unknown): URL {
  if (!body || typeof body !== 'object') {
    throw new FirecrawlRequestError('Request body must be a JSON object.', 400);
  }

  const { url } = body as { url?: unknown };
  if (typeof url !== 'string' || !url.trim()) {
    throw new FirecrawlRequestError('The request body must include a non-empty url.', 400);
  }

  return firecrawl.validateUrl(url.trim());
}

function getFormats(value: unknown): FirecrawlScrapeFormat[] {
  if (!Array.isArray(value)) {
    return ['markdown'];
  }

  const formats = value
    .filter((entry): entry is FirecrawlScrapeFormat => typeof entry === 'string' && ALLOWED_FORMATS.has(entry as FirecrawlScrapeFormat));

  return formats.length ? Array.from(new Set(formats)) : ['markdown'];
}
