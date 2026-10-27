// ---- A small line-chart helper for the rebuilt figures (drawn at the measured width, so font sizes are on-screen sizes) ----
// cfg: {H, xr, yr, xlog, xt:[[v,label]], yt, xl, yl, y2:{yr,yt,yl}, series:[{n,c,pts,da,sw,ax,marks,bars:[[x,lo,hi]]}],
//       hl:[{y,c,da,t}], bands:[{x0,x1,t,c}], vl:[{x,c,t}]}
function plotSvg(w,cfg){
  const H=cfg.H||Math.max(200,Math.min(300,w*.5)),pl=cfg.pl||52,pr=cfg.y2?52:14,pt=14,pb=cfg.xl?40:26,lg=Math.log10;
  const X0=cfg.xlog?lg(cfg.xr[0]):cfg.xr[0],X1=cfg.xlog?lg(cfg.xr[1]):cfg.xr[1];
  const sx=v=>pl+(w-pl-pr)*(((cfg.xlog?lg(Math.max(v,1e-9)):v)-X0)/(X1-X0));
  const mky=r=>v=>pt+(H-pt-pb)*(1-(v-r[0])/(r[1]-r[0]));
  const sy=mky(cfg.yr),sy2=cfg.y2?mky(cfg.y2.yr):sy;
  const cx=v=>Math.max(pl,Math.min(w-pr,v)),cy=v=>Math.max(pt-2,Math.min(H-pb+2,v));
  let s='';
  (cfg.bands||[]).forEach(b=>{s+=rc(sx(b.x0),pt,sx(b.x1)-sx(b.x0),H-pt-pb,b.c||'var(--soft)',{r:0,op:.9});if(b.t)s+=tx((sx(b.x0)+sx(b.x1))/2,pt+12,b.t,{fs:11,a:'middle',c:'var(--mute)'})});
  (cfg.yt||[]).forEach(([v,l])=>{s+=ln2(pl,sy(v),w-pr,sy(v),'var(--line)')+tx(pl-6,sy(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
  if(cfg.y2)(cfg.y2.yt||[]).forEach(([v,l])=>{s+=tx(w-pr+6,sy2(v)+4,l,{fs:11,c:'var(--mute)'})});
  (cfg.xt||[]).forEach(([v,l])=>{const x=sx(v),hw=String(l).length*3.3,a=x+hw>w-1?'end':x-hw<1?'start':'middle';s+=ln2(x,H-pb,x,H-pb+4,'var(--mute)')+tx(a==='end'?Math.min(x+4,w-1):x,H-pb+16,l,{fs:11,a,c:'var(--mute)'})});
  s+=ln2(pl,H-pb,w-pr,H-pb,'var(--mute)')+ln2(pl,pt,pl,H-pb,'var(--mute)');
  if(cfg.xl)s+=tx((pl+w-pr)/2,H-6,cfg.xl,{fs:11,a:'middle',c:'var(--mute)'});
  if(cfg.yl)s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+cfg.yl+'</text>';
  if(cfg.y2&&cfg.y2.yl)s+='<text x="'+(w-8)+'" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 '+(w-8)+' '+((pt+H-pb)/2)+')">'+cfg.y2.yl+'</text>';
  (cfg.hl||[]).forEach(h=>{s+=ln2(pl,sy(h.y),w-pr,sy(h.y),h.c||'var(--mute)',{da:h.da||'5 3',sw:1.3});if(h.t)s+=tx(w-pr-4,sy(h.y)-5,h.t,{fs:11,a:'end',c:h.c||'var(--mute)'})});
  (cfg.vl||[]).forEach(h=>{s+=ln2(sx(h.x),pt,sx(h.x),H-pb,h.c||'var(--mute)',{da:'4 3'});if(h.t)s+=tx(sx(h.x)+4,pt+24,h.t,{fs:11,c:h.c||'var(--mute)'})});
  (cfg.series||[]).forEach(se=>{const Y=se.ax===2?sy2:sy;
    if(se.pts&&se.pts.length>1&&!se.only){let d='';se.pts.forEach((p,i)=>{if(cfg.xlog&&p[0]<=0)return;d+=(d?'L':'M')+cx(sx(p[0])).toFixed(1)+','+cy(Y(p[1])).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="'+(se.sw||1.8)+'"'+(se.da?' stroke-dasharray="'+se.da+'"':'')+' stroke-linejoin="round"/>'}
    (se.bars||[]).forEach(([x,lo,hi])=>{s+=ln2(sx(x),Y(lo),sx(x),Y(hi),se.c,{sw:1.5})+ln2(sx(x)-4,Y(lo),sx(x)+4,Y(lo),se.c)+ln2(sx(x)-4,Y(hi),sx(x)+4,Y(hi),se.c)});
    if(se.marks)se.pts.forEach(p=>{s+='<circle cx="'+sx(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.5" fill="'+se.c+'"><title>'+se.n+': '+p[0]+', '+p[1]+'</title></circle>'})});
  return svgW(w,H,s,cfg.label||'chart')}
const plotLeg=series=>'<div class="pl-leg">'+series.filter(s=>!s.noleg).map(s=>'<span><i style="background:'+s.c+(s.da?';background:repeating-linear-gradient(90deg,'+s.c+' 0 5px,transparent 5px 8px)':'')+'"></i>'+s.n+'</span>').join('')+'</div>';
const logTicks=(a,b)=>{const t=[];for(let e=Math.ceil(Math.log10(a));e<=Math.floor(Math.log10(b));e++)t.push([10**e,e<0?'0.'+'0'.repeat(-e-1)+'1':fmt(10**e)]);return t};
