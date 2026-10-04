// ---- The seven designs: build-up diagrams (naive, then each bottleneck found and fixed), estimate tables, measured results ----
// Counter values come from EST_EXPECT (the defaults of est_spec.json, also checked by recompute.py), so prose, tables and animations agree.
(function(){
  const E=window.EST_EXPECT,F=RD.fmt;
  const pct=x=>F(x*100,1)+'%',ms=x=>F(x,1)+' ms',n0=x=>F(x,0),txt=x=>x;
  const SPECS={};
  // 1. URL shortener
  SPECS.url={lanes:['Clients','Front','App','Cache and IDs','Storage','Async'],
    nodes:[{id:'cl',l:'Browser',s:'GET /aZ3kQ9x',c:0,r:0,in:0},
      {id:'lb',l:'Load balancer',c:1,r:0,in:6},
      {id:'app1',l:'App server',s:'one machine',c:2,r:0,in:0,out:6},{id:'app2',l:'App servers',s:'12, stateless',c:2,r:0,in:6},
      {id:'cache',l:'Redis cache',s:'code to URL, TTL',c:3,r:0,in:4},{id:'ids',l:'ID range service',s:'blocks of 10,000',c:3,r:1,in:2},
      {id:'db',l:'Postgres',s:'one primary',c:4,r:0,in:0,out:8,kind:'store'},{id:'sh',l:'Shards by code hash',s:'each with a replica',c:4,r:0,in:8,kind:'store'},
      {id:'q',l:'Click queue',s:'at-least-once',c:5,r:0,in:4},{id:'an',l:'Analytics consumers',s:'counts per hour',c:5,r:1,in:4}],
    edges:[{a:'cl',b:'app1'},{a:'app1',b:'db'},{a:'app1',b:'ids',in:2},{a:'cl',b:'lb'},{a:'lb',b:'app2'},{a:'app2',b:'cache'},{a:'app2',b:'ids'},{a:'app2',b:'db'},{a:'app2',b:'sh'},{a:'app1',b:'cache',in:4},{a:'app1',b:'q',in:4},{a:'app2',b:'q'},{a:'q',b:'an'}],
    steps:[
      {k:'naive',t:'one server, one database',p:'The browser asks the app server for a code; it reads the long URL from Postgres, adds 1 to a click counter in the same row, and answers 302. New links get a random 6-character code.',hot:[]},
      {k:'bad',t:'the code space fills up',p:'After five years, 36 billion links fill 63% of the 56.8 billion 6-character codes, so most new random codes collide and must be retried, and the retries get worse every month.',hot:['app1']},
      {k:'fix',t:'7-character codes from leased ID ranges',p:'Each server leases a block of numbers from an ID range service, scrambles and encodes it in base62: 7 characters, 3.52 trillion codes, 1% used after five years, no collisions and no network call per create.',hot:[]},
      {k:'bad',t:'every redirect is a database read and a write',p:'At peak, 4,630 redirects a second each read the row and update its click count. A viral link becomes one row locked by thousands of requests in turn.',hot:['db']},
      {k:'fix',t:'a cache in front, clicks to a queue',p:'Redis answers 90% of redirects (cache-aside, about 0.14 ms). The click becomes an event on a queue that consumers aggregate; the redirect no longer writes anything.',hot:[]},
      {k:'bad',t:'one app server: capacity and a single point of failure',p:'5,093 requests a second at peak against about 500 per server, and if the one machine dies, every link on the internet that points at us breaks.',hot:['app1']},
      {k:'fix',t:'a load balancer and 12 stateless servers',p:'Servers hold no state (codes come from leased blocks, data from cache and database), so any server can answer any request and one can die unnoticed.',hot:[]},
      {k:'bad',t:'18 TB, and one primary for every write',p:'Five years of links is 18 TB on one database primary: backups, index rebuilds and failover all get slow, and the primary is still a single point of failure for creates.',hot:['db']},
      {k:'fix',t:'partition by code, a replica per shard',p:'Hash the code to choose a shard; each shard has a replica that takes over on failure. Planned from day one (code is the key), executed when storage demands it.',hot:[]}],
    counters:[{l:'Database reads a second at peak',v:[E.url.r_pk,E.url.r_pk,E.url.r_pk,E.url.r_pk,E.url.db_rd,E.url.db_rd,E.url.db_rd,E.url.db_rd,E.url.db_rd],fmt:n0},
      {l:'Code space used after 5 years',v:[E.url.fill6,E.url.fill6,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7],fmt:pct},
      {l:'Writes on the redirect path',v:['1 per click','1 per click','1 per click','1 per click','none','none','none','none','none'],fmt:txt},
      {l:'Machines whose loss stops redirects',v:[2,2,2,2,1,1,0,0,0],fmt:n0,d:'cache down falls back to the database'}]};
  // 2. Rate limiter
  SPECS.rl={lanes:['Clients','Gateways','Limiter state','Config'],
    nodes:[{id:'cl',l:'API clients',s:'one key, many calls',c:0,r:0,in:0},
      {id:'g1',l:'Gateway 1',s:'local counter',c:1,r:0,in:0},{id:'g2',l:'Gateway 2',s:'local counter',c:1,r:1,in:0},{id:'g3',l:'Gateway 50',s:'local counter',c:1,r:2,in:0},
      {id:'rd',l:'Redis',s:'GET then SET',c:2,r:0,in:2,out:4},{id:'rda',l:'Redis',s:'atomic Lua script',c:2,r:0,in:4,out:8},
      {id:'rs',l:'Redis shards',s:'by key, + replicas',c:2,r:0,in:8},{id:'loc',l:'Local backstop',s:'fail open, coarse limit',c:2,r:1,in:6},
      {id:'cfg',l:'Rules',s:'per plan, cached',c:3,r:0,in:0},{id:'ks',l:'Kill switch, dark launch',c:3,r:1,in:6}],
    edges:[{a:'cl',b:'g1'},{a:'cl',b:'g2'},{a:'cl',b:'g3'},{a:'g1',b:'rd',in:2},{a:'g2',b:'rd',in:2},{a:'g3',b:'rd',in:2},{a:'g1',b:'rda'},{a:'g2',b:'rda'},{a:'g3',b:'rda'},{a:'g1',b:'rs'},{a:'g2',b:'rs'},{a:'g3',b:'rs'},{a:'g1',b:'loc',d:1},{a:'cfg',b:'g3',d:1}],
    steps:[
      {k:'naive',t:'each gateway counts alone',p:'Every gateway keeps its own counter per key in memory: no network call, zero added latency.',hot:[]},
      {k:'bad',t:'a client gets the limit once per gateway',p:'Spread across 50 gateways, one key gets 50 &times; 100 = 5,000 requests a second against a limit of 100.',hot:['g1','g2','g3']},
      {k:'fix',t:'one shared counter in Redis',p:'Every gateway asks Redis: read the count, compare with the limit, write count + 1.',hot:[]},
      {k:'bad',t:'the read and the write race',p:'Between one gateway\'s read and its write, others read the same value. Measured with 32 concurrent clients: 117 to 119 admitted against a limit of 100.',hot:['rd']},
      {k:'fix',t:'check and update atomically, in one round trip',p:'A Lua script (or INCR then compare) runs as one indivisible step on the Redis server: exactly 100 admitted. One round trip, about 0.5 ms in a region.',hot:[]},
      {k:'bad',t:'when Redis is slow, the API is down',p:'If every request waits for the limiter, a Redis blip becomes an outage of the whole API. A bad rule does the same.',hot:['rda']},
      {k:'fix',t:'fail open, with a local backstop, a kill switch and dark launches',p:'A few-millisecond timeout, then allow the request under a coarse local limit. New rules first only log what they would block (Stripe\'s rule); each limiter has a kill switch.',hot:[]},
      {k:'bad',t:'10&times; traffic: one node is not enough',p:'At 500,000 checks a second one node (planned at 90,090) is saturated, and one giant tenant\'s key is hot.',hot:['rda']},
      {k:'fix',t:'shard counters by key; replicas for failover',p:'Each key lives on one shard, so its updates stay atomic. Read and write counters on the primary (replicas lag and expire keys late: GitHub\'s bug). Hot tenants get leased token batches.',hot:[]}],
    counters:[{l:'Most one key can get per second (limit 100)',v:[E.rl.local,E.rl.local,100,'117 to 119',100,100,100,100,100],fmt:x=>typeof x==='number'?n0(x):x},
      {l:'Added latency per request',v:[0,0,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat],fmt:x=>x?F(x,1)+' ms':'0'},
      {l:'If the limiter fails',v:['n/a','n/a','API down','API down','API down','API down','API keeps working','API keeps working','API keeps working'],fmt:txt}]};
  // 3. Chat
  SPECS.chat={lanes:['Clients','Connections','Routing','Storage','Async'],
    nodes:[{id:'cl',l:'Phones and browsers',c:0,r:0,in:0},
      {id:'api',l:'HTTP API',s:'poll every 5 s',c:1,r:0,in:0,out:2},{id:'gw',l:'Gateway servers',s:'WebSockets, ~100',c:1,r:0,in:2},
      {id:'msg',l:'Message service',c:2,r:0,in:0,out:4},{id:'reg',l:'Session registry',s:'user to gateway',c:2,r:1,in:4,out:6},{id:'cs',l:'Channel servers',s:'consistent hash ring',c:2,r:0,in:4},
      {id:'pres',l:'Presence',s:'TTL keys, batched',c:2,r:2,in:8},
      {id:'db',l:'Postgres',s:'messages table',c:3,r:0,in:0,out:6,kind:'store'},{id:'wc',l:'Wide-column store',s:'(channel, bucket), id',c:3,r:0,in:6,kind:'store'},
      {id:'push',l:'Push notifications',s:'offline users',c:4,r:0,in:4}],
    edges:[{a:'cl',b:'api'},{a:'api',b:'msg'},{a:'msg',b:'db'},{a:'cl',b:'gw'},{a:'gw',b:'cs'},{a:'gw',b:'reg'},{a:'cs',b:'db'},{a:'cs',b:'wc'},{a:'cs',b:'push'},{a:'gw',b:'pres'}],
    steps:[
      {k:'naive',t:'clients poll an HTTP API',p:'Each app asks "anything new?" every 5 seconds; the service reads new messages from one Postgres table.',hot:[]},
      {k:'bad',t:'2 million polls a second, almost all empty',p:'10 million connected clients &divide; 5 s = 2,000,000 requests a second, 43 times the real message rate, and messages still wait up to 5 seconds.',hot:['api']},
      {k:'fix',t:'persistent WebSocket connections',p:'Each client holds one WebSocket to a gateway server, which can push the moment a message arrives. About 100 gateways at a conservative 100,000 connections each.',hot:[]},
      {k:'bad',t:'which gateway holds the recipient?',p:'A message arrives at gateway 17; the recipients sit on gateways 3, 58 and 90. Something must know who is where and fan out.',hot:['msg']},
      {k:'fix',t:'channel servers on a hash ring; push for the offline',p:'Each channel is owned by one channel server, chosen by consistent hashing; gateways subscribe for their users and receive each message once per gateway. The channel server assigns the order. Offline members get a push notification.',hot:[]},
      {k:'bad',t:'657 TB a year in one database',p:'46,000 writes a second at peak and history kept forever: no single Postgres holds it, and a busy channel is a hot spot.',hot:['db']},
      {k:'fix',t:'a wide-column store keyed by channel and time',p:'Partition by (channel_id, time bucket), sort by message id inside: Discord\'s key. Reads of "the latest 50" hit one bounded partition.',hot:[]},
      {k:'bad',t:'presence: 333,000 heartbeats a second',p:'Every connection reports "still here" every 30 s, seven times the message rate; naively each change fans out to every contact.',hot:['gw']},
      {k:'fix',t:'presence as TTL keys, sent only to watchers, batched',p:'A heartbeat refreshes a key that expires on its own; changes go only to people looking, in batches, and may be seconds stale.',hot:[]}],
    counters:[{l:'Requests a second just to stay up to date',v:[E.chat.poll,E.chat.poll,0,0,0,0,0,0,0],fmt:n0,d:'with persistent connections, none'},
      {l:'Worst-case delay to see a message',v:['5 s','5 s','push','push','push','push','push','push','push'],fmt:txt},
      {l:'Messages stored per year (3 copies)',v:[E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr],fmt:x=>n0(x)+' TB'},
      {l:'Databases holding history',v:[1,1,1,1,1,1,'many partitions','many partitions','many partitions'],fmt:x=>typeof x==='number'?'1 (single)':x}]};
  // 4. Feed
  SPECS.feed={lanes:['Clients','App','Timelines','Storage','Async'],
    nodes:[{id:'cl',l:'App',c:0,r:0,in:0},
      {id:'tl',l:'Timeline service',s:'merge at read time',c:1,r:0,in:0,out:2},{id:'tl2',l:'Timeline service',s:'read cached list',c:1,r:0,in:2,out:4},{id:'tl3',l:'Timeline service',s:'list + celebrity merge',c:1,r:0,in:4},
      {id:'post',l:'Post service',c:1,r:1,in:0},
      {id:'rc',l:'Timeline cache',s:'Redis, 800 ids, x3',c:2,r:0,in:2,out:6},{id:'rc2',l:'Timeline cache',s:'active users only',c:2,r:0,in:6},
      {id:'db',l:'Posts and follows',s:'indexed by author',c:3,r:0,in:0,kind:'store'},
      {id:'fo',l:'Fan-out workers',s:'queue of deliveries',c:4,r:0,in:2},{id:'th',l:'Celebrity rule',s:'no fan-out above N',c:4,r:1,in:4}],
    edges:[{a:'cl',b:'tl'},{a:'cl',b:'tl2'},{a:'cl',b:'tl3'},{a:'cl',b:'post'},{a:'tl',b:'db'},{a:'tl2',b:'rc'},{a:'tl3',b:'rc'},{a:'tl3',b:'rc2'},{a:'tl3',b:'db',in:4},{a:'post',b:'db'},{a:'post',b:'fo',in:2},{a:'fo',b:'rc'},{a:'fo',b:'rc2'},{a:'th',b:'fo',d:1}],
    steps:[
      {k:'naive',t:'fan-out on read',p:'Each timeline request looks up who you follow, fetches each account\'s recent posts and merges them. Posting is one insert.',hot:[]},
      {k:'bad',t:'22.5 million index lookups a second',p:'300,000 timeline reads a second, each touching about 75 accounts. Measured on a laptop: the join took 2.9 ms against 0.085 ms for a precomputed list (34 times slower).',hot:['tl','db']},
      {k:'fix',t:'fan-out on write into cached timelines',p:'A post goes on a queue; fan-out workers push its id into each follower\'s timeline list in Redis (800 ids, 3 copies). A read is one lookup.',hot:[]},
      {k:'bad',t:'celebrities: 31 million deliveries for one post',p:'One post by the biggest account is 93 million inserts with 3 copies; reported to take up to 5 minutes, delaying everyone else\'s posts behind it.',hot:['fo']},
      {k:'fix',t:'the hybrid: no fan-out above a threshold',p:'Celebrity posts are stored once and merged into each reader\'s timeline at read time: a handful of extra lookups per read, not millions of writes per post.',hot:[]},
      {k:'bad',t:'2.9 TB of RAM for every user\'s timeline',p:'150 million users &times; 800 ids &times; 8 bytes &times; 3 copies, most of them for users who will not open the app today.',hot:['rc']},
      {k:'fix',t:'cache only active users; rebuild on login',p:'Inactive users\' timelines are dropped and rebuilt from the follow graph when they return: one slow first read instead of terabytes of idle memory.',hot:[]}],
    counters:[{l:'Work per timeline read',v:['~75 lookups + merge','~75 lookups + merge','1 lookup','1 lookup','1 lookup + a few','1 lookup + a few','1 lookup + a few'],fmt:txt},
      {l:'Index lookups a second for reads',v:[E.feed.onread,E.feed.onread,300000,300000,300000,300000,300000],fmt:n0},
      {l:'Inserts for one celebrity post',v:[0,0,E.feed.celeb_ins,E.feed.celeb_ins,0,0,0],fmt:n0},
      {l:'Timeline cache RAM',v:[0,0,E.feed.ram,E.feed.ram,E.feed.ram,E.feed.ram,'active users only'],fmt:x=>typeof x==='number'?F(x,2)+' TB':x}]};
  // 5. LLM gateway
  SPECS.gw={lanes:['Teams','Gateway','Policy and state','Models','Async'],
    nodes:[{id:'apps',l:'Team apps',s:'40 services, scripts',c:0,r:0,in:0},
      {id:'gw',l:'LLM gateway',s:'OpenAI-compatible',c:1,r:0,in:2},{id:'gw2',l:'Gateway replicas',s:'2+ zones, stateless',c:1,r:1,in:10},
      {id:'keys',l:'Virtual keys',s:'real keys held here',c:2,r:0,in:2},{id:'bud',l:'Budget counters',s:'tokens, reserve then settle',c:2,r:1,in:4},{id:'pii',l:'PII redaction',s:'per-team policy',c:2,r:2,in:8},
      {id:'va',l:'Vendor A',c:3,r:0,in:0},{id:'vb',l:'Vendor B',c:3,r:1,in:6},{id:'self',l:'Self-hosted model',s:'for data that stays',c:3,r:2,in:8},
      {id:'ue',l:'Usage events',s:'queue to warehouse',c:4,r:0,in:2}],
    edges:[{a:'apps',b:'va',out:2},{a:'apps',b:'gw'},{a:'apps',b:'gw2'},{a:'gw',b:'keys'},{a:'gw',b:'bud'},{a:'gw',b:'pii'},{a:'gw',b:'va'},{a:'gw',b:'vb'},{a:'gw',b:'self'},{a:'gw',b:'ue'},{a:'gw2',b:'bud'}],
    steps:[
      {k:'naive',t:'every team calls the vendor directly',p:'Each team has its own API key in its own config, its own retry code, and a share of one invoice.',hot:[]},
      {k:'bad',t:'nobody knows who spends what, and keys are everywhere',p:'About $4,200 a day arrives as one bill. A leaked key in a repository can only be revoked for everyone at once.',hot:['apps']},
      {k:'fix',t:'one gateway, virtual keys, usage events',p:'Teams get gateway keys; the gateway holds the real ones. Every call emits a usage event (team, feature, model, tokens, cost) to a queue and a warehouse.',hot:[]},
      {k:'bad',t:'one runaway script spends the month',p:'A loop calling a large model with 8,000-token outputs can burn a team\'s monthly budget overnight, and request counts would not notice.',hot:['gw']},
      {k:'fix',t:'budgets and limits counted in tokens',p:'Reserve input plus max_tokens before the call, settle after; per-team tokens per minute and monthly dollars, with atomic counters as in design 2.',hot:[]},
      {k:'bad',t:'the vendor has an outage',p:'Every AI feature in the company fails together, and each team\'s SDK retries on top of the others.',hot:['va']},
      {k:'fix',t:'ordered fallbacks, one retry layer',p:'Each alias has a route: vendor A, then vendor B, with timeouts and cooldowns. Only the gateway retries; the fallback is exercised regularly so it works when needed.',hot:[]},
      {k:'bad',t:'customer data leaves the company',p:'Employees paste customer records into prompts that go to an outside vendor, against the data policy.',hot:['apps','va']},
      {k:'fix',t:'redaction and policy routing',p:'Personal data is replaced before external calls and restored in the response; teams whose data may not leave are routed to a self-hosted model.',hot:[]},
      {k:'bad',t:'the gateway is now the single point of failure',p:'Every model call in the company passes one service: its outage is everyone\'s outage.',hot:['gw']},
      {k:'fix',t:'stateless replicas in two zones',p:'State lives in the budget store and the warehouse; replicas are interchangeable. If the budget store fails, allow requests under a local cap (fail open, as in design 2).',hot:[]}],
    counters:[{l:'Spend attributed to a team',v:['0%','0%','100%','100%','100%','100%','100%','100%','100%','100%','100%'],fmt:txt},
      {l:'Places holding real vendor keys',v:['every team','every team','1','1','1','1','1','1','1','1','1'],fmt:txt},
      {l:'Providers behind each alias',v:[1,1,1,1,1,1,2,2,3,3,3],fmt:n0},
      {l:'Model spend a day (illustrative prices)',v:Array(11).fill(E.gw.cday),fmt:x=>'$'+n0(x)}]};
  // 6. RAG
  SPECS.rag={lanes:['Sources','Ingestion','Index','Query','Quality'],
    nodes:[{id:'src',l:'Wiki, drives, tickets',s:'5 M documents',c:0,r:0,in:0},
      {id:'cron',l:'Nightly export',s:'whole corpus',c:1,r:0,in:0,out:6},{id:'q',l:'Change events',s:'queue, idempotent',c:1,r:0,in:6},{id:'emb',l:'Chunk and embed',s:'versioned upserts',c:1,r:1,in:2},
      {id:'kw',l:'Keyword index',s:'full text',c:2,r:0,in:0,out:2},{id:'vec',l:'Vector index',s:'HNSW, 35 M chunks',c:2,r:0,in:2},{id:'bm',l:'BM25 index',c:2,r:1,in:4},{id:'acl',l:'ACL groups per chunk',c:2,r:2,in:8},
      {id:'ask',l:'Ask service',s:'retrieve, prompt, cite',c:3,r:0,in:0},{id:'rr',l:'Reranker',c:3,r:1,in:4},{id:'llm',l:'LLM',c:3,r:2,in:0},
      {id:'ev',l:'Golden set and judges',s:'two scores',c:4,r:0,in:10}],
    edges:[{a:'src',b:'cron'},{a:'cron',b:'kw'},{a:'cron',b:'emb'},{a:'src',b:'q'},{a:'q',b:'emb'},{a:'emb',b:'vec'},{a:'emb',b:'bm'},{a:'ask',b:'kw'},{a:'ask',b:'vec'},{a:'ask',b:'bm'},{a:'ask',b:'rr'},{a:'ask',b:'llm'},{a:'ask',b:'acl'},{a:'ev',b:'ask',d:1}],
    steps:[
      {k:'naive',t:'keyword search, top results pasted into the prompt',p:'A nightly export feeds a keyword index; the top 5 matching documents are pasted, whole, into the prompt.',hot:[]},
      {k:'bad',t:'whole documents miss and overflow',p:'Questions phrased differently from the text find nothing; whole documents waste the context window and dollars on irrelevant pages.',hot:['kw']},
      {k:'fix',t:'chunks, embeddings and a vector index',p:'Documents are split into about 500-token chunks, embedded and indexed with HNSW; the prompt gets the 8 nearest chunks with their citations.',hot:[]},
      {k:'bad',t:'vectors miss exact terms',p:'"Error E1402" or a product code is a rare string, not a meaning: nearest-neighbour search often ranks it low.',hot:['vec']},
      {k:'fix',t:'hybrid retrieval and a reranker',p:'BM25 and vectors run together, results merged, then reranked. Anthropic measured 49% fewer retrieval failures from contextual embeddings plus contextual BM25, 67% with reranking.',hot:[]},
      {k:'bad',t:'answers a day out of date',p:'The nightly export means an edit made at 09:00 is invisible until tomorrow, against a 10-minute requirement.',hot:['cron']},
      {k:'fix',t:'change events through an idempotent pipeline',p:'Connectors emit "document changed"; workers re-chunk and upsert by (doc_id, chunk_no, version), deleting leftover chunks. About 8 chunks a second on average.',hot:[]},
      {k:'bad',t:'someone sees a document they may not open',p:'Retrieval searches everything; the LLM quotes a salary spreadsheet to a person outside HR.',hot:['ask']},
      {k:'fix',t:'permission filters at retrieval',p:'Each chunk carries its document\'s access groups; queries filter by the asker\'s groups (watch the post-filter trap in approximate indexes). Permission changes flow through the same pipeline, with priority.',hot:[]},
      {k:'bad',t:'is it right? nobody knows',p:'A prompt change "felt better" in three tries; nobody can say whether retrieval or generation got worse last week.',hot:['llm']},
      {k:'fix',t:'a golden set, scored separately for retrieval and generation',p:'Real questions with the documents that answer them; recall at k for retrieval, faithfulness for answers; run before every change and on sampled traffic.',hot:[]}],
    counters:[{l:'Prompt content',v:['5 whole documents','5 whole documents','8 chunks','8 chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks'],fmt:txt},
      {l:'Time for an edit to be searchable',v:['up to 24 h','up to 24 h','up to 24 h','up to 24 h','up to 24 h','up to 24 h','minutes','minutes','minutes','minutes','minutes'],fmt:txt},
      {l:'Raw vectors to hold',v:[0,0,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb],fmt:x=>x?n0(x)+' GB':'none'},
      {l:'Permission checks',v:['none','none','none','none','none','none','none','none','per chunk','per chunk','per chunk'],fmt:txt}]};
  // 7. Job scheduler
  SPECS.job={lanes:['Owners','Scheduling','Queue','Workers','Records'],
    nodes:[{id:'own',l:'Teams',s:'register jobs',c:0,r:0,in:0},
      {id:'cron',l:'crontab',s:'one machine runs all',c:1,r:0,in:0,out:2},{id:'s2',l:'Two schedulers',s:'both read what is due',c:1,r:0,in:2,out:4},{id:'s3',l:'Schedulers',s:'SKIP LOCKED claims',c:1,r:0,in:4},{id:'jit',l:'Jitter',s:'spread the hour',c:1,r:1,in:8},
      {id:'qu',l:'Run queue',s:'priorities, bounded',c:2,r:0,in:6},
      {id:'w',l:'Workers',s:'lease + heartbeat',c:3,r:0,in:6},
      {id:'db',l:'jobs and runs',s:'unique (job, time)',c:4,r:0,in:2,kind:'store'}],
    edges:[{a:'own',b:'cron'},{a:'own',b:'db',in:2},{a:'s2',b:'db'},{a:'s3',b:'db'},{a:'s3',b:'qu'},{a:'qu',b:'w'},{a:'w',b:'db'},{a:'jit',b:'s3',d:1}],
    steps:[
      {k:'naive',t:'cron on one machine',p:'One server runs a crontab: at the due minute it starts each job as a local process. No history, no retries.',hot:[]},
      {k:'bad',t:'one machine: when it dies, nothing runs, silently',p:'A reboot during 02:00 skips the nightly jobs, and nobody notices until the reports are missing.',hot:['cron']},
      {k:'fix',t:'a jobs table and two scheduler machines',p:'Schedules and runs live in a database; two scheduler machines read what is due, so either can die.',hot:[]},
      {k:'bad',t:'both schedulers run the same job',p:'Both read "job 7 is due at 02:00" and both start it: the invoice email goes out twice.',hot:['s2']},
      {k:'fix',t:'claim rows atomically; one row per intended run',p:'FOR UPDATE SKIP LOCKED divides due rows between schedulers; the runs table\'s key (job, scheduled time) makes a second launch a conflict, not a run.',hot:[]},
      {k:'bad',t:'the scheduler runs the work, and a slow job blocks launches',p:'A 40-minute export holds a scheduler thread while hundreds of other launches wait; a crash mid-job loses it.',hot:['s3']},
      {k:'fix',t:'schedulers only enqueue; workers lease runs',p:'Due runs go on a queue; workers lease them and heartbeat. A dead worker\'s lease expires and the run is retried (at-least-once, so jobs are idempotent).',hot:[]},
      {k:'bad',t:'125,000 runs due in the same second',p:'30% of the day\'s runs are "0 * * * *": every hour, one second needs 2,500 machines\' worth of slots and the queue explodes.',hot:['qu','w']},
      {k:'fix',t:'deterministic jitter over a minute',p:'Jobs that do not need the exact second get a fixed offset from a hash of their id: about 2,100 starts a second instead of 125,000 at once.',hot:[]}],
    counters:[{l:'Machines whose loss stops all jobs',v:[1,1,0,0,0,0,0,0,0],fmt:n0},
      {l:'Double runs possible on scheduler failover',v:['n/a','n/a','yes','yes','no','no','no','no','no'],fmt:txt},
      {l:'Runs started in the top-of-hour second',v:[E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.spr],fmt:n0},
      {l:'Run history',v:['none','none',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day'],fmt:txt}]};
  window.DESIGN_SPECS=SPECS;
  // mount everything
  const scale={url:['shortens','clicks'],rl:['rps'],chat:['dau'],feed:['users','reads','posts'],gw:['emp','auto'],rag:['docs','qday'],job:['runs']};
  Object.keys(SPECS).forEach(d=>{
    if(document.getElementById('dia-'+d))DIA.mount('dia-'+d,SPECS[d]);
    if(document.getElementById('est-'+d))EST.mount('est-'+d,d,scale[d]);
  });
  // measured: rate limiter race and feed
  const M=window.MEAS;
  const rn=M.race.naive.map(x=>x.admitted),ra=M.race.atomic.map(x=>x.admitted);
  const el=document.getElementById('race-out');
  if(el){const mx=Math.max(...rn)*1.08;
    const bar=(lab,v,col)=>'<div style="display:grid;grid-template-columns:minmax(0,9em) minmax(0,1fr) 3.4em;gap:8px;align-items:center;font-size:12.5px;margin:3px 0"><span>'+lab+'</span><span style="height:14px;background:var(--soft);border-radius:3px;position:relative;overflow:hidden"><span style="position:absolute;left:0;top:0;bottom:0;width:'+(v/mx*100).toFixed(1)+'%;background:'+col+'"></span><span style="position:absolute;top:0;bottom:0;left:'+(100/mx*100).toFixed(1)+'%;border-left:2px dashed var(--ink)"></span></span><span style="text-align:right">'+v+'</span></div>';
    el.innerHTML=rn.map((v,i)=>bar('Check-then-act, run '+(i+1),v,'var(--bad)')).join('')+ra.map((v,i)=>bar('Atomic, run '+(i+1),v,'var(--good)')).join('')+'<div class="small mute">Requests admitted; dashed line: the limit of 100.</div>';
    document.getElementById('race-n').textContent=rn.join(', ')+' requests (17 to 19% over the limit)';}
  const f=M.feed,ft=document.getElementById('feed-tab');
  if(ft){ft.innerHTML='<thead><tr><th>What was timed</th><th class="num">Median</th><th class="num">p99</th></tr></thead><tbody>'+
    '<tr><td>Read 50 newest, fan-out on read (join at read time)</td><td class="num">'+ms(f.read_on_read.median_ms)+'</td><td class="num">'+ms(f.read_on_read.p99_ms)+'</td></tr>'+
    '<tr><td>Read 50 newest, precomputed timeline</td><td class="num">'+F(f.read_precomputed.median_ms,3)+' ms</td><td class="num">'+F(f.read_precomputed.p99_ms,3)+' ms</td></tr>'+
    '<tr><td>Fan out one post, most-followed account ('+n0(f.top_followers)+' followers)</td><td class="num">'+ms(f.fanout_ms_top)+'</td><td class="num">n/a</td></tr>'+
    '<tr><td>Fan out one post, median account ('+n0(f.median_followers)+' followers)</td><td class="num">'+F(f.fanout_ms_median,2)+' ms</td><td class="num">n/a</td></tr>'+
    '<tr><td>Timelines table: rows, size</td><td class="num">'+n0(f.timeline_rows)+'</td><td class="num">'+n0(f.timeline_bytes/1e6)+' MB</td></tr></tbody>';
    document.getElementById('feed-speed').textContent=F(f.read_on_read.median_ms/f.read_precomputed.median_ms,0);
    document.getElementById('feed-fan').textContent=F(f.fanout_ms_top/f.fanout_ms_median,0);}
})();
