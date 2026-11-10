// ---- Scene (Forward or reverse KL, Fig. 2): a one-bump student fitted to a two-mode teacher by exact gradient descent, both directions (renderer v2) ----
// Illustrative teacher and student family; the 40 steps of each fit are computed here (the same engine as the 2026-10-23 widget): rows in depth are
// the teacher, the forward-KL student and the reverse-KL student, one column per token; each fit plays its 40 steps within one explained step.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-kl')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const N=40,STEPS=40,C1=11,C2=29,SD=2.5,VAL=[16,24];
  function teacher(w){const a=[];let s=0;for(let i=0;i<N;i++){const v=w*Math.exp(-((i-C1)**2)/(2*SD*SD))+(1-w)*Math.exp(-((i-C2)**2)/(2*SD*SD));a.push(v);s+=v}return a.map(v=>v/s)}
  function logq(mu,ls){const sg=Math.exp(ls),l=[];let m=-Infinity;for(let i=0;i<N;i++){const v=-((i-mu)**2)/(2*sg*sg);l.push(v);if(v>m)m=v}
    let z=0;l.forEach(v=>z+=Math.exp(v-m));z=m+Math.log(z);return l.map(v=>v-z)}
  const fkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++)if(p[i]>0)s+=p[i]*(Math.log(p[i])-lq[i]);return s};
  const rkl=(p,mu,ls)=>{const lq=logq(mu,ls);let s=0;for(let i=0;i<N;i++){const q=Math.exp(lq[i]);s+=q*(lq[i]-Math.log(Math.max(p[i],1e-300)))}return s};
  function run(p,f,mu0){let mu=mu0,ls=Math.log(2);const out=[[mu,ls]];const h=1e-4;
    for(let k=0;k<STEPS;k++){const gm=(f(p,mu+h,ls)-f(p,mu-h,ls))/(2*h),gs=(f(p,mu,ls+h)-f(p,mu,ls-h))/(2*h);
      mu-=Math.max(-1.5,Math.min(1.5,8*gm));ls-=Math.max(-0.15,Math.min(0.15,0.15*gs));out.push([mu,ls])}return out}
  const mass=(a,x,y)=>{let s=0;for(let i=x;i<=y;i++)s+=a[i];return s};
  function compute(w,s0){const p=teacher(w),f=run(p,fkl,s0),r=run(p,rkl,s0),Q=t=>t.map(([mu,ls])=>logq(mu,ls).map(Math.exp));
    const qf=Q(f),qr=Q(r);let mx=Math.max(...p);[qf,qr].forEach(a=>a.forEach(q=>mx=Math.max(mx,...q)));
    const near=Math.abs(s0-C1)<Math.abs(s0-C2)?'left':'right';return {p,w,s0,f,r,qf,qr,mx,near}}
  let T=compute(.6,22);
  const pc=x=>(100*x).toFixed(1)+'%';
  function stats(m){const t=T[m][STEPS];return {mu:t[0],sg:Math.exp(t[1]),F:fkl(T.p,t[0],t[1]),R:rkl(T.p,t[0],t[1]),val:mass(T[m==='f'?'qf':'qr'][STEPS],VAL[0],VAL[1])}}
  function writeList(){const set=(k,h)=>document.querySelectorAll('[data-kl="'+k+'"]').forEach(e=>e.innerHTML=h),F=stats('f'),Rv=stats('r'),pv=mass(T.p,VAL[0],VAL[1]);
    set('w',Math.round(100*T.w)+'%');set('pv',pc(pv));set('pv2',pc(pv));set('s0',T.s0);set('fend','centre '+F.mu.toFixed(1)+', width '+F.sg.toFixed(1));set('fv',pc(F.val));set('fv2',pc(F.val));
    set('near',T.near);set('rend','centre '+Rv.mu.toFixed(1)+', width '+Rv.sg.toFixed(1));set('rv',pc(Rv.val));
    const bigger=T.w>=.5?'left':'right';set('note','It picked the '+T.near+' mode because it started nearer'+(T.near===bigger?', which here is also the larger one: move the start past the middle and it picks the smaller.':', even though that mode holds less of the teacher\'s mass.'));
    $('klN').innerHTML=RD.stat('Forward-KL student','centre '+F.mu.toFixed(1)+', width '+F.sg.toFixed(1),'forward KL '+F.F.toFixed(3)+' · reverse KL '+F.R.toFixed(3)+' nats')+
      RD.stat('Reverse-KL student','centre '+Rv.mu.toFixed(1)+', width '+Rv.sg.toFixed(1),'forward KL '+Rv.F.toFixed(3)+' · reverse KL '+Rv.R.toFixed(3)+' nats')+
      RD.stat('Mass between the modes','forward '+pc(F.val)+' · reverse '+pc(Rv.val),'teacher '+pc(pv)+' (tokens '+VAL[0]+' to '+VAL[1]+')')}
  const X=i=>-4.1+i*.21,ZT=-2.1,ZF=0,ZR=2.1,CW=.15;
  function row(R,z,q,col,a,HS){R.box([(X(0)+X(N-1))/2,0,z],[X(N-1)-X(0)+.4,.035,.62],{a:Math.min(1,a+.2),shadow:false});
    for(let i=0;i<N;i++){const h=Math.min(2.5,Math.max(.008,q[i]*HS));R.box([X(i),.035,z],[CW,h,.4],{fill:col,a,shadow:false,lw:.6})}}
  function draw(R,k,e){const P=R.P,HS=1.25/Math.max(...T.p);R.grid(-5,5,-2.6,2.6,.5);
    // the valley between the modes, shaded on the floor across all three rows
    const va=k===4?.55+.3*e:.22;R.quad([[X(VAL[0])-.1,.002,ZT-.45],[X(VAL[1])+.1,.002,ZT-.45],[X(VAL[1])+.1,.002,ZR+.45],[X(VAL[0])-.1,.002,ZR+.45]],{fill:P.c5,fa:va*.35,ec:P.c5,ea:va*.7,dash:[4,4]});
    if(k===0||k===4)R.label([(X(VAL[0])+X(VAL[1]))/2,0,k===0?ZT+.5:ZR+.5],'valley, tokens 16 to 24',{mono:true,fs:12,c:P.c5,dy:14,a:k===0?e:1});
    // 1. the teacher
    const ta=k===0?Math.min(1,e*1.4):k===1?1:.85;row(R,ZT,T.p,mix(P.paper,P.ink,.35),ta,HS);
    R.label([X(0)-.25,.2,ZT],'teacher p',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,grp:'row',a:ta});
    if(k===0){R.label([X(C1),1.3,ZT],Math.round(100*T.w)+'% of the mass',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:e});R.label([X(C2),Math.min(2.5,T.p[C2]*HS)+.05,ZT],Math.round(100*(1-T.w))+'%',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:e})}
    if(k===0)return;
    // 2. and 3. the two students: frame 0 until their own step plays its 40 gradient steps
    const fFrame=k===1?0:k===2?Math.round(e*STEPS):STEPS,rFrame=k<=2?0:k===3?Math.round(e*STEPS):STEPS;
    const fa=k===1?Math.min(1,e*1.5):k===3?.4:1,ra=k===1?Math.min(1,e*1.5):k===2?.4:1;
    row(R,ZF,T.qf[fFrame],mix(P.paper,P.c1,.85),fa,HS);row(R,ZR,T.qr[rFrame],mix(P.paper,P.c2,.85),ra,HS);
    R.label([X(0)-.25,.2,ZF],'forward KL(p ‖ q)',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c1,grp:'row',a:Math.max(.5,fa)});
    R.label([X(0)-.25,.2,ZR],'reverse KL(q ‖ p)',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c2,grp:'row',a:Math.max(.5,ra)});
    if(k===2||k===3){const fr=k===2?fFrame:rFrame;R.label([X(N-1)+.2,0,k===2?ZF:ZR],'step '+fr+' of '+STEPS,{al:'left',dx:8,mono:true,fs:12.5,b:1,c:k===2?P.c1:P.c2,wide:1})}
    if(k===1){R.label([X(T.s0),0,ZR+.35],'start: token '+T.s0+', width 2',{mono:true,fs:12.5,b:1,dy:14,c:P.ink,a:e})}
    // the pull: forward KL is weighted by the teacher, so both modes stream into the student; reverse KL by the student, so only the mode under it does
    if(k===2){[[C1,T.w],[C2,1-T.w]].forEach(([c,wt])=>{const mu=T.f[fFrame][0];R.flowArc([X(c),T.p[c]*HS+.05,ZT],[X(mu),.5,ZF],.55,{c:P.c1,a:.9,r:.05+.05*wt,n:Math.round(4+10*wt),speed:1.2})})}
    if(k===3){const mu=T.r[rFrame][0],c=T.near==='left'?C1:C2;R.flowArc([X(c),T.p[c]*HS+.05,ZT],[X(mu),.5,ZR],.75,{c:P.c2,a:.9,r:.08,n:10,speed:1.2})}
    if(k===4){const F=stats('f'),Rv=stats('r'),pv=mass(T.p,VAL[0],VAL[1]);
      [[ZT,pc(pv),P.ink],[ZF,pc(F.val),P.c1],[ZR,pc(Rv.val),P.c2]].forEach(([z,t,c])=>R.label([X(N-1)+.2,0,z],t+' in the valley',{al:'left',dx:8,mono:true,fs:12.5,b:1,c,a:e,wide:1}))}
  }
  const full={cam:[.12,1.0],bounds:[[-4.3,0,-2.6],[4.3,1.4,2.6]]};
  const st=S3.stage({id:'stg-kl',list:'sx-kl',fig:'Fig. 2 · one bump fitted to two, both directions',cam:full.cam,bounds:full.bounds,aspect:.58,dur:2600,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[22,140,18,150],
    view:k=>k===0?{cam:[.12,.75],bounds:[[-4.3,0,-2.7],[4.3,1.3,-1.4]]}:k===1?{cam:[.12,.85],bounds:[[-4.3,0,-2.6],[4.3,2.5,2.6]]}:full});
  function upd(){const w=+$('klW').value,s0=+$('klS').value;$('klWv').textContent=w.toFixed(2);$('klSv').textContent=s0;T=compute(w,s0);writeList();st.list('sx-kl')}
  ['klW','klS'].forEach(id=>$(id).addEventListener('input',upd));
  writeList();
  window.DSL_KL={compute,stats:()=>({f:stats('f'),r:stats('r'),pv:mass(T.p,VAL[0],VAL[1])})};
})();
