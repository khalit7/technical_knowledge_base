// ---- small SVG plotting helper shared by every chart on the page ----
// PL.frame(o) -> {sx, sy, open(), close(), axes} with o: {w, h, x:[a,b], y:[a,b], xlog, ylog, m:{l,r,t,b}, xt:[ticks], yt:[ticks], xf, yf, xlab, ylab}
window.PL=(function(){
  const f2=(v,d)=>(+v).toFixed(d==null?2:d);
  function frame(o){
    const m=Object.assign({l:46,r:12,t:12,b:36},o.m||{});
    const W=o.w,H=o.h,iw=W-m.l-m.r,ih=H-m.t-m.b;
    const lx=v=>o.xlog?Math.log10(v):v,ly=v=>o.ylog?Math.log10(v):v;
    const x0=lx(o.x[0]),x1=lx(o.x[1]),y0=ly(o.y[0]),y1=ly(o.y[1]);
    const sx=v=>m.l+(lx(v)-x0)/(x1-x0)*iw, sy=v=>m.t+ih-(ly(v)-y0)/(y1-y0)*ih;
    let a='';
    (o.yt||[]).forEach(t=>{const y=sy(t);a+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+
      '<text x="'+(m.l-5)+'" y="'+(y+3.5)+'" text-anchor="end" fill="var(--mute)">'+(o.yf?o.yf(t):t)+'</text>'});
    (o.xt||[]).forEach(t=>{const x=sx(t);a+='<line x1="'+x+'" x2="'+x+'" y1="'+(m.t+ih)+'" y2="'+(m.t+ih+4)+'" stroke="var(--mute)"/>'+
      '<text x="'+x+'" y="'+(m.t+ih+16)+'" text-anchor="middle" fill="var(--mute)">'+(o.xf?o.xf(t):t)+'</text>'});
    a+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+(m.t+ih)+'" y2="'+(m.t+ih)+'" stroke="var(--mute)"/>';
    if(o.xlab)a+='<text x="'+(m.l+iw/2)+'" y="'+(H-4)+'" text-anchor="middle" fill="var(--mute)">'+o.xlab+'</text>';
    if(o.ylab)a+='<text transform="translate(11,'+(m.t+ih/2)+') rotate(-90)" text-anchor="middle" fill="var(--mute)">'+o.ylab+'</text>';
    return {sx,sy,m,iw,ih,W,H,axes:a,
      open:(id)=>'<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"'+(id?' id="'+id+'"':'')+' role="img">',
      close:()=>'</svg>'};
  }
  const path=(pts,sx,sy)=>pts.map((p,i)=>(i?'L':'M')+sx(p[0]).toFixed(1)+','+sy(p[1]).toFixed(1)).join('');
  const band=(lo,hi,sx,sy)=>path(lo,sx,sy)+hi.slice().reverse().map(p=>'L'+sx(p[0]).toFixed(1)+','+sy(p[1]).toFixed(1)).join('')+'Z';
  return {frame,path,band,f2};
})();
