// ---- Scene: Fig. 3, correcting a judge's win rate with a gold slice (stg-gold, renderer v2; replaces the 2D dot stepper of 2026-10-24) ----
// One tile per human non-tie vote on comparisons involving the chosen model (LJ.items, GPT-4 both orders, released). Steps (mode "corr"):
// the comparisons; the judge labels every one (a sweep, blue = judge says the model won); the raw rate as a bar; a seeded random gold slice
// rises out of the field; humans label it (TP, FN, FP, TN); the four counts as a bar field on a glass plate and q1, q0; the Rogan-Gladen
// estimate with Lee et al.'s interval (LJ.calib, eq. 8); the truth, every tile recoloured by its human label. Mode "naive" skips the slice.
// The step lists on the left are written by text() for the chosen model and slice; the static HTML holds the default (GPT-3.5-turbo, 100),
// and a mismatch with what text() computes is a console error. Numbers for check_stages.mjs and check_page.mjs: window.LJS.gold.
(function(){
  if(!document.getElementById('stg-gold')||!window.S3||!window.LJ)return;const {at,off,mix,lerp}=S3,L=window.LJ,$=id=>document.getElementById(id);
  const tSel=$('gd-target'),mSel=$('gd-m');
  [2,1,0,3,4,5].forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=L.nm(m);tSel.appendChild(o)});
  const STEPS={corr:['start','judge','report','slice','label','rates','correct','truth'],naive:['start','judge','report','truth']};
  let mode='corr',I,C,inS,rank;
  const P1=x=>L.pct(x),f3=x=>isFinite(x)?x.toFixed(3):'n/a',pts=x=>((x-C.th)*100>=0?'+':'&minus;')+Math.abs((x-C.th)*100).toFixed(1)+' points';
  function setup(){I=L.items(+tSel.value,'P');C=L.calib(I,+mSel.value,1);inS=new Set(C.g);rank=new Map(C.g.map((g,j)=>[g,j]))}
  function text(md){const t=L.nm(+tSel.value),n=I.length.toLocaleString('en-US'),m=C.g.length,ok=C.c.ok;
    const T={start:'<b>The comparisons.</b> Each tile is one human vote on a comparison between '+t+' and another model, ties left out: '+n+' votes. The question is the share '+t+' won. Nobody has looked at the human labels yet.',
      judge:'<b>The judge labels everything.</b> GPT-4 judges every comparison in both orders; when the two orders disagree the verdict is a tie, counted here as "not a win" (blue: the judge says '+t+' won). Cost: two calls per item, no human time.',
      report:'<b>The usual report.</b> '+t+' wins '+P1(C.p)+' of comparisons "according to GPT-4". '+(md==='naive'?'This number goes in the slide.':'Before reporting it, measure the instrument.'),
      slice:'<b>Draw a gold slice.</b> A random '+m+' of the '+n+' items rise out of the field and go to humans. Random matters: the correction assumes the judge errs on the slice as it does on the rest.',
      label:'<b>Humans label the slice.</b> Of the '+m+': '+C.tp+' true positives (green), '+C.fn+' wins the judge missed (ochre), '+C.fp+' losses it called wins (orange), '+C.tn+' true negatives (grey).',
      rates:'<b>Measure the judge.</b> The four counts stand on a glass plate. Sensitivity q&#770;<sub>1</sub> = '+C.tp+'/'+(C.tp+C.fn)+' = '+f3(C.q1)+'; specificity q&#770;<sub>0</sub> = '+C.tn+'/'+(C.fp+C.tn)+' = '+f3(C.q0)+'. Their sum minus 1 ('+f3(C.q0+C.q1-1)+') is how much signal the judge carries; at 0 it carries none.',
      correct:'<b>Correct the rate.</b> '+(ok?'&theta;&#770; = ('+f3(C.p)+' + '+f3(C.q0)+' &minus; 1) / ('+f3(C.q0)+' + '+f3(C.q1)+' &minus; 1) = '+P1(C.c.est)+', 95% interval '+P1(C.c.lo)+' to '+P1(C.c.hi)+' (Lee et al. eq. 8). The same '+m+' labels used directly as a sample give '+P1(C.human.est)+' ('+P1(C.human.lo)+' to '+P1(C.human.hi)+').'
        :'The slice gives q&#770;<sub>0</sub> + q&#770;<sub>1</sub> &le; 1: the judge shows no usable signal on these labels and the correction cannot be computed. Label more, or pick another judge.'),
      truth:'<b>The truth.</b> All '+n+' human labels: '+t+' won '+P1(C.th)+' (green tiles). The judge\'s raw rate was off by '+pts(C.p)+(md==='corr'&&ok?'; the corrected estimate by '+pts(C.c.est)+', and its interval '+((C.c.lo<=C.th&&C.th<=C.c.hi)?'contains':'misses')+' the truth.':'. Nothing in the raw number warned of it.')};
    return STEPS[md].map(s=>T[s])}
  const norm=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent.replace(/\s+/g,' ').trim()};
  function fill(check){['corr','naive'].forEach(md=>{const el=$(md==='corr'?'sx-gold-c':'sx-gold-n'),tx=text(md),lis=[...el.children];
    if(check){if(lis.length!==tx.length||lis.some((li,i)=>norm(li.innerHTML)!==norm(tx[i])))console.error('stg-gold: the static step list '+el.id+' differs from what the scene computes')}
    else tx.forEach((h,i)=>{if(lis[i])lis[i].innerHTML=h})})}
  setup();fill(true);
  window.LJS=window.LJS||{};const pub=()=>{LJS.gold={n:I.length,p:P1(C.p),th:P1(C.th),tp:C.tp,fn:C.fn,fp:C.fp,tn:C.tn,q1:f3(C.q1),q0:f3(C.q0),est:C.c.ok?P1(C.c.est):null,lo:C.c.ok?P1(C.c.lo):null,hi:C.c.ok?P1(C.c.hi):null,m:C.g.length}};pub();
  const COLS=36,SP=.15,FX=-1.7,H=2.2,XR=1.9,ZR=1.5,XG=3.9,ZG=-.4;
  const pos=i=>{const rows=Math.ceil(I.length/COLS);return [FX+((i%COLS)-(COLS-1)/2)*SP,0,((Math.floor(i/COLS))-(rows-1)/2)*SP]};
  function draw(R,k,e){const P=R.P,S=STEPS[mode],s=S[k],after=n=>{const j=S.indexOf(n);return j>=0&&k>=j},is=n=>s===n;R.grid(-4.8,5,-3.2,3.2,.5);
    const n=I.length,sweep=is('judge')?e:after('judge')?1:0,lifted=mode==='corr'&&after('slice')&&!is('truth');
    const fieldA=lifted?(is('slice')?lerp(1,.35,e):.35):1;
    const JC=mix(P.paper,P.c1,.7),HC=mix(P.paper,P.good,.7),cls=(z,zh)=>z&&zh?P.good:z?P.c5:zh?P.bad:P.mute;
    for(let i=0;i<n;i++){const [z,zh]=I[i],p=pos(i);let c=P.paper;
      if(is('truth'))c=z?mix(JC,HC,Math.min(1,e*1.5)):mix(zh?JC:P.paper,P.paper,Math.min(1,e*1.5));
      else if(i/n<sweep)c=zh?JC:P.paper;
      if(is('truth')&&z)c=HC;
      const inside=lifted&&inS.has(i);R.box(p,[SP*.82,.04,SP*.82],{fill:c,a:inside?.2:fieldA,shadow:false,lw:.4})}
    // the judge: a glass plate over the field while it labels everything
    const ja=is('judge')?Math.min(1,e*3):is('report')?off(k,e,k):0;
    if(ja>.01){R.glass([FX-1.4,1.25,-1.1],[2.8,0,0],[0,0,2.2],{c:P.acc,a:ja,nu:6,nv:4,th:.03});R.label([FX,1.25,-1.1],'GPT-4 judge · both orders',{fs:12.5,b:1,c:P.acc,dy:-12,a:ja});
      if(is('judge'))for(let q=0;q<6;q++){const tx=FX-1.2+q*.48,tz=-2+((q*7)%5)*.9;R.flow([[tx*.6+FX*.4,1.25,(tz+(-1.1+1.1))/2],[tx,.05,tz]],{c:P.c1,r:.05,n:4,speed:1.4})}}
    // the gold slice: seeded random items rise; humans label them
    if(lifted){const t=is('slice')?e:1,dim=after('rates')?.3:1;C.g.forEach((g,j)=>{const [z,zh]=I[g],p=pos(g),y=.75*t+.012*(j%5);
        const c=after('label')?(is('label')?mix(P.paper,cls(z,zh),Math.min(1,e*1.4)):cls(z,zh)):mix(P.paper,P.c1,zh&&sweep>=1?.7:0);
        R.box([p[0],y,p[2]],[SP*.85,.13,SP*.85],{fill:mix(P.paper,c,.85),a:dim,shadow:false,lw:.5})});
      if(is('slice'))R.label([FX,.9,-2.4],C.g.length+' items to humans',{fs:12.5,b:1,dy:-10,a:e})}
    // the judge measured: the four counts as a bar field on a glass plate
    if(mode==='corr'&&after('rates')){const t=is('rates')?e:1,a=is('rates')?1:0;if(a>0){R.glass([XG-.75,.02,ZG-.75],[1.5,0,0],[0,0,1.5],{c:P.c4,a,nu:2,nv:2,th:.03});
      const cells=[[C.tp,'TP',P.good,0,1],[C.fn,'FN',P.c5,1,1],[C.fp,'FP',P.bad,0,0],[C.tn,'TN',P.mute,1,0]],mx=Math.max(1,...cells.map(c=>c[0]));
      cells.forEach(([v,nm,c,cx,cz])=>{const x=XG-.37+cx*.75,zz=ZG-.37+cz*.75,h=Math.max(.02,v/mx*1.1*t);R.box([x,.05,zz],[.5,h,.5],{fill:mix(P.paper,c,.75),a,shadow:false});R.label([x,.05+h,zz],nm+' '+v,{fs:12,b:1,dy:-10,c,a})});
      if(is('rates')){R.flowArc([FX+.9,.85,0],[XG,.9,ZG],.5,{c:P.c4,r:.06});R.label([XG,0,ZG+.75],'q̂₁ '+f3(C.q1)+' · q̂₀ '+f3(C.q0),{dy:14,fs:12.5,b:1,c:P.c4,a:e})}}}
    // the rates on one 0 to 100% axis: the judge's raw rate, the corrected estimate with its interval, the truth
    if(after('report')){const ax=[[XR-.3,0,ZR],[XR-.3,H,ZR]];R.line(ax,{c:P.mute,w:1});[0,.5,1].forEach(v=>R.label([XR-.3,v*H,ZR],Math.round(v*100)+'%',{al:'right',dx:-6,fs:12,c:P.mute}));
      const bar=(j,v,c,nm,t,b)=>{const x=XR+.2+j*.75,h=Math.max(.02,v*H*t);R.box([x,0,ZR],[.42,h,.42],{fill:mix(P.paper,c,.7)});R.label([x,h,ZR],P1(v),{fs:12.5,b:1,dy:-11,c,a:t});R.label([x,0,ZR+.25],nm,{fs:12,dy:12,c:P.mute,a:t,grp:'rates'})};
      bar(0,C.p,P.c1,'judge',is('report')?e:1);
      if(mode==='corr'&&after('correct')&&C.c.ok){const t=is('correct')?e:1;bar(1,Math.max(0,C.c.est),P.c4,'corrected',t);const x=XR+.95+.32;
        R.line([[x,C.c.lo*H,ZR],[x,C.c.hi*H,ZR]],{c:P.c4,w:2,a:t});[C.c.lo,C.c.hi].forEach(v=>R.line([[x-.08,v*H,ZR],[x+.08,v*H,ZR]],{c:P.c4,w:2,a:t}));
        if(is('correct')){R.flowArc([XG,.9,ZG],[XR+.95,.8,ZR],.4,{c:P.c4,r:.05});R.flowArc([XR+.2,C.p*H,ZR],[XR+.95,C.c.est*H,ZR],.25,{c:P.c1,r:.05})}}
      if(is('truth')){const j=mode==='corr'&&C.c.ok?2:1;bar(j,C.th,P.good,'humans',e);R.line([[XR-.3,C.th*H,ZR],[XR+.2+j*.75+.3,C.th*H,ZR]],{c:P.good,w:1.2,dash:[4,3],a:e})}}
  }
  const full={cam:[.15,.7],bounds:[[-4.6,0,-2.6],[4.9,2.3,2.6]]};
  // on a phone the rates step moves in on the four counts, so their labels have room
  const stg=S3.stage({id:'stg-gold',list:'sx-gold-c',fig:'Fig. 3 · a judge\'s win rate, corrected with a gold slice',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,16,40],
    view:k=>{const s=STEPS[mode][k];return s==='slice'||s==='label'?{cam:[.15,.62],bounds:[[-4.6,0,-2.6],[3.2,1.6,2.6]]}:s==='rates'?(innerWidth<520?{cam:[.2,.72],bounds:[[1.3,0,-1.4],[4.9,1.6,2.2]]}:{cam:[.22,.62],bounds:[[-4.6,0,-2.6],[4.9,1.8,2.2]]}):full}});
  function swap(){setup();fill(false);pub();['sx-gold-c','sx-gold-n'].forEach(id=>$(id).hidden=id!==(mode==='corr'?'sx-gold-c':'sx-gold-n'));stg.list(mode==='corr'?'sx-gold-c':'sx-gold-n')}
  RD.seg($('gd-mode'),m=>{mode=m;swap()});tSel.addEventListener('change',swap);mSel.addEventListener('change',swap);
})();
