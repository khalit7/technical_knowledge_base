// ---- Radix lab (t-sgtree): the two caches live on the four traces ----
(function(){
  const root=document.getElementById('t-sgtree');if(!root||!window.SG||!window.SGD)return;
  const CAPS=[6000,8000,12000,16000,24000,32000,48000,64000,96000,1000000];
  const DESC={chat:'240 requests: conversations of 4 turns, 90% of them under one of 3 system prompts of 600 tokens; each turn resends the whole conversation. From the root simulator\'s generator (seed 7).',
    agent:'200 requests: conversations of 10 turns under one 2,000-token system prompt, turns 15 s apart, so up to about 4,800 tokens of history per request (seed 11).',
    rag:'160 questions of 20 to 80 tokens, each about one of 8 documents of 800 tokens, answers of 20 to 80 tokens (seed 5).',
    unique:'200 unrelated one-shot prompts of 100 to 800 tokens: nothing to share (seed 3).'};
  let trace='chat',ci=4;const cache={};
  const fmt=n=>Math.round(n).toLocaleString('en-US'),pct=(a,b)=>(100*a/b).toFixed(1)+'%';
  const $=id=>document.getElementById(id);
  function need(tr){return Math.max(...SG.getTrace(tr).map(q=>q.P+q.O-1))}
  const NEED={};
  function run(tr,cap){const k=tr+'|'+cap;if(!cache[k]){const reqs=SG.getTrace(tr),a=SG.runCache('radix',reqs,cap),b=SG.runCache('blocks',reqs,cap);
      let blocks=0;for(const h of b.cache.hash)if(h!==null)blocks++;
      cache[k]={reqs:reqs,a:a.reqs,b:b.reqs,nodes:a.cache.nodes-1,blocks:blocks}}return cache[k]}
  function draw(){if(root.hidden)return;NEED[trace]=NEED[trace]||need(trace);
    const caps=CAPS.filter(c=>c>=NEED[trace]);if(ci>=caps.length)ci=caps.length-1;const sl=$('sgt-cap');sl.max=caps.length-1;sl.value=ci;
    const cap=caps[ci];$('sgt-capv').textContent=cap>=1000000?'room for everything':fmt(cap)+' token slots ('+(cap*114688/2**30).toFixed(2)+' GiB of Qwen3-0.6B KV at 16 bits)';
    $('sgt-desc').textContent=DESC[trace];
    const r=run(trace,cap),P=r.reqs.reduce((s,q)=>s+q.P,0),ha=r.a.reduce((s,x)=>s+x[1],0),hb=r.b.reduce((s,x)=>s+x[1],0),ea=r.a.reduce((s,x)=>s+x[2],0),eb=r.b.reduce((s,x)=>s+x[2],0);
    $('sgt-out').innerHTML=RD.stat('Reused, radix tree',pct(ha,P),fmt(ha)+' of '+fmt(P)+' prompt tokens')+RD.stat('Reused, hash blocks',pct(hb,P),fmt(hb)+' tokens')+
      RD.stat('Difference',(ha>=hb?'+':'')+fmt(ha-hb)+' tokens',(ha>=hb?'tree ahead':'blocks ahead')+' by '+(100*Math.abs(ha-hb)/P).toFixed(2)+' points')+
      RD.stat('Evicted',fmt(ea)+' / '+fmt(eb),'tokens, tree / blocks')+RD.stat('Bookkeeping at the end',fmt(r.nodes)+' / '+fmt(r.blocks),'tree nodes / cached blocks')+RD.stat('Requests',r.reqs.length,'one at a time');
    // curve
    const el=$('sgt-curve'),w=RD.width(el),h=200,x0=40,y0=16,pw=w-x0-12,ph=h-y0-34;
    const pts=(SGD.curve&&SGD.curve[trace])||[];const all=pts.concat(cap<1000000&&!pts.find(p=>p[0]===cap)?[[cap,ha,hb]]:[]).sort((a,b)=>a[0]-b[0]);
    const lx=c=>x0+pw*(Math.log(c)-Math.log(3000))/(Math.log(100000)-Math.log(3000));const ly=v=>y0+ph*(1-v/100);
    let b='';for(let v=0;v<=100;v+=25){b+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+RD.t(x0-4,ly(v)+4,v+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    for(const c of [4000,8000,16000,32000,64000])b+=RD.t(lx(c),h-18,(c/1000)+'k',{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t(x0+pw/2,h-4,'KV pool, token slots (log scale)',{a:'middle',fs:10,fill:'var(--mute)'});
    const line=(k,col,dash)=>{const q=all.filter(p=>p[0]<=100000);if(q.length<2)return '';return '<polyline fill="none" stroke="'+col+'" stroke-width="2"'+(dash?' stroke-dasharray="5 3"':'')+' points="'+q.map(p=>lx(p[0]).toFixed(1)+','+ly(100*p[k]/P).toFixed(1)).join(' ')+'"/>'+q.map(p=>'<circle cx="'+lx(p[0]).toFixed(1)+'" cy="'+ly(100*p[k]/P).toFixed(1)+'" r="2.5" fill="'+col+'"/>').join('')};
    b+=line(1,'var(--good)')+line(2,'var(--acc)',1);
    if(cap<=100000)b+='<line x1="'+lx(cap)+'" x2="'+lx(cap)+'" y1="'+y0+'" y2="'+(y0+ph)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>';
    else b+=RD.t(x0+pw,y0+10,'room for all: '+pct(ha,P)+' / '+pct(hb,P),{a:'end',fs:10,fill:'var(--bad)'});
    el.innerHTML=RD.svg(w,h,b,'Share of prompt tokens reused against pool size');
    // per-request difference
    const el2=$('sgt-diff'),w2=RD.width(el2),h2=150,m=r.reqs.length,bw=Math.max(1,(w2-44)/m);let mx=1;const d=r.a.map((x,i)=>x[1]-r.b[i][1]);for(const v of d)mx=Math.max(mx,Math.abs(v));
    const mid=h2/2;let s='<line x1="40" x2="'+(w2-4)+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>'+RD.t(36,14,'+'+fmt(mx),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(36,h2-6,'-'+fmt(mx),{a:'end',fs:10,fill:'var(--mute)'})+RD.t(36,mid+4,'0',{a:'end',fs:10,fill:'var(--mute)'});
    d.forEach((v,i)=>{if(!v)return;const hh=(mid-8)*Math.abs(v)/mx;s+='<rect x="'+(40+i*bw).toFixed(1)+'" y="'+(v>0?mid-hh:mid).toFixed(1)+'" width="'+Math.max(1,bw-0.5).toFixed(1)+'" height="'+Math.max(1,hh).toFixed(1)+'" fill="'+(v>0?'var(--good)':'var(--acc)')+'"><title>request '+(i+1)+': '+(v>0?'+':'')+v+' tokens</title></rect>'});
    const np=d.filter(v=>v>0).length,nn=d.filter(v=>v<0).length;s+=RD.t(w2-4,14,np+' requests tree ahead, '+nn+' blocks ahead',{a:'end',fs:10,fill:'var(--mute)'});
    el2.innerHTML=RD.svg(w2,h2,s,'Per-request difference in reused tokens');
    if(SGD.real)$('sgt-src').textContent='Checked: '+SGD.real.identical+' of '+SGD.real.runs+' real-class replays identical to the port ('+SGD.real.requests.toLocaleString('en-US')+' requests: SGLang v0.5.21 UnifiedRadixCache and RadixCache, vLLM v0.31.0 Scheduler and KVCacheManager), run 2026-10-08.'}
  RD.seg($('sgt-trace'),m=>{trace=m;draw()});
  $('sgt-cap').addEventListener('input',e=>{ci=+e.target.value;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sgtree']=[draw];
  addEventListener('resize',()=>{clearTimeout(root._t);root._t=setTimeout(draw,80)});
})();
