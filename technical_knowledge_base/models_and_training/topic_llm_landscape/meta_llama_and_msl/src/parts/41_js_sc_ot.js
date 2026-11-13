// ---- Scene (Fig. 2): the overtraining bet in numbers. One column per Llama model, rows in depth by generation, height the training tokens per
// parameter on a log scale (one storey per factor of ten), against a teal glass plane at Chinchilla's compute-optimal 20 (window.OT, window.CHIN,
// from the papers and model cards cited in 11a_data.js). Llama 4 is drawn per active parameter, with its per-stored-parameter ratio as a glass column. ----
(function(){
  if(!document.getElementById('stg-ot')||typeof OT==='undefined')return;const {at,lerp,mix}=S3;
  // generations left to right (chronological), models in depth within a generation: the largest (shortest column) in front, so none hides another
  const XG=[-3.3,-1.1,1.1,3.3],Z=(m,n)=>1.0-(n-1-m)*.75,XO=(m,n)=>(m-(n-1)/2)*.5,HS=1.05,H=r=>HS*Math.log10(Math.max(10,r)/10),HC=H(CHIN),W=.55;
  const fm=v=>v>=100?Math.round(v).toLocaleString('en-GB'):v.toFixed(1);
  const COL=P=>[P.c1,P.c3,P.c2,P.c4];
  // which columns a step is about: [generation, model] pairs; null means every model of the generations shown
  const FOC=[[[0,0],[0,1],[0,2],[0,3]],[[1,0],[1,1],[1,2]],[[2,0],[2,1]],[[2,2]],[[3,0],[3,1]],null];
  const FIRST=[0,1,2,4]; // the step at which each generation's row appears
  const isF=(s,g,m)=>FOC[s]===null||FOC[s].some(([a,b])=>a===g&&b===m);
  // a column's alpha at step s: absent before its row appears, full when the step is about it, receding otherwise
  const F1=(g,m)=>g===2&&m===2?3:FIRST[g],A=(s,g,m)=>s<F1(g,m)?0:isF(s,g,m)?1:.22;
  // the outgoing label is gone by mid-transition and the incoming one starts after it, so two never share the space
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const la=(st,e,f)=>{const a=f(st.pk),b=f(st.k);if(e>=1||a===b)return b;return a>b?lerp(a,b,Math.min(1,4*e)):lerp(a,b,Math.max(0,2*e-1))};
  function draw(R,k,e,st){const P=R.P,C=COL(P);R.grid(-4.8,4.6,-2.0,2.0,.5);
    // the log ruler at the right edge of the current view (it glides with the camera): one storey per factor of ten, the compute-optimal 20 in teal
    const rx=tw(st,e,s=>V[s].bounds[1][0]+.1),inC=p=>{const q=R.p(p);return q[2]>0&&q[0]>-4&&q[0]<R.W+4&&q[1]>-4&&q[1]<R.H+4};
    R.line([[rx,0,-1.7],[rx,H(3000),-1.7]],{c:P.mute,w:1,a:.6});
    [[10,'10'],[CHIN,'20 · compute-optimal'],[100,'100'],[1000,'1,000']].forEach(([v,t])=>{const y=H(v),cc=v===CHIN?P.c6:P.mute;if(v!==CHIN)R.line([[-4.35,y,-1.7],[rx,y,-1.7]],{c:P.mute,w:1,a:.28,dash:[3,4]});
      R.line([[rx,y,-1.7],[rx+.12,y,-1.7]],{c:cc,w:1.4,a:.9});if(inC([rx,y,-1.7]))R.label([rx+.12,y,-1.7],t,{al:'left',dx:5,dy:v===CHIN?-8:0,mono:true,fs:12,b:v===CHIN,c:cc})});
    if(inC([rx,H(3000),-1.7]))R.label([rx,H(3000),-1.7],'tokens per parameter, log',{al:'left',dx:4,dy:-11,mono:true,fs:12,c:P.mute});
    // Chinchilla's compute-optimal ratio as a glass plane under every column
    // (in a close-up it spans only the view, ending at the ruler, so it stays inside the card and clear of the ruler's labels)
    {const gx0=Math.max(-4.35,tw(st,e,s=>V[s].bounds[0][0]-.3)),gx1=Math.min(4.3,rx);R.glass([gx0,HC,-1.7],[gx1-gx0,0,0],[0,0,3.2],{c:P.c6,a:.6,nu:Math.max(4,Math.round(16*(gx1-gx0)/8.65)),nv:8,th:.02})}
    OT.forEach(([gen,yr,tok,src,ms],g)=>{const c=C[g],n=ms.length;
      const ra=tw(st,e,s=>Math.max(...ms.map((_,m)=>A(s,g,m)))),rl=la(st,e,s=>ms.some((_,m)=>A(s,g,m)>=1)?1:0);
      if(ra>.01&&inC([XG[g],0,1.5])){R.label([XG[g],0,1.5],gen+' · '+yr,{fs:12.5,b:1,dy:12,c,a:Math.max(rl,.55)*Math.min(1,ra*3)});R.label([XG[g],0,1.5],tok,{mono:true,fs:12,dy:28,c:P.mute,a:la(st,e,s=>s<5&&ms.some((_,m)=>A(s,g,m)>=1)?1:0),wide:1})}
      ms.forEach(([nm,N,D,Nt],m)=>{const a=tw(st,e,s=>A(s,g,m));if(a<=.01)return;const x=XG[g]+XO(m,n)-(Nt?.3:0),z=Z(m,n),r=D/N,h=H(r),grow=k===F1(g,m)?e:1;
        const hh=Math.max(.02,h*grow);R.box([x,0,z],[W,hh,W],{fill:mix(P.paper,c,.62),a,lw:.8});
        const lv=la(st,e,s=>A(s,g,m)>=1&&(s<5||m===0||g===3||(g===2&&m===2))?1:0);
        R.label([x+W/2,hh,z+W/2],nm+' · '+fm(r),{al:'left',dx:6,dy:-3,mono:true,fs:12.5,b:1,c:P.ink,a:lv});
        // training tokens pouring into the model while the step is about it: dot count grows with the tokens per parameter
        if(isF(k,g,m)&&FOC[k]!==null)R.flow([[x,.02,z+W/2+.45],[x,.02,z+W/2+.02],[x,hh,z+W/2+.02]],{c,a:.85*a,r:.05,n:Math.round(6+4*Math.log10(r)),speed:1.2});
        // Llama 4: the same tokens per stored parameter, a glass column beside it
        if(Nt){const ga=a*tw(st,e,s=>s===4?1:s>4?.6:0),rt=D/Nt,ht=H(rt);if(ga>.01){R.box([x+.62,0,z],[W*.75,Math.max(.02,ht*grow),W*.75],{fill:mix(P.paper,c,.25),fa:.35,a:ga,lw:.8});
          R.label([x+.62+W*.37,ht*grow,z+W*.37],fm(rt)+' stored',{al:'left',dx:6,dy:-3,mono:true,fs:12,c:P.mute,a:la(st,e,s=>s===4?1:0)*ga,wide:1})}}});
    });
    // the flagship's own forecast: Meta's scaling law predicted 402B on 16.55T, about 41 per parameter
    const fa=la(st,e,s=>s===3?1:0);if(fa>.01){const x=XG[2]+XO(2,3),z=Z(2,3),h=H(16.55e12/402e9);
      R.line([[x-.42,h,z+.3],[x+.42,h,z+.3]],{c:P.acc,w:2.4,a:fa});R.label([x-.42,h,z+.3],'Meta\'s forecast: 402B on 16.55T, 41',{al:'right',dx:-8,dy:-2,fs:12.5,c:P.acc,b:1,a:fa,wide:1})}
  }
  const V=[{cam:[.3,.26],bounds:[[-4.4,0,-1.4],[-2.2,1.4,2.2]]},{cam:[.3,.26],bounds:[[-4.4,0,-1.4],[-.1,1.6,2.2]]},{cam:[.3,.26],bounds:[[-2.4,0,-1.4],[2.2,2.6,2.2]]},
    {cam:[.36,.26],bounds:[[.4,0,-.2],[2.9,1.0,2.2]]},{cam:[.3,.26],bounds:[[-.2,0,-1.4],[4.5,2.7,2.2]]},{cam:[.28,.4],bounds:[[-4.5,0,-1.6],[4.5,2.6,2.2]]}];
  S3.stage({id:'stg-ot',list:'sx-ot3',fig:'Fig. 2 · training tokens per parameter, log height, against compute-optimal',cam:V[5].cam,bounds:V[5].bounds,aspect:.58,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,70,30,10]:[26,170,40,30],view:k=>V[k]});
})();
