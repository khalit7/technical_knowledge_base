// ---- Scene: PPO against GRPO on one toy question, 7 + 8 (renderer v2: the four models as glass plates at the back, the camera moving in close per step,
// flowing dots wherever samples, rewards, values or gradients move, signed bars on white plinths). Before and after on the same input: switch the mode
// and the value model's plate is gone. Data: READTOY() from 13_js_read.js, computed in the browser from the page's toy (TOY, 22_js_toy.js):
// PPO follows one wrong output of the toy PPO policy after 100 steps (its critic's V_t, the KL-charged rewards r_t, GAE with lambda 0.95);
// GRPO samples eight outputs from the base model (rewards, group mean and unbiased std, advantages). Nothing here is DeepSeek's data. ----
(function(){
  if(!document.getElementById('stg-ppo'))return;const {lerp,mix}=S3;
  let MODE='ppo';
  const ZB=-2.3,PW=1.5,PH=1.05,PX={pol:-3.15,val:-1.05,ref:1.05,rw:3.15},Y0=.6;
  const ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),cl=v=>v<0?0:v>1?1:v;
  const sg=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(3);
  function plate(R,key,c,a,name){const x=PX[key];R.glass([x-PW/2,.06,ZB],[PW,0,0],[0,PH,0],{c,a,nu:6,nv:4});R.label([x,PH+.06,ZB],name,{fs:12,b:a>.6,c,dy:-9,a:Math.max(.45,a),grp:'plates'})}
  function ghost(R,a){const x=PX.val,y0=.06,y1=PH+.06,x0=x-PW/2,x1=x+PW/2,P=R.P;R.line([[x0,y0,ZB],[x1,y0,ZB],[x1,y1,ZB],[x0,y1,ZB],[x0,y0,ZB]],{c:P.mute,w:1.4,dash:[5,4],a});
    R.label([x,y1,ZB],'no value model',{fs:12,c:P.mute,dy:-9,a,grp:'plates'})}
  function plinth(R,z,w,a){if(a<=.01)return;R.box([0,Y0-.045,z],[w,.045,.46],{a,shadow:false});[-1,1].forEach(s=>R.box([s*w/2,0,z],[.04,Y0-.05,.04],{a:a*.9}))}
  function bar(R,x,z,v,c,a,wd){if(a<=.01)return;const h=Math.max(.012,Math.abs(v));R.box([x,v>=0?Y0:Y0-.045-h,z],[wd||.5,h,.3],{fill:c,a,shadow:false,lw:.7})}
  // ---- PPO: one output, three tokens; one plinth in front with three bars per token: r_t (with the KL charge), V_t (the critic), A_t (GAE) ----
  const TX=t=>-1.4+t*1.6,QX=-3.3,ZT=-.2,ZP=2.4,SV=.5,OFF=[-.38,0,.38];
  function drawPPO(R,k,e,D){const P=R.P,on=(s)=>k===s?e:k>s?1:0;
    const act={pol:k===0||k===5,val:k===3||k===5,ref:k===2,rw:k===1};
    plate(R,'pol',P.c1,act.pol?1:.3,k===5?'policy · trained':'policy');plate(R,'val',P.c6,act.val?1:.3,k===5?'value model · trained':'value model');
    plate(R,'ref',P.c4,act.ref?1:.3,k===5?'reference · frozen':'reference');plate(R,'rw',P.c5,act.rw?1:.3,k===5?'reward model · frozen':'reward model');
    R.box([QX,0,ZT],[1.0,.32,.5],{fill:mix(P.paper,P.ink,.06),a:k===0?1:.4});R.label([QX,.32,ZT],'7 + 8',{mono:true,fs:13,b:1,dy:-9,a:k===0?1:.5});
    const ta=k===0||k===1||k===5?1:.6;
    D.po.forEach((d,t)=>{const x=TX(t),grow=k===0?cl(e*1.6-t*.3):1;if(grow<=0)return;const last=t===2&&k>=1;
      R.box([x,0,ZT],[.9,.55*grow,.7],{fill:last?mix(P.paper,D.R?P.good:P.bad,.5*on(1)):P.paper,a:ta,lw:.8});
      R.label([x,.55,ZT],String(d),{mono:true,fs:16,b:1,dy:-10,a:ta*grow});
      R.label([x,.55,ZT],'π '+D.pp[t].toFixed(2),{mono:true,fs:12,dy:-30,c:P.c1,a:ta*grow});R.label([x,0,ZT+.35],['scratch','tens','units'][t],{mono:true,fs:12,dy:13,c:P.mute,a:ta*grow,wide:1})});
    if(k===0){R.flow([[QX,.35,ZT-.2],[PX.pol,.5,ZB+.03]],{c:P.ink,a:e*.8,r:.055,n:3});D.po.forEach((_,t)=>R.flowArc([PX.pol+.3,.7,ZB+.05],[TX(t),.6,ZT-.2],.5,{c:P.c1,a:e*.85,r:.06,n:4}))}
    if(k===1){R.flowArc([PX.rw,.8,ZB+.05],[TX(2),.6,ZT-.2],.6,{c:P.c5,a:e*.9,r:.065,n:6});R.glow([TX(2),.75,ZT],.3,{c:D.R?P.good:P.bad,a:e*.8});
      R.label([TX(2),.55,ZT],'r = '+D.R+(D.R?'':' · '+(D.po[1]*10+D.po[2])+' is wrong'),{dy:-50,mono:true,fs:13,b:1,c:D.R?P.good:P.bad,a:e})}
    const rows=[[D.rt,2,P.c4,'r_t · reward with KL'],[D.V,3,P.c6,'V_t · value model'],[D.adv,4,null,'A_t · GAE advantage']];
    if(k>=2)plinth(R,ZP,4.7,k===2?Math.min(1,e*2):1);
    rows.forEach(([vals,s,c,lab],ri)=>{if(k<s)return;const cur=k===s||k===5&&s===4,a=k===s?Math.min(1,e*1.6):(cur?1:.45);
      vals.forEach((v,t)=>{const g=k===s?ease(cl(e*1.2)):1,col=c?mix(P.paper,c,.8):(v>=0?P.good:P.bad);bar(R,TX(t)+OFF[ri],ZP,v*SV*g,col,a,.3);
        if(cur)R.label([TX(t)+OFF[ri],v>=0?Y0+v*SV*g:Y0-.05,ZP],sg(v),{mono:true,fs:12,dy:v>=0?-10:14,a:k===s?cl(e*2-.6):1,grp:'v'})});
      R.label([TX(0)-.75,Y0,ZP],lab,{al:'right',dx:-8,mono:true,fs:12,c:c||P.bad,b:cur,grp:'row',a:Math.max(.5,a)})});
    if(k===2)D.po.forEach((_,t)=>R.flowArc([PX.ref,.75,ZB+.05],[TX(t)+OFF[0],Y0+.1,ZP],.8,{c:P.c4,a:e*.8,r:.05,n:3}));
    if(k===3)D.po.forEach((_,t)=>R.flowArc([PX.val,.75,ZB+.05],[TX(t)+OFF[1],Y0+.45,ZP],.9,{c:P.c6,a:e*.85,r:.055,n:4}));
    if(k===4)D.po.forEach((_,t)=>{R.flowArc([TX(t)+OFF[0],Y0+.05,ZP],[TX(t)+OFF[2],Y0,ZP],.25,{c:P.c4,a:e*.7,r:.04,n:2});R.flowArc([TX(t)+OFF[1],Y0+.4,ZP],[TX(t)+OFF[2],Y0,ZP],.3,{c:P.c6,a:e*.85,r:.045,n:3})});
    if(k===5){D.po.forEach((_,t)=>{const A=D.adv[t];R.flowArc([TX(t)+OFF[2],Y0-.3,ZP],[PX.pol+.2,.7,ZB+.05],1.1,{c:A>=0?P.good:P.bad,a:e*.85,r:.055,n:Math.max(2,Math.round(Math.abs(A)*5))});
        R.flowArc([TX(t)+OFF[1],Y0+.3,ZP],[PX.val,.7,ZB+.05],.9,{c:P.c6,a:e*.7,r:.05,n:3})})}
  }
  // ---- GRPO: eight outputs, one column each, rewards then advantages on one plinth ----
  const GX=i=>(i-3.5)*.85,GZ=t=>-.55+t*.45,ZG=2.4,SR=.6,SA=.36;
  function drawGRPO(R,k,e,D){const P=R.P,n=8;
    plate(R,'pol',P.c1,k===0||k===4||k===5?1:.3,k===5?'policy · trained':'policy');ghost(R,k===0||k===5?.9:.4);
    plate(R,'ref',P.c4,k===4?1:.3,k===5?'reference · frozen':'reference');plate(R,'rw',P.c5,k===1?1:.3,k===5?'reward model · frozen':'reward model');
    R.box([PX.pol,0,-1.45],[1.0,.32,.4],{fill:mix(P.paper,P.ink,.06),a:k===0?1:.4});R.label([PX.pol,.32,-1.45],'7 + 8',{mono:true,fs:13,b:1,dy:-9,a:k===0?1:.5});
    const ta=k===2||k===4?.45:1;
    D.outs.forEach((o,i)=>{const A=D.Ag[i];o.forEach((d,t)=>{const grow=k===0?cl(e*1.5-i*.06):1;if(grow<=0)return;
      let fill=P.paper;if(k>=1&&t===2)fill=mix(P.paper,D.Rg[i]?P.good:P.bad,.45*(k===1?e:1));if(k>=3)fill=mix(P.paper,A>=0?P.good:P.bad,.5*(k===3?e:1));
      R.box([GX(i),0,GZ(t)],[.6,.4*grow,.42],{fill,a:ta,shadow:false,lw:.7});if(t===2)R.label([GX(i),.4,GZ(t)],''+o[1]+o[2],{mono:true,fs:12,b:1,dy:-8,a:ta*grow,c:k>=1?(D.Rg[i]?P.good:P.bad):P.ink})});
      if(k===0)R.flowArc([PX.pol+.3,.7,ZB+.05],[GX(i),.5,GZ(0)-.2],.45,{c:P.c1,a:e*.8,r:.05,n:3})});
    
    if(k===1)D.outs.forEach((o,i)=>R.flowArc([PX.rw,.8,ZB+.05],[GX(i),.5,GZ(2)],.6,{c:P.c5,a:e*.8,r:.045,n:2}));
    if(k>=1){const ba=k===1?Math.min(1,e*1.6):1;plinth(R,ZG,8*.85+.3,ba);const seen={};
      D.outs.forEach((o,i)=>{let v,c,lab;
        if(k===1){v=D.Rg[i]*SR*ease(cl(e*1.2));c=mix(P.paper,P.c5,.65);lab=String(D.Rg[i])}
        else if(k===2){const u1=cl(e*2),u2=cl(e*2-1),r=(D.Rg[i]-D.mu*u1)*SR;v=lerp(r,D.Ag[i]*SA,u2);c=mix(mix(P.paper,P.c5,.65),D.Ag[i]>=0?P.good:P.bad,u1);lab=(D.Ag[i]>=0?'+':'−')+Math.abs(D.Ag[i]).toFixed(2)}
        else{v=D.Ag[i]*SA;c=D.Ag[i]>=0?P.good:P.bad;lab=(D.Ag[i]>=0?'+':'−')+Math.abs(D.Ag[i]).toFixed(2)}
        bar(R,GX(i),ZG,v,c,ba,.42);if(!seen[lab]){seen[lab]=1;R.label([GX(i),v>=0?Y0+v:Y0,ZG],lab,{mono:true,fs:12,dy:v>=0?-10:12,a:k===2?cl(e*2-1)+(e<.5?1-e*2:0):ba})}});
      R.label([GX(0)-.4,Y0,ZG],k===1?'reward r':'advantage Â',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'row',a:ba});
      if(k===2){const u1=cl(e*2),yp=Y0+D.mu*SR*(1-u1);R.glass([-3.6,yp,ZG-.3],[7.2,0,0],[0,0,.6],{c:P.acc,a:1-.6*cl(e*2-1),nu:12,nv:1});
        R.label([3.65,yp,ZG],'mean '+D.mu.toFixed(2)+' · std '+D.sd.toFixed(2),{al:'left',dx:8,mono:true,fs:12,c:P.acc,b:1,wide:1})}}
    if(k===3)D.outs.forEach((o,i)=>R.flow([[GX(i),Y0-.05,ZG-.2],[GX(i),.45,GZ(2)+.1],[GX(i),.45,GZ(0)]],{c:D.Ag[i]>=0?P.good:P.bad,a:e*.8,r:.045,n:4}));
    if(k===4){R.flowArc([PX.ref,.6,ZB+.05],[PX.pol,.6,ZB+.05],.5,{c:P.c4,a:e*.6,r:.05,n:4});
      R.label([(PX.ref+PX.pol)/2,1.5,ZB],'β(π_ref/π − 1) = 0 here: π = π_ref',{mono:true,fs:12,c:P.c4,b:1,a:e,wide:1})}
    if(k===5)D.outs.forEach((o,i)=>{const A=D.Ag[i];R.flowArc([GX(i),Y0+.1,ZG-.1],[PX.pol+.2,.7,ZB+.05],1.0,{c:A>=0?P.good:P.bad,a:e*.85,r:.05,n:Math.max(2,Math.round(Math.abs(A)*3))})});
  }
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-3.2,4.1,.5);
    if(!READTOY.ready()){R.label([0,.5,0],'training the toy critic for 100 steps in your browser',{fs:13,c:P.mute});return}
    const D=READTOY();if(MODE==='ppo')drawPPO(R,k,e,D);else drawGRPO(R,k,e,D)}
  function counters(){const el=document.getElementById('ppoCnt');if(!el||!READTOY.ready())return;const D=READTOY();
    el.innerHTML=MODE==='ppo'?stat('networks in memory','4','policy, value, reference, reward')+stat('trained','2','policy and value model')+stat('advantage source','critic + GAE','λ = 0.95, γ = 1')+stat('first token sees the reward with weight',(0.95**2).toFixed(4),'λ² at 3 tokens; 10⁻²³ at 1,024'):
      stat('networks in memory','3','policy, reference, reward')+stat('trained','1','policy')+stat('advantage source','group of 8','right: '+D.Rg.reduce((a,b)=>a+b,0)+' of 8')+stat('first token sees the reward with weight','1','every token shares Â_i')}
  const full={cam:[.35,.55],bounds:[[-4.1,0,-2.5],[4.1,1.4,2.8]]};
  const VP=[{cam:[.4,.5],bounds:[[-4.1,0,-2.5],[4.1,1.4,.3]]},{cam:[.4,.5],bounds:[[-2.4,0,-2.5],[4.1,1.4,.3]]},{cam:[.3,.5],bounds:[[-2.6,0,-2.5],[2.6,1.4,2.8]]},
    {cam:[.3,.5],bounds:[[-2.6,0,-2.5],[2.6,1.4,2.8]]},{cam:[.25,.62],bounds:[[-2.8,0,-.6],[2.8,1.1,2.8]]},full];
  const VG=[{cam:[.35,.55],bounds:[[-4.1,0,-2.5],[4.1,1.3,.6]]},{cam:[.35,.55],bounds:[[-4.1,0,-2.5],[4.1,1.4,2.8]]},{cam:[.3,.45],bounds:[[-3.7,0,-.9],[3.7,1.4,2.8]]},
    {cam:[.3,.7],bounds:[[-3.7,0,-.9],[3.7,1.2,2.8]]},{cam:[.3,.5],bounds:[[-4.1,0,-2.6],[2.5,1.7,2.7]]},full];
  const stg=S3.stage({id:'stg-ppo',list:'sx-ppo',fig:'Fig. 2 · PPO against GRPO on one toy question',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1500,hold:5200,draw,
    view:k=>{const v=(MODE==='ppo'?VP:VG)[k],h=document.getElementById('stg-ppo');return h&&h.clientWidth<520?{cam:[v.cam[0],Math.min(1.15,v.cam[1]+.25)],bounds:v.bounds}:v},
    margin:w=>w<520?[16,8,14,8]:[20,40,12,110],onStep:()=>counters()});
  window.__ppoStage={draw:()=>{counters();stg.draw()}};
  const seg=document.getElementById('ppoM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    MODE=b.dataset.m;['ppo','grpo'].forEach(m=>{const L=document.getElementById('sx-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-'+MODE)}));
})();
