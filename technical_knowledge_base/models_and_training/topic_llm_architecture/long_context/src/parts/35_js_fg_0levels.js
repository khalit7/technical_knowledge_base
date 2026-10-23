// "Fit the model" game: the six briefs, their reference solutions and debriefs (hand-written game design, not data).
// Every memory number is computed at run time by window.KC (19_js_kc_1core.js), the calculator's engine; every
// quality number is read from window.EVD (this page's recorded eviction and quantisation runs) or from FGQ below,
// whose values are quoted from the pages named beside them (src/game/check_game.mjs checks they are still there).
window.FGQ={
  // DeepSeek-V2 Appendix D.1, Table 8 and Table 9, as quoted on Attention variants (section 2 and section 3)
  t8:{mha:45.2,gqa8:41.2,mqa:37.9},
  t9:{mha:48.7,mla:50.0},
  src:{
    t8:'DeepSeek-V2 Appendix D.1, Table 8 (DeepSeek\'s own runs): 7B dense models trained on 1.33T tokens, MMLU MHA 45.2, GQA-8 41.2, MQA 37.9; quoted on {{Attention variants|n:3fd5c17b0d0d8120859ecc2d0236e846}}, section 2.',
    t9:'DeepSeek-V2 Table 9 (DeepSeek): MLA above MHA at two MoE scales, MMLU 50.0 against 48.7 (small) and 59.0 against 57.5 (about 250B); a different setup from Table 8, so the two tables are not one scale. {{Attention variants|n:3fd5c17b0d0d8120859ecc2d0236e846}}, section 3.',
    pk:'This page, {{section 4|#t-read}}: SmolLM2-135M, 30 pass-key prompts at 4,096 tokens (a planted five-digit number); the full cache answers 29 of 30, so one prompt is 3.3 points. measured on Apple M1 Pro (CPU).',
    q8:'{{Batching, KV cache and scheduling|n:3c65c17b0d0d819db53bd2c48909e5b2}}, section 8: Qwen3-1.7B perplexity 15.18 with an F16 cache, 15.18 with q8_0, 19.42 with q4_0 (4.5 bits, 28% worse). measured',
    gem:'Gemma 3 report (vendor): changing the local : global ratio has "minimal impact on perplexity", "even with 7-to-1 local to global"; no benchmark number, and perplexity is the test {{section 4|#t-read}} found blind to retrieval.',
    mix:'MixAttention (Rajput et al. 2024, third-party, RULER): long-context ability needs "at least one standard attention KV cache that is computed in the deeper layers"; quoted in {{section 5|#t-read}}.',
    dec:'Decode of one attention layer at Llama 3.1 8B\'s shape, batch 4, 32,768 cached tokens, fp16 on the M1 Pro\'s GPU: MHA 17.49 ms, GQA-8 5.97, MLA (absorbed) 3.43, MQA 1.54 ({{Attention variants|n:3fd5c17b0d0d8120859ecc2d0236e846}}, section 1, measured).',
    blk:'Counted as if every dropped entry were freed, as in the calculator; a paged engine frees only whole blocks, and per-head selections freed 0% of 16-token blocks on the {{Batching page|n:3c65c17b0d0d819db53bd2c48909e5b2}}. The prefill still builds the full cache before it is compressed.'
  }
};
window.FGL=[
{name:'Free bits',model:'llama-3.1-8b',mlabel:'Llama 3.1 8B',rel:'gqa8',ctx:32768,users:24,gpu:0,n:1,maxN:2,wdt:2,mmlu:0,pk:5,retrain:false,q:'with',far:false,
 cards:['prec','gpu','users'],
 isnew:'The cache, not the weights, grows with every user: each one holds 4.29 GB at 32K, so after the weights only 13 fit on one GPU.',
 ref:{des:'cfg',kvb:1,keep:1,n:1},
 real:'Serving engines ship this lever: vLLM and SGLang offer an FP8 cache, llama.cpp q8_0 (Batching page). Llama 3.1 8B\'s own answer to cache size was made in training: 8 KV heads for 32 query heads (GQA-8), a quarter of an MHA cache.',
 why:'Halving the bytes per number halves every brick, and 8 bits cost nothing measurable (29 of 30 pass-key prompts, as with the full cache); 4 bits cost 3 prompts, more than the client allows.',
 links:[['section 3: fewer bits','lc-s3'],['the calculator','t-kv']]},
{name:'One user weighs a model',model:'llama-3.1-8b',mlabel:'Llama 3.1 8B',rel:'gqa8',ctx:131072,users:8,gpu:0,n:1,maxN:2,wdt:2,mmlu:0,pk:5,retrain:false,q:'with',far:false,
 cards:['prec','evict','gpu','users'],
 isnew:'Four times the context: one user\'s cache (17.18 GB) now outweighs the model (16.06 GB). New card: eviction. The question arrives with the document, so a question-aware policy can see it.',
 ref:{des:'cfg',kvb:1,keep:0.5,n:1},
 real:'Llama 3.1 8B advertises 131,072 tokens with its GQA-8 cache unchanged; the {{hero figure|#t-read}} shows one such request filling as much memory as the weights.',
 why:'FP8 alone leaves 84.8 GB against 73.6 usable. SnapKV keeps what the question attends to, so with the question in the prompt it still answered 29 of 30 at a quarter of the cache; the saving is algorithmic, not what a paged engine frees.',
 links:[['section 4: eviction','lc-s4'],['section 1: one token\'s cost','lc-s1']]},
{name:'The question comes later',model:'llama-3.1-8b',mlabel:'Llama 3.1 8B',rel:'gqa8',ctx:131072,users:12,gpu:0,n:1,maxN:4,wdt:2,mmlu:0,pk:5,retrain:false,q:'later',far:false,
 cards:['prec','evict','gpu','users'],
 isnew:'A multi-turn chat with 12 users: each document is cached before anyone asks about it, so eviction has to choose without the question.',
 ref:{des:'cfg',kvb:1,keep:1,n:2},
 real:'{{Section 9|#t-read}} meets the same wall at 32 users: no deployment lever alone reaches the target; the levers that do (fewer KV heads, local layers) are chosen in training.',
 why:'Scored before the question, SnapKV answered 9 of 30 prompts at half the cache and 0 at a quarter; INT4 misses by 0.44 GB and costs 3 prompts. With fixed weights and no retraining, a second GPU (weights and caches split by tensor parallelism) plus FP8 is the honest answer.',
 links:[['section 4: the question-timing test','lc-s4'],['section 9: designing for a budget','lc-s9']]},
{name:'Redesign an MHA model',model:'llama-2-7b',mlabel:'a new model at Llama 2 7B\'s shape (32 query heads, MHA)',rel:'mha',ctx:32768,users:16,gpu:0,n:1,maxN:4,wdt:2,mmlu:5,pk:5,retrain:true,q:'later',far:false,
 cards:['des','prec','evict','gpu','users'],
 isnew:'You are training the successor, so the attention design is yours to choose. New card: attention design, priced in MMLU points from DeepSeek-V2\'s ablations; the client gives up at most 5.',
 ref:{des:'mla',kvb:2,keep:1,n:1},
 real:'The same pressure, two answers. Meta moved from Llama 2\'s MHA to GQA with 8 KV heads (the default of almost every 2024 to 2026 open model without MLA); DeepSeek-V2 chose MLA, which its Table 9 places above MHA with a 15.6K against 110.6K element cache.',
 why:'MQA fits with room to spare, but its published cost (MMLU 37.9 against 45.2) breaks the limit; GQA-8 costs 4.0 and still needs FP8 to fit 16 users; MLA keeps per-head projections either side of one shared latent, which is why its quality holds where MQA\'s does not.',
 links:[['Attention variants: MQA, GQA and MLA','av'],['section 3: smaller entries','lc-s3']]},
{name:'Already MLA',model:'deepseek-v3',mlabel:'DeepSeek-V3 (MLA, weights in fp8)',rel:'mla',ctx:131072,users:72,gpu:1,n:8,maxN:16,wdt:1,mmlu:0,pk:5,retrain:false,q:'later',far:false,
 cards:['des','prec','evict','gpu','users'],
 isnew:'A model that already uses MLA, on one 8-GPU node: the weights alone take 671 GB. The attention card is shown but locked: these are released weights.',
 ref:{des:'cfg',kvb:1,keep:1,n:8},
 real:'DeepSeek stores this cache in 8 bits itself: V3.2\'s released FP8 decode layout is 48,068 bytes per token (FlashMLA, DeepSeek page as quoted in {{section 1|#t-read}}), and V2\'s "93.3% smaller cache" reproduces only with a cache of about 6 bits.',
 why:'MLA already caches 576 numbers per layer where MHA at this shape would cache 32,768: the design card has nothing left to give. What remains is bits; a second node also fits, at 16 GPUs. The INT4 evidence was measured on a GQA cache, not on MLA latents.',
 links:[['section 3: the MLA headline reconciled','lc-s3'],['Attention variants: MLA','av']]},
{name:'Design for 32 users at 128K',model:'llama-3.1-8b',mlabel:'a new model at Llama 3.1 8B\'s shape (GQA-8)',rel:'gqa8',ctx:131072,users:32,gpu:0,n:1,maxN:8,wdt:2,mmlu:2,pk:5,retrain:true,q:'later',far:true,
 cards:['des','win','prec','evict','gpu','users'],
 isnew:'The brief of section 9, as a game. New card: local layers. The client needs every old token reachable, and allows at most 2 MMLU points.',
 ref:{des:'lg51',kvb:1,keep:1,n:1},
 real:'Gemma 3 took this layout: "a pattern of 5 local layers for every global layer" with a span of "only 1024 tokens", introduced because of "the memory explosion of the KV cache" (Gemma 3 report, vendor); gpt-oss alternates 1 : 1 with a 128-token window. Mistral 7B v0.1 windowed every layer at 4,096 ("reduces the cache memory usage by 8x", Mistral paper, vendor).',
 why:'27 of the 32 layers become local and stop at 1,024 entries, so only the global layers grow; FP8 halves the rest. MQA fits too but costs 3.3 MMLU against GQA-8; every layer windowed fits but leaves no layer that reads an old token directly. The 5 : 1 layout has no published benchmark cost: verify it with a retrieval test at 128K.',
 links:[['section 5: local and global layers','lc-s5'],['section 9: the design review answer','lc-s9'],['Attention variants: windows','av']]}
];
