"""Build the data for the "Numbers to know" tab (t-num) of Topic: swe-and-system-design.

Every number below is transcribed from (or extracted by a script out of) the source named next to it, with the
date the source states and the date it was read (2026-10-04). Derived numbers are computed here, with the formula.
Local measurements were made for this page on an Apple M1 Pro laptop; their scripts sit beside this file
(measure_fsync.py, measure_pg.py, chase.c, seqread.c) and their raw output in inputs/.

Output: num_data.json (the data, for review and for recompute.py) and ../parts/32_js_num_data.js (the same data,
inline in the page). Run: python3 build_data.py
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
INP = lambda f: json.load(open(os.path.join(HERE, 'inputs', f)))
fs, pg, mem, te = INP('fsync_local.json'), INP('pg_local.json'), INP('mem_local.json'), INP('te_r23.json')

READ = '2026-10-04'
# ---------------------------------------------------------------- sources
# who: classic | ind (independent measurement) | vendor (vendor or project figure) | local (measured for this page)
#      | spec (vendor peak specification) | doc (provider documentation or price list)
S = {
 'norvig': dict(t='Peter Norvig, "Teach Yourself Programming in Ten Years", timing table', u='https://norvig.com/21-days.html#answers', d='2001', who='classic'),
 'dean': dict(t='Jeff Dean, LADIS 2009 keynote, slide "Numbers Everyone Should Know"', u='https://www.cs.cornell.edu/projects/ladis2009/talks/dean-keynote-ladis2009.pdf', d='2009-10', who='classic'),
 'gist': dict(t='"Latency numbers every programmer should know" gist (jboner), credited to Dean and Norvig', u='https://gist.github.com/jboner/2841832', d='~2012', who='classic'),
 'local_mem': dict(t='Measured for this page: pointer chase and sequential read (chase.c, seqread.c), Apple M1 Pro', u='', d='2026-10-04', who='local'),
 'local_fs': dict(t='Measured for this page: 4 KiB write + fsync / F_FULLFSYNC, 400 runs (measure_fsync.py), Apple M1 Pro internal SSD', u='', d='2026-10-04', who='local'),
 'local_pg': dict(t='Measured for this page: pgbench on PostgreSQL ' + pg['postgres'] + ', scale 10, TCP loopback (measure_pg.py), Apple M1 Pro', u='', d='2026-10-04', who='local'),
 'cc_9950x': dict(t='Chips and Cheese, "AMD\'s Ryzen 9950X: Zen 5 on Desktop"', u='https://chipsandcheese.com/p/amds-ryzen-9950x-zen-5-on-desktop', d='2024-08-14', who='ind'),
 'cc_hc': dict(t='Chips and Cheese, "Discussing AMD\'s Zen 5 at Hot Chips 2024"', u='https://chipsandcheese.com/p/discussing-amds-zen-5-at-hot-chips-2024', d='2024-09-15', who='ind'),
 'mc_rocks': dict(t='Mark Callaghan (Small Datum), "How efficient is RocksDB for IO-bound, point-query workloads?" (fio, 8 KB reads, io_depth 1, Crucial P3)', u='https://smalldatum.blogspot.com/2025/10/how-efficient-is-rocksdb-for-io-bound.html', d='2025-10-23', who='ind'),
 'mc_fsync': dict(t='Mark Callaghan (Small Datum), "SSDs, power loss protection and fsync latency" (16 KB O_DIRECT writes, fsync per write, Ubuntu 24.04)', u='https://smalldatum.blogspot.com/2026/01/ssds-power-loss-protection-and-fsync.html', d='2026-01-07', who='ind'),
 'percona_fsync': dict(t='Yves Trudeau (Percona), "Fsync Performance on Storage Devices"', u='https://www.percona.com/blog/fsync-performance-storage-devices/', d='2018-02-08', who='ind'),
 'azure_rtt': dict(t='Microsoft Learn, "Azure network round-trip latency statistics" (monthly P50 between regions)', u='https://learn.microsoft.com/en-us/azure/networking/azure-network-latency', d='2026-07-30', who='doc'),
 'azure_az': dict(t='Microsoft Learn, "What are availability zones?" (inter-zone round trip target)', u='https://learn.microsoft.com/en-us/azure/reliability/availability-zones-overview', d='2026-02-11', who='doc'),
 'wiki_fibre': dict(t='Wikipedia, "Optical fiber", Refractive index (rule of thumb: about 200,000 km/s in fibre)', u='https://en.wikipedia.org/wiki/Optical_fiber#Refractive_index', d=READ, who='doc'),
 'rfc9293': dict(t='RFC 9293, Transmission Control Protocol (three-way handshake)', u='https://www.rfc-editor.org/rfc/rfc9293', d='2022-08', who='doc'),
 'rfc8446': dict(t='RFC 8446, TLS 1.3 (full handshake in one round trip)', u='https://www.rfc-editor.org/rfc/rfc8446#section-2', d='2018-08', who='doc'),
 'rfc5246': dict(t='RFC 5246, TLS 1.2 (full handshake in two round trips)', u='https://www.rfc-editor.org/rfc/rfc5246#section-7.3', d='2008-08', who='doc'),
 'rfc6928': dict(t='RFC 6928, Increasing TCP\'s Initial Window (10 segments)', u='https://www.rfc-editor.org/rfc/rfc6928', d='2013-04', who='doc'),
 'redis_bench': dict(t='Redis documentation, "Redis benchmark" (example runs; machine not stated for the first)', u='https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/', d=READ, who='vendor'),
 'valkey8': dict(t='Valkey blog, "Unlock 1 Million RPS: Experience Triple the Speed with Valkey, part 2"', u='https://valkey.io/blog/unlock-one-million-rps-part2/', d='2024-09-13', who='vendor'),
 'so2016': dict(t='Nick Craver, "Stack Overflow: The Architecture, 2016 Edition" (one day, 2016-02-09)', u='https://nickcraver.com/blog/2016/02/17/stack-overflow-the-architecture-2016-edition/', d='2016-02-17', who='vendor'),
 'tw2013': dict(t='Twitter Engineering, "New Tweets per second record, and how!" (Wayback copy)', u='http://web.archive.org/web/20240411190703/https://blog.twitter.com/engineering/en_us/a/2013/new-tweets-per-second-record-and-how', d='2013-08-16', who='vendor'),
 'nv_h100': dict(t='NVIDIA H100 product page, specifications (SXM)', u='https://www.nvidia.com/en-us/data-center/h100/', d=READ, who='spec'),
 'nv_b200': dict(t='NVIDIA DGX B200 product page (8 GPUs: 64 TB/s HBM3e, 14.4 TB/s NVLink in total)', u='https://www.nvidia.com/en-us/data-center/dgx-b200/', d=READ, who='spec'),
 'llamacpp': dict(t='llama.cpp discussion #15013, "Performance of llama.cpp on Nvidia CUDA", scoreboard: Llama 2 7B Q4_0, H100 80 GB, no flash attention', u='https://github.com/ggml-org/llama.cpp/discussions/15013', d='2025-08-01', who='ind'),
 'gguf': dict(t='Hugging Face, TheBloke/Llama-2-7B-GGUF, file llama-2-7b.Q4_0.gguf (3,825,807,040 bytes)', u='https://huggingface.co/TheBloke/Llama-2-7B-GGUF/blob/main/llama-2-7b.Q4_0.gguf', d=READ, who='doc'),
 'vllm_sleep': dict(t='vLLM blog, "Sleep Mode" (reloading a model on demand: 30 to 100+ seconds per switch)', u='https://blog.vllm.ai/blog/2025-10-26-sleep-mode', d='2025-10-26', who='vendor'),
 'trtllm_repo': dict(t='NVIDIA TensorRT-LLM repository, docs/source/developer-guide/perf-overview.md at commit 8a9c66c (output tokens/s per GPU, max-throughput runs; file last changed 2026-09-11)', u='https://github.com/NVIDIA/TensorRT-LLM/blob/8a9c66ce086594054d3722307cfed2d658d25e60/docs/source/developer-guide/perf-overview.md', d='2026-09-11', who='vendor'),
 'trtllm': dict(t='NVIDIA TensorRT-LLM, "Performance Overview" docs page (max-throughput runs, v0.21 data, total output across the GPUs of the run; page updated 2026-09-29)', u='https://nvidia.github.io/TensorRT-LLM/performance/perf-overview.html', d='2026-09-29', who='vendor'),
 'te23': dict(t='TechEmpower Framework Benchmarks Round 23, physical hardware (Xeon Gold 6330, 56 cores, 40 Gbps); peaks extracted from the results JSON by extract_te_r23.py', u='https://www.techempower.com/benchmarks/#section=data-r23', d='2025-03-17', who='ind'),
 'ps_bench': dict(t='PlanetScale, "Benchmarks" and "PlanetScale vs Amazon Aurora" (TPCC-like ~500 GB, sysbench oltp_read_only ~300 GB; 4 vCPU, 32 GB)', u='https://planetscale.com/benchmarks/aurora', d=READ, who='vendor'),
 'kafka2020': dict(t='Confluent, "Benchmarking Apache Kafka, Apache Pulsar, and RabbitMQ" (3 brokers, i3en.2xlarge)', u='https://www.confluent.io/blog/kafka-fastest-messaging-system/', d='2020-08-21', who='vendor'),
 'vantage': dict(t='instances.vantage.sh (AWS price list mirror), us-east-1 on-demand, Linux', u='https://instances.vantage.sh/aws/ec2/p5.48xlarge', d=READ, who='doc'),
 'lambda': dict(t='Lambda, GPU cloud pricing, on-demand 8x instances, price per GPU per hour', u='https://lambda.ai/pricing', d=READ, who='doc'),
 'aws_dt': dict(t='AWS Price List API, AWSDataTransfer, us-east-1 (publication 2026-09-16)', u='https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/us-east-1/index.json', d='2026-09-16', who='doc'),
 'openrouter': dict(t='OpenRouter API, endpoints and prices for meta-llama/llama-3.3-70b-instruct', u='https://openrouter.ai/meta-llama/llama-3.3-70b-instruct/providers', d=READ, who='doc'),
 'sre_risk': dict(t='Google SRE book, ch. 3 "Embracing Risk"', u='https://sre.google/sre-book/embracing-risk/', d='2016', who='doc'),
 'calculus': dict(t='Treynor, Dahlin, Rau, Beyer, "The Calculus of Service Availability", ACM Queue 15(2) (Wayback copy)', u='http://web.archive.org/web/20251129231820/https://queue.acm.org/detail.cfm?id=3096459', d='2017', who='doc'),
 'oai_tokens': dict(t='OpenAI Help Center, "What are tokens and how to count them?" (1 token is about 4 characters; Wayback copy)', u='http://web.archive.org/web/20260923081649/https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', d='2026-09-23', who='doc'),
}

# ---------------------------------------------------------------- local measurements, read from inputs/
memp = {p['kib']: p['ns'] for p in mem['points']}
L1_NS, L2_NS, DRAM_NS = memp[64], memp[512], memp[524288]
SEQ_US_PER_MIB = mem['seq_read']['us_per_MiB']
FS_WRITE_US, FS_FSYNC_US, FS_FULL_US = fs['write_only']['median_us'], fs['fsync']['median_us'], fs['f_fullfsync']['median_us']
PG_SEL_MS = pg['select_only_1client']['latency_ms']
PG_TX_NOFLUSH_MS, PG_TX_FLUSH_MS = pg['tpcb_1client_default']['latency_ms'], pg['tpcb_1client_writethrough']['latency_ms']

# ---------------------------------------------------------------- derived constants (formula beside each)
FIBRE_KM_S = 200_000                       # wiki_fibre rule of thumb
def great_circle_km(a, b):                 # haversine, Earth radius 6,371 km
    (la1, lo1), (la2, lo2) = [(math.radians(x), math.radians(y)) for x, y in (a, b)]
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))
KM_VA_LON = great_circle_km((39.04, -77.49), (51.51, -0.13))   # Ashburn, Virginia to London
RTT_FLOOR_VA_LON_MS = 2 * KM_VA_LON / FIBRE_KM_S * 1000
GGUF_BYTES = 3_825_807_040
H100_HBM_BPS = 3.35e12                     # nv_h100, SXM
B200_HBM_BPS = 64e12 / 8                   # nv_b200, per GPU
TG_H100 = 267.81                           # llamacpp tg128, tokens/s, batch 1
PP_H100 = 9918.34                          # llamacpp pp512, tokens/s
DECODE_MS = 1000 / TG_H100
PREFILL512_MS = 512 / PP_H100 * 1000
DECODE_FLOOR_MS = GGUF_BYTES / H100_HBM_BPS * 1000
RPM = 7200; HALF_ROT_MS = 60 / RPM / 2 * 1000

AZ = {  # Azure P50 round trips in ms (azure_rtt), extracted from the doc's tables
 'eastus_eastus2': 8, 'eastus_westus': 69, 'eastus_uksouth': 78, 'westus_westeurope': 145, 'eastus_australiaeast': 201, 'eastus_japaneast': 162}

def P(v, src, kind=None, note='', lo=None, hi=None, label=''):
    """One point on a rung: v in seconds; kind defaults to the source's kind."""
    d = dict(v=v, src=src, k=kind or S[src]['who'], note=note, label=label)
    if lo is not None: d['lo'], d['hi'] = lo, hi
    return d
