// ---- Reading: one sequence through an LSTM gate by gate, against a GRU and a plain RNN (trained weights) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('mm'))return;
  const C=CELL,H=C.H,S=C.sym,F=(v,d)=>(Math.abs(v)<5e-4&&d<=3?0:v).toFixed(d);
  const SUB={lstm:['f','i','cand','c','o'],gru:['r','u','cand','h'],rnn:['h']};
  const NAME={lstm:'LSTM',gru:'GRU',rnn:'plain RNN',rnn_short:'plain RNN trained on short sequences'};
  const KIND=m=>m==='rnn_short'?'rnn':m;
  const ROWS={lstm:[['f','forget gate f',0],['i','input gate i',0],['cand','candidate C̃',1],['c','cell state C',2],['o','output gate o',0],['h','hidden state h',1]],
    gru:[['r','reset gate r',0],['u','update gate z',0],['cand','candidate h̃',1],['h','hidden state h',1]],
    rnn:[['h','hidden state h',1]]};
  const st={mode:'lstm',key:0,T:40,seed:7};
  let R,steps,mem,anim;
  function memUnit(m){
    // the unit through which the answer is read: its hidden state at "?" differs most across the four keys (same distractors)
    const fin=[0,1,2,3].map(k=>{const r=C.run(m,C.sequence(k,st.T,st.seed));return r.tr[st.T-1].h});
    let best=0,bv=-1;for(let u=0;u<H;u++){const v=fin.map(x=>x[u]),mu=v.reduce((a,b)=>a+b,0)/4,va=v.reduce((a,b)=>a+(b-mu)**2,0);if(va>bv){bv=va;best=u}}return best}
  function build(){
    const m=C.models[st.mode],seq=C.sequence(st.key,st.T,st.seed);R=C.run(m,seq);R.seq=seq;mem=memUnit(m);
    const sub=SUB[KIND(st.mode)];steps=[];
    const full=t=>sub.forEach(s=>steps.push([t,s]));
    full(0);full(1);for(let t=2;t<st.T-1;t++)steps.push([t,'all']);full(st.T-1);steps.push([st.T-1,'end']);
    // direct-path factor since the key: product of forget gates (LSTM) or keep shares 1 - z (GRU) on the memory unit;
    // for the plain RNN the Frobenius norm of the Jacobian product d h_t / d h_0
    R.path=[1];const W=m.Whh;let J=null;
    for(let t=1;t<st.T;t++){const o=R.tr[t];
      if(KIND(st.mode)==='lstm')R.path.push(R.path[t-1]*o.f[mem]);
      else if(KIND(st.mode)==='gru')R.path.push(R.path[t-1]*(1-o.u[mem]));
      else{const d=o.h.map(v=>1-v*v),Jt=[];for(let a=0;a<H;a++){Jt.push([]);for(let b=0;b<H;b++)Jt[a].push(d[a]*W[a*H+b])}
        if(!J)J=Jt;else{const N=[];for(let a=0;a<H;a++){N.push([]);for(let b=0;b<H;b++){let s=0;for(let k=0;k<H;k++)s+=Jt[a][k]*J[k][b];N[a].push(s)}}J=N}
        let s=0;J.forEach(r=>r.forEach(v=>s+=v*v));R.path.push(Math.sqrt(s))}}
  }
  const cs=v=>{const x=Math.max(-1,Math.min(1,v));return x>=0?'color-mix(in srgb,var(--c1) '+Math.round(x*85)+'%,var(--bg))':'color-mix(in srgb,var(--c2) '+Math.round(-x*85)+'%,var(--bg))'};
  const cg=v=>'color-mix(in srgb,var(--c3) '+Math.round(Math.max(0,Math.min(1,v))*85)+'%,var(--bg))';
  function caption(t,s){
    const o=R.tr[t],u=mem,sym=S[R.seq[t]],k=S[st.key],p=R.p[t][st.key],md=KIND(st.mode),short=st.mode==='rnn_short';
    const at=t===0?'the key "'+k+'"':(t===st.T-1?'the question mark':'distractor "'+sym+'"');
    const U='unit '+(u+1);
    if(s==='end'){const ok=R.p[t].indexOf(Math.max(...R.p[t]))===st.key;
      return ['Answer: '+(ok?'right':'wrong'),'At "?" the '+NAME[md]+' answers "'+S[R.p[t].indexOf(Math.max(...R.p[t]))]+'" with probability '+F(Math.max(...R.p[t]),3)+'; the key was "'+k+'", '+(st.T-1)+' steps back. '+(md==='rnn'?(short?'This plain RNN was trained only on sequences of 5 to 10 symbols, where the gradient still reaches the key, and it learned to latch the key in its state: '+(ok?'it holds':'it does not hold')+' here, '+(st.T-1)+' steps back. Representing a long memory was never the problem; learning it from long sequences was.':'The plain RNN has to carry the key through a full rewrite of its state at every step, h = tanh(W h + U x); trained on sequences of 5 to 50 it never learned to (see the results below).'):'The key travelled on '+U+', which the gates protected: the product of its '+(md==='lstm'?'forget gates':'keep shares 1 &minus; z')+' over the whole sequence is '+F(R.path[st.T-1],3)+'.'+(R.path[st.T-1]<.5&&ok?' The memory still holds because the key is kept in the sign and size of the state, and a saturated tanh reads a decayed value the same way; a trained gate rarely stays at exactly 1.':''))]}
    if(s==='all')return ['Step '+(t+1)+': '+at,(md==='lstm'?'All gates at once. On '+U+': f = '+F(o.f[u],3)+', i = '+F(o.i[u],3)+', so the cell keeps '+F(100*o.f[u],1)+'% of what it held and writes '+F(o.i[u]*o.cand[u],3)+'. ':md==='gru'?'On '+U+': z = '+F(o.u[u],3)+', so the state keeps '+F(100*(1-o.u[u]),1)+'% of itself. ':'The whole state is recomputed from the old one and the input. ')+'If "?" came now, the answer would be "'+k+'" with probability '+F(p,3)+'.'];
    const T={
      f:()=>['Forget gate',t===0?'f = σ(W<sub>f</sub>[h, x] + b<sub>f</sub>) decides how much of the old cell state to keep. At the first step the cell is still empty, so f changes nothing yet; on '+U+' it is '+F(o.f[u],3)+'.':'On '+U+', which holds the key, f = '+F(o.f[u],3)+': the distractor does not make the cell forget. The cell value is multiplied by f, and that same f is the only factor the gradient meets on this path.'],
      i:()=>['Input gate',t===0?'i = σ(W<sub>i</sub>[h, x] + b<sub>i</sub>) chooses which units to write. Seeing the key, i on '+U+' is '+F(o.i[u],3)+': open.':(t===st.T-1?'At "?", i on '+U+' is '+F(o.i[u],3)+'.':'Seeing a distractor, i on '+U+' is '+F(o.i[u],3)+(o.i[u]<.2?': nearly shut, so the noise is not written.':'.'))],
      cand:()=>[md==='lstm'?'Candidate':'Candidate state',md==='lstm'?'C̃ = tanh(W<sub>C</sub>[h, x] + b<sub>C</sub>) is what would be written; on '+U+' it is '+F(o.cand[u],3)+'.':'h̃ = tanh(W x + r ⊙ (U h) + b): the reset gate decides how much of the old state the proposal may look at. On '+U+' h̃ = '+F(o.cand[u],3)+'.'],
      c:()=>['Cell update','C = f ⊙ C<sub>old</sub> + i ⊙ C̃: an addition, not a rewrite. On '+U+': '+F(o.f[u],3)+' × '+F(t?R.tr[t-1].c[u]:0,3)+' + '+F(o.i[u],3)+' × '+F(o.cand[u],3)+' = '+F(o.c[u],3)+'.'],
      o:()=>['Output gate','o = σ(W<sub>o</sub>[h, x] + b<sub>o</sub>) decides what to expose: h = o ⊙ tanh(C). '+(t===st.T-1?'At "?", o on '+U+' is '+F(o.o[u],3)+(o.o[u]>.5?', so the stored value is read out into h and on to the answer.':'.')+' The key is spread over several units; the readout combines all eight.':'On '+U+', o = '+F(o.o[u],3)+(o.o[u]<.2?': the unit keeps its memory to itself until it is needed.':'.'))],
      r:()=>['Reset gate','r = σ(W<sub>r</sub>x + U<sub>r</sub>h + b<sub>r</sub>) decides how much of the old state the candidate may see; on '+U+' r = '+F(o.r[u],3)+'.'],
      u:()=>['Update gate','z = σ(W<sub>z</sub>x + U<sub>z</sub>h + b<sub>z</sub>) is the share of the candidate written in; 1 &minus; z of the old state is kept. On '+U+' z = '+F(o.u[u],3)+(t===0?': open, the key goes in.':o.u[u]<.1?': shut, the key stays.':'.')],
      h:()=>['','']};
    if(s==='h'){
      if(md==='gru')return ['New state','h = (1 &minus; z) ⊙ h<sub>old</sub> + z ⊙ h̃: the same additive trick as the LSTM, with one state instead of two. On '+U+': '+F(1-o.u[u],3)+' × '+F(t?R.tr[t-1].h[u]:0,3)+' + '+F(o.u[u],3)+' × '+F(o.cand[u],3)+' = '+F(o.h[u],3)+'.'];
      return ['Step '+(t+1)+': '+at,'h = tanh(W<sub>hh</sub>h + W<sub>xh</sub>x + b): no gate, so every step rewrites the whole state, and the key survives only if the learned weights happen to keep it. If "?" came now, the answer would be "'+k+'" with probability '+F(p,3)+'.']}
    const x=T[s]();return [x[0]+', step '+(t+1)+' ('+at+')',x[1]];
  }
  function draw(i){
    const [t,s]=steps[i],box=$('mm-svg'),W=RD.width(box),T=st.T,md=KIND(st.mode),rows=ROWS[md];
    const ml=Math.min(118,Math.max(86,W*.2)),mr=8,top=4,cw=(W-ml-mr)/T,rh=Math.max(7,Math.min(12,150/H));
    const hm=md==='lstm'?'c':'h';let y=top,svg='';
    // token strip
    svg+='<text x="0" y="'+(y+11)+'" font-size="11" fill="var(--mute)">input</text>';
    for(let k=0;k<T;k++){const x=ml+k*cw,cur=k===t,sym=S[R.seq[k]];
      svg+='<rect x="'+(x+.5)+'" y="'+y+'" width="'+Math.max(1,cw-1)+'" height="16" rx="2" fill="'+(k===0?'var(--c5)':k===T-1?'var(--c4)':'var(--soft)')+'" opacity="'+(k<=t?1:.35)+'" stroke="'+(cur?'var(--ink)':'none')+'"/>';
      if(cw>=9)svg+='<text x="'+(x+cw/2)+'" y="'+(y+12)+'" font-size="'+Math.min(11,cw-1)+'" text-anchor="middle" fill="'+(k===0||k===T-1?'var(--bg)':'var(--mute)')+'">'+sym+'</text>'}
    y+=22;
    // state heatmap over time
    svg+='<text x="0" y="'+(y+rh*H/2+4)+'" font-size="11" fill="var(--mute)">'+(md==='lstm'?'cell state C':'state h')+'</text>';
    for(let k=0;k<=t;k++){const v=R.tr[k][hm];for(let u=0;u<H;u++)svg+='<rect x="'+(ml+k*cw)+'" y="'+(y+u*rh)+'" width="'+(cw+.3)+'" height="'+(rh+.3)+'" fill="'+cs(md==='lstm'?v[u]/2:v[u])+'"/>'}
    svg+='<rect x="'+ml+'" y="'+(y+mem*rh)+'" width="'+(W-ml-mr)+'" height="'+rh+'" fill="none" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 2"/>';
    svg+='<text x="'+(ml-4)+'" y="'+(y+mem*rh+rh-1)+'" font-size="9.5" text-anchor="end" fill="var(--ink)">unit '+(mem+1)+'</text>';
    svg+='<line x1="'+(ml+(t+.5)*cw)+'" x2="'+(ml+(t+.5)*cw)+'" y1="'+(top)+'" y2="'+(y+H*rh+2)+'" stroke="var(--ink)" stroke-width="1" opacity=".5"/>';
    y+=H*rh+12;
    // gates at step t
    const o=R.tr[t],act=s==='all'||s==='end'?null:s,sq=Math.min(40,(W-ml-mr)/H);
    rows.forEach(([key,label,kind])=>{const v=o[key];const on=act===key||(act==='c'&&key==='h'&&false);
      svg+='<text x="0" y="'+(y+sq/2+4)+'" font-size="11" fill="'+(on?'var(--ink)':'var(--mute)')+'" font-weight="'+(on?600:400)+'">'+label+'</text>';
      for(let u=0;u<H;u++){const x=ml+u*sq,val=v[u],fill=kind===0?cg(val):cs(kind===2?val/2:val);
        svg+='<rect x="'+(x+1)+'" y="'+y+'" width="'+(sq-2)+'" height="'+(sq*0.62)+'" rx="3" fill="'+fill+'" stroke="'+(on?'var(--ink)':u===mem?'var(--mute)':'var(--line)')+'" stroke-width="'+(on?1.5:1)+'"/>';
        if(sq>=24)svg+='<text x="'+(x+sq/2)+'" y="'+(y+sq*.62/2+3.5)+'" font-size="'+(sq>=34?10:8.5)+'" text-anchor="middle">'+F(val,2)+'</text>'}
      y+=sq*.62+5});
    svg+='<text x="'+ml+'" y="'+(y+9)+'" font-size="10" fill="var(--mute)">'+(W<560?'units 1 to '+H+', step '+(t+1):'units 1 to '+H+' at step '+(t+1)+'; dashed: unit '+(mem+1)+', which carries the key')+'</text>';y+=18;
    // answer-if-asked-now line
    const ph=56;svg+='<text x="0" y="'+(y+ph/2)+'" font-size="11" fill="var(--mute)">P(key) if</text><text x="0" y="'+(y+ph/2+13)+'" font-size="11" fill="var(--mute)">asked now</text>';
    svg+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(y+ph)+'" y2="'+(y+ph)+'" stroke="var(--line)"/><line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(y+ph*.75)+'" y2="'+(y+ph*.75)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    svg+='<text x="'+(W-mr)+'" y="'+(y+ph*.75-2)+'" font-size="9" text-anchor="end" fill="var(--mute)">chance 0.25</text><text x="'+(ml-3)+'" y="'+(y+6)+'" font-size="9" text-anchor="end" fill="var(--mute)">1</text>';
    let d='';for(let k=0;k<=t;k++)d+=(k?'L':'M')+(ml+(k+.5)*cw).toFixed(1)+' '+(y+ph*(1-R.p[k][st.key])).toFixed(1);
    svg+='<path d="'+d+'" fill="none" stroke="'+({lstm:'var(--c3)',gru:'var(--c4)',rnn:'var(--c2)',rnn_short:'var(--c5)'}[st.mode])+'" stroke-width="2"/>';
    y+=ph+6;
    box.innerHTML='<svg viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="Recurrent cell state and gates over the sequence">'+svg+'</svg>';
    const cap=caption(t,s);$('mm-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    const pf=R.path[t];
    $('mm-cnt').innerHTML=RD.stat('Step',(t+1)+' of '+T,'symbol "'+S[R.seq[t]]+'"')+RD.stat('P(key) if asked now',F(R.p[t][st.key],3),'the key is "'+S[st.key]+'"')+
      RD.stat(md==='rnn'?'Jacobian product, ‖∂h<sub>t</sub>/∂h<sub>1</sub>‖':md==='lstm'?'Forget gates multiplied, unit '+(mem+1):'Keep shares multiplied, unit '+(mem+1),pf<1e-3?pf.toExponential(1):F(pf,3),md==='rnn'?'the factor the gradient meets back to the key':'the gradient factor along the protected path');
  }
  function reset(){build();if(anim)anim.reset(steps.length)}
  // controls
  $('mm-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;[...$('mm-mode').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});reset();anim.play()});
  $('mm-key').addEventListener('change',e=>{st.key=+e.target.value;reset()});
  $('mm-T').addEventListener('input',e=>{st.T=+e.target.value;$('mm-Tv').textContent=st.T;reset()});
  $('mm-new').addEventListener('click',()=>{st.seed=(st.seed*48271)%2147483647;reset()});
  $('mm-Tv').textContent=st.T;
  build();
  anim=RD.anim({card:'mm',ctl:'mm-ctl',n:steps.length,draw,ms:1100,label:'Step of the sequence'});
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>anim.redraw(),150)});
  window.__mm={st,get R(){return R},get steps(){return steps},reset,draw};
})();
