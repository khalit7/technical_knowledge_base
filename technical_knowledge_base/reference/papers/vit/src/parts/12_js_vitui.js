// ---- ViT page helpers: images as SVG, attention heat grids, probability bars, simple line charts ----
const KIND=['ring','square','triangle','plus','x'];
const SEED_PAGE=2**30;
const _iu=new WeakMap();
// a 28x28 Float32Array as a data-URL PNG (white strokes on black, as the model sees it)
function imgURL(img){if(_iu.has(img))return _iu.get(img);const c=document.createElement('canvas');c.width=28;c.height=28;const x=c.getContext('2d'),d=x.createImageData(28,28);
  for(let i=0;i<784;i++){const v=Math.round(255*Math.max(0,Math.min(1,img[i])));d.data[4*i]=v;d.data[4*i+1]=v;d.data[4*i+2]=v;d.data[4*i+3]=255}x.putImageData(d,0,0);const u=c.toDataURL();_iu.set(img,u);return u}
const svgImg=(img,x,y,s)=>'<image href="'+imgURL(img)+'" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+s.toFixed(1)+'" height="'+s.toFixed(1)+'" style="image-rendering:pixelated" preserveAspectRatio="none"/>';
// heat over a 7x7 patch grid: vals (49), drawn at (x,y) with side s; colour c
function heat(vals,x,y,s,c,o){o=o||{};const g=7,cs=s/g;let mx=o.max||0,mn=0;if(!mx)for(const v of vals)mx=Math.max(mx,v);if(o.rel){mn=Math.min(...vals)}let h='';
  for(let i=0;i<49;i++){const v=mx>mn?(vals[i]-mn)/(mx-mn):0;if(v>.02)h+=rc(x+(i%g)*cs,y+Math.floor(i/g)*cs,cs,cs,c,{r:0,op:(o.op||.8)*Math.pow(v,o.gam||.8)})}
  return h}
function gridLines(x,y,s,n,c,op){let h='';for(let i=1;i<n;i++){const t=i*s/n;h+=ln2(x+t,y,x+t,y+s,c,{sw:.6,op})+ln2(x,y+t,x+s,y+t,c,{sw:.6,op})}return h}
// probability bars for the five kinds; truth index highlighted
function probBars(p,truth,w){const bh=20,gap=6,lw=78,H=5*(bh+gap)+4;let s='';const pw=w-lw-60;
  p.forEach((v,i)=>{const y=i*(bh+gap)+2,best=p.indexOf(Math.max(...p))===i;
    s+=tx(lw-6,y+bh/2+4,KIND[i]+(i===truth?' ✓':''),{a:'end',fs:12,w:i===truth?600:400});
    s+=rc(lw,y,pw,bh,'var(--soft)',{s:'var(--line)'})+rc(lw,y,Math.max(1,pw*v),bh,best?'var(--c1)':'var(--dim)');
    s+=tx(lw+pw+6,y+bh/2+4,(100*v).toFixed(1)+'%',{fs:12})});
  return svgW(w,H,s,'class probabilities')}
// a plain line chart. series: [{name,c,da,pts:[[x,y],...]}]; opts {xlog,xlab,ylab,ymin,ymax,xt:[...],fmtx,fmty,h,zero}
function lineChart(series,w,o){const H=o.h||240,L=46,R=o.R||30,T=12,B=40;const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
  const fx=o.xlog?Math.log10:(v=>v);let x0=fx(Math.min(...xs)),x1=fx(Math.max(...xs));if(x1===x0)x1=x0+1;
  let y0=o.ymin!=null?o.ymin:Math.min(...ys),y1=o.ymax!=null?o.ymax:Math.max(...ys);if(y1===y0)y1=y0+1;const pad=(y1-y0)*.06;if(o.ymin==null)y0-=pad;if(o.ymax==null)y1+=pad;
  const X=v=>L+(fx(v)-x0)/(x1-x0)*(w-L-R),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-B);let s='';
  const yt=o.yt||(()=>{const n=5,st=(y1-y0)/n,mag=10**Math.floor(Math.log10(st)),k=[1,2,2.5,5,10].find(k=>k*mag>=st)*mag,a=[];for(let v=Math.ceil(y0/k)*k;v<=y1+1e-9;v+=k)a.push(+v.toFixed(6));return a})();
  yt.forEach(v=>{s+=ln2(L,Y(v),w-R,Y(v),'var(--line)',{sw:1})+tx(L-5,Y(v)+4,(o.fmty||(v=>v))(v),{a:'end',fs:11,c:'var(--mute)'})});
  if(o.zero&&y0<0&&y1>0)s+=ln2(L,Y(0),w-R,Y(0),'var(--mute)',{sw:1.2});
  (o.xt||[...new Set(xs)]).forEach(v=>{const xv=X(v),an=xv>w-R-34?'end':xv<L+34?'start':'middle';s+=tx(an==='end'?Math.min(xv+6,w-2):an==='start'?Math.max(xv-6,2):xv,H-B+15,(o.fmtx||(v=>v))(v),{a:an,fs:11,c:'var(--mute)'})});
  if(o.xlab)s+=tx((L+w-R)/2,H-6,o.xlab,{a:'middle',fs:11,c:'var(--mute)'});
  if(o.ylab)s+='<text x="12" y="'+((T+H-B)/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+((T+H-B)/2)+')">'+o.ylab+'</text>';
  series.forEach(se=>{const d=se.pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join('');
    s+='<path d="'+d+'" fill="none" stroke="'+se.c+'" stroke-width="2"'+(se.da?' stroke-dasharray="'+se.da+'"':'')+'/>';
    se.pts.forEach(p=>{s+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="3.2" fill="'+se.c+'"><title>'+se.name+': '+p[1]+'</title></circle>'})});
  const lg=legend(series.map(se=>[se.name,se.c,se.da]),L,12,w-L-R);
  return {svg:svgW(w,H+lg.h,lg.s+'<g transform="translate(0,'+lg.h+')">'+s+'</g>',o.label||'chart'),X,Y}}
const runOf=(a,n)=>(window.RUNS&&RUNS.runs||[]).find(r=>r.arch===a&&r.n===n);
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
// a sample image the shipped model gets right with confidence, for the demos
function demoSample(){if(window.__demo)return __demo;const m=VIT.load('vit');for(let k=0;k<60;k++){const s=TOYGEN.sample(SEED_PAGE+k),r=VIT.forward(m,s.img);
    if(r.probs.indexOf(Math.max(...r.probs))===s.label&&r.probs[s.label]>.9){return window.__demo={seed:SEED_PAGE+k,s,r}}}
  const s=TOYGEN.sample(SEED_PAGE);return window.__demo={seed:SEED_PAGE,s,r:VIT.forward(m,s.img)}}
