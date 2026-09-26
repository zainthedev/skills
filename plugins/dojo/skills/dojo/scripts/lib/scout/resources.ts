// Groups mentions by canonical URL. One ResourceDraft per resource; the draft keeps the sets
// the fetchers add to (curated labels, HN item ids) and is finalised by score.ts.

import { usableTitle } from './text.ts';
import type { Freshness, Mention } from './types.ts';
import { canonicalise } from './urls.ts';

export interface ResourceDraft {
  url: string;
  domain: string;
  title: string | null;
  titlePriority: number;
  mentions: Mention[];
  /** Dedupe keys of the mentions already recorded, such as reddit-comment:<id>. */
  keys: Set<string>;
  /** HN item ids from the last 24 months that carry the URL. */
  hnItems24m: Set<string>;
  curated: Set<string>;
  freshness: Freshness | null;
  stars?: number;
  views?: number;
}

export interface AddOptions {
  /** Identifies the comment, page or item the mention comes from, so one item yields one mention per resource. */
  key: string;
  title?: string | null;
  /** Higher wins: 1 anchor text in a comment, 2 wiki anchor, 3 story or article title, 4 GitHub, 5 page title. */
  titlePriority?: number;
}

export class ResourceIndex {
  private drafts = new Map<string, ResourceDraft>();

  /** Records a mention. Returns the draft, or null when the URL is dropped by the canonicalisation rules. */
  add(rawUrl: string, mention: Mention, opts: AddOptions): ResourceDraft | null {
    const canonical = canonicalise(rawUrl);
    if (!canonical) return null;
    let draft = this.drafts.get(canonical.url);
    if (!draft) {
      draft = {
        url: canonical.url,
        domain: canonical.domain,
        title: null,
        titlePriority: 0,
        mentions: [],
        keys: new Set(),
        hnItems24m: new Set(),
        curated: new Set(),
        freshness: null,
      };
      this.drafts.set(canonical.url, draft);
    }
    offerTitle(draft, opts.title, opts.titlePriority ?? 1);
    if (draft.keys.has(opts.key)) return draft;
    draft.keys.add(opts.key);
    draft.mentions.push(mention);
    return draft;
  }

  /** The draft for a URL that was mentioned before, or undefined. Never creates one. */
  find(rawUrl: string): ResourceDraft | undefined {
    const canonical = canonicalise(rawUrl);
    return canonical ? this.drafts.get(canonical.url) : undefined;
  }

  all(): ResourceDraft[] {
    return [...this.drafts.values()];
  }

  get size(): number {
    return this.drafts.size;
  }
}

export function offerTitle(draft: ResourceDraft, title: string | null | undefined, priority: number): void {
  const t = usableTitle(title);
  if (!t) return;
  if (priority > draft.titlePriority) {
    draft.title = t;
    draft.titlePriority = priority;
  }
}
