// ---- Shared link helper: every external or Notion link opens in a new tab ----
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
const AA='https://artificialanalysis.ai/leaderboards/models';
const NP=id=>'https://app.notion.com/p/'+id;
// ---- Overview: each lab's best model on the Intelligence Index v4.3 (Artificial Analysis, methodology 4.3.2; whole points as the leaderboard shows them) ----
(function(){
  // [lab, model (effort), index v4.3, cost per index task in $ (null: no API price), open?, reading]
  const B=[
    ['Anthropic','Claude Opus 5.5 (max)',58,5.98,0],
    ['Meta','Muse Wonder Full (max)',56,null,0],
    ['OpenAI','GPT-6 Astra (max)',53,3.26,0],
    ['Google DeepMind','Gemini 4 Argon (high)',53,1.99,0],
    ['xAI / SpaceXAI','Grok 4.7 (xhigh)',46,3.74,0],
    ['Xiaomi','MiMo-V2.6-Pro',46,0.13,1],
    ['DeepSeek','V4.1-Flash-1017 (max)',45,0.26,1],
    ['Zhipu','GLM-5.3 (max)',45,2.01,1],
    ['Alibaba Qwen','Qwen3.8 Max (0902)',45,5.41,0],
    ['StepFun','Step 5 Preview',44,0.72,1],
    ['Moonshot AI','Kimi K3 (max)',44,2.00,1],
    ['MiniMax','M3.1 Flash',42,0.22,0],
    ['Mistral','Large 4 (preview)',38,1.13,0],
    ['Tencent','Hy3',25,0.072,1]
  ];
  const el=document.getElementById('ovBars');
  el.innerHTML=B.map(b=>'<div class="row"><span class="nm"><b>'+b[0]+'</b><span class="ml">'+b[1]+'</span></span><span class="track"><span class="fill" style="width:'+(100*b[2]/60).toFixed(1)+'%;background:'+(b[4]?'var(--open)':'var(--closed)')+'"></span></span><span class="val">'+b[2]+' · '+(b[3]==null?'no API':'$'+(b[3]<0.1?b[3].toFixed(3):b[3].toFixed(2)))+'</span></div>').join('')+
  '<p class="small mute" style="margin:6px 0 0">Bar: index v4.3 (scale to 60). Right: score · cost per index task. Read 19 October 2026 from the leaderboard and model pages; Qwen, Tencent and the costs of runs that have not changed are from the 1 October reading. Muse Wonder Full is sold only inside Meta\'s Muse Code (Muse Wonder on the API scores 52 at $4.52). MiniMax M3.1 Flash and Mistral Large 4 are API-only until their promised weights ship, and Qwen3.8 Max is an API snapshot; Qwen\'s best open model, the 2.4T A95B, scores 39.9.</p>';
})();
// ---- The labs compared ----
(function(){
  const $=id=>document.getElementById(id);
  // w: 'o' open weights, 'c' closed, 'f' fully open; att: ships trainable sparse or linear attention
  const L=[
    {id:'oai',w:'c',n:'OpenAI',f:'GPT-6 Astra, GPT-6.1 Sol, GPT-6 Luna',pg:'3c65c17b0d0d814abf90d5b9e567d72f',
     open:'Closed. The open offshoot gpt-oss comes in 117B / 5.1B active and 21B / 3.6B under Apache 2.0 ('+A('https://www.infoq.com/news/2025/08/openai-gpt-oss/','InfoQ')+').',
     think:'A per-request router decides whether to reason, and the reasoning is not returned. GPT-6 Astra also loops activations through its own layers, so part of its deliberation never becomes text ('+A('https://openai.com/index/gpt-6-astra/','OpenAI')+').',
     serve:'No parameter counts or architecture published. Sol and Luna are price bands beneath Astra, described only as trained like it ('+A('https://venturebeat.com/technology/openai-releases-gpt-6-sol-and-luna-models-slashing-api-costs-50-or-more','VentureBeat')+').',
     pos:'GPT-6 Astra 52.7 at $3.26 a task; GPT-6.1 Sol 51.8 at $0.72, under a quarter of Astra\'s cost for 0.9 points less; GPT-6 Luna 38.1 at $0.068 ('+A(AA,'AA')+', 1 October).',
     note:'GPT-6 Sol and Luna became ChatGPT\'s Chat default in October 2026, and the Decisions API (typed answers on GPT-6 Luna, input-only pricing) put OpenAI into the decision-model category.'},
    {id:'ant',w:'c',n:'Anthropic',f:'Claude Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1',pg:'3c65c17b0d0d814cb979d0eabca59a45',
     open:'Closed.',
     think:'The caller sets an effort level and the model decides how long to think. Thinking is billed as output but returned only as a summary, and "preserved thinking" binds it to an unedited history, which Anthropic says is to stop distillation ('+A('https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf','system card')+').',
     serve:'Architecture not published. Opus 5.5 is $4 / $20 per million tokens with cache reads at $0.20; Sonnet 5.5 $2 / $10 with cache reads at $0.10; Haiku 5.5 $0.10 / $0.50 for requests up to 100K tokens ('+A('https://platform.claude.com/docs/en/about-claude/pricing','Anthropic')+').',
     pos:'Top of the index: Opus 5.5 58 at max effort for $5.98 a task, 51.2 at medium for $1.34; Sonnet 5.5 56 at max; Haiku 5.5 43 at $0.21 ('+A(AA,'AA')+', 19 October). Also first on Epoch AI\'s Capabilities Index, 167 against GPT-6 Astra\'s 166.',
     note:'Built for long-horizon agentic coding: Opus 5.5 reports 66.4% on Terminal-Bench 4.0 against GPT-6 Astra\'s 57.9%, while Astra leads Terminal-Bench-Science 0.1 on the same table ('+A('https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf','system card')+').'},
    {id:'goo',w:'c',n:'Google DeepMind',f:'Gemini 4 Argon, 3.8 Flash; Gemma 4 (open)',pg:'3c65c17b0d0d8173a0aafcb27cf7a5f3',
     open:'Gemini closed; Gemma open under Apache 2.0 ('+A('https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/','Google')+').',
     think:'Deep Think spends the budget on parallel branches and then selects among them, which pays off where answers can be checked.',
     serve:'The one frontier lab training on accelerators it designs, TPUs. Gemma uses five sliding-window layers per full-attention layer ('+A('https://arxiv.org/pdf/2503.19786','Gemma 3 report')+').',
     pos:'Gemini 4 Argon 53 at $1.99 a task, at introductory prices of $2 / $10 through 30 November 2026, then $4 / $20; first on the Vals Index at 68.90%; Gemini 3.8 Flash 40.9 at $1.24 ('+A(AA,'AA')+', '+A('https://ai.google.dev/gemini-api/docs/latest-model','Google')+').',
     note:'Gates its frontier first: Argon went to vetted cyber defenders on 30 September and to the paid API on 13 October ('+A('https://venturebeat.com/technology/google-makes-gemini-4-argon-broadly-available-with-limited-time-low-api-pricing-of-2-10-per-1m-token','VentureBeat')+').'},
    {id:'xai',w:'c',n:'xAI / SpaceXAI',f:'Grok 4.7',pg:'3c65c17b0d0d81f2ac36c873a854007f',
     open:'Closed.',
     think:'Four reasoning levels, and native support for its own Grok Bot harness: a model shipped with a harness rather than only behind an API ('+A('https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/','MarkTechPost')+').',
     serve:'No published architecture; $2 / $6 per million tokens ('+A('https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/','MarkTechPost')+').',
     pos:'Grok 4.7 46.4 at $3.74 a task: cheap tokens, many of them ('+A(AA,'AA')+').',
     note:'Behind on long-horizon agentic coding: 38.0% on Terminal-Bench 4.0 by its own figure, 33% in Artificial Analysis\' run ('+A('https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/','MarkTechPost')+').'},
    {id:'meta',w:'c',n:'Meta',f:'Muse Wonder (closed); Muse Spark Open, Glimmer (open)',pg:'3c65c17b0d0d81949ad8e17bcb3567f1',
     open:'Closed at the top (Muse Wonder, Muse Spark 1.3). Open below it: Muse Spark Open, 816B / 42B under the Muse Model License, which needs a separate agreement for model-as-a-service operators above $20M revenue ('+A('https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B','Hugging Face')+'), and Muse Glimmer, 29.6B dense, Apache 2.0 ('+A('https://venturebeat.com/technology/meta-returns-to-open-source-with-muse-glimmer-an-apache-2-0-licensed-30b-parameter-ai-model-optimized-for-agents-available-now','VentureBeat')+').',
     think:'Reasoning tiers up to a max tier that is only in limited preview ('+A('https://research.meta.ai/blog/introducing-muse-spark-1-3','Meta')+').',
     serve:'Closed models\' architecture not published; Muse Wonder $4 / $20 per million. Muse Spark Open is a 256-expert MoE, 8 active, with gated attention ('+A('https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B','model card')+').',
     pos:'Muse Wonder Full 56, second on the index, but only inside Muse Code; Muse Wonder 52 at $4.52 a task; Muse Spark Open 39 at $0.84, below the Chinese open leaders ('+A('https://venturebeat.com/technology/metas-new-muse-wonder-and-muse-wonder-full-models-achieve-frontier-performance-but-only-the-weaker-one-is-available-via-api','VentureBeat')+', '+A('https://artificialanalysis.ai/models/muse-spark-open','AA')+').'},
    {id:'ds',w:'o',att:1,n:'DeepSeek',f:'V4.1-Flash-1017, V4 Pro',pg:'3c65c17b0d0d81a2ae7ec6796947a235',
     open:'Open weights, MIT ('+A('https://api-docs.deepseek.com/updates/','DeepSeek')+').',
     think:'R1-Zero showed reasoning can be trained by reinforcement learning against checkable answers alone ('+A('https://api-docs.deepseek.com/news/news250120/','DeepSeek')+'); V4.1-Flash has an effort dial from 1 to 100.',
     serve:'The serving-cost lab: a compressed cache (MLA), FP8 training, learned sparse attention, and in V4.1-Flash the first frontier-scale open encoder-decoder, 552B with 8B active in prefill and 16B in decode, at about 890 bytes of cache per token ('+A('https://api-docs.deepseek.com/updates/','DeepSeek')+').',
     pos:'V4.1-Flash-1017 45 at $0.26 a task, second among open models (19 October); V4 Pro (1.6T / 49B, about 33x sparse) 36.0 at $0.67 ('+A('https://artificialanalysis.ai/models/deepseek-v4-1-flash-1017','AA')+', '+A('https://api-docs.deepseek.com/news/news260424/','DeepSeek')+').'},
    {id:'qw',w:'o',att:1,n:'Alibaba Qwen',f:'Qwen3.8 Max, 2.4T-A95B, Flash-Next, 27B',pg:'3c65c17b0d0d81fd8c36ce06672bb235',
     open:'Open, with the licence set per checkpoint: Apache 2.0 for mid-size models such as Qwen3.8-27B, custom licences for the 2.4T flagship and Flash-Next ('+A('https://huggingface.co/Qwen/Qwen3.8-27B','Hugging Face')+', '+A('https://llm-stats.com/blog/research/qwen3-8-max-open-weights','llm-stats')+'). The Qwen3.8 Max (0902) snapshot is API-only.',
     think:'Qwen3 put a fast mode and a thinking mode in one checkpoint under a caller-set budget ('+A('https://qwenlm.github.io/blog/qwen3/','Qwen')+').',
     serve:'Gated DeltaNet linear attention plus Qwen Sparse Attention, which selects micro-blocks rather than single tokens; Flash-Next is 125B / 6B ('+A('https://qwen.ai/blog?id=qwen3.8-flash-next','Qwen')+').',
     pos:'Qwen3.8 Max (0902) 45.4 at $5.41 a task; open Qwen3.8-Flash-Next 39.8 at $0.37 ('+A(AA,'AA')+').',
     note:'The widest ladder, from under 1B to 2.4T, and the base most often fine-tuned by others.'},
    {id:'mk',w:'o',att:1,n:'Moonshot AI',f:'Kimi K3',pg:'3c65c17b0d0d81f5abf5dbdbac821a12',
     open:'Open weights under the Kimi K3 License; 2.8T total / 104B active ('+A('https://huggingface.co/moonshotai/Kimi-K3','Hugging Face')+').',
     serve:'Kimi Delta Attention, a linear attention mixed with full-attention layers for exact recall ('+A('https://arxiv.org/abs/2510.26692','Kimi Linear')+'), and the Muon optimiser in training ('+A('https://arxiv.org/abs/2507.20534','Kimi K2 report')+').',
     pos:'Kimi K3 43.6 at $2.00 a task ('+A(AA,'AA')+', 1 October; 44 on 19 October).'},
    {id:'zp',w:'o',att:1,n:'Zhipu (Z.ai)',f:'GLM-5.3, GLM-5.3-Flash, GLM-5.2',pg:'3c65c17b0d0d81a88a84c2ca84b4daf4',
     open:'Open, MIT on most of the line; GLM-5.3 adds a security review for model-as-a-service firms above $10 billion of revenue ('+A('https://www.marktechpost.com/2026/08/14/z-ai-ships-glm-5-3-without-retraining-the-base-model-better-at-complex-coding-and-long-horizon-tasks/','MarkTechPost')+').',
     serve:'GLM-5.3-Flash (320B / 18B) keeps a growing cache in only 11 of 45 layers and reports a cache 4.4 times smaller than GLM-5.3 ('+A('https://docs.z.ai/release-notes/new-released','Z.ai')+').',
     pos:'GLM-5.3 44.8 at $2.01 (1 October), level with DeepSeek V4.1-Flash-1017 at 45 by 19 October, one point behind MiMo; GLM-5.3-Flash 41.8 at $0.25 ('+A(AA,'AA')+').',
     note:'Its open bases are other labs\' starting point: Shanghai AI Laboratory\'s Atria Dawn Preview is post-trained over GLM-5.2 ('+A('https://github.com/atria-asi/Atria-Dawn-Preview','GitHub')+').'},
    {id:'mm',w:'o',att:1,n:'MiniMax',f:'MiniMax M3, M3.1 Flash',pg:'3c65c17b0d0d813ba1c0cb4ba00659b8',
     open:'Open weights under a custom community licence; 428B / 23B ('+A('https://huggingface.co/MiniMaxAI/MiniMax-M3','Hugging Face')+').',
     serve:'Three attention answers in turn: linear attention, then full attention in M2 because agents need exact recall ('+A('https://www.minimax.io/news/minimax-m2','MiniMax')+'), then trained block-sparse attention in M3.',
     pos:'M3.1 Flash 42 at $0.22 a task, API-only until its promised weights ship; open M3 29.2 at $0.51 ('+A('https://artificialanalysis.ai/models/minimax-m3-1-flash','AA')+').'},
    {id:'xm',w:'o',n:'Xiaomi',f:'MiMo-V2.6-Pro, MiMo-V2.6-Flash',pg:'3c65c17b0d0d8154ba44e521a4ed8749',
     open:'Open, MIT, since MiMo-V2-Flash in December 2025 ('+A('https://huggingface.co/XiaomiMiMo/MiMo-V2-Flash','Hugging Face')+'). V2.6-Pro is 1.02T / 42B, Flash 309B / 15B ('+A('https://www.unite.ai/xiaomis-new-flagship-model-leads-open-weight-rankings-with-a-score-of-46/','Unite.AI')+').',
     pos:'MiMo-V2.6-Pro 46.3 at $0.13 a task, still the best open model on the index on 19 October, one point ahead of DeepSeek and Zhipu; Flash 37.9 at $0.062 ('+A(AA,'AA')+').'},
    {id:'mis',w:'o',n:'Mistral',f:'Large 4 (preview), Large 3, Medium 3.5, Small 4',pg:'3c65c17b0d0d814a9882e6ebc326fa56',
     open:'Open: Large 3 (675B / 41B) and Small 4 (119B / 6B) under Apache 2.0 ('+A('https://mistral.ai/news/mistral-3','Mistral')+', '+A('https://mistral.ai/news/mistral-small-4','Mistral')+'); Medium 3.5, dense 128B, under a modified MIT licence ('+A('https://letsdatascience.com/blog/mistral-medium-3-5-128b-open-weight-merged-model','Let\'s Data Science')+').',
     pos:'Large 4 preview (1T / 52B, API only for now, weights promised) 38 at $1.13 a task; among open models Medium 3.5 14.2 at $0.50 and Small 4 11.3 at $0.015, the cheapest point on the frontier staircase ('+A('https://artificialanalysis.ai/models/mistral-large-4','AA')+', '+A('https://mistral.ai/news/mistral-large-4','Mistral')+').',
     note:'The main Western open-weight lab outside the US.'},
    {id:'tc',w:'o',n:'Tencent',f:'Hy4 preview, Hy3',pg:'3c65c17b0d0d8154ba44e521a4ed8749',
     open:'Open: Hy4 preview, 770B / 49B, under Apache 2.0, after earlier open MoE models Hunyuan-Large (2024) and Hy3 (2026) ('+A('https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/','Tencent')+', '+A('https://huggingface.co/tencent/Hy3','Hugging Face')+').',
     think:'Two reasoning levels with a no_think switch ('+A('https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/','Tencent')+').',
     serve:'Conservative sparsity, about 16x.',
     pos:'Hy4 preview is not yet on the index; Hy3 25.3 at $0.072 a task ('+A(AA,'AA')+').'},
    {id:'sf',w:'o',n:'StepFun',f:'Step 5 Preview',pg:'3c65c17b0d0d8154ba44e521a4ed8749',
     open:'API-only at launch on 20 September; weights on Hugging Face since mid-October under the StepFun Model License 1.0, which StepFun calls Apache-2.0-style ('+A('https://huggingface.co/stepfun-ai/Step-5-Preview','Hugging Face')+').',
     serve:'600B total / 27B active: it decodes like a 27B dense model ('+A('https://pandaily.com/stepfun-step-5-preview-600b-moe-1m-context','Pandaily')+').',
     pos:'Step 5 Preview 43.7 at $0.72 a task ('+A(AA,'AA')+').'},
    {id:'ai2',w:'f',n:'Ai2',f:'OLMo 3, OLMo 3.1',pg:'3c65c17b0d0d81e08697df661f83c3ac',
     open:'Fully open: weights plus corpus, data mixture, training code, checkpoints and logs ('+A('https://allenai.org/blog/olmo3','Ai2')+').',
     pos:'Far from the frontier: OLMo 3.1 32B Think has only an estimated score, 7.1 ('+A(AA,'AA')+').'},
    {id:'ifm',w:'f',n:'IFM (Abu Dhabi)',f:'K2 Horizon',pg:'3c65c17b0d0d8154ba44e521a4ed8749',
     open:'Fully open: six Apache 2.0 models from 0.9B to 375B with weights, training code, data and method ('+A('https://ifm.ai/k2/press-release/','IFM')+').',
     pos:'K2 Horizon 375B scores 30.5, with no price listed ('+A(AA,'AA')+').'},
    {id:'coh',w:'o',n:'Cohere',f:'Command A, North, Aya',pg:'3c65c17b0d0d8154ba44e521a4ed8749',
     open:'Open weights under a non-commercial licence for Command A ('+A('https://huggingface.co/CohereLabs/c4ai-command-a-03-2025','Hugging Face')+').',
     serve:'Deliberately dense at 111B, among the largest dense models here.',
     note:'Built for enterprise and on-premises deployment.'}
  ];
  let f='all',sel='ds';
  const pass=l=>f==='all'||(f==='open'&&(l.w==='o'||l.w==='f'))||(f==='closed'&&l.w==='c')||(f==='full'&&l.w==='f')||(f==='att'&&l.att);
  function grid(){
    $('mapGrid').innerHTML='<div class="labs">'+L.map(l=>'<button class="lab '+(l.w==='c'?'c':'o')+(l.id===sel?' sel':'')+(pass(l)?'':' dim')+'" data-id="'+l.id+'"><span class="nm">'+l.n+'</span><span class="fl">'+l.f+'</span></button>').join('')+'</div>';
    $('mapGrid').querySelectorAll('.lab').forEach(b=>b.addEventListener('click',()=>{sel=b.dataset.id;grid();det()}));
  }
  function det(){
    const l=L.find(x=>x.id===sel);
    const tag=l.w==='c'?'<span class="tag c">closed</span>':l.w==='f'?'<span class="tag o">fully open</span>':'<span class="tag o">open weights</span>';
    const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':'';
    $('mapDet').innerHTML='<h3>'+l.n+' '+tag+'</h3><dl class="kv">'+row('Openness',l.open)+row('Thinking',l.think)+row('Serving',l.serve)+row('Index v4.3',l.pos)+row('Also',l.note)+'</dl><p class="small">Family detail: '+A(NP(l.pg),{'3c65c17b0d0d8154ba44e521a4ed8749':'Other notable providers'}[l.pg]||l.n+' page')+'</p>';
  }
  document.querySelectorAll('#mapF button').forEach(b=>b.addEventListener('click',()=>{f=b.dataset.f;document.querySelectorAll('#mapF button').forEach(x=>x.classList.toggle('on',x===b));const l=L.find(x=>x.id===sel);if(!pass(l)){sel=L.find(pass).id;det()}grid()}));
  grid();det();
})();
