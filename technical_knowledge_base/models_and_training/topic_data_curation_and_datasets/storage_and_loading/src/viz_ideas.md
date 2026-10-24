# Visualisation ideas: Storage and loading at scale

Central question: what does each token cost to store and to deliver, and can the run restart and get exactly the next batch?
Scores 0 to 2 on: parameter to move, reproduces a figure (x2), computable from public or measured data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step animation against the method it replaced; minus build cost.

| # | Idea | What it shows | Data | Placement | Score | Status |
|---|---|---|---|---|---|---|
| SL1 | Megatron's three indices, step by step, against nanoGPT random offsets | 12 real documents: document_index shuffle over 2 epochs, sample_index cuts, shuffle_index reads one sample per step, resume by consumed_samples; toggle: random windows with a coverage strip (never, once, twice) | megatron_demo.py, line-for-line port at 80781ab | Reading, section 5 | 14 | built |
| SL2 | Packing lab | Pad, truncate, concatenate, best-fit decreasing on 12 real documents, animated placement, attention picture per window with and without a document mask; live table on 2,000 documents checked against packing.py; 50,000-document table; length histogram with L | packing.py | Own tab | 15 | built |
| SL3 | Shuffle visualiser | 2,200 documents from 11 sorted shards, read under 13 recorded schemes from the real libraries (datasets 5.0.1, DataLoader 4 workers, MosaicML shuffle functions, global permutation) and a live buffer shuffle; per-batch distance from the true mix, animated batch by batch | shuffle.py | Own tab | 14 | built |
| SL4 | Resume panel | Uninterrupted vs stopped-and-resumed order for index, restart and buffer loaders, k and B sliders; mirror reproduces the measured "B never read" | resume.py (measured), JS mirror (illustrative) | Shuffle tab | 11 | built |
| SL5 | Format comparer | 30 variants: bytes, bytes per token, rough read MB/s, random-access docs/s, 2k and 50k samples; feature matrix; scale-up to T tokens | formats.py | Own tab | 12 | built |
| SL6 | Throughput calculator | 6N tokens/s, bytes/s, step time, days, storage, online-tokenizing CPUs; log bars against a measured loader and Llama 3's storage fabric; Llama preset reproduces 3.8e25 FLOPs independently | Llama 3 Table 4, measured rough rates | Own tab | 12 | built |
| SL7 | FineWeb Parquet anatomy | A real 2.15 GB FineWeb shard: column bytes, 972 row groups and the 3.8 MB footer to scale | footer by HTTP range | Reading, section 3 | 9 | built |
| SL8 | uint16 wrap, predict then reveal | 1,942 of 2,000 documents corrupted; top wrapped ids and a sentence before/after | formats.py, megatron_demo.py | Reading, section 5 | 10 | built |
| SL9 | Compression levels bars + predict | gzip 1/6/9 against zstd 1/3/9/19 | formats.py | Reading, section 2 | 7 | built |
| SL10 | Live S3 streaming benchmark | | | | | rejected: a laptop on home broadband measures nothing that transfers |
| SL11 | Rebuilt pad vs pack animation | | | | | rejected: the root's Tool map has it; SL2 extends it instead |
| SL12 | Megatron blending animation | | | | | rejected: owned and built by Data mixing |
| SL13 | Loader trace (GPU idle while waiting for data) | | | | | rejected: owned by Making training fast (PyTorch topic) |

What the methodology lacked here: a rule for "real library, recorded output" vs "page mirror of the algorithm": both were used, the mirror labelled illustrative and checked to reproduce the recorded count where they overlap.

## 2026-10-24 rebuild (teaching contract)
| # | Idea | Placement | Status |
|---|---|---|---|
| SL2, SL3, SL4, SL6 | Packing lab, shuffle visualiser, resume panel, throughput calculator | moved from their tabs into Reading sections 6, 8, 11 and 12, beside the claims they prove | moved |
| SL5 | Format comparer | stays a tab: it spans sections 2 to 5 and every format at once | kept |
| SL14 | Hero: bytes per token of every stored form to scale, then the computed order and the checkpoint loop | Reading, top | built (static annotated diagram) |
| SL15 | One tar member to scale (PAX header, header, mean payload, padding), the whole tar's payload share, an MDS shard and index.json | Reading, section 4 | built (static, derived from the tar format and measured totals) |
| SL16 | Index-based slice of a global batch against shard-based dealing of 11 shards to 2 ranks x 4 workers | Reading, section 7 | built (static, illustrative) |
| SL17 | Prefetch before/after on the same 16 steps (measured on the ML infra Storage lab), plus a fetch-time slider on a stated model | Reading, section 10 | built; absorbed from Storage and data movement, which should now link here |
| SL18 | A real photo or paper figure | | rejected: nothing physical to show; the Ding et al. figure is not openly licensed and the stepper shows the same packing |
