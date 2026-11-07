// ---- Scene, Fig. 5 (section 9): MLE against MAP on the probability triangle of cat, dog, sat (renderer v2) ----
// Counts after "the": cat 3, dog 1, sat 0. The likelihood q_cat^3 q_dog has its peak (the MLE) on the edge where sat is 0;
// the prior Dirichlet(2, 2, 2) is proportional to q_cat q_dog q_sat; the posterior Dirichlet(5, 3, 2) peaks at the MAP (4, 2, 1)/7,
// add-one smoothing. Each surface is scaled to the same peak height (only its shape matters); every point is computed here.
(function(){
  if(!document.getElementById('stg-map')||!window.PMS)return;const {mix,lerp}=S3,at=PMS.at;
  const N=[3,1,0],AL=N.map(c=>c+2),A0=AL.reduce((a,b)=>a+b,0);
  const lik=q=>Math.pow(q[0],N[0])*Math.pow(q[1],N[1]),pri=q=>q[0]*q[1]*q[2],post=q=>lik(q)*pri(q);
  const mle=N.map(c=>c/4),map=AL.map(a=>(a-1)/(A0-3)),mean=AL.map(a=>a/A0),tiny=[.665,.245,.090];
  window.PM_MAP={mle,map,mean,nllMap:-Math.log(map[2]),nllMean:-Math.log(mean[2])};
  const H=1.9,M={},mk=(nm,f,pk)=>{const m=PMS.mesh(f,24),s=H/f(pk);M[nm]={m,s}};
  mk('lik',lik,mle);mk('pri',pri,[1/3,1/3,1/3]);mk('post',post,map);
  function draw(R,k,e){const P=R.P;R.grid(-3.4,3.4,-3.2,2.6,.5);PMS.tri(R,{hide:k===4?[2]:null});
    // 1. every bet is a point of the triangle; the counts stand at the corners
    const ca=k===0?1:k===4?0:.35;
    N.forEach((c,i)=>{const q=[0,0,0];q[i]=1;const p=at(q,0),o=[p[0]*1.25+(i===2?.95:0),0,p[2]*1.12+(i===2?.3:0)];R.box(o,[.32,Math.max(.02,c*.32),.32],{fill:mix(PMS.wc(P,i),P.paper,.2),a:ca});
      R.label([o[0],i===2?0:Math.max(.02,c*.32),o[2]],'seen '+c,{mono:true,fs:12.5,b:1,c:PMS.wc(P,i),dy:i===2?16:-10,a:ca})});
    if(k===0){R.ball(at(tiny,.06),.09,{c:P.ink});R.label(at(tiny,.06),'the tiny bet (0.665, 0.245, 0.090)',{fs:12.5,b:1,c:P.ink,dy:-14,a:e})}
    // 2. the likelihood, 3. the prior, 4. their product, the posterior
    const la=k===1?e:k===2?.15:k===3?.15:0,pa=k===2?e:k===3?.15:0,qa=k===3?e:k===4?.3:0;
    PMS.surf(R,M.lik.m,M.lik.s,{c:P.c1,a:la,grow:k===1?e:1});
    PMS.surf(R,M.pri.m,M.pri.s,{c:P.c5,a:pa,grow:k===2?e:1});
    PMS.surf(R,M.post.m,M.post.s,{c:P.c4,a:qa,grow:k===3?e:1});
    if(k>=1&&k<=3){R.ball(at(mle,H*(k===1?e:.05)+.06),.09,{c:P.c1,a:k===1?e:.7});R.label(at(mle,H*(k===1?1:.05)),'MLE (0.75, 0.25, 0)',{mono:true,fs:12.5,b:1,c:P.c1,al:'left',dx:10,dy:-10,a:k===1?e:.7})}
    if(k===2){R.ball(at([1/3,1/3,1/3],H*e+.06),.09,{c:P.c5,a:e});R.label(at([1/3,1/3,1/3],H),'prior peak (1/3, 1/3, 1/3)',{mono:true,fs:12.5,b:1,c:P.c5,dy:-14,a:e})}
    if(k===3){R.ball(at(map,H*e+.06),.1,{c:P.c4,a:e});R.label(at(map,H),'MAP (0.571, 0.286, 0.143)',{mono:true,fs:12.5,b:1,c:P.c4,al:'right',dx:-10,dy:-12,a:e});
      R.flowArc(at(mle,.05),at(map,.05),.5,{c:P.c4,r:.06,n:7,a:e})}
    // 5. what each bet pays when "the sat" turns up: -ln q_sat, a column at each point
    if(k===4){[[mle,null,P.c1,'MLE: −ln 0 = ∞'],[map,map[2],P.c4,'MAP: −ln 0.143 = 1.946'],[mean,mean[2],P.c3,'mean: −ln 0.2 = 1.609']].forEach(([q,s,c,t],i)=>{
        const h=s==null?2.5*e:-Math.log(s)*.8*e,base=at(q,0);R.box(base,[.24,Math.max(.02,h),.24],{fill:mix(c,P.paper,.15),a:1});
        if(s==null)R.line([[base[0],h,base[2]],[base[0],h+.5*e,base[2]]],{c,w:2,dash:[4,4]});
        R.label([base[0],h+(s==null?.5:0),base[2]],t,{mono:true,fs:12.5,b:1,c,dy:i===1?-30:-12,al:i===0?'right':'left',dx:i===0?-8:6,a:e})})}
  }
  const full={cam:[.45,.6],bounds:[[-2.6,0,-2.5],[2.6,2,1.9]]};
  S3.stage({id:'stg-map',list:'sx-map',fig:'Fig. 5 · a prior pulls the peak off the edge',cam:full.cam,bounds:full.bounds,aspect:.74,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,14,16],
    view:k=>k===4?{cam:[.25,.45],bounds:[[-1.4,0,-1.6],[2.4,3,1.9]]}:null});
})();
