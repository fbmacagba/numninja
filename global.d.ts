import type { FirecrawlService } from './lib/firecrawl';

declare global {
  var firecrawl: FirecrawlService | undefined;
}

export {};
