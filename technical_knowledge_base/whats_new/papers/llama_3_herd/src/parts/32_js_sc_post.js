// ---- Scene: one prompt through a round of Llama 3 post-training, and through PPO-based RLHF, Fig. 2 (renderer v2) ----
// Models are glass plates; the K = 20 sampled responses are bars on one white plinth, their heights the reward model's scores
// (illustrative: seeded draws, the same as the old 2D animation, mulberry32(7)); the SFT and DPO data columns are Table 7's shares of
// SFT examples and Table 6's shares of preference comparisons (window.PAPER.tables t6, t7); beta 0.1, NLL 0.2 and six rounds are the paper's (§4.1).
(function(){
  if(!document.getElementById('stg-post')||!window.S3)return;const {at,off,mix}=S3;
  const TBX=window.PAPER.tables,K=20,pc=s=>parseFloat(String(s).replace('%',''));
  const rnd=mulberry32(7),SC=[...Array(K)].map(()=>{let u=0;for(let i=0;i<4;i++)u+=rnd();return u/4}),BEST=SC.indexOf(Math.max(...SC));
  const T7=TBX.t7.rows.filter(r=>r[0]!=='Total').map(r=>[r[0],pc(r[1])]),T6=TBX.t6.rows.filter(r=>r[0]!=='Total').map(r=>[r[0],pc(r[1])]);
  let MODE='l3';
  // layout (world units): x runs left to right through the round
  const XP=-5.3,XS=-4.1,RX0=-3.1,RX1=-.2,RZ=.55,XRM=-1.65,ZRM=-1.1,XSFT=1.3,XDPO=2.9,XAV=4.5,PH=1.05,PW=1.1;
  const rx=i=>RX0+(RX1-RX0)*(i+.5)/K;
  // a model as a glass plate facing the viewer; its name above it, a short note under the name only while the step is about it
  function plateAt(R,x,z,w,h,c,a,name,sub){if(a<=.01)return;R.glass([x-w/2,.06,z],[w,0,0],[0,h,0],{c,a,nu:Math.round(w*6),nv:5});
    if(a>.3)R.label([x,h+.06,z],name,{fs:12.5,b:a>.6,c,dy:sub&&a>.6&&R.W>=520?-26:-10,a:Math.max(.45,a),wide:a<.6});if(sub&&a>.6)R.label([x,h+.06,z],sub,{fs:12,mono:true,c:R.P.mute,dy:-10,a,wide:1})}
  const plateX=(R,x,c,a,name,sub)=>plateAt(R,x,0,PW,PH,c,a,name,sub),plateZ=(R,x,z,w,c,a,name,sub)=>plateAt(R,x,z,w,PH*.85,c,a,name,sub);
  // a data column: shares stacked to scale (one column = 100%), the largest share at the bottom
  function column(R,x,z,rows,cols,a,grow,title){if(a<=.01)return;let y=0;const H=1.3;
    rows.forEach(([n,v],i)=>{const h=H*v/100*grow;if(h>.002)R.box([x,y,z],[.5,h,.5],{fill:mix(R.P.paper,cols[i%cols.length],.55),a,lw:.6,shadow:i===0});y+=h});
    if(a>.6)R.label([x,0,z+.25],title,{fs:12,mono:true,dy:14,a,wide:1})}
  function promptBox(R,a){R.box([XP,0,0],[.55,.32,.55],{fill:mix(R.P.paper,R.P.c1,.3),a});R.label([XP,.32,0],'prompt',{fs:12.5,b:1,dy:-10,a:Math.max(.4,a)})}
  function drawL3(R,k,e){const P=R.P,C6=[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6];
    const f=[[1,.25,.15,.15,.15,.15],[.6,1,.5,.2,.2,.2],[.4,.5,1,.2,.2,.2],[.3,.4,1,.3,.2,.2],[.25,.25,.5,1,.3,.2],[.25,.25,.3,.5,1,.3],[.25,.25,.25,.55,.55,1],[.6,1,.4,.4,.4,.8]][k];
    promptBox(R,f[0]);
    plateX(R,XS,P.c1,f[1],k===7?'next round\'s sampler':'sampler: best model so far',k===1?'offline batch inference':null);
    // the K responses on one plinth; bars rise to their reward-model scores at step 3
    const show=k>=1,grow=k===1?e:1,sc=k<2?0:k===2?e:1,keep=k>=3,ra=k===0?0:f[2];
    if(show){R.box([(RX0+RX1)/2,.0,RZ],[RX1-RX0+.15,.045,.4],{a:ra,shadow:false});
      for(let i=0;i<K;i++){const vis=Math.max(0,Math.min(1,grow*K-i));if(vis<=0)continue;const h=.06+sc*SC[i]*1.2,best=i===BEST,fa=keep&&!best?.22:1;
        R.box([rx(i),.045,RZ],[(RX1-RX0)/K*.68,h,.16],{fill:best&&keep?P.c3:mix(P.paper,P.c1,.45),a:ra*vis*fa,shadow:false,lw:.6})}
      R.label([(RX0+RX1)/2,0,RZ+.2],'K = 20 responses',{fs:12,mono:true,dy:14,a:ra});
      if(k===1)R.flowArc([XS+.05,.6,0],[RX0+.3,.35,RZ],.35,{c:P.c1,a:e,r:.06,n:9})}
    if(k>=0)R.flowArc([XP+.25,.2,0],[XS-.05,.5,0],.25,{c:P.c1,a:k<=1?f[0]:.15,r:.055,n:5});
    // the reward model scores every response
    plateZ(R,XRM,ZRM,2.2,P.c4,k<2?.12:k===2?Math.max(.12,e):k<=3?.6:.2,'reward model',k===2?'one score per response':null);
    if(k===2)for(let i=0;i<K;i+=2)R.flowArc([XRM-1+i*.105,.5,ZRM+.05],[rx(i),.2+SC[i]*1.2*e,RZ],.25,{c:P.c4,a:.8,r:.045,n:4});
    if(k===3){const bp=[rx(BEST),.1+SC[BEST]*1.2,RZ];R.glow(bp,.3,{c:P.c3});R.label(bp,'kept: the best of 20',{fs:12.5,b:1,c:P.c3,dy:-14});R.label([(RX0+RX1)/2,0,RZ+.2],'the other 19 are discarded',{fs:12,mono:true,c:P.mute,dy:30,wide:1})}
    // SFT on the kept responses plus the rest of Table 7's mix
    plateX(R,XSFT,P.c3,f[3],'SFT','LR 10⁻⁵, 8.5K to 9K steps');
    column(R,XSFT-.95,1.2,T7,C6,k===4?1:k===5?.2:0,k===4?e:1,'SFT data, Table 7');
    if(k===4){R.flowArc([rx(BEST),.1+SC[BEST]*1.2,RZ],[XSFT-.05,.6,0],.6,{c:P.c3,a:e,r:.065,n:10});R.flowArc([XSFT-.95,1.1,1.2],[XSFT-.2,.4,.05],.25,{c:P.c3,a:e*.8,r:.05,n:6})}
    // DPO on the newest preference pairs (Table 6's mix)
    plateX(R,XDPO,P.c2,f[4],'DPO','β 0.1, format tokens masked, + 0.2 NLL');
    column(R,XDPO-.95,1.2,T6,C6,k===5?1:k===6?.2:0,k===5?e:1,'preference pairs, Table 6');
    if(k>=4){const a=k===4?.3:k===5?1:.35;R.flow([[XSFT+.05,.5,0],[XDPO-.05,.5,0]],{c:P.c2,a:a*(k===5?e:1),r:.06,n:5})}
    if(k===5){R.flowArc([XDPO-.95,1.2,1.2],[XDPO-.2,.5,.05],.25,{c:P.c2,a:e,r:.055,n:7})}
    // average several runs into one model
    if(k>=6){const a=k===6?1:.8,sp=k===6?(1-e)*.45:0;[-1,0,1].forEach(j=>{if(j&&k!==6)return;R.glass([XAV-PW/2+j*sp,.06,-j*sp*.6],[PW,0,0],[0,PH,0],{c:P.c5,a:a*(j===0?1:.5*(1-e)),nu:6,nv:5})});
      R.label([XAV,PH+.06,0],'averaged model',{fs:12.5,b:1,c:P.c5,dy:-10,a});if(k===6)R.flow([[XDPO+.05,.5,0],[XAV-.05,.5,0]],{c:P.c5,a:e,r:.06,n:5})}
    // the round closes: the new model samples the next round's data; six rounds in all
    if(k===7){R.arc([XAV,PH+.15,0],[XS,PH+.15,0],1.1,{c:P.c5,w:1.6,dash:[6,5],a:.8});R.flowArc([XAV,PH+.15,0],[XS,PH+.15,0],1.1,{c:P.c5,a:e,r:.07,n:16,speed:1.4});
      for(let r=0;r<6;r++){const p=[-1.25+r*.5,2.55,0];R.ball(p,.09,{c:r<1?P.c5:r===1?mix(P.paper,P.c5,.5+.5*e):P.mute,a:r<=1?1:.5,top:1})}
      R.label([0,2.55,0],'round 1 → 2 of 6',{fs:12.5,b:1,mono:true,c:P.c5,dy:-16})}}
  function drawPPO(R,k,e){const P=R.P,f=[[1,.2,.15,.15,.15,.15],[.4,1,.2,.2,.2,1],[.3,.5,1,.25,.25,.8],[.3,.5,.5,1,.25,.6],[.3,.5,.5,.5,1,.6],[.5,1,.6,.6,.6,.6]][k];
    promptBox(R,f[0]);R.flowArc([XP+.25,.2,0],[XS-.05,.5,0],.25,{c:P.c1,a:k===0||k===5?1:.25,r:.055,n:5});
    plateX(R,XS,P.c2,f[1],'policy','generates, then updates');
    const rp=[-2.6,.045,RZ];if(k>=1){R.box(rp,[.4,.3,.4],{fill:mix(P.paper,P.c2,.4),a:f[5]});R.label([rp[0],.35,rp[2]],'one response',{fs:12,mono:true,dy:-10,a:f[5]});
      if(k===1)R.flowArc([XS+.05,.6,0],[rp[0]-.1,.35,rp[2]],.3,{c:P.c2,a:e,r:.06,n:7})}
    plateZ(R,-.8,ZRM,1.5,P.c4,f[2],'reward model',k===2?'scores it online':null);
    plateX(R,1.2,P.c3,f[3],'reference','frozen: KL penalty');
    plateZ(R,-.8,1.65,1.5,P.c6,f[4],'value model','advantages');
    if(k===2)R.flowArc([rp[0],.35,rp[2]],[-.8,.5,ZRM+.05],.4,{c:P.c4,a:e,r:.055,n:8});
    if(k===3)R.flowArc([rp[0]+.2,.3,rp[2]],[1.15,.5,0],.5,{c:P.c3,a:e,r:.055,n:9});
    if(k===4)R.flowArc([rp[0]+.1,.25,rp[2]+.2],[-.8,.4,1.6],.3,{c:P.c6,a:e,r:.055,n:7});
    if(k===5){[[-.8,.6,ZRM],[1.2,.6,0],[-.8,.5,1.65]].forEach((p,i)=>R.flowArc(p,[XS+.05,.55,0],.6,{c:[P.c4,P.c3,P.c6][i],a:e,r:.06,n:9}));
      R.label([-1.2,2.1,0],'four networks resident while the policy changes',{fs:12.5,b:1,c:P.c2,a:e,wide:1})}}
  function draw(R,k,e){R.grid(-5.8,5.2,-1.9,2.2,.5);if(MODE==='l3')drawL3(R,k,e);else drawPPO(R,k,e)}
  // counters for the left column: what differs between the two pipelines at each step
  function counters(k){const L=MODE==='l3',el=document.getElementById('ptCnt');if(!el)return;
    el.innerHTML=stat('Responses sampled per prompt',L?(k>=1?'K = 20':'0'):(k>=1?'1 per step':'0'),L?'10 to 30 in the paper':'repeated every step')+
      stat('Generation inside the update loop',L?'no':'yes',L?'sampling is offline batch inference':'policy samples between updates')+
      stat('Networks held while weights change',L?(k>=5?'2':k>=4?'1':'–'):(k>=4?'4':k>=3?'3':k>=2?'2':'1'),L?(k>=5?'DPO: policy + reference (whose log-probs can be precomputed)':'SFT: the model being trained'):'policy, reference, reward, value')+
      stat('Round',L?(k===7?'1 → 2 of 6':'1 of 6'):'batch by batch',L?'six rounds in all':'continuous')}
  const full={cam:[.12,.62],bounds:[[-5.7,0,-1.6],[5.1,1.6,2]]};
  const stg=S3.stage({id:'stg-post',list:'sx-pt-l3',fig:'Fig. 2 · one prompt through one round',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,onStep:k=>counters(k),
    view:k=>{let v=full;if(MODE==='l3'){v=k<=1?{cam:[.3,.55],bounds:[[-5.7,0,-1.2],[-.1,1.4,1.4]]}:k<=3?{cam:[.15,.6],bounds:[[-4.3,0,-1.4],[.3,1.5,1.4]]}:k<=5?{cam:[0,.6],bounds:[[-2,0,-.9],[3.6,1.5,2]]}:k===6?{cam:[-.15,.6],bounds:[[1,0,-.9],[5.1,1.5,1.2]]}:{cam:[.05,.5],bounds:[[-4.6,0,-.9],[5,2.8,1]]}}
      else v=k===0?{cam:[.3,.55],bounds:[[-5.7,0,-1],[-2,1.4,1.2]]}:{cam:[.2,.62],bounds:[[-5.7,0,-1.6],[1.8,1.6,2]]};
      return innerWidth<600?{cam:[v.cam[0]+.3,Math.max(.9,v.cam[1]+.3)],bounds:v.bounds}:v}});
  counters(0);
  const seg=document.getElementById('ptM');if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;['l3','ppo'].forEach(m=>{const L=document.getElementById('sx-pt-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-pt-'+MODE);counters(0)}));
  window.L3_POST={SC,BEST,K,T6,T7};
})();