ns, us, ms = 1e-9, 1e-6, 1e-3

LADDER = [
 # ---- CPU and memory
 dict(id='l1', g='cpu', n='L1 cache hit', w='Reading a value the CPU core used a moment ago. The core keeps a tiny, very fast memory (the L1 cache, tens of kilobytes) right next to it.',
      pts=[P(0.5*ns, 'norvig', label='2001'), P(0.5*ns, 'dean', label='2009'),
           P(L1_NS*ns, 'local_mem', note=f'{L1_NS:.2f} ns per dependent load, 64 KiB working set (fits in the 128 KiB L1).', label='M1 Pro'),
           P(4/5.0e9, 'cc_hc', kind='derived', note='Zen 5 keeps a 4-cycle load-to-use latency (Chips and Cheese, Hot Chips 2024); 4 cycles at 5.0 GHz = 0.8 ns (clock chosen for illustration).', label='Zen 5, 4 cycles')]),
 dict(id='l2', g='cpu', n='L2 cache hit', w='The next, larger cache (megabytes). Still on the chip, a few times slower than L1.',
      pts=[P(7*ns, 'norvig', label='2001'), P(7*ns, 'dean', label='2009'),
           P(L2_NS*ns, 'local_mem', note=f'{L2_NS:.2f} ns, 512 KiB working set (M1 Pro has a 12 MiB L2 shared by a cluster).', label='M1 Pro')]),
 dict(id='dram', g='cpu', n='Main memory (RAM) read', w='Fetching a value that is in none of the caches, from the RAM sticks. The classic "100 ns" has barely moved in 25 years, while CPUs got much faster: that gap is why caches exist.',
      pts=[P(100*ns, 'norvig', label='2001'), P(100*ns, 'dean', label='2009'),
           P(70*ns, 'cc_9950x', note='"just over 70 ns" on a Ryzen 9 9950X with DDR5-6000 (a desktop; servers are typically slower, the same source notes).', label='Ryzen 9950X'),
           P(DRAM_NS*ns, 'local_mem', note=f'{DRAM_NS:.0f} ns with a 512 MiB working set; includes address-translation (TLB) misses, as real random access does.', label='M1 Pro')]),
 dict(id='seq1mb', g='cpu', n='Read 1 MB sequentially from memory', w='Streaming through a megabyte in order. Sequential reads are fast because the hardware prefetches the next bytes before you ask.',
      pts=[P(250*us, 'norvig', label='2001'), P(250*us, 'dean', label='2009'),
           P(SEQ_US_PER_MIB*us, 'local_mem', note=f'One thread summing a 1 GiB array: {mem["seq_read"]["GBps"]} GB/s, so {SEQ_US_PER_MIB} microseconds per MiB. About 14 times faster than the classic figure.', label='M1 Pro, 1 thread')]),
 # ---- storage
 dict(id='pagecache', g='disk', n='Write 4 KiB to a file (no fsync)', w='A normal write only copies your bytes into the operating system\'s page cache (RAM it uses to hold file data). It returns before anything touches the disk: fast, but lost if the power fails.',
      pts=[P(FS_WRITE_US*us, 'local_fs', note=f'Median {FS_WRITE_US} microseconds.', label='M1 Pro')]),
 dict(id='nvme', g='disk', n='SSD random read (NVMe, one at a time)', w='Reading one small block from a random place on a solid-state drive, waiting for each read before issuing the next ("queue depth 1"). NVMe is the fast interface modern SSDs use.',
      pts=[P(150*us, 'gist', label='~2012 gist'),
           P(102*us, 'mc_rocks', note='fio average 102 microseconds for 8 KB reads at io_depth 1 (about 11 of them are kernel CPU), consumer Crucial P3, 2025.', label='Crucial P3')]),
 dict(id='fsync_plp', g='disk', n='fsync, datacenter SSD with power-loss protection', w='fsync asks the OS to push a file\'s data all the way to stable storage and wait. A datacenter SSD with power-loss protection (capacitors that finish writes if power fails) can acknowledge as soon as the data is in its own cache.',
      pts=[P(1.6*us, 'mc_fsync', note='Samsung PM9A3: 1.6 microseconds per fsync after a 16 KB write.', lo=1.6*us, hi=12.4*us, label='PM9A3'),
           P(12.4*us, 'mc_fsync', note='Intel/Solidigm D7-P5520 (Hetzner server, RAID 1): 12.4 microseconds.', label='D7-P5520')]),
 dict(id='fsync_cloud', g='disk', n='fsync, cloud disks', w='The same durable write on rented cloud storage. A local NVMe disk attached to the VM is fast; a network block disk (the default "persistent disk" kind) adds a network round trip per flush.',
      pts=[P(56.2*us, 'mc_fsync', note='Google Cloud c3d local NVMe (RAID 0, ext4): 56 microseconds; xfs 40.', label='GCP local NVMe'),
           P(738.1*us, 'mc_fsync', note='Google Cloud Hyperdisk Balanced (network-attached, ext4): 738 microseconds per fsync; fdatasync only 47.', label='GCP Hyperdisk')]),
 dict(id='fsync_consumer', g='disk', n='fsync, consumer SSD', w='Laptop and desktop SSDs usually lack power-loss protection, so a real flush must wait until the data is written to flash.',
      pts=[P(891.1*us, 'mc_fsync', note='Crucial T500 (consumer NVMe; the author notes claims that it has PLP): 891 microseconds.', label='Crucial T500'),
           P(2974.2*us, 'mc_fsync', note='Samsung 990 Pro (consumer NVMe, no PLP): 2,974 microseconds, about 3 ms.', label='Samsung 990 Pro'),
           P(3.8*ms, 'percona_fsync', note='Samsung 960 Pro (high-end consumer NVMe, 2018): 3.8 ms; Intel P3700 (enterprise, PLP): 0.14 ms.', label='2018: 960 Pro')]),
 dict(id='fsync_mac', g='disk', n='fsync on a Mac: the trap', w='On macOS, plain fsync() returns once the drive has the data in its volatile cache; only fcntl(F_FULLFSYNC) forces a real flush. Databases on macOS must choose which they use (PostgreSQL\'s fsync_writethrough).',
      pts=[P(FS_FSYNC_US*us, 'local_fs', note=f'fsync(): median {FS_FSYNC_US} microseconds (not durable against power loss).', label='fsync()'),
           P(FS_FULL_US*us, 'local_fs', note=f'F_FULLFSYNC: median {FS_FULL_US/1000:.1f} ms, p99 {fs["f_fullfsync"]["p99_us"]/1000:.1f} ms: about {FS_FULL_US/FS_FSYNC_US:.0f} times slower.', label='F_FULLFSYNC')]),
 dict(id='hdd', g='disk', n='Hard disk: seek, and fsync', w='A spinning disk must move its arm and wait for the platter to rotate under it. At 7,200 rpm half a rotation alone is 4.2 ms.',
      pts=[P(8*ms, 'norvig', label='2001 seek'), P(10*ms, 'dean', label='2009 seek'),
           P(HALF_ROT_MS*ms, 'dean', kind='derived', note=f'Average rotational wait = half a turn = 60 / {RPM} / 2 = {HALF_ROT_MS:.2f} ms (before any arm movement).', label='half rotation'),
           P(18*ms, 'percona_fsync', note='7,200 rpm desktop SATA drives: 17 to 25 ms per fsync (about two rotations); 5,400 rpm: 45 to 66 ms.', lo=17*ms, hi=25*ms, label='HDD fsync')]),
 # ---- network
 dict(id='dcrtt', g='net', n='Round trip inside a region', w='A round trip (RTT) is the time for a message to reach another machine and the reply to come back. Inside one cloud region, machines sit in a few nearby data centres ("availability zones").',
      pts=[P(500*us, 'dean', label='2009, same DC'),
           P(2*ms, 'azure_az', kind='doc', note='Microsoft "strives to achieve" under about 2 ms between zones of a region (a target, not a measurement).', label='Azure: zone to zone, target'),
           P(AZ['eastus_eastus2']*ms, 'azure_rtt', note='Azure East US to East US 2 (two nearby Virginia regions): 8 ms P50.', label='East US to East US 2')]),
 dict(id='uscross', g='net', n='Round trip across the US', w='Virginia to California and back.',
      pts=[P(AZ['eastus_westus']*ms, 'azure_rtt', note='Azure East US to West US: 69 ms P50 (2026).', label='East US to West US')]),
 dict(id='atlantic', g='net', n='Round trip across the Atlantic', w='Virginia to London and back. Light in glass fibre covers about 200,000 km a second, so distance sets a floor no engineering can beat.',
      pts=[P(RTT_FLOOR_VA_LON_MS*ms, 'wiki_fibre', kind='derived', note=f'Floor: 2 x {KM_VA_LON:,.0f} km great-circle / 200,000 km/s = {RTT_FLOOR_VA_LON_MS:.0f} ms. Real cables are longer than the great circle.', label='physics floor'),
           P(AZ['eastus_uksouth']*ms, 'azure_rtt', note='Azure East US to UK South: 78 ms P50 (2026).', label='East US to UK South')]),
 dict(id='canl', g='net', n='California to the Netherlands and back', w='Dean\'s classic long-haul figure, set beside today\'s measurement for the same route.',
      pts=[P(150*ms, 'norvig', label='2001, US to Europe'), P(150*ms, 'dean', label='2009, CA to NL'),
           P(AZ['westus_westeurope']*ms, 'azure_rtt', note='Azure West US (California) to West Europe (Netherlands): 145 ms P50 (2026). Unchanged in 17 years: it is physics.', label='West US to West Europe')]),
 dict(id='far', g='net', n='Round trip to the other side of the world', w='Virginia to Sydney.',
      pts=[P(AZ['eastus_australiaeast']*ms, 'azure_rtt', note='Azure East US to Australia East: 201 ms P50.', label='East US to Australia')]),
 dict(id='tls', g='net', n='Open a new HTTPS connection (TCP + TLS 1.3)', w='Before the first request, TCP needs one round trip to set up the connection and TLS 1.3 one more to agree on encryption keys (TLS 1.2 needed two). So a new connection costs two RTTs before the request even leaves.',
      pts=[P(2*AZ['eastus_uksouth']*ms, 'rfc8446', kind='derived', note='2 RTT x 78 ms (Virginia to London) = 156 ms before the request is sent. TLS 1.2: 3 RTT = 234 ms. A reused connection pays 0.', label='TLS 1.3, transatlantic'),
           P(2*AZ['eastus_eastus2']*ms, 'rfc8446', kind='derived', note='2 RTT x 8 ms (two nearby Virginia regions) = 16 ms.', label='TLS 1.3, nearby region')]),
 # ---- databases and caches
 dict(id='pgsel', g='db', n='Database query: indexed lookup by primary key', w='Asking PostgreSQL for one row by its key, which it finds through an index (a sorted lookup structure) instead of scanning the table. Includes the client to server hop on the same machine; in production add the network round trip.',
      pts=[P(PG_SEL_MS*ms, 'local_pg', note=f'pgbench -S, 1 client: {PG_SEL_MS} ms average per query ({pg["select_only_1client"]["tps"]:,} queries/s from one connection).', label='laptop, loopback')]),
 dict(id='pgtx', g='db', n='Database write transaction (commit)', w='A small write transaction (three updates, a select, an insert) and its commit. A commit is durable only after the database flushes its write-ahead log with an fsync: the fsync rungs above decide this number.',
      pts=[P(PG_TX_NOFLUSH_MS*ms, 'local_pg', note=f'Default wal_sync_method ({pg["tpcb_1client_default"]["wal_sync_method"]}) on macOS: {PG_TX_NOFLUSH_MS} ms, but the drive cache is not flushed.', label='no real flush'),
           P(PG_TX_FLUSH_MS*ms, 'local_pg', note=f'wal_sync_method = fsync_writethrough (real flush): {PG_TX_FLUSH_MS} ms, {PG_TX_FLUSH_MS/PG_TX_NOFLUSH_MS:.0f} times slower; {pg["tpcb_1client_writethrough"]["tps"]} commits/s from one connection.', label='real flush')]),
 dict(id='redis', g='db', n='Redis GET or SET', w='An in-memory key-value store: a lookup is a hash-table probe, a few microseconds of server work. What you feel is the network round trip plus queueing.',
      pts=[P(0.143*ms, 'redis_bench', note='redis-benchmark SET, p50 0.143 ms with 50 parallel clients on loopback (Redis docs example; machine not stated).', label='docs example, p50')]),
 dict(id='sopage', g='db', n='A real web page render (Stack Overflow, 2016)', w='Server time for a whole page: many cache hits and a few SQL queries, glued together by application code.',
      pts=[P(22.71*ms, 'so2016', note='22.71 ms average for 49,180,275 question-page renders on 2016-02-09 (19.12 ms in ASP.NET).', label='question page')]),
 # ---- GPU and LLM
 dict(id='hbm1g', g='gpu', n='GPU reads 1 GB from its own memory (HBM)', w='High-bandwidth memory (HBM) is the GPU\'s RAM, stacked beside the chip. Its bandwidth sets how fast a model can generate tokens.',
      pts=[P(1e9/H100_HBM_BPS, 'nv_h100', kind='derived', note='1 GB / 3.35 TB/s (H100 SXM) = 0.30 ms.', label='H100'),
           P(1e9/B200_HBM_BPS, 'nv_b200', kind='derived', note='1 GB / 8 TB/s (B200: 64 TB/s across 8 GPUs) = 0.125 ms.', label='B200')]),
 dict(id='nvlink1g', g='gpu', n='Move 1 GB GPU to GPU (NVLink)', w='NVLink is NVIDIA\'s direct GPU-to-GPU link inside a server. The quoted figures add both directions.',
      pts=[P(1e9/450e9, 'nv_h100', kind='derived', note='H100: 900 GB/s total, so 450 GB/s each way: 1 GB in 2.2 ms.', label='H100 NVLink'),
           P(1e9/900e9, 'nv_b200', kind='derived', note='B200: 14.4 TB/s / 8 = 1.8 TB/s total, 900 GB/s each way: 1.1 ms.', label='B200 NVLink')]),
 dict(id='pcie1g', g='gpu', n='Move 1 GB CPU to GPU (PCIe Gen5 x16)', w='PCIe is the slot that connects the GPU to the rest of the server. Loading weights from host memory goes through it.',
      pts=[P(1e9/64e9, 'nv_h100', kind='derived', note='128 GB/s total, 64 GB/s each way: 1 GB in 15.6 ms.', label='PCIe Gen5')]),
 dict(id='decode', g='gpu', n='LLM: generate one token (batch of 1)', w='Decoding: producing the next token. With one request at a time the GPU must read every weight once per token, so memory bandwidth, not arithmetic, sets the speed.',
      pts=[P(DECODE_FLOOR_MS*ms, 'gguf', kind='derived', note=f'Floor: {GGUF_BYTES/1e9:.2f} GB of weights / 3.35 TB/s = {DECODE_FLOOR_MS:.2f} ms per token.', label='bandwidth floor'),
           P(DECODE_MS*ms, 'llamacpp', note=f'Llama 2 7B Q4_0 on an H100 80 GB, llama.cpp tg128 = {TG_H100} tokens/s, so {DECODE_MS:.2f} ms per token: {DECODE_FLOOR_MS/DECODE_MS*100:.0f}% of the bandwidth floor.', label='measured, H100')]),
 dict(id='ttft', g='gpu', n='LLM: read a 512-token prompt (prefill)', w='Prefill: the model reads the whole prompt in one parallel pass before the first output token. This is most of the time to first token (TTFT) when nothing is queued.',
      pts=[P(PREFILL512_MS*ms, 'llamacpp', note=f'Llama 2 7B Q4_0, H100, pp512 = {PP_H100:,} tokens/s: 512 tokens in {PREFILL512_MS:.1f} ms. Add network, queueing and batching delays for a real TTFT.', label='measured, H100')]),
 dict(id='reply', g='gpu', n='LLM: a 300-token reply', w='Prefill plus 300 decode steps, one request alone on the GPU (derived from the two rungs above).',
      pts=[P((PREFILL512_MS + 300*DECODE_MS)*ms, 'llamacpp', kind='derived', note=f'{PREFILL512_MS:.0f} ms + 300 x {DECODE_MS:.2f} ms = {(PREFILL512_MS + 300*DECODE_MS)/1000:.2f} s for a 7B model; larger models are proportionally slower.', label='7B, batch 1')]),
 dict(id='cold', g='gpu', n='LLM: load a model onto a GPU (cold start)', w='Starting a model server: copy tens of gigabytes of weights into GPU memory, compile and warm up. Web servers start in seconds; model servers in minutes.',
      pts=[P(65, 'vllm_sleep', note='"Reload models on-demand: 30-100+ seconds per switch" (vLLM blog, 2025), before any new machine has to be provisioned.', lo=30, hi=100, label='30 to 100+ s')]),
]
GROUPS = [('cpu', 'CPU and memory'), ('disk', 'Storage'), ('net', 'Network'), ('db', 'Databases and caches'), ('gpu', 'GPUs and LLMs')]

