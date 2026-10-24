// ---- Reading section 7: Baird's counterexample with one leg of the deadly triad switched off at a time. Engine: MFE.triadRun (21_js_mf_engine.js), checked by src/checks/recompute.py.
(function(){
'use strict';
const U=window.LBU,M=window.MFE;if(!U||!M||!document.getElementById('rd-triad'))return;const $=U.$;
const S={fa:'linear',tg:'td',dist:'off'},N=1000,cache={},on={};
const run=(fa,tg,dist)=>{const k=fa+tg+dist;return cache[k]||(cache[k]=M.triadRun({fa,tg,dist,sweeps:N}))};
const NM={linear:'linear features',table:'a table',td:'bootstrap',mc:'Monte Carlo target',off:'off-policy',on:'on-policy'};
function draw(){const r=run(S.fa,S.tg,S.dist),all=run('linear','td','off'),xs=[];for(let i=0;i<=N;i++)xs.push(i);
  const three=S.fa==='linear'&&S.tg==='td'&&S.dist==='off',ser=[];
  if(!three)ser.push({x:xs,y:all.vmax,c:'var(--mute)',dash:true,w:1.4,off:on.all===false});
  ser.push({x:xs,y:r.vmax,c:three?'var(--bad)':'var(--good)',w:2.2,off:on.cur===false});
  U.chart($('rd-triP'),{x:[0,N],y:[0.1,1000],log:true,yt:[0.1,1,10,100,1000],yf:v=>String(v),xt:[0,250,500,750,1000],xl:'sweeps',series:ser,label:'Largest absolute estimated value over sweeps'});
  const lab=NM[S.fa]+', '+NM[S.tg]+', '+NM[S.dist];
  U.legend($('rd-triL'),(three?[]:[{k:'all',lab:'all three legs',c:'var(--mute)',dash:true}]).concat([{k:'cur',lab:three?'all three legs':lab,c:three?'var(--bad)':'var(--good)'}]),on,draw);
  const grow=r.vmax[N]>r.vmax[0],legs=(S.fa==='linear')+(S.tg==='td')+(S.dist==='off'),w=r.w[N];
  $('rd-triO').innerHTML=RD.stat('Legs present',legs+' of 3',three?'function approximation, bootstrapping, off-policy':lab)+
    RD.stat('Largest |value|',U.f(r.vmax[0],1)+' &rarr; <b>'+U.f(r.vmax[N],S.fa==='linear'&&r.vmax[N]<10?2:1)+'</b>','start and after '+N.toLocaleString('en-US')+' sweeps')+
    RD.stat(grow?'Growing':'Not growing',grow?'diverges':'bounded',S.fa==='linear'?'w<sub>8</sub> = '+U.f(w[7],2)+', w<sub>7</sub> = '+U.f(w[6],2):'v(7) = '+U.f(w[6],2)+', upper states '+U.f(w[0],2))}
['rd-triF','rd-triT','rd-triD'].forEach((id,j)=>U.seg($(id),b=>{S[['fa','tg','dist'][j]]=b.dataset.m;draw()}));
U.onRender('t-read',draw);
window.LB_TEST=Object.assign(window.LB_TEST||{},{triad:()=>({S,run})});
})();
