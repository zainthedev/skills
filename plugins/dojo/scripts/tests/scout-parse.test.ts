// Parser, canonicalisation, grouping and schema tests for the scout, against recorded fixtures.
// No network: the fixtures under fixtures/scout/ were captured with curl and trimmed.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { withinMonths } from '../lib/scout/context.ts';
import type { ScoutContext } from '../lib/scout/context.ts';
import { topicTags } from '../lib/scout/fetch-devto.ts';
import { commentRanks, createRedditState, emitRedditMentions, mergeComment, rankThreads } from '../lib/scout/fetch-reddit.ts';
import { topicTag, topicWords } from '../lib/scout/fetch-se.ts';
import { parseYoutubePage, verificationCandidates } from '../lib/scout/fetch-verify.ts';
import { captureDate, waybackUrl } from '../lib/scout/fetch-wayback.ts';
import { assembleOutput, formatOutput } from '../lib/scout/output.ts';
import { arcticError, parseArcticComments, parseArcticPosts } from '../lib/scout/parse-arctic.ts';
import { parseDevtoArticles } from '../lib/scout/parse-devto.ts';
import { parseHnItem, parseHnSearch } from '../lib/scout/parse-hn.ts';
import { parseAtomFeed, parseCommentsFeed, parseSearchFeed } from '../lib/scout/parse-reddit.ts';
import { parseSeAnswers, parseSeQuestions } from '../lib/scout/parse-se.ts';
import { parseWikiPage } from '../lib/scout/parse-wiki.ts';
import { ResourceIndex } from '../lib/scout/resources.ts';
import { decodeEntities, excerptAround, extractLinksFromHtml, extractLinksFromMarkdown, htmlToText, markdownToText, toDay, trimUrlPunctuation, usableTitle } from '../lib/scout/text.ts';
import type { Mention, ScoutOutput } from '../lib/scout/types.ts';
import { canonicalise, githubRepo, urlStem, youtubeId } from '../lib/scout/urls.ts';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/scout/${name}`, import.meta.url), 'utf8');
const json = (name: string): unknown => JSON.parse(fixture(name));

const mention = (source: Mention['source'], thread: string, extra: Partial<Mention> = {}): Mention => ({
  source,
  thread_url: thread,
  date: '2024-01-01',
  score: null,
  rank: null,
  excerpt: 'x',
  ...extra,
});

test('text: entities, html to text, titles and dates', () => {
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#39;d&#39; &#x27;e&#x27; &quot;f&quot; &mdash; &unknown;'), 'a & b <c> \'d\' \'e\' "f" - &unknown;');
  assert.equal(htmlToText('<p>Hello <a href="https://x.y">there</a></p><p>two</p><script>bad()</script>'), 'Hello there\ntwo');
  assert.equal(markdownToText('Read [the docs](https://expressjs.com) **now** `code`'), 'Read the docs now code');
  assert.equal(usableTitle('https://expressjs.com'), null);
  assert.equal(usableTitle('[link]'), null);
  assert.equal(usableTitle('  Full   Stack Open '), 'Full Stack Open');
  assert.equal(toDay('2023-02-23T12:39:37+00:00'), '2023-02-23');
  assert.equal(toDay(1677155977), '2023-02-23');
  assert.equal(toDay('Fri, 11 Sep 2026 18:18:19 GMT'), '2026-09-11');
  assert.equal(toDay('nonsense'), null);
});

test('text: link extraction from html and markdown', () => {
  const html = '<div class="md"><p>I liked <a href="https://www.freecodecamp.org/learn/">FCC</a> and https://expressjs.com/en/guide/routing.html.</p></div>';
  assert.deepEqual(extractLinksFromHtml(html), [
    { url: 'https://www.freecodecamp.org/learn/', text: 'FCC' },
    { url: 'https://expressjs.com/en/guide/routing.html', text: 'https://expressjs.com/en/guide/routing.html' },
  ]);
  const md = 'see [FSO](https://fullstackopen.com/en/part3/) and https://example.com/a\\_b. Also (https://en.wikipedia.org/wiki/Foo_(bar)).';
  assert.deepEqual(
    extractLinksFromMarkdown(md).map((l) => l.url),
    ['https://fullstackopen.com/en/part3/', 'https://example.com/a_b', 'https://en.wikipedia.org/wiki/Foo_(bar)'],
  );
  assert.equal(extractLinksFromMarkdown(md)[0].text, 'FSO');
  assert.equal(trimUrlPunctuation('https://example.com/x),'), 'https://example.com/x');
  assert.equal(trimUrlPunctuation('https://en.wikipedia.org/wiki/Foo_(bar))'), 'https://en.wikipedia.org/wiki/Foo_(bar)');
});

test('text: excerpt is one line around the first needle found', () => {
  const text = `${'before '.repeat(30)}I liked the FCC one. https://www.freecodecamp.org/learn/back-end-development-and-apis/ it is great ${'after '.repeat(30)}`;
  const out = excerptAround(text, ['nope', 'https://www.freecodecamp.org/learn/back-end-development-and-apis/'], 30);
  assert.ok(out.startsWith('...'));
  assert.ok(out.endsWith('...'));
  assert.ok(out.includes('I liked the FCC one.'));
  assert.ok(out.length <= 220);
  assert.equal(excerptAround('short text with no needle', ['zzz']), 'short text with no needle');
});