# ---------------------------------------------------------------- one request's time budget, before and after a change
# Every segment comes from a rung above (rung id in 'r') or is labelled illustrative ('ill': True).
HALF_USER = AZ['eastus_uksouth'] / 2          # user in London, servers in Azure East US (Virginia): half of 78 ms each way
ZONE = 2.0                                    # azure_az target, used as the round trip to a database or cache in another zone
TX_CLOUD = round(PG_TX_NOFLUSH_MS + 0.7381, 2)  # commit work (laptop, no flush) + one fsync on a network disk (Hyperdisk 738 us)
TITLE = round(ZONE + PREFILL512_MS + 12 * DECODE_MS, 1)   # call a 7B model in the same region for a 12-token title
KAFKA_ACK = 5.0                               # kafka2020: p99 5 ms at 200 MB/s, three replicas
def seg(lab, v, cls, r='', ill=False, lane='req', note=''):
    return dict(lab=lab, v=round(v, 2), c=cls, r=r, ill=ill, lane=lane, note=note)
BUDGET = [
 dict(id='conn', n='Reuse the connection',
      q='Your server (Virginia) calls a model API hosted in California for each chat reply. The user is in London.',
      before=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic', note='Half of the 78 ms transatlantic round trip.'),
              seg('Your code runs', 1, 'app', ill=True, note='Illustrative: parse, authenticate, build the prompt.'),
              seg('New TCP connection to the API', AZ['eastus_westus'], 'net', 'tls', note='TCP needs one round trip (69 ms, Virginia to California) before any data moves.'),
              seg('TLS 1.3 handshake', AZ['eastus_westus'], 'net', 'tls', note='One more round trip to agree encryption keys.'),
              seg('Send prompt, wait for first token', AZ['eastus_westus'] + PREFILL512_MS, 'gpu', 'ttft', note=f'One round trip (69 ms) plus prefill of a 512-token prompt ({PREFILL512_MS:.0f} ms, 7B model on an H100).'),
              seg('First token travels to London', HALF_USER, 'net', 'atlantic')],
      after=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic'),
             seg('Your code runs', 1, 'app', ill=True),
             seg('Send prompt on an open, pooled connection', AZ['eastus_westus'] + PREFILL512_MS, 'gpu', 'ttft', note='A connection pool keeps connections open between requests, so the two handshake round trips are paid once, not per request.'),
             seg('First token travels to London', HALF_USER, 'net', 'atlantic')],
      lesson='Two of the round trips were setup, not work. Connection reuse (HTTP keep-alive, a client-side pool) removes them; the cost is managing idle connections and their limits.'),
 dict(id='offpath', n='Move slow work off the request path',
      q='Sending a chat message also generates a conversation title with a small model and records an analytics event with a third-party service in California.',
      before=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic'),
              seg('Your code runs', 1, 'app', ill=True),
              seg('Save the message (commit)', TX_CLOUD, 'db', 'pgtx', note=f'{PG_TX_NOFLUSH_MS} ms of transaction work (measured) plus one 0.74 ms fsync on a network disk (Hyperdisk, measured by Callaghan).'),
              seg('Generate a title with a 7B model', TITLE, 'gpu', 'decode', note=f'2 ms round trip + {PREFILL512_MS:.0f} ms prefill + 12 tokens x {DECODE_MS:.1f} ms.'),
              seg('Send analytics event (pooled connection)', AZ['eastus_westus'], 'net', 'uscross', note='One round trip to California.'),
              seg('Reply travels to London', HALF_USER, 'net', 'atlantic')],
      after=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic'),
             seg('Your code runs', 1, 'app', ill=True),
             seg('Save the message (commit)', TX_CLOUD, 'db', 'pgtx'),
             seg('Put two jobs on a queue', KAFKA_ACK, 'q', 'kafka', note='Kafka p99 of 5 ms at 200 MB/s with three replicas (Confluent 2020, fsync off, Kafka\'s default): the job is held on three brokers, so you can reply.'),
             seg('Reply travels to London', HALF_USER, 'net', 'atlantic'),
             seg('Worker: generate the title', TITLE, 'gpu', 'decode', lane='bg', note='A background worker takes the job from the queue after the user already has the reply.'),
             seg('Worker: send analytics event', AZ['eastus_westus'], 'net', 'uscross', lane='bg')],
      lesson='The user waits only for what the reply needs. The rest still happens, later, on a worker; the cost is a queue to run, at-least-once delivery (a job can run twice) and a title that appears a moment after the message.'),
 dict(id='cache', n='Add a cache',
      q='Opening the conversation list runs one query for the list, then one more per conversation for its title: 21 queries for 20 conversations, each a round trip to a database in another zone (the "N+1 queries" pattern).',
      before=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic'),
              seg('Your code runs', 1, 'app', ill=True),
              seg('21 database queries, one after another', 21 * (ZONE + PG_SEL_MS), 'db', 'pgsel', note=f'21 x (2 ms zone round trip + {PG_SEL_MS} ms indexed lookup). The round trips, not the queries, are the cost.'),
              seg('Build the page', 2, 'app', ill=True, note='Illustrative.'),
              seg('Reply travels to London', HALF_USER, 'net', 'atlantic')],
      after=[seg('Request travels London to Virginia', HALF_USER, 'net', 'atlantic'),
             seg('Your code runs', 1, 'app', ill=True),
             seg('One cache read (the whole list, precomputed)', ZONE + 0.143, 'db', 'redis', note='One round trip plus a Redis GET (0.143 ms p50 under load, Redis docs).'),
             seg('Build the page', 2, 'app', ill=True),
             seg('Reply travels to London', HALF_USER, 'net', 'atlantic')],
      lesson='The cache turned 21 round trips into 1. What is left is the user\'s own 78 ms round trip across the Atlantic, which no server-side change can remove: the next step is serving from a region near the user. The cache\'s cost: stale data until it is invalidated, and one more system to run.'),
]

