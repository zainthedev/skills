// dev.to articles for the topic's tags, top of the past year. Each article is a candidate
// resource with its reaction count as the score. Bodies are not fetched.

import { GENERIC_RETRY } from './context.ts';
import type { ScoutContext } from './context.ts';
import { parseDevtoArticles } from './parse-devto.ts';
import { topicWords } from './fetch-se.ts';

const MAX_TAGS = 2;
const MIN_REACTIONS = 10;
const MAX_ARTICLES_PER_TAG = 15;

/** dev.to tags are lowercase alphanumerics: "Node.js" becomes node, "C#" becomes csharp. */
export function topicTags(topic: string): string[] {
  return topicWords(topic)
    .map((w) => w.replace(/\+\+/g, 'pp').replace(/#/g, 'sharp').replace(/[^a-z0-9]/g, ''))
    .filter((w) => w.length >= 2)
    .slice(0, MAX_TAGS);
}

export function devtoUrl(tag: string): string {
  return `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&top=365&per_page=20`;
}

export async function scoutDevto(ctx: ScoutContext, topic: string): Promise<void> {
  for (const tag of topicTags(topic)) {
    const { res, json } = await ctx.http.json({ kind: 'devto', url: devtoUrl(tag), limiter: ctx.limiters.devto, retry: GENERIC_RETRY, deadline: ctx.discoveryDeadline });
    if (res.skipped) return;
    if (!res.ok || !json) continue;
    const articles = parseDevtoArticles(json)
      .filter((a) => a.reactions >= MIN_REACTIONS)
      .sort((a, b) => b.reactions - a.reactions)
      .slice(0, MAX_ARTICLES_PER_TAG);
    for (const a of articles) {
      ctx.index.add(
        a.url,
        { source: 'devto', thread_url: a.url, date: a.date, score: a.reactions, rank: null, excerpt: a.description.slice(0, 220) },
        { key: `devto:${a.id}`, title: a.title, titlePriority: 3 },
      );
    }
    ctx.log(`[scout] dev.to #${tag}: ${articles.length} articles with ${MIN_REACTIONS}+ reactions in the past year`);
  }
}
