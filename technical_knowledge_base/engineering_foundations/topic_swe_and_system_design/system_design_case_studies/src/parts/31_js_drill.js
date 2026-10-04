// ---- Design drill: a prompt, a 45-minute clock, the method revealed one step at a time, a self-check list per step ----
(function(){
  const STEPS=[['Requirements',5],['Estimate',5],['API',3],['Data model',3],['High-level design',9],['Deep dives',15],['Bottlenecks and failure',5]];
  const N=(id,t)=>'<a href="https://app.notion.com/p/'+id+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
  const SIB={api:N('3c65c17b0d0d8190ade6c34e8f653e79','Building a backend API'),dsf:N('3c65c17b0d0d8115bc45c31d915b4d33','Distributed systems fundamentals'),
    q:N('3ef5c17b0d0d81aebf91df927f215b6e','Queues, streams and async work'),rel:N('3ef5c17b0d0d8152b8dececf34196174','Reliability engineering'),
    cap:N('3ef5c17b0d0d81458291d55d7443700c','Capacity planning and performance'),ml:N('3c65c17b0d0d8117b057dc2586836ec8','ML system design'),
    obs:N('3ef5c17b0d0d811e8490c54dd42c2b9b','Observability'),rag:N('3ef5c17b0d0d8194a914d1843ee26f13','RAG and retrieval evaluation')};
  const W=(id,t)=>'<a href="#'+id+'" data-read="'+id+'">'+t+'</a>';
  // each prompt: n, q (the prompt as an interviewer says it), steps: 7 x {a: model answer, c: self-check items}
  const P=[
   {id:'url',n:'URL shortener',q:'Design a service like Bitly: shorten links, redirect, count clicks.',s:[
    {a:'Create, redirect, click counts; 600 M links and 6 B clicks a month; redirect p99 under 50 ms; links never break; counts may lag.',c:['Asked the read-to-write ratio','Said what may be lost or late (click counts)','Stated retention (how long links live)']},
    {a:'230 writes/s, 2,300 redirects/s (4,600 at peak); 36 B links in 5 years fill 63% of 6 characters, 1% of 7; 18 TB.',c:['Computed requests per second','Computed the code space and chose a length from it','Computed storage and said whether to shard']},
    {a:'POST /v1/links (Idempotency-Key) returns the code; GET /{code} answers 302 (or 301 with a short max-age); 404, 410.',c:['Chose 301 or 302 and gave the reason','Made link creation safe to retry']},
    {a:'links(code PK, long_url, owner, created_at, status); clicks go to a queue, not the row.',c:['The redirect is a primary-key lookup','Click counting is not an UPDATE per click']},
    {a:'Load balancer, stateless app servers, Redis cache-aside, Postgres (later sharded by code), click queue and analytics consumers, ID range service.',c:['Every box justified by a requirement or number','Cache placed on the read path']},
    {a:'ID generation (hash, random, counter ranges with scramble; Snowflake as the general answer) and the cache (TTL, delete on takedown).',c:['Compared at least two ID schemes','Named enumeration as a risk of sequential codes']},
    {a:'Cache loss lands within database capacity; ID service loss covered by leased blocks; abuse handled by scanning and rate limits.',c:['Said what happens when the cache dies','Mentioned abuse or enumeration']}],ref:W('s-url','Design 1 in the Reading')},
   {id:'rl',n:'Rate limiter',q:'Design a rate limiter that all our API servers share.',s:[
    {a:'Per-key limits per second and minute; 50 servers, 50,000 requests/s; under 1 ms added; a few percent over is fine; must fail open.',c:['Asked who is limited (key, user, IP) and on what','Asked how exact it must be','Asked what happens if the limiter breaks']},
    {a:'One check per request: 50,000/s, one Redis node planned at 90,000; 200 MB of counters; local-only counting would allow 50 times the limit.',c:['Computed the check rate against one node','Showed why local-only counting fails']},
    {a:'Check(descriptors, cost) returns allowed, remaining, reset; public clients get 429 with Retry-After.',c:['Returned remaining allowance and a retry hint']},
    {a:'A token bucket per key: tokens and a timestamp in one Redis hash with an expiry; rules cached in each gateway.',c:['Chose an algorithm and said why (bursts, memory)','Gave counters an expiry']},
    {a:'Gateways call Redis with one atomic Lua script; a local coarse backstop; rules and a kill switch.',c:['Made the check atomic in one round trip','Kept a local fallback']},
    {a:'The read-then-write race (measured: 17 to 19% over); Lua or INCR; sharding by key; hot keys; per-data-centre vs global counting.',c:['Named the race condition explicitly','Discussed sharding and hot keys']},
    {a:'Redis slow: fail open after a few ms; eviction resets limits (use noeviction); replicas lag; bad rules: dark launch.',c:['Chose fail-open and justified it','Mentioned dark launches or kill switches']}],ref:W('s-rl','Design 2 in the Reading')},
   {id:'chat',n:'Chat',q:'Design a chat app like Slack or WhatsApp: one-to-one and groups, history, online status.',s:[
    {a:'Real-time delivery, groups, history forever, presence, receipts; 50 M daily users, 20% connected at peak; delivery under 500 ms; per-channel order.',c:['Asked group size limits','Asked the ordering and delivery guarantees']},
    {a:'46,000 messages/s at peak; 10 M connections, about 100 gateways; 333,000 presence heartbeats/s; 657 TB a year; polling would be 2 M requests/s.',c:['Computed open connections, not only messages','Noticed presence outweighs messages']},
    {a:'WebSocket frames: send (with client_msg_id), ack (msg_id), message, presence; HTTP for history with a cursor.',c:['Used a client message id for deduplication','History paginated by message id']},
    {a:'messages keyed by ((channel, time bucket), message_id); members with last_read; sessions and presence in memory with TTL.',c:['Storage key follows the read pattern','Time-ordered message ids']},
    {a:'Gateways holding WebSockets, channel servers on a hash ring, a wide-column store, push notifications for offline users.',c:['Justified WebSockets over polling with a number','Had a routing layer from user to connection']},
    {a:'Fan-out through channel servers (once per gateway); order assigned per channel; store before ack, catch up by cursor; presence lossy and batched.',c:['Explained ordering per channel','Explained reconnect and catch-up']},
    {a:'Gateway loss: jittered reconnects; channel server loss: ring reassigns; hot channels: memory cache and coalescing.',c:['Handled a reconnect storm','Named the hot-partition risk']}],ref:W('s-chat','Design 3 in the Reading')},
   {id:'feed',n:'News feed',q:'Design the home timeline of a Twitter-like product.',s:[
    {a:'Post, follow, timeline newest first; 150 M active users, 300,000 timeline reads/s, 5,000 posts/s; posts visible within seconds.',c:['Asked chronological or ranked','Asked the read-to-write ratio']},
    {a:'60 reads per write; on-read 22.5 M lookups/s; on-write 375,000 deliveries/s; 2.9 TB RAM for 800-entry timelines x 3; 93 M inserts for one celebrity post.',c:['Compared the cost of both fan-out strategies','Estimated timeline memory']},
    {a:'POST /posts, POST /follows, GET /timeline?cursor=.',c:['Cursor pagination']},
    {a:'posts by time-ordered id; follows indexed both ways; timeline lists of post ids in Redis.',c:['Stored ids, not copies of posts']},
    {a:'Post service, fan-out workers on a queue, timeline cache, timeline service that merges celebrity posts at read time.',c:['Fan-out runs asynchronously behind a queue']},
    {a:'Hybrid fan-out with a follower threshold; active users only; deletes filtered at read; ranking changes the problem (candidates then a model).',c:['Raised the celebrity problem unprompted','Proposed the hybrid with a threshold']},
    {a:'Celebrity bursts, cache node loss (3 copies, rebuild), 25x spikes (durable queue first).',c:['Said how a spike delays rather than drops posts']}],ref:W('s-feed','Design 4 in the Reading')},
   {id:'gw',n:'LLM gateway',q:'Every team in our company calls LLMs. Design the platform they should all go through.',s:[
    {a:'One OpenAI-compatible API, per-team keys, budgets, routing and fallbacks, PII redaction, audit; 10,000 employees; correct spend per team.',c:['Asked about data rules (what may leave the company)','Asked how spend must be attributed']},
    {a:'520,000 requests/day, 18/s at peak (Uber: 25 QPS); about $4,200 a day; 180 open streams; 5.5 GB of logs a day.',c:['Noticed throughput is small and money is the issue','Used Little\'s law for open streams']},
    {a:'POST /v1/chat/completions with gateway keys and model aliases; 429 for budget, 503 when every route failed; GET /usage.',c:['Aliases versus pinned versions']},
    {a:'teams, hashed keys, routes; budget counters in Redis; usage events to a warehouse.',c:['Usage events off the request path']},
    {a:'Stateless gateway replicas, key vault, budget store, redaction, vendors and a self-hosted model, usage queue.',c:['Gateway itself made redundant']},
    {a:'Token budgets reserved then settled; one retry layer with ordered fallbacks; redaction; caching and tier routing after measuring.',c:['Counted limits in tokens, not requests','Retries in one layer only']},
    {a:'Provider outage, runaway script, alias drift, buffering proxies.',c:['Said how the fallback is tested']}],ref:W('s-gw','Design 5 in the Reading')+' and '+SIB.ml},
   {id:'rag',n:'RAG over company docs',q:'Build a "ask our documentation" assistant over the company wiki, drives and tickets.',s:[
    {a:'Answers with citations; 5 M documents; permissions respected; edits searchable in 10 minutes; measured quality.',c:['Asked about permissions','Asked about freshness']},
    {a:'35 M chunks; 215 GB of vectors at 1,536 x 4 bytes; $350 to embed once; 8 chunks/s re-embedding; under 2 questions/s; $650 a day in answers.',c:['Sized the vectors against memory','Saw that query rate is not the problem']},
    {a:'POST /ask streams an answer then citations; POST /feedback.',c:['Citations in the response']},
    {a:'documents and chunks with version and ACL groups; HNSW and keyword indexes; a golden set.',c:['ACL groups stored on chunks','Embedding model version recorded']},
    {a:'Connectors, a change queue, chunk-and-embed workers, vector and BM25 indexes, reranker, LLM, evaluation.',c:['Ingestion is asynchronous and idempotent']},
    {a:'Hybrid retrieval and reranking (Anthropic: 49% and 67% fewer failures); permission filters and the post-filter trap; versioned upserts and deletes.',c:['Justified hybrid search','Handled deleted and shrunk documents']},
    {a:'Permission lag, missed events, model change, index outgrowing RAM, prompt injection in documents.',c:['Evaluation separates retrieval from generation']}],ref:W('s-rag','Design 6 in the Reading')+' and '+SIB.rag},
   {id:'job',n:'Job scheduler',q:'Design a distributed cron: teams register jobs that must run on schedule.',s:[
    {a:'Recurring and delayed jobs, run history, retries; 10 M runs/day; start within seconds; no double runs, no silent skips.',c:['Asked what a double run would cost','Asked about missed runs during downtime']},
    {a:'116 runs/s average, 2,300 running, 48 workers; 125,000 due in the top-of-hour second without jitter.',c:['Found the top-of-hour spike']},
    {a:'POST /jobs with schedule, timezone, overlap and misfire policy; GET runs.',c:['Overlap and misfire policies']},
    {a:'jobs(next_run_at indexed); runs keyed by (job_id, scheduled_for).',c:['A unique key per intended run']},
    {a:'Schedulers claim due rows with SKIP LOCKED and enqueue; workers lease runs and heartbeat.',c:['Scheduler only enqueues']},
    {a:'Leader election versus row claiming; at-least-once execution and idempotent jobs; skip versus double-run (Google prefers skip); jitter; time zones.',c:['Explained at-least-once and idempotency','Mentioned daylight saving or time zones']},
    {a:'Scheduler crash mid-claim, worker crash, long downtime, burst, poison jobs.',c:['Capped retries and alerts']}],ref:W('s-job','Design 7 in the Reading')},
   {id:'notif',n:'Notification system',q:'Design the system that sends push, email and in-app notifications for a large consumer app.',s:[
    {a:'Many producers (product teams) send events; per-user preferences and quiet hours; channels push, email, in-app; priorities (security alerts before marketing); no duplicates; some loss tolerable for low priority.',c:['Asked about priorities and user preferences','Asked which channels and their providers']},
    {a:'Say 100 M users, 5 notifications a user a day: 500 M a day, about 5,800/s average and tens of thousands at peak (campaigns). Netflix reported its RENO system "serves about 150k events per second" at peak.',c:['Separated transactional from bulk volume']},
    {a:'POST /notify {user, template, data, priority, idempotency_key}; GET /inbox for in-app; preference endpoints.',c:['Idempotency key per notification']},
    {a:'preferences(user, channel, quiet_hours); device tokens; notification log keyed by idempotency key; in-app inbox per user.',c:['Device tokens with expiry handling']},
    {a:'Ingest API, priority queues, workers per channel calling providers (APNs, FCM, email), rate limits per user and per provider, an inbox store.',c:['Separate queues per priority','Provider calls behind retries and breakers']},
    {a:'Netflix chose "a hybrid Push AND Pull communication model" and "sharded event traffic by routing to priority-specific queues" ({{Netflix RENO, 2022-02-18|https://netflixtechblog.com/rapid-event-notification-system-at-netflix-6deb1d2b57d1}}). Deduplicate with the key; throttle per user; batch digests.',c:['Push plus pull (inbox) so a missed push is not lost','Per-user throttling to avoid spamming']},
    {a:'Provider outage (queue and retry with backoff; switch provider for email), a campaign flood starving security alerts (priorities), duplicates after retries (dedupe).',c:['Protected high-priority traffic from bulk']}],ref:SIB.q+', '+SIB.rel},
   {id:'ta',n:'Typeahead',q:'Design search-as-you-type suggestions for a search box.',s:[
    {a:'Top 5 to 10 suggestions for a prefix, ranked by popularity, under about 100 ms end to end; updates hourly are fine; personalisation optional.',c:['Asked the latency budget','Asked how fresh suggestions must be']},
    {a:'If 10 M searches a day average 8 keystrokes with debouncing halving them: 40 M requests a day, about 460/s, maybe 1,000/s at peak; the prefix table fits in memory (millions of prefixes x 10 suggestions).',c:['Counted keystrokes, not searches','Accounted for debouncing']},
    {a:'GET /suggest?q=pre&amp;limit=8 with cache headers.',c:['Made responses cacheable']},
    {a:'A precomputed map prefix to top-k list (or a trie with top-k at each node), rebuilt offline from search logs.',c:['Precomputed top-k per prefix']},
    {a:'Client debounce, CDN or edge cache for popular prefixes, an in-memory suggestion service, an offline job building the table from logs.',c:['Separated the offline build from the online lookup']},
    {a:'Building and swapping the table atomically; filtering offensive suggestions; personal blending at read time.',c:['Mentioned filtering harmful suggestions']},
    {a:'Stale table (serve the previous version), hot prefixes (cache), a bad build (validate before swap).',c:['Validated a build before switching']}],ref:SIB.cap+' (Caching strategy)'},
   {id:'crawl',n:'Web crawler',q:'Design a crawler that fetches a billion pages a month for a search index.',s:[
    {a:'Fetch, parse, extract links, store pages; politeness (do not overload any site, obey robots.txt, standardised as {{RFC 9309|https://www.rfc-editor.org/rfc/rfc9309}}); re-crawl freshness; skip duplicates.',c:['Raised politeness and robots.txt','Asked about re-crawl frequency']},
    {a:'1 B pages a month is about 386 a second; at 100 KB a page, 100 TB a month of raw HTML; network about 39 MB/s.',c:['Computed pages a second and storage']},
    {a:'Internal: enqueue(url, priority); the output is a stream of fetched documents.',c:['Defined the frontier interface']},
    {a:'URL frontier (per-host queues), seen-URL set (a Bloom filter or a key-value store), content hashes for duplicates, page store.',c:['Deduplicated URLs and content']},
    {a:'Frontier, fetchers grouped by host, DNS cache, parser, link extractor feeding the frontier, document store.',c:['Grouped work by host for politeness']},
    {a:'Per-host rate limits and back-off on errors; traps (infinite calendars); priority by importance; re-crawl scheduling.',c:['Handled crawler traps']},
    {a:'A fetcher crash (leases on frontier items), a slow host (per-host isolation), a hostile site (size and depth limits).',c:['Isolated slow hosts from the rest']}],ref:SIB.q+', '+SIB.rel},
   {id:'tix',n:'Ticket booking',q:'Design ticket sales for concerts, where a popular show sells out in minutes.',s:[
    {a:'Browse, hold seats for a few minutes, pay, confirm; never sell a seat twice; survive an on-sale spike of many times normal traffic; fair-ish ordering.',c:['Stated the no-double-booking invariant','Asked about the on-sale spike']},
    {a:'A stadium has tens of thousands of seats but hundreds of thousands may arrive at once: the database sees few writes, the front sees a flood.',c:['Saw that contention, not volume, is the problem']},
    {a:'POST /holds {seats} returns a hold with expiry; POST /orders {hold_id} with an Idempotency-Key; GET /events/{id}/seats.',c:['Holds expire','Payment request idempotent']},
    {a:'seats(event, seat, state, hold_id, hold_expires); orders; a conditional update claims a seat only if it is free.',c:['Atomic claim (conditional update or row lock)']},
    {a:'A virtual waiting room in front, a booking service, the seat database, a payment provider behind idempotent calls.',c:['A waiting room or admission control']},
    {a:'Claiming with UPDATE ... WHERE state = free (one winner), hold expiry by a sweeper, payment as a saga with compensation if payment fails.',c:['Compensation when payment fails after the hold']},
    {a:'Payment timeouts (idempotent retries), the spike (admission control and load shedding), a crashed holder (expiry).',c:['Load shedding instead of collapse']}],ref:SIB.dsf+' (Transactions), '+SIB.api+' (Idempotency keys), '+SIB.q+' (Sagas)'},
   {id:'kv',n:'Key-value store',q:'Design a distributed key-value store like Dynamo.',s:[
    {a:'get and put by key; always writable; tunable consistency; survive machine and rack loss; scale by adding machines.',c:['Asked consistency against availability per operation']},
    {a:'Size by data and operations: for example 10 TB and 1 M operations/s over machines with 1 TB and 50,000 operations each, times 3 replicas.',c:['Sized machines from data and operations, with replicas']},
    {a:'get(key) returns values and a version; put(key, value, version).',c:['Versions returned to clients']},
    {a:'Keys hashed onto a ring with virtual nodes; each key on N replicas.',c:['Consistent hashing with virtual nodes']},
    {a:'Any node coordinates; quorum reads and writes (R + W &gt; N for overlap); gossip membership.',c:['Explained R + W > N']},
    {a:'Conflict handling (version vectors or last-write-wins and what each loses), hinted handoff, read repair, anti-entropy with Merkle trees.',c:['Said what last-write-wins loses']},
    {a:'Node loss (replicas and hinted handoff), network partition (sloppy quorum), hot keys.',c:['Discussed a partition explicitly']}],ref:SIB.dsf+' (Quorums, Partitioning, Consistency models)'}
  ];
  const $=id=>document.getElementById(id);
  if(!$('dr-prompts'))return;
  const link=s=>s.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,(m,t,u)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>');
  let cur=P[0],rev=0,t0=0,acc=0,run=false,timer=0;
  const KEY='sdcs-drill-';
  const load=id=>{try{return JSON.parse(localStorage.getItem(KEY+id)||'{}')}catch(e){return {}}};
  const save=(id,v)=>{try{localStorage.setItem(KEY+id,JSON.stringify(v))}catch(e){}};
  $('dr-prompts').innerHTML=P.map((p,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+RD.esc(p.n)+'</button>').join('');
  RD.seg($('dr-prompts'),m=>{cur=P[+m];rev=0;render()});
  function render(){
    const ticks=load(cur.id);
    $('dr-head').innerHTML='<blockquote><b>Interviewer:</b> '+RD.esc(cur.q)+'</blockquote>';
    let start=0;
    $('dr-steps').innerHTML=STEPS.map((s,i)=>{const st=cur.s[i];const a=start;start+=s[1];
      const open=i<rev;
      return '<div class="card" style="padding:8px 12px;margin:8px 0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><b>'+(i+1)+'. '+s[0]+'</b><span class="small mute">minutes '+a+' to '+(a+s[1])+'</span></div>'+
        (open?'<p class="small" style="margin:6px 0">'+link(st.a)+'</p><div class="small">'+st.c.map((c,j)=>{const k=i+'.'+j;return '<label style="display:block;margin:2px 0"><input type="checkbox" data-k="'+k+'"'+(ticks[k]?' checked':'')+'> '+RD.esc(c)+'</label>'}).join('')+'</div>'
          :(i===rev?'<p class="small mute" style="margin:6px 0">Say your answer first, then</p><button data-rev="'+i+'">Reveal step '+(i+1)+'</button>':'<p class="small mute" style="margin:6px 0">Reveal the steps above first.</p>'))+'</div>'}).join('')+
      (rev>=STEPS.length?'<p class="small">Reference: '+cur.ref+'</p>':'');
    score();
  }
  function score(){const ticks=load(cur.id);const tot=cur.s.reduce((a,s)=>a+s.c.length,0);const got=Object.values(ticks).filter(Boolean).length;
    $('dr-score').textContent=got+' of '+tot;$('dr-score-d').textContent=tot?Math.round(got/tot*100)+'% for '+cur.n:'';$('dr-rev').textContent=rev+' of 7'}
  $('dr-steps').addEventListener('click',e=>{const b=e.target.closest('button[data-rev]');if(b){rev=+b.dataset.rev+1;render();return}
    const a=e.target.closest('a[data-read]');if(a){e.preventDefault();window.SHOW_TAB&&window.SHOW_TAB('t-read',true);const s=document.getElementById(a.dataset.read);if(s)s.scrollIntoView({block:'start'})}});
  $('dr-steps').addEventListener('change',e=>{const c=e.target;if(!c.dataset.k)return;const t=load(cur.id);t[c.dataset.k]=c.checked;save(cur.id,t);score()});
  $('dr-clear').addEventListener('click',()=>{save(cur.id,{});render()});
  function fmtT(s){s=Math.floor(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
  function phase(sec){let m=sec/60,a=0;for(let i=0;i<STEPS.length;i++){a+=STEPS[i][1];if(m<a)return 'Now: '+STEPS[i][0];}return 'Time is up: wrap up with what breaks at 10×.'}
  function tick(){const s=acc+(run?(Date.now()-t0)/1000:0);$('dr-time').textContent=fmtT(s);$('dr-phase').textContent=run||s>0?phase(s):''}
  $('dr-start').addEventListener('click',()=>{if(run){acc+=(Date.now()-t0)/1000;run=false;clearInterval(timer);$('dr-start').innerHTML='&#9654; Resume clock'}
    else{t0=Date.now();run=true;timer=setInterval(tick,500);$('dr-start').innerHTML='&#10073;&#10073; Pause clock'}tick()});
  $('dr-reset').addEventListener('click',()=>{run=false;clearInterval(timer);acc=0;$('dr-start').innerHTML='&#9654; Start 45-minute clock';tick()});
  render();tick();
})();