# ---------------------------------------------------------------- throughput and capacity
T = te['tests']
FW = [('aspnetcore', 'ASP.NET Core', 'C#'), ('fastify', 'Fastify', 'JavaScript (Node.js)'), ('gin', 'Gin', 'Go'), ('spring', 'Spring', 'Java'),
      ('fastapi', 'FastAPI', 'Python'), ('express', 'Express', 'JavaScript (Node.js)'), ('rails', 'Rails', 'Ruby'), ('django', 'Django', 'Python'), ('laravel', 'Laravel', 'PHP')]
DBKEY = {'fastify': 'fastify-postgres', 'express': 'express-postgres', 'django': 'django-postgresql'}
APPSERVERS = [dict(fw=n, lang=l, json=T['json'].get(k), db=T['db'].get(DBKEY.get(k, k)), fortune=T['fortune'].get(DBKEY.get(k, k))) for k, n, l in FW]
SO_REQ_DAY, SO_WEB = 209_420_973, 9
THROUGHPUT = dict(
 app=dict(src='te23', rows=APPSERVERS, so=dict(req_day=SO_REQ_DAY, servers=SO_WEB, per_server=round(SO_REQ_DAY / 86400 / SO_WEB))),
 pg=[dict(lab='PostgreSQL, sysbench oltp_read_only (~300 GB), PlanetScale M-320 (4 vCPU, 32 GB, local NVMe)', v=35000, unit='queries/s', src='ps_bench', note='"~35,000 QPS"; Amazon Aurora also "~35,000" in the same test.'),
     dict(lab='PostgreSQL, TPCC-like (~500 GB, reads and writes), PlanetScale M-320', v=18000, unit='queries/s', src='ps_bench', note='"~18,000 QPS"; Aurora "~12,000" on matched vCPU and RAM.'),
     dict(lab='PostgreSQL 16 on this laptop, indexed lookups, 1 connection', v=pg['select_only_1client']['tps'], unit='queries/s', src='local_pg', note=f'Little\'s law: 1 connection / {PG_SEL_MS} ms per query = {1/PG_SEL_MS*1000:,.0f} per second.'),
     dict(lab='PostgreSQL 16 on this laptop, indexed lookups, 8 connections', v=pg['select_only_8clients']['tps'], unit='queries/s', src='local_pg', note=f'8 connections / {pg["select_only_8clients"]["latency_ms"]} ms = {8/pg["select_only_8clients"]["latency_ms"]*1000:,.0f} per second.'),
     dict(lab='PostgreSQL 16 on this laptop, write transactions with a real flush, 1 connection', v=pg['tpcb_1client_writethrough']['tps'], unit='commits/s', src='local_pg', note='One connection can commit only as fast as the disk flushes; databases group many connections\' commits into one flush (group commit).')],
 redis=[dict(lab='Redis SET, 50 clients, no pipelining (docs example; machine not stated)', v=180180, unit='requests/s', src='redis_bench'),
        dict(lab='Redis GET, pipelining 16 commands, MacBook Air (docs example)', v=1811594, unit='requests/s', src='redis_bench', note='Pipelining sends many commands per round trip.'),
        dict(lab='Valkey 8.0 SET, 512 B values, 8 I/O threads, AWS c7g.4xlarge (16 vCPU)', v=1190000, unit='requests/s', src='valkey8', note='The project\'s own benchmark.')],
 kafka=[dict(lab='Kafka peak throughput, 3 brokers on i3en.2xlarge (8 vCPU, 2 NVMe), 3 replicas', v=605, unit='MB/s', src='kafka2020', note='Run with fsync off, Kafka\'s default: the broker acknowledges once the replicas have the write in memory and relies on replication, not a disk flush, for durability. Confluent also ran fsync on every message and reported comparable throughput at larger batch sizes.'),
        dict(lab='Kafka p99 latency at 200 MB/s (producer to consumer)', v=5, unit='ms', src='kafka2020', note='Also with fsync off (Kafka\'s default); with a flush per message Confluent reported latency still below Pulsar\'s up to about p99.9.')],
 gpu=[dict(lab='Llama 3.3 70B FP8, 2 x H100 (tensor parallel 2), 1,000 in / 1,000 out tokens per request', per=2209, gpus=2, src='trtllm_repo',
           note='Older reading: 4,181.06 tokens/s total across 2 GPUs (2,091 per GPU), docs v0.21.'),
      dict(lab='Llama 3.3 70B FP8, 2 x H200 (tensor parallel 2), 1,000 / 1,000', per=2587, gpus=2, src='trtllm_repo',
           note='Older reading: 4,773.33 total across 2 GPUs, docs v0.21.'),
      dict(lab='Llama 3.3 70B FP4, 1 x B200, 1,000 / 1,000', per=6920, gpus=1, src='trtllm_repo', note='Older reading: 6,434.29, docs v0.21.'),
      dict(lab='GPT-OSS 20B FP8, 1 x H100, 1,000 / 1,000', per=11557, gpus=1, src='trtllm_repo'),
      dict(lab='Llama 3.1 8B FP8, 1 x H100, 1,000 / 1,000 (not in the 8a9c66c file)', per=14991.62, gpus=1, src='trtllm', note='One GPU, so the total is the per-GPU figure; docs v0.21.'),
      dict(lab='Llama 2 7B Q4_0, 1 x H100, one request at a time (llama.cpp)', per=TG_H100, gpus=1, src='llamacpp', note='Batch of 1: the per-user speed, not the GPU\'s capacity.')],
)
PRICES = [
 dict(lab='m7i.large: 2 vCPU, 8 GiB (general purpose, Intel)', v=0.1008, per='hour', src='vantage', unit='instance'),
 dict(lab='m7i.xlarge: 4 vCPU, 16 GiB (general purpose, Intel; the calculator\'s default app server)', v=0.2016, per='hour', src='vantage', unit='instance'),
 dict(lab='r7g.xlarge: 4 vCPU, 32 GiB (memory-optimised, Graviton; a typical small database)', v=0.2142, per='hour', src='vantage', unit='instance'),
 dict(lab='c7g.4xlarge: 16 vCPU, 32 GiB (compute-optimised, Graviton; the Valkey benchmark machine)', v=0.58, per='hour', src='vantage', unit='instance'),
 dict(lab='p5.48xlarge: 8 x H100 80 GB', v=55.04, per='hour', src='vantage', unit='instance', gpu=8),
 dict(lab='p6-b200.48xlarge: 8 x B200', v=113.9328, per='hour', src='vantage', unit='instance', gpu=8),
 dict(lab='Lambda on-demand, 8 x H100 SXM, per GPU', v=3.99, per='hour', src='lambda', unit='GPU', gpu=1),
 dict(lab='Lambda on-demand, 8 x B200 SXM6, per GPU', v=6.69, per='hour', src='lambda', unit='GPU', gpu=1),
]
EGRESS = dict(src='aws_dt', tiers=[[10240, 0.09], [51200, 0.085], [153600, 0.07], [None, 0.05]], inter_az=0.01, inter_region=0.02,
              note='AWS us-east-1 to the internet, per GB per month, after the global free tier (100 GB a month); between availability zones $0.01/GB in each direction; to another AWS region $0.02/GB.')
