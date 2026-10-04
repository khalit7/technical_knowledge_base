// ---- Glossary: every defined term, linked to where it is explained ----
(function(){
  const G=[
    ['g-cache','Cache','a second, faster copy of data whose real home is slower or more expensive to ask'],
    ['g-sor','Source of truth','the store that owns the data (here Postgres); every cache is a copy of it'],
    ['g-hit','Hit','a request the cache answers'],['g-miss','Miss','a request the cache cannot answer, which goes to the source'],
    ['g-hr','Hit ratio','hits divided by all requests'],['g-ttl','TTL','time to live: when a cached entry expires by itself'],
    ['g-locality','Locality','requests repeating in time (temporal) or touching neighbouring data (spatial)'],
    ['g-skew','Skew','a few items getting most of the requests'],['g-compulsory','Compulsory miss','the first request for an item, which no cache can serve'],
    ['g-zipf','Zipf distribution','popularity falling as 1 / rank to a power α'],
    ['g-pagecache','Page cache','the operating system\'s cache of file blocks in free RAM'],['g-bufpool','Buffer pool','the database\'s own cache of pages (shared_buffers in Postgres)'],
    ['g-aside','Cache-aside','read the cache, fill it from the database on a miss, delete the key after a write'],
    ['g-inval','Invalidation','retiring a cached copy that is no longer true'],['g-staleset','Stale set','a slow reader writing an old value into the cache after a writer invalidated it'],
    ['g-lease','Lease','a token from the cache that permits one fill, revoked by a delete'],
    ['g-remote','Remote marker','a flag that sends reads of a just-written key to the primary database'],
    ['g-evict','Eviction policy','the rule for choosing what to drop when the cache is full'],
    ['g-morris','Morris counter','a few-bit counter that counts large numbers approximately, by incrementing with falling probability'],
    ['g-opt','OPT (Belady)','evict the item used furthest in the future: the offline optimum'],
    ['g-mv','Materialised view','a query result stored as a table, recomputed by REFRESH'],
    ['g-memoize','Memoize','a Postgres plan node caching inner lookups of a nested-loop join'],
    ['g-etag','ETag','an HTTP response\'s version tag, checked with If-None-Match'],
    ['g-token','Token','the word piece an LLM reads and writes one at a time'],
    ['g-kv','KV cache','the stored attention keys and values of earlier tokens'],
    ['g-prefill','Prefill','the model\'s first pass over the whole prompt'],['g-prefix','Prefix caching','reusing the KV cache of a shared prompt start across requests'],
    ['g-semcache','Semantic cache','returning a stored answer for a question whose embedding is similar enough'],
    ['g-embedding','Embedding','a vector of numbers representing a text\'s meaning'],['g-cosine','Cosine similarity','the cosine of the angle between two vectors; 1 means the same direction']
  ];
  const el=document.getElementById('rd-gl'); if(!el)return;
  el.innerHTML=G.filter(g=>document.getElementById(g[0])).map(g=>'<div><b><a href="#'+g[0]+'">'+g[1]+'</a></b>: '+g[2]+'.</div>').join('');
  const missing=G.filter(g=>!document.getElementById(g[0])).map(g=>g[0]);
  if(missing.length&&window.__jsErr)window.__jsErr('glossary terms without a definition: '+missing.join(', '));
})();
