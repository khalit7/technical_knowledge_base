// ---- Shared chart helpers (window.MC, copied from the Memory technology page) ----
window.MC=(function(){
  const D=window.PCD;
  const fmtB=b=>b>=1<<30?(b/(1<<30)).toFixed(b%(1<<30)?1:0)+' GiB':b>=1<<20?(b/(1<<20)).toFixed(0)+' MiB':b>=1024?(b/1024).toFixed(0)+' KiB':b+' B';
  const fmtN=(v,d)=>{if(!isFinite(v))return '-';const a=Math.abs(v);d=d==null?(a>=100?0:a>=10?1:2):d;return v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
  const gb=b=>fmtN(b/1e9,b/1e9>=100?0:b/1e9>=10?1:2)+' GB';
  // line chart: series [{name,color,pts:[{x,y,lo,hi}],dash}], opts {logx,logy,xl,yl,xfmt,yfmt,marks:[{x,label}],bands:[{x0,x1,label,color}],h}
  function line(el,series,o){
    const W=RD.width(el),L=W<500?46:56,R=12,B=o.xl?44:30;
    // legend rows above the plot, wrapped to the width
    const leg=[];let lx_=L+4,lr=0;series.forEach(se=>{if(!se.name)return;const w=se.name.length*5.8+26;if(lx_+w>W-R&&lx_>L+4){lr++;lx_=L+4}leg.push([lx_,lr,se]);lx_+=w});
    const T=14+(leg.length?(lr+1)*13:0),H=(o.h||(W<500?250:290))+(T-14);
    const xs=[],ys=[];series.forEach(s=>s.pts.forEach(p=>{xs.push(p.x);ys.push(p.y);if(p.lo!=null)ys.push(p.lo);if(p.hi!=null)ys.push(p.hi)}));
    (o.extraY||[]).forEach(v=>ys.push(v));
    const lx=o.logx?Math.log10:v=>v,ly=o.logy?Math.log10:v=>v;
    let x0=lx(Math.min(...xs)),x1=lx(Math.max(...xs)),y0=o.y0!=null?ly(o.y0):ly(Math.min(...ys)),y1=o.y1!=null?ly(o.y1):ly(Math.max(...ys));
    if(o.logy){y0=Math.floor(y0);y1=Math.ceil(y1)}else{y0=o.y0!=null?y0:0;y1=y1*1.08}
    if(x1===x0)x1=x0+1;
    const X=v=>L+(lx(v)-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-(ly(v)-y0)/(y1-y0))*(H-T-B);
    let s='';
    (o.bands||[]).forEach(b=>{const a=X(b.x0),c=X(b.x1);s+='<rect x="'+a+'" y="'+T+'" width="'+Math.max(0,c-a)+'" height="'+(H-T-B)+'" style="fill:'+b.color+';opacity:.10"/>';
      if(b.label)s+=RD.t((a+c)/2,T+11,b.label,{a:'middle',fs:10,fill:'var(--mute)'})});
    // grid
    if(o.logy){for(let e=y0;e<=y1;e++){const yy=Y(Math.pow(10,e));s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"/>'+RD.t(L-4,yy+3,(o.yfmt||fmtN)(Math.pow(10,e)),{a:'end',fs:10,fill:'var(--mute)'})}}
    else{const st=niceStep((y1-y0)/4);for(let v=0;v<=y1+1e-9;v+=st){const yy=Y(v);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:var(--line)"/>'+RD.t(L-4,yy+3,(o.yfmt||(u=>fmtN(u,st>=1?0:st>=0.1?1:2)))(v),{a:'end',fs:10,fill:'var(--mute)'})}}
    const tk=o.xticks||series[0].pts.map(p=>p.x);const every=Math.max(1,Math.ceil(tk.length/(W<500?5:9)));
    tk.forEach((v,i)=>{if(i%every)return;const xx=X(v);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(H-B)+'" y2="'+(H-B+4)+'" style="stroke:var(--mute)"/>'+RD.t(xx,H-B+15,(o.xfmt||fmtN)(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    if(o.xl)s+=RD.t(L+(W-L-R)/2,H-6,o.xl,{a:'middle',fs:11,fill:'var(--mute)'});
    if(o.yl)s+='<text transform="translate(11,'+(T+(H-T-B)/2)+') rotate(-90)" text-anchor="middle" font-size="11" style="fill:var(--mute)">'+o.yl+'</text>';
    (o.hlines||[]).forEach(h=>{const yy=Y(h.y);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+yy+'" y2="'+yy+'" style="stroke:'+h.color+'" stroke-dasharray="5 4"/>'+RD.t(L+4,yy-4,h.label,{fs:10,fill:h.color})});
    (o.marks||[]).forEach(m=>{const xx=X(m.x);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" style="stroke:var(--mute)" stroke-dasharray="2 3"/>'+RD.t(xx+3,H-B-4-(m.dy||0),m.label,{fs:10,fill:'var(--mute)'})});
    series.forEach(se=>{let d='';se.pts.forEach((p,i)=>{d+=(i?'L':'M')+X(p.x).toFixed(1)+' '+Y(p.y).toFixed(1);
        if(p.lo!=null&&p.hi!=null)s+='<line x1="'+X(p.x)+'" x2="'+X(p.x)+'" y1="'+Y(p.lo)+'" y2="'+Y(p.hi)+'" style="stroke:'+se.color+';opacity:.55"/>'});
      s+='<path d="'+d+'" fill="none" style="stroke:'+se.color+'" stroke-width="2"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+'/>';
      se.pts.forEach(p=>{s+='<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="3" style="fill:'+se.color+'"><title>'+(se.name||'')+': '+(o.xfmt||fmtN)(p.x)+', '+fmtN(p.y)+'</title></circle>'})});
    // legend
    leg.forEach(([x,r,se])=>{const y=6+r*13;s+='<rect x="'+x+'" y="'+(y+2)+'" width="10" height="3" style="fill:'+se.color+'"/>'+RD.t(x+13,y+7,se.name,{fs:10})});
    el.innerHTML=RD.svg(W,H,s,o.label||'chart');
  }
  function niceStep(r){const p=Math.pow(10,Math.floor(Math.log10(r)));const m=r/p;return (m<1.5?1:m<3?2:m<7?5:10)*p}
  // horizontal bars on a log or linear scale: rows [{name,v,label,color,hl}]
  function bars(el,rows,o){o=o||{};const mx=Math.max(...rows.map(r=>r.v)),mn=Math.min(...rows.map(r=>r.v));
    const lo=o.log?Math.floor(Math.log10(mn)):0,hi=o.log?Math.ceil(Math.log10(mx)):mx;
    const f=v=>o.log?(Math.log10(v)-lo)/(hi-lo):v/hi;
    el.innerHTML=rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><div class="nm" title="'+RD.esc(r.name)+'">'+r.name+'</div><div class="track"><div class="fill" style="width:'+(Math.max(.01,f(r.v))*100).toFixed(1)+'%;background:'+(r.color||'var(--acc)')+'"></div></div><div class="val">'+r.label+'</div></div>').join('')}
  return {D,fmtB,fmtN,gb,line,bars};
})();
