// ---- Scene: the two marginalisations (§2.1, equations 1 and 2) on the page's trained toy models, k = 5 (renderer v2) ----
// RAG-Token: the five retrieved documents in depth with their prior p(z|x) (blue bars), the generator read once per document, and at every token
// each document's proposal, the document posterior for the chosen token (orange bars) and the stream into the mixture, as dense as that posterior.
// RAG-Sequence: one greedy answer per document, then Thorough Decoding as a bar field on a glass plate (hypotheses by documents, height p(y|x,z)),
// then the marginal per hypothesis. Decoding as §2.5: greedy on the mixture for RAG-Token, greedy per document plus Thorough Decoding for RAG-Sequence.
// The step lists are generated from the same computation (one item per step); window.__mx() returns the answers for check_page.mjs.
(function(){
  if(!document.getElementById('stg-mx'))return;const {at,off,lerp,mix,cl}=S3;
  const sel=$('mxQ');
  const choices=[['novels',DEMO_A,'two documents'],['novels',[...WD.testA].sort((a,b)=>a-b)[1],'two documents'],['president',[...WD.testC].sort((a,b)=>a-b)[0],'one document'],['born',WD.questions.find(q=>q.task==='born'&&q.split==='test').pi,'one document']];
  choices.forEach((c,i)=>{const q=demoQ(c[0],c[1]);const o=document.createElement('option');o.value=i;o.textContent=WD.show(q.x)+' ('+c[2]+')';sel.appendChild(o)});
  let Q,RT,RS,mode='tok',best,extra,ok;
  const trunc=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t,tq=t=>t==='</s>'?'end of answer':'"'+t+'"';
  const HC=['c1','c3','c5','c6','c4'];
  function compute(){const c=choices[+sel.value];Q=demoQ(c[0],c[1]);RT=RAG.answer(RAG.load('tok'),IDX18,Q.x,5);RS=RAG.answer(RAG.load('seq'),IDX18,Q.x,5);
    ok=y=>y.join(' ')===Q.y.join(' ');best=RS.hyps.reduce((a,b)=>b.lp>a.lp?b:a);
    extra=RS.hyps.reduce((a,h)=>a+RS.perDoc.filter(p=>p.join(' ')!==h.y.join(' ')).length,0);
    const pz=RT.ret.lpz.map(Math.exp),top=pz.indexOf(Math.max(...pz));
    const L=[];
    L.push('<li><b>Retrieve.</b> The question is encoded once, scored against all '+IDX18.length.toLocaleString('en-GB')+' documents by inner product, and the top 5 kept; their scores, renormalised, are the prior <i>p</i>(<i>z</i>|<i>x</i>) (blue bars; document '+(top+1)+' has '+pz[top].toFixed(2)+'). The same 5 documents serve every token.</li>');
    let ties=0;RT.steps.forEach((st,i)=>{const j=st.post.indexOf(Math.max(...st.post)),tie=st.p<.7&&i>0?++ties:0;
      // the mechanism once, at token 1; later tokens give only their own numbers
      if(i===0)L.push('<li><b>Token 1: '+tq(st.tok)+'.</b> Each document\'s generator pass proposes a next token (the word on its row; the bar is the probability it gives '+tq(st.tok)+'). The mixture Σ<sub><i>z</i></sub> <i>p</i>(<i>z</i>|<i>x</i>) <i>p</i><sub>θ</sub>(<i>y<sub>i</sub></i>|<i>x</i>, <i>z</i>, <i>y</i><sub>&lt;<i>i</i></sub>) picks it with probability '+st.p.toFixed(2)+'. The orange bars are the document posterior for this token: document '+(j+1)+' carries '+pct(st.post[j])+' of it.'+(Q.task==='novels'?' In the paper\'s Figure 2 this bar moves to one document per fact; watch whether it does here.':'')+'</li>');
      else L.push('<li><b>Token '+(i+1)+': '+tq(st.tok)+'.</b> Picked at '+st.p.toFixed(2)+'; document '+(j+1)+' carries '+pct(st.post[j])+' of the posterior.'+(tie===1?' A near tie: two documents each propose their own token with full confidence.':tie?' A near tie again.':'')+'</li>')});
    L.push('<li><b>Answer.</b> RAG-Token wrote <b>'+WD.show(RT.y)+'</b>'+(ok(RT.y)?(Q.task==='novels'?', which is right: it took each part from the document that holds it.':', which is right: nearly all the prior sits on the one document that holds the answer, and the generator copied it.'):', against the truth '+WD.show(Q.y)+'.'+(Q.task==='novels'?' Each book document proposed its own title with full confidence, so at every title token the mixture was a near tie between the two proposals (about 0.5 each), greedy decoding took syllables from both titles, and the posterior followed whichever proposal won: the per-document generators are not calibrated about what their document does not say.':''))+' The plate is this run\'s own Figure 2: the document posterior at every token (rows documents, columns tokens). '+(5*RT.steps.length)+' generator passes: 5 documents × '+RT.steps.length+' tokens.</li>');
    $('sx-mx-tok').innerHTML=L.join('');
    const hl=RS.hyps.map((h,c)=>'h'+(c+1)+' = '+(WD.show(h.y)||'(empty)')).join('; ');
    $('sx-mx-seq').innerHTML=[
      '<li><b>Retrieve.</b> The same retrieval, but under RAG-Sequence one document must explain the whole answer. (This is a separately trained RAG-Sequence model, so its retrieval weights differ slightly.)</li>',
      '<li><b>One answer per document.</b> Greedy decoding runs once per document, each document on its own; '+RS.hyps.length+' distinct hypotheses come out: '+hl+'.</li>',
      '<li><b>Thorough Decoding.</b> Every hypothesis is scored under every document: '+extra+' extra forward passes for the (hypothesis, document) pairs whose own decoding did not produce it (the pale bars). Each bar is <i>p</i><sub>θ</sub>(<i>y</i>|<i>x</i>, <i>z</i>), the probability of the whole answer given one document. "Fast Decoding" would set the pale bars to zero instead.</li>',
      '<li><b>Marginalise.</b> Each hypothesis\'s <i>p</i>(<i>y</i>|<i>x</i>) = Σ<sub><i>z</i></sub> <i>p</i>(<i>z</i>|<i>x</i>) <i>p</i><sub>θ</sub>(<i>y</i>|<i>x</i>, <i>z</i>), the front row. The winner is <b>'+WD.show(best.y)+'</b>'+(ok(best.y)?', which is right.':', against the truth '+WD.show(Q.y)+(Q.task==='novels'?': no single document holds both titles, so every hypothesis has one title and a guess.':'.'))+'</li>'].join('')}
  compute();
  // layout: documents in depth (rows), their prior, the generator plate, then per-token proposals and posteriors (Token) or the hypothesis plate (Sequence)
  const zr=j=>(j-2)*1.05,XD=-4.4,XP=-3.1,XG=-2.0,XO=-.6,XPo=1.15,XM=2.7,HX=c=>.35+c*.95,ZF=zr(4)+1.35;
  function draw(R,k,e){const P=R.P,isT=mode==='tok',A=isT?RT:RS,pz=A.ret.lpz.map(Math.exp),docs=A.ret.idx.map(i=>IDX18[i]);
    const n=isT?RT.steps.length:0,last=isT?n+1:3,mid=(isT&&k>=1&&k<=n)||(!isT&&k>=2);R.grid(-6,isT?4.2:HX(RS.hyps.length)+1,-3,isT?3:ZF+.9,.5);
    const ret=k===0?e:1,dimD=k===0||k===last||(!isT&&k===1)?1:.45;
    // the question streams to the five documents it retrieved; each keeps its prior p(z|x) as a blue bar
    if(!mid&&!(!isT&&k>=2))R.label([XD-.6,1.3,zr(0)-.7],'x: '+WD.show(Q.x),{mono:true,fs:12.5,b:1,al:'left',c:P.ink,dy:-6});
    docs.forEach((d,j)=>{const z=zr(j);
      R.box([XD,0,z],[1.5,.1,.62],{fill:P.paper,a:ret*dimD});
      if(!mid)R.label([XD-.78,.1,z],(j+1)+'. '+trunc(WD.show(d.toks),30),{mono:true,fs:12,al:'right',dx:-6,c:P.ink,a:Math.max(.35,ret)*dimD,grp:'docs'});
      else R.label([XD,.1,z],'doc '+(j+1),{mono:true,fs:12,c:P.mute});
      if(k===0)R.flowArc([XD-.6,1.2,zr(0)-.7],[XD,.12,z],.3,{c:P.q,a:e,r:.05,n:5,speed:1.2});
      const h=.05+1.2*pz[j];R.box([XP,0,z],[.24,.04,.3],{a:ret*dimD,shadow:false});R.box([XP,.04,z],[.15,h*ret,.15],{fill:P.c1,a:ret*Math.max(.6,dimD),shadow:false});
      if(!mid)R.label([XP,.04+h*ret,z],pz[j].toFixed(2),{mono:true,fs:12,dy:-9,c:P.c1,a:ret})});
    if(!mid)R.label([XP,0,zr(4)+.3],'p(z|x)',{mono:true,fs:12,b:1,c:P.c1,dy:16,a:ret});
    // the generator, read once per document
    const gz0=zr(0)-.45,gz1=zr(4)+.45,ga=k===0?.25:mid?.7:1;R.glass([XG,.08,gz0],[0,0,gz1-gz0],[0,1.0,0],{c:P.v,a:ga,nu:10,nv:4});
    R.label([XG,0,gz1],'generator pθ',{mono:true,fs:12,dy:16,c:P.v,a:ga});
    if(isT){
      if(mid){const st=RT.steps[k-1],pE=e;
        st.post.forEach((pp,j)=>{const z=zr(j),pd=st.perDoc[j],tp=st.perDocTop[j],same=tp[0]===st.tok;
          R.flow([[XD+.75,.1,z],[XG,.45,z],[XO,.3,z]],{c:P.v,a:.5,r:.045,n:4,speed:1.2});
          // what this document's pass proposes, and the probability it gives the token the mixture chose
          const ph=.03+.9*pd;R.box([XO,0,z],[.24,.04,.3],{a:1,shadow:false});R.box([XO,.04,z],[.15,ph*pE,.15],{fill:mix(P.paper,P.v,.6),a:1,shadow:false});
          R.label([XO+.15,.04+ph*pE,z],'"'+(tp[0]==='</s>'?'end':tp[0])+'" '+tp[1].toFixed(2),{mono:true,fs:12,al:'left',dx:4,dy:-4,c:same?P.ink:P.mute,b:same,grp:'prop'});
          // the document posterior for the chosen token, and its stream into the mixture
          const qh=.03+1.2*pp;R.box([XPo,0,z],[.24,.04,.3],{a:1,shadow:false});R.box([XPo,.04,z],[.15,qh*pE,.15],{fill:P.c2,a:1,shadow:false});
          R.label([XPo+.15,.04+qh*pE,z],pct(pp),{mono:true,fs:12,al:'left',dx:4,dy:-4,c:P.c2,a:pE,b:pp>.4,grp:'post'});
          if(pp>.01)R.flowArc([XPo,.1+qh*pE,z],[XM,.6,0],.3,{c:P.c2,a:.3+.7*pp,r:.035+.06*pp,n:Math.max(2,Math.round(2+pp*12)),speed:1.2})});
        R.label([XO,0,gz1],'proposes',{mono:true,fs:12,c:P.v,dy:16});R.label([XPo,0,gz1],'posterior',{mono:true,fs:12,b:1,c:P.c2,dy:16});
        R.ball([XM,.6,0],.17,{c:P.acc});R.label([XM,.6,0],'picks '+tq(st.tok)+' · '+st.p.toFixed(2),{mono:true,fs:12.5,b:1,dy:26,c:P.acc,a:pE})}
      const wrote=RT.steps.slice(0,Math.min(k,n)).map(s=>s.tok).filter(t=>t!=='</s>');
      if(k>=1){const fin=k===last,yp=fin?[1.4,1.3,zr(0)-.5]:[XM,.6,0];R.label(yp,'y: '+(WD.show(wrote)||'…')+(fin?(ok(RT.y)?'  ✓':'  ✗'):''),{mono:true,fs:13,b:1,dy:-30,c:fin?(ok(RT.y)?P.good:P.bad):P.ink});
        if(fin&&!ok(RT.y))R.label(yp,'truth: '+WD.show(Q.y),{mono:true,fs:12.5,dy:-12,c:P.mute})}
      // the answer: every token's document posterior at once, a bar field on a glass plate (rows documents, columns tokens), the toy's own Figure 2
      if(k===last){const x0=-1.0,x1=3.8,cw=(x1-x0)/n;R.glass([x0,.02,gz0],[x1-x0,0,0],[0,0,gz1-gz0],{c:P.c2,a:e*.7,nu:n,nv:5,th:.03});
        RT.steps.forEach((stp,i)=>{const cx=x0+cw*(i+.5);R.label([cx,0,gz0],stp.tok==='</s>'?'end':stp.tok,{mono:true,fs:12,dy:-12,c:P.ink,a:e,b:1});
          stp.post.forEach((pp,j)=>R.box([cx,.02,zr(j)],[cw*.62,Math.max(.012,1.1*pp*e),.5],{fill:mix(P.paper,P.c2,.25+.75*pp),a:1,shadow:false}))});
        R.label([x1,0,gz1],'document posterior, every token',{mono:true,fs:12,al:'right',dy:18,c:P.c2,a:e})}
    }else{
      const H=RS.hyps,nh=H.length,col=c=>P[HC[c%HC.length]],own=(j,c)=>RS.perDoc[j].join(' ')===H[c].y.join(' ');
      // 2. one greedy answer per document: a stream from each document through the generator to the hypothesis it produced
      if(k===1)docs.forEach((d,j)=>{const hc=H.findIndex((_,c2)=>own(j,c2));
        R.flow([[XD+.75,.1,zr(j)],[XG,.45,zr(j)],[XO+.2,.3,zr(j)]],{c:hc>=0?col(hc):P.mute,a:e,r:.06,n:5,speed:1.1});
        R.label([XO+.3,.3,zr(j)],hc>=0?'→ h'+(hc+1):'→ (empty)',{mono:true,fs:12.5,b:1,al:'left',c:hc>=0?col(hc):P.mute,a:e})});
      // 3. Thorough Decoding: every hypothesis scored under every document, a bar field on a glass plate; pale bars are the extra passes
      if(k>=2){const pa=k===2?e:1,x0=HX(0)-.45,x1=HX(nh-1)+.45;R.glass([x0,.02,gz0],[x1-x0,0,0],[0,0,gz1-gz0],{c:P.v,a:pa*.8,nu:nh,nv:5,th:.03});
        H.forEach((h,c)=>{R.label([HX(c),0,gz0],'h'+(c+1),{mono:true,fs:12.5,b:1,dy:-12,c:col(c),a:pa});
          docs.forEach((_,j)=>{const p=Math.exp(h.per[j]),o=own(j,c),bh=Math.max(.012,1.1*p*(k===2?e:1)),fa=k===3?.35:1;
            R.box([HX(c),.02,zr(j)],[.42,bh,.42],{fill:o?mix(P.paper,col(c),.75):mix(P.paper,P.mute,.18),a:fa*(o?1:.8),shadow:false,fa:o?1:.6});
            if(k===2&&!o)R.flow([[XG,.45,zr(j)],[HX(c),bh+.15,zr(j)]],{c:P.v,a:.35*e,r:.035,n:3,speed:1.1})})})}
      // 4. marginalise: down each column, weighted by p(z|x), into one bar per hypothesis at the front; the winner lifts
      if(k===3){H.forEach((h,c)=>{const p=Math.exp(h.lp),win=h===best,bh=.03+1.4*p*e;
          docs.forEach((_,j)=>{const w=pz[j]*Math.exp(h.per[j]);if(w>.01)R.flow([[HX(c),.3,zr(j)],[HX(c),.3,ZF]],{c:col(c),a:.3+.7*Math.min(1,w*2),r:.035+.05*Math.min(1,w*2),n:3+Math.round(w*8),speed:1.1})});
          R.box([HX(c),0,ZF],[.5,.04,.5],{a:1,shadow:false});R.box([HX(c),.04,ZF],[.36,bh,.36],{fill:win?P.acc:mix(P.paper,col(c),.6),a:1});
          if(win)R.glow([HX(c),bh+.15,ZF],.4,{c:P.acc,a:.6*e});
          R.label([HX(c),.04+bh,ZF],(p<.005?'<.01':p.toFixed(2)),{mono:true,fs:12,dy:-9,b:win,c:win?P.acc:P.ink,a:e})});
        R.label([HX(0)-.5,.1,ZF],'p(y|x)',{mono:true,fs:12,b:1,al:'right',dx:-6,c:P.acc,a:e});
        R.label([(HX(0)+HX(nh-1))/2,0,ZF+.6],'y: '+WD.show(best.y)+(ok(best.y)?'  ✓':'  ✗'),{mono:true,fs:13,b:1,dy:30,c:ok(best.y)?P.good:P.bad,a:e})}
    }
  }
  const nx=()=>HX(RS.hyps.length-1);
  const bounds=()=>mode==='tok'?[[-5.6,0,-2.8],[3.4,1.6,2.8]]:[[-5.6,0,-2.8],[nx()+.6,1.5,ZF+.5]];
  const st=S3.stage({id:'stg-mx',list:'sx-mx-tok',fig:'Fig. 2 · RAG-Token or RAG-Sequence · toy model, k = 5',cam:[.28,.62],bounds:()=>bounds(),aspect:.72,dur:1300,hold:4800,draw,
    margin:w=>w<520?[14,8,16,8]:[18,14,18,180],
    // token steps move in on the generator, the proposals, the posteriors and the mixture; Sequence moves to its outputs, then looks down on the bar field
    view:k=>{const near={cam:[.28,.6],bounds:[[-5.6,0,-2.8],[-1.2,1.4,2.8]]};if(mode==='tok')return k===0?near:k<=RT.steps.length?(innerWidth<520?{cam:[.2,.95],bounds:[[-2.3,0,-2.6],[3.1,1.3,2.6]]}:{cam:[.3,.6],bounds:[[-2.5,0,-2.8],[3.4,1.5,2.8]]}):{cam:[.32,.75],bounds:[[-3.0,0,-2.9],[4.0,1.4,2.8]]};
      return k===0?near:k===1?{cam:[.28,.62],bounds:[[-5.6,0,-2.8],[1.0,1.4,2.8]]}:k>=2?{cam:[.4,.85],bounds:[[-2.4,0,-2.8],[nx()+.7,1.4,ZF+.6]]}:null}});
  function show(){$('sx-mx-tok').hidden=mode!=='tok';$('sx-mx-seq').hidden=mode!=='seq';if(st)st.list('sx-mx-'+mode)}
  segBind('mxM',m=>{$('mxM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));mode=m;show()});
  sel.addEventListener('change',()=>{compute();show()});
  $('sx-mx-seq').hidden=true;
  window.__mx=()=>({tok:RT.y,seq:RS.y,truth:Q.y,steps:{tok:RT.steps.length+2,seq:4},lists:{tok:$('sx-mx-tok').children.length,seq:$('sx-mx-seq').children.length}});
})();
