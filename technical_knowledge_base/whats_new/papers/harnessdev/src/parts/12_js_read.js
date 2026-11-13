// ---- The paper tab, part 1: shared data and the distance to the human references ----
const PT=window.PAPER.tables,RC=window.PAPER.rc,DV=RC.derived;
const CR=['Opus 4.8','GPT-5.5','Gemini 3.1 Pro','DeepSeek V4 Pro','Qwen 3.7 Max','Seed 2.0 Pro'];
const CCOL={'Opus 4.8':'var(--c2)','GPT-5.5':'var(--c4)','Gemini 3.1 Pro':'var(--c1)','DeepSeek V4 Pro':'var(--c6)','Qwen 3.7 Max':'var(--c3)','Seed 2.0 Pro':'var(--c5)'};
const BM=[['swe','SWE-Pro'],['term','Terminal-Bench 2.1'],['mle','MLE-bench'],['eq','EQ-Bench3'],['bc','BrowseComp']];
const rowOf=(t,n)=>PT[t].rows.find(r=>r.row===n);
const REF={swe:['Public coding-agent setup','Claude Fable 5',true],term:['OpenAI agent setup','GPT-5.6 Sol',true],mle:['MLEvolve','Gemini 3.1',false],eq:['Kimi Writer','Opus 4.8',false],bc:['OpenAI browsing stack','GPT-5.6 Sol',true]};

// (the roles diagram and the six-module chart were replaced on 2026-11-13 by the protocol stage, 31_js_sc_proto.js)

// distance to the human references (Figure 4), in the reveal of the first prediction
(function(){let mode='self';const host=$('gapPlot');if(!host)return;
  function draw(w){const hum=rowOf('T3','Human reference');const T=mode==='self'?'T3':'T4';const narrow=w<520;
    const lw=narrow?92:120,x0=lw,x1=w-(narrow?78:64),mx=150,sx=v=>x0+(x1-x0)*Math.min(v,mx)/mx;const gh=24,bh=13,gap=4;let s='',y=6;
    BM.forEach(([k,n])=>{const ref=REF[k];s+=tx(0,y+13,n,{fs:13,w:700})+tx(narrow?0:150,y+(narrow?28:13),'ref '+hum[k+'_p']+(ref[2]?'*':'')+': '+ref[0]+' + '+ref[1],{fs:11,c:'var(--mute)'});y+=narrow?36:gh;
      const top=y;CR.forEach(c=>{const r=rowOf(T,c),v=r[k],p=100*v/hum[k];s+=tx(lw-6,y+bh-2,c.replace(' Pro','').replace(' Max',''),{fs:11,a:'end'});
        s+=rc(x0,y,sx(p)-x0,bh,CCOL[c],{r:2,op:.9})+tx(sx(p)+4,y+bh-2,fmt(p,0)+'% ('+r[k+'_p']+(r[k+'_f']||'')+')',{fs:11,c:'var(--mute)'});y+=bh+gap});
      s+=ln2(sx(100),top-3,sx(100),y,'var(--ink)',{da:'4 3',sw:1.2});y+=10});
    s+=tx(sx(100),y+10,'100% = reference',{fs:11,a:'middle',c:'var(--mute)'});
    host.innerHTML=svgW(w,y+16,s,'Each creator as a percentage of the human reference')}
  segBind('gapM',m=>{mode=m;refit(host)});
  PRED_REVEAL.pr1=()=>fit(host,draw)})();
