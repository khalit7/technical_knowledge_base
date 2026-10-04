// ---- Importance sampling tab (t-is): Example 5.4 (one run animated, Figure 5.3 averaged) and Example 5.5 (Figure 5.4).
(function(){
'use strict';
const U=window.LBU,M=window.MFE;if(!U||!M)return;const $=U.$,MI='−';
const f=(v,d)=>U.f(v,d),BOOK=-0.27726;let TRUE=null;
const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
// ---------- Example 5.4, one run ----------
const sec=$('is-bj'),S={seed:1,runs:100,F:null,res:{},on:{}},TE=200;
function initTruth(){TRUE=M.bjExact();
  $('is-truth').innerHTML=stat('Exact value under &pi;',f(TRUE,5),'computed here by recursion over the infinite deck')+stat('The book\'s value',f(BOOK,5),'average of 100 million simulated episodes')+stat('Difference',f(TRUE-BOOK,5),'the book\'s standard error is about 1/&radic;10<sup>8</sup> = 0.0001')}
const cardN=c=>c===1?'ace':String(c);
function draw(i){const F=S.F;if(i===0){$('is-ep').innerHTML='No episodes yet. Both estimates start at 0.';}
  else{const e=F[i-1];let s='';e.log.forEach(x=>{if(x.a)s+=(x.a==='hit'?'at '+x.sum+': <b>hit</b>, draws '+cardN(x.c):'at '+x.sum+': <b>stick</b>')+(x.ok?' <span style="color:var(--good)">(&pi; agrees: &times;2)</span>':' <span style="color:var(--bad)">(&pi; would not: &times;0)</span>')+'<br>';
      else if(x.bust)s+='bust at '+x.bust+'<br>';else if(x.end!=null)s+='dealer '+(x.d===22?'busts':'ends on '+x.d)+'<br>'});
    s+='return G = <b>'+f(e.G,0)+'</b>, ratio &rho; = <b>'+e.rho+'</b>, so &rho;G = '+f(e.rho*e.G,0);$('is-ep').innerHTML=s}
  const el=$('is-run'),W=Math.max(260,Math.round(el.clientWidth||300)),n=Math.max(1,i),xs=[],yo=[],yw=[];for(let k=1;k<=i;k++){xs.push(k);yo.push(F[k-1].vo);yw.push(F[k-1].vw)}
  U.chart(el,{x:[0,TE],y:[-2,2],yt:[-2,-1,0,1,2],yf:v=>v<0?MI+(-v):String(v),xt:[0,50,100,150,200],xl:'episodes',H:170,series:[{x:xs,y:yo,c:'var(--c2)'},{x:xs,y:yw,c:'var(--c1)'}],hl:[{v:TRUE,t:'true '+f(TRUE,3),c:'var(--ink)'}],label:'Running estimates of one run'});
  const L=i>0?F[i-1]:{num:0,den:0,vo:0,vw:0};
  $('is-rs').innerHTML='after '+i+' episode'+(i===1?'':'s')+' · sum of &rho;G '+f(L.num,0)+', sum of &rho; '+f(L.den,0)+'<br><span style="color:var(--c2)">ordinary</span> '+f(L.num,0)+' / '+i+' = <b>'+f(L.vo,3)+'</b> · <span style="color:var(--c1)">weighted</span> '+(L.den>0?f(L.num,0)+' / '+f(L.den,0)+' = ':'')+'<b>'+f(L.vw,3)+'</b>';
  let t;if(i===0)t='Each episode is played by the random behaviour policy; the ratio keeps only the episodes &pi; could also have produced, scaled up by 2 per decision.';
  else{const e=F[i-1];t=e.rho===0?'This episode contains a decision &pi; would never make, so it counts for nothing in either sum; ordinary importance sampling still divides by one more episode.':'Every decision matched &pi;, so this return enters both sums with weight '+e.rho+'. Ordinary importance sampling can overshoot (a weight of '+e.rho+' on one return); weighted importance sampling is a weighted average of returns, so it always stays between '+MI+'1 and 1.'}
  $('is-cap').innerHTML=t}
let A=null;
function initAnim(){S.F=M.bjTrace(S.seed,TE);A=U.anim({p:'is',sec,n:()=>TE+1,speeds:[['slow',2],['normal',6],['fast',25]],def:1,draw,label:i=>'episode '+i+' of '+TE,scrubLabel:'Episode'});A.show()}
// ---------- Figure 5.3 ----------
let job=null;const key=()=>S.runs+'|'+S.seed;
function run(){const k=key();if(S.res[k]){plot();checks();return}if(job)job.cancel=true;$('is-chk').innerHTML='<li><span class="lb-in">•</span><span>running '+S.runs+' runs of 10,000 episodes...</span></li>';
  job=U.job(M.bjJob({seed:S.seed,runs:S.runs,episodes:10000,truth:TRUE}),p=>U.prog($('is-pg'),p),r=>{S.res[k]=r;job=null;plot();checks()});plot()}
const lx=[];for(let e=1;e<=10000;e++)lx.push(Math.log10(e));
function plot(){const el=$('is-ch'),r=S.res[key()],it=[{k:'o',lab:'ordinary importance sampling',c:'var(--c2)'},{k:'w',lab:'weighted importance sampling',c:'var(--c1)'}];
  const ser=r?it.map(m=>({x:lx,y:r[m.k],c:m.c,off:S.on[m.k]===false})):[];
  U.chart(el,{x:[0,4],y:[0,5],yt:[0,1,2,3,4,5],xt:[0,1,2,3,4],xf:v=>['1','10','100','1k','10k'][v],xl:'episodes (log scale)',series:ser,label:'Mean squared error'});
  U.legend($('is-lg'),it,S.on,plot)}
function checks(){const r=S.res[key()];if(!r)return;const R=[],o=r.o,w=r.w;let lower=0;for(let e=0;e<10;e++)if(w[e]<o[e])lower++;
  R.push([lower===10,'"The weighted importance-sampling method has much lower error at the beginning": lower at all of the first 10 episodes; after 1 episode '+f(w[0],3)+' against '+f(o[0],3)+', after 10 episodes '+f(w[9],3)+' against '+f(o[9],3)+'.']);
  R.push([o[9999]<0.01&&w[9999]<0.01,'"The error approaches zero for both algorithms": after 10,000 episodes, ordinary '+f(o[9999],5)+', weighted '+f(w[9999],5)+'.']);
  R.push([Math.sqrt(Math.max(o[999],w[999]))<0.15,'"Both off-policy methods closely approximated this value after 1000 off-policy episodes": root mean squared error after 1,000 episodes, ordinary '+f(Math.sqrt(o[999]),3)+', weighted '+f(Math.sqrt(w[999]),3)+'.']);
  const pk=Math.max(...w.slice(0,100)),at=w.indexOf(pk)+1;R.push([pk>w[0],'Exercise 5.7, the weighted error "first increased and then decreased": from '+f(w[0],3)+' after one episode up to '+f(pk,3)+' at episode '+at+'. Early on most runs have not yet seen an episode consistent with &pi;, so their weighted estimate is still 0, only 0.28 from the truth; as runs see their first consistent episodes the estimate jumps to a single return of +1, 0 or '+MI+'1, far from '+MI+'0.28, so the error grows before averaging brings it down.']);
  U.checks($('is-chk'),R)}
// ---------- Example 5.5 ----------
const V={n:1000000,seed:1,res:{},on:{}},sec2=$('is-iv');let job2=null;
function sums(){let s='';[[5,0],[10,0],[20,0],[40,0]].forEach(([K])=>{let t=0;for(let j=0;j<K;j++)t+=0.2*Math.pow(1.8,j);s+=stat('First '+K+' terms',(t<100?t.toFixed(1):Math.round(t).toLocaleString('en-US')),'0.2 (1 + 1.8 + ... + 1.8<sup>'+(K-1)+'</sup>)')});$('is-sums').innerHTML=s}
const key2=()=>V.n+'|'+V.seed;
function run2(){const k=key2();if(V.res[k]){plot2();checks2();return}if(job2)job2.cancel=true;$('is-ivchk').innerHTML='<li><span class="lb-in">•</span><span>running 10 runs of '+V.n.toLocaleString('en-US')+' episodes...</span></li>';
  job2=U.job(M.ivJob({seed:V.seed,runs:10,episodes:V.n,per:20}),p=>U.prog($('is-ivpg'),p),r=>{V.res[k]=r;job2=null;plot2();checks2()});plot2()}
function plot2(){const el=$('is-ivch'),r=V.res[key2()],L=Math.log10(V.n),ser=[];
  if(r){const xs=r.P.map(Math.log10);r.runs.forEach((ru,i)=>ser.push({x:xs,y:ru.vo,c:U.ramp(i,10),w:1.3,off:V.on.o===false}));ser.push({x:xs,y:r.runs[0].vw,c:'var(--ink)',dash:true,w:1.5,off:V.on.w===false})}
  const xt=[];for(let k=0;k<=L;k++)xt.push(k);
  U.chart(el,{x:[0,L],y:[0,2],yt:[0,0.5,1,1.5,2],xt,xf:v=>v===0?'1':v<=3?String(Math.pow(10,v)).replace(/\B(?=(\d{3})+$)/g,','):'10<tspan dy="-4" font-size="8">'+v+'</tspan>',xl:'episodes (log scale)',series:ser,hl:[{v:1,t:'v(s) = 1'}],H:el.clientWidth<480?230:270,label:'Ordinary importance sampling, ten runs'});
  U.legend($('is-ivlg'),[{k:'o',lab:'ordinary, 10 runs',c:U.ramp(3,10)},{k:'w',lab:'weighted (one run shown; all are 1)',c:'var(--ink)',dash:true}],V.on,plot2)}
function checks2(){const r=V.res[key2()];if(!r)return;const R=[],fin=r.runs.map(x=>x.vo[x.vo.length-1]),lo=Math.min(...fin),hi=Math.max(...fin);
  R.push([fin.every(v=>Math.abs(v-1)>1e-9),'"Even after millions of episodes, the estimates fail to converge to the correct value of 1": after '+V.n.toLocaleString('en-US')+' episodes the ten runs read from '+f(lo,3)+' to '+f(hi,3)+'.']);
  const wOk=r.runs.every(x=>{let seen=false;return x.vw.every(v=>{if(v!==0)seen=true;return!seen||v===1})});
  R.push([wOk,'"The weighted importance-sampling algorithm would give an estimate of exactly 1 forever after the first episode that ended with the left action": true in all ten runs at every recorded point.']);
  R.push([null,'Why: an episode with k left actions has weight 2<sup>k</sup>. Long all-left episodes are rare under the behaviour policy but carry enormous weights, so the average is dominated by a few huge samples and keeps jumping. The partial sums above grow without limit: the variance is infinite.']);
  U.checks($('is-ivchk'),R)}
let inited=false;
function init(){if(inited)return;inited=true;initTruth();initAnim();sums();
  $('is-runs').onchange=e=>{S.runs=+e.target.value;run()};$('is-seed').onchange=e=>{S.seed=+e.target.value;S.F=M.bjTrace(S.seed,TE);A.show();run()};
  $('is-ivn').onchange=e=>{V.n=+e.target.value;run2()};$('is-ivs').onchange=e=>{V.seed=+e.target.value;run2()};
  U.watch(sec,()=>{if(!S.res[key()]&&!job)run()});U.watch(sec2,()=>{if(!V.res[key2()]&&!job2)run2()})}
U.onRender('t-is',()=>{init();A.show();plot();plot2()});
window.LB_TEST=Object.assign(window.LB_TEST||{},{is:()=>({A,S,V,busy:()=>!!job||!!job2})});
})();
