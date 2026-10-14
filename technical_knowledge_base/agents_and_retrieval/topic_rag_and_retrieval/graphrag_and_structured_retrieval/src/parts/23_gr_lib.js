// ---- GraphRAG and structured retrieval: shared helpers (prefix gr) ----
window.GRL=(function(){
  const esc=RD.esc;
  const fmt=x=>(x==null||isNaN(x))?'n/a':Math.round(x).toLocaleString('en-US');
  const fmt1=x=>(x==null||isNaN(x))?'n/a':(+x).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1});
  const fmt3=x=>(x==null||isNaN(x))?'n/a':(+x).toFixed(3);
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--mute)','var(--bad)'];
  // line chart: o = {xs:[labels], series:[{name, color, ys, dash}], ymax, ylab, h}
  function line(el,o){
    const W=RD.width(el),H=o.h||230,L=40,R=12,T=12,B=34;
    const n=o.xs.length,X=i=>L+12+(W-L-R-12)*(n===1?0.5:i/(n-1)),Y=v=>T+(H-T-B)*(1-v/o.ymax);
    let s='';
    for(let g=0;g<=4;g++){const v=o.ymax*g/4,y=Y(v);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+4,fmt(v),{a:'end',fs:10.5,fill:'var(--mute)'})}
    o.xs.forEach((x,i)=>{s+=RD.t(X(i),H-B+15,esc(x),{a:'middle',fs:11,fill:'var(--mute)'})});
    if(o.xlab)s+=RD.t((L+W-R)/2,H-4,esc(o.xlab),{a:'middle',fs:11,fill:'var(--mute)'});
    o.series.forEach(se=>{const pts=se.ys.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
      s+='<polyline points="'+pts+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.bold?2.6:1.6)+'"'+(se.dash?' stroke-dasharray="4 3"':'')+'/>';
      se.ys.forEach((v,i)=>{s+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.2" fill="'+se.color+'"><title>'+esc(se.name)+', '+esc(o.xs[i])+': '+fmt(v)+(o.suffix?esc(o.suffix):'')+'</title></circle>'})});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart');
  }
  function legend(el,series){el.innerHTML=series.map(s=>'<span><i style="background:'+s.color+'"></i>'+esc(s.name)+'</span>').join('')}
  // a dashed box saying a run is pending, with its command
  function pend(id,what,cmd,est){const el=document.getElementById(id);if(!el)return;
    el.hidden=false;el.innerHTML='<b>Pending run.</b> '+what+' <span class="mute">Command: <code>'+esc(cmd)+'</code>, about '+esc(est)+(/no generator/.test(est)?'':' under the bench lock')+' (src/scripts/run_pending.sh). The page fills this in from src/data once it has run.</span>'}
  return {esc,fmt,fmt1,fmt3,COL,line,legend,pend};
})();
