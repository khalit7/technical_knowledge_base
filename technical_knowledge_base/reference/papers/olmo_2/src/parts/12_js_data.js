// ---- Shared data helpers: the paper's tables, recompute.py's results, the curves read from the figures ----
const PAP=window.PAPER,RC=PAP.rc,TB=PAP.tables,CV=window.CURVES;
const num=s=>{const v=parseFloat(String(s).replace(/,/g,''));return isNaN(v)?null:v};
const setH=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
const tex=s=>String(s).replace(/(\d+(?:\.\d+)?)\\cdot 10\^\{(-?\d+)\}/g,(m,a,e)=>a+' × 10<sup>'+e.replace('-','−')+'</sup>').replace(/\\beta/g,'β').replace(/\\gamma/g,'γ').replace(/\\lambda/g,'λ').replace(/\\varepsilon/g,'ε').replace(/\\omega/g,'ω').replace(/N_\{\\text\{mb\}\}/,'N<sub>mb</sub>').replace(/c_\{1\}/,'c<sub>1</sub>').replace(/\(d_\{model\}\)/,'(<i>d</i>)').replace(/[()]\s*\)/g,')').replace(/\(\s+/g,'(').replace(/\s+\)/g,')');
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// decode one envelope string: two base64 characters per bin, 12-bit, linear or log between lo and hi; 4095 = empty bin
function dec(s,lo,hi,log){const o=[];for(let i=0;i<s.length;i+=2){const q=B64.indexOf(s[i])*64+B64.indexOf(s[i+1]);
  if(q===4095){o.push(null);continue}const t=q/4094;o.push(log?Math.pow(10,Math.log10(lo)+t*(Math.log10(hi)-Math.log10(lo))):lo+t*(hi-lo))}return o}
