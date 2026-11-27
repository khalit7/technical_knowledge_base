# Where the run finds articles worth a page

Added 2026-11-27 at Khalid's request: each run picks up to about 5 of the window's best technical articles (long-form posts, explainers, essays with evidence, postmortems) and gives each its own page under Articles ([../explainer-page/page-kinds/article.md](../explainer-page/page-kinds/article.md), "What earns a page"). Khalid edits this list; the run adds a domain to "Earned their place" when one of its posts gets a page, and reports which source found each pick.

Feeds were checked on 2026-11-27 (HTTP 200, a valid feed, the newest item's date). A feed that fails twice in a row is reported, not silently dropped.

## 1. Writers and blogs Khalid follows
Read every post in the window. These are the writers he reads closely: their substantial posts are strong candidates even without discussion elsewhere.

| Source | Feed | Notes |
|---|---|---|
| Sebastian Raschka, Ahead of AI | https://magazine.sebastianraschka.com/feed | Khalid reads him closely. Long explainers (architecture comparisons, reasoning, positional embeddings); some posts partly paywalled |
| Lilian Weng | https://lilianweng.github.io/index.xml | rare, very long surveys |
| Andrej Karpathy | https://karpathy.bearblog.dev/feed/ and https://karpathy.github.io/feed.xml | |
| Nathan Lambert, Interconnects | https://www.interconnects.ai/feed | post-training and open models; some paywalled |
| Transformer Circuits (Anthropic interpretability) | https://transformer-circuits.pub/feed.xml | `/rss.xml` gives 403 |
| Simon Willison | https://simonwillison.net/atom/everything/ | very high volume: only his long-form posts, not link posts or notes |
| Epoch AI | https://epoch.ai/atom.xml | |
| Import AI (Jack Clark) | https://importai.substack.com/feed | also a curator (section 3) |
| Dwarkesh Patel | https://www.dwarkesh.com/feed | interviews: only when a transcript carries a checkable technical argument |
| Su Jianlin (kexue.fm, Chinese) | https://kexue.fm/feed | derivations on attention, positions, optimisers |
| Tim Dettmers | https://timdettmers.com/feed/ | |
| Eugene Yan | https://eugeneyan.com/rss/ | |
| Hamel Husain | https://hamel.dev/index.xml | evals |
| Phil Schmid | https://www.philschmid.de/rss | |
| Sander Dieleman | https://sander.ai/feed.xml | diffusion |
| Cameron Wolfe | https://cameronrwolfe.substack.com/feed | partly paywalled |
| Chip Huyen | https://huyenchip.com/feed.xml | mostly dormant |
| Jay Alammar | https://jalammar.github.io/feed.xml | mostly dormant |
| Finbarr Timbers, Artfintel | https://www.artfintel.com/feed | partly paywalled |
| Answer.AI and fast.ai | https://www.answer.ai/index.xml, https://www.fast.ai/index.xml | |
| Thinking Machines, Connectionism | no feed: fetch https://thinkingmachines.ai/blog/ and compare with the last run | |
| Stas Bekman | no feed: fetch https://stasosphere.com/ | |
| Alignment Forum, LessWrong curated | https://www.alignmentforum.org/feed.xml, https://www.lesswrong.com/feed.xml?view=curated-rss | only technical posts with experiments |

## 2. Lab and project blogs
Research posts only; product launches are news items, not articles.

| Source | Feed |
|---|---|
| Anthropic (news, engineering, research) | no official feed; community mirrors https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml (also `_engineering`, `_news`) |
| OpenAI | https://openai.com/news/rss.xml |
| Google DeepMind | https://deepmind.google/blog/rss.xml |
| Google Research | https://research.google/blog/rss/ |
| Hugging Face | https://huggingface.co/blog/feed.xml |
| PyTorch | https://pytorch.org/blog/feed/ |
| vLLM | https://vllm.ai/blog/rss.xml |
| Together AI | https://www.together.ai/blog/rss.xml |
| BAIR | https://bair.berkeley.edu/blog/feed.xml |

## 3. Discovery: writers on no list
The weight-space programming post (rikiyat.github.io, 2 November 2026) was found by none of the feeds above: its own blog's feed was empty. It was one of the month's largest Hacker News threads (2,971 points, 902 comments). This channel finds such posts.
- **Hacker News**: stories in the window linking to a blog, a personal site, a lab's research post or a GitHub write-up (not a news site, not a launch or a product page), with at least about 150 points and an active thread (comments at least about a fifth of the points), or at least about 75 points on a personal domain (github.io, substack, a personal site). Query: `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=created_at_i>START,created_at_i<END,points>75&hitsPerPage=200` (paginate with `&page=`); fall back to `https://hacker-news.firebaseio.com/v0/beststories.json` and items if Algolia is unreachable. Record points and comments as a dated reading. `https://news.ycombinator.com/from?site=<domain>` shows a domain's track record.
- **Lobsters**: `https://lobste.rs/t/ai.json` and `https://lobste.rs/t/ml.rss` (small, low scores; a post here and on HN is a strong signal).
- **Curators**: the newsletters the run reads in Gmail (SKILL.md, Newsletters), plus Import AI, Latent Space (https://www.latent.space/feed), TLDR AI (https://tldr.tech/api/rss/ai) and Last Week in AI (https://lastweekin.ai/feed). An article two curators or a curator and Hacker News both picked ranks higher.
- **Not usable unattended**: Reddit (blocks scripts), X and Bluesky (need a login). Do not try.
- **Paywalls**: SemiAnalysis and paid Substack posts show only a teaser in their feeds; they do not get a page unless the full text is readable.

## How the picks are made
1. Collect every candidate from sections 1 to 3 published in the window (or published earlier and widely discussed in it).
2. Drop what fails the bar in [article.md](../explainer-page/page-kinds/article.md) ("What earns a page"): launch posts, rewrites, listicles, API wrappers, paywalled text, a post whose substance is a paper (the paper is routed instead).
3. Rank by substance first (an argument or result of its own, experiments, numbers, code or logs, a careful explanation), then by reach (Hacker News, curators, the author's record). A writer in section 1 posting a long substantive piece is a pick unless the week is unusually strong.
4. Keep up to about 5. A quiet week can have fewer or none. Each pick gets a page (SKILL.md, step 4), a line in the issue's New in the knowledge base, and a card when it is among the week's biggest stories.
5. Strong candidates left out are listed in the report with the reason, so Khalid can ask for one.

## Earned their place
Domains whose posts got a page; the run polls their feed or index page in later windows.
- rikiyat.github.io (Rikiya Takehi, MIT CSAIL): its feed (https://rikiyat.github.io/feed.xml) was empty on 2026-11-27, so fetch https://rikiyat.github.io/blog/ instead.
