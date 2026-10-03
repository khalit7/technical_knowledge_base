// ---- Training lab, part d: drawing (decision boundaries on canvas, curves in SVG, per-layer bars in HTML), all sized from the measured width ----
(function(){
'use strict';
const LB=window.LB,U=LB&&LB.UI,$=id=>document.getElementById(id),tab=$('t-lab');if(!U||!tab)return;
const S=U.S;
const css=k=>getComputedStyle(tab).getPropertyValue(k).trim();
function rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
const mix=(a,b,t)=>[0,1,2].map(i=>Math.round(a[i]+(b[i]-a[i])*t));
const f3=v=>!isFinite(v)?'n/a':v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(3);
const pc=v=>(v*100).toFixed(1)+'%';
const sci=v=>{if(!isFinite(v))return'n/a';if(v===0)return'0';const a=Math.abs(v);if(a>=0.01&&a<1000)return a>=10?v.toFixed(1):a>=1?v.toFixed(2):v.toPrecision(2);const[m,e]=v.toExponential(1).split('e');return m+'e'+(+e)};
// index of the last record at or before step v
function at(r,v){const t=r.H.t;let k=0;for(let i=0;i<t.length;i++){if(t[i]<=v)k=i;else break}return k}
function gat(r,v){const t=r.G.t;let k=0;for(let i=0;i<t.length;i++){if(t[i]<=v)k=i;else break}return k}

// ---------- run headers: what differs ----------
function diffs(w){const me=S[w],ot=S[w==='A'?'B':'A'],out=[];
  U.ROWS.forEach(r=>{let a=me[r.k],b=ot[r.k];if(r.k==='wdMode'){a=U.effMode(me);b=U.effMode(ot);if(!(me.wd>0||ot.wd>0))return}
    if(a!==b)out.push(r.lab+': '+U.optLabel(r.k,a))});return out}
function heads(){['A','B'].forEach(w=>{const l=w.toLowerCase(),d=diffs(w);$('lb-hd'+l).textContent='Run '+w;
  $('lb-df'+l).textContent=d.length?d.join(' · '):'identical to the other run'})}

// ---------- status lines ----------
function status(){S.runs.forEach((r,i)=>{const v=S.view,H=r.H,el=$(i?'lb-stb':'lb-sta');let k=at(r,v);while(k>0&&!isFinite(H.vaL[k]))k--;
  let s='step '+H.t[k].toLocaleString('en-GB')+'<br>loss '+f3(H.trL[k])+' train, '+f3(H.vaL[k])+' val<br>accuracy '+pc(H.trA[k])+' train, '+pc(H.vaA[k])+' val';
  if(r.div&&v>=r.div)s+='<br><span class="bad">diverged at step '+r.div+'</span>';
  if(r.stopped&&v>=r.stopped)s+='<br><span class="stop">stopped early at step '+r.stopped.toLocaleString('en-GB')+'</span> (best val. loss at step '+r.best.t.toLocaleString('en-GB')+')';
  el.innerHTML=s})}

// ---------- decision boundaries ----------
const off=document.createElement('canvas');off.width=off.height=LB.GRID;const octx=off.getContext('2d');
const cache=[{},{}];
function boundaries(force){const bg=rgb(css('--bg')),k0=rgb(css('--k0')),k1=rgb(css('--k1')),ink=css('--ink'),bgs=css('--bg'),dpr=Math.min(2,window.devicePixelRatio||1);
  S.runs.forEach((r,i)=>{const cv=$(i?'lb-cvb':'lb-cva'),w=Math.max(120,Math.round(cv.parentElement.clientWidth-(cv.parentElement.clientWidth>200?16:12))),g=gat(r,S.view);
    const key=g+'|'+w+'|'+bgs+'|'+r.G.t.length;if(!force&&cache[i].key===key&&cache[i].run===r)return;cache[i]={key,run:r};
    cv.width=Math.round(w*dpr);cv.height=Math.round(w*dpr);cv.style.width=w+'px';cv.style.height=w+'px';
    const img=r.G.img[g],N=LB.GRID,id=octx.createImageData(N,N);
    for(let k=0;k<N*N;k++){const p=img[k],t=Math.min(1,Math.abs(p-0.5)*2),c=p<0.5?mix(bg,k0,0.12+0.5*t):mix(bg,k1,0.12+0.5*t);id.data[4*k]=c[0];id.data[4*k+1]=c[1];id.data[4*k+2]=c[2];id.data[4*k+3]=255}
    octx.putImageData(id,0,0);const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,cv.width,cv.height);
    ctx.scale(dpr,dpr);const d=S.data,flip=new Set(d.flip),px=x=>(x+1.2)/2.4*w,py=y=>(1.2-y)/2.4*w,rad=w<200?2.2:3;
    for(let n=0;n<d.Ytr.length;n++){ctx.beginPath();ctx.arc(px(d.Xtr[2*n]),py(d.Xtr[2*n+1]),rad,0,7);ctx.fillStyle=d.Ytr[n]?'rgb('+k1+')':'rgb('+k0+')';ctx.fill();
      ctx.lineWidth=flip.has(n)?1.6:0.8;ctx.strokeStyle=flip.has(n)?ink:bgs;ctx.stroke()}})}

// ---------- curves ----------
function svg(W,H,body,label){return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+label+'">'+body+'</svg>'}
function curves(){const T=S.sh.steps,box=$('lb-loss'),W=Math.max(240,box.clientWidth),H=W<420?170:190,pl=40,pr=8,pt=8,pb=24;
  const sx=t=>pl+(W-pl-pr)*t/T,ys=(lo,hi,lg)=>v=>{let q=lg?(Math.log10(Math.max(v,Math.pow(10,lo)))-lo)/(hi-lo):(v-lo)/(hi-lo);q=Math.max(0,Math.min(1,q));return pt+(H-pt-pb)*(1-q)};
  const cols=['var(--c1)','var(--c2)'];
  function axes(yl,ticks,fmt){let s='';ticks.forEach(v=>{const y=yl(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(y+3.5).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+fmt(v)+'</text>'});
    const nt=W<420?3:5;for(let i=0;i<=nt;i++){const t=Math.round(T*i/nt),x=sx(t);s+='<text x="'+x.toFixed(1)+'" y="'+(H-8)+'" font-size="10" text-anchor="'+(i===0?'start':i===nt?'end':'middle')+'" fill="var(--mute)">'+t.toLocaleString('en-GB')+'</text>'}
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(H-pb)+'" y2="'+(H-pb)+'" stroke="var(--mute)"/>';
    const cx=sx(S.view);s+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-width="1" opacity=".45"/>';return s}
  function path(r,key,yl){const H2=r.H;let d='',pen=false;for(let i=0;i<H2.t.length;i++){const v=H2[key][i];if(!isFinite(v)){pen=false;continue}d+=(pen?'L':'M')+sx(H2.t[i]).toFixed(1)+' '+yl(v).toFixed(1);pen=true}return d}
  function marks(r,c,yl,key){let s='';if(r.div){const x=sx(r.div),y=pt+6;s+='<path d="M'+(x-5)+' '+(y-5)+'L'+(x+5)+' '+(y+5)+'M'+(x-5)+' '+(y+5)+'L'+(x+5)+' '+(y-5)+'" stroke="'+c+'" stroke-width="2.4"/>'}
    if(r.stopped){const k=at(r,r.stopped),x=sx(r.stopped),y=yl(r.H[key][k]);s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4.5" fill="none" stroke="'+c+'" stroke-width="2"/>'}return s}
  // loss: log scale 0.001 to 10
  let yl=ys(-3,1,true),s=axes(yl,[0.001,0.01,0.1,1,10],v=>v>=1?String(v):String(v));
  S.runs.forEach((r,i)=>{s+='<path d="'+path(r,'trL',yl)+'" fill="none" stroke="'+cols[i]+'" stroke-width="1.6" stroke-dasharray="4 3"/><path d="'+path(r,'vaL',yl)+'" fill="none" stroke="'+cols[i]+'" stroke-width="2.2"/>'+marks(r,cols[i],yl,'vaL')});
  $('lb-loss').innerHTML=svg(W,H,s,'Training and validation loss of runs A and B');
  // accuracy: 40% to 100%
  const ya=ys(0.4,1,false);s=axes(ya,[0.4,0.5,0.6,0.7,0.8,0.9,1].filter((v,i)=>W>=420||i%2===0),v=>Math.round(v*100)+'%');
  S.runs.forEach((r,i)=>{s+='<path d="'+path(r,'trA',ya)+'" fill="none" stroke="'+cols[i]+'" stroke-width="1.6" stroke-dasharray="4 3"/><path d="'+path(r,'vaA',ya)+'" fill="none" stroke="'+cols[i]+'" stroke-width="2.2"/>'+marks(r,cols[i],ya,'vaA')});
  $('lb-acc').innerHTML=svg(W,H,s,'Training and validation accuracy of runs A and B');
  // learning rate, the whole schedule, linear from zero to the larger peak
  const W2=Math.max(240,$('lb-lr').clientWidth),H2=W2<420?76:84,top=Math.max(S.A.lr,S.B.lr),sx2=t=>pl+(W2-pl-pr)*t/T,sy2=v=>pt+(H2-pt-pb)*(1-v/top);let s2='';
  [0,top].forEach(v=>{s2+='<line x1="'+pl+'" x2="'+(W2-pr)+'" y1="'+sy2(v).toFixed(1)+'" y2="'+sy2(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(sy2(v)+3.5).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(v?sci(v):'0')+'</text>'});
  [S.A,S.B].forEach((c,i)=>{let d='';for(let j=0;j<=200;j++){const t=Math.min(T-1,Math.round(j*T/200)),v=c.lr*LB.lrMult(c.sched,t,T,c.warm);d+=(j?'L':'M')+sx2(t).toFixed(1)+' '+sy2(v).toFixed(1)}
    s2+='<path d="'+d+'" fill="none" stroke="'+cols[i]+'" stroke-width="'+(i?1.6:2.6)+'"'+(i?' stroke-dasharray="5 3"':'')+' opacity=".9"/>'});
  const cx=sx2(S.view);s2+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+pt+'" y2="'+(H2-pb)+'" stroke="var(--ink)" opacity=".45"/><text x="'+pl+'" y="'+(H2-8)+'" font-size="10" fill="var(--mute)">A solid, B dashed; step 0 to '+T.toLocaleString('en-GB')+'</text>';
  $('lb-lr').innerHTML=svg(W2,H2,s2,'Learning-rate schedules of runs A and B')}

// ---------- per-layer bars ----------
const RANGES={act:[-4,2],grad:[-8,2],wn:[-2,2]};
function layers(){const ks=[['act','Activations (RMS)'],['grad','Gradients (norm)'],['wn','Weights (norm)']],rs=S.runs,ix=rs.map(r=>at(r,S.view));
  const dmax=Math.max(S.A.depth,S.B.depth),sup=e=>'10'+String(e).replace('-','⁻').replace(/\d/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
  $('lb-layers').innerHTML=ks.map(([k,t])=>{const[lo,hi]=RANGES[k],q=v=>v>0?Math.max(0,Math.min(1,(Math.log10(v)-lo)/(hi-lo))):0;
    const val=(ri,li,isOut)=>{const r=rs[ri],arr=r.H[k][ix[ri]]||[],dep=S[ri?'B':'A'].depth;if(isOut)return k==='act'?null:arr[dep];return li<dep?arr[li]:null};
    let h='<div class="lb-lay"><div class="t">'+t+'</div>';
    const row=(lab,va,vb)=>'<div class="r"><span>'+lab+'</span><span class="tk">'+(va==null?'':'<i class="a" style="width:'+(q(va)*100).toFixed(1)+'%"></i>')+(vb==null?'':'<i class="b" style="width:'+(q(vb)*100).toFixed(1)+'%"></i>')+'</span><span class="v"><span class="a">'+(va==null?'':sci(va))+'</span><br><span class="b">'+(vb==null?'':sci(vb))+'</span></span></div>';
    for(let l=0;l<dmax;l++)h+=row('L'+(l+1),val(0,l),val(1,l));
    if(k!=='act')h+=row('out',val(0,0,true),val(1,0,true));
    return h+'<div class="ax"><span></span><span><span>'+sup(lo)+'</span><span>'+sup(hi)+'</span></span><span></span></div></div>'}).join('')}

U.render=function(force){if(!S.runs||tab.hidden)return;U.updScrub();heads();status();boundaries(force);curves();layers()};
let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!tab.hidden&&S.runs)U.render(true)},120)});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(!tab.hidden&&S.runs)U.render(true)});
})();
