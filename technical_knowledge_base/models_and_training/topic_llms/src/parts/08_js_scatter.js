// ---- Total vs active parameters (log-log), with memory and compute from M = N_total*b/8, C = 2*N_active ----
(function(){
  const $=id=>document.getElementById(id);
  // [name, total B, active B, group: 'open'|'dense'|'hist', note]
  const D=[
    ['Kimi K3',2800,104,'open','Moonshot; Kimi Delta Attention in most layers','https://huggingface.co/moonshotai/Kimi-K3'],
    ['Qwen3.8 2.4T-A95B',2400,95,'open','Alibaba; open flagship, custom licence','https://llm-stats.com/blog/research/qwen3-8-max-open-weights'],
    ['DeepSeek V4 Pro',1600,49,'open','DeepSeek; about 33x, the sparsest here','https://api-docs.deepseek.com/news/news260424/'],
    ['MiMo-V2.6-Pro',1020,42,'open','Xiaomi; MIT; best open model on the index v4.3','https://www.unite.ai/xiaomis-new-flagship-model-leads-open-weight-rankings-with-a-score-of-46/'],
    ['Hy4 preview',770,49,'open','Tencent; about 16x, the least sparse frontier-size model here','https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/'],
    ['GLM-5.2',744,40,'open','Zhipu; MIT','https://techjacksolutions.com/ai-brief/open-source-ai-news-zai-drops-glm-52-weights-on-hugging-face/'],
    ['Mistral Large 3',675,41,'open','Mistral; Apache 2.0','https://mistral.ai/news/mistral-3'],
    ['Step 5 Preview',600,27,'open','StepFun; weights promised, not yet published','https://pandaily.com/stepfun-step-5-preview-600b-moe-1m-context'],
    ['V4.1-Flash (decode)',552,16,'open','DeepSeek encoder-decoder; 8B active in prefill, 16B in decode','https://api-docs.deepseek.com/updates/'],
    ['MiniMax M3',428,23,'open','MiniMax; block-sparse attention','https://huggingface.co/MiniMaxAI/MiniMax-M3'],
    ['GLM-5.3-Flash',320,18,'open','Zhipu; MIT; linear-attention hybrid','https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/'],
    ['MiMo-V2.6-Flash',309,15,'open','Xiaomi; MIT','https://datanorth.ai/news/xiaomi-releases-mimo-v2-6-pro-and-flash'],
    ['DeepSeek V4 Flash',284,13,'open','DeepSeek; MIT','https://api-docs.deepseek.com/news/news260424/'],
    ['Qwen3.8-Flash-Next',125,6,'open','Alibaba; about 21x on only 6B active','https://www.marktechpost.com/2026/08/26/alibabas-qwen-team-releases-qwen3-8-flash-next-a-125b-multimodal-moe-with-6b-active-parameters-previewing-the-qwen4-architecture/'],
    ['Mistral Small 4',119,6,'open','Mistral; Apache 2.0','https://mistral.ai/news/mistral-small-4'],
    ['gpt-oss-120b',117,5.1,'open','OpenAI; MXFP4-quantised experts fit one 80GB card','https://www.infoq.com/news/2025/08/openai-gpt-oss/'],
    ['DeepSeek-V3 (2024)',671,37,'hist','the template the open frontier follows (18x)','https://huggingface.co/deepseek-ai/DeepSeek-V3'],
    ['Mixtral 8x7B (2023)',47,13,'hist','the first widely deployed open MoE (about 3.6x)','https://app.notion.com/p/3c65c17b0d0d81eba72af0ac91ddc6b3'],
    ['Llama 3.1 405B (dense)',405,405,'dense','Meta, 2024','https://en.wikipedia.org/wiki/Llama_(language_model)'],
    ['Mistral Medium 3.5 (dense)',128,128,'dense','Mistral; modified MIT','https://letsdatascience.com/blog/mistral-medium-3-5-128b-open-weight-merged-model'],
    ['Command A (dense)',111,111,'dense','Cohere; deliberately dense','https://huggingface.co/CohereLabs/c4ai-command-a-03-2025'],
    ['Muse Glimmer (dense)',29.6,29.6,'dense','Meta; Apache 2.0','https://venturebeat.com/technology/meta-returns-to-open-source-with-muse-glimmer-an-apache-2-0-licensed-30b-parameter-ai-model-optimized-for-agents-available-now'],
    ['Qwen3.8-27B (dense)',27,27,'dense','Alibaba; Apache 2.0; the base of Bonsai 2','https://huggingface.co/Qwen/Qwen3.8-27B']
  ];
  let sel='Step 5 Preview';
  let W=860,H=430;const ml=56,mr=16,mt=14,mb=46;
  const xmin=Math.log10(20),xmax=Math.log10(4000),ymin=Math.log10(3),ymax=Math.log10(600);
  const X=v=>ml+(Math.log10(v)-xmin)/(xmax-xmin)*(W-ml-mr), Y=v=>H-mb-(Math.log10(v)-ymin)/(ymax-ymin)*(H-mt-mb);
  function draw(){
    const cw=$('scPlot').clientWidth||860;W=Math.max(340,Math.min(860,cw));H=W<600?360:430;
    const show=$('scHist').checked;
    let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Total against active parameters">';
    (W<600?[20,100,500,2000]:[20,50,100,200,500,1000,2000,4000]).forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+mt+'" y2="'+(H-mb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-mb+16)+'" font-size="12" text-anchor="middle" fill="var(--mute)">'+(v>=1000?(v/1000)+'T':v+'B')+'</text>'});
    [3,10,30,100,300].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(ml-6)+'" y="'+(Y(v)+4)+'" font-size="12" text-anchor="end" fill="var(--mute)">'+v+'B</text>'});
    s+='<text x="'+((ml+W-mr)/2)+'" y="'+(H-8)+'" font-size="12.5" text-anchor="middle" fill="var(--mute)">'+(W<600?'total parameters (log): memory':'total parameters (log scale): memory to hold the weights')+'</text>';
    s+='<text transform="translate(14 '+((mt+H-mb)/2)+') rotate(-90)" font-size="12.5" text-anchor="middle" fill="var(--mute)">'+(W<600?'active (log): compute':'active per token (log): compute per token')+'</text>';
    // iso-sparsity lines: active = total / r
    [[1,'dense (1x)'],[10,'10x'],[20,'20x'],[33,'33x']].forEach(([r,l])=>{
      const x1=Math.max(20,3*r),x2=Math.min(4000,600*r);
      if(x1>=x2)return;
      s+='<line x1="'+X(x1)+'" y1="'+Y(x1/r)+'" x2="'+X(x2)+'" y2="'+Y(x2/r)+'" stroke="var(--mute)" stroke-dasharray="4 4" opacity=".7"/>';
      const lx=Math.min(x2,r===1?500:3600);s+='<text x="'+(X(lx)-4)+'" y="'+(Y(lx/r)-6)+'" font-size="11.5" text-anchor="end" fill="var(--mute)">'+l+'</text>';
    });
    // the 2026 band 16x to 33x shaded
    const pts=[[100,100/16],[4000,4000/16],[4000,4000/33],[100,100/33]].map(([t,a])=>X(t)+','+Y(a));
    s+='<polygon points="'+pts.join(' ')+'" fill="var(--acc)" opacity=".07"/>';
    D.forEach(d=>{
      if(d[3]==='hist'&&!show)return;
      const x=X(d[1]),y=Y(d[2]),on=d[0]===sel;
      const col=d[3]==='dense'?'var(--c5)':d[3]==='hist'?'var(--mute)':'var(--open)';
      s+='<g class="pt" data-n="'+d[0]+'" style="cursor:pointer"><title>'+d[0]+': '+d[1]+'B total, '+d[2]+'B active</title><circle cx="'+x+'" cy="'+y+'" r="'+(on?8:5.5)+'" fill="'+col+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'"/><circle cx="'+x+'" cy="'+y+'" r="13" fill="transparent"/>';
      if(on)s+='<text x="'+(x+(x>W-200?-12:12))+'" y="'+(y-10)+'" font-size="13" font-weight="600" text-anchor="'+(x>W-200?'end':'start')+'">'+d[0]+'</text>';
      s+='</g>';
    });
    s+='</svg>';
    $('scPlot').innerHTML=s;
    $('scPlot').querySelectorAll('.pt').forEach(g=>g.addEventListener('click',()=>{sel=g.dataset.n;draw()}));
    $('scPick').value=sel;
    readout();
  }
  function readout(){
    const d=D.find(x=>x[0]===sel),bits=+$('scBits').value;
    const mem=d[1]*1e9*bits/8/1e9, fl=2*d[2];
    const cards=Math.ceil(mem/80);
    $('scName').textContent=d[0];$('scNote').innerHTML=d[0]+': '+d[1]+'B total, '+d[2]+'B active. '+d[4]+' ('+A(d[5],'source')+').';
    $('scRatio').textContent=(d[1]/d[2]).toFixed(1)+'x';
    $('scAct').textContent=(100*d[2]/d[1]).toFixed(1)+'% of weights per token';
    $('scMem').textContent=mem>=10?mem.toFixed(0)+' GB':mem.toFixed(2)+' GB';
    $('scCards').textContent='at least '+cards+' × 80GB card'+(cards>1?'s':'')+' before KV cache';
    $('scFl').textContent=fl.toFixed(fl<20?1:0)+' GFLOPs';
    $('scDense').textContent='same as a '+d[2]+'B dense model';
  }
  $('scPick').innerHTML=D.map(d=>'<option>'+d[0]+'</option>').join('');
  $('scPick').addEventListener('change',e=>{sel=e.target.value;if(D.find(x=>x[0]===sel)[3]==='hist')$('scHist').checked=true;draw()});
  $('scHist').addEventListener('change',draw);
  $('scBits').addEventListener('change',readout);
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=[draw];
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,150)});
  draw();
})();
