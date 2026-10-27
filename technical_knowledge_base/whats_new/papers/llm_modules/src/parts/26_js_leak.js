// ---- The leak animation: the same held-out trace, teacher-forced, through the released mask and the causal one ----
(function(){
  if(!window.LM||!$('lk'))return;
  const V=LM.vocab,IDX=LM.IDX,EQ=LM.eqPos;
  // the problem: the first held-out sum that the fixed model gets right and the released one does not (when generating)
  let PB=null;
  function pick(){if(PB)return PB;let f=null;
    for(const i of LM.split.test){const F=LM.facts[i];if(F[0]!=='sum'||F[1]<2||F[2]<2||F[1]===F[2])continue;const t=LM.trace(F),a=LM.answerOf(LM.generate('causal',t.prompt).seq),b=LM.answerOf(LM.generate('released',t.prompt).seq);
      if(a===F[3]&&b!==F[3]){f=i;break}}
    if(f===null)f=LM.split.test[0];
    const F=LM.facts[f],t=LM.trace(F),full=t.full,R={},G={};
    ['released','causal'].forEach(m=>{R[m]=LM.run(m,full);G[m]=LM.run(m,full.slice(0,EQ+1))});
    return PB={f,F,full,R,G}}
  const STEPS=[[2,'Position "sum" predicts the first operand','Nothing before it says which number comes next: an honest model can only guess (1 in 20). '],
    [3,'Position "a" predicts the second operand','Again unknowable from the past. '],
    [5,'"T" predicts the copy of a','The trace starts by restating the problem: the answer is 3 positions back, readable without any shortcut. '],
    [8,'"b" predicts "="','Pure format, learned from the traces. '],
    [EQ,'"=" predicts the answer','The one step that needs knowledge. The frozen model\'s own state at "=" already holds the answer; the shortcut is to read the next state instead, which IS the answer token. '],
    [12,'"c" predicts "-"','Format again: the check line. '],
    [18,'"A" predicts the final answer','A copy of the answer written earlier. '],
    [-1,'Now generate: the future does not exist yet','At generation time the model has only the tokens up to "=". The cross-attention can only read the past, the weights renormalise over it, and the model must answer from what it learned. ']];
  const T0=window.TOY&&TOY.runs,gm=v=>T0&&T0[v]?Math.round(100*T0[v].reduce((a,r)=>a+r.test.gen_acc,0)/T0[v].length)+'%':'(not trained)';
  const CAP={released:[
      'The released mask lets this query read every state, later ones included (red).','Again every state is readable, the operand being predicted included.','Here the answer is in the past, so no shortcut is needed.','',
      'A red line to the next position is the shortcut: that state is the answer token itself.','','',
      'This problem was picked as the first held-out sum the fixed model gets right and the released one does not; over all 364 held-out problems the released model generates the right answer '+gm('released')+' of the time (3 seeds).'],
    causal:['The causal mask hides every later state, so this token can only be guessed; the loss on such tokens stays high, which is why the fixed model\'s loss looks worse.','A guess again.','Here the answer is in the past.','',
      'Only the past is readable: the answer has to come from the frozen model\'s state at "=" itself.','','',
      'Nothing changes between training and generation. Over all 364 held-out problems the fixed model generates the right answer '+gm('causal')+' of the time (3 seeds).']};
  const modes={released:STEPS.map((s,i)=>({t:s[1],c:s[2]+CAP.released[i]})),causal:STEPS.map((s,i)=>({t:s[1],c:s[2]+CAP.causal[i]}))};
  const tokS=id=>V[id]==='<bos>'?'bos':V[id]==='<eos>'?'eos':V[id];
  function stepData(m,k){const P=pick(),s=STEPS[k],gen=s[0]<0,i=gen?EQ:s[0],R=gen?P.G[m]:P.R[m],T=R.T;
    const att=R.xatt[0],w=new Array(T).fill(0);att.forEach(h=>h[i].forEach((v,j)=>w[j]+=v/att.length));
    const pr=LM.softmax(R.logits[i]),top=LM.argmax(R.logits[i]),truth=P.full[i+1];
    let fut=0;for(let j=i+1;j<T;j++)fut+=w[j];
    return {i,T,w,pr,top,truth,fut,gen,P}}
  function draw(m,k,e,W){const d=stepData(m,k),P=d.P,N=P.full.length,pad=10,bw=Math.max(14,(W-2*pad)/N),nar=bw<30,y1=34,y2=y1+120,bh=nar?32:24;let s='';
    s+=tx(pad,14,'Frozen model states (keys and values)',{fs:11,c:'var(--mute)'})+tx(pad,y2+bh+18,'Query positions (the stream g that becomes the decoder\'s input)',{fs:11,c:'var(--mute)'});
    const cx=j=>pad+bw*j+bw/2;
    const lbl=(x,y,t,c)=>nar&&t.length>1?'<text x="'+(x+4).toFixed(1)+'" y="'+(y+bh/2).toFixed(1)+'" font-size="11" text-anchor="middle"'+(c?' fill="'+c+'"':'')+' transform="rotate(-90 '+(x+4).toFixed(1)+' '+(y+bh/2).toFixed(1)+')">'+t+'</text>':tx(x,y+bh/2+4,t,{fs:11,a:'middle',c});
    for(let j=0;j<N;j++){const exists=j<d.T,lab=tokS(P.full[j]);const fut=j>d.i;
      s+=rc(pad+bw*j+1,y1,bw-2,bh,exists?(fut?'var(--hl)':'var(--soft)'):'none',{s:exists?'var(--line)':'var(--dim)',da:exists?null:'3 2',r:3});
      if(exists||j===d.i+1)s+=lbl(cx(j),y1,exists?lab:'?',exists?null:'var(--mute)');
      s+=rc(pad+bw*j+1,y2,bw-2,bh,j===d.i?'var(--acc2)':'var(--soft)',{s:j===d.i?'var(--acc)':'var(--line)',sw:j===d.i?2:1,r:3,op:j<d.T?1:.35});
      if(j<d.T)s+=lbl(cx(j),y2,lab,null)}
    for(let j=0;j<d.T;j++){const v=d.w[j];if(v<0.004)continue;const fut=j>d.i;
      s+='<line x1="'+cx(d.i).toFixed(1)+'" y1="'+y2+'" x2="'+cx(j).toFixed(1)+'" y2="'+(y1+bh)+'" stroke="'+(fut?'var(--bad)':'var(--acc)')+'" stroke-width="'+(0.8+9*v).toFixed(2)+'" opacity="'+(e*(0.25+0.75*Math.min(1,v*3))).toFixed(3)+'" stroke-linecap="round"/>'}
    const ok=d.top===d.truth,ty=y2+bh+40,H=ty+30;
    s+=tx(pad,ty,(d.gen?'Generated after "=": ':'Predicts next: ')+'"'+tokS(d.top)+'" with probability '+(100*d.pr[d.top]).toFixed(0)+'%',{fs:12.5,w:600,c:ok?'var(--good)':'var(--bad)'})+
       tx(pad,ty+18,'the reference trace has "'+tokS(d.truth)+'" here'+(ok?'':' (wrong)'),{fs:11.5,c:'var(--mute)'});
    return svgW(W,H,s,'Cross-attention weights of one query position')}
  function counters(m,k){const d=stepData(m,k),P=d.P;
    return stat('Problem (held out)',P.F[1]+' + '+P.F[2]+' = '+P.F[3],'never in a training trace')+stat('Weight on later states',(100*d.fut).toFixed(0)+'%',d.gen?'there are none when generating':'this query, layer 1, mean of heads')+
      stat('Probability of the right token',(100*d.pr[d.truth]).toFixed(0)+'%',m==='released'?'as released':'causal mask')}
  const an=makeAnim({id:'lk',modes,mode:'released',draw,counters,dur:2600});
  PRED_REVEAL['pr-leak']=()=>{const c=$('lk');if(c)c.scrollIntoView({block:'nearest'})};
  onTab('t-read',()=>{if(an)an.draw()});
})();
