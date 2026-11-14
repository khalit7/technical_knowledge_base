// ---- Scene, Fig. 1 (the idea): one round of speculation on a real position (renderer v2: few large objects per step, flows where data moves) ----
// Tokens, q and p from the recorded distributions (SD.D.dists.code_edit, positions 64 to 67: Qwen3-1.7B target and Qwen3-0.6B draft, both 4-bit MLX,
// measured here), read greedily: the draft's guess is its top token, the target keeps a guess while it equals its own top token.
// Time step: the H100 check ratio from the page's derived cost model (SD.h100t), the draft cost 0.1 illustrative; the laptop's check ratio and
// draft cost measured (facts ratio5 and cDraft, Qwen3-4B with the 0.6B draft). src/check_stages.mjs checks the step list against window.SD_STG.hero.
(function(){
  if(!document.getElementById('stg-hero')||!window.SD||!window.S3||!SD.D.dists)return;const {at,off,lerp,mix}=S3;
  const L=SD.D.dists.code_edit,I0=64,K=4;
  const top=(r,j)=>r.top.reduce((b,x)=>x[j]>b[j]?x:b),find=(r,t)=>r.top.find(x=>x[0]===t)||[t,0,0];
  const pos=[0,1,2,3].map(j=>{const r=L[I0+j],g=top(r,2)[0],t=top(r,1)[0],G=find(r,g);return {g,t,q:G[2],p:G[1],pt:top(r,1)[1]}});
  let acc=0;while(acc<K&&pos[acc].g===pos[acc].t)acc++;
  const ctx=L.slice(I0-4,I0).map(r=>r.tok).join('');
  const hr=SD.h100t?SD.h100t(1,K+1,1024)/SD.h100t(1,1,1024):1,F=SD.D.facts,r5=parseFloat(F.ratio5),cd=parseFloat(F.cDraft),CI=0.1;
  const T={plain:K,h100:K*CI+hr,m1:K*cd+r5};
  window.SD_STG=window.SD_STG||{};window.SD_STG.hero={pos,acc,ctx,hr,r5,cd,T,out:acc+1};
  const vis=t=>SD.vis(t).replace(/^ /,'');
  const XS=1.15,x=i=>-1.7+i*XS,ZT=1.25,ZM=-1.7,XD=-4.6,ZD=.1,YT=.12;
  function tile(R,i,txt,fill,a,lab){R.box([x(i),0,ZT],[.98,YT,.56],{fill,a});if(txt)R.label([x(i),YT,ZT+.28],txt,{mono:true,fs:13,b:1,dy:14,c:lab||R.P.ink,a})}
  function slot(R,i,a){const h=.49,w=.49,P=R.P;R.quad([[x(i)-w,.005,ZT-.28],[x(i)+w,.005,ZT-.28],[x(i)+w,.005,ZT+.28],[x(i)-w,.005,ZT+.28]],{ec:P.mute,dash:[4,3],a:a*.8})}
  function draw(R,k,e){const P=R.P,blue=P.acc,or=P.c2,gr=P.good;R.grid(-6,5,-3,3.6,.5);
    const fade=k===5?.12:1;
    // the target: three glass plates for its weights, standing behind the tokens; the draft: one small block on the left
    const ta=(k===1?.3:1)*fade;
    R.glass([x(0)-.7,.12,ZM],[x(K)-x(0)+1.4,0,0],[0,1.3,0],{c:blue,a:ta*.85,nu:12,nv:5,th:.06});
    R.label([x(K)+.75,1.42,ZM],'target weights · Qwen3-1.7B',{al:'right',dx:-4,dy:-14,mono:true,fs:12.5,b:1,c:blue,a:ta,wide:1});
    const da=(k===1?1:k===0?.25:.3)*fade;
    R.box([XD,0,ZD],[1.1,.7,.8],{fill:mix(P.paper,or,.35),a:da});R.label([XD,.7,ZD],'draft · 0.6B',{mono:true,fs:12.5,b:1,dy:-12,c:or,a:Math.max(.35,da)});
    // the context the step starts from
    R.box([XD,0,ZT],[1.5,YT,.56],{fill:mix(P.paper,P.mute,.2),a:fade});R.label([XD,YT,ZT+.28],'…the mean of',{mono:true,fs:12.5,dy:14,c:P.mute,a:fade});
    for(let i=0;i<=K;i++)slot(R,i,(k<=1&&i===K?.4:1)*fade);
    // 1. plain decoding: one target pass per token, every pass reads every weight
    if(k===0){for(let i=0;i<K;i++){const on=e*K>i;const ai=on?1:0;if(e*K>i&&e*K<i+1.6)R.flow([[x(i),1.2,ZM],[x(i),.9,0],[x(i),.2,ZT]],{c:blue,r:.07,n:9,speed:1.6});
        if(on)tile(R,i,vis(pos[i].t),mix(P.paper,blue,.3),ai,blue)}
      R.label([x(1.5),0,ZT+.3],'4 tokens = 4 passes = 4 reads of every weight',{fs:13,b:1,dy:50,c:blue,a:e,wide:1})}
    // 2. the draft guesses k = 4 tokens, one small pass each
    if(k>=1&&k<=4){for(let i=0;i<K;i++){const on=k>1||e*K>i;if(!on)continue;
        if(k===1&&e*K<i+1.6)R.flowArc([XD+.4,.7,ZD],[x(i),.2,ZT],.9,{c:or,r:.07,n:7,speed:1.5});
        let fill=mix(P.paper,or,.35),lc=or,txt=vis(pos[i].g);
        if(k>=3){if(i<acc){fill=mix(P.paper,gr,.45);lc=gr;txt+=' ✓'}else if(i===acc){fill=mix(P.paper,or,.18);lc=P.bad;txt+=' ✗'}else{fill=mix(P.paper,or,.1)}}
        const a=k>=3&&i>acc?Math.max(.15,1-e):k===4&&i===acc?Math.max(.2,1-e):1;
        tile(R,i,txt,fill,a,lc);
        if(k===1)R.label([x(i),YT,ZT-.3],'q '+pos[i].q.toFixed(2),{mono:true,fs:12,dy:-10,c:or,a:k===1?1:.6})}}
    // 3. one target pass over all five positions: the weights are read once and serve every position
    if(k===2){for(let i=0;i<=K;i++)R.flow([[x(i),1.25,ZM],[x(i),.95,-.2],[x(i),.25,ZT-.1]],{c:blue,r:.065,n:8,speed:1.4});
      for(let i=0;i<K;i++){const h=.06+pos[i].p*1.1;R.box([x(i)+.32,YT,ZT-.1],[.18,h*e,.18],{fill:blue,shadow:false});
        R.label([x(i)+.32,YT+h*e,ZT-.1],'p '+(pos[i].p<.01?pos[i].p.toFixed(3):pos[i].p.toFixed(2)),{mono:true,fs:12,dy:-10,c:blue,a:e})}
      R.label([x(1.5),0,ZT+.3],'one pass, 5 positions, every weight read once',{fs:13,b:1,dy:50,c:blue,a:e,wide:1})}
    // 4. accept left to right; the first disagreement ends the step
    if(k===3){R.glow([x(acc),.3,ZT],.9,{c:P.bad,a:e*.6});R.label([x(acc),.5,ZT],'target wants "'+vis(pos[acc].t)+'" ('+pos[acc].pt.toFixed(3)+')',{fs:12.5,b:1,dy:-24,c:P.bad,a:e})}
    // 5. the target's own token replaces the rejected guess
    if(k>=4){const ya=k===4?lerp(1.4,0,Math.min(1,e*1.4)):0;if(k===4&&e<.9)R.flow([[x(acc),1.25,ZM],[x(acc),.6,ZT-.2]],{c:blue,r:.08,n:6,speed:1.4});
      R.box([x(acc),ya,ZT+(k===4?0:0)],[.98,YT,.56],{fill:mix(P.paper,blue,.35),a:fade});R.label([x(acc),ya+YT,ZT+.28],vis(pos[acc].t),{mono:true,fs:13,b:1,dy:14,c:blue,a:fade});
      for(let i=0;i<acc&&k===5;i++)tile(R,i,vis(pos[i].g),mix(P.paper,gr,.45),fade,gr);
      if(k===4)R.label([x(1.5),0,ZT+.3],(acc+1)+' tokens from 1 target pass',{fs:13,b:1,dy:50,c:gr,a:e,wide:1})}
    // 6. time for these 4 tokens, in target passes: plain, a datacenter GPU, this laptop
    if(k===5){const u=1.05,X0=-3.4,rows=[['plain decoding',[[T.plain,blue]],T.plain],['H100 (check derived, draft illustrative)',[[K*CI,or],[hr,blue]],T.h100],['this laptop (measured)',[[K*cd,or],[r5,blue]],T.m1]];
      rows.forEach(([nm,segs,tot],j)=>{const z=2.35+j*.75;let xx=X0;segs.forEach(([v,c])=>{const w=v*u*Math.min(1,e*1.5);R.box([xx+w/2,0,z],[Math.max(.01,w),.22,.42],{fill:mix(P.paper,c,.5)});xx+=w});
        R.label([X0,.22,z],nm,{al:'right',dx:-8,fs:12.5,c:P.ink,grp:'t'});R.label([xx,.22,z],tot.toFixed(2)+' passes',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:j===0?P.mute:j===1?gr:P.bad,a:e})})}
  }
  const full={cam:[.28,.62],bounds:[[-5.6,0,-2.0],[3.4,1.5,1.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one round of speculation, real tokens',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1600,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[18,16,16,16],
    view:k=>k===1?{cam:[.4,.55],bounds:[[-5.4,0,-.6],[2.6,1.2,1.8]]}:k===3||k===4?{cam:[.2,.5],bounds:[[-2.6,0,-2.2],[3.2,1.8,1.8]]}:k===5?{cam:[0,1.3],bounds:[[-6.2,0,2.0],[2.2,.4,4.0]]}:full});
})();
