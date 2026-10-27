// ---- Hero: the whole report as one pipeline (static; drawn at the measured width, one to three columns) ----
(function(){const el=$('l3hero');if(!el)return;
  const S=[
    [0,'1 · Data',['15.6T tokens, knowledge to end of 2023','7 cleaning stages, 128K vocabulary','mix: 50% general, 25% maths and','reasoning, 17% code, 8% multilingual']],
    [1,'2 · Size it with a scaling law',['IsoFLOPs fits, 40M to 16B models','forecast: 402B on 16.55T tokens','then loss to accuracy (ARC-C 95.8%)','built: dense 405B, 126 layers']],
    [1,'3 · Keep 16,384 H100s busy',['4D parallelism: TP 8, CP, PP 16, DP','38% to 43% MFU in BF16','419 unexpected stops in 54 days,','one every 3.1 h; >90% effective']],
    [0,'4 · Grow, stretch, anneal',['batch 4M, then 8M, then 16M tokens','context 8K to 128K over 800B tokens','anneal the last 40M tokens to LR 0','average the annealing checkpoints']],
    [1,'5 · Post-train, six rounds',['reward model on human preferences','rejection sampling: best of 10 to 30','SFT, then DPO (β 0.1, format tokens','masked, NLL 0.2); average the runs']],
    [0,'6 · Result',['405B: MMLU 87.3, HumanEval 89.0','level with GPT-4 (0125) on benchmarks','behind GPT-4o in Meta\'s own','human evaluation (Figure 17)']]];
  fit(el,w=>{const cols=w>=840?3:w>=560?2:1,g=12,bw=(w-g*(cols-1))/cols,bh=96,rows=Math.ceil(S.length/cols),H=rows*bh+(rows-1)*g+2;
    const fs=12;let s="";
    S.forEach(([nw,t,ls],i)=>{const c=i%cols,r=Math.floor(i/cols),x=c*(bw+g)+1,y=r*(bh+g)+1;
      s+=rc(x,y,bw-2,bh-2,nw?'var(--acc2)':'var(--soft)',{s:nw?'var(--acc)':'var(--line)',sw:nw?1.6:1,r:6});
      s+=tx(x+10,y+19,t,{fs:13,w:700,c:nw?'var(--acc)':'var(--ink)'});
      ls.forEach((l,j)=>{s+=tx(x+10,y+38+j*15,l,{fs,c:'var(--ink)'})});
      if(c<cols-1&&i<S.length-1){const ax=x+bw-2,ay=y+bh/2;s+='<path d="M'+(ax+1).toFixed(1)+','+(ay-4)+' l'+(g-3)+',4 l-'+(g-3)+',4z" fill="var(--mute)"/>'}});
    el.innerHTML=svgW(w,H,s,'The Llama 3 report as one pipeline: data, a scaling-law size, keeping 16,384 GPUs busy, the pre-training schedule, six rounds of post-training, and the result').replace('style="max-width:100%;height:auto"','style="width:'+w+'px;max-width:none;height:'+H+'px"')})})();
