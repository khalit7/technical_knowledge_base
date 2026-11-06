// ---- Scene (sections 11 to 13, Fig. 11): the off-policy actor-critic loop shared by DDPG, TD3 and SAC (renderer v2).
// Networks are glass plates (actor orange, critic blue, slow target copies teal), the environment a block, the replay buffer a rack of transitions;
// each step shows one hop of data as a flow and moves the camera to the two parts it joins. The settings drawn are the papers' (sections 11 to 13). ----
(function(){
  if(!document.getElementById('stg-oac'))return;const {at,off,lerp,mix}=S3;
  const M={ddpg:{actor:'actor μθ(s)',aSub:'deterministic + noise',critic:['critic Q'],targ:['Q′, μ′'],tau:'τ = 0.001',batch:'minibatch 64',y:'y = r + γ Q′(s′, μ′(s′))',grad:'∇ₐQ(s, μ(s))',hi:[],
      cap:'DDPG: the critic regresses onto y = r + γQ′(s′, μ′(s′)); the actor climbs the critic\'s slope ∇ₐQ through the chain rule; exploration is noise added to the action; the targets follow the learned networks slowly (τ = 0.001).'},
    td3:{actor:'actor μθ(s)',aSub:'updated every d = 2 critic steps',critic:['Q₁','Q₂'],targ:['Q′₁, Q′₂','μ′'],tau:'τ = 0.005',batch:'minibatch 100',y:'y = r + γ min Q′ᵢ(s′, μ′(s′) + ε)',grad:'∇ₐQ₁(s, μ(s)), every 2nd step',hi:['actor','critic','targ'],
      cap:'TD3 (changes in orange): two critics and the smaller target value; clipped noise ε ~ clip(𝒩(0, 0.2), −0.5, 0.5) on the target action; the actor and the targets update once every two critic steps.'},
    sac:{actor:'actor π(a | s)',aSub:'tanh Gaussian, reparameterised',critic:['Q₁','Q₂'],targ:['Q′₁, Q′₂'],tau:'τ = 0.005; α learned',batch:'minibatch 256',y:'y = r + γ(min Q′ᵢ(s′, a′) − α log π(a′ | s′))',grad:'∇ through a = tanh(μ + σξ)',hi:['actor','critic','targ'],
      cap:'SAC (changes in orange): a stochastic tanh-Gaussian actor sampled with the reparameterisation trick, so the gradient of α log π − Q flows through the sampled action; the target subtracts α log π of the next action a′ ~ π; twin critics as in TD3; α itself is learned toward the target entropy −dim(A).'}};
  let mode='ddpg';
  const POS={actor:[-3.1,-1.3],env:[0,-1.3],buf:[3.1,-1.3],critic:[0,1.4],targ:[-3.1,1.4]};
  const ACT=[['actor','env'],['env','buf'],['buf','critic'],['targ','critic'],['critic','actor'],['critic','targ']];
  // a network: one or two glass plates (weight matrices) standing on a white plinth
  function net(R,key,c,names,a,ghost){const [x,z]=POS[key],m=names.length;if(a<=.01)return;
    names.forEach((nm,i)=>{const dz=(i-(m-1)/2)*.5,zz=z+dz;R.box([x,0,zz],[1.3,.09,.34],{a});R.glass([x-.6,.12,zz],[1.2,0,0],[0,1.0,0],{c,a:a*(ghost?.7:1),nu:6,nv:5})})}
  function draw(R,k,e){const P=R.P,C=M[mode],nar=R.W<520,act=ACT[k];
    const al=key=>act.indexOf(key)>=0?1:.2,hi=key=>C.hi.indexOf(key)>=0;R.grid(-4.8,4.8,-2.8,3,.5);
    // labels: the two parts a step joins in full, the others faint and without their detail line
    const lab=(key,t,sub,c)=>{const [x,z]=POS[key],on=al(key)>.5;if(!on&&k!==4)return;R.label([x,1.15,z],t,{fs:13,b:1,c:hi(key)?P.c2:c||P.ink,a:on?1:.4,dy:-8});
      if(sub&&on)R.label([x,0,z+.55],sub,{fs:12,dy:14,c:hi(key)?P.c2:P.mute,wide:1})};
    // the parts
    net(R,'actor',P.c2,[C.actor],al('actor'));lab('actor',nar?'actor':C.actor,C.aSub,P.c2);
    R.box([POS.env[0],0,POS.env[1]],[1.6,1.0,1.0],{fill:mix(P.paper,P.c3,.18),a:al('env')});lab('env','environment','returns r, s′');
    const nb=12,newOne=k===1?e:k>1?1:0;for(let i=0;i<nb;i++){const last=i===nb-1,a=al('buf')*(last?newOne:1);if(a<=.01)continue;
      R.box([POS.buf[0],0,POS.buf[1]-.9+i*.16],[1.3,.72,.06],{fill:last?mix(P.paper,P.c5,.6):P.paper,a,shadow:i===0})}
    lab('buf','replay buffer','10⁶ transitions (s, a, r, s′)');
    net(R,'critic',P.acc,C.critic,al('critic'));lab('critic',C.critic.length>1?'twin critics '+C.critic.join(', '):'critic Q(s, a)','regresses onto y');
    net(R,'targ',P.c6,C.targ.map(()=>''),al('targ')*.8,true);lab('targ','targets '+C.targ.join(', '),C.tau);
    // the hop this step is about, as a stream of dots coloured by what moves
    const t=Math.min(1,e*1.5),[ax,az]=POS.actor,[ex,ez]=POS.env,[bx,bz]=POS.buf,[cx,cz]=POS.critic,[tx,tz]=POS.targ;
    if(k===0){R.flowArc([ax+.65,.6,az],[ex-.85,.6,ez],.35,{c:P.c2,a:t,r:.075,speed:1.4});R.label([(ax+ex)/2,.95,az],mode==='sac'?'a ~ π(· | s)':'a = μ(s) + noise',{mono:true,fs:12.5,b:1,c:P.c2,a:t})}
    if(k===1){R.flowArc([ex+.85,.6,ez],[bx-.7,.5,bz+.9],.35,{c:P.c5,a:t,r:.075,speed:1.4});R.label([(ex+bx)/2,.95,ez],'store (s, a, r, s′)',{mono:true,fs:12.5,b:1,c:P.c5,a:t})}
    if(k===2){for(let i=0;i<3;i++)R.flowArc([bx-.2+i*.2,.75,bz+.2*i],[cx+.65,.55+.12*i,cz],.5,{c:P.c5,a:t,r:.06,speed:1.5,n:7});R.label([(bx+cx)/2+.3,1.2,(bz+cz)/2],C.batch,{mono:true,fs:12.5,b:1,c:P.c5,a:t})}
    if(k===3){const m=C.targ.length;for(let i=0;i<Math.max(1,C.critic.length);i++)R.flowArc([tx+.65,.6,tz+(i-(C.critic.length-1)/2)*.5],[cx-.65,.6,cz+(i-(C.critic.length-1)/2)*.5],.35,{c:P.c6,a:t,r:.07,speed:1.4});
      R.label([(tx+cx)/2,1.25,tz],C.y,{mono:true,fs:12.5,b:1,c:hi('targ')?P.c2:P.c6,a:t})}
    if(k===4){R.flowArc([cx-.3,1.05,cz-.2],[ax+.3,1.05,az+.2],.8,{c:P.acc,a:t,r:.08,speed:1.3});R.label([(cx+ax)/2,1.95,(cz+az)/2],C.grad,{mono:true,fs:12.5,b:1,c:hi('actor')?P.c2:P.acc,a:t})}
    if(k===5){R.flowArc([cx-.65,.35,cz+.3],[tx+.65,.35,tz+.3],.2,{c:P.c6,a:t*.8,r:.05,speed:.45,n:4});R.label([(cx+tx)/2,.75,cz+.3],'θ′ ← τθ + (1 − τ)θ′',{mono:true,fs:12.5,b:1,c:P.c6,a:t})}
  }
  // the camera frames the two parts a step joins; step 1 and the whole loop use the full view
  const full={cam:[-.18,.62],bounds:[[-4.3,0,-2.3],[4.3,1.4,2.3]]};
  const pair=k=>{const [a,b]=ACT[k].map(x=>POS[x]);return [[Math.min(a[0],b[0])-1.4,0,Math.min(a[1],b[1])-1.0],[Math.max(a[0],b[0])+1.4,1.8,Math.max(a[1],b[1])+1.0]]};
  const st=S3.stage({id:'stg-oac',list:'sx-oac',fig:'Fig. 11 · the off-policy actor-critic loop',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===4?full:{cam:[-.18,.62],bounds:pair(k)}});
  // DDPG, TD3, SAC: the same loop with the parts that change marked; a mode change replays from step 1
  const B=document.getElementById('rd-oacM'),X=document.getElementById('rd-oacX');
  if(B)B.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||!M[b.dataset.m])return;mode=b.dataset.m;
    [...B.children].forEach(x=>x.classList.toggle('on',x===b));if(X)X.textContent=M[mode].cap;st.list('sx-oac')});
  window.PG3=Object.assign(window.PG3||{},{oac:{modes:Object.keys(M)}});
})();
