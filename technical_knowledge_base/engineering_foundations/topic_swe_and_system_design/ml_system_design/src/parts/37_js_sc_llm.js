// ---- Scene: Fig. 4 (stg-llm): one chat request's path through the model layer, priced by the Cost-quality lab's model (window.MSD_GW, the
// lab's presets naive, tuned, outage without and with fallback): the gateway, the cache, the router to a small or a large model, the large model's
// provider failing, the fallback to a second provider (with the recorded LiteLLM run below), and one usage event per request.
// Dot counts on each path follow the lab's shares of requests. ----
// The recorded LiteLLM 1.104.0 Router run (src/litellm_fallback.py, mocked providers, no network; src/inputs/litellm_fallback_run.json).
// "seconds" was measured around each call and includes a 0.5 s pause the script adds before it stops the clock.
window.MSD_LITELLM={version:'1.104.0',pause:.5,
  big:{asked:'chat-big',served:'gpt-4o',seconds:3.41,events:[['fail','claude-sonnet-4-5','RateLimitError'],['fail','claude-sonnet-4-5','RateLimitError'],['ok','gpt-4o']]},
  small:{asked:'chat-small',served:'claude-sonnet-4-5',seconds:.521,events:[['fail','claude-haiku-4-5','ContextWindowExceededError'],['ok','claude-sonnet-4-5']]}};
