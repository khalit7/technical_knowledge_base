// ---- Maximisation bias tab (t-mx): the expected-max widget, one run of Example 6.7 animated, and Figure 6.5 averaged over runs.
(function(){
'use strict';
const U=window.LBU,M=window.MFE;if(!U||!M)return;const $=U.$,MI='−';
const f=(v,d)=>U.f(v,d);
// ---------- the bias in one picture: E[max of N noisy zero estimates] ----------
const cache={};const em=n=>cache[n]!=null?cache[n]:(cache[n]=M.emax(n));
function drawEm(){const n=+$('mx-emN').value,sg=+$('mx-emS').value/10;$('mx-emNv').textContent=n;$('mx-emSv').textContent=sg.toFixed(1);
  const el=$('mx-emP'),W=Math.max(260,Math.round(el.clientWidth||300)),lw=Math.min(190,W*0.42),r=48,H=118,X=v=>lw+(W-lw-r)*v/(3*2.2);
  const rows=[['True value of the best action',0,'var(--mute)'],['Max of the estimates (Q-learning)',sg*em(n),'var(--c2)'],['Double estimator',0,'var(--c3)']];let s='';
  rows.forEach(([lab,v,c],j)=>{const y=10+j*36;s+='<text x="0" y="'+(y+13)+'" font-size="11">'+lab+'</text><rect x="'+lw+'" y="'+(y+2)+'" width="'+Math.max(2,X(v)-lw).toFixed(1)+'" height="15" rx="2" fill="'+c+'"/><text x="'+(Math.max(X(v),lw+2)+5).toFixed(1)+'" y="'+(y+14)+'" font-size="11" font-weight="600">'+f(v,3)+'</text>'});
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Maximisation bias">'+s+'</svg>';
  $('mx-emT').innerHTML='With '+n+' action'+(n>1?'s':'')+' all truly worth 0 and each estimate off by independent normal noise of standard deviation '+sg.toFixed(1)+', the expected largest estimate is <b>'+f(sg*em(n),3)+'</b> <i>derived</i>: &sigma; &times; E[max of '+n+' standard normals], computed by numerical integration here (0.846 for 3 actions, 1.539 for 10). The double estimator picks with one set and values with an independent second set, so its expectation is the true value of the picked action, 0 here.'}
// ---------- one run, animated ----------
const S={nb:10,seed:1,runs:10000,ra:null,rb:null,res:{},on:{}},EP=300,sec=$('mx-run');
function rec(){const c={nb:S.nb,eps:0.1,alpha:0.1,episodes:EP};S.ra=M.mxRun('q',S.seed,0,c,true);S.rb=M.mxRun('dq',S.seed,0,c,true)}
function panel(el,r,i,dbl){const W=Math.max(260,Math.round(el.clientWidth||300)),H=170,pl=34,pr=8,top=10,bot=H-24,lo=-1.2,hi=1.2,Y=v=>top+(bot-top)*(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo);
  const tr=i>0?r.tr[i-1]:{A:[0,0],B:new Array(S.nb).fill(0),A1:[0,0],A2:[0,0],B1:new Array(S.nb).fill(0),B2:new Array(S.nb).fill(0)};let s='';
  [-1,-0.5,0,0.5,1].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(pl-4)+'" y="'+(Y(v)+3.5).toFixed(1)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+(v<0?MI+(-v):v)+'</text>'});
  const aw=(W-pl-pr)*0.36,bx=pl+aw+16,bw=W-pr-bx;
  // A: left and right bars
  [['left',tr.A[0],'var(--bad)'],['right',tr.A[1],'var(--good)']].forEach(([lab,v,c],j)=>{const x=pl+8+j*(aw/2),w=aw/2-14,y0=Y(0),y=Y(v);
    s+='<rect x="'+x.toFixed(1)+'" y="'+Math.min(y,y0).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,Math.abs(y-y0)).toFixed(1)+'" fill="'+c+'" fill-opacity=".75"/><text x="'+(x+w/2).toFixed(1)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle">A '+lab+'</text>'});
  // B: dots, the max and the true value
  const n=S.nb;for(let k=0;k<n;k++){const x=bx+bw*(k+0.5)/n;s+='<circle cx="'+x.toFixed(1)+'" cy="'+Y(tr.B[k]).toFixed(1)+'" r="3.2" fill="var(--c4)"/>'}
  const mx=Math.max(...tr.B);s+='<line x1="'+bx+'" x2="'+(bx+bw)+'" y1="'+Y(-0.1).toFixed(1)+'" y2="'+Y(-0.1).toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".6"/>';
  s+='<line x1="'+bx+'" x2="'+(bx+bw)+'" y1="'+Y(mx).toFixed(1)+'" y2="'+Y(mx).toFixed(1)+'" stroke="var(--c2)" stroke-width="1.5"/>';
  s+='<text x="'+(bx+bw/2).toFixed(1)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle">B\'s '+n+' action'+(n>1?'s':'')+'</text>';
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Estimates in A and B">'+s+'</svg>';
  let lefts=0;for(let e=0;e<i;e++)lefts+=r.left[e];
  const tgt=dbl?(i>0?'Q2 at Q1\'s best: '+f(tr.B2[M.argmaxR(tr.B1,()=>0)],3)+', Q1 at Q2\'s best: '+f(tr.B1[M.argmaxR(tr.B2,()=>0)],3):''):'max over B: <b>'+f(mx,3)+'</b>';
  return 'after episode '+i+' · Q(A, left) '+f(tr.A[0],3)+', Q(A, right) '+f(tr.A[1],3)+'<br>'+tgt+(tgt?' · ':'')+'left taken in '+lefts+' of '+i+' episodes'}
function draw(i){$('mx-sa').innerHTML=panel($('mx-va'),S.ra,i,false);$('mx-sb').innerHTML=panel($('mx-vb'),S.rb,i,true);
  let t;if(i===0)t='Every estimate starts at 0; the dashed line in B is the true value of each action there, '+MI+'0.1. The first choice in A is a coin flip between two tied estimates.';
  else{const a=S.ra.tr[i-1],b=S.rb.tr[i-1],ml=Math.max(...a.B);
    t='Episode '+i+'. Q-learning values left at '+f(a.A[0],3)+' against right '+f(a.A[1],3)+(a.A[0]>a.A[1]?': <b>left looks better</b>, because its target is the luckiest of B\'s estimates ('+f(ml,3)+') rather than their true value, '+MI+'0.1.':'.')+' Double Q-learning: left '+f(b.A[0],3)+' against right '+f(b.A[1],3)+(b.A[0]<b.A[1]?', so it prefers right, the correct choice.':'.');
    if(i<5)t+=' Early on, untried actions in B still sit at 0, so the max over B cannot go below 0.'}
  $('mx-cap').innerHTML=t}
let A=null;
function initAnim(){rec();A=U.anim({p:'mx',sec,n:()=>EP+1,speeds:[['slow',3],['normal',10],['fast',40]],def:1,draw,label:i=>'episode '+i+' of '+EP,scrubLabel:'Episode'});A.show()}
// ---------- averaged over runs ----------
let job=null;
function key(){return S.nb+'|'+S.runs+'|'+S.seed}
function run(){const k=key();if(S.res[k]){plot();checks();return}if(job)job.cancel=true;$('mx-chk').innerHTML='<li><span class="lb-in">•</span><span>running '+S.runs+' runs of each learner...</span></li>';
  job=U.job(M.mxJob({seed:S.seed,runs:S.runs,episodes:EP,nb:S.nb,eps:0.1,alpha:0.1}),p=>U.prog($('mx-pg'),p),r=>{S.res[k]=r;job=null;plot();checks()});plot()}
function plot(){const el=$('mx-ch'),r=S.res[key()],xs=[];for(let i=1;i<=EP;i++)xs.push(i);
  const it=[{k:'q',lab:'Q-learning',c:'var(--c2)'},{k:'d',lab:'Double Q-learning',c:'var(--c1)'}];
  const ser=r?it.map(m=>({x:xs,y:r[m.k],c:m.c,off:S.on[m.k]===false})):[];
  U.chart(el,{x:[0,EP],y:[0,1],yt:[0,0.25,0.5,0.75,1],yf:v=>Math.round(v*100)+'%',xt:[1,100,200,300],xl:'episodes',series:ser,hl:[{v:0.05,t:'optimal 5%'}],label:'Share of left actions from A'});
  U.legend($('mx-lg'),it,S.on,plot)}
function checks(){const r=S.res[key()];if(!r)return;const R=[],q=r.q,d=r.d,pk=Math.max(...q),at=q.indexOf(pk)+1,mnq=Math.min(...q),mxd=Math.max(...d.slice(5)),avg=(a,i,j)=>a.slice(i,j).reduce((x,y)=>x+y,0)/(j-i);
  R.push([pk>0.5,'"Q-learning initially learns to take the left action much more often than the right action": it peaks at <b>'+(100*pk).toFixed(1)+'%</b> left at episode '+at+'.']);
  R.push([mnq>0.05,'"... and always takes it significantly more often than the 5% minimum": its lowest share over the 300 episodes is '+(100*mnq).toFixed(1)+'%.']);
  R.push([mxd<0.55&&avg(d,250,300)<0.09,'"Double Q-learning is essentially unaffected by maximization bias": after the first 5 episodes it never exceeds '+(100*mxd).toFixed(1)+'%, and averages '+(100*avg(d,250,300)).toFixed(1)+'% over episodes 251 to 300 (the first episode is a coin flip between tied estimates, 50%, for both).']);
  R.push([null,'"Even at asymptote, Q-learning takes the left action about 5% more often than is optimal": over episodes 251 to 300 it takes left '+(100*avg(q,250,300)).toFixed(1)+'% of the time against the optimal 5%, still drifting down at episode 300. With 1 action in B there is nothing to maximise over and the two learners coincide in expectation; try it.']);
  U.checks($('mx-chk'),R)}
let inited=false;
function init(){if(inited)return;inited=true;initAnim();
  ['mx-emN','mx-emS'].forEach(id=>$(id).addEventListener('input',drawEm));
  $('mx-nb').onchange=e=>{S.nb=+e.target.value;rec();A.i=Math.min(A.i,EP);A.show();run()};
  $('mx-runs').onchange=e=>{S.runs=+e.target.value;run()};$('mx-seed').onchange=e=>{S.seed=+e.target.value;rec();A.show();run()};
  U.watch(sec,()=>{if(!S.res[key()]&&!job)run()})}
U.onRender('t-mx',()=>{init();drawEm();A.show();plot()});
window.LB_TEST=Object.assign(window.LB_TEST||{},{mx:()=>({A,S,busy:()=>!!job})});
})();