API_PRICE = dict(src='openrouter', model='Llama 3.3 70B Instruct', out_lo=0.32, out_hi=2.253, in_lo=0.10, in_hi=1.04, n=12,
                 note='Price per million output tokens across 12 providers listed on OpenRouter (DeepInfra lowest, Cloudflare highest).')

# ---------------------------------------------------------------- estimate calculator: defaults and drills
HOURS_MONTH = 730
DEFAULT = dict(dau=1_000_000, per=30, peak=2, wfrac=0.1, wbytes=1800, rep=3, resp=20, srv=500, srvp=0.2016,
               msgs=10, intok=1000, outtok=400, gtok=2209, derate=0.5, gpup=3.99)
DRILLS = [
 dict(id='tw', n='Tweets per second (Twitter, 2013)', set=dict(dau=500_000_000, per=1, peak=25, wfrac=0, msgs=0, resp=0, srv=0),
      ask='Twitter said it takes in "more than 500 million Tweets a day". How many per second on average, and what peak should it plan for?',
      check=dict(src='tw2013', text='Twitter: "about 5,700 Tweets a second, on average"; record one-second peak 143,199 on 2013-08-03, "around 25 times greater than our steady state".',
                 avg=5700, peak=143199, by_construction='The peak factor 25 comes from the same post, so the peak matches by construction; the average matches independently.')),
 dict(id='so', n='A web tier (Stack Overflow, 2016)', set=dict(dau=SO_REQ_DAY, per=1, peak=2, wfrac=0, resp=5.92, srv=539, msgs=0),
      ask='Stack Overflow\'s load balancers saw 209,420,973 HTTP requests on 2016-02-09, and sent 1.24 TB of HTTP traffic. How many requests per second, how much bandwidth, and how many web servers?',
      check=dict(src='so2016', text='Stack Overflow ran this on 9 primary web servers. 1.24 TB / 209.4 M requests = 5.92 KB average response; the peak factor 2 and 539 requests/s per server are assumptions chosen so that 9 servers come out.',
                 servers=9, by_construction='Response size and servers per peak are back-solved from the post, so those match by construction; the per-second rate is plain arithmetic.')),
 dict(id='chat', n='GPUs for a chat feature (1 M daily users)', set=dict(dau=1_000_000, per=30, peak=2, msgs=10, intok=1000, outtok=400, gtok=2209, derate=0.5, gpup=3.99),
      ask='A chat assistant with 1 million daily users, 10 messages each (10 million a day, the Reading\'s estimate), 1,000 input and 400 output tokens per reply (the Reading\'s and the Scale simulator\'s request shape), served with Llama 3.3 70B on rented H100s. How many GPUs, and what do they cost?',
      check=dict(src='openrouter', text='Compare the cost per million output tokens with what API providers charge for the same open model: $0.32 to $2.25 per million output tokens on OpenRouter.',
                 by_construction='GPU throughput is NVIDIA\'s maximum-throughput figure per GPU (vendor, repo commit 8a9c66c); the 50% derate for interactive speed is illustrative; the peak factor 2 matches the Reading and the Scale simulator (a daily peak about twice the average, an assumption, not a measurement).')),
 dict(id='store', n='Storage for chat history', set=dict(dau=1_000_000, per=10, wfrac=1, wbytes=1800, rep=3, msgs=0, resp=0, srv=0),
      ask='Store every message and reply: about 100 tokens in, 300 out, at about 4 characters per token, plus 200 bytes of metadata. How much disk a year, with 3 copies?',
      check=dict(src='oai_tokens', text='OpenAI: "1 token is approximately 4 characters" (English). (100 + 300) x 4 + 200 = 1,800 bytes per message.',
                 by_construction='Message sizes are illustrative; the 4 characters per token is OpenAI\'s rule of thumb.')),
 dict(id='egress', n='Egress bill for images', set=dict(dau=1_000_000, per=20, resp=200, wfrac=0, msgs=0, srv=0),
      ask='Each daily user loads 20 images of 200 KB from your servers on AWS. What is the monthly internet egress bill?',
      check=dict(src='aws_dt', text='AWS us-east-1 tiers: $0.09/GB for the first 10 TB a month, $0.085 next 40 TB, $0.07 next 100 TB, $0.05 beyond (price list of 2026-09-16).',
                 by_construction='Prices are AWS list prices; the traffic is illustrative. A CDN or a provider with free egress changes the answer, which is the point.')),
]

