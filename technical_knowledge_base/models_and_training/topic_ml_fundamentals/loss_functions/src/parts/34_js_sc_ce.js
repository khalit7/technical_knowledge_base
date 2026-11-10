// ---- Scene (Cross entropy, Fig. 3): one real next-token prediction through the loss and its gradient p - y (renderer v2) ----
// LT.pred (src/real_tokens.py via mk_data.py): SmolLM2-135M's logits after "... it was the spring of hope, it was the", its most likely
// next tokens (the real next token " winter" first), log Z over all 49,152 tokens; the seven most likely are drawn, the rest of the vocabulary
// is one grey column. Rows, front to back as they appear: logits z, softmax p, the one-hot target y, minus the gradient -(p - y) on a white
// plinth (the target's pull up stands on it, every other token's push down hangs below). Each step shows its rows and lets the others go.
// The step list's numbers are static spans (data-ce) written here from the same data; check_stages.mjs compares them.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ce')||!window.S3||!window.LT)return;const {at,off,lerp,mix}=S3;
  const D=LT.pred,N=7,TK=D.tokens.slice(0,N),ti=TK.findIndex(t=>t.id===D.target_id),NC=N+1;
  const p=TK.map(t=>Math.exp(t.logit-D.logZ)),rest=1-p.reduce((a,b)=>a+b,0),pall=p.concat([rest]);
  const g=pall.map((v,i)=>i===ti?1-v:-v);   // minus the gradient: the direction gradient descent moves each logit
  const nm=s=>s.trim(),fm=v=>(v<0?'−':'')+Math.abs(v).toFixed(3);
  const pc=v=>(100*v).toFixed(1)+'%',restn=(D.vocab-N).toLocaleString('en-US'),F={V:D.vocab.toLocaleString('en-US'),logZ:D.logZ.toFixed(1),rest:pc(rest),restn,
    ce:(D.logZ-TK[ti].logit).toFixed(2),pull:(1-p[ti]).toFixed(3),pushr:rest.toFixed(3)};
  for(let i=0;i<4;i++){F['s'+i]=nm(TK[i].s);F['z'+i]=TK[i].logit.toFixed(1);F['p'+i]=pc(p[i]);F['g'+i]=p[i].toFixed(3)}
  document.querySelectorAll('[data-ce]').forEach(e=>{e.textContent=F[e.dataset.ce]!=null?F[e.dataset.ce]:'?'});
  window.CET=F;
  const XS=1.2,x=i=>(i-(NC-1)/2)*XS,ZL=-2.4,ZP=-.7,ZY=.9,ZG=2.5,zmax=Math.max(...TK.map(t=>t.logit)),HL=1.7/zmax,HP=2.4,HY=1.1,YG=.75,HG=2.0;
  const W=XS*.62;
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5.6,5.6,-3,3.4,.5);
    const tc=P.acc,oc=mix(P.paper,P.c2,.6),col=i=>i===ti?tc:i===N?mix(P.paper,P.mute,.55):oc;
    // how present each row is: the step's own rows at full strength, the one just used receding, the rest gone
    const aL=k===0?1:k===1?lerp(1,.3,e):k===2?.3*(1-e):0;
    const aP=k===0?0:k===1?e:k===2?1:k===3?lerp(1,.25,e):k===4?.15:0;
    const aY=k===2?e:k===3?lerp(1,.25,e):0,aG=at(k,e,3);
    // token names: one row at a time carries them, staggered so neighbours never meet
    const nameRow=k===0?ZL:k===1?ZP:k===2?ZY:ZG,nameY=0;
    for(let i=0;i<NC;i++){if(narrow&&i!==ti&&i!==1&&i!==N)continue;
      R.label([x(i),nameY,nameRow+.32],i===N?restn+' others':nm(TK[i].s),{fs:12.5,dy:12+(i%2)*15,c:i===ti?tc:i===N?P.mute:P.ink,b:i===ti})}
    // logits
    if(aL>0)for(let i=0;i<N;i++){const h=Math.max(.015,TK[i].logit*HL);R.box([x(i),0,ZL],[W,h,.55],{fill:col(i),a:aL,shadow:false,lw:.6});
      if(k===0)R.label([x(i),h,ZL],TK[i].logit.toFixed(1),{mono:true,fs:12,dy:-10,c:i===ti?tc:P.ink,b:i===ti})}
    if(k===0)R.label([x(N),.05,ZL],'not drawn',{fs:12,dy:-8,c:P.mute});
    // softmax over the whole vocabulary; flows from each logit into its probability
    if(aP>0){for(let i=0;i<NC;i++){const h=Math.max(.012,pall[i]*HP);R.box([x(i),0,ZP],[W,h,.55],{fill:col(i),a:aP,shadow:false,lw:.6});
        if(k===1||(k===2&&i===ti))R.label([x(i),h,ZP],pc(pall[i]),{mono:true,fs:12,dy:-10,c:i===ti?tc:P.ink,b:i===ti,a:aP})}
      if(k===1)for(let i=0;i<N;i++)R.flowArc([x(i),TK[i].logit*HL+.03,ZL],[x(i),pall[i]*HP+.03,ZP],.35,{c:col(i),a:e*(.4+.6*Math.min(1,pall[i]*4)),r:.05+.04*Math.min(1,pall[i]*3),n:Math.max(2,Math.round(2+pall[i]*16)),speed:1})}
    // the target: one-hot, 1 on the real next token
    if(aY>0){for(let i=0;i<NC;i++){const h=i===ti?HY:.012;R.box([x(i),0,ZY],[W,h,.45],{fill:i===ti?tc:mix(P.paper,P.mute,.25),a:aY,shadow:false,lw:.6})}
      if(k===2)R.label([x(ti),0,ZY+.32],'y = 1 · loss −ln p = '+F.ce+' nats',{mono:true,fs:12.5,b:1,al:'left',dx:-30,dy:48,c:tc,a:aY})}
    // minus the gradient on every logit, y - p, on a white plinth: the target's pull stands up, the pushes hang down
    if(aG>0){R.box([0,YG-.04,ZG],[NC*XS,.04,.4],{a:aG,shadow:false});[-1,1].forEach(sx=>R.box([sx*(NC*XS/2),0,ZG],[.03,YG-.05,.03],{a:aG*.8}));
      for(let i=0;i<NC;i++){const v=g[i],h=Math.max(.012,Math.abs(v)*HG);R.box([x(i),v>=0?YG:YG-.04-h,ZG],[W,h,.3],{fill:col(i),a:aG,shadow:false,lw:.6});
        if((k===3&&!narrow)||i===ti||i===N)R.label([x(i),v>=0?YG+h:YG-.04-h,ZG],(v>=0?'+':'')+fm(v),{mono:true,fs:12,dy:v>=0?-10:12,al:'center',c:i===ti?tc:P.ink,b:i===ti,a:aG})}
      // where the gradient comes from: each probability and the target stream into it
      if(k===3){for(let i=0;i<NC;i++)R.flowArc([x(i),pall[i]*HP+.03,ZP],[x(i),YG+.05,ZG],.4,{c:col(i),a:e*(.4+.6*Math.min(1,pall[i]*4)),r:.05+.04*Math.min(1,pall[i]*3),n:Math.max(2,Math.round(2+pall[i]*14)),speed:1});
        R.flowArc([x(ti),HY+.03,ZY],[x(ti),YG+Math.abs(g[ti])*HG,ZG],.3,{c:tc,a:e,r:.09,n:9,speed:1})}}
    // the last step: every push stacked beside the pull, the same height
    if(k===4){const xs=x(NC-1)+1.5,a=e;let y0=YG;
      R.box([xs-.3,YG,ZG],[.45,g[ti]*HG,.32],{fill:tc,a,shadow:false,lw:.6});
      for(let i=0;i<NC;i++){if(i===ti)continue;const h=-g[i]*HG;R.box([xs+.3,y0,ZG],[.45,Math.max(.004,h),.32],{fill:col(i),a,shadow:false,lw:.4});y0+=h}
      R.label([xs,YG+g[ti]*HG,ZG],'pull = sum of pushes',{fs:12.5,b:1,dy:-14,c:P.ink,a})}
    // the rows, named on the left
    const L=x(0)-.7;
    if(aL>.3)R.label([L,.25,ZL],'logits z',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aL});
    if(aP>.3)R.label([L,.25,ZP],'softmax p',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aP});
    if(aY>.3)R.label([L,.25,ZY],'target y',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aY});
    if(aG>.05)R.label([L,YG,ZG],'y − p',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row',a:aG});
  }
  const bx=[-5.4,5.4];
  S3.stage({id:'stg-ce',list:'sx-ce',fig:'Fig. 3 · one real next-token prediction, SmolLM2-135M',cam:[.3,.5],bounds:[[bx[0],-.3,-2.8],[bx[1],2.4,3]],aspect:.5,dur:1600,hold:4800,draw,
    margin:w=>w<520?[22,8,30,8]:[26,24,34,90],
    view:k=>k===0?{cam:[.3,.32],bounds:[[bx[0],0,-2.8],[bx[1],1.8,-1.6]]}:k===1?{cam:[.3,.5],bounds:[[bx[0],0,-2.8],[bx[1],2.4,-.2]]}:k===2?{cam:[.3,.75],bounds:[[bx[0],0,-1.2],[bx[1],2.4,1.4]]}:
      k===3?{cam:[.3,.45],bounds:[[bx[0],-.2,-1.2],[bx[1],2.4,3]]}:{cam:[.3,.3],bounds:[[bx[0],-.2,2],[bx[1]+2.2,2.4,3.1]]}});
})();
