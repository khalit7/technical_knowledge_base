// ---- Reading section 5: Megatron's document, sample and shuffle indices against nanoGPT's random offsets ----
(function(){
  const M=SL.meg,U=SLU,$=U.$,card=$('sl-meg');if(!card)return;
  const SEQ=M.seq,sizes=M.sizes,DI=M.document_index,SI=M.sample_index,SH=M.shuffle_index,NS=M.num_samples,D=M.D;
  const PAL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
  const col=d=>PAL[d%6],op=d=>d<6?1:0.55;
  const ROW=SEQ*4;  // tokens per drawn row
  // stream positions
  const epochTok=sizes.reduce((a,b)=>a+b,0),streamTok=epochTok*M.epochs;
  const dstart=[];{let p=0;DI.forEach(d=>{dstart.push(p);p+=sizes[d]})}
  const spos=e=>dstart[e[0]]+e[1];
  let mode='meg';
  function layout(W,tot){const rows=Math.ceil(tot/ROW),x=t=>(t%ROW)*(W-4)/ROW+2,y=t=>Math.floor(t/ROW)*30+22;return {rows,x,y,H:rows*30+30,sx:(W-4)/ROW}}
  // draw a token range [a,b) as possibly several row pieces
  function span(Lt,a,b,attrs){let s='';while(a<b){const re=Math.min(b,(Math.floor(a/ROW)+1)*ROW);s+='<rect x="'+Lt.x(a).toFixed(1)+'" y="'+Lt.y(a)+'" width="'+Math.max(0.8,(re-a)*Lt.sx).toFixed(1)+'" height="18" '+attrs+'/>';a=re}return s}
  function docsSvg(W,seq,starts){const L=layout(W,starts.length?starts[starts.length-1]+sizes[seq[seq.length-1]]:0);let s='';
    seq.forEach((d,i)=>{s+=span(L,starts[i],starts[i]+sizes[d],'fill="'+col(d)+'" fill-opacity="'+op(d)+'" stroke="var(--bg)" stroke-width="0.6"')});return {L,s}}
  const nano=M.nanogpt,flatStarts=[];{let p=0;for(let d=0;d<D;d++){flatStarts.push(p);p+=sizes[d]}}
  const nSteps={meg:3+NS+1,nano:1+nano.samples+1};
  function drawMeg(i){const W=RD.width(card),seq=i===0?[...Array(D).keys()]:DI,st=i===0?flatStarts:dstart;
    const {L,s}=docsSvg(W,seq,st);let body=s,cap='',out='';
    for(let r=0;r<L.rows;r++)body+=RD.t(2,L.y(r*ROW)-3,(r*ROW).toLocaleString('en-US')+' tokens',{fs:10,fill:'var(--mute)'});
    if(i>=2){for(let k=0;k<=NS;k++){const t=spos(SI[k]);body+='<line x1="'+L.x(t).toFixed(1)+'" x2="'+L.x(t).toFixed(1)+'" y1="'+(L.y(t)-2)+'" y2="'+(L.y(t)+20)+'" stroke="var(--ink)" stroke-width="1"/>'}}
    const cons=Math.max(0,i-3);
    if(i>=3){for(let k=0;k<Math.min(cons+1,NS);k++){const smp=SH[k],a=spos(SI[smp]),b=a+SEQ+1;
        body+=span(L,a,Math.min(b,streamTok),'fill="none" stroke="'+(k===cons&&i<nSteps.meg-1?'var(--ink)':'var(--mute)')+'" stroke-width="'+(k===cons&&i<nSteps.meg-1?2.2:0.8)+'"'+(k===cons?'':' stroke-dasharray="2 2"'))}}
    if(i===0)cap='<b>The token file.</b> Twelve real documents of the running example, in file order, drawn to scale ('+U.f0(epochTok)+' tokens including one end-of-document token each). Colour = document.';
    else if(i===1)cap='<b>document_index.</b> Every document appears once per epoch (2 epochs here), and all '+DI.length+' entries are shuffled together with <code>RandomState(1234)</code>. Note that epochs mix: a document can come back before every other has been seen once.';
    else if(i===2)cap='<b>sample_index.</b> The shuffled order is treated as one stream and cut every '+U.f0(SEQ)+' tokens (black ticks): '+NS+' samples. Each row of sample_index stores (position in document_index, offset inside that document) for one tick; a sample reads '+U.f0(SEQ+1)+' tokens, the last also being the first of the next.';
    else if(i<nSteps.meg-1){const smp=SH[cons],e=SI[smp],e2=SI[smp+1],docs=[];for(let p=e[0];p<=e2[0];p++)docs.push(DI[p]);
      cap='<b>Step '+(cons+1)+':</b> the loader asks for sample '+cons+' of the run; <code>shuffle_index['+cons+'] = '+smp+'</code>; <code>sample_index['+smp+'] = ('+e[0]+', '+e[1]+')</code> to <code>('+e2[0]+', '+e2[1]+')</code>: it reads '+docs.length+' slice'+(docs.length>1?'s':'')+' from document'+(docs.length>1?'s ':' ')+docs.join(', ')+'. Earlier samples are dashed.'}
    else cap='<b>Crash and resume.</b> All three arrays are a pure function of the seed and the data, cached as <code>.npy</code> files. After a crash at, say, sample 10, the checkpoint only needs <code>consumed_samples = 10</code>: the sampler restarts at <code>range(10, total)</code> and step 11 reads exactly what it would have read. Each of the two copies of every document was read exactly once, except the final tail shorter than one sample ('+U.f0(streamTok-spos(SI[NS])-1)+' tokens), which is dropped.';
    out=RD.stat('Samples consumed',i>=3?Math.min(cons+(i<nSteps.meg-1?1:0),NS)+' / '+NS:'0 / '+NS,'')+RD.stat('Epochs in the stream',String(M.epochs),U.f0(streamTok)+' tokens')+RD.stat('Sample length',U.f0(SEQ)+' + 1','tokens');
    return {body,H:L.H,cap,out}}
  function drawNano(i){const W=RD.width(card),{L,s}=docsSvg(W,[...Array(D).keys()],flatStarts);let body=s;const k=Math.min(Math.max(0,i),nano.samples);
    const cov=new Int16Array(nano.tokens);for(let j=0;j<k;j++){const a=nano.starts[j];for(let t=a;t<a+SEQ;t++)cov[t]++}
    // coverage strip under each row: one rect per run of equal coverage
    let t=0;while(t<nano.tokens){let e=t;while(e<nano.tokens&&cov[e]===cov[t]&&Math.floor(e/ROW)===Math.floor(t/ROW))e++;const c=cov[t];
      body+='<rect x="'+L.x(t).toFixed(1)+'" y="'+(L.y(t)+19)+'" width="'+Math.max(0.6,(e-t)*L.sx).toFixed(1)+'" height="5" fill="'+(c===0?'var(--bad)':c===1?'var(--good)':'var(--c5)')+'"/>';t=e}
    for(let j=0;j<k;j++){const a=nano.starts[j];body+=span(L,a,a+SEQ,'fill="none" stroke="'+(j===k-1?'var(--ink)':'var(--mute)')+'" stroke-width="'+(j===k-1?2.2:0.8)+'"'+(j===k-1?'':' stroke-dasharray="2 2"'))}
    let z=0,o=0,m=0;for(let j=0;j<nano.tokens;j++){if(cov[j]===0)z++;else if(cov[j]===1)o++;else m++}
    let cap;
    if(i===0)cap='<b>The same twelve documents, one epoch, no index.</b> nanoGPT memory-maps the file and, every step, draws start positions with <code>torch.randint(len(data) - block_size, ...)</code>. The strip under each row will show how often each token has been read: red never, green once, yellow twice or more.';
    else if(i<=nano.samples)cap='<b>Draw '+k+' of '+nano.samples+'</b> (as many windows as fit in one epoch): start '+U.f0(nano.starts[k-1])+'. Windows ignore document starts and may overlap earlier ones.';
    else cap='<b>After one epoch\'s worth of windows</b>, '+U.pc(nano.unseen_frac)+' of these tokens were never read and '+U.pc(nano.twice_or_more_frac)+' were read twice or more. On a long file the never-read share tends to e<sup>−1</sup> ≈ 36.8% (simulated on 50M tokens: '+U.pc(M.nanogpt_big.unseen_frac)+'). Resuming needs the random generator\'s state, not just a counter.';
    const out=RD.stat('Never read',U.pc(z/nano.tokens),'')+RD.stat('Read once',U.pc(o/nano.tokens),'')+RD.stat('Read 2+ times',U.pc(m/nano.tokens),'');
    return {body,H:L.H+6,cap,out}}
  function draw(i){const r=mode==='meg'?drawMeg(i):drawNano(i),W=RD.width(card);
    $('sl-meg-plot').innerHTML=RD.svg(W,r.H,r.body,mode==='meg'?'Megatron indices':'nanoGPT random windows');$('sl-meg-cap').innerHTML=r.cap;$('sl-meg-out').innerHTML=r.out}
  const A=RD.anim({card:'sl-meg',ctl:'sl-meg-ctl',n:nSteps.meg,ms:1300,label:'Step',draw});
  RD.seg($('sl-meg-seg'),m=>{mode=m;A.reset(nSteps[m])});
  RD.onResize(()=>A.redraw());
})();