test('urls: canonicalisation cases', () => {
  const cases: [string, string | null][] = [
    ['http://www.Example.com/path/?utm_source=x&b=2&a=1#frag', 'https://example.com/path?a=1&b=2'],
    ['https://youtu.be/Oe421EPjeBE?t=120', 'https://youtube.com/watch?v=Oe421EPjeBE'],
    ['https://www.youtube.com/watch?v=Oe421EPjeBE&t=42s&feature=share', 'https://youtube.com/watch?v=Oe421EPjeBE'],
    ['https://m.youtube.com/watch?feature=youtu.be&v=Oe421EPjeBE', 'https://youtube.com/watch?v=Oe421EPjeBE'],
    ['https://www.youtube.com/embed/Oe421EPjeBE', 'https://youtube.com/watch?v=Oe421EPjeBE'],
    ['https://www.youtube.com/playlist?list=PL4cUxeGkcC9jsz4LDYc6kv3ymONOKxwBU&si=abc', 'https://youtube.com/playlist?list=PL4cUxeGkcC9jsz4LDYc6kv3ymONOKxwBU'],
    ['https://www.reddit.com/r/node/comments/abc/', null],
    ['https://i.redd.it/x.png', null],
    ['https://imgur.com/a/x', null],
    ['https://twitter.com/x/status/1', null],
    ['https://example.com/diagram.png', null],
    ['https://github.com/ishtms/NodeBook/blob/main/README.md', 'https://github.com/ishtms/nodebook'],
    ['https://github.com/ishtms/nodebook?tab=readme-ov-file', 'https://github.com/ishtms/nodebook'],
    ['https://github.com/sponsors/sindresorhus', null],
    ['https://github.com', null],
    ['https://expressjs.com/', 'https://expressjs.com'],
    ['https://web.archive.org/web/20230101000000/https://example.com/page', 'https://example.com/page'],
    ['https://www.amazon.com/Some-Book/dp/1617294934/ref=sr_1_1?keywords=x&tag=aff-20', 'https://amazon.com/dp/1617294934'],
    ['https://medium.com/@x/post-123?source=rss', 'https://medium.com/@x/post-123'],
    ['https://en.m.wikipedia.org/wiki/Node.js', 'https://en.wikipedia.org/wiki/Node.js'],
    ['https://Example.com//double//slash/index.html', 'https://example.com/double/slash'],
    ['https://news.ycombinator.com/item?id=1', null],
    ['mailto:x@y.com', null],
    ['not a url', null],
  ];
  for (const [input, expected] of cases) {
    assert.equal(canonicalise(input)?.url ?? null, expected, input);
  }
  assert.equal(canonicalise('https://www.Fullstackopen.com/en/part3/')?.domain, 'fullstackopen.com');
  assert.deepEqual(githubRepo('https://github.com/ishtms/nodebook/tree/main/src'), { owner: 'ishtms', repo: 'nodebook' });
  assert.equal(githubRepo('https://github.com/topics/express'), null);
  assert.equal(youtubeId('https://youtube.com/watch?v=Oe421EPjeBE'), 'Oe421EPjeBE');
  assert.equal(youtubeId('https://youtube.com/playlist?list=x'), null);
  assert.equal(urlStem('https://fullstackopen.com/en/part3'), 'fullstackopen.com/en/part3');
});

