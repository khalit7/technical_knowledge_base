// ---- Scene: the OLMo 2 recipe, one model from warm-up to RLVR (renderer v2: the learning rate as a wall over a token axis, the anneals as lanes in depth,
// glass plates for weights, flowing dots wherever data or weights move, scores as bars on white plinths) ----
// Every number comes from window.PAPER: stage-1 tokens from the released checkpoint branches (recompute.py, rc.tokens), the learning rate at the cut
// (rc.lr_at_cut), checkpoint branch counts (rc.refs), base averages and GSM8K from Table 9, instruct averages, GSM8K and MATH from Table 16.
// The schedule (peak, 2,000 warm-up steps, cosine to 10% of the peak at 5T or 6.5T, batch) is Table 3's and §4.1's. Replaces the 2D animation of 14_js_pipe.js.
(function(){
  if(!document.getElementById('stg-pipe')||!window.S3)return;const {at,off,mix,lerp}=S3;
  const K=RC.tokens,REF=RC.refs,S16=TB.t16.rows,G9=RC.t9_gains;
  const M={
    '7B':{repo:'OLMo-2-1124-7B',peak:3e-4,T:5.0,bt:1024*4096,anneal:[50,50,50],g:'OLMo 2 7B',sft:'939,104',rl:'PPO, value function from the 7B reward model'},
    '13B':{repo:'OLMo-2-1124-13B',peak:9e-4,T:5.0,bt:2048*4096,anneal:[100,100,100,300],g:'OLMo 2 13B',sft:'939,104',rl:'PPO in three passes: general, GSM8K, MATH'},
    '32B':{repo:'OLMo-2-0325-32B',peak:6e-4,T:6.5,bt:2048*4096,anneal:[100,100,100,300],g:'OLMo 2 32B',sft:'866,138',rl:'GRPO, no reward model, 16 samples a prompt'}};
  Object.keys(M).forEach(m=>{const P=M[m];P.cut=K[P.repo].stage1_T;P.lrc=RC.lr_at_cut[m];P.warmB=2000*P.bt/1e9;P.ck=REF[P.repo].stage1;
    P.pre=G9[P.g].pre;P.mid=G9[P.g].mid;const t9=TB.t9.rows.filter(r=>r.g===P.g).map(r=>r.c);P.gsmPre=t9[0][9];P.gsmMid=t9[1][9];
    P.post=['SFT','DPO','Instruct'].map(s=>S16.find(r=>r.c[0]===P.g+' '+s).c)});
  let MODE='7B';
  // layout in world units: x is tokens; pretraining to scale on 0 to 6.5T, mid-training stretched on its own scale; z separates the anneal runs
  const XA=-6,ZD=.8,S1=6.6/6.5,xt=t=>XA+t*S1,H=1.5,XM0=1.4,MW=2.2,XS=4.3,XP=[5.25,6.05,6.85],PW=.62,PH=.85,BS=1.25/100;
  const lrAt=(t,P)=>{const w=2000*P.bt/1e12;return t<w?t/w:.1+.9*.5*(1+Math.cos(Math.PI*t/P.T))};
  const lanes=P=>{const n=P.anneal.length,sp=n===3?.8:.75;return P.anneal.map((len,i)=>({len,z:(i-(n-1)/2)*sp*(n===3?1:1.05),amax:Math.max(...P.anneal)}))};
  const zoom=P=>(MW/(Math.max(...P.anneal)/1000))/S1;
  // a score as a bar on a white plinth
  function bar(R,x,z,v,c,a,lab,sub){if(a<=.01)return;R.box([x,0,z],[.42,.05,.42],{a,shadow:false});const h=v*BS;R.box([x,.05,z],[.26,h,.26],{fill:c,a,lw:.7,shadow:false});
    R.label([x,.05+h,z],lab,{mono:true,fs:12.5,b:1,dy:-10,a});if(sub)R.label([x,0,z+.21],sub,{mono:true,fs:12,c:R.P.mute,dy:12,a,wide:1})}
  function plate(R,x,z,w,h,c,a,name,sub){if(a<=.01)return;R.glass([x-w/2,.06,z],[w,0,0],[0,h,0],{c,a,nu:Math.max(3,Math.round(w*7)),nv:5});
    if(name&&a>.3)R.label([x,h+.06,z],name,{fs:12.5,b:a>.6,c,dy:sub&&a>.6&&R.W>=520?-26:-10,a:Math.max(.45,a)});if(sub&&a>.6)R.label([x,h+.06,z],sub,{fs:12,mono:true,c:R.P.mute,dy:-10,a,wide:1})}
  function draw(R,k,e){const P=M[MODE],Pc=R.P,L=lanes(P),zl=Math.max(...L.map(l=>Math.abs(l.z))),xc=xt(P.cut);
    R.grid(-6.6,7.4,-zl-1.6,zl+2,.5);
    // what each step is about stays at full strength; the rest recedes
    const f=[[1,.3,0,0,0,0,0],[1,1,0,0,0,0,0],[.6,1,0,0,0,0,0],[.3,.5,1,0,0,0,0],[.25,.3,.5,1,0,0,0],[.2,.25,.3,.5,1,.15,.15],[.2,.25,.3,.4,.5,1,.15],[.3,.3,.3,.4,.5,.5,1]][k];
    // 1-2. the pretraining mix and the learning-rate wall, drawn to scale up to where stage 1 ends
    const prog=k===0?.03+.02*e:k===1?.05+.95*e:1,tEnd=P.cut*prog;
    // the pretraining mix lies in front of the wall, 3.9T long on the same token axis (the 13B and 32B run past its end: more than one pass)
    R.box([xt(3.9/2),0,ZD],[3.9*S1,.16,.45],{fill:mix(Pc.paper,Pc.c1,.35),a:k<=2?Math.max(.4,f[1]):k===4?.1:.25});
    if(k<=1)R.label([xt(.1),0,ZD+.22],'OLMo 2 Mix 1124 · 3.9T tokens',{al:'left',mono:true,fs:12,c:Pc.c1,dy:20,a:Math.max(.5,f[1])});
    const wall=[[xt(0),0,0]];for(let i=0;i<=160;i++){const t=tEnd*i/160;wall.push([xt(t),H*lrAt(t,P),0])}wall.push([xt(tEnd),0,0]);
    R.quad(wall,{fill:mix(Pc.paper,Pc.acc,.45),fa:.55,a:k===4?.1:Math.max(.25,f[0]),edge:false});R.line(wall.slice(1,-1),{c:Pc.acc,w:2.2,a:k===4?.12:Math.max(.3,f[0])});   // step 5's close view cuts these at its left edge, so they recede further there
    if(k<=2){[0,1,2,3,4,5,6].forEach(t=>R.label([xt(t),0,ZD+.5],t+'T',{mono:true,fs:12,c:Pc.mute,dy:8,a:.9,wide:t%2?1:0}));
      R.label([xt(0)-.12,H,0],'100% of peak',{al:'right',mono:true,fs:12,c:Pc.mute,grp:'ax'});R.label([xt(0)-.12,H*.1,0],'10%',{al:'right',mono:true,fs:12,c:Pc.mute,grp:'ax'})}
    if(k===0){R.glow([xt(P.cut*prog),H,0],.4,{c:Pc.acc});R.label([xt(.15),H,0],'warm-up: 2,000 steps, '+P.warmB.toFixed(1)+'B tokens',{al:'left',fs:12.5,b:1,c:Pc.acc,dx:10,dy:-14})}
    if(k<=1){const tc=tEnd,from=[xt(Math.min(tc,3.9)),.16,ZD];R.flowArc(from,[xt(tc),Math.max(.15,H*lrAt(tc,P)),0],.45,{c:Pc.c1,a:k===1?1:.6,r:.06,n:7,speed:1.3})}
    if(k===1)R.label([xt(1.6),H*lrAt(1.6,P),0],'cosine, to 10% of the peak at '+P.T+'T',{al:'left',fs:12.5,c:Pc.acc,dx:8,dy:-12,a:e});
    // 3. where stage 1 stops, the rest of the cosine it never ran, and the stage-1 checkpoint
    if(k>=2){const a3=Math.max(.3,f[1]);if(P.T>P.cut+.01){const g=[];for(let i=0;i<=40;i++){const t=P.cut+(P.T-P.cut)*i/40;g.push([xt(t),H*lrAt(t,P),0])}R.line(g,{c:Pc.mute,w:1.4,dash:[5,4],a:a3*(k===2?e:1)});
        if(k===2)R.label([xt(P.T),H*.1,0],'the cosine would end at '+P.T+'T',{al:'left',fs:12,c:Pc.mute,dx:6,dy:-10,a:e,wide:1})}
      R.line([[xc,0,0],[xc,H*1.05,0]],{c:Pc.bad,w:1.6,dash:[4,4],a:a3});
      if(k===2)R.label([xc,H*1.05,0],'stage 1 ends · '+P.cut.toFixed(2)+'T · '+Math.round(P.lrc*100)+'% of peak',{fs:12.5,b:1,c:Pc.bad,dy:-10});
      plate(R,xc+.05,.35,.5,.62,Pc.c5,k===2?e:k===4?.1:Math.max(.3,f[2]*.8),k===2?'stage-1 checkpoint':null)}
    // 4. mid-training: the same checkpoint restarted on Dolmino Mix 1124, each run a lane in depth, the learning rate falling linearly to zero
    if(k>=3){const a4=k===3?1:Math.max(.3,f[2]),pr=k===3?e:1,zd=-zl-.9,h0=H*P.lrc;
      R.box([XM0+MW/2,0,zd],[MW,.2,.45],{fill:mix(Pc.paper,Pc.c3,.4),a:a4});if(k===3)R.label([XM0,.2,zd],'Dolmino Mix 1124 · '+Math.min(...P.anneal)+'B'+(P.anneal.length>3?' and 300B':''),{al:'left',mono:true,fs:12,c:Pc.c3,dy:-12,a:a4});
      L.forEach((l,i)=>{const len=MW*l.len/l.amax,xe=XM0+len*pr,col=l.len>100?Pc.c5:Pc.c3;
        R.quad([[XM0,0,l.z],[XM0,h0,l.z],[xe,h0*(1-pr),l.z],[xe,0,l.z]],{fill:mix(Pc.paper,col,.45),fa:.6,a:a4,edge:false});R.line([[XM0,h0,l.z],[xe,h0*(1-pr),l.z]],{c:col,w:2,a:a4});
        if(k===3){R.flowArc([xc+.05,.5,.35],[XM0,h0,l.z],.35,{c:Pc.c5,a:.9*e,r:.055,n:6,speed:1.4});R.flowArc([XM0+len*.5,.2,zd],[XM0+len*.5*pr,Math.max(.1,h0*(1-.5*pr)),l.z],.3,{c:Pc.c3,a:.8*e,r:.05,n:5})}
        if(k===3)R.label([XM0+len,0,l.z],l.len+'B · order '+(i+1),{al:'left',mono:true,fs:12,c:col,dx:8,a:pr,grp:'lanes'})});
      if(k===3)R.label([XM0+MW/2,0,zl+.45],'token axis stretched ×'+Math.round(zoom(P)),{fs:12,c:Pc.mute,dy:12,a:e,wide:1})}
    // 5. the soup: each run's weights (a plate at its lane's end) slide together and are averaged into one model
    if(k>=4){const a5=k===4?1:Math.max(.3,f[3]),t=k===4?e:1;
      L.forEach(l=>{const x0=XM0+MW*l.len/l.amax+.25,x=lerp(x0,XS,t),z=lerp(l.z,0,t);plate(R,x,z,.42,.6,Pc.c5,a5*(k===4?1-.8*e:.15),null);
        if(k===4)R.flowArc([x0,.4,l.z],[XS,.45,0],.3,{c:Pc.c5,a:.9,r:.055,n:6})});
      plate(R,XS,0,.62,.8,Pc.c5,k===4?e:Math.max(.35,a5),'soup',k===4?'average of '+L.length+' runs':null);
      const zb=zl+.75;bar(R,XS-.3,zb,P.pre,mix(Pc.paper,Pc.mute,.5),a5,P.pre.toFixed(1),k===4?'stage 1':null);bar(R,XS+.3,zb,P.mid*(k===4?lerp(P.pre/P.mid,1,e):1),Pc.c5,a5,P.mid.toFixed(1),k===4?'souped':null);
      if(k===4)R.label([XS,.05+P.mid*BS,zb],'base average, 10 tasks (Table 9)',{fs:12,c:Pc.mute,dy:-30,wide:1})}
    // 6-8. post-training: SFT, DPO, RLVR, each a plate with its instruct average (Table 16, a different ten tasks) on a plinth in front
    const names=['SFT','DPO','RLVR'],cols=[Pc.c1,Pc.c2,Pc.c6],subs=[P.sft+' prompts','preference pairs',null];
    for(let i=0;i<3;i++){if(k<5+i)break;const a=Math.max(.3,f[4+i]),cur=k===5+i,x=XP[i],xprev=i?XP[i-1]:XS;
      plate(R,x,0,PW,PH,cols[i],cur?Math.max(.3,e):a,names[i],cur?subs[i]:null);
      if(cur)R.flow([[xprev+.1,.45,0],[x-.1,.45,0]],{c:cols[i],a:e,r:.06,n:5});
      const v=num(P.post[i][1]);bar(R,x,.95,v*(cur?lerp(.6,1,e):1),cols[i],cur?1:Math.max(.35,a*.8),P.post[i][1],null);
      if(cur&&i===2){const xv=x+.95;R.box([xv,0,0],[.5,.3,.4],{fill:mix(Pc.paper,Pc.c6,.3),a:e});R.label([xv,.3,0],'verifier',{fs:12,mono:true,dy:-10,a:e});R.label([xv,0,.2],'1 if correct',{fs:12,mono:true,c:Pc.mute,dy:12,a:e,wide:1});
        R.flowArc([x+.3,.6,0],[xv-.1,.32,0],.25,{c:Pc.c6,a:e,r:.05,n:5});R.flowArc([xv+.05,.32,0],[x+.32,.3,0],.35,{c:Pc.good,a:e,r:.05,n:5})}}
    if(k===5)R.label([XP[0],0,1.16],'instruct average, 10 tasks (Table 16)',{fs:12,c:Pc.mute,dy:14,wide:1})}
  // the counters under the step list: the chosen model at this step
  function counters(k){const el=document.getElementById('pipeCnt');if(!el)return;const P=M[MODE],R=REF[P.repo];
    const anneal=P.anneal.reduce((a,b)=>a+b,0)/1000,tok=k<2?(k===0?P.warmB/1000:P.cut):P.cut+(k>=3?anneal:0);
    const lr=k===0?1:k===1?lrAt(P.cut*.5,P):k===2?P.lrc:0;
    const ck=k<3?P.ck:P.ck+Object.keys(R).filter(x=>x.startsWith('stage2')).reduce((a,x)=>a+R[x],0);
    const score=k<2?'n/a':k<4?P.pre.toFixed(1)+' (base)':k===4?P.mid.toFixed(1)+' (base)':P.post[k-5][1]+' (instruct)';
    el.innerHTML=stat('Tokens trained',(k===0?'0.01':tok.toFixed(2))+'T',k>=3?'all anneal runs counted':k===0?'the warm-up':'stage 1')+
      (k>=4?stat('Learning rate','annealed to 0','post-training has its own schedules'):stat('Learning rate',k===1?'cosine from 100%':Math.round(lr*100)+'% of peak',k===3?'falls linearly to 0':Math.round(P.peak*1e4)+' × 10⁻⁴ peak'))+
      stat('Public checkpoints',fmt(ck),'branches on Hugging Face')+stat('Average score',score,k>=5?'Table 16 (10 tasks)':'Table 9 (10 tasks)')}
  const full=()=>({cam:[.28,.62],bounds:[[-6.4,0,-1.6],[7.3,1.7,1.6]]});
  function view(k){const P=M[MODE],L=lanes(P),zl=Math.max(...L.map(l=>Math.abs(l.z))),xc=xt(P.cut);let v;
    if(k===0)v={cam:[.35,.5],bounds:[[-6.6,0,-.4],[-2.2,1.7,1.4]]};
    else if(k===1)v={cam:[.3,.55],bounds:[[-6.6,0,-.3],[xc+.4,1.7,1.4]]};
    else if(k===2)v={cam:[.35,.55],bounds:[[Math.min(xc,xt(P.T))-1.8,0,-1.3],[Math.max(xt(P.T),xc)+.9,1.75,.7]]};
    else if(k===3)v={cam:[.25,.85],bounds:[[xc-.3,0,-zl-1.2],[XM0+MW+.9,1.2,zl+.4]]};
    else if(k===4)v=innerWidth>=1100?{cam:[-.2,.7],bounds:[[XM0+.2,0,-zl],[XS+.6,1.3,zl+1]]}:{cam:[.2,.7],bounds:[[XM0+.5,0,-zl-.3],[XS+.9,1.4,zl+1.2]]};   // the two-column card is taller: turned so the lanes and the soup fill it
    else if(k<=6)v={cam:[.15,.6],bounds:[[XS-.7,0,-.9],[7.3,1.5,1.4]]};
    else v={cam:[.2,.62],bounds:[[XM0+.3,0,-1.5],[8.1,1.6,zl+1.1]]};
    return innerWidth<600?{cam:[v.cam[0]+.15,Math.max(.8,v.cam[1]+.2)],bounds:v.bounds}:v}
  const stg=S3.stage({id:'stg-pipe',list:'sx-pipe',fig:'Fig. 1 · one model through the recipe',cam:full().cam,bounds:full().bounds,aspect:.5,dur:1500,hold:5200,draw,view,
    onStep:k=>counters(k),margin:w=>w<520?[14,10,14,10]:[18,14,16,96]});
  counters(0);
  const seg=document.getElementById('pipeM');if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;stg.list('sx-pipe');counters(0)}));
  window.OLMO_PIPE={M,zoom:m=>zoom(M[m]),lrAt:(t,m)=>lrAt(t,M[m])};
})();
