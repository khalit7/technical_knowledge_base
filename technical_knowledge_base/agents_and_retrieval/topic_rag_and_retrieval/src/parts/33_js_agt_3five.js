// ---- Agentic lab: the five strategies, a cost-accuracy chart and the full table ----
(function(){
  const P=window.AGT,D=P.D&&P.D.strategies,$=P.$,esc=P.esc;
  if(!D){return}
  const S=window.AGT_STRATS=[
    ['closed','No retrieval','var(--mute)'],
    ['single_k5','Single shot, top 5','var(--c1)'],
    ['react','Agent loop (ReAct)','var(--c4)'],
    ['decomp','Decompose, then retrieve','var(--c6)'],
    ['longctx','Long context: own 10 paragraphs','var(--c3)'],
    ['longctx_tokens8000','Long context: 8k tokens','var(--c5)'],
    ['single_k2','Single shot, top 2','var(--c1)'],
    ['single_k10','Single shot, top 10','var(--c1)'],
    ['single_k5_methodbm25','Single shot, BM25 top 5','var(--c2)']];
  const NAME=Object.fromEntries(S.map(s=>[s[0],s[1]]));
  let model='4b',xk='tok',yk='f1';
  const XS={tok:['tokens per question (input + output, as billed)',r=>r.tok_in+r.tok_out,true],
    sec:['seconds per question (wall clock, this laptop)',r=>r.wall_mean,true],
    srch:['searches per question',r=>r.searches,false]};
  const YS={f1:['answer F1',r=>r.f1],em:['exact match',r=>r.em],gold:['gold paragraphs the model saw',r=>r.gold_recall]};
  function scatter(){
    const el=$('agt-five-chart');const W=P.width(el),H=Math.max(250,Math.min(340,Math.round(W*.5))),L=46,R=14,T=12,B=40;
    const iw=W-L-R,ih=H-T-B;const rows=S.filter(s=>D[model]&&D[model][s[0]]).map(s=>({k:s[0],c:s[2],r:D[model][s[0]]}));
    const other=model==='1.7b'?'4b':'1.7b';
    const orows=S.filter(s=>D[other]&&D[other][s[0]]).map(s=>({k:s[0],c:s[2],r:D[other][s[0]]}));
    const all=rows.concat(orows);const fx=XS[xk][1],fy=YS[yk][1],lg=XS[xk][2];
    let x0=Math.min(...all.map(o=>fx(o.r))),x1=Math.max(...all.map(o=>fx(o.r)));
    if(lg){x0=Math.pow(10,Math.floor(Math.log10(Math.max(1e-3,x0))));x1=Math.pow(10,Math.ceil(Math.log10(x1)))}else{x0=0;x1=Math.ceil(x1+.5)}
    const X=v=>L+(lg?(Math.log10(Math.max(v,x0))-Math.log10(x0))/(Math.log10(x1)-Math.log10(x0)):(v-x0)/(x1-x0))*iw;
    const y1=Math.min(1,Math.ceil(Math.max(...all.map(o=>fy(o.r)))*10+.5)/10);const Y=v=>T+ih-(v/y1)*ih;
    let s='';
    for(let t=0;t<=5;t++){const v=y1*t/5;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+P.T(L-5,Y(v)+4,v.toFixed(2),{a:'end',fs:10,fill:'var(--mute)'})}
    if(lg){for(let e=Math.log10(x0);e<=Math.log10(x1)+1e-9;e++){const v=Math.pow(10,e);s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(T+ih)+'" stroke="var(--line)"/>'+P.T(X(v),H-B+14,v>=1000?(v/1000)+'k':String(+v.toFixed(2)),{a:'middle',fs:10,fill:'var(--mute)'})}}
    else{for(let v=0;v<=x1;v++){s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+T+'" y2="'+(T+ih)+'" stroke="var(--line)"/>'+P.T(X(v),H-B+14,String(v),{a:'middle',fs:10,fill:'var(--mute)'})}}
    s+=P.T(L+iw/2,H-6,esc(XS[xk][0]),{a:'middle',fs:10.5,fill:'var(--mute)'});
    // the other model, hollow, joined to the same strategy
    orows.forEach(o=>{const m=rows.find(x=>x.k===o.k);if(m)s+='<line x1="'+X(fx(o.r))+'" y1="'+Y(fy(o.r))+'" x2="'+X(fx(m.r))+'" y2="'+Y(fy(m.r))+'" stroke="'+o.c+'" stroke-dasharray="2 3" opacity=".5"/>';
      s+='<circle cx="'+X(fx(o.r))+'" cy="'+Y(fy(o.r))+'" r="4.5" fill="none" stroke="'+o.c+'" stroke-width="1.5" opacity=".7"><title>'+esc(NAME[o.k])+' ('+other+'): '+fy(o.r).toFixed(3)+'</title></circle>'});
    const lab=[];
    rows.forEach(o=>{const cx=X(fx(o.r)),cy=Y(fy(o.r));
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="6" fill="'+o.c+'" stroke="var(--bg)" stroke-width="1.5"><title>'+esc(NAME[o.k])+': '+YS[yk][0]+' '+fy(o.r).toFixed(3)+', '+XS[xk][0]+' '+(+fx(o.r).toFixed(2))+'</title></circle>';
      lab.push({x:cx,y:cy,t:NAME[o.k]})});
    // labels: right of the dot unless near the edge; nudge to avoid overlap
    lab.sort((a,b)=>a.y-b.y);const used=[];
    lab.forEach(l=>{const w=l.t.length*6.3;let lx=l.x+9,anc='start';if(lx+w>W-R){lx=l.x-9;anc='end'}let ly=l.y+4;
      for(let i=0;i<8&&used.some(u=>Math.abs(u.y-ly)<12&&Math.abs(u.x-lx)<Math.max(u.w,w));i++)ly+=12;used.push({x:lx,y:ly,w});
      if(W>420||l.t.length<26)s+=P.T(lx,ly,esc(l.t),{a:anc,fs:10.5})});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(YS[yk][0]+' against '+XS[xk][0])+'">'+s+'</svg>'+
      '<div class="agt-leg">'+rows.map(o=>'<span><i style="background:'+o.c+';border-radius:50%"></i>'+esc(NAME[o.k])+'</span>').join('')+'<span>hollow: Qwen3-'+other.toUpperCase().replace('B','B')+'</span></div>';
  }
  function table(){
    const rows=S.filter(s=>D[model]&&D[model][s[0]]);
    const f=P.f3;
    const warn='';
    $('agt-five-table').innerHTML=warn+'<div class="tw"><table class="agt-sum"><thead><tr><th>Strategy (Qwen3-'+model.toUpperCase()+')</th><th class="num">F1</th><th class="num">95% CI</th><th class="num">EM</th><th class="num">bridge F1</th><th class="num">comparison F1</th><th class="num">gold seen</th><th class="num">searches</th><th class="num">calls</th><th class="num">tokens in</th><th class="num">prefilled</th><th class="num">tokens out</th><th class="num">s, mean</th><th class="num">vs top 5 (F1)</th><th class="num">said yes/no, gold is not</th></tr></thead><tbody>'+
      rows.map(s=>{const r=D[model][s[0]],v=r.vs_single;return '<tr'+(['single_k5','react'].includes(s[0])?' class="hl"':'')+'><td><span class="agt-dot" style="background:'+s[2]+'"></span> '+esc(s[1])+'</td><td class="num">'+f(r.f1)+'</td><td class="num">'+f(r.f1_ci[0])+' to '+f(r.f1_ci[1])+'</td><td class="num">'+f(r.em)+'</td><td class="num">'+f(r.f1_bridge)+'</td><td class="num">'+f(r.f1_comparison)+'</td><td class="num">'+P.pc(r.gold_recall,0)+'</td><td class="num">'+r.searches.toFixed(2)+'</td><td class="num">'+r.calls.toFixed(2)+'</td><td class="num">'+P.n0(r.tok_in)+'</td><td class="num">'+P.n0(r.tok_in_new)+'</td><td class="num">'+P.n0(r.tok_out)+'</td><td class="num">'+r.wall_mean.toFixed(2)+'</td><td class="num">'+(v?(v.diff>=0?'+':'')+v.diff.toFixed(3)+' ('+v.wins+' up, '+v.losses+' down)':'')+'</td><td class="num">'+r.yesno_wrong+'</td></tr>'}).join('')+'</tbody></table></div>';
  }
  function draw(){scatter();table()}
  P.seg($('agt-five-model'),v=>{model=v;draw()});
  P.seg($('agt-five-x'),v=>{xk=v;draw()});
  P.seg($('agt-five-y'),v=>{yk=v;draw()});
  P.onRender(draw);
})();
