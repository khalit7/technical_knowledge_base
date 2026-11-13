// ---- The paper tab: small live charts and the predict reveals (the polarisation stage is 31_js_sc_tasks.js) ----
// kchart: pass@k (solid) and pass^k (dashed) curves on a log2 budget axis; series [{n, c, cov, con}]
window.kchart=function(w,series,o){o=o||{};const H=o.H||(w<480?230:260),K=o.K||128,lg=Math.log2;
  const F=linFrame({W:w,H,pl:42,pr:w<480?12:20,pt:12,pb:34,x:[0,lg(K)],y:[0,1],xt:[0,1,2,3,4,5,6,7].filter(v=>v<=lg(K)),fx:v=>String(2**v),fy:v=>Math.round(v*100)+'%',yt:[0,.25,.5,.75,1],xl:'budget k (attempts per task)'});
  let s=F.s;const step=w<480?2:1;
  series.forEach(S=>{const pts=[],pc=[];for(let k=1;k<=K;k+=k<16?1:step){pts.push([lg(k),S.cov[k-1]]);if(S.con&&!o.noCon)pc.push([lg(k),S.con[k-1]])}
    pts.push([lg(K),S.cov[K-1]]);s+=lineS(pts,F.X,F.Y,S.c,{sw:2.2});if(pc.length)s+=lineS(pc,F.X,F.Y,S.c,{sw:1.5,da:'5 3',op:.85})});
  if(o.cross){const x=F.X(lg(o.cross));s+=ln2(x,12,x,H-34,'var(--mute)',{da:'3 3'})+tx(Math.min(x+4,w-70),24,'k* = '+o.cross,{fs:11,c:'var(--mute)'})}
  const L=legendW(series.map(S=>[S.n,S.c,'l']).concat(o.noCon?[]:[['dashed: pass^k','var(--mute)','da']]),46,H+14,w-50);
  return svgW(w,H+L.h+6,s+L.s,o.label||'pass@k curves')};
