// ---- a small SVG chart helper: axes, ticks, lines, points, arrows, laid out at the measured width ----
window.PL=(function(){
  const C=n=>'var(--'+n+')';
  const fmt=v=>{const a=Math.abs(v);if(a===0)return '0';if(a>=1000)return Math.round(v).toLocaleString('en-US');if(a>=10)return (Math.round(v*10)/10).toString();if(a>=1)return (Math.round(v*100)/100).toString();return (Math.round(v*1000)/1000).toString()};
  function ticks(a,b,n){const span=b-a;if(!(span>0))return [a];const raw=span/(n||5),p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;
    const st=(m<1.5?1:m<3?2:m<7?5:10)*p;const out=[];for(let v=Math.ceil(a/st-1e-9)*st;v<=b+1e-9*st;v+=st)out.push(Math.abs(v)<1e-12*st?0:v);return out}
  // o: {el, h, x:[a,b], y:[a,b], xl, yl, lines, pts, segs, txt, bands, onclick, label}
  function chart(o){
    const el=o.el,W=Math.max(260,Math.min(o.maxw||860,RD.width(el))),H=o.hf?o.hf(W):(o.h||(W<420?220:250));
    const m=Object.assign({l:46,r:12,t:10,b:34},o.m||{});const iw=W-m.l-m.r,ih=H-m.t-m.b;
    const [x0,x1]=o.x,[y0,y1]=o.y;
    const sx=v=>m.l+(v-x0)/(x1-x0)*iw,sy=v=>m.t+ih-(v-y0)/(y1-y0)*ih;
    const cl=v=>Math.max(-5000,Math.min(5000,v));
    let s='<defs><clipPath id="'+o.id+'-cp"><rect x="'+m.l+'" y="'+m.t+'" width="'+iw+'" height="'+ih+'"/></clipPath>'+
      '<marker id="'+o.id+'-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--c3)"/></marker></defs>';
    (o.bands||[]).forEach(b=>{s+='<rect x="'+sx(b.x0)+'" y="'+m.t+'" width="'+Math.max(0,sx(b.x1)-sx(b.x0))+'" height="'+ih+'" fill="'+b.c+'" opacity="'+(b.o||.12)+'"/>'});
    const xt=o.xt||ticks(x0,x1,W<420?4:6),yt=o.yt||ticks(y0,y1,4);
    yt.forEach(v=>{const y=sy(v);s+='<line x1="'+m.l+'" x2="'+(m.l+iw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(m.l-5)+'" y="'+(y+3.5)+'" text-anchor="end" fill="var(--mute)">'+(o.yf||fmt)(v)+'</text>'});
    xt.forEach(v=>{const x=sx(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(m.t+ih+14)+'" text-anchor="middle" fill="var(--mute)">'+(o.xf||fmt)(v)+'</text>'});
    if(y0<0&&y1>0)s+='<line x1="'+m.l+'" x2="'+(m.l+iw)+'" y1="'+sy(0)+'" y2="'+sy(0)+'" stroke="var(--dim)"/>';
    if(x0<0&&x1>0&&!o.nozx)s+='<line x1="'+sx(0)+'" x2="'+sx(0)+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" stroke="var(--dim)"/>';
    s+='<g clip-path="url(#'+o.id+'-cp)">';
    (o.polys||[]).forEach(P=>{let d='';for(let i=0;i<P.xs.length;i++)d+=(i?'L':'M')+sx(P.xs[i]).toFixed(1)+','+cl(sy(P.ys[i])).toFixed(1);s+='<path d="'+d+'Z" fill="'+(P.fill||'none')+'" fill-opacity="'+(P.fo==null?.15:P.fo)+'" stroke="'+(P.c||'none')+'" stroke-width="'+(P.w||1.5)+'"'+(P.dash?' stroke-dasharray="'+P.dash+'"':'')+'/>'});
    (o.lines||[]).forEach(L=>{let d='';for(let i=0;i<L.xs.length;i++){const y=L.ys[i];if(!isFinite(y)){continue}d+=(d?'L':'M')+sx(L.xs[i]).toFixed(1)+','+cl(sy(y)).toFixed(1)}
      s+='<path d="'+d+'" fill="none" stroke="'+L.c+'" stroke-width="'+(L.w||2)+'"'+(L.dash?' stroke-dasharray="'+L.dash+'"':'')+(L.o?' opacity="'+L.o+'"':'')+'/>'});
    (o.segs||[]).forEach(g=>{s+='<line x1="'+sx(g.x1)+'" y1="'+cl(sy(g.y1))+'" x2="'+sx(g.x2)+'" y2="'+cl(sy(g.y2))+'" stroke="'+g.c+'" stroke-width="'+(g.w||2)+'"'+(g.arrow?' marker-end="url(#'+o.id+'-ar)"':'')+(g.dash?' stroke-dasharray="'+g.dash+'"':'')+'/>'});
    (o.pts||[]).forEach(p=>{s+='<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="'+(p.r||4)+'" fill="'+(p.c||C('c1'))+'"'+(p.stroke?' stroke="'+p.stroke+'" stroke-width="1.5"':'')+(p.o!=null?' fill-opacity="'+p.o+'"':'')+'>'+(p.title?'<title>'+p.title+'</title>':'')+'</circle>'});
    s+='</g>';
    (o.txt||[]).forEach(t=>{s+='<text x="'+sx(t.x)+'" y="'+sy(t.y)+'" text-anchor="'+(t.a||'start')+'" fill="'+(t.c||'var(--ink)')+'"'+(t.b?' font-weight="600"':'')+'>'+t.s+'</text>'});
    if(o.xl)s+='<text x="'+(m.l+iw/2)+'" y="'+(H-3)+'" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
    if(o.yl)s+='<text x="11" y="'+(m.t+ih/2)+'" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+(m.t+ih/2)+')">'+o.yl+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+RD.esc(o.label||'chart')+'">'+s+'</svg>';
    const svg=el.firstChild;
    if(o.onclick)svg.addEventListener('click',ev=>{const r=svg.getBoundingClientRect(),k=W/r.width;const px=(ev.clientX-r.left)*k,py=(ev.clientY-r.top)*k;
      if(px<m.l||px>m.l+iw||py<m.t||py>m.t+ih)return;o.onclick(x0+(px-m.l)/iw*(x1-x0),y0+(m.t+ih-py)/ih*(y1-y0),{px,py,sx,sy})});
    return {sx,sy,W,H};
  }
  const range=(a,b,n)=>{const o=[];for(let i=0;i<=n;i++)o.push(a+(b-a)*i/n);return o};
  const ext=(arr,pad)=>{let a=Infinity,b=-Infinity;arr.forEach(v=>{if(isFinite(v)){if(v<a)a=v;if(v>b)b=v}});const p=(b-a)*(pad==null?0.06:pad)||1;return [a-p,b+p]};
  return {chart,ticks,fmt,range,ext,C};
})();
