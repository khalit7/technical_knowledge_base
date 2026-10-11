// ---- Speculative decoding page: shared helpers (facts, predict-then-reveal, a small line chart) ----
window.SD=(function(){
  const D=window.SD_DATA||{};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // fill <span data-f="key"> from the recorded facts (one source of numbers for prose and charts)
  function fill(root){(root||document).querySelectorAll('[data-f]').forEach(el=>{const v=(D.facts||{})[el.dataset.f];el.innerHTML=v==null?'?':v})}
  fill();
  const fmt=(x,d)=>x==null||!isFinite(x)?'n/a':(+x).toLocaleString('en-GB',{minimumFractionDigits:d==null?0:d,maximumFractionDigits:d==null?0:d});
  // predict-then-reveal: .sdpr with buttons data-a; answers in D.preds[id] = {right, text}
  function pred(id){const box=document.getElementById(id);if(!box)return;const a=(D.preds||{})[id];if(!a)return;
    const rev=box.querySelector('.rev');
    box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      box.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===a.right)x.classList.add('right')});
      if(+b.dataset.a!==a.right)b.classList.add('wrong');rev.hidden=false;rev.innerHTML=(+b.dataset.a===a.right?'<b>Right.</b> ':'<b>Not quite.</b> ')+a.text;}))}
  // width of a container even in a hidden tab
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // line chart: o={series:[{pts:[[x,y]],color,dash,dots,label,w}], xlab, ylab, xlog, ylog, ymin, ymax, xmin, xmax, h, hline:{y,label}, marks:[{x,y,label}]}
  function chart(el,o){
    const W=Math.max(280,Math.min(860,width(el))),H=o.h||Math.round(Math.min(320,Math.max(220,W*0.5))),L=48,R=12,T=14,B=40;
    const all=o.series.flatMap(s=>s.pts);
    const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
    let x0=o.xmin!=null?o.xmin:Math.min(...xs),x1=o.xmax!=null?o.xmax:Math.max(...xs),y0=o.ymin!=null?o.ymin:Math.min(0,...ys),y1=o.ymax!=null?o.ymax:Math.max(...ys)*1.08;
    if(o.hline)y1=Math.max(y1,o.hline.y*1.08);
    const fx=o.xlog?(v=>L+(Math.log(v)-Math.log(x0))/(Math.log(x1)-Math.log(x0))*(W-L-R)):(v=>L+(v-x0)/(x1-x0||1)*(W-L-R));
    const fy=o.ylog?(v=>H-B-(Math.log(v)-Math.log(y0))/(Math.log(y1)-Math.log(y0))*(H-T-B)):(v=>H-B-(v-y0)/(y1-y0||1)*(H-T-B));
    let s='';
    // grid and ticks
    const ticks=(a,b,lg)=>{if(lg){const r=[];for(let e=Math.floor(Math.log10(a));e<=Math.ceil(Math.log10(b));e++)[1,2,5].forEach(m=>{const v=m*Math.pow(10,e);if(v>=a*0.999&&v<=b*1.001)r.push(v)});return r}
      const st=Math.pow(10,Math.floor(Math.log10((b-a)/4||1)));const c=[1,2,2.5,5,10].map(m=>m*st).find(x=>(b-a)/x<=6)||st*10;const r=[];for(let v=Math.ceil(a/c)*c;v<=b+1e-9;v+=c)r.push(+v.toFixed(10));return r};
    const xt=o.xticks||ticks(x0,x1,o.xlog),yt=ticks(y0,y1,o.ylog);
    yt.forEach(v=>{const y=fy(v);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(L-5)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+(o.yfmt?o.yfmt(v):fmt(v,v<1&&v>0?2:(v<10&&v%1?1:0)))+'</text>'});
    xt.forEach(v=>{const x=fx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(H-B)+'" stroke="var(--line)" stroke-dasharray="2 3"/><text x="'+x+'" y="'+(H-B+14)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+fmt(v,v%1?1:0)+'</text>'});
    s+='<text x="'+((L+W-R)/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+esc(o.xlab||'')+'</text>';
    s+='<text x="12" y="'+((T+H-B)/2)+'" text-anchor="middle" font-size="11" fill="var(--mute)" transform="rotate(-90 12 '+((T+H-B)/2)+')">'+esc(o.ylab||'')+'</text>';
    if(o.hline){const y=fy(o.hline.y);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="5 4"/><text x="'+(W-R-2)+'" y="'+(y-4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+esc(o.hline.label||'')+'</text>'}
    o.series.forEach(se=>{const pts=se.pts.filter(p=>isFinite(p[0])&&isFinite(p[1]));if(!pts.length)return;
      if(!se.nolines&&pts.length>1)s+='<polyline fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||2)+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+' points="'+pts.map(p=>fx(p[0]).toFixed(1)+','+fy(p[1]).toFixed(1)).join(' ')+'"/>';
      if(se.dots)pts.forEach(p=>{s+='<circle cx="'+fx(p[0]).toFixed(1)+'" cy="'+fy(p[1]).toFixed(1)+'" r="'+(se.r||3.5)+'" fill="'+(se.hollow?'var(--bg)':se.color)+'" stroke="'+se.color+'" stroke-width="1.5"><title>'+esc((se.label||'')+': '+fmt(p[0],p[0]%1?2:0)+', '+fmt(p[1],2))+'</title></circle>'});
      if(se.err)se.err.forEach(e=>{s+='<line x1="'+fx(e[0])+'" x2="'+fx(e[0])+'" y1="'+fy(e[1])+'" y2="'+fy(e[2])+'" stroke="'+se.color+'" stroke-width="1.5"/>'});});
    (o.marks||[]).forEach(m=>{s+='<text x="'+Math.min(W-R-2,Math.max(L+2,fx(m.x)))+'" y="'+(fy(m.y)-7)+'" text-anchor="'+(fx(m.x)>W*0.7?'end':'start')+'" font-size="10.5" fill="var(--ink)">'+esc(m.label)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+esc(o.aria||o.ylab||'chart')+'">'+s+'</svg>'+(o.legend?'<div class="sd-leg">'+o.series.filter(se=>se.label&&!se.nolegend).map(se=>'<span><i style="background:'+se.color+'"></i>'+esc(se.label)+'</span>').join('')+'</div>':'');
  }
  // segmented buttons built from a list
  function segs(el,items,cur,f){el.innerHTML=items.map(([v,l])=>'<button data-m="'+esc(v)+'"'+(v===cur?' class="on"':'')+'>'+esc(l)+'</button>').join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})}
  // seeded random numbers (mulberry32), so animations replay the same draws
  function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // expected tokens per step
  const etok=(a,k)=>a>=1?k+1:(1-Math.pow(a,k+1))/(1-a);
  ['sd-pr1','sd-pr2'].forEach(pred);
  // a token made visible: newlines as a return arrow, a whitespace-only token as an open box
  const vis=t=>{t=String(t);if(/^\s+$/.test(t))return t.replace(/\n/g,'\u21b5').replace(/ /g,'\u2423');return t.replace(/\n/g,'\u21b5')};
  return {D,esc,fmt,fill,pred,width,chart,segs,rng,etok,vis};
})();
