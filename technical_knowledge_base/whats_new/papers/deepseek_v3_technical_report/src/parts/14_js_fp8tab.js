// ---- FP8 in the Reading tab: the scaling widget (sx; since 2026-11-12 a widget the reader drives, the steps are on the 3D stage Fig. 2), the accumulation animation (ax, step list sx-ax) and the error-against-K chart (ak) ----
(function(){
const F=window.FP8;if(!F||!$('sx'))return;
// theme colours as rgb triples, for the canvas heatmaps
function rgbOf(v){const d=document.createElement('span');d.style.color='var('+v+')';d.style.display='none';document.body.appendChild(d);const m=getComputedStyle(d).color.match(/[\d.]+/g)||[0,0,0];d.remove();return m.slice(0,3).map(Number)}
let PAL=null;const pal=()=>{const dark=matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;const key=dark?'d':'l';if(!PAL||PAL.key!==key)PAL={key,bg:rgbOf('--bg'),c1:rgbOf('--c1'),ok:rgbOf('--dim'),sub:rgbOf('--subn'),zero:rgbOf('--zero'),ink:rgbOf('--ink')};return PAL};
const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
const cvs=document.createElement('canvas');
function img(T,K,pix){cvs.width=K;cvs.height=T;const c=cvs.getContext('2d'),im=c.createImageData(K,T);for(let t=0;t<T;t++)for(let k=0;k<K;k++){const p=pix(t,k),o=(t*K+k)*4;im.data[o]=p[0];im.data[o+1]=p[1];im.data[o+2]=p[2];im.data[o+3]=255}c.putImageData(im,0,0);return cvs.toDataURL()}

// ===== 1. Scaling =====
const SX={kind:'channels',mag:5,fmt:'e4m3',mode:'tensor',view:2,cache:{}};
const MAGS=['1','10','100','10³','10⁴','10⁵'];
function run(mode){const key=[SX.kind,SX.mag,SX.fmt,mode].join('|');if(!SX.cache[key])SX.cache[key]=F.scalingRun(1,SX.kind,10**SX.mag,SX.fmt,mode);return SX.cache[key]}
const pct=v=>v===0?'0%':v<1e-5?(100*v).toPrecision(2)+'%':(100*v).toFixed(v<0.001?3:v<0.1?2:1)+'%';
// view k: 1 |x| with the groups (and, for one scale per tensor or block, the value that sets each scale circled), 2 the rounding outcome, 3 the relative error
function sxDraw(mode,k,e,w){const r=run(mode),X=r.X,Q=r.Q,T=32,K=512,P=pal();
  const H=Math.max(140,Math.min(230,Math.round(w*0.34))),top=22,pl=4,W=w-8,ch=H-top-20;
  let amax=0;for(const row of X)for(const v of row)amax=Math.max(amax,Math.abs(v));const lo=-2,hi=Math.log10(amax);
  const shade=(t,c)=>{const a=Math.abs(X[t][c]);const u=a>0?cl01((Math.log10(a)-lo)/(hi-lo)):0;return mix(P.bg,P.c1,0.12+0.88*u)};
  // which groups are processed so far (step 2 sweeps across them)
  const ns=Q.scales.length,done=k>=3?ns:k===2?Math.floor(ns*e+1e-9):0;
  const gidx=(t,c)=>{const g=F.GROUP[mode],gr=g[0]||T,gc=g[1]||K;const per=Math.ceil(K/gc);return Math.floor(t/gr)*per+Math.floor(c/gc)};
  const tiny=2**F.FMT[SX.fmt].emin;
  const url=img(T,K,(t,c)=>{if(k<2||(k===2&&gidx(t,c)>=done))return shade(t,c);const q=Q.code[t][c],x=X[t][c];
    if(k===3){const re=x!==0?Math.abs(Q.out[t][c]-x)/Math.abs(x):0;return mix(P.bg,P.zero,cl01(Math.log10(Math.max(re,0.03)/0.03)/Math.log10(1/0.03)))}
    if(q===0&&x!==0)return P.zero;if(Math.abs(q)<tiny)return P.sub;return mix(P.bg,P.ok,0.9)});
  let s='<image href="'+url+'" x="'+pl+'" y="'+top+'" width="'+W+'" height="'+ch+'" preserveAspectRatio="none" style="image-rendering:pixelated"/>';
  s+=tx(pl,14,k===3?'relative error after FP8':k===2?'outcome of rounding':'|activation|, log scale',{fs:11,c:'var(--mute)',w:600});
  s+=tx(w-4,14,'512 channels →',{fs:11,a:'end',c:'var(--mute)'});
  s+=tx(pl,H-6,'32 tokens ↓',{fs:11,c:'var(--mute)'});
  if(k>=1){const op=k===1?e:0.75,g=F.GROUP[mode],gc=g[1]||K,gr=g[0]||T;let ln='';
    for(let c=gc;c<K;c+=gc)ln+=ln2(pl+W*c/K,top,pl+W*c/K,top+ch,'var(--ink)',{sw:1.5});
    if(gr<T&&ch/T>=4)for(let t=gr;t<T;t+=gr)ln+=ln2(pl,top+ch*t/T,pl+W,top+ch*t/T,'var(--ink)',{sw:.4,op:.5});
    ln+=rc(pl,top,W,ch,'none',{s:'var(--ink)',sw:1.5,r:0});
    s+=G(op,ln);
    if(k===1&&mode!=='tile'){Q.scales.forEach(sc=>{let bi=sc.i0,bj=sc.j0,bv=-1;const g2=F.GROUP[mode],r2=g2[0]||T,c2=g2[1]||K;
      for(let i=sc.i0;i<Math.min(T,sc.i0+r2);i++)for(let j=sc.j0;j<Math.min(K,sc.j0+c2);j++){const a=Math.abs(X[i][j]);if(a>bv){bv=a;bi=i;bj=j}}
      const cx=pl+W*(bj+.5)/K,cy=top+ch*(bi+.5)/T;s+=G(e,'<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="6" fill="none" stroke="var(--bad)" stroke-width="2"/>')})}}
  if(k>=2){const lg=[['kept',P.ok],['subnormal',P.sub],['zero',P.zero]];let x=w-4;const items=k===3?[['error 3% or less',mix(P.bg,P.zero,0)],['100%',P.zero]]:lg;
    let leg='';items.slice().reverse().forEach(([n,c])=>{const tw=n.length*6.4+18;x-=tw;leg+=rc(x,H-15,10,10,'rgb('+c.join(',')+')',{r:2,s:'var(--line)'})+tx(x+14,H-6,n,{fs:11,c:'var(--mute)'})});if(w>=380||k===3)s+=leg}
  return svgW(w,H,s,'Activation matrix heatmap')}
function sxCounters(mode,k,e){const r=run(mode),show=k>=3||(k===2&&e>=1);const ns=r.Q.scales.length;
  return stat('Scales stored',k>=1?ns.toLocaleString('en-GB'):'·',ns===1?'per tensor':ns+' groups')+
   stat('Became zero',show?r.zeros.toLocaleString('en-GB'):'·',show?pct(r.zeros/r.n)+' of the values':'')+
   stat('Subnormal',show?r.sub.toLocaleString('en-GB'):'·',show?'fewer mantissa bits':'')+
   stat('Median relative error',show?pct(r.median_rel):'·',show?'90th percentile '+pct(r.p90_rel):'')}
function sxRender(w){const host=$('sxSvg');host.innerHTML=sxDraw(SX.mode,SX.view,1,w);$('sxCnt').innerHTML=sxCounters(SX.mode,3,1)}
fit($('sxSvg'),sxRender);
function sxCtl(){SX.kind=$('sxKind').value;SX.mag=+$('sxMag').value;SX.fmt=$('sxFmt').value;$('sxMagV').textContent=MAGS[SX.mag];refit($('sxSvg'))}
['sxKind','sxFmt'].forEach(id=>$(id).addEventListener('change',sxCtl));$('sxMag').addEventListener('input',sxCtl);
segBind('sxM',m=>{SX.mode=m;refit($('sxSvg'))});segBind('sxV',m=>{SX.view=+m;refit($('sxSvg'))});
['sxM','sxV'].forEach(id=>$(id).querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>$(id).querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false')))));

// ===== 2. Accumulation =====
const AX={R:'A',K:4096,D:'uniform',tr:{}};
function trace(nc){const key=[AX.R,AX.K,AX.D,nc].join('|');if(AX.tr[key])return AX.tr[key];
  const p=F.dotInputs(1,AX.K,AX.D);const ex=[0],ab=[0];let s=0,sa=0;for(const v of p){s+=v;sa+=Math.abs(v);ex.push(s);ab.push(sa)}
  const pts=[{n:0,got:0,ex:0,err:0,acc:0}];
  F.accumulate(p,AX.R,nc,14,(n,acc,hi,lost)=>{const got=hi+acc,e=ex[n];pts.push({n,got,ex:e,acc,err:AX.D==='gauss'?Math.abs(got-e)/ab[n]:(e!==0?Math.abs(got-e)/Math.abs(e):0)})});
  const sorted=p.map(Math.abs).filter(v=>v>0).sort((a,b)=>a-b),med=sorted[Math.floor(sorted.length/2)];
  return AX.tr[key]={pts,p,med,final:pts[pts.length-1]}}
// the steps (their explanation is the step list sx-ax beside the card); n: elements summed by the end of the step
const AXSTEPS=()=>{const K=AX.K;return [{t:'Form the products',n:0},{t:'The first MMA: 32 products',n:32},{t:'The first 128 elements',n:128},{t:'To 1,024',n:Math.min(1024,K)},{t:'To K',n:K},{t:'The result',n:K}]};
const axModes={tc:AXSTEPS(),pr:AXSTEPS()};
function rebuildAx(){['tc','pr'].forEach(m=>{const s=AXSTEPS();axModes[m].length=0;s.forEach(x=>axModes[m].push(x))})}
rebuildAx();
function nAt(mode,k,e){const S=axModes[mode],a=k>0?S[k-1].n:0,b=S[k].n;return Math.round(a+(b-a)*e)}
function ptAt(tr,n){const i=Math.min(tr.pts.length-1,Math.floor(n/32));return tr.pts[i]}
function axDraw(mode,k,e,w){const tr=trace(mode==='pr'?128:0),other=trace(mode==='pr'?0:128),n=nAt(mode,k,e),pt=ptAt(tr,n),K=AX.K;
  const narrow=w<520,H=narrow?300:270;let s='';const gs=AX.D==='gauss';
  // register strip: bit positions from 2^hiB down to 2^loB
  const accE=pt.acc!==0?F.expo(Math.abs(pt.acc)):null,medE=F.expo(tr.med);
  const top=(accE!=null&&AX.R==='A')?Math.max(accE,medE):(accE!=null?accE:medE);
  const hiB=Math.max(top,medE)+1,loB=Math.min(medE-8,top-15),nb=hiB-loB+1;
  const bx0=56,bw=Math.min(16,(w-bx0-8)/nb),y1=22;
  s+=tx(4,y1+11,'window',{fs:11,c:'var(--mute)'});s+=tx(4,y1+33,'product',{fs:11,c:'var(--mute)'});
  for(let b=hiB;b>=loB;b--){const i=hiB-b,x=bx0+i*bw,inWin=b<=top&&b>top-14;
    s+=rc(x+.5,y1,bw-1,14,inWin?'var(--acc2)':'var(--soft)',{r:1,s:'var(--line)'});
    const pb=b<=medE&&b>medE-8;if(pb){const kept=AX.R==='A'?(b>top-14):true;s+=rc(x+.5,y1+22,bw-1,14,kept?'var(--c3)':'var(--bad)',{r:1,op:kept?.85:.9})}}
  const kept=AX.R==='A'?Math.max(0,Math.min(8,medE-(top-14))):8;
  s+=tx(bx0,y1+52,AX.R==='A'?(pt.acc!==0?'a typical product keeps '+kept+' of 8 bits':'the window starts at the products'):(narrow?'B: group sums meet the 14-bit register':'reading B: products keep their bits within a group; the group sum meets the 14-bit register'),{fs:11,c:'var(--mute)'});
  // error chart
  const cy=y1+80,ch=H-cy-26,cl=48,cw=w-cl-12;
  const ymax=Math.max(1e-9,...trace(0).pts.map(p=>p.err),...trace(128).pts.map(p=>p.err))*1.1;
  const X=v=>cl+cw*v/K,Y=v=>cy+ch*(1-v/ymax);
  [0,.5,1].forEach(f=>{s+=ln2(cl,Y(ymax*f/1.1),cl+cw,Y(ymax*f/1.1),'var(--line)')+tx(cl-4,Y(ymax*f/1.1)+4,pct(ymax*f/1.1),{fs:11,a:'end',c:'var(--mute)'})});
  [0,K/2,K].forEach(v=>{s+=tx(X(v),H-10,v.toLocaleString('en-GB'),{fs:11,a:v===0?'start':v===K?'end':'middle',c:'var(--mute)'})});
  s+=tx(cl+cw/2,cy-6,gs?'error ÷ sum of |products| so far':'relative error of the running sum',{fs:11,a:'middle',c:'var(--mute)'});
  const path=(T,upto,c,o)=>{let d='';for(const p of T.pts){if(p.n>upto)break;d+=(d?'L':'M')+X(p.n).toFixed(1)+' '+Y(p.err).toFixed(1)}return d?'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(o||2)+'"'+(o?' opacity=".35"':'')+'/>':''};
  if(k===5)s+=path(other,K,mode==='pr'?'var(--c2)':'var(--c3)',1.5);
  s+=path(tr,n,mode==='pr'?'var(--c3)':'var(--c2)');
  if(mode==='pr'&&n>0)for(let v=128;v<=n;v+=128){if(K/128<=64||v%512===0)s+=ln2(X(v),cy+ch-4,X(v),cy+ch,'var(--c3)',{op:.6})}
  return svgW(w,H,s,'Accumulator bits and error curve')}
function axCounters(mode,k,e){const tr=trace(mode==='pr'?128:0),n=nAt(mode,k,e),pt=ptAt(tr,n);
  return stat('Elements summed',pt.n.toLocaleString('en-GB'),'of '+AX.K.toLocaleString('en-GB'))+stat('Exact sum',pt.ex.toFixed(3),'')+stat(mode==='pr'?'Promoted sum':'14-bit sum',pt.got.toFixed(3),'')+stat(AX.D==='gauss'?'Error ÷ Σ|products|':'Relative error',pct(pt.err),k===5?'other mode: '+pct(trace(mode==='pr'?0:128).final.err):'')}
const axA=makeAnim({id:'ax',modes:axModes,mode:'tc',lists:{tc:'sx-ax',pr:'sx-ax'},draw:axDraw,counters:axCounters,dur:4200});
function axCtl(){AX.R=$('axR').value;AX.K=+$('axK').value;AX.D=$('axD').value;rebuildAx();if(axA)axA.draw()}
['axR','axK','axD'].forEach(id=>$(id).addEventListener('change',axCtl));

// ===== 3. Error against K =====
const AK={D:'uniform',cache:{}};const KS=[256,512,1024,2048,4096,8192];
function akData(){if(AK.cache[AK.D])return AK.cache[AK.D];const o={};['A','B'].forEach(r=>[0,128].forEach(nc=>{o[r+nc]=KS.map(K=>F.accRun(1,K,AK.D,r,nc))}));return AK.cache[AK.D]=o}
function akDraw(w){const d=akData(),H=w<520?270:250;const all=[].concat(...Object.values(d)).filter(v=>v>0);
  const ymin=10**Math.floor(Math.log10(Math.min(...all))),ymax=10**Math.ceil(Math.log10(Math.max(...all,0.02)));
  const yt=[];for(let v=ymin;v<=ymax*1.01;v*=10)yt.push([v,pct(v)]);
  const fr=logFrame({W:w,H,pl:58,pr:w<520?12:92,pt:12,pb:40,x:[256,8192],y:[ymin,ymax],yt,xt:KS.map(K=>[K,K>=1024?(K/1024)+'K':String(K)]),xl:'inner dimension K'});
  let s=fr.s;const L=[['A0','A, 14-bit only','var(--c2)',''],['A128','A, promoted','var(--c2)','4 3'],['B0','B, 14-bit only','var(--c1)',''],['B128','B, promoted','var(--c1)','4 3']];
  const ends=[];L.forEach(([k2,n,c,da])=>{let p='';d[k2].forEach((v,i)=>{p+=(p?'L':'M')+fr.lx(KS[i]).toFixed(1)+' '+fr.ly(Math.max(v,ymin)).toFixed(1)});s+='<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';
    d[k2].forEach((v,i)=>{s+='<circle cx="'+fr.lx(KS[i]).toFixed(1)+'" cy="'+fr.ly(Math.max(v,ymin)).toFixed(1)+'" r="2.6" fill="'+c+'"><title>'+n+', K = '+KS[i]+': '+pct(v)+'</title></circle>'});
    ends.push({y:fr.ly(Math.max(d[k2][5],ymin)),n,c,how:n})});
  if(AK.D==='uniform'){const x=fr.lx(4096),y=fr.ly(0.02);s+='<path d="M'+(x-6)+' '+y+'h12M'+x+' '+(y-6)+'v12" stroke="var(--ink)" stroke-width="2"/>'+tx(x-8,y-8,'paper: "nearly 2%"',{fs:11,a:'end'})}
  if(w>=520)s+=endLabels(ends,w-88,13);else{const lg=legend(L.map(x=>[x[1],x[2],x[3]]),58,H-4-0,w-60);}
  $('akSvg').innerHTML=svgW(w,H+(w<520?36:0),s+(w<520?'<g transform="translate(0,'+(H+4)+')">'+legend(L.map(x=>[x[1],x[2],x[3]]),8,12,w-16).s+'</g>':''),'Accumulation error against K');
  const rcA=window.PAPER&&PAPER.rc&&PAPER.rc.fp8&&PAPER.rc.fp8.acc;let same=0,tot=0;if(rcA)['A','B'].forEach(r=>[0,128].forEach(nc=>KS.forEach((K,i)=>{const v=rcA[AK.D+'|'+r+'|'+nc+'|'+K];if(v!=null){tot++;if(Math.abs(v-d[r+nc][i])<=1e-15*Math.max(1,v))same++}})));
  $('akNote').innerHTML='At K = 4,096: reading A '+pct(d.A0[4])+' falling to '+pct(d.A128[4])+' with promotion; reading B '+pct(d.B0[4])+' falling to '+pct(d.B128[4])+'. Computed in your browser just now; '+same+' of '+tot+' points identical to fp8_sim.py\'s run (inputs/fp8_sim.json).'}
$('akD').addEventListener('change',()=>{AK.D=$('akD').value;refit($('akSvg'))});
fit($('akSvg'),akDraw);onTab('t-read',()=>{refit($('akSvg'));refit($('sxSvg'));if(axA)axA.draw()});
try{const c=window.PAPER&&PAPER.rc&&PAPER.rc.fp8check;if(c)$('fpN').textContent=c.compared}catch(e){}
})();
