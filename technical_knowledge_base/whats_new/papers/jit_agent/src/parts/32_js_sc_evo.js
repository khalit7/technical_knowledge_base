// ---- Scene: one Evo-GDPO step (Stage III, Eq. 6 and 7) and the bank rule, renderer v2 ----
// Illustrative group: Table 3's six harnesses on DeepSearchQA with DeepSeek-V4-Flash stand in for G = 6 candidates, the best fixed harness
// (NanoBot) for the incumbent, tokens per case for latency (Table 3 reports none). λ_evo = 0.5 and the weights 0.6, 0.2, 0.2 are illustrative
// (the paper gives none; they only respect w_rew > w_lat + w_cost) and match the defaults of the Score a group of harnesses tab.
// Rows are candidates, columns the three channels; bars stand on white plinths, signed after normalisation (positive up, negative hanging below).
// window.JITEVO exposes every number the scene draws for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-evo'))return;const {at,off,lerp,mix}=S3;
  const rows=PT.t3.filter(r=>r.backbone==='DeepSeek-V4-Flash'),LAM=.5,W=[.6,.2,.2];
  const fixed=rows.filter(r=>r.harness!=='JIT-Agent'),inc=fixed.reduce((a,r)=>r.DSQA[0]>a.DSQA[0]?r:a);
  const b={n:inc.harness,r:inc.DSQA[0],l:inc.DSQA[1],k:inc.DSQA[2]};
  const zs=a=>{const m=a.reduce((p,q)=>p+q,0)/a.length,sd=Math.sqrt(a.reduce((p,q)=>p+(q-m)**2,0)/a.length);return a.map(x=>(x-m)/(sd+1e-6))};
  const C=rows.map(r=>{const [x,l,k]=r.DSQA,g=x>=b.r;return {n:r.harness,r:x,l,k,g,Rr:x+LAM*Math.max(0,x-b.r),Rl:g?Math.max(0,b.l-l):0,Rc:g?Math.max(0,b.k-k):0,kept:x>=b.r&&(x>b.r||l<b.l||k<b.k)}});
  const zr=zs(C.map(c=>c.Rr)),zl=zs(C.map(c=>c.Rl)),zc=zs(C.map(c=>c.Rc));
  C.forEach((c,i)=>{c.zr=zr[i];c.zl=zl[i];c.zc=zc[i];c.A=W[0]*zr[i]+W[1]*zl[i]+W[2]*zc[i];c.S=W[0]*c.Rr+W[1]*c.Rl+W[2]*c.Rc});
  const zS=zs(C.map(c=>c.S));C.forEach((c,i)=>c.Ao=zS[i]);
  window.JITEVO={b,lam:LAM,w:W,c:C.map(c=>Object.assign({},c))};
  // candidates side by side along x, the three channels as rows in depth (score at the back), the mixed advantage as a front row
  const n=C.length,CXp=i=>-3.6+i*1.45,RZc=[-1.7,-.45,.8],AZ=2.15,PY=.72,HMAX=1.3,ZS=.36,BANK=[-7.1,0,-1.3],POL=[-7.1,0,1.5];
  const mxl=Math.max(...C.map(c=>c.l),b.l),mxk=Math.max(...C.map(c=>c.k),b.k),mRl=Math.max(...C.map(c=>c.Rl),1e-9),mRc=Math.max(...C.map(c=>c.Rc),1e-9);
  // a plinth and a bar: v>=0 stands on it, v<0 hangs below
  function cell(R,x,z,h,fill,a,lw){const P=R.P;if(a<=.01)return;R.box([x,PY-.045,z],[.8,.045,.62],{a,shadow:false});
    [-1,1].forEach(s=>R.box([x+s*.36,0,z],[.025,PY-.05,.025],{a:a*.55,shadow:false,lw:.5}));
    const hh=Math.max(.014,Math.abs(h));R.box([x,h>=0?PY:PY-.045-hh,z],[.5,hh,.38],{fill,a,shadow:false,lw:lw||.8})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520,col=[P.c1,P.c4,P.c2];R.grid(-8,4.8,-2.8,3,.5);
    // the bank: a stack of harness plates (13 seeds plus every retained harness); the incumbent is the best retrieved one
    const ba=k===0||k===5?1:.25;
    for(let i=0;i<13;i++)R.box([BANK[0],i*.07,BANK[2]],[1.1,.05,.8],{fill:mix(P.paper,P.c1,.12+.02*(i%3)),a:ba,shadow:i===0,lw:.6});
    const kept=C.filter(c=>c.kept).length,grow=k===5?e:0;
    for(let i=0;i<kept;i++)R.box([BANK[0],(13+i)*.07,BANK[2]],[1.1,.05,.8],{fill:mix(P.paper,P.c3,.6),a:grow,shadow:false,lw:.6});
    if(ba>.5)R.label([BANK[0],13*.07+.05,BANK[2]],'bank Bₙ',{mono:true,fs:12.5,b:1,dy:-14,c:P.c1,a:ba});
    if(k===0||k===5)R.label([BANK[0],0,BANK[2]+.4],k===5?(kept+' kept, '+(n-kept)+' not'):'13 seeds + retained',{mono:true,fs:12,dy:14,c:k===5?P.c3:P.mute,a:e,wide:1});
    // the policy that samples the group
    const pa=k===0?1:.25;R.box(POL,[1.0,.55,.7],{fill:mix(P.paper,P.c3,.35),a:pa});if(pa>.5)R.label([POL[0],.55,POL[2]],'p_θ (JIT-Agent)',{mono:true,fs:12.5,b:1,dy:-12,c:P.c3,a:pa});
    if(k===0){C.forEach((c,i)=>R.flowArc([POL[0]+.5,.45,POL[2]],[CXp(i),PY,RZc[2]+.3],.6+.05*i,{c:P.c3,a:e,r:.05,n:4,speed:1.2}));
      R.flowArc([BANK[0]+.5,.9,BANK[2]],[CXp(0)-.9,PY+.6,RZc[0]],.4,{c:P.c1,a:e,r:.055,n:5,speed:1.1});
      R.label([CXp(0)-.9,PY+.6,RZc[0]],'incumbent: '+b.n+', '+b.r,{al:'left',dx:6,mono:true,fs:12.5,b:1,c:P.c1,a:e})}
    // candidate names along the front
    C.forEach((c,i)=>R.label([CXp(i),0,(k>=4?AZ:RZc[2])+.45],narrow?c.n.replace('Claude Code','Claude').replace('JIT-Agent','JIT').replace('OpenCode','OpenC.'):c.n,{fs:12.5,b:c.n==='JIT-Agent'?1:0,dy:narrow&&i%2?30:14,c:c.n==='JIT-Agent'?P.c3:P.ink}));
    // the three channel rows
    const ca=k<=3?1:k===4?1-.7*e:.3;
    const head=k<=1?['score r','tokens (for latency)','cost $']:k===2?['R rew','R lat','R cost']:['A rew','A lat','A cost'];
    if(k>0)RZc.forEach((z,j)=>R.label([CXp(0)-.5,PY,z],head[j],{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:col[j],a:Math.max(.45,ca),grp:'rows'}));
    C.forEach((c,i)=>{const x=CXp(i);
      const raw=[c.r/100*HMAX,c.l/mxl*HMAX,c.k/mxk*HMAX],rew=[c.Rr/100*HMAX,c.Rl/mRl*HMAX*.9,c.Rc/mRc*HMAX*.9],zz=[c.zr*ZS,c.zl*ZS,c.zc*ZS];
      RZc.forEach((z,j)=>{let h;if(k===0)h=0;else if(k===1)h=raw[j]*e;else if(k===2)h=lerp(raw[j],rew[j],e);else if(k===3)h=lerp(rew[j],zz[j],e);else h=zz[j];
        const gated=j>0&&!c.g&&k===2,fill=gated?mix(P.paper,P.mute,.25):h<0?mix(P.paper,col[j],.3):mix(P.paper,col[j],.6);
        cell(R,x,z,h,fill,ca*(k===0?.6:1));
        const top=(t,c2)=>R.label([x,PY+Math.max(0,h),z],t,{mono:true,fs:12.5,b:1,dy:-10,c:c2||col[j],a:e,wide:j===0?0:1});
        if(k===2&&c.n==='JIT-Agent')top(j===0?c.Rr.toFixed(2):j===1?'+'+Math.round(c.Rl)+'K':'+$'+c.Rc.toFixed(3));
        if(k===2&&j===1&&gated&&!narrow)R.label([x,PY,z],'gated',{mono:true,fs:12,dy:-10,c:P.mute,a:e});
        if(k===3&&(c.n==='JIT-Agent'||c.n==='Hermes')){const v=[c.zr,c.zl,c.zc][j];if(j===0||c.n==='JIT-Agent'||!narrow)R.label([x,v>=0?PY+h:PY-.05+h,z],(v>=0?'+':'−')+Math.abs(v).toFixed(2),{mono:true,fs:12.5,b:1,dy:v>=0?-10:12,c:col[j],a:e,wide:j===0?0:1})}})});
    // the incumbent's values as glass sheets across each row (step 3: the efficiency sheets drop to the zero line, where the gate leaves the others)
    if(k>=1&&k<=2){const vals=[b.r/100*HMAX,b.l/mxl*HMAX,b.k/mxk*HMAX],x0=CXp(0)-.5,W=CXp(n-1)-CXp(0)+1;
      RZc.forEach((z,j)=>R.glass([x0,PY+vals[j],z-.34],[W,0,0],[0,0,.68],{c:P.c1,a:(k===1?e:1)*(j===0?1:k===2?1-e:1),nu:6,nv:1}));
      if(k===1)R.label([CXp(n-1)+.5,PY+vals[0],RZc[0]],'incumbent '+b.r,{al:'left',dx:6,mono:true,fs:12,c:P.c1,a:e,wide:1})}
    // the mixed advantage: dots stream from each channel row into the front row, more from the dominant reward channel
    if(k>=4){R.label([CXp(0)-.5,PY,AZ],'A Σ mixed',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.ink,a:k===4?e:1});
      C.forEach((c,i)=>{const x=CXp(i),h=(k===4?e:1)*c.A*ZS*1.15;cell(R,x,AZ,h,h>=0?mix(P.paper,P.ink,.45):mix(P.paper,P.bad,.55),1,1);
        R.label([x,h>=0?PY+h:PY-.05+h,AZ],(c.A>=0?'+':'−')+Math.abs(c.A).toFixed(2),{mono:true,fs:12.5,b:c.n==='JIT-Agent'?1:0,dy:h>=0?-10:12,c:c.A>=0?P.ink:P.bad,a:k===4?e:1});
        if(k===4)RZc.forEach((z,j)=>R.flowArc([x,PY+.25,z+.3],[x,PY+.25,AZ-.3],.35,{c:col[j],a:e,r:.035+.04*W[j],n:Math.round(1+W[j]*8),speed:1.2}))})}
    // the bank rule: kept candidates flow to the bank
    if(k===5)C.forEach((c,i)=>{if(c.kept){R.flowArc([CXp(i),PY+.8,AZ],[BANK[0],1.1,BANK[2]],1.4,{c:P.c3,a:e,r:.07,n:10,speed:1.3});R.label([CXp(i),PY+.9,AZ],'kept',{mono:true,fs:12.5,b:1,dy:-24,c:P.c3,a:e})}});
  }
  const full={cam:[.1,.8],bounds:[[-7.8,0,-2.2],[4.6,1.9,2.9]]};
  S3.stage({id:'stg-evo',list:'sx-evo',fig:'3D · one Evo-GDPO group · Table 3 numbers, weights illustrative',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1600,hold:5000,draw,
    margin:w=>w<520?[14,8,18,8]:[18,16,22,16],
    // running, gating and normalising move in close on the three channel rows; mixing adds the front row; sampling and the bank show everything
    view:k=>k>=1&&k<=3?{cam:[.1,.66],bounds:[[-5.6,0,-2.2],[4.6,1.9,1.4]]}:k===4?{cam:[.1,.7],bounds:[[-5.6,0,-2.2],[4.6,1.9,2.9]]}:full});
})();
