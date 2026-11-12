// ---- Scene, Fig. 3 (section 5): why the speed-up shrinks as the batch grows (renderer v2) ----
// Every number from the page's derived H100 cost model (23_js_sd_cost.js, SD.h100t: Llama 3.1 8B FP8 on one H100, the parent's Capacity planner
// constants; not run here): memory time = (weights + B x context x KV bytes per token) / (0.8 x 3.35 TB/s), arithmetic time = B x n x FLOPs per token
// / (0.345 x 1,979 TFLOP/s), step = the larger + 2.5 ms. Speculation: alpha 0.8, k 4 (3.36 tokens per step, section 4), draft cost 0.05 of a one-token
// step per guess (the cost model's H100 default). Each column pair: plain step (left) and speculative step (right); the glass is the memory read,
// the solid fill the arithmetic (blue: one token per sequence, orange: the guesses), the gold cap the drafting. src/check_stages.mjs checks the step list.
(function(){
  if(!document.getElementById('stg-xo')||!window.SD||!SD.h100t||!window.S3)return;const {at,off,lerp,mix}=S3;
  const H=SD.D.h100,A=.8,K=4,C=.05,E=SD.etok(A,K),Bs=[1,16,64,256];
  const parts=(B,n,ctx)=>{const tm=1000*(H.wbytes+B*ctx*H.kvtok)/(H.bw*1e9*H.eff_m),tc=1000*B*n*(2*H.params+2*H.nh*(H.dqk+H.dv)*H.L*ctx)/(H.peak*1e12*H.eff_c);return {tm,tc,t:Math.max(tm,tc)+H.tovh}};
  function col(B,ctx){const p=parts(B,1,ctx),s=parts(B,K+1,ctx),d=K*C*p.t;return {B,ctx,p,s,d,ts:d+s.t,sp:E*p.t/(d+s.t)}}
  const S1=Bs.map(B=>col(B,1024)),S8=Bs.map(B=>col(B,8192));
  const kv8=256*8192*H.kvtok/1e9;   // the KV cache of 256 sequences of 8,192 tokens, GB: more than one H100 holds, so that column is dropped at long context
  window.SD_STG=window.SD_STG||{};window.SD_STG.xo={E,S1,S8,kv8,check:S1.every(c=>Math.abs(c.p.t-SD.h100t(c.B,1,1024))<1e-9&&Math.abs(c.s.t-SD.h100t(c.B,K+1,1024))<1e-9)};
  const X=[-4.3,-1.45,1.45,4.3],W=.62,G=.42,f1=v=>v>=10?v.toFixed(1):v.toFixed(2);
  function pillar(R,x,c,which,sc,a,cur,lab){const P=R.P,o=c[which],base=H.tovh*sc,blue=P.acc;
    R.box([x,0,0],[W+.1,base,W+.1],{fill:mix(P.paper,P.mute,.25),a});                                   // fixed 2.5 ms per step
    const mh=o.tm*sc;R.box([x,base,0],[W,mh,W],{fill:mix(P.paper,P.c1,.18),fa:.22,a,shadow:false});       // the memory read: glass
    const tp=parts(c.B,1,c.ctx).tc*sc,tg=(o.tc-parts(c.B,1,c.ctx).tc)*sc;
    R.box([x,base,0],[W*.62,Math.max(.012,tp),W*.62],{fill:blue,a,shadow:false});
    if(which==='s'&&tg>0)R.box([x,base+tp,0],[W*.62,Math.max(.012,tg),W*.62],{fill:P.c2,a,shadow:false});
    let top=base+Math.max(mh,o.tc*sc);
    if(which==='s'){R.box([x,top,0],[W,Math.max(.012,c.d*sc),W],{fill:P.c5,a,shadow:false});top+=c.d*sc}
    if(cur)R.flow([[x-.22,.05,.22],[x-.22,base+mh*.95,.22]],{c:P.c1,r:.06,n:5,speed:1.2,a:a*.8});
    R.label([x,top,0],f1(which==='s'?c.ts:o.t)+' ms',{mono:true,fs:12,dy:-10,al:which==='s'?'left':'right',dx:which==='s'?-2:2,c:which==='s'?P.c2:P.ink,a,wide:lab?0:1})}   // on a phone only the pair the step is about carries its times
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2,2,.5);
    const long=k===5&&e>=.5,S=long?S8:S1,mx=Math.max(...(long?S8.slice(0,3):S1).map(c=>c.ts)),sc=3.2/mx;
    const fadeIn=k===5?Math.abs(e-.5)*2:1;
    Bs.forEach((B,i)=>{const c=S[i],step=i+1;if(long&&i===3){R.label([X[i],.3,0],Math.round(kv8)+' GB of KV cache:',{fs:12.5,b:1,c:P.bad,dy:-12,a:fadeIn,wide:1});R.label([X[i],.3,0],'does not fit',{fs:12.5,b:1,c:P.bad,dy:6,a:fadeIn,wide:1});R.label([X[i],0,.6],'B = '+B,{mono:true,fs:13,b:1,dy:16,c:P.mute});return}                                 // column i is introduced at step i + 1 (B = 1 at steps 0 and 1)
      const shown=k===5||k>=Math.max(1,step)||(i===0&&k===0);if(!shown)return;
      const cur=k===5||(i===0?k<=1:k===step),a=(cur?1:.22)*(k===5?Math.max(.15,fadeIn):1);
      const lab=cur&&k!==5;pillar(R,X[i]-G,c,'p',sc,a,cur,lab);if(!(i===0&&k===0))pillar(R,X[i]+G,c,'s',sc,a,cur,lab);
      R.label([X[i],0,.6],'B = '+B,{mono:true,fs:13,b:1,dy:16,c:P.ink,a:Math.max(.4,a)});
      if(!(i===0&&k===0))R.label([X[i],0,.6],c.sp.toFixed(2)+'x',{mono:true,fs:13,b:1,dy:34,c:c.sp>=2.5?P.good:c.sp>=1?P.c5:P.bad,a:Math.max(.4,a)})});
    if(k===0)R.label([X[0]-G,.6,0],'1 token of arithmetic: '+f1(S1[0].p.tc)+' ms of '+f1(S1[0].p.tm)+' ms',{al:'left',dx:30,fs:12.5,b:1,c:P.acc,a:e,wide:1});
    if(k===5)R.label([0,3.4,0],'context '+(e<.5?'1,024':'8,192')+' tokens',{fs:13,b:1,c:P.ink,wide:1})}
  const full={cam:[.25,.38],bounds:[[-5.0,0,-.5],[5.0,3.3,.8]]};
  S3.stage({id:'stg-xo',list:'sx-xo',fig:'Fig. 3 · one step\'s time as the batch grows (H100, derived)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1600,hold:5200,draw,
    margin:w=>w<520?[18,10,40,10]:[20,16,44,16],
    view:k=>k<=1?{cam:[.3,.4],bounds:[[-5.4,0,-.5],[-3.0,.8,.8]]}:k===2?{cam:[.28,.4],bounds:[[-5.0,0,-.5],[-.4,1.0,.8]]}:k===3?{cam:[.26,.38],bounds:[[-5.0,0,-.5],[2.6,1.4,.8]]}:full});
})();
