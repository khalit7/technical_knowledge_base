// ---- Reading: box-row diagrams (drawer adapted from the parent root's 22_js_rd_one.js): the metric ladder (s1), the LLM design ladder (s6), the model layer (s7) ----
(function(){
  const SC=['--mute','--c1','--c2','--c3','--c4','--c5','--c6'];
  function wrap(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  // rows of boxes: [title, plain line, colour index (0 = plain), badge text]; side: optional label per row, drawn above it
  function draw(el,rows,label,side){
    const W=Math.max(240,Math.min(860,RD.width(el)));const gap=8,fs=W<360?10.5:11,cw=fs*0.56;
    let y=4,body='';
    rows.forEach((r,ri)=>{
      if(side&&side[ri]){body+=RD.t(0,y+fs,RD.esc(side[ri]),{fs:10.5,fill:'var(--mute)',w:600});y+=fs+5}
      const n=r.length,bw=(W-gap*(n-1))/n,maxc=Math.max(8,Math.floor((bw-12)/cw));
      const boxes=r.map((b,i)=>{const t=wrap(b[0],maxc-(b[3]?3:0)),s=wrap(b[1],maxc);return {x:i*(bw+gap),t,s,c:b[2]||0,badge:b[3]||'',h:10+t.length*(fs+2)+s.length*(fs+1)+6}});
      const h=Math.max(...boxes.map(b=>b.h));
      const ax=side?W-16:W/2;
      if(ri){body+='<line x1="'+ax+'" y1="'+(y-12-(side&&side[ri]?fs+5:0))+'" x2="'+ax+'" y2="'+(y-2)+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#'+el.id+'ar)"/>'}
      boxes.forEach(b=>{const c='var('+SC[b.c]+')';
        body+='<rect x="'+(b.x+.5)+'" y="'+y+'" width="'+(bw-1)+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+c+'" stroke-width="'+(b.c?1.6:1)+'"/>';
        let ty=y+fs+5;b.t.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs,w:600});ty+=fs+2});
        b.s.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs-0.5,fill:'var(--mute)'});ty+=fs+1});
        if(b.badge)body+='<circle cx="'+(b.x+bw-11)+'" cy="'+(y+10)+'" r="7.5" fill="'+c+'"/>'+RD.t(b.x+bw-11,y+13.5,b.badge,{fs:10,a:'middle',fill:'var(--bg)',w:600});
      });
      y+=h+16;
    });
    const defs='<defs><marker id="'+el.id+'ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,y-12,defs+body,label);
  }
  const D=[];
  // section 1: the metric ladder for the support assistant
  D.push(['rd-ladder',[
    [['Objective','tickets resolved without a human, and no wrong answers',1]],
    [['Online metrics','resolution without escalation, thumbs, re-opened tickets',2],['Guard metrics','wrong-answer rate, safety violations',5],['System metrics','TTFT, TPOT, cost per ticket',3]],
    [['Offline metric','task score on past tickets with known resolutions',4]],
    [['What the model optimises','loss in training; the prompt and judge for an LLM',0]]
  ],'The metric ladder: an objective, online, guard and system metrics measured on live traffic, an offline metric on past tickets, and the training loss; each rung is a proxy for the one above',
  ['THE PRODUCT DECISION','MEASURED ON LIVE TRAFFIC','MEASURED BEFORE LAUNCH','MEASURED IN TRAINING']]);
  // section 6: the LLM design ladder, cheapest first
  D.push(['rd-llmlad',[
    [['Prompt a model','instructions and examples; the baseline every design must beat',0,'1']],
    [['+ Retrieval (RAG)','facts that change, citations, per-user access',1,'2']],
    [['+ Fine-tuning','format, domain style, a smaller model doing a narrow job',2,'3']],
    [['+ Workflow or agent','several calls; an agent when the steps depend on what is found',3,'4']]
  ],'The LLM design ladder: prompt a model, then add retrieval for facts, fine-tuning for behaviour, and a workflow or agent for multi-step work; each rung adds cost, latency and things to evaluate']);
  // section 7: the model layer of the chat assistant
  D.push(['rd-arch',[
    [['Users','phones and browsers, 230 messages a second at peak',0]],
    [['Chat API servers','the parent topic\'s app servers: auth, history, streaming to the user',0]],
    [['LLM gateway','who is calling, may they, how much have they used',1,'A'],['Cache','exact and semantic answers; prompt prefixes',5,'F']],
    [['Rate limits and quotas','in tokens, per tenant',1,'A'],['Router and fallbacks','which model, and what if it fails',2,'B']],
    [['Realtime pool','streaming chat on GPUs',3,'D'],['External providers','model APIs, a second vendor',2,'B'],['Batch queue','evals, embeddings, overnight jobs',3,'D']],
    [['Autoscaler','adds GPU replicas on queue and KV signals',3,'E'],['Engines','vLLM, SGLang, TensorRT-LLM on GPUs',0]],
    [['Usage events','tokens and cost per request, per tenant',6,'H'],['Metrics and traces','TTFT, tokens/s, errors, quality',6,'H'],['Rollout control','pinned versions, canary weights',4,'G']]
  ],'The model layer of the chat assistant: API servers, LLM gateway with cache, rate limits and router, realtime GPU pool, external providers and batch queue, autoscaler and engines, and usage events, metrics and rollout control']);
  D.forEach(([id,rows,label,side])=>{const el=document.getElementById(id);if(!el)return;const f=()=>draw(el,rows,label,side);f();RD.onRender(f);RD.onResize(f)});
})();
