// Shared types for the scout. Vocabulary follows plugins/dojo/CONTEXT.md: a resource is an
// external page a lesson can send the learner to, a mention is one place a community named it,
// and the scout computes the objective parts of the rubric from those mentions.

export type MentionSource =
  | 'reddit-wiki'
  | 'reddit-thread'
  | 'reddit-comment'
  | 'hn-story'
  | 'hn-comment'
  | 'stackexchange'
  | 'devto';

export type SourceKind =
  | 'reddit-wiki'
  | 'reddit-search'
  | 'reddit-comments'
  | 'arctic-shift'
  | 'hn'
  | 'stackexchange'
  | 'devto'
  | 'github'
  | 'head';

export type FreshnessMethod = 'github' | 'last-modified' | 'youtube' | 'none';

export interface Mention {
  source: MentionSource;
  /** The thread, page or capture the mention was found in. */
  thread_url: string;
  /** YYYY-MM-DD, or null when the source carries no date. */
  date: string | null;
  /** Vote score of the comment, answer, story or article, or null when unknown. */
  score: number | null;
  /** 1 when this is the top-ranked reply of its thread; null when the rank is unknown. */
  rank: number | null;
  /** One line of text around the link. */
  excerpt: string;
}

export interface Freshness {
  /** YYYY-MM-DD of the check. */
  checked: string;
  /** ISO timestamp or YYYY-MM-DD of the last verified update, or null. */
  last_modified: string | null;
  method: FreshnessMethod;
  /** HTTP status of the verification request, when one was made. */
  status?: number | null;
  /** Where the resource redirected to, when the final URL differs from the canonical one. */
  final_url?: string;
  note?: string;
}

export interface Resource {
  url: string;
  domain: string;
  title: string | null;
  mentions: Mention[];
  breadth: number;
  depth: number;
  curated: string[];
  freshness: Freshness;
  hn_mentions_24m: number;
  objective_score: number;
  max_objective: number;
  stars?: number;
  views?: number;
}

export interface Thread {
  source: 'reddit' | 'hn';
  id: string;
  title: string;
  url: string;
  date: string | null;
  score: number | null;
  num_comments: number | null;
  subreddit: string | null;
}

export interface SourceRecord {
  kind: SourceKind;
  url: string;
  status: 'ok' | 'error' | 'skipped';
  note: string;
}

export interface Budget {
  seconds: number;
  used_seconds: number;
  exhausted: boolean;
}

export interface ScoutOutput {
  dojo_scout: '0.1.0';
  topic: string;
  generated: string;
  subreddits: string[];
  keywords: string[];
  budget: Budget;
  sources: SourceRecord[];
  threads: Thread[];
  resources: Resource[];
  thin_evidence: boolean;
}

// Intermediate shapes shared by the parsers and the fetchers.

export interface ExtractedLink {
  /** The URL as written in the source, before canonicalisation. */
  url: string;
  /** The anchor or link text; equals the URL for bare links. */
  text: string;
}

export interface RedditComment {
  id: string;
  threadId: string;
  author: string | null;
  date: string | null;
  score: number | null;
  isSubmitter: boolean;
  text: string;
  links: ExtractedLink[];
  permalink: string;
  /** 1-based position in the top-sorted comments feed, or null when the comment came only from Arctic Shift. */
  feedRank: number | null;
}
