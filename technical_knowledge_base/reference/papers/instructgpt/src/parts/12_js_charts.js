// ---- Small charts shared by the tabs ----
const TB=window.PAPER.tables,RC=window.PAPER.rc;
const escH=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const f3=v=>(+v).toFixed(3),f1=v=>(+v).toFixed(1);
// wrap a title into lines that fit width W at font size fs (0.56 em per character, bold)
const wrapT=(t,W,fs)=>{const per=Math.max(8,Math.floor(W/((fs||12)*.6))),ws=String(t).split(' '),L=[];let c='';ws.forEach(w=>{if((c+' '+w).trim().length>per&&c){L.push(c);c=w}else c=(c+' '+w).trim()});if(c)L.push(c);return L};
const titleSvg=(t,W,fs)=>{const L=wrapT(t,W,fs);return {s:L.map((l,i)=>tx(0,14+i*16,escH(l),{fs:fs||12,w:600})).join(''),h:L.length*16}};
// Horizontal bars measured at width W. items: [{n, v, c, hl, tag}]; o: {dom:[lo,hi], fmt, title, zero, unit}
function hbars(W,items,o){o=o||{};const narrow=W<560,lw=narrow?0:Math.min(250,Math.round(W*.34)),pr=58,x0=lw+6,x1=W-pr;
  const vs=items.map(i=>i.v),lo=o.dom?o.dom[0]:Math.min(0,...vs),hi=o.dom?o.dom[1]:Math.max(0,...vs);
  const X=v=>x0+(x1-x0)*(v-lo)/((hi-lo)||1);const TT=o.title?titleSvg(o.title,W,12):null;const rh=narrow?34:22,top=TT?TT.h+6:6;let s='';const H=top+items.length*rh+24;
  if(TT)s+=TT.s;
  const span=hi-lo,st=[0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500].find(t=>span/t<=(narrow?4:7))||1000;
  for(let t=Math.ceil(lo/st-1e-9)*st;t<=hi+1e-9;t+=st){const xx=X(t);s+=ln2(xx,top-2,xx,top+items.length*rh,'var(--line)')+tx(xx,top+items.length*rh+14,+t.toFixed(3),{fs:11,a:'middle',c:'var(--mute)'})}
  if(lo<0&&hi>0){const xz=X(0);s+=ln2(xz,top-4,xz,top+items.length*rh+2,'var(--mute)')}
  items.forEach((it,i)=>{const y=top+i*rh,by=narrow?y+17:y+4,bh=narrow?12:13,lab=escH(it.n);
    if(narrow)s+=tx(0,y+12,lab,{fs:12,w:it.hl?600:null});else s+=tx(lw,y+15,lab,{fs:12,a:'end',w:it.hl?600:null});
    const a=X(Math.max(lo,Math.min(hi,0))),b=X(it.v),xa=Math.min(a,b),xb=Math.max(a,b);
    s+=rc(xa,by,Math.max(1,xb-xa),bh,it.c||(it.hl?'var(--acc)':'var(--dim)'),{r:2});
    const lbl=(o.fmt||f3)(it.v)+(it.tag?' '+it.tag:'');s+=it.v<0&&lo<0&&hi>0?tx(xa-4,by+bh-2,lbl,{fs:11,a:'end'}):tx(xb+4,by+bh-2,lbl,{fs:11})});
  return svgW(W,H,s,o.title||'bar chart')}
// x-y chart frame with linear or log axes. o: {W,H,x:[a,b],y:[a,b],xlog,ylog,xt,yt,xl,yl,pl,pr,pt,pb}
function frame(o){const pl=o.pl||52,pr=o.pr||14,pt=o.pt||12,pb=o.pb||36,W=o.W,H=o.H,lg=Math.log10;
  const sx=o.xlog?(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0]))):(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0]));
  const sy=o.ylog?(v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0])))):(v=>pt+(H-pt-pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0])));
  let s='';(o.yt||[]).forEach(([v,l])=>{s+=ln2(pl,sy(v),W-pr,sy(v),'var(--line)')+tx(pl-5,sy(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
  (o.xt||[]).forEach(([v,l])=>{s+=ln2(sx(v),H-pb,sx(v),H-pb+4,'var(--mute)')+tx(sx(v),H-pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(pl,H-pb,W-pr,H-pb,'var(--mute)');
  if(o.xl)s+=tx((pl+W-pr)/2,H-3,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  if(o.yl)s+='<text x="11" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  return {s,sx,sy}}
const dot=(x,y,r,c,o)=>'<circle cx="'+(+x).toFixed(1)+'" cy="'+(+y).toFixed(1)+'" r="'+r+'" fill="'+c+'"'+(o&&o.s?' stroke="'+o.s+'" stroke-width="1.5"':'')+'/>';
const path=(pts,c,o)=>{o=o||{};return '<path d="'+pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="'+(o.sw||1.8)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const T=(t,i)=>TB[t].rows[i];