(function(){
  if(!document.getElementById('stg-llm')||!window.MSK||!window.MSD_GW)return;
  const {mix}=S3,{block,plate,stack,lab,poly,arcPts,win,cross,part}=MSK,G=window.MSD_GW;
  const PRE=['naive','tuned','outage_nofb','outage_fb','tuned'],RUN=PRE.map(p=>G.run(Object.assign({},G.D,G.PRESETS[p])));
  window.MSD_LLMPATH={PRE,RUN};   // read by src/check_stages.mjs
  const XA=-6,XG=-4,XC=-2.1,XR=-.2,XM=2.6,ZS=1.5,ZL=-1.1,ZF=-3.1,XU=5.0,ZU=-.9,XB=4.7;
  const pct=v=>(v*100).toFixed(1).replace(/\.0$/,'')+'%';
  function draw(R,k,e,st){const P=R.P,r=RUN[k],sh=r.share,CA=P.c1,CS=P.c3,CL=P.c4,CF=P.c6;R.grid(-6.8,8,-4.2,2.8,.5);
    const n=v=>Math.max(0,Math.round(v*22)),under=(x,z,t,c,a)=>lab(R,[x,0,z+.5],t,{fs:12.5,b:1,c,dy:16,a});
    block(R,[XA,0,0],[.8,.55,.7],P.mute,null,{t:.18,a:1});under(XA,0,'app servers',P.ink,1);
    plate(R,[XG,0,0],CA,k===0?1:.75,null,{w:1,h:1.05,glow:k===0?.35:0});under(XG,0,'gateway (A)',CA,1);
    plate(R,[XC,0,0],P.c5,k===0?.25:k===1?1:.6,null,{w:.9,h:.95,glow:k===1?.35:0});under(XC,0,'cache (F)',P.c5,k===0?.4:1);
    plate(R,[XR,0,0],P.c2,k===0?.25:k===1||k===3?1:.6,null,{w:.9,h:.95});under(XR,0,'router (B)',P.c2,k===0?.4:1);
    if(k===0)lab(R,[XG,1.05,0],'tenant · token limits · budget · input rails',{fs:12,c:CA,dy:-12,a:win(e,.2,.6),wide:1});
    const tier=t=>R.W<520?'':' · '+G.TIERS[G.D[t]].name.replace(' (API)','');   // on a phone the step text names the models
    block(R,[XM,0,ZS],[1,.55,.8],CS,'small'+tier('small'),{a:k===0?.25:1,t:.35,al:'left',dx:-20,dy:-12});
    block(R,[XM,0,ZL],[1.2,.75,.9],CL,'large'+tier('big'),{a:k===2||k===3?.6:1,t:.35,al:'left',dx:-24,dy:-12});
    block(R,[XM,0,ZF],[1.1,.6,.85],CF,'second provider'+tier('fb'),{a:k===3?1:.2,t:.35,amin:k===3?1:.3,al:'left',dx:-24,dy:-12});
    // the paths, dots in proportion to the lab's shares of requests
    const inP=poly([[XA+.4,.45,0],[XR,.45,0]],24),T=Math.min(1,e*1.6);
    R.flow(inP,{c:CA,a:1,r:.06,n:18,speed:1.5});
    if(sh.exact>0){const hit=arcPts(R,[XC,.85,.1],[XA+.2,.7,.1],.55,20);R.flow(hit,{c:P.c5,a:k===1?win(e,.2,.6):.7,r:.06,n:Math.max(2,n(sh.exact)),speed:1.3});
      if(k===1)lab(R,hit[10],pct(sh.exact)+' answered by the cache',{fs:12.5,b:1,c:P.c5,dy:-12,a:win(e,.3,.7)})}
    const toS=arcPts(R,[XR+.3,.45,0],[XM-.5,.35,ZS],.25,18),toL=arcPts(R,[XR+.3,.45,0],[XM-.6,.45,ZL],.25,18);
    if(sh.small>0)R.flow(k===1?part(toS,T):toS,{c:CS,a:1,r:.06,n:n(sh.small),speed:1.2});
    const bigShare=sh.big+sh.fb+sh.err;
    R.flow(k===0||k===1?part(toL,T):toL,{c:CL,a:1,r:.06,n:n(bigShare),speed:1.2});
    if(k>=1)lab(R,toS[9],pct(sh.small),{fs:12.5,b:1,mono:1,c:CS,al:'left',dx:14,a:k===1?win(e,.4,.8):1});
    if(k!==2)lab(R,toL[8],pct(bigShare),{fs:12.5,b:1,mono:1,c:CL,al:'right',dx:-10,dy:-6,a:k===1?win(e,.4,.8):1});   // step 3 says it once, as the share that fails
    // the large model's provider fails: errors go back to the app, or the gateway falls back to the second provider
    if(k===2||k===3){cross(R,[XM,1.05,ZL],win(e,0,.3),P.bad,.24);
      lab(R,[XM+.65,.3,ZL+.3],'provider failing',{fs:12.5,b:1,c:P.bad,al:'left',dx:10,dy:6,a:win(e,0,.3)})}
    if(k===2){const back=arcPts(R,[XM-.5,.6,ZL-.1],[XA+.3,.55,-.3],1.1,30);R.flow(part(back,win(e,.2,1)),{c:P.bad,a:1,r:.065,n:n(sh.err),speed:1.4});
      lab(R,back[15],pct(sh.err)+' of requests fail',{fs:12.5,b:1,c:P.bad,dy:-12,a:win(e,.4,.8)})}
    if(k===3){const fb=arcPts(R,[XM-.4,.4,ZL-.45],[XM-.4,.4,ZF+.42],.35,16);R.flow(part(fb,win(e,.15,.7)),{c:CF,a:1,r:.065,n:n(sh.fb),speed:1.1});
      lab(R,fb[8],'LiteLLM: 2 × RateLimitError, then fallback',{fs:12,c:CF,b:1,al:'right',dx:-14,a:win(e,.5,.9),wide:1})}
    // one usage event per request
    const ua=k===4?1:.3,done=k===4?win(e,.1,.9):1;
    stack(R,[XU,0,ZU],.8,.7,k===4?Math.max(1,Math.round(7*done)):4,P.c4,ua,{});
    if(k===4)under(XU,ZU,'usage events (H) · tenant, tokens, cost',P.c4,1);
    if(k===4)[[XM+.5,ZS],[XM+.6,ZL]].forEach(([x,z])=>R.flow(arcPts(R,[x,.4,z],[XU-.45,.4,ZU],.3,16),{c:P.c4,a:win(e,0,.4),r:.055,n:5,speed:1.1}));
    // the budget of this step, from the lab's model: cost per 1,000 requests and mean TTFT as bars that move between steps
    const pr=RUN[st&&st.pk!=null?st.pk:k],t=e,mv=(a,b)=>a+(b-a)*t,cost=mv(pr.per_k,r.per_k),tt=mv(pr.ttft,r.ttft);
    const er=mv(pr.err,r.err);
    MSK.bar(R,[XB,0,2.2],cost/6*1.5,P.c5,1,'$'+cost.toFixed(2),{w:.5,d:.5});
    MSK.bar(R,[XB+1.6,0,2.2],tt/1.3*1.5,P.c1,1,tt.toFixed(2)+' s',{w:.5,d:.5});
    MSK.bar(R,[XB+3.2,0,2.2],er*1.5,P.bad,1,pct(er),{w:.5,d:.5});
    [['cost per 1k',P.c5],['mean TTFT',P.c1],['errors',P.bad]].forEach(([t,c],i)=>lab(R,[XB+1.6*i,0,2.55],t,{fs:12,b:1,c,dy:16}));
  }
  const full={cam:[.08,1.0],bounds:[[-6.6,0,-3.7],[8.4,1.6,2.9]]};
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-llm',list:'sx-llm',fig:'Fig. 4 · one request through the model layer',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,8,16,8]:[30,16,18,16],
    view:k=>narrow()?{cam:[.5,.9],bounds:[[[-6.6,0,-1],[.6,1.2,1.2]],[[-2.6,0,-1.8],[3.6,1.2,2.2]],[[-6.6,0,-1.8],[3.6,1.4,1]],[[-.4,0,-3.8],[4,1.2,2.2]],[[2,0,-1.6],[8.4,1.6,2.9]]][k]}:k===3?{cam:[.14,.95],bounds:[[-2.6,0,-3.7],[8.4,1.6,2.9]]}:full});
})();
