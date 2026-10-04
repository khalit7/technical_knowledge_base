// ---- Section 2: the deadly triad, w -> 2w and Baird's counterexample, off-policy against on-policy distribution ----
(function(){
  const E=window.VBE;
  const Gs=document.getElementById('vb-trG'),As=document.getElementById('vb-trA'),D=document.getElementById('vb-trD'),P=document.getElementById('vb-trP'),
    Tt=document.getElementById('vb-trT'),Xp=document.getElementById('vb-trE'),Nt=document.getElementById('vb-trN'),Sl=document.getElementById('vb-trS');
  let ex='w2w',mode='off';const STEPS=30,SW=1000,BK=20;// Baird: 1000 sweeps shown in 50 frames of 20 sweeps
  let bcache=null;const bairdRuns=()=>bcache||(bcache={off:E.baird(0.01,SW,'uniform'),on:E.baird(0.01,SW,'on')});
  const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹',sup=e=>(e<0?'⁻':'')+String(Math.abs(e)).split('').map(d=>SUP[+d]).join('');
  const fmt=v=>{if(v!==0&&(Math.abs(v)>=1e4||Math.abs(v)<1e-3)){const e=Math.floor(Math.log10(Math.abs(v)));return RD.n(v/Math.pow(10,e),2)+' × 10'+sup(e)}return RD.n(v,Math.abs(v)<10?3:1)};
  function logChart(series,n,lab){const W=RD.width(P),H=170,l=40,r=8,t=10,b=24,lg=v=>Math.log10(Math.max(1e-6,Math.abs(v)));
    const all=[];series.forEach(s=>s.ys.forEach(v=>all.push(lg(v))));const lo=Math.max(-6,Math.floor(Math.min(...all))),hi=Math.max(Math.ceil(Math.max(...all)),lo+1);
    const X=j=>l+(W-l-r)*j/n,Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let c='';const stepE=Math.max(1,Math.ceil((hi-lo)/5));
    for(let e=lo;e<=hi;e+=stepE)c+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(e).toFixed(1)+'" y2="'+Y(e).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(e)+4,'10'+sup(e),{a:'end',fs:10.5,fill:'var(--mute)'});
    series.forEach(s=>{c+='<polyline fill="none" stroke="'+s.col+'" stroke-width="'+(s.w||1.6)+'" opacity="'+(s.op||1)+'"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+' points="'+s.ys.map((v,j)=>X(j).toFixed(1)+','+Y(lg(v)).toFixed(1)).join(' ')+'"/>';
      if(s.lab){const j=s.ys.length-1;c+=RD.t(Math.min(W-r-2,X(j)+3),Y(lg(s.ys[j]))-4,s.lab,{fs:10,fill:s.col,a:X(j)>W-90?'end':'start'})}});
    c+=RD.t(l,H-6,lab[0],{fs:10,fill:'var(--mute)'})+RD.t(W-r,H-6,lab[1],{a:'end',fs:10,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,c,'Weights on a logarithmic scale')}
  function drawW2W(i){const g=+Gs.value/100,a=+As.value/100;document.getElementById('vb-trGv').textContent=g.toFixed(2);document.getElementById('vb-trAv').textContent=a.toFixed(2);
    const off=E.triad(g,a,'off',STEPS),on=E.triad(g,a,'on',STEPS),ws=mode==='off'?off:on,w=ws[i];
    const W=RD.width(D),H=150,x1=W*0.2,x2=W*0.55,x3=W*0.86,y=70,r=Math.min(34,W*0.1);
    let s='<defs><marker id="vb-trAr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    s+='<circle cx="'+x1+'" cy="'+y+'" r="'+r+'" fill="'+RD.colorScale(Math.min(1,Math.abs(w)/100),-1,1)+'" stroke="var(--line)"/>'+RD.t(x1,y-4,'w',{a:'middle',fs:12,w:600})+RD.t(x1,y+12,fmt(w),{a:'middle',fs:10.5});
    s+='<circle cx="'+x2+'" cy="'+y+'" r="'+r+'" fill="'+RD.colorScale(Math.min(1,Math.abs(2*w)/100),-1,1)+'" stroke="var(--line)"/>'+RD.t(x2,y-4,'2w',{a:'middle',fs:12,w:600})+RD.t(x2,y+12,fmt(2*w),{a:'middle',fs:10.5});
    s+='<line x1="'+(x1+r)+'" x2="'+(x2-r-3)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c1)" stroke-width="2.5" marker-end="url(#vb-trAr)"/>'+RD.t((x1+x2)/2,y-8,'reward 0',{a:'middle',fs:10,fill:'var(--mute)'});
    s+='<line x1="'+(x2+r)+'" x2="'+(x3-14)+'" y1="'+y+'" y2="'+y+'" stroke="'+(mode==='on'?'var(--c3)':'var(--dim)')+'" stroke-width="'+(mode==='on'?2.5:1.5)+'"'+(mode==='on'?'':' stroke-dasharray="4 4"')+' marker-end="url(#vb-trAr)"/>'+RD.t(x3,y+4,'end',{a:'middle',fs:11,fill:'var(--mute)'});
    s+=RD.t((x2+x3)/2,y-8,mode==='on'?'updated':'never updated',{a:'middle',fs:10,fill:mode==='on'?'var(--c3)':'var(--mute)'});
    s+=RD.t(W/2,135,'features 1 and 2, one shared weight w',{a:'middle',fs:10,fill:'var(--mute)'});
    D.innerHTML=RD.svg(W,H,s,'Two states sharing a weight');
    logChart([{ys:off.slice(0,i+1),col:'var(--c2)',w:mode==='off'?2.6:1.2,op:mode==='off'?1:.5,lab:'off-policy'},{ys:on.slice(0,i+1),col:'var(--c3)',w:mode==='on'?2.6:1.2,op:mode==='on'?1:.5,lab:'on-policy'}],STEPS,['update 0','update '+STEPS]);
    const fac=1+a*(2*g-1),facOn=fac*(1-4*a);
    Tt.textContent=(mode==='off'?'Off-policy':'On-policy')+', after '+i+' update'+(i===1?'':'s')+': w = '+fmt(w);
    Xp.innerHTML=mode==='off'?'TD error on the w → 2w transition: γ·2w − w = (2γ − 1)w = '+fmt((2*g-1)*w)+'. Each update multiplies w by 1 + α(2γ − 1) = '+RD.n(fac,3)+(fac>1?': it grows without bound, whatever α is, because γ &gt; 0.5.':': it shrinks, because γ ≤ 0.5.'):
      'Each visit now also updates the 2w state toward 0 (its gradient is 2, its feature), multiplying w by 1 − 4α. Per round the factor is '+RD.n(fac,3)+' × '+RD.n(1-4*a,3)+' = '+RD.n(facOn,3)+(Math.abs(facOn)<1?': the estimate is pulled back to 0, the true value.':': at this large α the on-policy updates overshoot too (|factor| ≥ 1); lower α.');
    Nt.innerHTML='Starting from <i>w</i> = 10, as in Sutton and Barto\'s text. On-policy here means each visit to the first state is followed by the 2<i>w</i> state\'s own update, a transition to the end with reward 0. Vertical axis: |<i>w</i>| on a logarithmic scale.'}
  function drawBaird(i){const R=bairdRuns(),k=i*BK,run=mode==='off'?R.off:R.on,w=run[k];
    const W=RD.width(D),H=170;let s='';const cx=W/2,top=26,bw=Math.min(54,(W-20)/6.6),gap=(W-6*bw)/7;
    const X=x=>{const v=x.reduce((a,b,j)=>a+b*w[j],0);return v};
    const vals=[0,1,2,3,4,5,6].map(st=>X(E.bairdX(st)));
    for(let j=0;j<6;j++){const x=gap+j*(bw+gap);s+='<rect x="'+x.toFixed(1)+'" y="'+top+'" width="'+bw.toFixed(1)+'" height="34" rx="16" fill="'+RD.colorScale(Math.min(1,Math.abs(vals[j])/300),-1,1)+'" stroke="var(--line)"/>'+RD.t(x+bw/2,top+14,'2w'+(j+1)+'+w8',{a:'middle',fs:9,fill:'var(--mute)'})+RD.t(x+bw/2,top+27,fmt(vals[j]),{a:'middle',fs:10,w:600});
      s+='<line x1="'+(x+bw/2).toFixed(1)+'" y1="'+(top+36)+'" x2="'+cx+'" y2="'+(top+86)+'" stroke="'+(mode==='off'?'var(--c2)':'var(--dim)')+'" stroke-width="'+(mode==='off'?1.3:1)+'"/>'}
    s+='<rect x="'+(cx-50)+'" y="'+(top+88)+'" width="100" height="36" rx="17" fill="'+RD.colorScale(Math.min(1,Math.abs(vals[6])/300),-1,1)+'" stroke="'+(mode==='on'?'var(--c3)':'var(--line)')+'" stroke-width="'+(mode==='on'?2:1)+'"/>'+RD.t(cx,top+102,'w7+2w8',{a:'middle',fs:9,fill:'var(--mute)'})+RD.t(cx,top+116,fmt(vals[6]),{a:'middle',fs:10,w:600});
    s+=RD.t(W/2,H-6,mode==='off'?'all seven states updated equally (behaviour policy)':'only state 7 updated (target policy\'s distribution)',{a:'middle',fs:10,fill:mode==='off'?'var(--c2)':'var(--c3)'});
    s+=RD.t(4,12,'every transition: solid action to state 7, reward 0; true values all 0',{fs:9.5,fill:'var(--mute)'});
    D.innerHTML=RD.svg(W,H,s,'Baird counterexample');
    const sub=(a,j)=>a.filter((_,q)=>q%BK===0).slice(0,i+1).map(x=>x[j]);
    const v7=(a)=>a.filter((_,q)=>q%BK===0).slice(0,i+1).map(x=>x[6]+2*x[7]);
    logChart([{ys:v7(R.off),col:'var(--c2)',w:mode==='off'?2.4:1.1,op:mode==='off'?1:.5,lab:'V(7), uniform'},{ys:sub(R.off,7),col:'var(--c2)',w:mode==='off'?1.4:1,op:mode==='off'?1:.45,dash:'4 3',lab:'w8'},
      {ys:v7(R.on),col:'var(--c3)',w:mode==='on'?2.4:1.1,op:mode==='on'?1:.5,lab:'V(7), on-policy'}],SW/BK,['sweep 0','sweep '+SW]);
    const v7now=vals[6];
    Tt.textContent=(mode==='off'?'Uniform (off-policy) expected updates':'On-policy expected updates')+', after '+k+' sweeps: w8 = '+fmt(w[7])+', w1 to w6 = '+fmt(w[0]);
    Xp.innerHTML=mode==='off'?'Every state is updated toward γ times state 7\'s value. The upper states share w8, and raising them to meet that target also raises state 7, so the target keeps moving away: w8 and w1 to w6 grow without bound, for any α &gt; 0.':
      'Only state 7 is updated, toward γ times its own value: its value '+fmt(v7now)+' shrinks by a factor 1 − 5α(1 − γ) = '+RD.n(1-5*0.01*0.01,4)+' per sweep (its feature vector has squared length 5). Slow, but it converges.';
    Nt.innerHTML='α = 0.01, γ = 0.99, <b>w</b><sub>0</sub> = (1, 1, 1, 1, 1, 1, 10, 1), expected updates as in equation 11.9 (Sutton and Barto, Figure 11.2 right). Right: the value of state 7 under each distribution, and w8 under the uniform one, on a logarithmic scale (the true value is 0). The γ and α sliders apply to the two-state example only.'}
  function draw(i){Sl.style.opacity=ex==='w2w'?1:.4;Gs.disabled=As.disabled=ex!=='w2w';(ex==='w2w'?drawW2W:drawBaird)(i)}
  const an=RD.anim({card:'vb-tr',ctl:'vb-trC',n:STEPS+1,ms:450,draw,label:'Update'});
  const seg=(id,f)=>document.getElementById(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));f(b)});
  seg('vb-trX',b=>{ex=b.dataset.x;an.reset(ex==='w2w'?STEPS+1:SW/BK+1);an.play()});
  seg('vb-trM',b=>{mode=b.dataset.m;an.reset(ex==='w2w'?STEPS+1:SW/BK+1);an.play()});
  Gs.addEventListener('input',()=>an.redraw());As.addEventListener('input',()=>an.redraw());RD.onResize(()=>an.redraw());
  // soft-divergence rates printed on van Hasselt et al. (2018) Figure 2
  RD.bars(document.getElementById('vb-sd'),[
    {nm:'Q-learning',note:'online network bootstraps',v:61,lab:'61%',col:'var(--c2)'},
    {nm:'Inverse double Q',note:'double, online bootstrap',v:33,lab:'33%',col:'var(--c5)'},
    {nm:'Target Q-learning',note:'DQN\'s target',v:14,lab:'14%',col:'var(--c1)'},
    {nm:'Double Q-learning',note:'Double DQN\'s target',v:10,lab:'10%',col:'var(--c3)'}],{lo:0,hi:100});
})();
