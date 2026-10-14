// ---- Shared helpers for every tab of this page (window.EL); the line chart follows the sibling Rerankers page's ----
window.EL=(function(){
  const esc=RD.esc;
  const fmt=x=>x>=1e9?(x/1e9).toFixed(1)+' G':x>=1e6?(x/1e6).toFixed(1)+' M':x>=1e3?(x/1e3).toFixed(1)+' k':String(Math.round(x*10)/10);
  const C={'minilm-l6':'var(--c2)','bge-small':'var(--c1)','gte-modernbert':'var(--c3)','qwen3-emb-0.6b':'var(--c4)','colbert-small':'var(--c6)','bm25':'var(--mute)','e5-small-v2':'var(--c5)'};
  const NM={'minilm-l6':'all-MiniLM-L6-v2','bge-small':'bge-small-en-v1.5','gte-modernbert':'gte-modernbert-base','qwen3-emb-0.6b':'Qwen3-Embedding-0.6B','colbert-small':'ColBERT-small','bm25':'BM25','e5-small-v2':'e5-small-v2'};
  const SET={scifact:'SciFact',nfcorpus:'NFCorpus',hotpotqa:'Multi-hop'};
  // series: [{name,color,pts:[[x,y,tip,hollow,r]],dash,dots,line}]; o: x0,x1,y0,y1,xticks,yticks,xfmt,yfmt,xlabel,ylabel,h,hlines
  function chart(el,series,o){const W=Math.max(270,Math.min(RD.width(el),760)),H=o.h||Math.round(Math.min(340,Math.max(220,W*0.56)));const L=o.left||44,Rm=o.right||12,T=16,Bm=36;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    let x0=o.x0!==undefined?o.x0:Math.min(...xs),x1=o.x1!==undefined?o.x1:Math.max(...xs);
    let y0=o.y0!==undefined?o.y0:Math.min(...ys),y1=o.y1!==undefined?o.y1:Math.max(...ys);if(y1===y0)y1=y0+1;if(x1===x0)x1=x0+1;
    const X=v=>L+(v-x0)/(x1-x0)*(W-L-Rm),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-Bm);let s='';
    (o.xticks||[]).forEach(v=>{const x=X(v);s+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(x,H-Bm+13,o.xfmt?o.xfmt(v):fmt(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    (o.yticks||[]).forEach(v=>{const y=Y(v);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,o.yfmt?o.yfmt(v):String(v),{a:'end',fs:10,fill:'var(--mute)'})});
    (o.hlines||[]).forEach(h=>{const y=Y(h[0]);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="'+(h[2]||'var(--mute)')+'" stroke-dasharray="4 3"/>'+RD.t(L+4,y-4,h[1],{fs:10,fill:h[2]||'var(--mute)'})});
    if(o.pre)s+=o.pre(X,Y);
    series.forEach(se=>{const p=se.pts;if(se.line!==false&&p.length>1)s+='<polyline fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.8)+'"'+(se.dash?' stroke-dasharray="5 3"':'')+' points="'+p.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ')+'"/>';
      if(se.dots!==false)p.forEach(q=>{const hol=q[3]==='h'||se.hollow;s+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="'+(q[4]||se.r||3.2)+'" fill="'+(hol?'var(--bg)':se.color)+'" stroke="'+se.color+'" stroke-width="1.4"'+(se.op?' opacity="'+se.op+'"':'')+'><title>'+esc(q[2]||'')+'</title></circle>'})});
    if(o.post)s+=o.post(X,Y);
    s+=RD.t((L+W-Rm)/2,H-4,o.xlabel||'',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(L+4,T-4,o.ylabel||'',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart');return {X,Y,W,H}}
  function legend(el,items){el.innerHTML=items.map(i=>'<span><i style="background:'+i[1]+'"></i>'+esc(i[0])+'</span>').join('')}
  // horizontal bars: rows [{name,v,color,txt,hl}]
  function bars(el,rows,o){o=o||{};const mx=o.max||Math.max(...rows.map(r=>r.v)),mn=o.min||0;
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</div><div class="track"><div class="fill" style="width:'+Math.max(0,Math.min(100,100*(r.v-mn)/(mx-mn))).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></div></div><div class="val">'+(r.txt!==undefined?r.txt:r.v)+'</div></div>').join('')+'</div>'}
  // interval rows: [{name,v,lo,hi,color,note}] drawn on a shared axis, with an optional reference line
  function intervals(el,rows,o){o=o||{};const W=Math.max(270,Math.min(RD.width(el),760)),lab=Math.min(170,Math.round(W*0.36)),R=46,rh=24,H=rows.length*rh+30;
    const lo=o.lo!==undefined?o.lo:Math.min(...rows.map(r=>r.lo)),hi=o.hi!==undefined?o.hi:Math.max(...rows.map(r=>r.hi));
    const X=v=>lab+(v-lo)/(hi-lo)*(W-lab-R);let s='';
    (o.ticks||[]).forEach(v=>{s+='<line x1="'+X(v)+'" y1="4" x2="'+X(v)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(X(v),H-8,(o.tfmt||(x=>x.toFixed(2)))(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.ref!==undefined)s+='<line x1="'+X(o.ref)+'" y1="2" x2="'+X(o.ref)+'" y2="'+(H-22)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    const mc=Math.max(8,Math.floor((lab-8)/5.6));rows.forEach((r,i)=>{const y=12+i*rh;const nm=r.name.length>mc?r.name.slice(0,mc-1)+'…':r.name;s+='<g><title>'+esc(r.name)+'</title>'+RD.t(lab-6,y+4,esc(nm),{a:'end',fs:11,fill:r.dim?'var(--mute)':undefined})+'</g>';
      s+='<line x1="'+X(r.lo)+'" y1="'+y+'" x2="'+X(r.hi)+'" y2="'+y+'" stroke="'+(r.color||'var(--acc)')+'" stroke-width="2"/>'+
        '<circle cx="'+X(r.v)+'" cy="'+y+'" r="4.5" fill="'+(r.color||'var(--acc)')+'"><title>'+esc(r.name+': '+r.v.toFixed(3)+' ('+r.lo.toFixed(3)+' to '+r.hi.toFixed(3)+')')+'</title></circle>'+
        RD.t(W-R+4,y+4,r.txt||r.v.toFixed(3),{fs:10.5})});
    el.innerHTML=RD.svg(W,H,s,o.label||'intervals');return X}
  function seg(id,f){const el=document.getElementById(id);RD.seg(el,f);return ()=>{const b=el.querySelector('button.on');return b?b.dataset.m:null}}
  // blue for positive, orange for negative, opacity by magnitude
  const heat=(v,m)=>{const a=Math.min(1,Math.abs(v)/m);return (v>=0?'var(--c1)':'var(--c2)')+'" fill-opacity="'+(0.12+0.88*a).toFixed(2)};
  const short=m=>m.replace(/^.*\//,'');
  return {esc,fmt,C,NM,SET,chart,legend,bars,intervals,seg,heat,short};
})();
