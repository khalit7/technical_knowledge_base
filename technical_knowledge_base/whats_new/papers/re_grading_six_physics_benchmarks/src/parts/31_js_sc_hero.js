// ---- Scene: the hero, the 250 audited rejections as towers of cubes (renderer v2: one cube per answer, glass blocks for the accepted answers
// nobody checked, flows where grader errors become correct answers) ----
// Data: window.PAPER.tables.funnel (per benchmark: acc, rej, Q, G, M, kept; Appendix B and Table 2) and t1 (GPT-5.6-Sol's corrected mean@4).
// Cubes are grouped by label, bottom to top benchmark, grader, model error: which cube is which question is not published (illustrative order, exact counts).
// window.RG6HERO exposes the numbers for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const T=window.PAPER.tables,F=T.funnel,BS=['HLE-Physics','PHYBench','PRISM-Physics','UGPhysics'],SH={'HLE-Physics':'HLE','PHYBench':'PHY','PRISM-Physics':'PRISM','UGPhysics':'UG'};
  const TB=Object.fromEntries(T.t1.map(r=>[r.b,r]));
  const D=BS.map(b=>({b,acc:F[b].acc,rej:F[b].rej,Q:F[b].Q,G:F[b].G,M:F[b].M,kept:F[b].kept,score:TB[b].mean.gpt[1]}));
  window.RG6HERO={rows:D.map(d=>Object.assign({},d)),pooled:T.t2_pooled,acc:D.reduce((s,d)=>s+d.acc,0)};
  const cssv=n=>S3.rgb(getComputedStyle(document.body).getPropertyValue(n).trim()||'#888');
  const PER=12,PIT=.2,S=.17,XC=i=>(i-1.5)*2.4,XT=i=>XC(i)-.45,XG=i=>XC(i)+.45;
  // cube q of a tower whose centre is x: 4 across, 3 deep, 12 to a layer
  const cube=(x,q)=>{const l=Math.floor(q/PER),r=q%PER;return [x+((r%4)-1.5)*PIT,l*PIT,(Math.floor(r/4)-1)*PIT]};
  const top=n=>Math.ceil(n/PER)*PIT;
  function draw(R,k,e){const P=R.P,C={Q:cssv('--lq'),G:cssv('--lg'),M:cssv('--lm'),ok:cssv('--lok')},grey=mix(P.paper,P.mute,.18),nar=R.W<520;
    R.grid(-5,5,-1.4,1.4,.5);
    D.forEach((d,i)=>{const x=XT(i),n=d.rej,L=Math.ceil(n/PER);let q=0;
      // step 1 the tower rises layer by layer; step 2 the cubes take their labels' colours; step 3 the model errors lift out;
      // step 4 the rejections recede beside the accepted answers; step 5 benchmark errors leave, grader errors turn into correct answers
      [['Q',d.Q],['G',d.G],['M',d.M]].forEach(([lab,m])=>{for(let j=0;j<m;j++,q++){const p=cube(x,q),lay=Math.floor(q/PER);
        let a=k===0?Math.max(0,Math.min(1,e*(L+1)-lay)):1,c=k===0?grey:k===1?mix(grey,C[lab],e):C[lab],y=p[1];
        if(lab==='M'){const lift=k===2?.55*e:k===3?.55*(1-e):0;y+=lift}
        else if(k===2)a=lerp(1,.2,e);
        if(k===3)a*=lab==='M'?1:.5;
        let px=p[0],pz=p[2];
        if(k===4){if(lab==='Q'){a*=1-e;y+=.6*e}else{// what is kept settles to the floor once the benchmark errors have gone
          const t=cube(x,q-d.Q),s2=Math.max(0,Math.min(1,e*1.6-.6));px=lerp(p[0],t[0],s2);y=lerp(y,t[1],s2);pz=lerp(p[2],t[2],s2);if(lab==='G')c=mix(C.G,C.ok,e)}}
        R.box([px,y,pz],[S,S,S],{fill:c,a,shadow:false,lw:.55})}});
      // labels: the rejections, then the three counts, then the model errors alone
      const h=top(n);
      R.label([x,0,.55],nar?SH[d.b]:d.b,{fs:12,dy:14,b:1,c:P.ink});
      if(k===0)R.label([x,h,0],String(n)+(nar?'':' rejected'),{mono:true,fs:12.5,b:1,dy:-12,a:e});
      if(k===1){[[d.Q,'benchmark',C.Q],[d.G,'grader',C.G],[d.M,'model',C.M]].forEach(([v,w,c],j)=>R.label([x,h,0],nar?String(v):v+' '+w,{mono:true,fs:12.5,b:1,dy:-14-16*(2-j),c,a:e}))}
      if(k===2){const hm=d.M?Math.floor((n-1)/PER)*PIT+PIT+.55:h;R.label([x,hm,0],String(d.M),{mono:true,fs:15,b:1,dy:-14,c:C.M,a:e})}
      // the accepted answers: a glass block of the same density, never reviewed
      const ga=k>=3?(k===3?e:1):0,ha=top(d.acc);
      if(ga>.01){R.box([XG(i),0,0],[4*PIT,ha,3*PIT],{fill:C.ok,fa:k===4?lerp(.16,.32,e):.16,ea:.8,ec:C.ok,a:ga,shadow:false});
        if(k===3)R.label([XG(i),ha,0],nar?String(d.acc):d.acc+' accepted',{mono:true,fs:12.5,b:1,dy:-12,c:C.ok,a:e})}
      if(k===4){// grader errors stream into the accepted answers; benchmark errors leave
        if(d.G){const y0=Math.floor((d.G/2)/PER)*PIT+PIT/2;R.flowArc([x,y0,.35],[XG(i),ha+.05,0],.45,{c:C.G,a:Math.min(1,e*1.5),r:.05,n:Math.max(3,Math.round(d.G/5)),speed:1.1})}
        R.label([XC(i),Math.max(h,ha),0],nar?String(d.kept):d.kept+' kept',{mono:true,fs:12.5,b:1,dy:-30,c:P.ink,a:e});
        R.label([XC(i),Math.max(h,ha),0],d.score.toFixed(2)+'%',{mono:true,fs:12.5,b:1,dy:-14,c:C.ok,a:e})}
    });
  }
  const full={cam:[.18,.5],bounds:[[-4.6,0,-.7],[4.6,2.3,.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · 250 answers marked wrong, by label',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,8,24,8]:[22,16,26,16],
    view:k=>k===2?{cam:[.1,.32],bounds:[[-4.6,0,-.7],[4.6,2.6,.7]]}:full});
})();
