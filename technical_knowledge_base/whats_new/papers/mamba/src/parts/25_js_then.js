// ---- Then and now: layer stacks from the configs, KV cache against state ----
(function(){
  const HY=PAPER.rc.hybrids,COLS={A:'var(--c2)',m:'var(--c1)',M:'var(--c3)',F:'var(--dim)',E:'var(--c5)',P:'var(--c2)'};
  const steps=HY.map(h=>({t:h.name}));
  const ctx128=131072;
  makeAnim({id:'thn',mode:'x',modes:{x:steps},lists:{x:'sx-thn'},dur:2600,
    draw(m,k,e,W){const h=HY[k],p=h.pattern,prev=k?HY[k-1].pattern:'',per=W<500?26:44,cs=Math.min(16,(W-8)/per),rows=Math.ceil(p.length/per);let s='';
      for(let i=0;i<p.length;i++){const r=Math.floor(i/per),c=i%per,x=4+c*cs,y=6+r*(cs+6),ch=p[i],was=prev[i]===ch;const op=was?1:e;
        if(ch==='P')s+=G(op,rc(x+.5,y,cs-1,cs/2,COLS.A,{r:1})+rc(x+.5,y+cs/2,cs-1,cs/2,COLS.M,{r:1}));else s+=G(op,rc(x+.5,y,cs-1,cs,COLS[ch],{r:2}))}
      const y0=6+rows*(cs+6)+8;const lg=legend([['attention','var(--c2)'],['Mamba (paper)','var(--c1)'],['Mamba-2','var(--c3)'],['MLP','var(--dim)'],['MoE','var(--c5)']],4,y0+12,W-8);
      return svgW(W,y0+lg.h+12,s+lg.s+tx(4,y0+lg.h+8,'half-and-half squares: attention and Mamba-2 in the same layer',{fs:11,c:'var(--mute)'}),'layer stack')},
    counters(m,k){const h=HY[k];return stat('layers drawn',h.pattern.length,h.note.length<40?h.note:'')+stat('attention layers',h.attn)+stat('KV cache per token',h.kv_per_token?fmtBytes(h.kv_per_token):'none')+stat('state per sequence',h.state_bytes?fmtBytes(h.state_bytes):'none','fixed')+stat('both, at 128K tokens',fmtBytes(h.kv_per_token*ctx128+h.state_bytes))}});
  onTab('t-then',()=>fit($('ctxSvg'),draw));$('ctxL').addEventListener('input',()=>refit($('ctxSvg')));
  function draw(W){const C=2**+$('ctxL').value;$('ctxLv').textContent=fmt(C)+' tokens';const vals=HY.map(h=>h.kv_per_token*C+h.state_bytes),lo=1e6,hi=1e11,lg=Math.log10;
    const lab=Math.min(190,W*.42),bw=W-lab-70,rowH=22;let s='';
    HY.forEach((h,i)=>{const v=vals[i],y=4+i*rowH,w=Math.max(2,bw*(lg(v)-lg(lo))/(lg(hi)-lg(lo)));const kvShare=h.kv_per_token*C/v;
      s+=tx(lab-6,y+14,h.name.replace(/ \(.*\)/,''),{fs:11,a:'end'})+rc(lab,y+3,w*(1-kvShare),15,'var(--c3)',{r:2})+rc(lab+w*(1-kvShare),y+3,w*kvShare,15,'var(--c2)',{r:2})+tx(lab+w+5,y+14,fmtBytes(v),{fs:11})});
    const y=4+HY.length*rowH+4;[1e6,1e8,1e10].forEach(v=>{const x=lab+bw*(lg(v)-lg(lo))/(lg(hi)-lg(lo));s+=ln2(x,4,x,y,'var(--line)')+tx(x,y+14,v===1e6?'1 MB':v===1e8?'100 MB':'10 GB',{fs:11,a:'middle',c:'var(--mute)'})});
    const L=legend([['fixed state','var(--c3)'],['KV cache at this length','var(--c2)']],lab,y+32,W-lab);
    $('ctxSvg').innerHTML=svgW(W,y+32+L.h,s+L.s,'memory per sequence by model')}
})();
