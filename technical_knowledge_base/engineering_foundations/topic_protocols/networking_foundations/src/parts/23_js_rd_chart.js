// ---- Reading tab: a small SVG chart helper (axes, lines, dots, bands) laid out at the container's measured width ----
window.NFC=(function(){
  const esc=RD.esc;
  const fmt=(v,d)=>{d=d==null?0:d;return Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})};
  function ticks(lo,hi,n){const span=hi-lo||1;const raw=span/(n||5);const p=Math.pow(10,Math.floor(Math.log10(raw)));
    const m=[1,2,2.5,5,10].find(k=>k*p>=raw)*p;const out=[];for(let v=Math.ceil(lo/m)*m;v<=hi+1e-9;v+=m)out.push(+v.toFixed(10));return out}
  // o: {el, h, x:[lo,hi], y:[lo,hi], xl, yl, xd, yd, series:[{pts:[[x,y]], col, w, dash, dots, label}], bands:[{x0,x1,col,label}], hlines:[{y,col,label}], vlines:[{x,col,label}], marks:[{x,y,col,shape,label}]}
  function plot(o){
    const W=Math.max(280,Math.min(880,RD.width(o.el))),H=o.h||220,L=48,R=12,T=14,B=36;
    const X=v=>L+(v-o.x[0])/(o.x[1]-o.x[0])*(W-L-R),Y=v=>T+(1-(v-o.y[0])/(o.y[1]-o.y[0]))*(H-T-B);
    let s='';
    (o.bands||[]).forEach(b=>{s+='<rect x="'+X(b.x0)+'" y="'+T+'" width="'+Math.max(1,X(b.x1)-X(b.x0))+'" height="'+(H-T-B)+'" fill="'+b.col+'" opacity=".14"/>';
      if(b.label)s+=RD.t((X(b.x0)+X(b.x1))/2,T+11,esc(b.label),{a:'middle',fs:10.5,fill:'var(--mute)'})});
    if(!o.noy)ticks(o.y[0],o.y[1],o.yn||4).forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+3.5,fmt(v,o.yd),{a:'end',fs:10.5,fill:'var(--mute)'})});
    ticks(o.x[0],o.x[1],Math.max(3,Math.floor((W-L)/90))).forEach(v=>{const xv=X(v),an=xv>W-R-14?'end':'middle';s+='<line x1="'+xv+'" x2="'+xv+'" y1="'+(H-B)+'" y2="'+(H-B+4)+'" stroke="var(--mute)"/>'+RD.t(an==='end'?W-R:xv,H-B+15,fmt(v,o.xd),{a:an,fs:10.5,fill:'var(--mute)'})});
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--mute)"/>';
    s+=RD.t((L+W-R)/2,H-4,esc(o.xl||''),{a:'middle',fs:11,fill:'var(--mute)'});
    s+='<text x="12" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((T+H-B)/2)+')">'+esc(o.yl||'')+'</text>';
    (o.hlines||[]).forEach(h=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(h.y)+'" y2="'+Y(h.y)+'" stroke="'+h.col+'" stroke-dasharray="5 4"/>';if(h.label)s+=RD.t(W-R-2,Y(h.y)-4,esc(h.label),{a:'end',fs:10.5,fill:h.col})});
    (o.vlines||[]).forEach(h=>{s+='<line x1="'+X(h.x)+'" x2="'+X(h.x)+'" y1="'+T+'" y2="'+(H-B)+'" stroke="'+h.col+'" stroke-dasharray="4 3"/>';if(h.label){const r=X(h.x)>W*0.62;s+=RD.t(X(h.x)+(r?-4:4),T+24,esc(h.label),{fs:10.5,fill:h.col,a:r?'end':'start'})}});
    (o.series||[]).forEach(se=>{
      if(se.pts.length>1&&!se.dotsOnly)s+='<polyline fill="none" stroke="'+se.col+'" stroke-width="'+(se.w||2)+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+' points="'+se.pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      if(se.dots)se.pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="'+(se.r||2.6)+'" fill="'+se.col+'"/>'});
    });
    (o.marks||[]).forEach(m=>{const x=X(m.x),y=Y(m.y);
      s+=m.shape==='x'?'<path d="M'+(x-4)+' '+(y-4)+'L'+(x+4)+' '+(y+4)+'M'+(x-4)+' '+(y+4)+'L'+(x+4)+' '+(y-4)+'" stroke="'+m.col+'" stroke-width="2"/>':'<circle cx="'+x+'" cy="'+y+'" r="4" fill="'+m.col+'"/>';
      if(m.label)s+=RD.t(x+(m.dx||6),y+(m.dy||-6),esc(m.label),{fs:10.5,fill:m.col,a:m.a})});
    const leg=(o.series||[]).filter(se=>se.label).map(se=>'<span><svg width="14" height="8"><line x1="0" x2="14" y1="4" y2="4" stroke="'+se.col+'" stroke-width="2.5"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+'/></svg>'+esc(se.label)+'</span>').join('');
    o.el.innerHTML=RD.svg(W,H,s,o.label||'')+(leg?'<div class="hmleg">'+leg+'</div>':'');
  }
  // horizontal bars: rows [{name, v, col, txt}], max
  function bars(el,rows,max){el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row'+(r.hl?' hl':'')+'"><span class="nm" title="'+esc(r.name)+'">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+Math.max(0.5,100*r.v/max).toFixed(2)+'%;background:'+r.col+'"></span></span><span class="val">'+r.txt+'</span></div>').join('')+'</div>'}
  return {plot,bars,fmt,ticks};
})();
