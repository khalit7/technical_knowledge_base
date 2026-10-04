// ---- Reading, One screen: the model layer opened up (drawer copied from the parent root's 22_js_rd_one.js) ----
(function(){
  const A=document.getElementById('rd-arch');if(!A)return;
  const SC=['--mute','--c1','--c2','--c3','--c4','--c5','--c6'];const COL=n=>n?SC[1+((n-1)%6)]:SC[0];
  function wrap(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if(l&&(l+' '+x).length>max){out.push(l);l=x}else l=l?l+' '+x:x});if(l)out.push(l);return out}
  // rows of boxes: [title, plain line, step (0 = none)]
  function draw(el,rows,label){
    const W=Math.max(240,Math.min(860,RD.width(el)));const gap=8,fs=W<360?10:11,cw=fs*0.56;
    let y=4,body='',prev=null;
    rows.forEach(r=>{
      const n=r.length,bw=(W-gap*(n-1))/n,maxc=Math.max(8,Math.floor((bw-12)/cw));
      const boxes=r.map((b,i)=>{const t=wrap(b[0],maxc),s=wrap(b[1],maxc);return {x:i*(bw+gap),t,s,step:b[2],h:10+t.length*(fs+2)+s.length*(fs+1)+6}});
      const h=Math.max(...boxes.map(b=>b.h));
      if(prev){// arrows from the previous row's centre band to this row
        const x1=W/2;body+='<line x1="'+x1+'" y1="'+(y-12)+'" x2="'+x1+'" y2="'+(y-2)+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#rd1ar)"/>'}
      boxes.forEach(b=>{const c='var('+COL(b.step)+')';
        body+='<rect x="'+(b.x+.5)+'" y="'+y+'" width="'+(bw-1)+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+c+'" stroke-width="'+(b.step?1.6:1)+'"/>';
        let ty=y+fs+5;b.t.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs,w:600});ty+=fs+2});
        b.s.forEach(l=>{body+=RD.t(b.x+6,ty,RD.esc(l),{fs:fs-1,fill:'var(--mute)'});ty+=fs+1});
        if(b.step)body+='<circle cx="'+(b.x+bw-11)+'" cy="'+(y+10)+'" r="7.5" fill="'+c+'"/>'+RD.t(b.x+bw-11,y+13.5,b.step,{fs:10,a:'middle',fill:'var(--bg)',w:600});
      });
      y+=h+16;prev=r;
    });
    const defs='<defs><marker id="rd1ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="var(--mute)"/></marker></defs>';
    el.innerHTML=RD.svg(W,y-12,defs+body,label);
  }
  const rows=[
    [['Users','phones and browsers, 230 messages a second at peak',0]],
    [['Chat API servers','the parent topic\'s app servers: auth, history, streaming to the user',0]],
    [['LLM gateway','who is calling, may they, how much have they used',3],['Cache','exact and semantic answers; prompt prefixes',9]],
    [['Rate limits and quotas','in tokens, per tenant',5],['Router and fallbacks','which model, and what if it fails',4]],
    [['Realtime pool','streaming chat on GPUs',7],['External providers','model APIs, a second vendor',4],['Batch queue','evals, embeddings, overnight jobs',7]],
    [['Autoscaler','adds GPU replicas on queue and KV signals',8],['Engines','vLLM, SGLang, TensorRT-LLM on GPUs',2]],
    [['Usage events','tokens and cost per request, per tenant',12],['Metrics and traces','TTFT, tokens/s, errors, quality',12],['Rollout control','pinned versions, canary weights',10]]
  ];
  function all(){draw(A,rows,'The model layer of the chat assistant: API servers, LLM gateway with cache, rate limits and router, realtime GPU pool, external providers and batch queue, autoscaler and engines, and usage events, metrics and rollout control')}
  all();RD.onRender(all);RD.onResize(all);
})();
