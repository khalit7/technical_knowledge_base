// ---- Scene: why a bidirectional model needs the mask (renderer v2). One sentence through two attention layers, three ways:
// the masked LM (the toy BERT on the masked sentence), left to right (the toy LTR model) and both ways with nothing hidden
// (the toy BERT's weights on the unmasked sentence; no such model is trained, it would learn to copy). Line width and dot density
// are the real layer 1 and layer 2 attention weights, heads averaged. ----
(function(){
  if(!$('stg-mlm'))return;const {at,lerp,mix}=S3;
  const W0='the big dog barked at the farmer'.split(' '),n=W0.length,T=2;   // the target: "dog"
  let mode='mlm',D=null;
  function data(){if(D)return D;D={};try{const B=BM.load('bert'),Lt=BM.load('ltr'),mw=W0.slice();mw[T]='[MASK]';
      const rb=BM.run(B,mw),rl=BM.run(Lt,W0),ru=BM.run(B,W0);
      const av=R=>R.att.map(L=>W0.map((_,i)=>W0.map((_,j)=>L.reduce((s,h)=>s+h[i+1][j+1],0)/L.length)));   // word positions only ([CLS] is 0)
      const top=pr=>pr.map((p,i)=>[p,i]).sort((a,b)=>b[0]-a[0]).slice(0,4).map(([p,i])=>[BM.vocab[i],p]);
      D={mlm:{att:av(rb),top:top(BM.fill(B,rb,T+1))},ltr:{att:av(rl),top:top(BM.fill(Lt,rl,T+1))},bi:{att:av(ru),top:null}}}
    catch(e){__jsErr('mlm scene: '+e.message);const u=W0.map(()=>W0.map(()=>1/n));['mlm','ltr','bi'].forEach(m=>D[m]={att:[u,u],top:[['?',0]]})}return D}
  const XS=1.3,X=i=>(i-(n-1)/2)*XS,RW=[[0,2],[.75,0],[1.5,-2]];   // rows: [y, z] for the input words, layer 1 and layer 2
  const allow=(i,j)=>mode==='ltr'?j<=i:true;
  const hot=(lay,i)=>mode==='mlm'?false:lay===0?i===T:mode==='bi'?true:i>=T;
  const outPos=()=>mode==='ltr'?T-1:T;
  const node=(lay,i)=>[X(i),RW[lay][0]+(lay?0:.3),RW[lay][1]];
  function draw(R,k,e){const P=R.P,M=data()[mode],out=outPos(),nar=R.W<620;R.grid(-5,5,-3,3,.5);
    // the input words; under the masked LM the target is replaced by [MASK]
    W0.forEach((w,i)=>{const m=mode==='mlm'&&i===T,h=hot(0,i);R.box([X(i),0,RW[0][1]],[.7,.3,.56],{fill:m?mix(P.paper,P.c2,.25):h?mix(P.paper,P.c2,.6):P.paper});
      if(!(k===3&&i>outPos()+2))R.label([X(i),0,RW[0][1]+.35],m?'[MASK]':w,{ // the close-up's words out of view keep no label (it would be clamped to the corner)
        serif:!m,mono:m,fs:12.5,dy:nar&&i%2?27:13,b:i===T,c:i===T?P.c2:P.ink})});
    // the states of layer 1 and layer 2; a state holding information from "dog" itself is orange
    for(let lay=1;lay<=2;lay++)for(let i=0;i<n;i++){const p=node(lay,i),shown=k>=lay&&(lay===1||i===out),a=shown?(k===lay?Math.max(.2,e):1):.16,h=hot(lay,i)&&shown;
      R.box([p[0],p[1]-.11,p[2]],[.5,.22,.42],{fill:h?mix(P.paper,P.c2,.65):lay===2&&shown?mix(P.paper,P.c1,.35):P.paper,a,shadow:false})}
    [['input words',0],['layer 1',1],['layer 2',2]].forEach(([t,l])=>R.label([X(0)-.55,RW[l][0]+(l?0:.15),RW[l][1]],t,{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'rows'}));
    // layer 1: every state attends to every allowed input; line width is the weight, flows run where information from "dog" travels
    if(k>=1){const a=k===1?e:k>=3?.45:.8;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(!allow(i,j))continue;const w=M.att[0][i][j],hc=hot(0,j);
        const p0=[X(j),.3,RW[0][1]-.28],p1=[X(i),RW[1][0]-.11,RW[1][1]+.21];R.line([p0,p1],{c:hc?P.c2:P.mute,w:.5+5*w,a:a*Math.min(.85,.06+1.3*w)});
        if(k===1&&(hc||mode==='mlm'&&i===T))R.flow([p0,p1],{c:hc?P.c2:P.c1,a:e*Math.min(1,.3+2*w),r:.04+.05*w,n:Math.max(2,Math.round(2+w*10)),speed:1})}}
    // layer 2: only the state the prediction is read from matters; every allowed layer-1 state streams into it by its weight
    if(k>=2){const a=k===2?e:1;for(let j=0;j<n;j++){if(!allow(out,j))continue;const w=M.att[1][out][j],hc=hot(1,j)&&k>=1;
        const p0=[X(j),RW[1][0]+.11,RW[1][1]-.21],p1=[X(out),RW[2][0]-.11,RW[2][1]+.21];R.line([p0,p1],{c:hc?P.c2:P.mute,w:.6+5*w,a:a*Math.min(.9,.1+1.3*w)});
        R.flow([p0,p1],{c:hc?P.c2:P.c1,a:a*Math.min(1,.3+2*w),r:.04+.06*w,n:Math.max(2,Math.round(2+w*12)),speed:1.1})}
      if(mode==='ltr'&&k===2)R.label([X(out),RW[2][0]+.11,RW[2][1]],'reads only "the big"',{mono:true,fs:12,dy:-14,c:P.c1,a:k===2?e:1})}
    // the prediction: the toy model's top four words for the blank, bars on a white plinth over the state that predicts it
    if(k>=3){const p=node(2,out),y0=p[1]+.2;
      if(M.top){const a=e,x0=p[0]-.45;R.box([p[0],y0-.04,p[2]],[1.35,.04,.34],{a,shadow:false});
        M.top.forEach(([w,pr],j)=>{const xb=x0+j*.3,h=Math.max(.015,pr*1.2*e),c=w==='dog'?P.c2:mix(P.paper,P.c1,.45);R.box([xb,y0,p[2]],[.22,h,.2],{fill:c,a,shadow:false});
          if(w==='dog')R.label([xb,y0+h,p[2]],'dog '+Math.round(pr*100)+'%',{mono:true,fs:12.5,dy:-10,b:1,c:P.c2,a})})}   // the other words are named in the step text
      else{const a=e,p0=[X(T),.35,RW[0][1]];R.arc(p0,[X(T),RW[2][0]+.15,RW[2][1]],1.1,{c:P.bad,w:2.6,t:e,top:1,dash:[6,4]});
        R.label([X(T),RW[2][0]+.15,RW[2][1]],'copies "dog": the answer leaks',{mono:true,fs:12.5,dy:-18,b:1,c:P.bad,a})}}
  }
  const full={cam:[.3,.62],bounds:[[-4.6,0,-2.4],[4.6,2.4,2.5]]};
  const st=S3.stage({id:'stg-mlm',list:'sx-mlm',fig:'Fig. 2 · can the answer reach its own prediction?',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1300,hold:4800,draw,
    view:k=>k===3?{cam:[.42,.5],bounds:[[X(outPos())-2.4,0,-2.6],[X(outPos())+2.4,2.8,2.6]]}:full, // the close-up keeps the input words and their labels
    margin:w=>w<520?[14,10,14,10]:[16,14,34,120]}); // room under the input words' labels for the drag hint
  // live numbers in the step lists
  try{const d=data(),pc=v=>(v*100).toFixed(1)+'%',pd=t=>{const x=t.find(y=>y[0]==='dog');return x?x[1]:0};
    $('mlP').textContent=pc(pd(d.mlm.top));$('ltP').textContent=pc(pd(d.ltr.top));$('ltTop').textContent=d.ltr.top.map(([w,p])=>w+' '+pc(p)).join(', ')}catch(e){}
  segBind('sxM',m=>{mode=m;$('sxM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));
    ['mlm','ltr','bi'].forEach(x=>$('sx-'+x).hidden=x!==m);if(st)st.list('sx-'+m)});
})();