(function(){
const P=window.PAPER;if(!P)return;
const CB='var(--c6)',CP='var(--c2)';
const pct=(v,d)=>(100*v).toFixed(d==null?1:d)+'%';
// 1. one task: pass@k and pass^k from c successes of 128
(function(){const el=$('oneSvg');if(!el)return;const sl=$('oneC');
  const go=w=>{const c=+sl.value;$('oneCv').textContent=c;const cv=CX.curves([c],128,128);el.innerHTML=kchart(w,[{n:'one task, '+c+' of 128',c:CB,cov:cv.cov,con:cv.con}],{H:w<480?190:210,label:'pass@k of one task'});
    $('oneNote').innerHTML='pass@1 '+pct(cv.cov[0])+', pass@8 '+pct(cv.cov[7])+', pass@32 '+pct(cv.cov[31])+', pass@128 '+pct(cv.cov[127])+'; consistency pass^8 '+pct(cv.con[7])+'. '+(c===0?'Never solved: no budget helps.':c===128?'Always solved: extra attempts add nothing.':'Somewhere in between: this is the only kind of task more attempts can turn into a success.')};
  sl.addEventListener('input',()=>refit(el));onTab('t-read',()=>refit(el));fit(el,go)})();
// 2. predict reveal: the crossover on gemma-4-31B WebShop, from the released counts
PRED_REVEAL['pr-cross']=()=>{const el=$('crossSvg'),cell=CX.get('webshop','gemma-4-31B'),st=CX.stats(cell);
  fit(el,w=>{el.innerHTML=kchart(w,[{n:'base + harness',c:CB,cov:st.b.cov,con:st.b.con},{n:'post-trained (-it)',c:CP,cov:st.p.cov,con:st.p.con}],{cross:st.cross,label:'gemma-4-31B WebShop'})})};
// 3. the polarisation stage is the 3D scene 31_js_sc_tasks.js (Stage 1, since 2026-11-13)
// 4. per-task retry value a_K(p)
(function(){const el=$('akSvg');if(!el)return;const sp=$('akP'),sk=$('akK');
  const aK=(p,K)=>{let a=0;const qK=Math.pow(1-p,K);for(let k=1;k<K;k++)a+=Math.pow(1-p,k)-qK;return a};
  const go=w=>{const p=+sp.value,K=+sk.value;$('akPv').textContent=p.toFixed(3);const H=w<480?180:200;let mx=0;const pts=[];for(let i=0;i<=200;i++){const q=i/200,v=aK(q,K);pts.push([q,v]);if(v>mx)mx=v}
    const F=linFrame({W:w,H,pl:42,pr:14,pt:10,pb:34,x:[0,1],y:[0,mx*1.08],fx:v=>v.toFixed(2),xl:'per-attempt success probability p',yl:'a_K(p)'});
    const v=aK(p,K);el.innerHTML=svgW(w,H,F.s+lineS(pts,F.X,F.Y,CB,{sw:2.2})+dotS(F.X(p),F.Y(v),5,CP),'per-task retry value');
    $('akNote').innerHTML='At p = '+p.toFixed(3)+' and K = '+K+', the task adds <b>'+v.toFixed(2)+'</b> to A(K): the expected number of failed attempts before a success inside the budget. The curve is zero at p = 0 and p = 1 and peaks at a small p, '+(pts.reduce((a,b)=>b[1]>a[1]?b:a)[0]).toFixed(3)+' for this K: rare-but-possible tasks carry most of the retry value.'};
  sp.addEventListener('input',()=>refit(el));sk.addEventListener('change',()=>refit(el));onTab('t-read',()=>refit(el));fit(el,go)})();
// 5. the Figure 7 split check numbers
(function(){const f=P.rc&&P.rc.fig7;if(!f||!$('f7m'))return;$('f7m').textContent=f.rho_mean.toFixed(2);$('f7r').textContent=f.rho_p5.toFixed(2)+' to '+f.rho_p95.toFixed(2);$('f7f').textContent='ρ = '+f.full_data_rho.toFixed(2)})();
// 6. Theorem 2 on real tasks: sharpen a share lambda of gemma-4-31B's WebShop base tasks
PRED_REVEAL['pr-thm2']=()=>{const el=$('t2Svg'),sl=$('t2L'),sz=$('t2Z'),cell=CX.get('webshop','gemma-4-31B'),T=cell.T;
  const order=[...Array(T).keys()],r=mulberry32(2024);for(let i=T-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  const base=CX.curves(cell.cb,128,128),sb=CX.scal(base.cov,128);
  const go=w=>{const lam=+sl.value,z=+sz.value;$('t2Lv').textContent=lam.toFixed(2);$('t2Zv').textContent=z.toFixed(2);
    const m=Math.round(lam*T),m0=Math.round(z*m),c=Int16Array.from(cell.cb);for(let i=0;i<m;i++)c[order[i]]=i<m0?0:128;
    const post=CX.curves(c,128,128),sp=CX.scal(post.cov,128),eps=1-base.cov[0],l0=m0/T,lm=m/T;
    const ratioPred=(1-lm)*eps/((1-lm)*eps+l0);
    el.innerHTML=kchart(w,[{n:'base (real counts)',c:CB,cov:base.cov},{n:'base with '+m+' of '+T+' tasks sharpened',c:CP,cov:post.cov}],{noCon:true,H:w<480?200:220,label:'Theorem 2 lab'});
    $('t2Note').innerHTML='Measured Tax<sub>A</sub>(128) = <b>'+(sb.A-sp.A).toFixed(2)+'</b>; Theorem 2 predicts λ·A<sub>Base</sub> = '+lm.toFixed(3)+' × '+sb.A.toFixed(2)+' = <b>'+(lm*sb.A).toFixed(2)+'</b> (equal in expectation; the gap is which tasks the seeded draw picked). pass@1: '+pct(base.cov[0])+' → '+pct(post.cov[0])+'. S<sub>Post</sub>/S<sub>Base</sub> measured <b>'+(sp.S/sb.S).toFixed(3)+'</b>, Eq. 6 predicts <b>'+ratioPred.toFixed(3)+'</b>, so Tax<sub>S</sub> = '+(sb.S-sp.S).toFixed(3)+'.'};
  sl.addEventListener('input',()=>refit(el));sz.addEventListener('input',()=>refit(el));fit(el,go)};
// 7. the tempering rule, Eq. 4
(function(){const el=$('trSvg');if(!el)return;const st=$('trT'),sp=$('trP');
  const go=w=>{const tau=+st.value,pv=+sp.value;$('trTv').textContent=tau.toFixed(2);$('trPv').textContent=pv.toFixed(2);const H=w<480?190:210;
    const F=linFrame({W:w,H,pl:42,pr:14,pt:10,pb:34,x:[0,1],y:[0.45,2.05],yt:[0.5,1,1.5,2],fx:v=>v.toFixed(2),fy:v=>v.toFixed(1),xl:'Thompson draw p̂ of the prompt\'s success rate',yl:'temperature T'});
    const pts=[];for(let i=0;i<=200;i++){const p=i/200;pts.push([p,TOY.tempFromP(p,pv,tau,1)])}
    let s=F.s+ln2(F.X(0),F.Y(1),F.X(1),F.Y(1),'var(--mute)',{da:'3 3'})+lineS(pts,F.X,F.Y,'var(--c1)',{sw:2.4})+dotS(F.X(pv),F.Y(1),4,'var(--c1)');
    s+=tx(F.X(0.02),F.Y(tau)-6,'hard: heat to '+tau.toFixed(2),{fs:11,c:'var(--bad)'})+tx(F.X(0.98),F.Y(1/tau)+14,'easy: cool to '+(1/tau).toFixed(2),{fs:11,a:'end',c:'var(--good)'});
    el.innerHTML=svgW(w,H,s,'PTGS tempering rule');
    $('trNote').innerHTML='T(0) = τ = '+tau.toFixed(2)+', T(p̃) = 1, T(1) = 1/τ = '+(1/tau).toFixed(2)+'. With p̃ = 0.5 the rule is T = τ<sup>1 − 2p̂</sup> (Appendix A.5). log T is piecewise linear in p̂, steeper on the side with less room'+(Math.abs(pv-0.5)<1e-9?'.':': with p̃ = '+pv.toFixed(2)+' the '+(pv<0.5?'hard':'easy')+' side is steeper.')};
  st.addEventListener('input',()=>refit(el));sp.addEventListener('input',()=>refit(el));onTab('t-read',()=>refit(el));fit(el,go)})();
// 8. the toy's hotter-at-test-time reveal
PRED_REVEAL['pr-hot']=()=>{const h=window.TOYD&&TOYD.hot;if(!h)return;let s='<div class="tw"><table class="t3"><thead><tr><th>test temperature</th><th class="num">pass@1</th><th class="num">pass@128</th></tr></thead><tbody>';
  Object.keys(h).sort((a,b)=>a-b).forEach(t=>{s+='<tr><td>'+(+t).toFixed(1)+(+t===1?' (training temperature)':'')+'</td><td class="num">'+pct(h[t].p1)+'</td><td class="num">'+pct(h[t].pK)+'</td></tr>'});
  $('hotOut').innerHTML=s+'</tbody></table></div><p class="small mute">Measured in your browser\'s engine by toy_sweep.mjs (10 seeds, deterministic); the toy is described in the Train with PTGS tab.</p>'};
// 9. Table 2 as printed
(function(){const tb=$('t2tab');if(!tb)return;let s='',last='';P.tables.t2.rows.forEach(r=>{s+='<tr'+(r.method.includes('PTGS')?' class="basec"':'')+'><td>'+(r.env!==last?r.env:'')+'</td><td>'+r.method+'</td><td class="num">'+r.p1.toFixed(1)+'</td><td class="num">'+r.p128.toFixed(1)+'</td><td class="num">'+(r.taxS==null?'–':r.taxS.toFixed(3))+'</td></tr>';last=r.env});tb.querySelector('tbody').innerHTML=s})();
})();
