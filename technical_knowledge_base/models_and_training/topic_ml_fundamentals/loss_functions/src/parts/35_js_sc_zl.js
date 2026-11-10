// ---- Scene (The level of the logits, Fig. 4): the same real prediction as Fig. 3, every logit shifted together, then z-loss (renderer v2) ----
// LT.pred (src/real_tokens.py): SmolLM2-135M's nine most likely next tokens after "... it was the spring of hope, it was the", their
// logits and log Z over all 49,152 tokens. The logits stand as signed bars on a white plinth (negative ones hang below); the glass plate is
// the level log Z; the front row is the softmax, which no shift changes. z-loss is PaLM's 1e-4 log^2 Z; its gradient on logit i is
// 2e-4 log Z p_i. The shift +8 is illustrative (labelled on the page); every other number is the model's. Static spans: data-zl.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-zl')||!window.S3||!window.LT)return;const {at,off,lerp,mix}=S3;
  const D=LT.pred,N=6,TK=D.tokens.slice(0,N),ti=TK.findIndex(t=>t.id===D.target_id),C=8;
  const p=TK.map(t=>Math.exp(t.logit-D.logZ)),z0=D.logZ,zl=v=>1e-4*v*v,gz=v=>p.map(q=>2e-4*v*q);
  const F={logZ:z0.toFixed(1),zmax:TK[0].logit.toFixed(1),ce:(D.logZ-TK[ti].logit).toFixed(2),c:'+'+C,logZc:(z0+C).toFixed(1),zl0:zl(z0).toFixed(3),zlc:zl(z0+C).toFixed(3),
    g0:gz(z0)[0].toExponential(1).replace('e-','×10^−'),gc:gz(z0+C)[0].toExponential(1).replace('e-','×10^−'),lp:(TK[ti].logit-D.logZ).toFixed(2).replace('-','−'),lpn:(TK[N-1].logit-D.logZ).toFixed(2).replace('-','−'),sn:TK[N-1].s.trim()};
  document.querySelectorAll('[data-zl]').forEach(e=>{const v=F[e.dataset.zl];if(v==null){e.textContent='?';return}
    const m=String(v).match(/^(.*)\^(.*)$/);if(m){e.innerHTML=m[1]+'<sup>'+m[2]+'</sup>'}else e.textContent=v});
  window.ZLT=F;
  const XS=1.25,x=i=>(i-(N-1)/2)*XS,ZB=-.9,ZS=2.0,Y0=1.0,HS=2.2/(z0+C),HP=3.0;
  // the shift applied at step k, progress e: 0, then up by C, then (z-loss) down to log Z = 0
  function shift(k,e){if(k<=0)return 0;if(k===1)return C*e;if(k===2)return C;if(k===3)return lerp(C,-z0,e);return -z0}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4.8,4.8,-2.4,2.8,.5);
    const c=shift(k,e),lev=z0+c,tc=P.acc,oc=mix(P.paper,P.c2,.55),col=i=>i===ti?tc:oc;
    // the plinth at the zero of the logits; positive logits stand on it, negative ones hang below
    R.box([0,Y0-.04,ZB],[N*XS+.2,.04,.6],{shadow:false});[-1,1].forEach(sx=>R.box([sx*(N*XS/2+.05),0,ZB],[.03,Y0-.05,.03],{a:.8}));
    for(let i=0;i<N;i++){const v=TK[i].logit+c,h=Math.max(.012,Math.abs(v)*HS);R.box([x(i),v>=0?Y0:Y0-.04-h,ZB],[XS*.6,h,.45],{fill:col(i),shadow:false,lw:.6});
      if(k===0||k===4||i===ti)R.label([x(i),v>=0?Y0+h:Y0-.04-h,ZB],(v>=0?'':'−')+Math.abs(v).toFixed(1),{mono:true,fs:12,dy:v>=0?-10:12,c:i===ti?tc:P.ink,b:i===ti})}
    // the level log Z as a glass plate across the row
    const yl=lev>=0?Y0+lev*HS:Y0-.04+lev*HS;
    R.glass([x(0)-.6,yl,ZB-.5],[N*XS,0,0],[0,0,1.0],{c:P.c4,nu:N*2,nv:2,a:.5});
    R.label([x(N-1)+.6,yl,ZB],'log Z = '+lev.toFixed(1),narrow?{mono:true,fs:12.5,b:1,al:'right',dy:-16,c:P.c4}:{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.c4});
    // z-loss's push: dots stream down every logit, as dense as its probability (the gradient is 2e-4 log Z p_i)
    if(k===2||k===3){const a=k===2?e:1-e;for(let i=0;i<N;i++){const v=TK[i].logit+c,top=v>=0?Y0+v*HS:Y0;R.flow([[x(i)+.3,top+.25,ZB],[x(i)+.3,Math.max(Y0+.05,top-.6),ZB]],{c:P.c4,a:a*(.3+.7*Math.min(1,p[i]*4)),r:.04+.05*Math.min(1,p[i]*3),n:Math.max(2,Math.round(2+p[i]*16)),speed:.7})}}
    // the softmax in front: the same at every shift
    for(let i=0;i<N;i++){const h=Math.max(.012,p[i]*HP);R.box([x(i),0,ZS],[XS*.6,h,.5],{fill:col(i),shadow:false,lw:.6});
      if(!narrow||i===ti)R.label([x(i),0,ZS+.3],TK[i].s.trim(),{fs:12.5,dy:12,c:i===ti?tc:P.ink,b:i===ti})}
    R.label([x(ti),p[ti]*HP,ZS],(100*p[ti]).toFixed(1)+'%',{mono:true,fs:12,dy:-10,c:tc,b:1});
    // the readout: what cross entropy and z-loss see
    R.label([x(0)-.6,Y0,ZB],'logits '+(c>=0?'+ ':'− ')+Math.abs(c).toFixed(1),{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row'});
    R.label([x(0)-.6,.2,ZS],'softmax p · never moves',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'row'});
    R.label([0,0,ZS+.45],'cross entropy '+F.ce+' · z-loss '+zl(lev).toFixed(3),{mono:true,fs:13,b:1,dy:36,c:P.ink});
  }
  const full={cam:[.18,.42],bounds:[[-3.9,0,-1.4],[3.9,3.3,2.5]]};
  S3.stage({id:'stg-zl',list:'sx-zl',fig:'Fig. 4 · the same prediction, every logit shifted together',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1900,hold:4800,draw,
    margin:w=>w<520?[22,8,40,8]:[26,120,44,170],
    view:k=>k===4?{cam:[.18,.5],bounds:[[-3.9,0,-1.4],[3.9,1.6,2.5]]}:full});
})();