const RUNC=['var(--c2)','var(--c1)']; // OLMo-0424's setting, OLMo 2's setting
const pct=(v,d)=>(v==null?'n/a':v.toFixed(d==null?2:d)+'%');
const sgn=(v,d)=>(v>0?'+':v<0?'−':'±')+Math.abs(v).toFixed(d==null?1:d);
// count spikes at threshold k (and up to step x) from a run's z list
function spikes(R,k,xmax){let n=0;for(const z of R.z){if(xmax!=null&&z[0]>xmax)break;if(z[1]>=k)n++}return n}
// a generic sortable HTML table: head [labels], rows [[cells]], numeric columns sort descending
function htab(head,rows,o){o=o||{};let s='<div class="tw"><table'+(o.cls?' class="'+o.cls+'"':'')+'><thead><tr>'+head.map((h,i)=>'<th'+(i&&!o.left?' class="num"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody>';
  rows.forEach(r=>{if(r.grp){s+='<tr><td colspan="'+head.length+'" class="small mute"><b>'+r.grp+'</b></td></tr>';return}
    s+='<tr'+(r.cls?' class="'+r.cls+'"':'')+'>'+r.c.map((c,i)=>'<td'+(i&&!o.left?' class="num'+(r.tc&&r.tc[i]?' '+r.tc[i]:'')+'"':'')+'>'+c+'</td>').join('')+'</tr>'});
  return s+'</tbody></table></div>'}
const flag=(t,c,title)=>' <span class="flag '+(c||'b')+'"'+(title?' title="'+title.replace(/"/g,'&quot;')+'"':'')+'>'+t+'</span>';
// stacked share bar (HTML, wraps on phones): parts=[[name,share,colour]]
function stackBar(title,parts,note){let s='<div class="stk"><div class="stkt">'+title+'</div><div class="stkb">';
  parts.forEach(p=>{s+='<span style="width:'+p[1]+'%;background:'+p[2]+'" title="'+p[0]+': '+p[1].toFixed(p[1]<1?2:1)+'%"></span>'});
  s+='</div><div class="stkl">';parts.forEach(p=>{s+='<span><i style="background:'+p[2]+'"></i>'+p[0]+' <b>'+(p[1]<1?p[1].toFixed(2):p[1]<10?p[1].toFixed(1):Math.round(p[1]))+'%</b></span>'});
  return s+'</div>'+(note?'<div class="small mute">'+note+'</div>':'')+'</div>'}
// a panel's scales: x linear in steps from 0 to x1, y linear or log between lo and hi
function scales(P,x,y,w,h){const lx=v=>x+w*(v-P.x0)/(P.x1-P.x0);
  const ly=P.log?(v=>y+h*(1-(Math.log10(Math.max(v,P.lo))-Math.log10(P.lo))/(Math.log10(P.hi)-Math.log10(P.lo)))):(v=>y+h*(1-(Math.min(Math.max(v,P.lo),P.hi)-P.lo)/(P.hi-P.lo)));
  return {lx,ly}}
// envelope of one run (min..max per bin) up to bin index upto, as an SVG polygon, plus optional band and spike dots
function envSvg(P,R,x,y,w,h,o){o=o||{};const {lx,ly}=scales(P,x,y,w,h),nb=P.nb,bw=(P.x1-P.x0)/nb;
  if(!R._mn){R._mn=dec(R.mn,P.lo,P.hi,P.log);R._mx=dec(R.mx,P.lo,P.hi,P.log);if(R.mu){R._mu=dec(R.mu,P.lo,P.hi,P.log);R._up=dec(R.up,P.lo,P.hi,P.log)}}
  const upto=o.upto==null?nb:o.upto,col=o.col||RUNC[R.c];let top=[],bot=[];
  for(let i=0;i<upto;i++){if(R._mx[i]==null)continue;const xa=lx(P.x0+i*bw),xb=lx(P.x0+(i+1)*bw);top.push(xa.toFixed(1)+','+ly(R._mx[i]).toFixed(1),xb.toFixed(1)+','+ly(R._mx[i]).toFixed(1));bot.unshift(xb.toFixed(1)+','+ly(R._mn[i]).toFixed(1),xa.toFixed(1)+','+ly(R._mn[i]).toFixed(1))}
  let s=top.length?'<polygon points="'+top.concat(bot).join(' ')+'" fill="'+col+'" fill-opacity="'+(o.op||0.55)+'" stroke="'+col+'" stroke-width="0.6"/>':'';
  if(o.band&&R._mu){const kb=o.k||7;let a='',b='';for(let i=0;i<upto;i++){if(R._mu[i]==null)continue;const xc=lx(P.x0+(i+.5)*bw);a+=(a?' L':'M')+xc.toFixed(1)+','+ly(R._mu[i]).toFixed(1);if(R._up[i]!=null)b+=(b?' L':'M')+xc.toFixed(1)+','+ly(R._mu[i]+(kb/7)*(R._up[i]-R._mu[i])).toFixed(1)}
    s+='<path d="'+a+'" fill="none" stroke="var(--ink)" stroke-width="1" opacity=".7"/><path d="'+b+'" fill="none" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3" opacity=".6"/>'}
  if(o.k&&R.z){const xm=o.upto==null?Infinity:P.x0+upto*bw;R.z.forEach(z=>{if(z[1]>=o.k&&z[0]<=xm){const xx=lx(z[0]);s+='<path d="M'+xx.toFixed(1)+','+(y-2)+' l-3.5,-7 h7z" fill="var(--ink)"/>'}})}
  return s}
// axes for a panel: y ticks (log decades or linear) and x ticks in steps (k)
function axesSvg(P,x,y,w,h,o){o=o||{};const {lx,ly}=scales(P,x,y,w,h);let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="var(--line)"/>';
  let yt=[];if(P.log){for(let e=Math.ceil(Math.log10(P.lo)-1e-9);e<=Math.floor(Math.log10(P.hi)+1e-9);e++)yt.push(10**e);[2,5].forEach(m=>{for(let e=-3;e<=2;e++){const v=m*10**e;if(v>P.lo&&v<P.hi&&yt.length<4)yt.push(v)}})}
  else{const st=(P.hi-P.lo)/(o.ny||4);for(let i=0;i<=(o.ny||4);i++)yt.push(P.lo+i*st)}
  yt.forEach(v=>{const yy=ly(v);s+=ln2(x,yy,x+w,yy,'var(--line)',{sw:.6})+tx(x-4,yy+4,v>=1000?fmt(v):(+v.toPrecision(3)).toString(),{fs:11,a:'end',c:'var(--mute)'})});
  if(!o.noX){const nt=Math.max(2,Math.min(6,Math.floor(w/70)));const step=niceStep((P.x1-P.x0)/nt);for(let v=Math.ceil(P.x0/step)*step;v<=P.x1;v+=step){const xx=lx(v);if(xx>x+w+1)break;s+=ln2(xx,y+h,xx,y+h+3,'var(--mute)')+tx(xx,y+h+15,v>=1000?(v/1000)+'k':v,{fs:11,a:'middle',c:'var(--mute)'})}}
  return s}
function niceStep(r){const p=10**Math.floor(Math.log10(r)),m=r/p;return (m<1.5?1:m<3?2:m<7?5:10)*p}
