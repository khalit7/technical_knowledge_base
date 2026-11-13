// ---- Scene (Step 3): one PPO episode of the page's toy, with and without the pretraining term (renderer v2: the policy, the SFT model and
// the reward model as glass plates at the back, each word of the answer on a plinth with the policy's and the SFT model's probability as
// two bars, the per-token KL penalty and then the advantages as signed bars in front, flows wherever words, scores, the gradient or
// pretraining text move). Data: window.IG_EP, written by src/mk_stage_data.cjs from the toy (20_js_toy_core.js) exactly as the old 2D
// episode animation computed it in the page: the toy PPO (beta 0.3) and PPO-ptx (beta 0.3, gamma 0.1) policies after 500 updates,
// episode 0, one illustrative plain gradient step of size 0.5. check_stages.mjs recomputes it from the live toy. ----
(function(){
  if(!document.getElementById('stg-ep')||!window.S3||!window.IG_EP)return;const {at,off,lerp,mix}=S3;
  const D=window.IG_EP;let MODE='ppo';
  const n=D.ppo.y.length,XS=1.3,xw=i=>(i-(n-1)/2)*XS-.6,ZW=.6,YW=.6,HP=1.15,KS=2.0,AS=1.0,ZB=-1.6,PW=1.25,PH=.9;
  const XPl=-2.9,XS0=-.6,XRM=1.7,XR=4.0,ZR=.6,XL=4.2,ZL=2.5,XT=-4.9;
  const sg=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
  const cl=v=>v<0?0:v>1?1:v;
  function plate(R,x,c,a,name){if(a<=.01)return;R.glass([x-PW/2,.06,ZB],[PW,0,0],[0,PH,0],{c,a,nu:5,nv:4});R.label([x,PH+.06,ZB],name,{fs:12.5,b:a>.6,c,dy:-10,a:Math.max(.35,a),wide:a<.6})}
  function plinth(R,c,w,a,y0,d){if(a<=.01)return;R.box([c[0],y0-.045,c[1]],[w,.045,d||.5],{a,shadow:false});[-1,1].forEach(s=>R.box([c[0]+s*w/2,0,c[1]],[.035,y0-.05,.035],{a:a*.9}))}
  function bar(R,x,z,y0,v,sc,c,a,lab,o){o=o||{};if(a<=.01)return;const h=Math.max(.012,Math.abs(v)*sc);R.box([x,v>=0?y0:y0-.045-h,z],[o.w||.26,h,.26],{fill:c,a,shadow:false,lw:.7});
    if(lab)R.label([x,v>=0?y0+h:y0-.05-h,z],lab,{mono:true,fs:12,b:o.b,c:o.lc||c,dy:v>=0?-10:13,a,grp:o.grp,wide:o.wide})}
  function ghost(R,x,z,y0,v,sc,a){if(a<=.01)return;const h=Math.max(.012,v*sc),P=R.P,w=.15;R.line([[x-w,y0,z],[x-w,y0+h,z],[x+w,y0+h,z],[x+w,y0,z]],{c:P.ink,w:1.4,dash:[3,3],a})}
  function draw(R,k,e){const P=R.P,E=D[MODE],pc=MODE==='ptx'?P.c2:P.c5;R.grid(-5.6,5.6,-2.4,2.8,.5);
    // the models at the back
    plate(R,XPl,pc,k===0||k===4||k===5?1:.35,MODE==='ptx'?'policy: toy PPO-ptx':'policy: toy PPO');
    plate(R,XS0,P.c3,k===1?1:.3,'SFT model (frozen)');
    plate(R,XRM,P.c4,k===2?1:.3,'reward model');
    R.label([xw(0)-.6,YW,ZW],'prompt: '+E.prompt.join(' '),{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'rows'});
    // each word on a plinth: the policy's probability, the SFT model's (from step 2), and a signed bar: the KL penalty (steps 2 to 3), then the advantage
    const wa=k>=2&&k<=3?.55:1,ka=k===1?e:k===2?1:k===3?1-e:0,aa=k===3?e:k>3?1:0;
    E.y.forEach((w,i)=>{const ai=k===0?cl(e*(n+.5)-i):1;if(ai<=0)return;const x=xw(i);plinth(R,[x,ZW],1.0,ai,YW);
      bar(R,x-.3,ZW,YW,E.pRL[i]*ai,HP,pc,ai*wa,null);
      if(k>=1)bar(R,x,ZW,YW,E.pSF[i]*(k===1?e:1),HP,P.c3,wa,null);
      if(ka>0)bar(R,x+.3,ZW,YW,E.pen[i]*ka,KS,P.bad,ka,Math.abs(E.pen[i])>=.05?sg(E.pen[i]):null,{b:1});
      if(aa>0)bar(R,x+.3,ZW,YW,E.An[i]*aa,AS,P.c1,aa,sg(E.An[i]),{b:1});
      R.label([x,0,ZW+.3],w,{serif:true,fs:14,b:1,dy:13,a:Math.max(.5,ai)});
      if(k===0)R.flowArc([XPl+.3,.7,ZB+.05],[x-.3,YW+E.pRL[i]*HP*ai,ZW],.6,{c:pc,a:ai*(1-cl(e*(n+.5)-i-1))*.9,r:.055,n:5});
      if(k===1)R.flowArc([XS0,.7,ZB+.05],[x,YW+E.pSF[i]*HP*e,ZW],.5,{c:P.c3,a:.85*(1-e*.5),r:.05,n:4});
      if(k===4)R.flowArc([x+.3,YW+.3,ZW],[XPl+.2-i*.08,.6,ZB+.05],.9,{c:P.c1,a:e*(.3+.7*Math.min(1,Math.abs(E.An[i])*2)),r:.04+.04*Math.min(1,Math.abs(E.An[i])*2),n:Math.max(3,Math.round(3+Math.abs(E.An[i])*12))});
      // after the update: the new probability as a dashed outline
      if(k>=4){const v=MODE==='ptx'&&k>=5?lerp(E.after0[i],E.after1[i],k===5?e:1):E.after0[i];ghost(R,x-.3,ZW,YW,v,HP,k===4?e:1)}});
    R.label([xw(0)-.6,YW+.6,ZW],'π · π_SFT · '+(k>=3?'advantage':'KL penalty'),{al:'right',dx:-6,mono:true,fs:12,c:k>=3?P.c1:k>=1?P.bad:P.mute,grp:'rows'});
    // the reward column on the right: the RM score (step 3), then the total reward (step 4)
    if(k>=2){const ra=k===2?e:1,dim=k>=4?.45:1;plinth(R,[XR,ZR],1.2,ra*dim,.25);
      if(k===2){E.y.forEach((_,i)=>R.flowArc([xw(i)+.3,YW+.3,ZW],[XRM-.3+i*.12,.5,ZB+.05],.45,{c:P.c4,a:e*.75,r:.045,n:4}));R.flowArc([XRM+.3,.5,ZB+.05],[XR-.25,.6,ZR],.6,{c:P.c4,a:e*.9,r:.06,n:7})}
      bar(R,XR-.27,ZR,.25,E.rm*ra,.75,P.c4,ra*dim,k<4?'RM '+sg(E.rm):null,{b:1,grp:'rew',w:.34});
      if(k>=3){const ta=k===3?e:1;bar(R,XR+.27,ZR,.25,E.tot*ta,.75,P.ink,ta*dim,k<4?'total '+sg(E.tot):null,{b:1,grp:'rew',lc:P.ink,w:.34})}}
    // the pretraining loss on 40 windows of pretraining text: the SFT model, this policy, after the update (steps 5 and 6)
    if(k>=4){const la=k===4?e:1,y0=.25,LS=.28;plinth(R,[XL,ZL],1.5,la,y0);
      bar(R,XL-.45,ZL,y0,D.ppo.ceSFT,LS,P.c3,la,D.ppo.ceSFT.toFixed(2),{w:.34,grp:'loss'});
      bar(R,XL,ZL,y0,E.ce[0],LS,pc,la,E.ce[0].toFixed(2),{w:.34,grp:'loss'});
      const after=MODE==='ptx'&&k>=5?lerp(E.ce[1],E.ce[2],k===5?e:1):E.ce[1];
      bar(R,XL+.45,ZL,y0,after,LS,mix(P.paper,pc,.45),la,after.toFixed(2),{w:.34,grp:'loss'});
      R.label([XL,0,ZL+.3],'pretraining loss: SFT · policy · after',{mono:true,fs:12,dy:13,c:P.mute,a:la,wide:1})}
    // PPO-ptx: the pretraining gradient joins the same update
    if(MODE==='ptx'&&k>=5){const a=k===5?e:1,zp=ZB;for(let i=0;i<10;i++)R.box([XT+(i%2?.03:-.03),i*.08,zp],[1.0,.068,.8],{fill:mix(P.paper,P.c6,.35),a:a*cl(e*10-i+(k>5?10:0)),lw:.5,shadow:i===0});
      R.flowArc([XT+.4,.75,zp],[XPl-.4,.6,ZB+.05],.4,{c:P.c6,a:a*.9,r:.06,n:9});
      R.label([XT,0,zp+.4],'pretraining text',{mono:true,fs:12.5,b:1,c:P.c6,dy:13,a})}
  }
  const full={cam:[.15,.62],bounds:[[-5.4,0,-1.8],[5,1.9,2.4]]};
  const stg=S3.stage({id:'stg-ep',list:'sx-ep-ppo',fig:'Fig. 3 · one toy episode, word by word',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,140],
    view:k=>{const ph=innerWidth<600,v=k===2||k===3?{cam:[.05,.6],bounds:[[-3.8,0,-1.8],[5,1.9,1.6]]}:k>=4?{cam:[.2,.62],bounds:[[-5.4,0,-1.8],[5.1,1.9,2.9]]}:full;
      return ph?{cam:[v.cam[0]+.3,1.0],bounds:k<=1?[[-3.4,0,-1.8],[2.4,1.9,1.4]]:k>=4?[[-3.6,0,-1.8],[4.8,1.9,2.9]]:v.bounds}:v}});
  const seg=document.getElementById('epM');
  if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;['ppo','ptx'].forEach(m=>{const L=document.getElementById('sx-ep-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-ep-'+MODE)}));
})();
