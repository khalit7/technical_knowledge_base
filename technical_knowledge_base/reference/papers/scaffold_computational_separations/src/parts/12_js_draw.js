// ---- Drawing helpers shared by the Reading tab, the lab and the tables tab ----
// layout: 'random' graphs on a circle; 'local' graphs on a snake (left to right, then right to left), so s = 0
// starts top left and t = N-1 ends the line.
function gLayout(g,w){const N=g.N,pos=[],U=Math.min(w,620),x0=(w-U)/2;
  if(g.fam==='local'){const per=Math.max(3,Math.min(5,Math.floor((U-40)/64))),rows=Math.ceil(N/per),dx=(U-50)/Math.max(1,per-1),H=rows*92+20;
    for(let i=0;i<N;i++){const r=Math.floor(i/per),c=i%per,cc=r%2?per-1-c:c;pos.push([x0+25+cc*dx,46+r*92])}return {pos,H}}
  const H=Math.min(U,380),R=Math.min(U,H)/2-28,cx=w/2,cy=H/2;for(let i=0;i<N;i++){const a=-Math.PI/2+2*Math.PI*i/N;pos.push([cx+R*Math.cos(a),cy+R*Math.sin(a)])}return {pos,H}}
// st: {round (rounds of BFS shown, 0 = none), bfs (GR.bfs result), seen (reader's set or null), k}
function drawGraph(w,g,st,id){const {pos,H}=gLayout(g,w),N=g.N,rd=st.bfs.rounds,shown=rd.slice(0,st.round);
  const vis=new Uint8Array(N);vis[g.s]=1;const roundOf=new Array(N).fill(-1);roundOf[g.s]=0;shown.forEach((r,i)=>r.found.forEach(v=>{vis[v]=1;roundOf[v]=i+1}));
  const front=st.round===0?[g.s]:(st.round<=rd.length?rd[st.round-1].found:[]);const qNow=st.round>0&&st.round<=rd.length?rd[st.round-1]:null;
  let s='<defs><marker id="'+id+'ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker>'+
    '<marker id="'+id+'ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--c1)"/></marker></defs>';
  const rN=11;
  for(let u=0;u<N;u++)for(let v=0;v<N;v++)if(g.A[u][v]){const [x1,y1]=pos[u],[x2,y2]=pos[v],dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1;
    const used=qNow&&qNow.frontier.indexOf(u)>=0&&qNow.found.indexOf(v)>=0;
    const hop=Math.abs(v-u),bend=(u<v?1:-1)*(g.fam==='local'?(hop===1?4:Math.min(42,8+hop*11)):Math.min(26,L*0.18)),mx=(x1+x2)/2-dy/L*bend,my=(y1+y2)/2+dx/L*bend;
    const sx=x1+(mx-x1)/Math.hypot(mx-x1,my-y1)*rN,sy=y1+(my-y1)/Math.hypot(mx-x1,my-y1)*rN,ex=x2+(mx-x2)/Math.hypot(mx-x2,my-y2)*(rN+2),ey=y2+(my-y2)/Math.hypot(mx-x2,my-y2)*(rN+2);
    s+='<path d="M'+sx.toFixed(1)+' '+sy.toFixed(1)+'Q'+mx.toFixed(1)+' '+my.toFixed(1)+' '+ex.toFixed(1)+' '+ey.toFixed(1)+'" fill="none" stroke="'+(used?'var(--c1)':'var(--dim)')+'" stroke-width="'+(used?2.2:1.2)+'" marker-end="url(#'+id+(used?'ah':'ar')+')"/>'}
  for(let i=0;i<N;i++){const [x,y]=pos[i];
    if(st.seen&&st.seen[i])s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(rN+5)+'" fill="none" stroke="var(--c2)" stroke-width="2" stroke-dasharray="3 2"/>';
    const f=vis[i]?'var(--acc2)':'var(--bg)',isF=front.indexOf(i)>=0&&st.round<=rd.length;
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+rN+'" fill="'+f+'" stroke="'+(isF?'var(--c1)':'var(--mute)')+'" stroke-width="'+(isF?2.6:1.1)+'"/>';
    s+=tx(x,y+4,i===g.s?'s':i===g.t?'t':String(i),{fs:11,a:'middle',w:(i===g.s||i===g.t)?'700':null});
    if(vis[i]&&roundOf[i]>0)s+=tx(x+rN-1,y-rN+1,String(roundOf[i]),{fs:11,c:'var(--c1)',w:'700'})}
  return svgW(w,H,s,'directed graph with the harness state')}
// grouped horizontal bars: cats [names], series [{n, c, v:[...] (null = not reported)}], o {max, fmt, refs:[{v,c,n}], lw}
function groupH(w,cats,series,o){o=o||{};const lw=Math.min(o.lw||150,Math.max(84,w*0.34)),vw=40,bw=Math.max(60,w-lw-vw-6),rh=o.rh||14,gap=8,max=o.max||1,fmt=o.fmt||(v=>v.toFixed(2));
  const X=v=>lw+bw*Math.max(0,v-(o.min||0))/(max-(o.min||0));let s='',y=4;
  (o.ticks||[]).forEach(t=>{s+=ln2(X(t),0,X(t),9999,'var(--line)',{sw:1})});
  cats.forEach((c,ci)=>{const gh=Math.max(series.length*rh,28),col=o.hl===ci?'var(--ink)':'var(--mute)',wt=o.hl===ci?'700':null,maxc=Math.floor((lw-8)/6.3);
    if(c.length<=maxc)s+=tx(lw-6,y+gh/2+4,c,{fs:11,a:'end',c:col,w:wt});
    else{const ws=c.split(' ');let a='';while(ws.length&&(a+' '+ws[0]).trim().length<=maxc)a=(a+' '+ws.shift()).trim();if(!a)a=ws.shift();const b=ws.join(' ');
      s+=tx(lw-6,y+gh/2-2,a,{fs:11,a:'end',c:col,w:wt})+tx(lw-6,y+gh/2+11,b.length>maxc?b.slice(0,maxc-1)+'…':b,{fs:11,a:'end',c:col,w:wt})}
    series.forEach((se,si)=>{const v=se.v[ci],yy=y+(gh-series.length*rh)/2+si*rh;if(v===undefined)return;if(v==null){s+=tx(lw+4,yy+rh-3,'n/a (not reported)',{fs:11,c:'var(--mute)'});return}
      s+=rc(lw,yy+1.5,X(v)-lw,rh-3,se.c,{r:2});s+=tx(X(v)+4,yy+rh-3,fmt(v),{fs:11,c:'var(--ink)'})});y+=gh+gap});
  let H=y+2;(o.refs||[]).forEach(r=>{s+=ln2(X(r.v),2,X(r.v),H-2,r.c,{sw:1.6,da:'4 3'})});
  // tick labels at the bottom
  if(o.ticks){s+=ln2(lw,H,lw+bw,H,'var(--mute)',{sw:1});o.ticks.forEach(t=>{s+=tx(X(t),H+13,(o.tfmt||fmt)(t),{fs:11,a:'middle',c:'var(--mute)'})});H+=18}
  s=s.replace(/y2="9999.0"/g,'y2="'+(y)+'"');
  const lg=legendW(series.map(se=>[se.n,se.c,'l']).concat((o.refs||[]).filter(r=>r.n).map(r=>[r.n,r.c,'da'])),lw,H+12,w-lw);
  return svgW(w,H+lg.h+6,s+lg.s,o.label||'bar chart')}
