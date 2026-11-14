// ---- Scene, Fig. 3 (section 5): the grammar mask at the first step of the constrained run (renderer v2) ----
// Qwen2.5-0.5B-Instruct, greedy, asked for {"name", "age"} as JSON (SD.JSONC.steps[0]): the model's top 8 probabilities, the mask
// (0 or minus infinity per token), masked tokens to 0, the survivors renormalised, the choice. Every height comes from the recorded step.
(function(){
  if(!document.getElementById('stg-mask')||!window.SD||!SD.JSONC||!window.S3)return;const {at,off,lerp,mix}=S3;
  const J=SD.JSONC,s0=J.steps[0],T=s0.top,V=J.vocab,N=T.length,ma=s0.mass_allowed;
  const rest=1-T.reduce((a,t)=>a+t.p,0),okIn=T.filter(t=>t.ok).length,okOut=s0.n_allowed-okIn,restOk=ma-T.filter(t=>t.ok).reduce((a,t)=>a+t.p,0);
  const pick=T.findIndex(t=>t.t===s0.pick);
  window.SD_STG=window.SD_STG||{};
  window.SD_STG.mask={V,n:s0.n_allowed,mass:ma,rest,top:T.map(t=>[t.t,t.p,t.ok,t.ok?t.p/ma:0]),pick:s0.pick,next:J.steps[1].n_allowed};
  const xs=i=>-3.15+i*.9,XT=4.35,ZB=0,ZM=.8,ZT=1.35,ZS=2.2,SY=3;
  const f1=p=>p>=.1?(p*100).toFixed(1)+'%':p>=.001?(p*100).toFixed(2)+'%':p>0?'<0.1%':'0';
  const vis=t=>t.replace(/\n/g,'↵').replace(/ /g,'␣');
  function draw(R,k,e){const P=R.P,W=R.W;R.grid(-4.4,5.6,-1.2,2.8,.5);
    const ok=P.good,bad=P.bad,blue=P.acc;
    // 1. the model's probabilities (top 8) and every other token together
    T.forEach((t,i)=>{let p=t.p,a=1;const after=t.ok?t.p/ma:0;
      if(k===2&&!t.ok){p=lerp(t.p,0,e);a=lerp(1,.15,e)}else if(k>=3&&!t.ok){p=0;a=.15}
      if(k===3&&t.ok)p=lerp(t.p,after,e);else if(k>=4&&t.ok)p=after;
      const fill=k>=2&&t.ok?mix(blue,P.paper,i===pick&&k>=4?0:.3):k>=1&&!t.ok?mix(bad,P.paper,.55):mix(blue,P.paper,.3);
      R.box([xs(i),0,ZB],[.5,Math.max(.012,p*SY),.42],{fill,a});
      if(!t.ok&&k>=2)R.box([xs(i),0,ZB],[.52,Math.max(.012,t.p*SY),.44],{fill:P.paper,a:.12,fa:.15,shadow:false});
      const show=W>=520||i<2||t.ok;
      if(show&&(p>.0005||k<2))R.label([xs(i),p*SY,ZB],f1(p),{mono:true,fs:12.5,b:i===pick&&k>=3,dy:-11,c:k>=3&&t.ok?blue:P.ink,a:Math.max(.5,a)});
      if(W>=520||i<2||t.ok)R.label([xs(i),0,ZB+.3],vis(t.t),{mono:true,fs:12.5,b:t.ok&&k>=1,dy:12,c:k>=1?(t.ok?ok:bad):P.ink})});
    const hr=k<2?rest:k===2?lerp(rest,restOk,e):k===3?lerp(restOk,restOk/ma,e):restOk/ma;
    R.box([XT,0,ZB],[.8,Math.max(.012,hr*SY),.5],{fill:mix(P.paper,P.mute,.4),a:k>=2?.6:1});
    if(k<2)R.label([XT,hr*SY,ZB],SD.fmtN(V-N)+' others: '+f1(hr),{fs:12.5,dy:-12,c:P.mute,wide:1});
    // 2. the mask: a tile per token, 0 if the grammar can still complete, minus infinity if not; the whole vocabulary as a strip behind
    const ta=k===0?0:k===1?e:1;
    if(ta>.01){T.forEach((t,i)=>{R.box([xs(i),0,ZT],[.6,.06,.4],{fill:t.ok?ok:bad,a:ta,shadow:false});R.label([xs(i),.06,ZT],t.ok?'0':'−∞',{mono:true,fs:13,b:1,dy:14,c:t.ok?ok:bad,a:ta})});
      R.box([XT,0,ZT],[.8,.06,.4],{fill:mix(bad,P.paper,.3),a:ta,shadow:false});
      R.glass([xs(0)-.45,.03,ZM],[XT+.45-xs(0)+.45,0,0],[0,.45,0],{c:ok,a:ta*(k>=3?.25:.6),nu:9,nv:1});
      R.label([xs(0)-.5,.25,ZM],'mask m',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:ok,a:ta,grp:'row'});
      const L0=xs(0)-.3,L1=XT+.4,sl=Math.max(.1,(L1-L0)*s0.n_allowed/V);
      const sa=k<=1?ta:k===2?1-e:0;  // the vocabulary strip belongs to step 2; it leaves as the mask is applied
      if(sa>.01){R.box([(L0+L1)/2,0,ZS],[L1-L0,.04,.22],{fill:mix(bad,P.paper,.5),a:sa,shadow:false});R.box([L0+sl/2,0,ZS],[sl,.06,.26],{fill:ok,a:sa,shadow:false});R.glow([L0+sl/2,.05,ZS],.35,{c:ok,a:sa});
      R.label([L0,0,ZS],s0.n_allowed+' allowed',{al:'left',dx:-2,dy:18,fs:12.5,b:1,c:ok,a:sa});
      R.label([L1,0,ZS],SD.fmtN(V-s0.n_allowed)+' masked to −∞',{al:'right',dy:18,fs:12.5,c:bad,a:sa})}
      if(k===1)T.forEach((t,i)=>R.flow([[xs(i),.08,ZT-.2],[xs(i),.35,ZM],[xs(i),.05,ZB+.25]],{c:t.ok?ok:bad,r:.05,n:4,speed:.8,a:e}))}
    if(k===2)R.label([xs(4),1.25,ZB],'the 4 allowed tokens hold '+(ma*100).toFixed(1)+'% of the mass',{fs:12.5,b:1,c:ok,a:e,wide:1});
    // 3. renormalise: the survivors share the whole mass in proportion
    if(k===3)T.forEach((t,i)=>{if(!t.ok)R.flowArc([xs(i),.05,ZB],[xs(pick),lerp(t.p,t.p/ma,e)*SY*.5,ZB],.6,{c:blue,r:.045,n:3,speed:1.1,a:.6})});
    // 4. choose (greedy) and move on: the next step gets its own mask
    if(k===4){const p=T[pick].p/ma*SY,by=lerp(p+1,p+.12,Math.min(1,e*1.3));R.ball([xs(pick),by,ZB],.1,{c:P.good});R.glow([xs(pick),p,ZB],.5,{c:P.good,a:e});
      R.label([xs(pick)+.4,p*.6,ZB],'greedy takes '+vis(s0.pick)+' · next step: '+J.steps[1].n_allowed+' allowed',{al:'left',dx:10,fs:13,b:1,c:P.good,a:e})}
    R.label([xs(0)-.5,.3,ZB],k>=3?'renormalised':'model p',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:k>=3?blue:P.ink,grp:'row'})
  }
  const full={cam:[.3,.8],bounds:[[-4.2,0,-.5],[5,1.9,2.5]]};
  S3.stage({id:'stg-mask',list:'sx-mask',fig:'Fig. 3 · the grammar mask at step 0',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,16,110],
    view:k=>k===0?{cam:[.3,.45],bounds:[[-4.2,0,-.5],[5,1.9,.5]]}:k>=3?{cam:[.3,.45],bounds:[[-4.2,0,-.5],[5,3.1,1.6]]}:full});
})();
