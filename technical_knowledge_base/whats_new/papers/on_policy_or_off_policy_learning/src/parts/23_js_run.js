// ---- Move the rollout policy: the lambda slider with exact update sensitivity and the recorded sweep (the before/after is Fig. 1 on The paper tab) ----
(function(){
  if(!window.OPD||!window.TOYD||!$('t-run'))return;
  const W=OPD.world(TOYD.world_seed),V=window.OPDV,CF=V.CF,CR=V.CR,P=OPD.P,K=OPD.K;
  const opts=sel=>{const el=$(sel);for(let p=0;p<P;p++){const o=document.createElement('option');o.value=p;o.textContent='prompt '+(p+1);el.appendChild(o)}};
  opts('slP');

  // 1. the lambda slider
  (function(){const el=$('slSvg');let M='table',cache={};
    function curves(){if(cache[M])return cache[M];const th=OPD.initTheta(W,M),lams=[];for(let i=-20;i<=20;i++)lams.push(i/10);
      let R=0;for(let p=0;p<P;p++){const sp=(a,b)=>{const d=a.map((x,i)=>x-b[i]);return Math.max(...d)-Math.min(...d)};R=Math.max(R,sp(OPD.logS1(W,M,th,p),OPD.logT1(W,p)));for(let k=0;k<K;k++)R=Math.max(R,sp(OPD.logS2(W,M,th,p,k),OPD.logT2(W,p,k)))}
      const g0={f:OPD.expectedGrad(W,M,th,'f',-1),r:OPD.expectedGrad(W,M,th,'r',-1)};
      const rows=lams.map(l=>({l,tv:OPD.seqTV(W,M,th,l,-1),f:OPD.diffNorm(OPD.expectedGrad(W,M,th,'f',l),g0.f),r:OPD.diffNorm(OPD.expectedGrad(W,M,th,'r',l),g0.r)}));
      return cache[M]={th,R,rows}}
    function draw(w){const C=curves(),lam=+$('slL').value,p=+$('slP').value,th=C.th;
      $('slV').textContent=(lam>0?'+':'')+lam.toFixed(1)+(lam===-1?' (teacher, OffPD)':lam===1?' (student, OnPD)':lam===0?' (midpoint)':'');
      const lS=OPD.logS1(W,M,th,p),lT=OPD.logT1(W,p),pS=lS.map(Math.exp),pT=lT.map(Math.exp),pL=OPD.lambdaProbs(lS,lT,lam);
      const tr=W.troutes[p],hb=W.habit[p];
      // route bars: teacher, student, pi_lambda
      const H=150,pl=8,gw=(w-pl*2)/K,bw=Math.min(22,gw/4.2);let s='';
      for(let k=0;k<K;k++){const x0=pl+gw*k+gw/2-bw*1.5-3;
        [[pT[k],'var(--c3)'],[pS[k],'var(--c1)'],[pL[k],'var(--ink)']].forEach(([v,c],j)=>{const h=v*96,x=x0+j*(bw+3);s+=rc(x,112-h,bw,Math.max(1,h),c,{r:2,op:j===2?.85:1})});
        s+=tx(pl+gw*k+gw/2,128,'route '+(k+1),{fs:11,a:'middle',w:'700'})+tx(pl+gw*k+gw/2,142,tr.includes(k)?'teacher\'s':k===hb?'habit':'',{fs:11,a:'middle',c:'var(--mute)'})}
      s+=tx(pl,10,'■ teacher',{fs:11,c:'var(--c3)'})+tx(pl+70,10,'■ student',{fs:11,c:'var(--c1)'})+tx(pl+140,10,'■ rollout policy at this λ',{fs:11,c:'var(--ink)'});
      el.innerHTML=svgW(w,H,s,'route probabilities');
      const tv=C.rows.find(r=>Math.abs(r.l-lam)<1e-9);
      $('slCap').innerHTML='At λ = '+lam.toFixed(1)+' the rollouts take the student\'s habit route (route '+(hb+1)+') '+(100*pL[hb]).toFixed(1)+'% of the time, against '+(100*pT[hb]).toFixed(1)+'% for the teacher and '+(100*pS[hb]).toFixed(1)+'% for the student.'+(Math.abs(lam)>1?' Beyond ±1 only tokens with at least 20% of the favoured model\'s top probability get the extra push, capped at 2 log 3.':'');
      // sensitivity curves
      const g=$('slG'),gw2=g.clientWidth||w,ser=[{n:'forward KL',c:CF,pts:C.rows.map(r=>[r.l,r.f,0])},{n:'reverse KL',c:CR,pts:C.rows.map(r=>[r.l,r.r,0])}];
      const ymax=M==='table'?0.15:0.45;
      g.innerHTML=V.lamChart(gw2,ser,{y:[0,ymax],yl:'how far the update moves',fy:v=>v.toFixed(2),dec:3,mark:lam,
        leg:[['forward KL',CF,'l'],['reverse KL',CR,'l']],label:'change in the expected update against lambda'}).replace(/<circle[^>]*>(<title>[^<]*<\/title>)?<\/circle>/g,'');
      $('slCnt').innerHTML=stat('distance from λ = −1',tv.tv.toFixed(3),'total variation, sequences')+stat('forward-KL update moves',tv.f.toFixed(3),M==='table'?'bound '+(2*Math.SQRT2*tv.tv).toFixed(2):'')+stat('reverse-KL update moves',tv.r.toFixed(3),M==='table'?'bound 2R × distance = '+(2*C.R*tv.tv).toFixed(1):'')+stat('log-ratio spread R',C.R.toFixed(2)+' nats','largest at any prefix')}
    $('slL').addEventListener('input',()=>refit(el));$('slP').addEventListener('change',()=>refit(el));segBind('slM',v=>{M=v;refit(el)});
    onTab('t-run',()=>fit(el,draw))})();

  // 2. the recorded sweep along lambda
  (function(){const el=$('trSvg');let m='pass1',lr='0.02',M='mlp';
    const key=(M,k,lr)=>M+' '+k+' '+lr+' clip',rng=a=>Math.max(...a)-Math.min(...a);
    const fr=TOYD.sweep[key('mlp','f','0.02')].map(x=>x.pass1*100),rr=TOYD.sweep[key('mlp','r','0.02')].map(x=>x.pass1*100);
    $('trFr').textContent=rng(fr).toFixed(1);$('trRr').textContent=rng(rr).toFixed(1);
    function draw(w){const sc=m==='pass1'?100:1,ser=[];
      [['f','forward KL'],['r','reverse KL']].forEach(([k,n])=>ser.push({n,c:V.col(k),pts:TOYD.sweep[key(M,k,lr)].map(x=>[x.lam,x[m]*sc,m==='pass1'?x.pass1_sem*sc:0])}));
      const init=(M==='mlp'?TOYD.init:TOYD.init_table)[m]*sc,te=TOYD.teacher[m]*sc;
      ser.push({n:'teacher',c:'var(--c3)',da:'2 3',pts:[[-2,te,0],[2,te,0]]});ser.push({n:'student at the start',c:'var(--mute)',da:'2 3',pts:[[-2,init,0],[2,init,0]]});
      el.innerHTML=V.lamChart(w,ser,{y:m==='pass1'?[0,100]:[1,2.6],fy:v=>m==='pass1'?v+'%':v.toFixed(1),yl:m==='pass1'?'pass@1 (%)':'distinct correct routes',dec:m==='pass1'?1:2,
        leg:[['forward KL',CF,'l'],['reverse KL',CR,'l'],['teacher','var(--c3)','da'],['start','var(--mute)','da']],label:'toy sweep along lambda'});
      const F=TOYD.sweep[key(M,'f',lr)].map(x=>x[m]*sc),R=TOYD.sweep[key(M,'r',lr)].map(x=>x[m]*sc),d=m==='pass1'?1:2;
      $('trCap').innerHTML='Across λ, forward KL ranges '+Math.min(...F).toFixed(d)+' to '+Math.max(...F).toFixed(d)+' and reverse KL '+Math.min(...R).toFixed(d)+' to '+Math.max(...R).toFixed(d)+(m==='pass1'?' (%).':' distinct correct routes (teacher '+te.toFixed(2)+').')+(M==='table'?' The direct-logit student can copy the teacher exactly and does so from any rollouts: the run that showed this toy needed shared parameters.':'')}
    segBind('trM',v=>{m=v;refit(el)});segBind('trL',v=>{lr=v;refit(el)});segBind('trS',v=>{M=v;refit(el)});
    $('trGo').addEventListener('click',()=>{const b=$('trGo');b.disabled=true;$('trOut').textContent=' running…';
      setTimeout(()=>{try{let worst=0,n=0;const t0=performance.now();
        ['f','r'].forEach(k=>TOYD.sweep[key(M,k,lr)].forEach(x=>{TOYD.seeds.forEach((seed,j)=>{const res=OPD.train(W,{model:M,kind:k,lam:x.lam,lr:+lr,seed});const e=OPD.evaluate(W,M,res.theta,1);
          worst=Math.max(worst,Math.abs(e.pass1-x.runs[j][0]),Math.abs(e.distinct10-x.runs[j][2]));n++})}));
        $('trOut').textContent=' '+n+' runs in '+((performance.now()-t0)/1000).toFixed(1)+' s; largest difference from the recorded sweep '+worst.toExponential(1)+' (the record keeps 4 decimals).'}
        catch(e){__jsErr(e.message)}b.disabled=false},30)});
    onTab('t-run',()=>fit(el,draw))})();

  // 3. one prompt before and after, four ways: since 2026-11-13 the 3D stage Fig. 1 on The paper tab (parts/31_js_sc_knobs.js)

  // 4. the engine check
  (function(){const el=$('chkOut');if(!el||!window.TOYCHECK)return;const c=TOYCHECK;
    el.innerHTML='<p><span class="vd '+(c.pass?'ok':'no')+'">'+(c.pass?'PASS':'FAIL')+'</span> The JS engine against PyTorch '+c.torch.split('+')[0]+' autograd (<code>src/check_engine.py</code>), for both students: losses, batch gradients, exact expected gradients at five values of λ and π<sub>λ</sub> at nine. Largest absolute difference '+c.max_abs_diff.toExponential(1)+' (double precision).</p>'})();
})();
