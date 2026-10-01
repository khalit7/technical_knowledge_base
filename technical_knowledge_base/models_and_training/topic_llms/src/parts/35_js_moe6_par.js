// ---- Total and active tab: rebuild a model card's two numbers from its config.json (same arithmetic as recompute.py) ----
(function(){
  const MOE=window.MOE;if(!MOE)return;const {$,onTab,fmt,fmtBytes,svgEl,bx,stat,A,logFrame,sup}=MOE;
  if(!$('moeParBars'))return;
  // attn = attention parameters per layer incl. the block's norms, computed by recompute.py from each config
  const M=[
    {id:'v3',n:'DeepSeek-V3',L:61,Lm:58,d:7168,N:256,k:8,Ns:1,ff:2048,ffs:2048,ffd:18432,attn:187121664,V:129280,pub:[671,37],src:'v3cfg',ps:'V3 report',pu:'v3r',note:'MLA attention. The 685B on the model card adds the 14B multi-token-prediction module, which is not part of the main model.'},
    {id:'k2',n:'Kimi K2',L:61,Lm:60,d:7168,N:384,k:8,Ns:1,ff:2048,ffs:2048,ffd:18432,attn:101138432,V:163840,pub:[1040,32],src:'k2cfg',ps:'K2 report',pu:'k2r',note:'V3\'s architecture with 384 experts, 64 attention heads and one dense layer. The report\'s architecture table gives 1.04T total (its abstract rounds to 1 trillion), about 1.3% above this rebuild; the gap is not explained in the report (unconfirmed which modules it includes).'},
    {id:'glm52',n:'GLM-5.2',L:78,Lm:75,d:6144,N:256,k:8,Ns:1,ff:2048,ffs:2048,ffd:12288,attn:165034496,V:154880,pub:[744,40],src:'glm52',ps:'model card',pu:'glm52',note:'MLA-style attention plus a sparse-attention indexer per layer; the indexer is not counted here, which is why the rebuild sits a little under 744B.'},
    {id:'mix',n:'Mixtral 8x7B',L:32,Lm:32,d:4096,N:8,k:2,Ns:0,ff:14336,ffs:0,ffd:0,attn:41951232,V:32000,pub:[46.7,12.9],src:'mixcfg',ps:'Mistral',pu:'mixn',note:'Grouped-query attention, 8 wide experts, top-2, no shared expert, no dense layers.'},
    {id:'q3',n:'Qwen3-235B-A22B',L:94,Lm:94,d:4096,N:128,k:8,Ns:0,ff:1536,ffs:0,ffd:0,attn:71311616,V:151936,pub:[235,22],src:'q3cfg',ps:'Qwen3 report',pu:'q3r',note:'No shared expert and no dense layers: every one of the 94 blocks is MoE.'},
    {id:'oss',n:'gpt-oss-120b',L:36,Lm:36,d:2880,N:128,k:4,Ns:0,ff:2880,ffs:0,ffd:0,attn:26555904,V:201088,pub:[116.83,5.13],src:'osscfg',ps:'model card',pu:'oss',eb:1,rb:1,noEmb:1,note:'Experts and router carry biases, attention has sinks. OpenAI counts the unembedding but not the input embedding as active; untick the box to match.'},
    {id:'oss20',n:'gpt-oss-20b',L:24,Lm:24,d:2880,N:32,k:4,Ns:0,ff:2880,ffs:0,ffd:0,attn:26555904,V:201088,pub:[20.91,3.61],src:'oss',ps:'model card',pu:'oss',eb:1,rb:1,noEmb:1,note:'The small sibling: 32 experts, top-4, the same counting rule as the 120b.'},
    {id:'mav',n:'Llama 4 Maverick',L:48,Lm:24,d:5120,N:128,k:1,Ns:1,ff:8192,ffs:8192,ffd:16384,attn:62924800,V:202048,pub:[400,17],src:'mavcfg',ps:'model card',pu:'mav',note:'Text model only. MoE every second layer, top-1 plus one shared expert; the other 24 layers are dense.'}
  ];
  const URL={v3cfg:'https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json',v3r:'https://arxiv.org/abs/2412.19437',k2cfg:'https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json',k2r:'https://arxiv.org/abs/2507.20534',glm52:'https://huggingface.co/zai-org/GLM-5.2',mixcfg:'https://huggingface.co/mistralai/Mixtral-8x7B-v0.1/blob/main/config.json',mixn:'https://mistral.ai/news/mixtral-of-experts/',q3cfg:'https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json',q3r:'https://arxiv.org/abs/2505.09388',osscfg:'https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json',oss:'https://arxiv.org/abs/2508.10925',mavcfg:'https://huggingface.co/unsloth/Llama-4-Maverick-17B-128E-Instruct/blob/main/config.json',mav:'https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct'};
  const st={m:'v3',g:0,prec:2,emb:true};
  function calc(c,g,emb){const f=2**g,N=c.N*f,k=c.k*f,ff=c.ff/f;
    const PE=3*c.d*ff+(c.eb?2*ff+c.d:0),PS=3*c.d*c.ffs,R=c.d*N+(c.rb?N:0);
    const p={routed:c.Lm*N*PE,shared:c.Lm*c.Ns*PS,router:c.Lm*R,attn:c.L*c.attn,dense:(c.L-c.Lm)*3*c.d*c.ffd,embIn:c.V*c.d,head:c.V*c.d+c.d};
    const a=Object.assign({},p,{routed:c.Lm*k*PE});if(!emb)a.embIn=0;
    const sum=o=>Object.values(o).reduce((x,y)=>x+y,0);return {p,a,T:sum(p),A:sum(a),N,k,ff,PE}}
  const PARTS=[['routed','routed experts','var(--c1)'],['shared','shared experts','var(--c3)'],['router','routers','var(--c6)'],['attn','attention','var(--c2)'],['dense','dense FFN layers','var(--c5)'],['embIn','input embedding','var(--c4)'],['head','output head','var(--dim)']];
  const B=v=>v>=1e12?(v/1e12).toFixed(2)+'T':(v/1e9).toFixed(v<1e10?2:1)+'B';
  function comb(n,r){let l=0;for(let i=0;i<r;i++)l+=Math.log10(n-i)-Math.log10(i+1);return l}
  function bars(r){const W=Math.max(320,Math.min(760,$('moeParBars').clientWidth||700)),nar=W<520,pl=nar?0:96,bw=W-pl-10;let s='',y=8;
    const row=(lab,o,tot,scale,sub)=>{let x=pl;if(nar){s+='<text x="0" y="'+(y+10)+'" font-size="11.5" font-weight="600">'+lab+'</text>';y+=16}else s+='<text x="'+(pl-8)+'" y="'+(y+15)+'" font-size="11.5" text-anchor="end" font-weight="600">'+lab+'</text>';
      PARTS.forEach(([key,,col])=>{const w=o[key]/scale*bw;if(w>0){s+='<rect x="'+x+'" y="'+y+'" width="'+Math.max(w,0.5)+'" height="22" fill="'+col+'"><title>'+key+' '+B(o[key])+'</title></rect>';x+=w}});
      s+='<text x="'+Math.min(x+6,W-4)+'" y="'+(y+15)+'" font-size="11.5"'+(x+6>W-90?' text-anchor="end" fill="var(--bg)"':'')+'>'+B(tot)+'</text>';y+=28;if(sub){s+='<text x="'+pl+'" y="'+(y+2)+'" font-size="10.5" fill="var(--mute)">'+sub+'</text>';y+=14}};
    row('Total',r.p,r.T,r.T);row('Active',r.a,r.A,r.T,'active, to the same scale');const z=r.T/r.A;row('Active ×'+z.toFixed(1),r.a,r.A,r.A,'active, enlarged '+z.toFixed(1)+' times to show its make-up');
    let lx=pl,ly=y+6;PARTS.forEach(([key,l,col])=>{if(!r.p[key])return;const lw=l.length*6+26;if(lx+lw>W){lx=pl;ly+=15}s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" rx="2" fill="'+col+'"/><text x="'+(lx+14)+'" y="'+ly+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';lx+=lw});
    $('moeParBars').innerHTML='<div class="plot">'+svgEl(W,ly+8,s,'Total and active parameters by component')+'</div>'}
  function draw(){const c=M.find(x=>x.id===st.m),r=calc(c,st.g,st.emb),f=2**st.g;
    $('moeParMv').textContent=f===1?'1 (as released)':f+' narrower experts';
    bars(r);
    const mem=r.T*st.prec,ex=(r.p.routed+r.p.shared)/r.T*100,exa=(r.a.routed+r.a.shared)/r.A*100,c0=comb(c.N,c.k),cg=comb(r.N,r.k);
    $('moeParOut').innerHTML=stat('Total',B(r.T),'published '+c.pub[0]+(c.pub[0]>=1000?'B (1.04T)':'B'))+stat('Active per token',B(r.A),'published '+c.pub[1]+'B')+stat('Total ÷ active',(r.T/r.A).toFixed(1)+'x',(r.A/r.T*100).toFixed(1)+'% of weights do work per token')+
      stat('Weights in memory',fmt(mem/1e9)+' GB','total × '+(st.prec===0.53125?'4.25 bits':st.prec+' bytes'))+stat('Experts\' share',ex.toFixed(1)+'% of total',exa.toFixed(1)+'% of active')+
      stat('Expert choices per token','10'+sup(Math.floor(cg))+'',r.N+' experts, top-'+r.k+(f>1?' (released: about 10'+sup(Math.floor(c0))+')':''));
    $('moeParNote').innerHTML=c.note+' Config: '+A(URL[c.src],c.n+' config.json')+'; published figures: '+A(URL[c.pu],c.ps)+'.'+(f>1?' With experts split '+f+' ways the total and active counts barely move (only the router grows), while the number of distinct expert combinations a token can use rises from about 10'+sup(Math.floor(c0))+' to 10'+sup(Math.floor(cg))+'; the price is '+f+'-times-smaller matmuls per expert and '+f+'-times-wider dispatch.':'');
    let t='<tr><th>Model</th><th>Rebuilt total</th><th>Published total</th><th>Rebuilt active</th><th>Published active</th><th>Ratio</th></tr>';
    M.forEach(m=>{const q=calc(m,0,!m.noEmb);t+='<tr'+(m.id===st.m?' class="sel"':'')+'><td>'+m.n+'</td><td class="num">'+B(q.T)+'</td><td class="num">'+(m.pub[0]>=1000?(m.pub[0]/1000).toFixed(2)+'T':m.pub[0]+'B')+'</td><td class="num">'+B(q.A)+'</td><td class="num">'+m.pub[1]+'B</td><td class="num">'+(q.T/q.A).toFixed(1)+'x</td></tr>'});
    $('moeParTab').innerHTML=t;
    $('moeParRep').innerHTML='Defaults reproduce the published totals and active counts of DeepSeek-V3 (671B, 37B), Mixtral 8x7B (46.7B, 12.9B), Qwen3-235B-A22B, gpt-oss-120b and 20b (with the input embedding excluded, as OpenAI counts) and Llama 4 Maverick <b>independently</b>: from config.json and the formula, with no fitted input. Kimi K2 rebuilds to 1.03T against the report\'s 1.04T, and GLM-5.2 to 743B against 744B (its indexer is not counted); those two do not reproduce exactly. The table uses each lab\'s own embedding convention.'}
  const pre=$('moeParPre');pre.innerHTML=M.map(m=>'<button data-m="'+m.id+'"'+(m.id===st.m?' class="on"':'')+'>'+m.n+'</button>').join('');
  pre.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{pre.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.m=b.dataset.m;const c=M.find(x=>x.id===st.m);st.emb=!c.noEmb;$('moeParEmb').checked=st.emb;draw()}));
  $('moeParM').addEventListener('input',e=>{st.g=+e.target.value;draw()});
  $('moeParPrec').addEventListener('change',e=>{st.prec=+e.target.value;draw()});
  $('moeParEmb').addEventListener('change',e=>{st.emb=e.target.checked;draw()});
  let lw=0;addEventListener('resize',()=>{const w=$('moeParBars').clientWidth;if(w&&Math.abs(w-lw)>30){lw=w;draw()}});
  onTab(()=>{lw=$('moeParBars').clientWidth;draw()});
})();