test('reddit search feed: threads in feed order with dates, subreddit and body links', () => {
  const feed = parseAtomFeed(fixture('reddit-search.rss'));
  assert.equal(feed.title, 'node: search results - learn express');
  const threads = parseSearchFeed(fixture('reddit-search.rss'), 'node');
  assert.equal(threads.length, 4);
  const first = threads[0];
  assert.equal(first.thread.id, '1n4w1nw');
  assert.equal(first.thread.source, 'reddit');
  assert.equal(first.thread.subreddit, 'node');
  assert.equal(first.thread.date, '2025-08-31');
  assert.ok(first.thread.title.startsWith('NodeBook'));
  assert.equal(first.thread.url, 'https://www.reddit.com/r/node/comments/1n4w1nw/nodebook_the_nodejs_book_i_wish_i_had_and_its/');
  assert.deepEqual(first.links.slice(0, 2).map((l) => l.url), ['https://www.thenodebook.com', 'https://github.com/ishtms/nodebook']);
  assert.ok(first.text.includes('240 chapters'));
  assert.deepEqual(threads.map((t) => t.thread.id), ['1n4w1nw', '174jrvb', '1ei71dk', 'ogtkrr']);
});

test('reddit comments feed: post plus comments with feed rank and links, no scores', () => {
  const { post, comments } = parseCommentsFeed(fixture('reddit-comments.rss'), 'node');
  assert.equal(post?.thread.id, '119wqbn');
  assert.equal(post?.thread.title, 'Best Resources to learn Node js');
  assert.equal(comments.length, 4);
  assert.equal(comments[0].id, 'j9oezap');
  assert.equal(comments[0].feedRank, 1);
  assert.equal(comments[0].score, null);
  assert.equal(comments[0].author, 'lovesrayray2018');
  assert.equal(comments[0].date, '2023-02-23');
  assert.equal(comments[0].threadId, '119wqbn');
  assert.deepEqual(comments[0].links.map((l) => l.url), ['https://www.freecodecamp.org/learn/back-end-development-and-apis/']);
  assert.ok(comments[0].permalink.endsWith('/j9oezap/'));
  assert.deepEqual(comments[3].links.map((l) => l.url), ['https://www.tutorialspoint.com/nodejs/nodejs_express_framework.htm']);
});

test('arctic shift: comments with scores, posts with counts, error envelope', () => {
  const comments = parseArcticComments(json('arctic-comments.json'));
  assert.equal(comments.length, 6);
  const fcc = comments.find((c) => c.id === 'j9oezap');
  assert.ok(fcc);
  assert.equal(fcc.score, 9);
  assert.equal(fcc.threadId, '119wqbn');
  assert.equal(fcc.date, '2023-02-23');
  assert.equal(fcc.feedRank, null);
  assert.equal(fcc.permalink, 'https://www.reddit.com/r/node/comments/119wqbn/best_resources_to_learn_node_js/j9oezap/');
  assert.deepEqual(fcc.links.map((l) => l.url), ['https://www.freecodecamp.org/learn/back-end-development-and-apis/']);
  assert.equal(comments.find((c) => c.id === 'j9p4zbo')?.score, -4);

  const posts = parseArcticPosts(json('arctic-posts.json'));
  assert.equal(posts.length, 2);
  const post = posts.find((p) => p.id === '119wqbn');
  assert.deepEqual(post, {
    id: '119wqbn',
    title: 'Best Resources to learn Node js',
    url: 'https://www.reddit.com/r/node/comments/119wqbn/best_resources_to_learn_node_js/',
    subreddit: 'node',
    score: 14,
    num_comments: 12,
    date: '2023-02-23',
  });

  const failure = { data: null, error: 'Timeout. Maybe slow down a bit' };
  assert.equal(arcticError(failure), 'Timeout. Maybe slow down a bit');
  assert.equal(arcticError(json('arctic-posts.json')), null);
  assert.deepEqual(parseArcticComments(failure), []);
  assert.deepEqual(parseArcticPosts('garbage'), []);
});

