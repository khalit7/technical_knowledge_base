// ---- Scene: Fig. 2, pooling and normalisation on real hidden states (renderer v2). Data: EMB.anim (one SciFact claim through three models' real
// weights, CPU float32): each token's final hidden state (first 16 numbers drawn), the pooled vector under each pooling, its length, and the
// cosine to the labelled abstract. Rows are tokens (first at the back), bars the first 16 numbers (positive up, negative hanging), scaled to the
// model's 98th percentile of |value| (a few outlier numbers, large in Qwen3, are drawn capped at 1.25 times that height).
// Steps: tokens; one vector per token; pooling; the pooled vector and its length; normalise; the cosine. Model and pooling switches redraw. ----
(function(){
  if(!document.getElementById('stg-pa')||!window.EMB||!EMB.anim)return;const {at,mix,lerp}=S3;
  const A=EMB.anim,esc=RD.esc;let model='bge-small',mode='own';
  const OTHER={'bge-small':'mean','minilm-l6':'cls','qwen3-emb-0.6b':'mean'},PN={cls:'CLS (first token)',mean:'mean of all tokens',last:'last token'};
  document.getElementById('emb-pa-claim').textContent=A.claim;
  const pooling=()=>{const m=A.models[model];return mode==='own'?m.pool:OTHER[model]};
  function pooled(m,p){const H=m.hidden;if(p==='cls')return H[0];if(p==='last')return H[H.length-1];return H[0].map((_,j)=>H.reduce((a,r)=>a+r[j],0)/H.length)}
  const WD=3.8,YP=.42,ZF=3.0,XL=2.85,tok=t=>t.replace(/^Ġ/,'·').replace(/Ċ/g,'⏎').slice(0,14);
  function row(R,c,vals,m,col,a,hmax,dz){if(a<=.01)return;const nb=vals.length,bw=WD/nb;
    R.box([c[0],c[1]-.03,c[2]],[WD+.1,.03,dz],{a,shadow:false,lw:.6});
    vals.forEach((v,i)=>{const h=Math.max(.012,Math.min(1.25,Math.abs(v)/m)*hmax),bx=c[0]-WD/2+bw*(i+.5);
      R.box([bx,v>=0?c[1]:c[1]-.03-h,c[2]],[bw*.66,h,dz*.7],{fill:col(v),a,shadow:false,lw:.5})})}
  function draw(R,k,e){const P=R.P,m=A.models[model],p=pooling(),H=m.hidden,n=H.length,dz=Math.min(.36,4.2/(n-1)),z=i=>-2.1+i*4.2/(n-1);
    R.grid(-3,3.6,-2.5,3.8,.5);
    const fl=H.flat().map(Math.abs).sort((a,b)=>a-b),mx=fl[Math.floor(.98*(fl.length-1))]||1,use=p==='cls'?[0]:p==='last'?[n-1]:H.map((_,i)=>i);
    const pos=P.c1,neg=P.c2,cf=v=>v>=0?mix(P.paper,pos,.8):mix(P.paper,neg,.8);
    // 1. tokens as tiles; 2. each rises into its row of 16 numbers
    H.forEach((r,i)=>{const pre=i>0&&i<=m.n_prompt,hot=use.includes(i),a=k<2?1:k===2?lerp(1,hot?1:.22,e):(hot&&use.length===1?.5:.15);
      const tile=pre?mix(P.paper,P.mute,.45):P.paper;
      if(k===0)R.box([0,0,z(i)],[WD,.08,dz*.7],{fill:tile,a:1,shadow:false});
      else row(R,[0,YP,z(i)],r,mx,cf,a*(k===1?e:1),.36,dz*.8);
      const lab=n<=20||i%2===0||i===n-1;
      if(lab)R.label([-WD/2-.1,k===0?.05:YP,z(i)],tok(m.tokens[i]),{fs:12,mono:true,al:'right',dx:-6,grp:'tok',c:pre?P.mute:hot&&k>=2?P.acc:P.ink,a:k>=3?.45:1})});
    // 3. pooling: the rows that feed the pooled vector stream forward
    const pv=pooled(m,p),len=m.lengths[p],mP=Math.max(...pv.map(Math.abs))||1;
    if(k===2){const nn=use.length;use.forEach(i=>R.flowArc([WD/2-.2,YP+.1,z(i)],[WD/2-.2,YP+.1,ZF],.25,{c:P.acc,a:e*(nn>1?.55:1),r:nn>1?.04:.07,n:nn>1?3:8,speed:1.4}))}
    if(k>=2){const a=k===2?e:1,sc=k===4?lerp(1,1/len,e):k>=5?1/len:1;
      // the bars keep their shape and shrink (drawn no smaller than a fifth so they stay visible; the length bar shows the true ratio)
      row(R,[0,YP,ZF],pv,mP,cf,a,.5*Math.max(.2,sc),.42);
      R.label([-WD/2-.1,YP,ZF],k>=4?'normalised':'pooled · '+p,{fs:12.5,b:1,al:'right',dx:-6,c:P.acc,grp:'tok',a});
      // the length as one bar
      if(k===3||k===4){const L=k===4?lerp(len,1,e):len,hh=1.3*L/len;R.box([XL,0,ZF],[.36,hh,.36],{fill:P.c5,a});
        R.label([XL,hh,ZF],'length '+(k===4&&e>.98?'1':L.toFixed(L<10?2:0)),{fs:12.5,b:1,mono:true,c:P.c5,dy:-12,a})}}
    // 6. the cosine to the labelled abstract (the abstract went through the same steps)
    if(k===5){const c=m.cos[p],h=1.4*Math.max(0,c);R.box([XL,0,ZF-2.2],[.9,.14,.5],{fill:mix(P.paper,P.c1,.3),a:e});
      R.label([XL,.14,ZF-2.2],'labelled abstract',{fs:12,c:P.c1,dy:-10,a:e,wide:1});
      R.flowArc([XL,.2,ZF-2.2],[XL,h*e,ZF],.4,{c:P.c1,a:e,r:.06,speed:1.2});R.flowArc([WD/2,YP,ZF],[XL,h*e,ZF],.3,{c:P.acc,a:e,r:.06,speed:1.2});
      R.box([XL,0,ZF],[.4,h*e,.4],{fill:P.acc});R.label([XL,h*e,ZF],'cos '+c.toFixed(3),{fs:13,b:1,c:P.acc,dy:-12});
      if(mode!=='own'){const c0=m.cos[m.pool],h0=1.4*c0;R.box([XL+.55,0,ZF],[.3,h0,.3],{fill:P.paper,a:.6*e});R.label([XL+.55,h0,ZF],'trained '+c0.toFixed(3),{fs:12,mono:true,c:P.mute,dy:-12,al:'left',a:e,wide:1})}}
  }
  function readout(){const m=A.models[model],p=pooling(),el=document.getElementById('emb-pa-ctr');if(!el)return;
    el.innerHTML='<b>'+esc(model)+'</b>: '+m.tokens.length+' tokens; pooling <b>'+PN[p]+'</b>'+(mode==='own'?' (as trained)':' (<b>not</b> how it was trained)')+'; length before normalising <b>'+m.lengths[p].toFixed(2)+'</b>; cosine to the labelled abstract <b>'+m.cos[p].toFixed(3)+'</b>'+(mode==='own'?'':' (trained pooling: '+m.cos[m.pool].toFixed(3)+')')+'.'}
  const st=S3.stage({id:'stg-pa',list:'sx-pa',fig:'Fig. 2 · one claim through a real model',cam:[.38,.78],bounds:[[-3.2,-.3,-2.3],[3.4,1.3,3.4]],aspect:.78,dur:1400,hold:4800,draw,
    view:k=>k>=3?{cam:[.3,.7],bounds:[[-3,-.3,1.2],[3.4,1.5,3.5]]}:null,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,150],onStep:()=>{try{readout()}catch(x){}}});
  RD.seg(document.getElementById('emb-pa-model'),v=>{model=v;readout();st.draw()});
  RD.seg(document.getElementById('emb-pa-pool'),v=>{mode=v;readout();st.draw()});
  readout();
})();
