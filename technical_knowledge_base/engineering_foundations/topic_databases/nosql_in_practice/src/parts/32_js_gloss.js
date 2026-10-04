// ---- Glossary: every defined term, linked to where it is explained ----
(function(){
  const G=[
    ['g-norm','Normalisation','storing each fact once, in tables joined at query time'],
    ['g-denorm','Denormalisation','storing a fact more than once, on purpose, so a question reads one place'],
    ['g-ap','Access pattern','one question the application asks: what it knows, what it wants, how often'],
    ['g-pk','Partition key','the part of a key that decides which group, and so which machine, a record belongs to'],
    ['g-sk','Sort key','the part of a key that orders records inside their partition (clustering columns in Cassandra)'],
    ['g-partition','Partition','the records sharing one partition key, stored together and sorted'],
    ['g-redis','Redis','an in-memory server of data structures, one command at a time'],
    ['g-pipeline','Pipelining','sending many commands before reading the replies, to save round trips'],
    ['g-zset','Sorted set','Redis members kept in score order; rank and range in about log N steps'],
    ['g-skiplist','Skip list','a sorted linked list with extra links that skip ahead, for fast search'],
    ['g-ratelimit','Rate limiter','a check on every request: may this user make another one now?'],
    ['g-tokenbucket','Token bucket','a rate limit that refills steadily and allows bursts up to its capacity'],
    ['g-stream','Stream','an append-only log in Redis, read by consumer groups with acknowledgement'],
    ['g-alo','At-least-once delivery','every job is delivered until acknowledged, so it may run twice'],
    ['g-rdb','RDB snapshot','a point-in-time copy of Redis written to disk every so often'],
    ['g-aof','Append-only file','Redis\'s log of every write, flushed always, every second or never'],
    ['g-ddb','DynamoDB','AWS\'s managed, partitioned key-value and document store'],
    ['g-collection','Item collection','DynamoDB items sharing a partition key, sorted by sort key'],
    ['g-singletable','Single-table design','all kinds of items in one DynamoDB table, keyed so one screen is one Query'],
    ['g-gsi','Global secondary index','a second, eventually consistent copy of items under a different key'],
    ['g-writeshard','Write sharding','spreading one hot key over several keys with a suffix'],
    ['g-document','Document','a nested JSON-like record read and written as a unit'],
    ['g-mongo','MongoDB','a document database with indexes, aggregation pipelines and sharding'],
    ['g-cassandra','Cassandra','a leaderless wide-column database spread over a ring of equal nodes'],
    ['g-token','Token','the hash of a partition key; it decides which nodes hold the partition'],
    ['g-clustering','Clustering columns','the columns that sort rows inside a Cassandra partition'],
    ['g-tombstone','Tombstone','a marker written by a delete in an LSM store, kept until compaction drops it'],
    ['g-downsample','Downsampling','replacing old detailed data with coarser summaries (per minute, per hour)'],
    ['g-retention','Retention','how long data is kept before it is deleted'],
    ['g-brin','BRIN index','a tiny Postgres index of minimum and maximum values per block range'],
    ['g-propgraph','Property graph','nodes and relationships, each with a type and properties'],
    ['g-cypher','Cypher','the pattern-matching query language of Neo4j and others'],
    ['g-ifa','Index-free adjacency','storing relationships as direct pointers between records']
  ];
  const el=document.getElementById('rd-gl'); if(!el)return;
  el.innerHTML=G.filter(g=>document.getElementById(g[0])).map(g=>'<div><b><a href="#'+g[0]+'">'+g[1]+'</a></b>: '+g[2]+'.</div>').join('');
  const missing=G.filter(g=>!document.getElementById(g[0])).map(g=>g[0]);
  if(missing.length&&window.__jsErr)window.__jsErr('glossary terms without a definition: '+missing.join(', '));
})();