# ---------------------------------------------------------------- availability
AVAIL = dict(levels=[0.99, 0.995, 0.999, 0.9995, 0.9999, 0.99999],
             chain=[dict(n='Load balancer', a=0.9999), dict(n='App servers', a=0.999), dict(n='Database', a=0.9995), dict(n='Cache', a=0.999), dict(n='Model API', a=0.995)],
             sre=dict(req_day=2_500_000, slo=0.9999, errors=250, src='sre_risk'),
             extra9=dict(slo=0.9999, deps=5, dep_a=0.99999, src='calculus'))

DATA = dict(asof=READ, sources=S, groups=GROUPS, ladder=LADDER, budget=BUDGET, thr=THROUGHPUT, prices=PRICES, egress=EGRESS, api=API_PRICE,
            hours_month=HOURS_MONTH, defaults=DEFAULT, drills=DRILLS, avail=AVAIL,
            derived=dict(km_va_lon=round(KM_VA_LON), rtt_floor_va_lon_ms=round(RTT_FLOOR_VA_LON_MS, 1), decode_ms=round(DECODE_MS, 3),
                         prefill512_ms=round(PREFILL512_MS, 2), decode_floor_ms=round(DECODE_FLOOR_MS, 3)))
if __name__ == '__main__':
    json.dump(DATA, open(os.path.join(HERE, 'num_data.json'), 'w'), indent=1, ensure_ascii=False)
    js = '// ---- Numbers to know (t-num): data, generated by src/num/build_data.py. Do not edit by hand. ----\nwindow.NUM_DATA=' + json.dumps(DATA, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(HERE, '..', 'parts', '32_js_num_data.js'), 'w').write(js)
    print('rungs', len(LADDER), 'points', sum(len(r['pts']) for r in LADDER), 'js bytes', len(js))
