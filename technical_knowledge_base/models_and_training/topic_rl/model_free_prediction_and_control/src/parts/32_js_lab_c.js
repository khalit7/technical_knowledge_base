// ---- Estimator lab, part c: experiments 2 (5-state random walk, Example 6.2 and Figure 6.2) and 3 (19-state walk, Figures 7.2, 12.3, 12.6).
(function(){
'use strict';
const U=window.LBU;if(!U)return;const{$,E}=U,MI='−',L='ABCDE';

// =================== Experiment 2: TD(0) against constant-alpha Monte Carlo ===================
const sec=$('lb-rw'),S={at:0.1,am:0.1,F:null,mode:'on',runs:100,seed:1,res:{},on:{}};
function trace(){S.F=E.rw5Trace(1,100,S.at,S.am);S.last={};S.F.forEach((f,i)=>{S.last[f.e]=i})}
// one panel: terminals, five bars (estimate), true-value ticks, the walker, the state just updated
function strip(el,fr,V,upd,isMC){const W=Math.max(240,Math.round(el.clientWidth||300)),H=W<360?118:128,n=7,cw=W/n,base=H-30,top=16,h=base-top;let s='';
  for(let k=0;k<n;k++){const x=k*cw,cx=x+cw/2;
    if(k===0||k===6){s+='<rect x="'+(x+cw*0.2)+'" y="'+(base-22)+'" width="'+(cw*0.6)+'" height="22" rx="3" fill="var(--dim)"/><text x="'+cx+'" y="'+(base-7)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(k===6?'+1':'0')+'</text>';continue}
    const v=V[k],y=base-h*Math.max(0,Math.min(1,v)),tv=E.TV5[k],ty=base-h*tv,hi=upd.indexOf(k)>=0;
    s+='<rect x="'+(x+cw*0.18)+'" y="'+y.toFixed(1)+'" width="'+(cw*0.64)+'" height="'+(base-y).toFixed(1)+'" fill="'+(isMC?'var(--c2)':'var(--c1)')+'" fill-opacity="'+(hi?0.85:0.45)+'"'+(hi?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>';
    s+='<line x1="'+(x+cw*0.08)+'" x2="'+(x+cw*0.92)+'" y1="'+ty.toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>';
    s+='<text x="'+cx+'" y="'+(Math.min(y,ty)-3).toFixed(1)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v.toFixed(2)+'</text>';
    s+='<text x="'+cx+'" y="'+(base+13)+'" font-size="12" text-anchor="middle" font-weight="600">'+L[k-1]+'</text>'}
  s+='<line x1="'+cw+'" x2="'+(W-cw)+'" y1="'+base+'" y2="'+base+'" stroke="var(--mute)"/>';
  const px=fr.pos*cw+cw/2;s+='<circle cx="'+px.toFixed(1)+'" cy="'+(H-6)+'" r="5" fill="var(--bad)"/>';
  if(fr.from!=null&&fr.t>=0){const fx=fr.from*cw+cw/2;s+='<path d="M'+fx.toFixed(1)+' '+(H-6)+'L'+px.toFixed(1)+' '+(H-6)+'" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="2 2"/>'}
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Value estimates of states A to E against their true values">'+s+'</svg>'}
const nm=k=>k===0?'the left end':k===6?'the right end':L[k-1];
function draw(i){const fr=S.F[i];strip($('lb-rw-va'),fr,fr.Vt,fr.ut>=0?[fr.ut]:[],false);strip($('lb-rw-vb'),fr,fr.Vm,fr.um.map(u=>u[0]),true);
  $('lb-rw-sa').innerHTML='after '+(fr.t===(fr.T-1)?fr.e:fr.e-1)+' full episodes · RMS error <b>'+E.rms5(fr.Vt).toFixed(3)+'</b>';
  $('lb-rw-sb').innerHTML='after '+(fr.t===(fr.T-1)?fr.e:fr.e-1)+' full episodes · RMS error <b>'+E.rms5(fr.Vm).toFixed(3)+'</b>';
  let t;if(i===0)t='Every estimate starts at 0.5; dashed lines are the true values 1/6 to 5/6. Each episode starts in C.';
  else{const s=fr.from,s2=fr.pos;t='Episode '+fr.e+', step '+(fr.t+1)+': '+nm(s)+' to '+nm(s2)+'. <b>TD</b>: V('+L[s-1]+') moves '+S.at+' of the way from '+fr.old.toFixed(3)+' toward '+(s2===6?'1':'0')+(s2>0&&s2<6?' + V('+L[s2-1]+')':'')+' = '+fr.tgt.toFixed(3)+', to '+fr.Vt[s].toFixed(3)+'. ';
    if(fr.um.length){const vs=[...new Set(fr.um.map(u=>L[u[0]-1]))].join(', ');t+='<b>Monte Carlo</b>: the episode is over with return '+fr.G+'; every visit ('+fr.um.length+', to '+vs+') moves '+S.am+' of the way toward '+fr.G+'.'}
    else t+='<b>Monte Carlo</b> waits: it needs the final outcome.'}
  $('lb-rw-cap').innerHTML=t}
let A=null;
function initAnim(){trace();A=U.anim({p:'lb-rw',sec,n:()=>S.F.length,speeds:[['a step at a time',3],['faster',12],['an episode at a time',40]],def:0,draw,
  label:i=>'episode '+S.F[i].e+' of 100',scrubLabel:'Episode'});
  // the scrubber moves in episodes
  const scr=$('lb-rw-scr');A.show=(function(old){return function(){old();scr.max='100';scr.value=String(S.F[A.i].t===S.F[A.i].T-1?S.F[A.i].e:Math.max(0,S.F[A.i].e-1))}})(A.show);
  scr.oninput=()=>{A.setPlay(false);A.i=S.last[+scr.value];A.show()};
  A.show();
  document.querySelectorAll('#lb-rw .lb-jb button').forEach(b=>b.onclick=()=>{A.setPlay(false);A.i=S.last[+b.dataset.e];A.show()});
  $('lb-rw-at').onchange=e=>{S.at=+e.target.value;const k=S.F[A.i].e;trace();A.i=S.last[k]||0;A.show()};
  $('lb-rw-am').onchange=e=>{S.am=+e.target.value;const k=S.F[A.i].e;trace();A.i=S.last[k]||0;A.show()}}
// averaged curves
const ON=[{k:'td',a:.05},{k:'td',a:.1},{k:'td',a:.15},{k:'mc',a:.01},{k:'mc',a:.02},{k:'mc',a:.03},{k:'mc',a:.04}],BA=[{k:'btd'},{k:'bmc'}];
const TDC=['#1d4e89','#2f7fbf','#59b3d6'],MCC=['#8a3b12','#c2703a','#e0a050','#d9bb5f'],TDD=['#5f9ef0','#6fb8f0','#9fd6f5'],MCD=['#c8693a','#e8915c','#f0b070','#e6cf80'];
const dk=()=>matchMedia('(prefers-color-scheme: dark)').matches;
function items(){const d=dk();return S.mode==='on'?ON.map((m,i)=>({k:m.k+m.a,lab:(m.k==='td'?'TD α = ':'MC α = ')+m.a,c:m.k==='td'?(d?TDD:TDC)[i]:(d?MCD:MCC)[i-3],dash:m.k==='mc'})):
  [{k:'btd',lab:'batch TD',c:'var(--c1)'},{k:'bmc',lab:'batch MC',c:'var(--c2)',dash:true}]}
let job=null;
function key(){return S.mode+'|'+S.runs+'|'+S.seed}
function run(){const k=key();if(S.res[k]){plot();return}if(job)job.cancel=true;$('lb-rw-chk').innerHTML='<li><span class="lb-in">•</span><span>running '+S.runs+' runs...</span></li>';
  job=U.job(E.rw5Job({seed:S.seed,runs:S.runs,episodes:100,methods:S.mode==='on'?ON:BA}),p=>U.prog($('lb-rw-pg'),p),r=>{S.res[k]=r;job=null;plot();checks()});plot()}
function plot(){const el=$('lb-rw-ch'),r=S.res[key()],it=items(),xs=[];for(let i=0;i<=100;i++)xs.push(i);
  const ser=r?it.map((m,i)=>({x:xs,y:r[i],c:m.c,dash:m.dash,off:S.on[m.k]===false})):[];
  U.chart(el,{x:[0,100],y:[0,0.25],yt:[0,0.05,0.1,0.15,0.2,0.25],xt:[0,25,50,75,100],xl:'walks / episodes',series:ser,label:'RMS error against episodes'});
  U.legend($('lb-rw-lg'),it,S.on,plot);$('lb-rw-bn').hidden=S.mode!=='batch';
  $('lb-rw-ct').textContent=S.mode==='on'?'RMS error, averaged over the five states and the runs (Example 6.2, right graph)':'RMS error under batch training (Figure 6.2)'}
function checks(){const r=S.res[key()];if(!r)return;const R=[];
  if(S.mode==='on'){const td=r.slice(0,3),mc=r.slice(3);let b=0;for(let e=1;e<=100;e++)if(Math.max(...td.map(c=>c[e]))<Math.min(...mc.map(c=>c[e])))b++;
    R.push([b>=95,'"The TD method was consistently better than the MC method": every TD curve is below every Monte Carlo curve at <b>'+b+' of 100</b> episodes.']);
    const c=td[2],mn=Math.min(...c),at=c.indexOf(mn);R.push([at<80&&c[100]-mn>0.01,'Exercise 6.5, TD error going "down and then up again, particularly at high α": with α = 0.15 the error bottoms at '+mn.toFixed(3)+' (episode '+at+') and ends at '+c[100].toFixed(3)+'. A constant step keeps reacting to the latest episodes, so the estimates never settle.']);
    R.push([Math.abs(r[0][0]-Math.sqrt(1/18))<1e-12,'Every curve starts at '+r[0][0].toFixed(3)+' = √(1/18), the error of 0.5 everywhere against 1/6 to 5/6.'])}
  else{const[bt,bm]=r;let le=0,lt=0;for(let e=1;e<=100;e++){if(bt[e]<=bm[e]+1e-15)le++;if(e>1&&bt[e]<bm[e])lt++}
    R.push([le===100&&lt>=95,'"The batch TD method was consistently better than the batch Monte Carlo method": at or below it at <b>'+le+' of 100</b> episodes, strictly below at '+lt+' of the 99 from episode 2.']);
    R.push([null,'After one episode both give each visited state that episode\'s return (0 or 1), an error of '+bt[1].toFixed(3)+', off the top of the book\'s axis. At 100 episodes: batch TD '+bt[100].toFixed(3)+', batch MC '+bm[100].toFixed(3)+'.']);
    R.push([null,'Why TD wins: Monte Carlo fits the returns seen after each state (zero error on the data so far); TD fits a model of the chain and trusts it, which uses each transition for every state that leads into it (Example 6.4 of the book).'])}
  U.checks($('lb-rw-chk'),R)}
let inited=false;
function init(){if(inited)return;inited=true;initAnim();U.seg($('lb-rw-mode'),b=>{S.mode=b.dataset.m;run()});
  $('lb-rw-runs').onchange=e=>{S.runs=+e.target.value;run()};$('lb-rw-seed').onchange=e=>{S.seed=+e.target.value;run()};
  U.watch(sec,()=>{if(!S.res[key()]&&!job)run()})}
U.onRender('t-rw',()=>{init();A.show();plot()});

// =================== Experiment 3: n-step TD, the lambda-return and TD(lambda) on the 19-state walk ===================
const sec3=$('lb-nl'),T3={n:4,l:0.8,ep:0,a:0.4,tr:null,fam:'nstep',runs:100,seed:1,res:{},on:{},ov:true,zm:false};
function trace3(){T3.tr=E.rw19Trace(1,T3.ep,T3.n,T3.l,T3.a)}
function strip19(el,fr,V,mode){const W=Math.max(280,Math.round(el.clientWidth||320)),n=21,cw=W/n,H=mode==='l'?150:128,mid=58,h=40;let s='';
  s+='<line x1="'+cw+'" x2="'+(W-cw)+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--mute)"/>';
  for(let k=0;k<n;k++){const x=k*cw,cx=x+cw/2;
    if(k===0||k===20){s+='<rect x="'+(x+1)+'" y="'+(mid-11)+'" width="'+(cw-2)+'" height="22" rx="3" fill="var(--dim)"/><text x="'+cx+'" y="'+(mid+4)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+(k?'+1':MI+'1')+'</text>';continue}
    const v=Math.max(-1,Math.min(1,V[k])),y=mid-h*v,tv=E.TV19[k],hi=mode==='n'?fr.un===k:(fr.dl&&fr.z[k]>1e-3);
    s+='<rect x="'+(x+cw*0.12)+'" y="'+Math.min(y,mid).toFixed(1)+'" width="'+(cw*0.76)+'" height="'+Math.abs(y-mid).toFixed(1)+'" fill="'+(mode==='n'?'var(--c1)':'var(--c2)')+'" fill-opacity="'+(hi?0.9:0.45)+'"'+(hi?' stroke="var(--ink)" stroke-width="1"':'')+'/>';
    s+='<line x1="'+(x+1)+'" x2="'+(x+cw-1)+'" y1="'+(mid-h*tv).toFixed(1)+'" y2="'+(mid-h*tv).toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="2 2" opacity=".7"/>'}
  const py=mid+h+14,px=fr.pos*cw+cw/2;s+='<circle cx="'+px.toFixed(1)+'" cy="'+py+'" r="4.5" fill="var(--bad)"/>';
  if(mode==='n'&&fr.un>=0){// bracket from the updated state to the state whose estimate it borrows (or to the end)
    const a=fr.un*cw+cw/2,b=(fr.boot>=0?fr.boot:(T3.tr.RT>0?20:0))*cw+cw/2,y=py+11;s+='<path d="M'+a.toFixed(1)+' '+(y-5)+'V'+y+'H'+b.toFixed(1)+'V'+(y-5)+'" fill="none" stroke="var(--c1)" stroke-width="1.5"/>'}
  if(mode==='l'){const zm=Math.max(1,...fr.z),zb=H-6,zh=34;s+='<text x="2" y="'+(zb-zh-3)+'" font-size="9.5" fill="var(--mute)">traces</text>';
    for(let k=1;k<=19;k++){const z=fr.z[k];if(z<=1e-4)continue;const hh=zh*z/zm;s+='<rect x="'+(k*cw+cw*0.2).toFixed(1)+'" y="'+(zb-hh).toFixed(1)+'" width="'+(cw*0.6).toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="var(--c2)" fill-opacity=".6"/>'}}
  el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Estimates of the 19 states">'+s+'</svg>'}
function draw3(i){const tr=T3.tr,fr=tr.F[i];strip19($('lb-nl-va'),fr,fr.Vn,'n');strip19($('lb-nl-vb'),fr,fr.Vl,'l');
  $('lb-nl-sa').innerHTML='RMS error <b>'+E.rms19(fr.Vn).toFixed(3)+'</b>';$('lb-nl-sb').innerHTML='RMS error <b>'+E.rms19(fr.Vl).toFixed(3)+'</b>';
  let t='';if(i===0)t='Episode '+(T3.ep+1)+' starts in the middle state; it will take '+tr.T+' steps and end '+(tr.RT>0?'on the right (+1)':'on the left ('+MI+'1)')+'. Dashed: true values. Bars: current estimates'+(T3.ep===0?', all 0.':'.');
  else{const st=fr.t<tr.T?'Step '+(fr.t+1)+' of '+tr.T+'. ':'The walk has ended; n-step TD finishes its pending updates. ';
    t=st;if(fr.un>=0)t+='<b>n-step</b> updates the state visited '+(T3.n===1?'just now':(T3.n-1)+' step'+(T3.n>2?'s':'')+' ago')+' toward '+(fr.boot>=0?'the estimate of the state '+T3.n+' step'+(T3.n>1?'s':'')+' after it ('+U.f(fr.Gn,3)+')':'the final reward ('+U.f(fr.Gn,0)+')')+': '+U.f(fr.oldn,3)+' to '+U.f(fr.Vn[fr.un],3)+'. ';
    else if(fr.t<T3.n-1)t+='<b>n-step</b> is still waiting for '+T3.n+' steps of experience. ';
    if(T3.ep===0&&fr.t<tr.T-1)t+='(Nothing can move yet: every estimate and every reward so far is 0. Credit arrives only when the walk reaches an end.) ';
    if(fr.dl!==null)t+='<b>TD(λ)</b>: TD error '+U.f(fr.dl,3)+(Math.abs(fr.dl)<1e-12?', so nothing moves.':', shared out to every state in proportion to its trace (bars below).');}
  $('lb-nl-cap').innerHTML=t}
let A3=null;
function initAnim3(){trace3();A3=U.anim({p:'lb-nl',sec:sec3,n:()=>T3.tr.F.length,speeds:[['slow',4],['normal',10],['fast',30]],def:1,draw:draw3,label:i=>'time step '+(i)+' of '+(T3.tr.F.length-1)});A3.show();
  const re=()=>{trace3();A3.i=0;A3.show()};
  $('lb-nl-n').onchange=e=>{T3.n=+e.target.value;re()};$('lb-nl-l').onchange=e=>{T3.l=+e.target.value;re()};$('lb-nl-ep').onchange=e=>{T3.ep=+e.target.value;re()}}
const PAIR={nstep:null,lret:'nstep',tdl:'lret'};
let job3=null,queue=[];
function key3(f){return f+'|'+T3.runs+'|'+T3.seed}
function need(){const f=T3.fam,o=PAIR[f],L2=[f];if(o&&T3.ov)L2.push(o);return L2.filter(x=>!T3.res[key3(x)])}
function run3(){if(job3){job3.cancel=true;job3=null}queue=need();next3();plot3()}
function next3(){if(!queue.length){plot3();checks3();return}const f=queue.shift();$('lb-nl-chk').innerHTML='<li><span class="lb-in">•</span><span>computing '+(f==='nstep'?'n-step TD':f==='lret'?'the off-line λ-return':'TD(λ)')+' over '+E.ALPHAS.length+' step sizes and '+T3.runs+' runs...</span></li>';
  job3=U.job(E.rw19Job({fam:f,seed:T3.seed,runs:T3.runs}),p=>U.prog($('lb-nl-pg'),p),r=>{T3.res[key3(f)]=r;job3=null;plot3();next3()})}
function plot3(){const el=$('lb-nl-ch'),f=T3.fam,r=T3.res[key3(f)],o=PAIR[f],ro=o&&T3.ov?T3.res[key3(o)]:null,fam=E.FAM[f];
  const it=fam.ps.map((p,i)=>({k:f+p,lab:(f==='nstep'?'n = ':'λ = ')+p,c:U.ramp(i,fam.ps.length)}));const ser=[];
  // overlay: Figure 12.6 compares TD(lambda) with the lambda-return at the same lambda (same colour, dashed); Figure 12.3 compares with all of Figure 7.2 (grey, dashed)
  if(ro){const same=f==='tdl';ro.ps.forEach((p,i)=>ser.push({x:ro.as,y:ro.err[i],c:same?it[i].c:'var(--mute)',dash:true,op:same?0.55:0.5,w:1.3,off:same?T3.on[f+p]===false:T3.on.ovl===false}))}
  if(r)r.ps.forEach((p,i)=>ser.push({x:r.as,y:r.err[i],c:it[i].c,dots:true,off:T3.on[f+p]===false}));
  const y=T3.zm?[0.2,1]:[0.25,0.55];
  U.chart(el,{x:[0,1],y,yt:T3.zm?[0.2,0.4,0.6,0.8,1]:[0.25,0.3,0.35,0.4,0.45,0.5,0.55],xt:[0,0.2,0.4,0.6,0.8,1],xl:'step size α',series:ser,hl:[{v:Math.sqrt(0.3),t:'start: 0.548'}],H:el.clientWidth<480?250:300,label:'Error against step size'});
  const leg=it.slice();if(ro)leg.push({k:'ovl',lab:f==='tdl'?'dashed: off-line λ-return, same λ':'dashed: n-step TD, n = 1 to 512',c:'var(--mute)',dash:true});
  U.legend($('lb-nl-lg'),leg,T3.on,plot3)}
function best(r){return r.err.map(row=>{let m=Infinity,a=0;row.forEach((v,j)=>{if(v<m){m=v;a=r.as[j]}});return{m,a}})}
function checks3(){const f=T3.fam,r=T3.res[key3(f)];if(!r)return;const R=[],b=best(r),ps=r.ps,bi=b.reduce((k,x,i)=>x.m<b[k].m?i:k,0);
  const nmv=f==='nstep'?'n':'λ';
  R.push([bi>0&&bi<ps.length-1,'Best '+nmv+' = <b>'+ps[bi]+'</b> (error '+b[bi].m.toFixed(3)+' at α = '+b[bi].a+'): '+(bi>0&&bi<ps.length-1?'an intermediate value, as the book finds; neither end of the dial (one-step TD, or Monte Carlo) is best.':'not intermediate, unlike the book.')]);
  R.push([null,'Best step size by '+nmv+': '+ps.map((p,i)=>p+': '+b[i].a).join(', ')+'. The more an update relies on the actual returns, the smaller the step it can take.']);
  if(f==='lret'){const rn=T3.res[key3('nstep')];if(rn){const bn=best(rn),mn=Math.min(...bn.map(x=>x.m)),ml=b[bi].m,hn=Math.min(...rn.err.map(row=>row[row.length-1])),hl=Math.min(...r.err.map(row=>row[row.length-1]));
      R.push([ml<=mn,'Figure 12.3 caption, "slightly better at the best values": best λ-return '+ml.toFixed(4)+' against best n-step '+mn.toFixed(4)+'.']);
      R.push([hl<hn,'"... and at high α": best at α = 1, '+hl.toFixed(3)+' against '+hn.toFixed(3)+'.'])}}
  if(f==='tdl'){const rl=T3.res[key3('lret')];if(rl){const bl=best(rl);let g=0;r.err.forEach((row,i)=>row.forEach((v,j)=>{if(r.as[j]<=bl[i].a)g=Math.max(g,Math.abs(v-rl.err[i][j]))}));
      let worse=0;for(let i=2;i<8;i++)if(!(r.err[i][r.as.length-1]<rl.err[i][rl.as.length-1]))worse++;
      R.push([worse===6,'Figure 12.6, "TD(λ) was worse at high α values": at α = 1 it is worse for all '+worse+' values of λ from 0.8 up, and for λ ≥ 0.9 its values blow up (the curves leave the chart).']);
      R.push([g<0.035?null:false,'"Virtually identically at low (less than optimal) α": the largest gap at step sizes up to each λ\'s best is '+g.toFixed(3)+'. Close, not identical: TD(λ) updates during the episode, the off-line λ-return only at its end.'])}}
  if(f==='nstep')R.push([Math.abs(r.err[0][0]-Math.sqrt(0.3))<1e-12,'At α = 0 nothing is learned, so every curve starts at √0.3 = 0.548, the top of the book\'s axis (0.55).']);
  U.checks($('lb-nl-chk'),R)}
let in3=false;
function init3(){if(in3)return;in3=true;initAnim3();
  U.seg($('lb-nl-fam'),b=>{T3.fam=b.dataset.f;run3()});$('lb-nl-ov').onchange=e=>{T3.ov=e.target.checked;run3()};$('lb-nl-zm').onchange=e=>{T3.zm=e.target.checked;plot3()};
  $('lb-nl-runs').onchange=e=>{T3.runs=+e.target.value;run3()};$('lb-nl-seed').onchange=e=>{T3.seed=+e.target.value;run3()};
  U.watch(sec3,()=>{if(!T3.res[key3(T3.fam)]&&!job3)run3()})}
U.onRender('t-nl',()=>{init3();A3.show();plot3()});
window.LB_TEST=Object.assign(window.LB_TEST||{},{rw:()=>({A,S}),nl:()=>({A3,T3,busy:()=>!!job3||queue.length>0}),rwBusy:()=>!!job});
})();
