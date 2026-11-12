// ---- Scene: Stage A of the winning recipe, donor predictions to a factorised bigram table stored in the 14-layer target (§4.4, Algorithm 1, Table 5) ----
// Donor weights and contexts from Table 5; shapes from §4.4 (50,257-token vocabulary, rank d - 1 = 671, 14 layers).
// The energy bars are this page's own rebuild (GPT-2 small alone, 28 contexts; PAPER.rc.ours.stage_a_c28.energy, from stage_a.py);
// the next-token guesses after " Jane" are the rebuild's Stage A prior at rank 671 and its unigram anchor (window.DEMO, from stage_a_demo.py).
(function(){
  if(!document.getElementById('stg-sa'))return;const {at,off,lerp,mix}=S3;
  const O=(window.PAPER&&PAPER.rc&&PAPER.rc.ours)||null,EN=O&&O.stage_a_c28.energy,DM=window.DEMO;
  const DON=[['GPT-2 small',.725],['Cerebras-GPT 111M',.130],['Cerebras-GPT 256M',.05],['Cerebras-GPT 590M',.04],['Cerebras-GPT 1.3B',.030],['GPT-2 large',.025]];
  const DX=-5,dz=i=>-1.5+.6*i,SX=-3.1,MX=-.8,TX=4.2,RK=['1','4','16','64','256','671'];
  const pos=DM?DM.tokens.indexOf(' Aust'):-1; // the guesses are for the token after " Jane" (the 14th token of the replay passage)
  const topSA=DM&&pos>0?DM.models.stage_a.top[pos-1]:[],topU=DM&&pos>0?DM.models.unigram.top[pos-1]:[];
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.6,2.6,.5);
    // 1. six donors that share GPT-2's vocabulary, each block's height its blend weight
    const da=k<=1?1:k===2?1-.75*e:.25,dl=k<=1?1:k===2?1-e:0;
    DON.forEach(([n,w],i)=>{R.box([DX,0,dz(i)],[.55,.15+1.7*w,.45],{fill:i===0?mix(P.paper,P.c2,.35):P.paper,a:da});
      R.label([DX-.3,.1,dz(i)],n+' · '+w.toFixed(3).replace(/0+$/,'').replace(/\.$/,''),{mono:true,fs:12,al:'right',dx:-6,a:dl,grp:'d',c:i===0?P.c2:P.ink})});
    // 2. every token v asked under 28 contexts: 28 next-token tables, the donors' log-probabilities streaming in
    const sa=k===0?0:k===1?e:k===2?1:0,col=k>=3?0:1;
    if(sa>0){for(let c=0;c<28;c++){const z0=-.85+c*.063,t=k===2?e:0,x=lerp(SX,MX,t)-.8,zz=lerp(z0,0,t);R.glass([x,.15,zz],[1.6,0,0],[0,1.6,0],{c:P.c1,a:sa*(k===2?1-e:1)*(c%9===0||c===27?.5:.12),nu:3,nv:3,th:.01})}
      if(k===1)DON.forEach(([n,w],i)=>R.flowArc([DX+.3,.2+1.7*w,dz(i)],[SX-.9,1,dz(i)*.5],.4,{c:i===0?P.c2:P.c1,a:e,r:.04+.06*w,n:Math.max(2,Math.round(2+14*w)),speed:1.3}));
      if(k===1)R.label([SX,1.85,0],'28 contexts × 50,257 × 50,257',{mono:true,fs:12,b:1,c:P.c1,a:e})}
    // 3. blended and averaged into one table M; 4. its column mean u split off; C = M - 1uᵀ remains
    const ma=k===2?e:k>=3&&k<=4?1:k===5?1-.8*e:.2,ml=k<=4?ma:k===5?1-e:0;
    if(k>=2){R.glass([MX-.8,.15,0],[1.6,0,0],[0,1.6,0],{c:k>=3?P.c4:P.c1,a:ma,nu:8,nv:8});
      R.label([MX,1.85,0],k>=3?'C = M − 1uᵀ':'M · 50,257 × 50,257',{mono:true,fs:12.5,b:1,c:k>=3?P.c4:P.c1,a:ml});
      if(k===2)R.label([MX-.85,.95,0],'previous token v',{mono:true,fs:12,al:'right',dx:-4,c:P.mute,a:e,wide:1})}
    if(k>=3){const lift=k===3?e:1,ua=k>=5?(k===5?1-.8*e:.2):1,ul=k>=5?(k===5?1-e:0):1;R.glass([MX-.8,.15+1.75+.35*lift,0],[1.6,0,0],[0,.14,0],{c:P.c5,a:ua,nu:16,nv:1});
      R.label([MX+.9,2.0+.35*lift,0],'u · column mean, the anchor',{mono:true,fs:12,al:'left',dx:6,c:P.c5,b:1,a:ul})}
    // 5. randomized SVD to rank 671: two thin factors, and how much of C each rank keeps (our rebuild)
    if(k>=4){const fa=k===4?e:k===5?1-e:0;
      if(fa>0){R.glass([.5,.15,0],[.3,0,0],[0,1.6,0],{c:P.c6,a:fa,nu:2,nv:8});R.glass([1.1,1.45,0],[1.6,0,0],[0,.3,0],{c:P.c6,a:fa,nu:8,nv:2});
        R.label([.85,.45,0],'E · 50,257 × 671',{mono:true,fs:12,al:'left',dx:6,c:P.c6,a:fa});R.label([1.9,1.85,0],'H · 671 × 50,257',{mono:true,fs:12,c:P.c6,a:fa});
        if(k===4){R.flow([[MX+.8,.9,0],[.5,.9,0]],{c:P.c4,a:e,r:.05,n:4});R.flow([[MX+.4,1.75,0],[MX+.4,1.95,.1],[1.1,1.6,0]],{c:P.c4,a:e,r:.05,n:4})}}
      if(EN&&k===4)RK.forEach((r,i)=>{const x=.4+i*.5,h=1.3*EN[r]*e;R.box([x,0,1.9],[.32,Math.max(.01,h),.3],{fill:i===5?P.c6:mix(P.paper,P.c6,.45),a:1});
        R.label([x,0,1.9],r,{mono:true,fs:12,dy:14,c:P.mute});R.label([x,h,1.9],(100*EN[r]).toFixed(r==='671'?1:0)+'%',{mono:true,fs:12,dy:-9,c:P.ink,a:e,b:i===5})});
      if(k===4)R.label([.15,.25,1.9],'share of C kept, by rank',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,a:e,wide:1})}
    // 6. stored in the 14-layer target: E becomes the input embedding, H the output head, every sublayer zeroed
    if(k>=5){const ta=k===5?e:1,tl=k===5?e:1-e;for(let l=0;l<14;l++)R.box([TX,.42+l*.1,0],[1.5,.05,1.0],{a:ta*.28,shadow:false});
      R.glass([TX-.75,.28,-.5],[1.5,0,0],[0,0,1.0],{c:P.c6,a:ta,nu:6,nv:3});R.glass([TX-.75,1.9,-.5],[1.5,0,0],[0,0,1.0],{c:P.c6,a:ta,nu:6,nv:3});
      R.label([TX+.8,.3,0],'E → input embedding',{mono:true,fs:12,al:'left',dx:6,c:P.c6,a:tl,grp:'t'});R.label([TX+.8,1.1,0],'14 layers, sublayers zeroed',{mono:true,fs:12,al:'left',dx:6,c:P.mute,a:tl,grp:'t'});
      R.label([TX+.8,1.92,0],'H → output head',{mono:true,fs:12,al:'left',dx:6,c:P.c6,a:tl,grp:'t'});
      if(k===5){R.flow([[.65,1,0],[TX-.4,.3,0]],{c:P.c6,a:e,r:.05,n:5});R.flow([[2.6,1.6,0],[TX-.4,1.95,0]],{c:P.c6,a:e,r:.05,n:5})}
      R.flow([[TX,.3,0],[TX,1.92,0]],{c:P.c2,a:ta,r:.06,n:6,speed:.9})}
    // 7. what it computes for one input token: logits ≈ u/Tᵤ + C(v,·)/T_b, the guesses after " Jane" (our rebuild, rank 671)
    if(k===6){R.box([TX,0,0],[.9,.22,.5],{fill:mix(P.paper,P.c2,.3)});R.label([TX,.11,0],'" Jane"',{mono:true,fs:13,b:1,c:P.ink,dx:0,dy:0});
      const bar=(list,x0,c,a,lab,ph)=>{list.forEach(([t,p],i)=>{const x=x0+i*.5,h=p*7*e;R.box([x,2.05,0],[.34,Math.max(.01,h),.3],{fill:c,a,shadow:false});
          R.label([x,2.05+h,0],'"'+t.replace(/\n/g,'↵')+'"',{mono:true,fs:12,dy:-22,c:P.ink,a:a*e,wide:1});R.label([x,2.05+h,0],(100*p).toFixed(1)+'%',{mono:true,fs:12,dy:-8,c,b:1,a:a*e,wide:ph})});
        R.label([x0+.5,2.05,0],lab,{mono:true,fs:12.5,dy:-2,c,b:1,a:a*e,wide:ph})};
      bar(topSA,TX-1.6,P.c2,1,'Stage A prior',0);bar(topU,TX+.6,P.c5,.85,'anchor u alone',1)}
  }
  const views=[
    {cam:[.5,.42],bounds:[[-5.9,0,-1.9],[-2,2,1.9]]},
    {cam:[.45,.45],bounds:[[-5.9,0,-1.9],[-1.9,2.1,1.9]]},
    {cam:[.35,.42],bounds:[[-4,0,-1.2],[.4,2.2,1.2]]},
    {cam:[.3,.4],bounds:[[-2.2,0,-1],[.9,2.6,1]]},
    {cam:[.35,.45],bounds:[[-1.8,0,-.6],[3.4,2.2,1.8]]},
    {cam:[.35,.45],bounds:[[-.2,0,-1],[5.4,2.3,1]]},
    {cam:[.25,.3],bounds:[[2.4,0,-.8],[6,3.05,.9]]}];
  S3.stage({id:'stg-sa',list:'sx-sa',fig:'Fig. 3 · Stage A, the prior that did most of the work',cam:views[0].cam,bounds:[[-5.9,0,-1.9],[5.8,2.9,1.9]],aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[18,16,14,16],view:k=>views[k]});
})();