test('hacker news: search hits and item trees', () => {
  const search = parseHnSearch(json('hn-search.json'));
  assert.equal(search.nbHits, 70);
  assert.equal(search.stories.length, 4);
  assert.equal(search.hits.length, 4);
  const ask = search.stories[0];
  assert.equal(ask.id, '3572210');
  assert.equal(ask.points, 20);
  assert.equal(ask.num_comments, 9);
  assert.equal(ask.date, '2012-02-09');
  assert.equal(ask.url, null);
  assert.equal(ask.hnUrl, 'https://news.ycombinator.com/item?id=3572210');
  assert.equal(search.stories[1].url, 'https://learnnode.com/');
  assert.equal(search.hits[0].type, 'story');

  const item = parseHnItem(json('hn-item.json'));
  assert.ok(item);
  assert.equal(item.story.id, '3572210');
  assert.equal(item.comments.length, 9);
  assert.deepEqual(
    item.comments.filter((c) => c.rank !== null).map((c) => c.rank),
    [1, 2, 3, 4],
  );
  assert.equal(item.comments[0].storyId, '3572210');
  assert.ok(item.comments.some((c) => c.links.length > 0));
  assert.equal(parseHnItem({ nope: true }), null);
});

test('wayback wiki: links carry their heading path and line', () => {
  const page = parseWikiPage(fixture('wayback-wiki.html'), 'learnjavascript');
  assert.equal(page.title, 'index - learnjavascript');
  assert.ok(page.links.length > 50, `expected many links, got ${page.links.length}`);
  const odin = page.links.find((l) => l.url === 'https://www.theodinproject.com/');
  assert.ok(odin);
  assert.equal(odin.text, 'The Odin Project');
  assert.equal(odin.heading, 'Getting Started With JavaScript, the language > Read the sidebar first!');
  assert.ok(odin.line.startsWith('The Odin Project - More up to date'));
  const projects = page.links.find((l) => l.url === 'https://github.com/florinpop17/app-ideas');
  assert.equal(projects?.heading, 'Project Based Learning');
  assert.ok(page.links.every((l) => /^https?:\/\//.test(l.url)));
  assert.deepEqual(page.subpages, []);
  assert.equal(captureDate('https://web.archive.org/web/20251020170601id_/https://old.reddit.com/r/learnjavascript/wiki/index'), '2025-10-20');
  assert.equal(waybackUrl('node', 'faq', '2026-09-25'), 'https://web.archive.org/web/20260925id_/https://old.reddit.com/r/node/wiki/faq');
});

test('stack exchange: questions and answers ranked per question', () => {
  const questions = parseSeQuestions(json('se-search.json'));
  assert.equal(questions.error, null);
  assert.equal(questions.quotaRemaining, 298);
  assert.equal(questions.items.length, 3);
  assert.equal(questions.items[0].id, 327955);
  assert.equal(questions.items[0].score, 1151);
  assert.equal(questions.items[0].date, '2008-11-29');
  assert.ok(questions.items[0].link.startsWith('https://stackoverflow.com/questions/327955/'));

  const answers = parseSeAnswers(json('se-answers.json'));
  assert.equal(answers.items.length, 5);
  const byId = new Map(answers.items.map((a) => [a.id, a]));
  assert.equal(byId.get(328146)?.rank, 1);
  assert.equal(byId.get(327961)?.rank, 2);
  assert.equal(byId.get(150518)?.rank, 1);
  assert.equal(byId.get(157295)?.rank, 2);
  assert.equal(byId.get(2576240)?.links.length, 10);
  assert.equal(parseSeQuestions({ error_id: 502, error_message: 'throttle violation', error_name: 'throttle_violation' }).error, 'throttle_violation: throttle violation');
});

test('dev.to: articles with reactions and dates', () => {
  const articles = parseDevtoArticles(json('devto-articles.json'));
  assert.equal(articles.length, 3);
  assert.equal(articles[0].id, 2969654);
  assert.equal(articles[0].reactions, 171);
  assert.equal(articles[0].date, '2025-10-28');
  assert.equal(articles[0].url, 'https://dev.to/cristea_theodora/frontend-to-backend-from-vite-to-express-2c83');
  assert.ok(articles[0].tags.includes('express'));
  assert.deepEqual(parseDevtoArticles({ not: 'an array' }), []);
});

test('github fixtures: repository metadata and curated list links', () => {
  const repo = json('github-repo.json') as Record<string, unknown>;
  assert.equal(repo.full_name, 'sindresorhus/awesome-nodejs');
  assert.ok((repo.stargazers_count as number) >= 10000);
  assert.equal(toDay(repo.pushed_at as string), '2026-09-02');
  const links = extractLinksFromMarkdown(fixture('github-readme.md'));
  assert.ok(links.some((l) => l.url.startsWith('https://github.com/')), 'readme yields github links');
});

test('topic words become tags', () => {
  assert.deepEqual(topicWords('Node and Express'), ['node', 'express']);
  assert.deepEqual(topicWords('Learn Node.js basics'), ['node']);
  assert.deepEqual(topicTags('Node and Express'), ['node', 'express']);
  assert.deepEqual(topicTags('C# fundamentals'), ['csharp']);
  assert.equal(topicTag('Node and Express'), null);
  assert.equal(topicTag('Rust'), 'rust');
});

test('youtube page fields', () => {
  const html = '<title>Node.js and Express.js - Full Course - YouTube</title>{"viewCount":"4444271","publishDate":"2021-04-01T05:37:58-07:00","ownerChannelName":"freeCodeCamp.org"}';
  assert.deepEqual(parseYoutubePage(html), { published: '2021-04-01', views: 4444271, title: 'Node.js and Express.js - Full Course', channel: 'freeCodeCamp.org', unavailable: false });
  assert.equal(parseYoutubePage('{"playabilityStatus":{"status":"ERROR"}}').unavailable, true);
});

test('resource index: groups mentions by canonical url and dedupes by key', () => {
  const index = new ResourceIndex();
  const a = index.add('https://www.youtube.com/watch?v=Oe421EPjeBE&t=10', mention('reddit-comment', 't1', { score: 4 }), { key: 'reddit-comment:a', title: 'freeCodeCamp Node course' });
  const b = index.add('https://youtu.be/Oe421EPjeBE', mention('reddit-comment', 't2'), { key: 'reddit-comment:b' });
  assert.ok(a && b);
  assert.equal(a, b);
  assert.equal(index.size, 1);
  assert.equal(a.url, 'https://youtube.com/watch?v=Oe421EPjeBE');
  assert.equal(a.mentions.length, 2);
  index.add('https://youtu.be/Oe421EPjeBE', mention('reddit-comment', 't2'), { key: 'reddit-comment:b' });
  assert.equal(a.mentions.length, 2, 'same key is not recorded twice');
  assert.equal(a.title, 'freeCodeCamp Node course');
  index.add('https://youtu.be/Oe421EPjeBE', mention('hn-story', 'h1'), { key: 'hn-story:1', title: 'Node.js and Express.js - Full Course', titlePriority: 3 });
  assert.equal(a.title, 'Node.js and Express.js - Full Course', 'higher priority title wins');
  assert.equal(index.add('https://www.reddit.com/r/node/', mention('reddit-comment', 't1'), { key: 'x' }), null);
  assert.equal(index.find('https://m.youtube.com/watch?v=Oe421EPjeBE'), a);
  assert.equal(index.find('https://example.org/never'), undefined);
});

test('reddit merge: feed comments and arctic scores meet by id, ranks follow scores', () => {
  const state = createRedditState();
  const feed = parseCommentsFeed(fixture('reddit-comments.rss'), 'node');
  for (const c of feed.comments) mergeComment(state, c);
  for (const c of parseArcticComments(json('arctic-comments.json'))) mergeComment(state, c);
  const merged = state.comments.get('119wqbn');
  assert.ok(merged);
  assert.equal(merged.size, 6, 'four feed comments plus two arctic-only comments');
  const fcc = merged.get('j9oezap');
  assert.equal(fcc?.score, 9);
  assert.equal(fcc?.feedRank, 1);
  assert.equal(fcc?.author, 'lovesrayray2018');
  const ranks = commentRanks([...merged.values()]);
  assert.equal(ranks.get('j9oezap'), 1);
  assert.equal(ranks.get('j9p2qxu'), 2);
  assert.equal(ranks.get('j9p0il0'), 3);
  assert.equal(ranks.get('j9p4zbo'), 6, 'negative score ranks last');
  const unscored = commentRanks(feed.comments);
  assert.equal(unscored.get('j9oezap'), 1, 'without scores the feed order is the rank');
  assert.equal(unscored.get('j9p0il0'), 4);

  state.threads.set('119wqbn', feed.post!.thread);
  state.bodies.set('119wqbn', feed.post!);
  state.selected = ['119wqbn'];
  const ctx = { index: new ResourceIndex(), threads: new Map(), log: () => {} } as unknown as ScoutContext;
  emitRedditMentions(ctx, state);
  assert.equal(ctx.threads.size, 1);
  const resource = ctx.index.find('https://www.freecodecamp.org/learn/back-end-development-and-apis/');
  assert.ok(resource);
  assert.equal(resource.mentions.length, 1);
  assert.deepEqual(resource.mentions[0], {
    source: 'reddit-comment',
    thread_url: 'https://www.reddit.com/r/node/comments/119wqbn/best_resources_to_learn_node_js/',
    date: '2023-02-23',
    score: 9,
    rank: 1,
    excerpt: 'I liked the FCC one. https://www.freecodecamp.org/learn/back-end-development-and-apis/',
  });
  const tp = ctx.index.find('https://www.tutorialspoint.com/nodejs/nodejs_express_framework.htm');
  assert.equal(tp?.mentions[0].rank, 3);
  assert.equal(tp?.mentions[0].score, 2);
});

test('reddit thread ranking prefers feed position, recency and question titles, skips empty threads', () => {
  const state = createRedditState();
  const nowMs = Date.parse('2026-09-25T00:00:00Z');
  const add = (id: string, title: string, date: string, positions: number[], num_comments: number | null): void => {
    state.threads.set(id, { source: 'reddit', id, title, url: `https://www.reddit.com/r/node/comments/${id}/`, date, score: null, num_comments, subreddit: 'node' });
    state.appearances.set(id, positions);
  };
  add('old', 'Best way to learn express?', '2019-01-01', [1], 10);
  add('recent', 'Best resources to learn Node?', '2025-06-01', [2], 10);
  add('twice', 'Express tutorial', '2024-01-01', [3, 1], 10);
  add('empty', 'Best way to learn express?', '2025-06-01', [1], 0);
  add('launch', 'I built a thing', '2025-06-01', [4], 3);
  const ranked = rankThreads(state, nowMs);
  assert.ok(!ranked.includes('empty'));
  assert.equal(ranked[0], 'twice');
  assert.ok(ranked.indexOf('recent') < ranked.indexOf('old'));
  assert.equal(ranked[ranked.length - 1], 'launch');
  assert.equal(withinMonths('2025-06-01', nowMs, 24), true);
  assert.equal(withinMonths('2019-01-01', nowMs, 24), false);
  assert.equal(withinMonths(null, nowMs, 24), false);
});

test('verification candidates: two mentions, a reply mention, or curated inclusion', () => {
  const index = new ResourceIndex();
  index.add('https://a.example/one', mention('devto', 'd1'), { key: 'devto:1' });
  index.add('https://b.example/two', mention('reddit-comment', 't1'), { key: 'reddit-comment:1' });
  index.add('https://c.example/three', mention('devto', 'd2'), { key: 'devto:2' });
  index.add('https://c.example/three', mention('hn-story', 'h1'), { key: 'hn-story:1' });
  const wiki = index.add('https://d.example/four', mention('reddit-wiki', 'w1'), { key: 'reddit-wiki:1' });
  wiki?.curated.add('r/x wiki/index');
  const urls = verificationCandidates(index.all()).map((d) => d.url);
  assert.deepEqual(urls, ['https://c.example/three', 'https://b.example/two', 'https://d.example/four']);
});

test('output: schema shape, ordering and line-friendly formatting', () => {
  const index = new ResourceIndex();
  const state = createRedditState();
  const feed = parseCommentsFeed(fixture('reddit-comments.rss'), 'node');
  for (const c of feed.comments) mergeComment(state, c);
  for (const c of parseArcticComments(json('arctic-comments.json'))) mergeComment(state, c);
  state.threads.set('119wqbn', feed.post!.thread);
  state.selected = ['119wqbn'];
  const threads = new Map();
  emitRedditMentions({ index, threads, log: () => {} } as unknown as ScoutContext, state);
  for (const link of parseWikiPage(fixture('wayback-wiki.html'), 'learnjavascript').links) {
    const d = index.add(link.url, mention('reddit-wiki', 'https://web.archive.org/web/20251020170601id_/https://old.reddit.com/r/learnjavascript/wiki/index', { date: '2025-10-20', excerpt: `${link.heading} > ${link.line}` }), { key: 'reddit-wiki:ljs', title: link.text, titlePriority: 2 });
    d?.curated.add('r/learnjavascript wiki/index');
  }
  const nowMs = Date.parse('2026-09-25T12:00:00Z');
  const out = assembleOutput({
    topic: 'Node and Express',
    subreddits: ['node', 'learnjavascript'],
    keywords: ['learn express'],
    budget: { seconds: 600, used_seconds: 12, exhausted: false },
    sources: [{ kind: 'reddit-comments', url: 'https://www.reddit.com/r/node/comments/119wqbn/.rss?limit=100&sort=top', status: 'ok', note: '200 in 5ms' }],
    threads: [...threads.values()],
    drafts: index.all(),
    nowMs,
  });

  assert.deepEqual(Object.keys(out), ['dojo_scout', 'topic', 'generated', 'subreddits', 'keywords', 'budget', 'sources', 'threads', 'resources', 'thin_evidence']);
  assert.equal(out.dojo_scout, '0.1.0');
  assert.equal(out.generated, '2026-09-25T12:00:00.000Z');
  assert.deepEqual(out.subreddits, ['node', 'learnjavascript']);
  assert.equal(typeof out.thin_evidence, 'boolean');
  assert.equal(out.threads.length, 1);
  assert.deepEqual(Object.keys(out.threads[0]), ['source', 'id', 'title', 'url', 'date', 'score', 'num_comments', 'subreddit']);
  assert.ok(out.resources.length > 20, `expected the wiki and thread fixtures to yield many resources, got ${out.resources.length}`);
  const sources = new Set(['reddit-wiki', 'reddit-thread', 'reddit-comment', 'hn-story', 'hn-comment', 'stackexchange', 'devto']);
  for (const r of out.resources) {
    assert.deepEqual(Object.keys(r).filter((k) => k !== 'stars' && k !== 'views'), ['url', 'domain', 'title', 'mentions', 'breadth', 'depth', 'curated', 'freshness', 'hn_mentions_24m', 'objective_score', 'max_objective']);
    assert.ok(r.url.startsWith('https://'));
    assert.equal(r.domain, new URL(r.url).hostname);
    assert.ok(r.title === null || typeof r.title === 'string');
    assert.ok(r.mentions.length >= 1);
    for (const m of r.mentions) {
      assert.deepEqual(Object.keys(m), ['source', 'thread_url', 'date', 'score', 'rank', 'excerpt']);
      assert.ok(sources.has(m.source));
      assert.ok(m.date === null || /^\d{4}-\d{2}-\d{2}$/.test(m.date));
    }
    assert.deepEqual(Object.keys(r.freshness).slice(0, 3), ['checked', 'last_modified', 'method']);
    assert.equal(r.freshness.checked, '2026-09-25');
    assert.equal(r.freshness.method, 'none');
    assert.equal(r.max_objective, 70);
    assert.equal(r.objective_score, r.breadth + r.depth + (r.curated.length ? 10 : 0) + 0 + 0);
  }
  for (let i = 1; i < out.resources.length; i++) {
    const prev = out.resources[i - 1];
    const cur = out.resources[i];
    assert.ok(prev.objective_score > cur.objective_score || (prev.objective_score === cur.objective_score && prev.breadth >= cur.breadth));
  }
  const fcc = out.resources.find((r) => r.url === 'https://freecodecamp.org/learn/back-end-development-and-apis');
  assert.ok(fcc);
  assert.equal(fcc.breadth, 3);
  assert.equal(fcc.depth, 15);
  const odin = out.resources.find((r) => r.url === 'https://theodinproject.com');
  assert.deepEqual(odin?.curated, ['r/learnjavascript wiki/index']);
  assert.equal(odin?.title, 'The Odin Project');
  assert.equal(out.resources[0].url, fcc.url, 'top reply in a thread outranks wiki-only entries');

  const text = formatOutput(out);
  const parsed = JSON.parse(text) as ScoutOutput;
  assert.deepEqual(parsed, out);
  const lines = text.split('\n');
  assert.ok(lines.length > out.resources.length + out.threads.length + 10, 'one element per line');
  assert.ok(lines.some((l) => l.startsWith('    {"url":"https://')));
});
