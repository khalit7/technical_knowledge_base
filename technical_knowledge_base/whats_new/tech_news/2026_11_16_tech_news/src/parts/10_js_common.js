// ---- Shared helpers ----
const $=id=>document.getElementById(id);
window.TAB_RENDER=window.TAB_RENDER||{};
const onTab=(id,f)=>{(TAB_RENDER[id]=TAB_RENDER[id]||[]).push(f)};
const fmt=(v,d)=>v.toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const GiB=2**30, MiB=2**20, KiB=1024;
function fmtBytes(b){if(b>=GiB)return (b/GiB).toFixed(b/GiB>=100?0:(b/GiB>=10?1:2))+' GiB';if(b>=MiB)return (b/MiB).toFixed(b/MiB>=100?0:1)+' MiB';if(b>=KiB)return (b/KiB).toFixed(1)+' KiB';return fmt(b,b%1?1:0)+' B'}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function segBind(id,cb){const el=$(id);el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.m)}))}
const svgEl=(w,h,inner,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="100%" role="img" aria-label="'+(label||'')+'"><defs><marker id="ah'+w+h+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+inner.replace(/MARK/g,'url(#ah'+w+h+')')+'</svg>';
const bx=(x,y,w,h,cls,lines,fs)=>{let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+cls+'"/>';const n=lines.length,lh=(fs||12)+3;lines.forEach((t,i)=>{s+='<text x="'+(x+w/2)+'" y="'+(y+h/2+(i-(n-1)/2)*lh+4)+'" text-anchor="middle" font-size="'+(fs||12)+'"'+(i>0?' fill="var(--mute)"':'')+'>'+t+'</text>'});return s};
const ar=(x1,y1,x2,y2,dash)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="MARK"'+(dash?' stroke-dasharray="4 3"':'')+'/>';
const sup=n=>String(n).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
const sci=(v,d)=>{if(!v)return '0';const e=Math.floor(Math.log10(Math.abs(v))+1e-9);return (v/10**e).toFixed(d==null?2:d)+' × 10'+sup(e)};
const usd=(v,d)=>'$'+fmt(v,d==null?(v<0.1?3:v<100?2:0):d);
const flp=v=>v>=1e12?(v/1e12).toFixed(2)+' TFLOP':(v/1e9).toFixed(v<1e10?2:v<1e11?1:0)+' GFLOP';
const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
// log-log (or log-y) frame: returns the SVG so far and the two scale functions
function logFrame(o){const {W,H,pl,pr,pt,pb}=o,lg=Math.log10;
  const lx=o.xlin?(v=>pl+(W-pl-pr)*(v-o.x[0])/(o.x[1]-o.x[0])):(v=>pl+(W-pl-pr)*(lg(v)-lg(o.x[0]))/(lg(o.x[1])-lg(o.x[0])));
  const ly=v=>pt+(H-pt-pb)*(1-(lg(v)-lg(o.y[0]))/(lg(o.y[1])-lg(o.y[0])));
  let s='';o.yt.forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
  o.xt.forEach(([v,l])=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+(H-pb)+'" y2="'+(H-pb+4)+'" stroke="var(--mute)"/><text x="'+lx(v)+'" y="'+(H-pb+16)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
  if(o.xl)s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+o.xl+'</text>';
  if(o.yl)s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">'+o.yl+'</text>';
  return {s,lx,ly}}
// end labels for lines, pushed apart so they do not overlap
function endLabels(ends,x,gap){ends.sort((a,b)=>a.y-b.y);let last=-99,s='';ends.forEach(e=>{e.ly=Math.max(e.y,last+(gap||14));last=e.ly});ends.forEach(e=>{s+='<text x="'+x+'" y="'+(e.ly+4)+'" font-size="11" fill="'+e.c+'" style="cursor:help"><title>'+e.how+'</title>'+e.n+'</text>'});return s}
