// ---- A small line-chart helper shared by the testbed tab and the regret chart ----
// series: [{ys (array), xs (optional array), col, lab, w, dash}]; o: {x0,x1,y0,y1,logx,xt (ticks [[v,label]]),yt,ylab,xlab,hl:[{y,lab}],H,label}
RD.chart=function(el,series,o){
  const W=RD.width(el),H=o.H||220,l=40,r=10,t=14,b=30;
  const X=v=>{if(o.logx){const a=Math.log(o.x0),c=Math.log(o.x1);return l+(W-l-r)*(Math.log(v)-a)/(c-a)}return l+(W-l-r)*(v-o.x0)/(o.x1-o.x0)};
  const Y=v=>t+(H-t-b)*(o.y1-Math.max(o.y0,Math.min(o.y1,v)))/(o.y1-o.y0);
  let s='';
  (o.yt||[]).forEach(([v,lb])=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,lb,{a:'end',fs:10,fill:'var(--mute)'})});
  (o.xt||[]).forEach(([v,lb],i,arr)=>{s+=RD.t(Math.min(W-r,Math.max(l,X(v))),H-b+14,lb,{a:i===0?'start':i===arr.length-1?'end':'middle',fs:10,fill:'var(--mute)'})});
  if(o.xlab)s+=RD.t((l+W-r)/2,H-3,o.xlab,{a:'middle',fs:10.5,fill:'var(--mute)'});
  if(o.ylab)s+=RD.t(l+4,t+8,o.ylab,{fs:10.5,fill:'var(--mute)'});
  (o.hl||[]).forEach(h=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(h.y).toFixed(1)+'" y2="'+Y(h.y).toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="4 3" opacity=".7"/>'+RD.t(l+6,Y(h.y)-4,h.lab,{fs:10,fill:'var(--ink)'})});
  series.forEach(se=>{const n=se.ys.length;if(!n)return;const pts=[];
    for(let i=0;i<n;i++){const x=se.xs?se.xs[i]:i+1,y=se.ys[i];if(y==null||!isFinite(y))continue;pts.push(X(x).toFixed(1)+','+Y(y).toFixed(1))}
    s+='<polyline fill="none" stroke="'+se.col+'" stroke-width="'+(se.w||1.6)+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+' stroke-linejoin="round" points="'+pts.join(' ')+'"/>';
    if(se.dots)se.ys.forEach((y,i)=>{if(y!=null&&isFinite(y))s+='<circle cx="'+X(se.xs[i]).toFixed(1)+'" cy="'+Y(y).toFixed(1)+'" r="2.6" fill="'+se.col+'"/>'})});
  if(o.extra)s+=o.extra(X,Y,W,H);
  el.innerHTML=RD.svg(W,H,s,o.label||'Chart');
};
RD.legend=(el,series)=>{el.innerHTML=series.filter(s=>s.lab).map(s=>'<span><i style="background:'+s.col+'"></i>'+s.lab+'</span>').join('')};
