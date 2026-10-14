// ---- Shared helpers for every tab of this page (window.RRL); the line chart is the sibling Vector indexes page's ----
window.RRL=(function(){
  const esc=RD.esc;
  const fmt=x=>x>=1e9?(x/1e9).toFixed(1)+' G':x>=1e6?(x/1e6).toFixed(1)+' M':x>=1e3?(x/1e3).toFixed(1)+' k':String(Math.round(x*10)/10);
  const C={'ce-minilm-l6':'var(--c2)','bge-reranker-v2-m3':'var(--c3)','qwen3-reranker-0.6b':'var(--c1)','colbert':'var(--c4)'};
  const NM={'ce-minilm-l6':'MiniLM-L6 CE','bge-reranker-v2-m3':'bge-reranker-v2-m3','qwen3-reranker-0.6b':'Qwen3-Reranker-0.6B','colbert':'ColBERT MaxSim'};
  const FS={bm25:'BM25',dense:'Qwen3-Embedding',hybrid:'Hybrid (RRF)'};
  // series: [{name,color,pts:[[x,y,tip]],dash,dots,line,hollow}]; o: x0,x1,y0,y1,xlog,xticks,yticks,xfmt,yfmt,xlabel,ylabel,h,hlines,y2 (right axis label fn)
  function chart(el,series,o){const W=Math.max(270,Math.min(RD.width(el),760)),H=o.h||Math.round(Math.min(340,Math.max(220,W*0.56)));const L=44,Rm=o.right||12,T=14,Bm=36;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const tx=v=>o.xlog?Math.log10(v):v;
    let x0=o.x0!==undefined?tx(o.x0):Math.min(...xs.map(tx)),x1=o.x1!==undefined?tx(o.x1):Math.max(...xs.map(tx));
    let y0=o.y0!==undefined?o.y0:Math.min(...ys),y1=o.y1!==undefined?o.y1:Math.max(...ys);if(y1===y0)y1=y0+1;if(x1===x0)x1=x0+1;
    const X=v=>L+(tx(v)-x0)/(x1-x0)*(W-L-Rm),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-Bm);let s='';
    (o.xticks||[]).forEach(v=>{const x=X(v);s+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(x,H-Bm+13,o.xfmt?o.xfmt(v):fmt(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    (o.yticks||[]).forEach(v=>{const y=Y(v);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,o.yfmt?o.yfmt(v):String(v),{a:'end',fs:10,fill:'var(--mute)'})+(o.y2?RD.t(W-Rm+3,y+3,o.y2(v),{fs:10,fill:'var(--mute)'}):'')});
    (o.hlines||[]).forEach(h=>{const y=Y(h[0]);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="'+(h[2]||'var(--mute)')+'" stroke-dasharray="4 3"/>'+RD.t(L+4,y-4,h[1],{fs:10,fill:h[2]||'var(--mute)'})});
    series.forEach(se=>{const p=se.pts;if(se.line!==false&&p.length>1)s+='<polyline fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.8)+'"'+(se.dash?' stroke-dasharray="5 3"':'')+' points="'+p.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ')+'"/>';
      if(se.dots!==false)p.forEach(q=>{const hol=q[3]==='h'||se.hollow;s+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="'+(q[4]||se.r||3.2)+'" fill="'+(hol?'var(--bg)':se.color)+'" stroke="'+se.color+'" stroke-width="'+(q[4]?2.5:1.4)+'"><title>'+esc(q[2]||'')+'</title></circle>'})});
    s+=RD.t((L+W-Rm)/2,H-4,o.xlabel||'',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(L+4,T-3,o.ylabel||'',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart');return {X,Y}}
  function legend(el,items){el.innerHTML=items.map(i=>'<span><i style="background:'+i[1]+(i[2]?';height:0;border-top:2px dashed '+i[1]:'')+'"></i>'+esc(i[0])+'</span>').join('')}
  // horizontal bars: rows [{name,v,color,txt}]
  function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r.v));
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm">'+esc(r.name)+'</div><div class="track"><div class="fill" style="width:'+Math.max(0,Math.min(100,100*(r.v-(o.min||0))/(mx-(o.min||0)))).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></div></div><div class="val">'+(r.txt||r.v)+'</div></div>').join('')+'</div>'}
  function seg(id,f){const el=document.getElementById(id);RD.seg(el,f);return ()=>{const b=el.querySelector('button.on');return b?b.dataset.m:null}}
  return {esc,fmt,C,NM,FS,chart,legend,bars,seg};
})();
