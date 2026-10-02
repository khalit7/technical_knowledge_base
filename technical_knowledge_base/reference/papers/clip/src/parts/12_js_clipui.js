// ---- CLIP page helpers: toy images as SVG, embedding strips, heat cells, bars, line charts, the derived-number filler ----
const SEED_PAGE=2**30, TG=window.TOYGEN;
const CLASSES=TG.COLOURS.flatMap(c=>TG.SHAPES.map(s=>c+' '+s));      // label = colour*6 + shape, as train.py
const labelOf=a=>a.colour*6+a.shape, nameOf=a=>TG.COLOURS[a.colour]+' '+TG.SHAPES[a.shape];
// the page draws a pair from its seed; pixels are rounded to 8 bits, exactly as the training data was stored
function pair(seed,o){const p=TG.sample(seed,o);for(let i=0;i<p.img.length;i++)p.img[i]=Math.round(p.img[i]*255)/255;p.seed=seed;return p}
const _iu=new WeakMap();
function imgURL(img){if(_iu.has(img))return _iu.get(img);const S=TG.S,c=document.createElement('canvas');c.width=S;c.height=S;const x=c.getContext('2d'),d=x.createImageData(S,S);
  for(let i=0;i<S*S;i++){for(let k=0;k<3;k++)d.data[4*i+k]=Math.round(255*img[3*i+k]);d.data[4*i+3]=255}x.putImageData(d,0,0);const u=c.toDataURL();_iu.set(img,u);return u}
const svgImg=(img,x,y,s,op)=>'<image href="'+imgURL(img)+'" x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" width="'+(+s).toFixed(1)+'" height="'+(+s).toFixed(1)+'" style="image-rendering:pixelated" preserveAspectRatio="none"'+(op!=null?' opacity="'+op+'"':'')+'/>';
const imgTag=(img,px,alt)=>'<img src="'+imgURL(img)+'" width="'+px+'" height="'+px+'" alt="'+(alt||'toy image')+'" style="image-rendering:pixelated;border-radius:4px;border:1px solid var(--line);vertical-align:middle">';
// an embedding vector as a strip of cells: blue for positive, orange for negative, opacity by size
function strip(v,x,y,w,h,o){o=o||{};const n=v.length,cw=w/n;let s='',mx=o.max||Math.max(...v.map(Math.abs))||1;
  for(let i=0;i<n;i++){const a=Math.min(1,Math.abs(v[i])/mx);s+=rc(x+i*cw,y,cw+.3,h,v[i]>=0?'var(--c1)':'var(--c2)',{r:0,op:(.12+.88*a)*(o.op==null?1:o.op)})}
  return s+rc(x,y,w,h,'none',{s:'var(--line)',r:2})}
// colour for a probability or a normalised score in [0,1]
const heatCell=(x,y,w,h,v,o)=>rc(x,y,w,h,'var(--c1)',{r:2,op:(.06+.94*Math.max(0,Math.min(1,v))).toFixed(3),s:o&&o.s,sw:o&&o.sw});
// horizontal bars. items [{n,v,c,t,b}] with v in the chart's units; o {max,min,fmt,lw,h}
function hbars(items,w,o){o=o||{};const bh=o.h||17,gap=5,lw=o.lw||Math.min(140,w*.36),vw=o.vw||54,pw=Math.max(40,w-lw-vw-6);
  const mn=o.min||0,mx=o.max!=null?o.max:Math.max(...items.map(i=>i.v)),X=v=>lw+(v-mn)/(mx-mn)*pw,x0=X(Math.max(mn,0));let s='';
  items.forEach((it,i)=>{const y=i*(bh+gap)+2;s+=tx(lw-6,y+bh/2+4,it.n,{a:'end',fs:11.5,w:it.b?600:400});
    const xa=Math.min(x0,X(it.v)),xb=Math.max(x0,X(it.v));s+='<g>'+rc(xa,y,Math.max(1,xb-xa),bh,it.c||'var(--c1)',{r:2})+'<title>'+(it.t||it.n)+'</title></g>';
    s+=tx(lw+pw+6,y+bh/2+4,(o.fmt||(v=>v))(it.v),{fs:11.5,c:'var(--mute)'})});
  if(mn<0)s+=ln2(x0,0,x0,items.length*(bh+gap),'var(--mute)',{sw:1});
  return svgW(w,items.length*(bh+gap)+4,s,o.label||'bar chart')}
