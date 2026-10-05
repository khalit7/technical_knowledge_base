// ---- Real text, measured ----
(function(){
  const root=document.getElementById('t-real');if(!root)return;
  const T=RD.t,$=id=>document.getElementById(id),MOD=window.ITMOD,TXT=window.ITTXT;
  let txt='en',mi=0;
  function table(){const t=ITM.texts[txt];
    let h='<tr><th>model</th><th class="num">tokens</th><th class="num">bytes/token</th><th class="num">nats/token</th><th class="num">perplexity</th><th class="num">bits/token</th><th class="num">bits/byte</th><th class="num">bits/char</th><th class="num">whitespace tokens</th></tr>';
    MOD.forEach(([m,mn])=>{const r=t.models[m];h+='<tr><td>'+mn+'</td><td class="num">'+r.n_tokens.toLocaleString('en-US')+'</td><td class="num">'+r.bpt.toFixed(3)+'</td><td class="num">'+r.ce.toFixed(3)+'</td><td class="num">'+r.ppl.toFixed(2)+'</td><td class="num">'+(r.ce/Math.LN2).toFixed(3)+'</td><td class="num"><b>'+r.bpb.toFixed(4)+'</b></td><td class="num">'+r.bpc.toFixed(4)+'</td><td class="num">'+r.ws_tokens+' ('+(100*r.ws_tokens/r.n_tokens).toFixed(0)+'%)</td></tr>'});
    $('re-tab').innerHTML=h}
  function bars(){const el=$('re-bars'),W=Math.min(RD.width(el),760),t=ITM.texts[txt],two=W>=560,pw=two?W/2-10:W,lw=96;let o='';
    const rows=MOD.map(([m,mn])=>[mn,t.models[m].ppl,t.models[m].bpb]);const mp=Math.max(...rows.map(r=>r[1])),mb=Math.max(...rows.map(r=>r[2]));
    const panel=(ox,oy,title,idx,mx,col,f)=>{let s=T(ox,oy+12,title,{fs:12,w:600});const bw=pw-lw-48;
      const order=rows.map((r,i)=>[r[idx],i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
      rows.forEach((r,i)=>{const y=oy+22+i*24,rank=order.indexOf(i)+1;s+=T(ox+lw-6,y+13,r[0],{a:'end',fs:11.5})+'<rect x="'+(ox+lw)+'" y="'+(y+3)+'" width="'+Math.max(1,r[idx]/mx*bw)+'" height="14" rx="3" fill="'+col+'"/>'+T(ox+lw+r[idx]/mx*bw+4,y+14,f(r[idx])+'  #'+rank,{fs:11,w:600})});return s};
    o+=panel(0,0,'perplexity per token (lower is better)',1,mp,'var(--c2)',v=>v.toFixed(1));
    o+=panel(two?pw+20:0,two?0:22+4*24+14,'bits per byte (lower is better)',2,mb,'var(--c3)',v=>v.toFixed(3));
    el.innerHTML=RD.svg(W,two?22+4*24+6:2*(22+4*24)+20,o,'Perplexity and bits per byte by model');
    const r=k=>t.models[MOD[k][0]];
    $('re-barnote').textContent=txt==='en'?'On English prose the four tokenizers produce almost the same number of tokens (2,095 to 2,117), so perplexity and bits per byte rank the models the same way; the gaps are model differences.':
      txt==='fr'?'On French, Qwen2.5 needs 1,670 tokens where the others need 2,131 to 2,163. Its perplexity lead over SmolLM2 (13.3 against 16.6) understates its compression lead ('+r(3).bpb.toFixed(3)+' against '+r(2).bpb.toFixed(3)+' bits per byte). GPT-2 and OPT share a tokenizer, so their perplexities compare directly.':
      'On C code, GPT-2 spends 29% of its tokens on pure whitespace; its perplexity of 8.2 here is far lower than its 30.2 on Darwin, yet it compresses this code worse (1.514 against 1.003 bits per byte).'}
  const disp=s=>s.replace(/Ġ/g,'␣').replace(/Ċ/g,'↵').replace(/ĉ/g,'⇥');
  function toks(){const r=ITM.texts[txt].models[MOD[mi][0]];
    const col=b=>b<1?'var(--c3)':b<4?'var(--c5)':b<8?'var(--c2)':'var(--bad)';
    $('re-toks').innerHTML=r.head.map(([tk,nb,nats])=>{const b=nats/Math.LN2;return '<span title="'+RD.esc(disp(tk))+': '+nb+' bytes, '+b.toFixed(2)+' bits" style="border-left:4px solid '+col(b)+';">'+RD.esc(disp(tk))+'<sub style="color:var(--mute);font-size:9px"> '+b.toFixed(1)+'</sub></span>'}).join('');
    const nb=r.head.reduce((s,x)=>s+x[1],0),bits=r.head.reduce((s,x)=>s+x[2],0)/Math.LN2;
    $('re-toknote').textContent='Subscripts are bits per token. These 40 tokens cover '+nb+' bytes and cost '+bits.toFixed(1)+' bits: '+(bits/nb).toFixed(2)+' bits per byte, higher than the whole-text figure because the model has no context yet at the start.'}
  function pref(){const el=$('re-pref'),L=ITM.lens;
    const ser=[];const cc=['var(--c1)','var(--c4)','var(--c5)','var(--c6)','var(--mute)'];
    Object.entries(ITM.compressors).forEach(([k,v],i)=>ser.push({pts:L.map((n,j)=>[n,v.prefix_bpb[j]]),col:cc[i%5],dots:true,w:1.6}));
    MOD.forEach(([m,mn],i)=>{const pb=ITM.texts.en.models[m].prefix_bpb;ser.push({pts:L.map((n,j)=>[n,pb[j]]),col:i<2?'var(--c3)':'var(--c2)',dots:true,dash:i%2===1,w:1.8})});
    $('re-leg').innerHTML=Object.keys(ITM.compressors).map((k,i)=>'<span style="--sw:'+cc[i%5]+'">'+k+'</span>').join('')+'<span style="--sw:var(--c3)">GPT-2 (solid), OPT-125m (dashed)</span><span style="--sw:var(--c2)">SmolLM2 (solid), Qwen2.5 (dashed)</span>';
    RD.chart(el,{logx:true,x0:500,x1:10376,y0:0,y1:7,yt:[0,1,2,3,4,5,6,7],xt:[500,1000,2000,4000,8000],xlab:'bytes of the passage seen (log scale)',aria:'Bits per byte against text length',series:ser,r:16});
    $('re-book').textContent=Object.entries(ITM.compressors).map(([k,v])=>k+' '+v.book_bpb.toFixed(3)).join(', ')+' bits per byte'}
  function all(){table();bars();toks();pref()}
  RD.seg($('re-txt'),m=>{txt=m;table();bars();toks()});
  RD.seg($('re-mod'),m=>{mi=+m;toks()});
  RD.onRender(all,'t-real');
  addEventListener('resize',()=>{if(!root.hidden){bars();pref()}});
})();
