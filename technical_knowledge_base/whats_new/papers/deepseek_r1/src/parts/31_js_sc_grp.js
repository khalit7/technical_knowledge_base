// ---- Scene: one GRPO step on sixteen real toy answers (renderer v2: a few large objects per step, the camera moving in close per step,
// a glass plate for the policy, flowing dots wherever samples, rewards or gradients move, signed bars on a white plinth).
// Data: TOYDATA.anim from toy_sweep.mjs (the question, the sixteen sampled answers with their tokens, format and accuracy, and for each reward,
// R1-Zero's 'zero' and R1's 'lc': rewards R, group mean mu and standard deviation sd, advantages A, and the change in log-probability dlogp
// after one gradient step of size 2). Nothing here is DeepSeek's data. ----
(function(){
  if(!document.getElementById('stg-grp'))return;const {lerp,mix}=S3;
  const AN=TOYDATA.anim,OS=AN.os,n=OS.length,QD=AN.q,ANS=QD.reduce((a,b)=>a+b,0)%3;
  let M='zero';
  const XS=.56,x=i=>(i-(n-1)/2)*XS,ZT0=-.15,TZ=.42,ZB=-1.3,Y0=1.15,ZP=-2.5,ZQ=-3.55,SR=.5,SA=.6,SD=.2,LIM=4;
  const zt=j=>ZT0+j*TZ, zLen=L=>ZT0-TZ/2+L*TZ;           // depth of token j; the edge after L tokens
  const TOKT=t=>['0','1','2','零','一','二','/think','→0','→1','→2'][t];
  function sum(m){const D=AN[m],E=D.dlogp.map(v=>Math.exp(v)),Z=E.reduce((a,b)=>a+b,0),k=OS.map(o=>o.think);
    return {before:k.reduce((a,b)=>a+b,0)/n,after:k.reduce((a,v,i)=>a+v*E[i],0)/Z,w:E.map(v=>v/Z),up:D.dlogp.filter(v=>v>0).length,down:D.dlogp.filter(v=>v<0).length}}
  const ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),cl=v=>v<0?0:v>1?1:v;
  // a signed bar standing on (or hanging from) the plinth at height Y0
  function bar(R,i,v,c,a){if(a<=.01)return;const h=Math.max(.012,Math.abs(v));R.box([x(i),v>=0?Y0:Y0-.045-h,ZB],[.3,h,.24],{fill:c,a,shadow:false,lw:.7})}
  function plinth(R,a){if(a<=.01)return;const W=n*XS+.3;R.box([0,Y0-.045,ZB],[W,.045,.44],{a,shadow:false});[-1,1].forEach(s=>R.box([s*W/2,0,ZB],[.04,Y0-.05,.04],{a:a*.9}))}
  function draw(R,k,e){const P=R.P,D=AN[M],S=sum(M);R.grid(-5,5,-4.2,3.6,.5);
    const tokCol=t=>t<3?mix(P.paper,P.c1,.55):t<6?mix(P.paper,P.c2,.55):t===6?mix(P.paper,P.mute,.3):P.paper;
    // the question and the policy (always there; they recede once the step is about the answers)
    const qa=k===0?1:.3;
    QD.forEach((d,j)=>{const qx=(j-2)*.5;R.box([qx,0,ZQ],[.42,.36,.42],{fill:mix(P.paper,P.ink,.08),a:qa});if(k<=1)R.label([qx,.36,ZQ],String(d),{mono:true,fs:13,b:1,dy:-9,a:Math.max(.55,qa)})});
    if(k<=1)R.label([-1.25,.2,ZQ],'question',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row'});
    const pa=k===0||k===4?1:.3;R.glass([-4.55,.1,ZP],[9.1,0,0],[0,1.35,0],{c:P.c5,a:pa,nu:12,nv:3});
    if(k===0||k===4)R.label([-4.55,.8,ZP],'policy',{al:'right',dx:-8,fs:12,c:P.c5,b:1,grp:'row'});
    // 1. sixteen answers, one column of token blocks each (they grow token by token on the first step)
    const grow=k===0?e*1.15:1,ta=k===0||k===1||k===5?1:.3;
    OS.forEach((o,i)=>{const L=o.t.length,wa=k===5?.22+.78*cl(S.w[i]/Math.max(...S.w)*1.6):1;
      o.t.forEach((t,j)=>{if(j/7>grow)return;const isAns=t>=7,ok=isAns&&(t-7===ANS);
        let fill=tokCol(t);if(isAns&&k>=1)fill=mix(P.paper,ok?P.good:P.bad,k===1?.35+.35*e:.45);
        R.box([x(i),0,zt(j)],[.36,.24,.33],{fill,a:ta*wa,shadow:false,lw:.6})});
      if(k===1){const j=L-1;R.glow([x(i),.3,zt(j)],.22,{c:o.acc?P.good:P.bad,a:e*.8});
        R.label([x(i),0,zt(j)],TOKT(o.t[j]),{mono:true,fs:12,dy:14,a:e,wide:1,c:o.acc?P.good:P.bad})}});
    if(k===0){R.flow([[0,.25,ZQ+.25],[0,.6,ZP-.02]],{c:P.ink,a:e*.8,r:.06,n:4});
      OS.forEach((o,i)=>{if(i%2)return;R.flowArc([x(i),.6,ZP+.02],[x(i),.3,ZT0-.2],.25,{c:P.c5,a:e*.75,r:.05,n:3})})}
    if(k<=1)R.label([x(0)-.3,.1,1.2],'answers · one block per token',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row'});
    // 2. the rule's verdicts in two rows in front: format and accuracy
    if(k===1){const a=e;OS.forEach((o,i)=>{R.label([x(i),0,3.1],o.fmt?'✓':'✗',{fs:13,b:1,c:o.fmt?P.good:P.bad,a});R.label([x(i),0,3.55],o.acc?'✓':'✗',{fs:13,b:1,c:o.acc?P.good:P.bad,a})});
      R.label([x(0)-.3,0,3.1],'format',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row',a});R.label([x(0)-.3,0,3.55],'accuracy',{al:'right',dx:-8,fs:12,c:P.mute,grp:'row',a})}
    // 3 to 5. the plinth with rewards, then advantages, then the change in log-probability
    if(k>=2){const ba=k===5?.3:1;plinth(R,k===2?Math.min(1,e*2):ba);
      if(k===2)OS.forEach((o,i)=>{if(i%2===0)R.flowArc([x(i),.3,ZT0-.1],[x(i),Y0+.1,ZB+.15],.35,{c:P.c5,a:e*.7,r:.045,n:3})});
      const seen={},dl=D.dlogp,imax=dl.indexOf(Math.max(...dl)),imin=dl.indexOf(Math.min(...dl));
      OS.forEach((o,i)=>{let v,c,lab;
        if(k===2){v=D.R[i]*SR*ease(cl(e*1.2));c=mix(P.paper,P.c5,.6);lab=(+D.R[i].toFixed(2)).toString()}
        else if(k===3){const u1=cl(e*2),u2=cl(e*2-1),r=(D.R[i]-D.mu*u1)*SR;v=lerp(r,D.A[i]*SA,u2);c=mix(mix(P.paper,P.c5,.6),D.A[i]>=0?P.good:P.bad,u1);lab=D.A[i].toFixed(2)}
        else if(k===4){const d=Math.max(-LIM,Math.min(LIM,D.dlogp[i]));v=lerp(D.A[i]*SA,d*SD,ease(cl(e*1.3)));c=d>=0?P.good:P.bad;lab=D.dlogp[i].toFixed(1)
          if(D.dlogp[i]<-LIM&&e>.7)R.ball([x(i),Y0-.06-LIM*SD-.12,ZB],.07,{c:P.bad,a:1})}
        else{const d=Math.max(-LIM,Math.min(LIM,D.dlogp[i]));v=d*SD;c=d>=0?P.good:P.bad;lab=null}
        if(lab!=null){if(k===4?(i!==imax&&i!==imin):seen[lab])lab=null;else seen[lab]=1}
        bar(R,i,v,c,ba);if(lab&&(k<4||e>.6))R.label([x(i),v>=0?Y0+v:Y0,ZB],lab,{mono:true,fs:12,dy:v>=0?-10:12,grp:'val',a:k===3?cl(e*2-1):1,c:P.ink})});
      // 4. the group mean as a glass plane: it sinks to the plinth as the mean is subtracted
      if(k===3){const u1=cl(e*2),yp=Y0+D.mu*SR*(1-u1);R.glass([-4.55,yp,ZB-.3],[9.1,0,0],[0,0,.6],{c:P.acc,a:1-.6*cl(e*2-1),nu:16,nv:1});
        R.label([4.6,yp,ZB],'mean '+D.mu.toFixed(2),{al:'left',dx:8,mono:true,fs:12,c:P.acc,b:1})}
      const rl=k===2?'reward':k===3?'advantage':'Δ log-prob';R.label([x(0)-.3,Y0,ZB],rl,{al:'right',dx:-8,fs:12,c:P.mute,grp:'row',a:ba})}
    // 5. the update: advantages stream back into the policy, more dots for a larger push
    if(k===4)OS.forEach((o,i)=>{const A=D.A[i];R.flowArc([x(i),Y0+.15,ZB-.1],[x(i),.85,ZP+.04],.35,{c:A>=0?P.good:P.bad,a:e*.85,r:.05,n:Math.max(1,Math.round(Math.abs(A)*3))})});
    // 6. thinking length before and after the step, weighted by each answer's new probability
    if(k===5){const W=n*XS/2+.15,zb=zLen(S.before),za=zLen(lerp(S.before,S.after,ease(e)));
      R.line([[-W,.02,zb],[W,.02,zb]],{c:P.mute,w:2,dash:[6,4]});R.line([[-W,.02,za],[W,.02,za]],{c:P.acc,w:3});
      R.label([-W,0,zb],'before '+S.before.toFixed(2),{al:'right',dx:-8,mono:true,fs:12,c:P.mute});R.label([-W,0,za],'after '+S.after.toFixed(2),{al:'right',dx:-8,mono:true,fs:12,c:P.acc,b:1})}
  }
  // counters under the step list: the group's numbers for the reward in use
  function counters(k){const el=document.getElementById('grpCnt');if(!el)return;const D=AN[M],S=sum(M);
    el.innerHTML=[stat('mean reward',k>=2?D.mu.toFixed(2):'·','group of 16'),stat('standard deviation',k>=3?D.sd.toFixed(2):'·','the advantage divides by it'),
      stat('answers pushed up / down',k>=4?S.up+' / '+S.down:'·','sign of Δ log-prob'),stat('thinking tokens, weighted',k>=5?S.before.toFixed(2)+' → '+S.after.toFixed(2):S.before.toFixed(2),k>=5?'before → after the step':'mean of the 16 samples')].join('')}
  const q=document.getElementById('grpQ');if(q)q.textContent=QD.join(' ');const qa=document.getElementById('grpAns');if(qa)qa.textContent=String(ANS);
  const full={cam:[.55,.62],bounds:[[-4.7,0,-3.9],[4.7,2.1,2.6]]};
  const V=[full,{cam:[.45,.8],bounds:[[-4.7,0,-.5],[4.7,.7,3.8]]},{cam:[.5,.42],bounds:[[-4.7,0,-2],[4.7,2.6,1.2]]},{cam:[.45,.36],bounds:[[-4.7,0,-2],[4.7,2.4,.6]]},
    {cam:[.55,.5],bounds:[[-4.7,0,-2.9],[4.7,2.2,.4]]},{cam:[.3,1.0],bounds:[[-4.7,0,-.6],[4.7,.5,3.0]]}];
  const stg=S3.stage({id:'stg-grp',list:'sx-grp',fig:'Fig. 1 · one GRPO step, sixteen toy answers',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1700,hold:5200,draw,
    view:k=>{const v=V[k],h=document.getElementById('stg-grp');return h&&h.clientWidth<520?{cam:[v.cam[0],Math.min(1.15,v.cam[1]+.35)],bounds:v.bounds}:v},margin:w=>w<520?[14,8,14,8]:[16,84,14,124],onStep:k=>counters(k)});
  const seg=document.getElementById('grpM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    M=b.dataset.m;stg.list('sx-grp')}));
})();