// a plain line chart. series: [{name,c,da,pts:[[x,y],...]}]; opts {xlog,xlab,ylab,ymin,ymax,xt,fmtx,fmty,h}
function lineChart(series,w,o){const H=o.h||240,L=46,R=o.R||14,T=12,B=40;const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
  const fx=o.xlog?Math.log10:(v=>v);let x0=fx(o.xmin||Math.min(...xs)),x1=fx(o.xmax||Math.max(...xs));if(x1===x0)x1=x0+1;
  let y0=o.ymin!=null?o.ymin:Math.min(...ys),y1=o.ymax!=null?o.ymax:Math.max(...ys);if(y1===y0)y1=y0+1;
  const X=v=>L+(fx(v)-x0)/(x1-x0)*(w-L-R),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-B);let s='';
  const yt=o.yt||(()=>{const n=5,st=(y1-y0)/n,mag=10**Math.floor(Math.log10(st)),k=[1,2,2.5,5,10].find(k=>k*mag>=st)*mag,a=[];for(let v=Math.ceil(y0/k)*k;v<=y1+1e-9;v+=k)a.push(+v.toFixed(6));return a})();
  yt.forEach(v=>{s+=ln2(L,Y(v),w-R,Y(v),'var(--line)',{sw:1})+tx(L-5,Y(v)+4,(o.fmty||(v=>v))(v),{a:'end',fs:11,c:'var(--mute)'})});
  (o.xt||[...new Set(xs)]).forEach(v=>{const xv=X(v),an=xv>w-R-30?'end':xv<L+30?'start':'middle';s+=ln2(xv,H-B,xv,H-B+4,'var(--mute)',{sw:1})+tx(an==='end'?Math.min(xv+4,w-2):an==='start'?Math.max(xv-4,2):xv,H-B+15,(o.fmtx||(v=>v))(v),{a:an,fs:11,c:'var(--mute)'})});
  if(o.xlab)s+=tx((L+w-R)/2,H-6,o.xlab,{a:'middle',fs:11,c:'var(--mute)'});
  if(o.ylab)s+='<text x="11" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 11 '+((T+H-B)/2)+')">'+o.ylab+'</text>';
  if(o.extra)s+=o.extra(X,Y);
  series.forEach(se=>{const d=se.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join('');
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="2"'+(se.da?' stroke-dasharray="'+se.da+'"':'')+'/>';
    if(!se.nodots)se.pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3" fill="'+se.c+'"><title>'+se.name+': '+(o.tipf?o.tipf(p):p[1])+'</title></circle>'})});
  const lg=legend(series.map(se=>[se.name,se.c,se.da]),L,12,w-L-R);
  return svgW(w,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>',o.label||'chart')}
// wrap a text into lines no wider than maxw (estimated at 0.56 em per character); returns {s, h}
function wrapTx(x,y,t,maxw,o){o=o||{};const fs=o.fs||11,per=Math.max(8,Math.floor(maxw/(fs*.56))),ws=t.split(' '),L=[];let cur='';
  ws.forEach(w=>{if((cur+' '+w).trim().length>per&&cur){L.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)L.push(cur);
  return {s:L.map((l,i)=>tx(x,y+i*(fs+4),l,o)).join(''),h:L.length*(fs+4)}}
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
const M1=v=>(v/1e6).toFixed(1)+'M';
// fill every [data-rc="path"] from PAPER.rc (recompute.py); data-f: M (millions), n (thousands separators), pct0 (fraction as a percentage)
function fillRC(root){(root||document).querySelectorAll('[data-rc]').forEach(el=>{let v=PAPER.rc;for(const k of el.dataset.rc.split('.')){if(v==null)break;v=k==='length'&&Array.isArray(v)?v.length:v[k]}
  if(v==null){el.textContent='(missing)';return}const f=el.dataset.f;el.textContent=f==='M'?M1(v):f==='n'?fmt(v):f==='pct0'?(100*v).toFixed(1)+'%':String(v)})}
fillRC();
// the toy models' training runs and reports (mk_runs.py)
const RN=window.RUNS||{runs:{}},RUN=n=>RN.runs[n];
const RUNNAME={clip:'Contrastive, Transformer text (CLIP)',bowcon:'Contrastive, bag-of-words text',bowpred:'Predict the bag of words',lm:'Write the caption (captioning Transformer)',sup:'Supervised labels (photos only)',clipphoto:'CLIP trained on photos only'};
const RUNCOL={clip:'var(--c1)',bowcon:'var(--c3)',bowpred:'var(--c2)',lm:'var(--c4)',sup:'var(--c5)',clipphoto:'var(--c6)'};
