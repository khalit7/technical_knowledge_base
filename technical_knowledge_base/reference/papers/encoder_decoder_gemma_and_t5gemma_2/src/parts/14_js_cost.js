// ---- Generation cost: the same question answered by a decoder-only model and by an encoder-decoder ----
// Batch size 1. Prefill (reading the prompt) is one parallel pass, compute-bound; every generated token streams
// the decoder's weights from memory once, bandwidth-bound. Parameter counts from recompute.py; hardware illustrative.
(function(){
  const PR=PAPER.rc.params,RCP=PAPER.rc.parts,F4=PAPER.rc.fig4;
  const BW=819e9,FL=197e12,BY=2; // TPU v5e: HBM bandwidth (bytes/s), bf16 peak (FLOP/s); bf16 weights
  const PV=[128,512,1024,2048,4096,8192],AV=[16,64,128,256,512,1024];
  // the cross-attention's keys and values are computed once from the encoder output: k and v weights, 26 decoder layers x 2 x d_enc x (4 kv heads x 256)
  const KV=dEnc=>RCP['gemma-2-2b'].L*2*dEnc*1024;
  const g2=PR.gemma2_2b_nonemb,g9=PR.gemma2_9b_nonemb,e2=PR.gemma2_2b_emb,e9=PR.gemma2_9b_emb;
  // enc: parameters used once per prompt token (prefill); dec: weights streamed per generated token
  const MOD={
    d2:{n:'Gemma 2 2B',enc:g2,dec:g2+e2,fig:'2B',dec_only:true},
    d9:{n:'Gemma 2 9B',enc:g9,dec:g9+e9,fig:'9B',dec_only:true},
    ed92:{n:'T5Gemma 9B-2B',enc:g9,dec:g2+PR.cross_9b2b+e2,fig:'9B-2B',crossKV:KV(RCP['gemma-2-9b'].d)},
    ed22:{n:'T5Gemma 2B-2B',enc:g2,dec:g2+PR.cross_2b2b+e2,fig:'2B-2B',crossKV:KV(RCP['gemma-2-2b'].d)}
  };
  const P=()=>PV[+$('cdxP').value],Aq=()=>AV[+$('cdxA').value];
  function cost(m,p,a){const M=MOD[m];const pre=(2*M.enc*p+2*(M.crossKV||0)*p)/FL*1e3;const tok=M.dec*BY/BW*1e3;
    return {pre,tok,total:pre+tok*a,bytesTok:M.dec*BY,flPre:2*M.enc*p}}
  const STEPS=m=>{const M=MOD[m],ed=!M.dec_only;return [
    {t:'Read the prompt',c:ed?'The encoder reads all prompt tokens at once, in parallel, with bidirectional attention. This pass is limited by compute, not memory: '+M.n.split(' ')[1].split('-')[0]+' encoder parameters × 2 FLOPs × prompt tokens. The cross-attention keys and values are computed here too, once.':'The decoder-only model also reads the prompt in one parallel pass (prefill), caching keys and values for every layer. Same cost formula: 2 FLOPs per parameter per prompt token.'},
    {t:'Generate token 1',c:ed?'Now only the decoder runs: its weights, its cross-attention and the softmax are streamed from memory to produce one token. The '+(m==='ed92'?'9B':'2B')+' encoder is not touched again.':'Every weight of the model is streamed from memory to produce one token. At batch size 1 this, not arithmetic, sets the speed.'},
    {t:'Generate token 2',c:'Same again: one full pass of the '+(ed?'decoder':'model')+' per token. Cost grows with the answer\'s length times the '+(ed?'decoder':'model')+' size.'},
    {t:'Generate token 3',c:ed?'The decoder keeps attending to the same encoder output through cross-attention; the prompt is never re-read.':'The model attends to the cached prompt through its own self-attention.'},
    {t:'Every token, to the end of the answer',c:'Total = prompt pass + answer tokens × per-token time. Compare the four models on the bars below: what you pay per token is the decoder\'s size, so the 9B-2B runs close to a 2B and far from a 9B.'}]};
  const modes={};Object.keys(MOD).forEach(m=>modes[m]=STEPS(m));
  const fms=v=>v>=1000?(v/1000).toFixed(2)+' s':v.toFixed(v<10?2:v<100?1:0)+' ms';
  function draw(m,k,e,w){const p=P(),a=Aq(),c=cost(m,p,a),M=MOD[m];
    const tmax=Math.max(...Object.keys(MOD).map(x=>cost(x,p,a).total));const sc=(w-10)/tmax;let s='';
    // model boxes, to scale by parameters (the largest model fills the width)
    const big=PR.gemma2_9b_total_recount+PR.cross_9b2b,bs=(w-10)/big;const y0=8;
    const encW=M.enc*bs,decW=M.dec*bs,activeEnc=k===0,activeDec=k>=1;
    if(M.dec_only){s+=tx(0,y0+10,M.n+': every token reads all '+(M.dec/1e9).toFixed(2)+'B',{fs:11})+rc(0,y0+15,decW,20,'var(--c1)',{op:.9})}
    else{s+=tx(0,y0+10,'Encoder '+(M.enc/1e9).toFixed(2)+'B: reads the prompt once',{fs:11,w:activeEnc?600:400})+rc(0,y0+15,encW,20,'var(--c3)',{op:activeEnc?.9:.25});
      s+=tx(0,y0+50,'Decoder, cross-attention, softmax '+(M.dec/1e9).toFixed(2)+'B: every token',{fs:11,w:activeDec?600:400})+rc(0,y0+55,decW,20,'var(--c1)',{op:activeDec?.9:.25})}
    // timeline to scale
    const ty=M.dec_only?y0+56:y0+96;s+=tx(0,ty-4,w<520?'Time, to scale (slowest of the four = full width)':'Time, to scale against the slowest of the four for this prompt and answer',{fs:11,c:'var(--mute)'});
    const shown=k===0?e:k<4?1:1;let tNow=c.pre*(k===0?e:1);
    s+=rc(0,ty+2,c.pre*sc*(k===0?e:1),18,'var(--c3)',{r:2,op:.85});
    const ntok=k===0?0:k<4?(k-1)+e:3+(a-3)*e;tNow+=c.tok*Math.min(a,ntok);
    const tw=c.tok*sc;const x0=c.pre*sc;
    if(ntok>0){const show=Math.min(a,ntok);s+=rc(x0,ty+2,tw*show,18,'var(--c1)',{r:2,op:.85});
      if(tw>3)for(let i=1;i<Math.min(show,60);i++)s+=ln2(x0+tw*i,ty+2,x0+tw*i,ty+20,'var(--bg)',{sw:.8})}
    s+=ln2(0,ty+24,w-10,ty+24,'var(--line)');s+=tx(0,ty+38,'0',{fs:11,c:'var(--mute)'})+((tNow*sc)<w-130?tx(w-10,ty+38,fms(tmax),{fs:11,a:'end',c:'var(--mute)'}):'');
    const lx=Math.min(w-60,Math.max(40,(c.pre+c.tok*Math.min(a,ntok))*sc));s+=tx(lx,ty+38,fms(tNow),{fs:11,a:'middle',w:600});
    draw.t=tNow;return svgW(w,ty+44,s,'Generation cost')}
  function counters(m,k){const p=P(),a=Aq(),c=cost(m,p,a);const nt=k===0?0:k<4?k:a;
    return stat('Prompt pass','~'+fms(c.pre),sci(c.flPre,1)+' FLOPs')+stat('Per generated token','~'+fms(c.tok),(c.bytesTok/1e9).toFixed(2)+' GB of weights streamed')+
      stat('Tokens generated',nt+' of '+a,'')+stat('Modelled total','~'+fms(c.pre+c.tok*nt),k===4?'for the whole answer':'so far')}
  function cmp(){const host=$('cdxCmp');if(!host)return;const p=P(),a=Aq();
    fit(host,w=>{const ks=['d2','ed22','ed92','d9'],c2=cost('d2',p,a).total;const rows=ks.map(k=>({k,n:MOD[k].n,mod:cost(k,p,a).total/c2,ms:F4[MOD[k].fig].ms,acc:F4[MOD[k].fig].gsm8k}));
      const meas2=F4['2B'].ms;const mx=Math.max(...rows.map(r=>Math.max(r.mod,r.ms/meas2)));const lw=Math.min(118,w*.32),bw=w-lw-60;let s='';
      s+=tx(0,12,w<520?'Latency against Gemma 2 2B: model (solid), Figure 4 (outline)':'Latency relative to Gemma 2 2B: modelled (solid) against the paper\'s Figure 4 (outline)',{fs:11,c:'var(--mute)'});
      rows.forEach((r,i)=>{const y=22+i*34;s+=tx(0,y+12,r.n,{fs:11})+tx(0,y+26,'GSM8K '+r.acc.toFixed(1),{fs:11,c:'var(--mute)'});
        s+=rc(lw,y+2,bw*r.mod/mx,12,'var(--c1)',{r:2,op:.85})+tx(lw+bw*r.mod/mx+4,y+12,r.mod.toFixed(2)+'×',{fs:11});
        s+=rc(lw,y+16,bw*(r.ms/meas2)/mx,12,'none',{r:2,s:'var(--c2)',sw:1.4})+tx(lw+bw*(r.ms/meas2)/mx+4,y+26,(r.ms/meas2).toFixed(2)+'× ('+r.ms+' ms)',{fs:11,c:'var(--mute)'})});
      host.innerHTML=svgW(w,22+rows.length*34+4,s,'Modelled against measured latency')})}
  function lab(){$('cdxPv').textContent=fmt(P());$('cdxAv').textContent=fmt(Aq())}
  lab();
  const an=makeAnim({id:'cdx',modes,mode:'ed92',draw,counters,dur:2600});
  ['cdxP','cdxA'].forEach(id=>$(id).addEventListener('input',()=>{lab();an&&an.draw();cmp()}));
  cmp();
  window.CDX={cost,MOD};
})();
