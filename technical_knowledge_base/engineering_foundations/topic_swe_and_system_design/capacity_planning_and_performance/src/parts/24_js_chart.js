// ---- A small line and scatter chart, laid out by the container's measured width (used by the Reading and the lab) ----
window.CH=(function(){
  const f2=v=>Math.abs(v)>=100?Math.round(v).toLocaleString('en-US'):Math.abs(v)>=10?v.toFixed(0):Math.abs(v)>=1?v.toFixed(1):v.toFixed(2);
  function ticksLin(a,b,n){const span=b-a,step0=span/n,mag=Math.pow(10,Math.floor(Math.log10(step0))),r=step0/mag;
    const step=(r<1.5?1:r<3?2:r<7?5:10)*mag;const t=[];for(let v=Math.ceil(a/step)*step;v<=b+1e-9;v+=step)t.push(+v.toFixed(10));return t}
  function ticksLog(a,b){const t=[];for(let e=Math.floor(Math.log10(a));e<=Math.ceil(Math.log10(b));e++){for(const m of [1,2,5]){const v=m*Math.pow(10,e);if(v>=a*0.999&&v<=b*1.001)t.push(v)}}return t}
  // o: {series:[{pts,color,dash,w,label,dots,r}], xmin,xmax,ymin,ymax,logy,logx,xlab,ylab,xfmt,yfmt,band:[a,b],vline:{x,label},h}
  function draw(el,o){
    const W=Math.max(280,Math.min(880,RD.width(el)));const H=o.h||(W<480?230:260);
    const L=W<480?40:48,R=10,T=12,B=40;const pw=W-L-R,ph=H-T-B;
    const lx=v=>o.logx?Math.log10(v):v,ly=v=>o.logy?Math.log10(v):v;
    const X=v=>L+pw*(lx(v)-lx(o.xmin))/(lx(o.xmax)-lx(o.xmin));
    const Y=v=>{const c=Math.max(o.ymin,Math.min(o.ymax,v));return T+ph*(1-(ly(c)-ly(o.ymin))/(ly(o.ymax)-ly(o.ymin)))};
    let b='';
    if(o.band)b+='<rect x="'+X(o.band[0])+'" y="'+T+'" width="'+(X(o.band[1])-X(o.band[0]))+'" height="'+ph+'" fill="var(--mute)" opacity=".1"/>';
    const yt=o.logy?ticksLog(o.ymin,o.ymax):ticksLin(o.ymin,o.ymax,4);
    const xt=o.xticks||(o.logx?ticksLog(o.xmin,o.xmax):ticksLin(o.xmin,o.xmax,W<480?4:6));
    const xf=o.xfmt||f2,yf=o.yfmt||f2;
    yt.forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+3.5,yf(v),{fs:10,a:'end',fill:'var(--mute)'})});
    xt.forEach(v=>{b+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(T+ph)+'" y2="'+(T+ph+4)+'" stroke="var(--mute)"/>'+RD.t(X(v),T+ph+15,xf(v),{fs:10,a:X(v)>W-R-18?'end':'middle',fill:'var(--mute)'})});
    b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(T+ph)+'" y2="'+(T+ph)+'" stroke="var(--mute)"/>';
    if(o.xlab)b+=RD.t(L+pw/2,H-6,o.xlab,{fs:10.5,a:'middle',fill:'var(--mute)'});
    if(o.ylab)b+=RD.t(L+2,T+10,o.ylab,{fs:10.5,fill:'var(--mute)'});
    if(o.vline){b+='<line x1="'+X(o.vline.x)+'" x2="'+X(o.vline.x)+'" y1="'+T+'" y2="'+(T+ph)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
      if(o.vline.label)b+=RD.t(Math.min(X(o.vline.x)+4,W-R-4),T+22,o.vline.label,{fs:10,a:X(o.vline.x)>W-120?'end':'start'})}
    (o.series||[]).forEach(s=>{
      const pts=s.pts.filter(p=>isFinite(p[1])&&p[1]>0||!o.logy&&isFinite(p[1]));
      if(s.dots){pts.forEach(p=>{if(p[0]<o.xmin||p[0]>o.xmax)return;b+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="'+(s.r||3.2)+'" fill="'+s.color+'"'+(s.op?' opacity="'+s.op+'"':'')+(s.stroke?' stroke="var(--bg)" stroke-width="1"':'')+'/>'})}
      else{let d='';pts.forEach((p,i)=>{if(p[0]<o.xmin||p[0]>o.xmax)return;d+=(d?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)});
        if(d)b+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.w||2)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'/>'}
    });
    el.innerHTML=RD.svg(W,H,b,o.label||'chart');
  }
  const leg=items=>items.map(i=>'<span style="--sw:'+i[0]+'">'+i[1]+'</span>').join('');
  return {draw,leg,f2};
})();
