// ---- Scene: four real training pairs through DPO and through Unlikelihood (renderer v2: the pairs side by side, each answer's log-ratio
// log pi_theta/pi_ref as a signed bar on a white plinth, the pair's weight as a glass trough in front, dots flowing from the trough to the bars while the
// loss pushes). Data: ckRun() in 13_js_read.js, a real run of the page's toy (22_js_dpo.js) in the browser, 600 steps, checkpoints at
// 0, 5, 10, 25, 50, 100, 200, 400 and 600. The nine checkpoints are grouped into five explained stretches (the long-replay rule). ----
(function(){
  if(!document.getElementById('stg-pair'))return;const {lerp,mix}=S3;
  let MODE='dpo',BETA=1;
  const SEG=[[0,0],[0,2],[2,4],[4,6],[6,8]]; // each step plays the checkpoints from its first index to its last
  const XP=i=>(i-1.5)*2.05,DC=-.3,DL=.3,Y0=1.3,HM=1.15,ZT=.75,TL=1.3; // pair centres along x; chosen and rejected bars either side; the weight trough in front
  const cl=v=>v<0?0:v>1?1:v,sg=v=>{v=Math.abs(v)<.005?0:v;return (v>=0?'+':'−')+Math.abs(v).toFixed(2)};
  // focus per step (pair indices shown at full strength; the rest recede), as the step list explains
  const FOC={dpo:[null,null,[0,3],null,[3]],ul:[null,null,null,[0,3],[0]]};
  const run=()=>ckRun(MODE,BETA);
  function stateAt(k,e){const S=run().snaps,[i0,i1]=SEG[k];if(i0===i1)return {p:S[i0].pairs,s:S[i0]};
    const u=cl(e)*(i1-i0),i=Math.min(i1-1,i0+Math.floor(u)),f=i0+u-i,a=S[i],b=S[i+1];
    return {p:a.pairs.map((q,j)=>({lw:lerp(q.lw,b.pairs[j].lw,f),ll:lerp(q.ll,b.pairs[j].ll,f),w:lerp(q.w,b.pairs[j].w,f)})),s:f>=.999?b:a,step:Math.round(lerp(a.s,b.s,f)),kl:lerp(a.kl,b.kl,f),rw:lerp(a.rw,b.rw,f),gr:lerp(a.gram,b.gram,f)}}
  function lim(){const R=run();return R.lim3||(R.lim3=Math.max(2,Math.ceil(Math.max(...R.snaps.flatMap(q=>q.pairs.flatMap(p=>[Math.abs(p.lw),Math.abs(p.ll)]))))))}
  function draw(R,k,e){const P=R.P,{p}=stateAt(k,e),L=lim(),foc=FOC[MODE][k],H=v=>v/L*HM;R.grid(-4.4,4.4,-1.6,2,.5);
    p.forEach((q,i)=>{const x0=XP(i),a=foc&&!foc.includes(i)?.25:1;
      // plinth and legs
      R.box([x0,Y0-.045,0],[1.4,.045,.55],{a,shadow:false});[-1,1].forEach(s=>R.box([x0+s*.68,0,0],[.04,Y0-.05,.04],{a:a*.9}));
      [[q.lw,x0+DC,P.c1],[q.ll,x0+DL,P.c2]].forEach(([v,x,c])=>{const h=Math.max(.012,Math.abs(H(v)));R.box([x,v>=0?Y0:Y0-.045-h,0],[.48,h,.34],{fill:c,a,shadow:false,lw:.7});
        if(a>.5)R.label([x,v>=0?Y0+h:Y0-.05-h,0],sg(v),{mono:true,fs:12,b:1,c,dy:v>=0?-10:13,grp:'v'})});
      // the weight: a glass trough on the floor in front, filled to sigma(r(y_l) - r(y_w)); Unlikelihood's is always full
      R.glass([x0-TL/2,.02,ZT],[TL,0,0],[0,0,.34],{c:P.mute,a:a*.55,nu:4,nv:1});R.box([x0-TL/2+q.w*TL/2,0,ZT+.17],[Math.max(.01,q.w*TL),.14,.3],{fill:mix(P.paper,P.mute,.6),a,shadow:false,lw:.6});
      if(a>.5||!(foc&&foc.length===1))R.label([x0,0,ZT+.34],'pair '+(i+1)+' · weight '+q.w.toFixed(2),{mono:true,fs:12,c:a>.5?P.ink:P.mute,dy:14,a:Math.max(.4,a),grp:'w'});
      // the push: dots from the trough to both answers, as many as the weight says, while the loss trains
      if(k>=1){const n=Math.max(1,Math.round(1+q.w*7)),fa=a*(.25+.75*q.w),src=[x0-TL/2+q.w*TL/2,.14,ZT];
        R.flowArc(src,[x0+DC,Y0+.12,.1],.35,{c:P.c1,a:fa,r:.045,n});R.flowArc(src,[x0+DL,Y0-.15,.1],.2,{c:P.c2,a:fa,r:.045,n})}});
  }
  function counters(k,e){const el=document.getElementById('pairCnt');if(!el)return;const S=run().snaps,st=stateAt(k,e),z=st.step!=null?st:{step:st.s.s,kl:st.s.kl,rw:st.s.rw,gr:st.s.gram};
    const h=stat('training step',String(z.step),MODE==='ul'?'Unlikelihood, α = 1':'DPO, β = '+BETA)+stat('exact KL from π<sub>ref</sub>',z.kl.toFixed(2),'over all 20,736 reviews')+stat('true reward',z.rw.toFixed(3),'best possible at this KL '+FRS(z.kl).toFixed(3))+stat('grammatical mass',pc(z.gr),'start '+pc(S[0].gram));
    if(el.__h!==h){el.__h=h;el.innerHTML=h}}
  const full={cam:[.16,.36],bounds:[[-3.8,0,-.4],[3.8,1.85,1.2]]};
  const near=i=>({cam:[.2,.42],bounds:[[XP(i)-1.2,0,-.4],[XP(i)+1.2,1.85,1.2]]});
  const stg=S3.stage({id:'stg-pair',list:'sx-pair-dpo',fig:'Fig. 2 · four training pairs through the loss',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2600,hold:4200,
    draw:(R,k,e)=>{draw(R,k,e);counters(k,e)},
    view:k=>{const f=FOC[MODE][k],v=f&&f.length===1?near(f[0]):full,h=document.getElementById('stg-pair');return h&&h.clientWidth<520?{cam:[v.cam[0]+.7,v.cam[1]+.35],bounds:v.bounds}:v}, // phones: the row of four turned into depth
    margin:w=>w<520?[14,6,12,6]:[18,16,14,16]});
  const seg=document.getElementById('pairM'),sel=document.getElementById('pairB');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    MODE=b.dataset.m;if(sel)sel.disabled=MODE==='ul';['dpo','ul'].forEach(m=>{const L=document.getElementById('sx-pair-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-pair-'+MODE)}));
  if(sel)sel.addEventListener('change',()=>{BETA=+sel.value;stg.draw()});
})();
