// ---- Reading tab: Llama 4 layer strip (the 4D mesh and interruption bars moved to their owner, the Llama 3 Herd paper page; the index chart to the landscape root) ----
(function(){ // Llama 4 layer strip
  if(!$('l4'))return;let mk='mav';
  function draw(){const m=MODELS[mk],p=params(m),narrow=$('l4').clientWidth<560;
    const st=$('l4Strip');st.style.gridTemplateColumns='repeat('+(narrow?24:48)+',minmax(0,1fr))';
    let h='';for(let i=0;i<48;i++){const moe=m.moe.every===1||((i+1)%m.moe.every===0),glob=((i+1)%4===0);
      h+='<span class="'+(moe?'mo':'dn')+' '+(glob?'gl':'lo')+'" title="Layer '+i+': '+(moe?'MoE, '+m.moe.E+' experts + shared':'dense FFN 16,384 wide')+'; '+(glob?'global attention, no position encoding, temperature-scaled':'RoPE, attention within 8,192-token chunks')+'"></span>'}
    st.innerHTML=h;
    const lp=+$('l4P').value,pos=Math.round(Math.pow(2,lp)),tau=1+0.1*Math.log1p(Math.floor((pos+1)/8192));
    $('l4Pv').textContent=fmt(pos)+' tokens';
    const kvI=kvBytes(m,pos),kvG=48*kvTok(m)*pos;
    $('l4Out').innerHTML=stat('Global layers\' query temperature',tau.toFixed(3)+'×','1 + 0.1 ln(1 + ⌊(p+1)/8192⌋)')+stat('Keys each chunked layer sees','≤ '+fmt(Math.min(pos,8192)),'within its 8,192-token chunk')+stat('KV cache, iRoPE (BF16)',fmtBytes(kvI),'12 global layers grow, 36 stop at a chunk')+stat('If every layer were global',fmtBytes(kvG),(kvG/kvI).toFixed(1)+'× more');
    const r=(k,v,d)=>'<tr><td>'+k+'</td><td class="num">'+(v/1e9).toFixed(2)+'B</td><td>'+d+'</td></tr>';
    $('l4Tab').innerHTML='<tr><th>Part</th><th class="num">Parameters</th><th>From the config</th></tr>'+
      r('Attention, 48 layers',p.att,'q and o 5,120 × 5,120; k and v 5,120 × 1,024')+
      r('Experts, '+p.nMoE+' MoE layers',p.nMoE*(m.moe.E+1)*p.exp,(m.moe.E+1)+' blocks of 3 × 5,120 × 8,192 (routed + shared)')+
      (p.nMoE<48?r('Dense FFN, '+(48-p.nMoE)+' layers',(48-p.nMoE)*3*5120*16384,'3 × 5,120 × 16,384'):'')+
      r('Routers',p.router,'5,120 × '+m.moe.E+' per MoE layer')+r('Embeddings in and out',p.emb,'2 × 202,048 × 5,120')+
      '<tr><td><b>Text model total</b></td><td class="num"><b>'+(p.total/1e9).toFixed(1)+'B</b></td><td>published '+(mk==='mav'?'400B':'109B')+' total</td></tr><tr><td><b>Active per token</b></td><td class="num"><b>'+(p.active/1e9).toFixed(2)+'B</b></td><td>attention + shared + one routed expert (or the dense FFN) + embeddings; published 17B</td></tr>';
    $('l4Rep').innerHTML='<b>Defaults reproduce Meta\'s figures independently</b> from '+A(m.cfg,'config.json')+': '+(mk==='mav'?'400.7B total against "400B"':'107.8B for the text model against "109B"; the rest (about 1.2B) is the vision encoder and projector, not computed here')+', and 17.2B active against "17B" (counting both embedding matrices; without the input embedding table, a lookup rather than compute, it is 16.1B). The temperature formula is Hugging Face\'s implementation ('+A('https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama4/modeling_llama4.py','modeling_llama4.py')+'); Meta\'s announcement names the technique without the formula.'}
  segBind('l4M',m=>{mk=m;draw()});$('l4P').addEventListener('input',draw);draw();let rw=$('l4').clientWidth<560;addEventListener('resize',()=>{const w=$('l4').clientWidth<560;if(w!==rw){rw=w;draw()}});
})();
