// ---- Scene: Fig. 2, the leak. The trained toy's real cross-attention weights (first layer, mean of 4 heads) on one held-out trace, teacher-forced,
// as a bar field: rows are query positions (the stream g), columns the frozen model's states. Two modes, as released (padding mask only) and fixed
// (causal mask), each with its own step list (#sx-lk-released, #sx-lk-causal); the last step generates, so the later states no longer exist.
// Replaces the 2D animation of 2026-10 (26_js_leak.js); the problem picked and the steps are the same.
(function(){
  if(!window.LM||!document.getElementById('stg-leak'))return;const {at,off,lerp,mix}=S3;
  const V=LM.vocab,EQ=LM.eqPos;
  // the problem: the first held-out sum (both operands at least 2 and different) that the fixed model gets right when generating and the released one does not
  let PB=null;
  function pick(){if(PB)return PB;let f=null;
    for(const i of LM.split.test){const F=LM.facts[i];if(F[0]!=='sum'||F[1]<2||F[2]<2||F[1]===F[2])continue;const t=LM.trace(F),a=LM.answerOf(LM.generate('causal',t.prompt).seq),b=LM.answerOf(LM.generate('released',t.prompt).seq);
      if(a===F[3]&&b!==F[3]){f=i;break}}
    if(f===null)f=LM.split.test[0];
    const F=LM.facts[f],tr=LM.trace(F),full=tr.full,W={},G={},GR={},GS={};
    const mean=R=>{const att=R.xatt[0];return att[0].map((_,i)=>{const w=new Array(R.T).fill(0);att.forEach(h=>h[i].forEach((v,j)=>w[j]+=v/att.length));return w})};
    // generating: the row shown is the first position whose free-running output departs from the reference trace (the answer step "=" if none does)
    ['released','causal'].forEach(m=>{const R=LM.run(m,full);W[m]={w:mean(R),lg:R.logits};const sq=LM.generate(m,tr.prompt).seq;GS[m]=sq;
      let t=sq.findIndex((v,i)=>i<full.length&&v!==full[i]);GR[m]=t<0?EQ:t-1;const Rg=LM.run(m,full.slice(0,GR[m]+1));G[m]={w:mean(Rg),lg:Rg.logits}});
    return PB={f,F,full,W,G,GR,GS,N:full.length}}
  // the query row each step is about (-1: the overview; the last step generates at "=")
  const ROWS=[-1,2,3,5,8,EQ,12,18,EQ],GEN=8,LROWS=[0,2,5,EQ,12,18];
  const tokS=id=>V[id]==='<bos>'?'bos':V[id]==='<eos>'?'eos':V[id];
  let MODE='released';
  function stepData(m,k){const P=pick(),gen=k===GEN,i=gen?P.GR[m]:ROWS[k]<0?EQ:ROWS[k],S=gen?P.G[m]:P.W[m],w=S.w[i],T=w.length;
    const pr=LM.softmax(S.lg[i]),top=LM.argmax(S.lg[i]),truth=P.full[i+1];let fut=0;for(let j=i+1;j<T;j++)fut+=w[j];
    return {i,T,w,pr,top,truth,fut,gen,P}}
  const s=.42;let N=21;const x=j=>(j-(N-1)/2)*s,z=i=>(i-(N-1)/2)*s,zK=()=>z(N-1)+.8,HM=3.4;
  function draw(R,k,e){const P=R.P,D=pick();N=D.N;const m=MODE,Wm=D.W[m].w,gen=k===GEN,GR=D.GR[m],row=gen?GR:ROWS[k],ov=row<0;
    R.grid(-5,5,-5.2,4.8,.5);
    const lateA=gen?1-e:1;                       // later states (columns and rows after "=") dissolve when generating
    // the floor: right of the diagonal is "later"; masked (grey) in the causal mode, tinted orange as released
    for(let i=0;i<N-1;i++){const a=(i>GR?lateA:1)*(m==='causal'?.09:.12);
      R.quad([[x(i)+s/2,0,z(i)-s/2],[x(N-1)+s/2,0,z(i)-s/2],[x(N-1)+s/2,0,z(i)+s/2],[x(i)+s/2,0,z(i)+s/2]],{fill:m==='causal'?P.mute:P.bad,a})}
    R.label([x(N-1)+s/2,0,z(1)],m==='causal'?'masked: later states':'later states: readable',{al:'left',dx:8,mono:true,fs:12,c:m==='causal'?P.mute:P.bad,grp:'side'});
    // the frozen model's states along the back: one white block per token
    for(let j=0;j<N;j++){const a=j>GR?lateA:1;R.box([x(j),0,zK()],[.3,.14,.3],{a,fill:j===row+1&&!ov&&k!==GEN?mix(P.paper,P.bad,.35):P.paper});
      R.label([x(j),0,zK()+.15],tokS(D.full[j]),{mono:true,fs:12,dy:13,a:Math.max(.35,a),c:P.ink,wide:1})}
    R.label([x(0)-s*1.3,0,zK()],'frozen-model states',{al:'right',dx:-8,dy:-14,mono:true,fs:12,c:P.mute,grp:'side'});
    // the bars: one per (query, state) with weight above 1%; the row a step is about at full strength, the rest recede
    for(let i=0;i<N-1;i++){const rowA=ov?(k===0?e:1):i===row?1:.13,ra=i>GR?rowA*lateA:rowA;if(ra<=.01)continue;
      let w=Wm[i];if(gen&&i===GR){const g=D.G[m].w[GR];w=w.map((v,j)=>lerp(v,j<g.length?g[j]:0,e))}
      for(let j=0;j<N;j++){const v=w[j];if(v<.02)continue;const a=j>GR?ra*(i===GR&&gen?1:lateA):ra,fut=j>i;
        R.box([x(j),0,z(i)],[.27,Math.max(.012,v*HM),.27],{fill:fut?mix(P.paper,P.bad,.75):mix(P.paper,P.acc,.6),a,shadow:false,lw:.5})}
      if(ov?LROWS.includes(i):i===row)R.label([x(0)-s/2,0,z(i)],tokS(D.full[i]),{al:'right',dx:-6,mono:true,fs:12,b:i===row,c:i===row?P.ink:P.mute,a:ov?ra:1,wide:1})}
    if(ov)R.label([x(0)-s/2,0,z(0)],'query positions (g)',{al:'right',dx:-8,dy:-16,mono:true,fs:12,c:P.mute,grp:'side'});
    // the row being read: dots stream from each state down its column to the reading position, as many as its weight
    if(!ov){const d=stepData(m,k);d.w.forEach((v,j)=>{if(v<.03)return;const fut=j>d.i;
        R.flowArc([x(j),.16,zK()],[x(j),v*HM+.02,z(d.i)],.6,{c:fut?P.bad:P.acc,a:e*(.5+.5*Math.min(1,v*3)),r:.05+.06*v,n:Math.max(2,Math.round(3+v*14)),speed:1.3})});
      R.label([x(N-1)+s/2,0,z(d.i)],(d.gen?'generates ':'predicts ')+'"'+tokS(d.top)+'"',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:d.top===d.truth?P.good:P.bad,a:e,grp:'side'})}
  }
  function counters(m,k){const d=stepData(m,k),P=d.P;
    return stat('Problem (held out)',P.F[1]+' + '+P.F[2]+' = '+P.F[3],'never in a training trace')+stat('Weight on later states',(100*d.fut).toFixed(0)+'%',d.gen?'there are none when generating':'this query, layer 1, mean of heads')+
      stat('Next token',(d.gen?'generates ':'predicts ')+'"'+tokS(d.top)+'"','the reference has "'+tokS(d.truth)+'"'+(d.top===d.truth?'':' (wrong)'))+
      stat('Probability of the right token',(100*d.pr[d.truth]).toFixed(0)+'%',m==='released'?'as released':'causal mask')}
  const full={cam:[.14,.74],bounds:[[-4.6,0,-4.6],[4.6,2.4,5.4]]};
  const rowView=i=>({cam:[.14,.66],bounds:[[-4.6,0,z(i)-.6],[4.6,2.0,zK()+.3]]});
  const st=S3.stage({id:'stg-leak',list:'sx-lk-released',fig:'Fig. 2 · the trained toy\'s cross-attention, layer 1',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[16,150,14,70],
    view:k=>{const r=k===GEN?pick().GR[MODE]:ROWS[k];if(r<0)return full;if(r===EQ)return {cam:[.18,.6],bounds:[[x(0)-.3,0,z(EQ)-.6],[x(17)+.3,2.2,zK()+.3]]};return rowView(r)},
    onStep:k=>{try{document.getElementById('lkCnt').innerHTML=counters(MODE,k)}catch(err){__jsErr(err.message)}}});
  const seg=document.getElementById('lkM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    MODE=b.dataset.m;['released','causal'].forEach(m=>{const L=document.getElementById('sx-lk-'+m);if(L)L.hidden=m!==MODE});st.list('sx-lk-'+MODE)}));
  window.LEAK={pick,stepData,ROWS,mode:()=>MODE};
})();
