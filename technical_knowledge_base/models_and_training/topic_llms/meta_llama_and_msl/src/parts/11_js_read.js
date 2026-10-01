// ---- Reading tab: 4D mesh, interruptions, AA chart, Llama 4 layer strip ----
(function(){ // 4D parallelism, Llama 3 paper Table 4
  if(!$('pp'))return;
  const R=[[8192,8,1,16,64,8192,32,430,43],[16384,8,1,16,128,8192,16,400,41],[16384,8,16,16,8,131072,16,380,38]];
  const PEAK=989; // H100 SXM dense BF16 TFLOPs: half NVIDIA's 1,979 with sparsity
  function draw(i){const [g,tp,cp,pp,dp,sl,b,tf,mfu]=R[i];const lg=Math.log2;const tot=lg(g);
    const parts=[['TP',tp,'var(--c1)','tensor: splits each matrix across the 8 GPUs of a server (NVLink)'],['CP',cp,'var(--c6)','context: splits a long sequence'],['PP',pp,'var(--c4)','pipeline: splits the 126 layers into stages'],['DP',dp,'var(--c3)','data (FSDP): copies of the rest, each on its own batch']];
    $('ppMesh').innerHTML='<div class="mesh">'+parts.map(([n,v,c,t])=>v>1?'<span style="flex:'+lg(v)+';background:'+c+'" title="'+t+'">'+n+' '+v+'</span>':'').join('')+'</div><div class="small mute">Widths are log<sub>2</sub> of each factor, so they add up like the factors multiply: '+parts.map(p=>p[1]).join(' × ')+' = '+fmt(tp*cp*pp*dp)+' GPUs. Hover a block for what it splits.</div>';
    const toks=sl*b*dp,days=3.8e25/(g*tf*1e12)/86400;
    $('ppOut').innerHTML=stat('GPUs',fmt(g),'TP × CP × PP × DP')+stat('Tokens per batch',(toks/2**20).toFixed(1)+'M',fmt(sl)+' × '+b+' per DP group × '+dp+' groups')+stat('Throughput per GPU',tf+' TFLOPs','BF16 MFU '+mfu+'% (paper); '+(100*tf/PEAK).toFixed(1)+'% of 989')+stat('Days for 3.8×10²⁵ FLOPs at this rate',days.toFixed(0),'pure compute, no restarts (derived)');
    $('ppHow').innerHTML='Published: GPU count, the four factors, sequence length, batch per DP group, tokens per batch (16M), TFLOPs per GPU and MFU ('+A('https://arxiv.org/html/2407.21783v3','Llama 3 paper, Table 4')+'). Derived here: the product of the factors and the tokens per batch reproduce the table independently; MFU recomputed against the H100\'s dense BF16 peak of 989 TFLOPs (half the '+A('https://www.nvidia.com/en-us/data-center/h100/','datasheet\'s')+' 1,979 with sparsity) gives 43.5%, 40.4% and 38.4%, so the paper\'s 41% for the middle row is one point above 400/989 (its TFLOPs are rounded). The days are the stated budget divided by the row\'s throughput.'}
  segBind('ppS',m=>draw(+m));draw(0);
})();
(function(){ // interruptions, Llama 3 paper Table 5
  if(!$('ir'))return;
  const T=[['Faulty GPU','GPU',148],['GPU HBM3 memory','GPU',72],['Software bug','Dependency',54],['Network switch or cable','Network',35],['Host maintenance (unplanned)','Unplanned maintenance',32],['GPU SRAM memory','GPU',19],['GPU system processor','GPU',17],['NIC','Host',7],['NCCL watchdog timeouts','Unknown',7],['Silent data corruption','GPU',6],['GPU thermal interface and sensor','GPU',6],['SSD','Host',3],['Power supply','Host',3],['Server chassis','Host',2],['IO expansion board','Host',2],['Dependency','Dependency',2],['CPU','Host',2],['System memory','Host',2]];
  const CAT={GPU:'var(--c1)',Host:'var(--c6)',Network:'var(--c4)','Unplanned maintenance':'var(--c5)',Dependency:'var(--c2)',Unknown:'var(--dim)'};
  const on={GPU:true,Host:true,Network:false,"Unplanned maintenance":true,Dependency:false,Unknown:false};
  $('irC').innerHTML='<span class="small mute" style="align-self:center">Count as hardware:</span>'+Object.keys(CAT).map(c=>'<label class="chk"><input type="checkbox" data-c="'+c+'"'+(on[c]?' checked':'')+'> <span class="legsq" style="background:'+CAT[c]+'"></span>'+c+'</label>').join('');
  function draw(){const tot=419,mx=148;let hw=0;
    $('irBars').innerHTML=T.map(([n,c,v])=>{if(on[c])hw+=v;return '<div class="row'+(on[c]?' hl':'')+'"><div class="nm" title="'+n+'">'+n+'</div><div class="track"><div class="fill" style="width:'+(100*v/mx)+'%;background:'+CAT[c]+';opacity:'+(on[c]?1:.35)+'"></div></div><div class="val">'+v+' · '+(100*v/tot).toFixed(1)+'%</div></div>'}).join('');
    $('irSum').innerHTML='Ticked categories: <b>'+hw+' of 419 = '+(100*hw/tot).toFixed(1)+'%</b>. Meta says "approximately 78%" are "confirmed hardware issues ... or suspected hardware-related issues such as silent data corruption and unplanned individual host maintenance" ('+A('https://arxiv.org/html/2407.21783v3','Llama 3 paper')+'). GPU, host and unplanned maintenance alone give 76.6%; adding the network switches and cables gives 85.0%; the published 78% sits between, so the paper\'s exact grouping is <span class="unc">unconfirmed</span>. GPUs alone, 268 of 419 (64.0%), are the largest single source. The rows sum to 419, the unexpected interruptions; the 47 planned ones are not in the table. One printed figure does not check: the paper gives 30.1% for the 148 faulty GPUs, but every other row is a share of 419 (72 is 17.2%, 54 is 12.9%), and 148 of 419 is 35.3%, so 30.1% looks like a misprint; the bars use 35.3%.'}
  $('irC').querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>{on[x.dataset.c]=x.checked;draw()}));draw();
})();
(function(){ // AA index against cost per task
  if(!$('aa'))return;let mode='v43';
  function draw(){const narrow=$('aa').clientWidth<560,W=narrow?360:760,H=narrow?300:380;
    if(mode==='rel'){const rows=AAREL,pl=narrow?118:170;let s='';const x=v=>pl+(W-pl-50)*(v-55)/(68-55);
      [56,58,60,62,64,66,68].forEach(v=>{s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="20" y2="'+(H-30)+'" stroke="var(--line)"/><text x="'+x(v)+'" y="'+(H-14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
      const rh=(H-60)/rows.length;rows.forEach(([n,v,c],i)=>{const y=26+i*rh+rh/2,m=/Muse/.test(n);s+='<text x="'+(pl-6)+'" y="'+(y+4)+'" font-size="'+(narrow?10:11.5)+'" text-anchor="end"'+(m?' font-weight="600"':' fill="var(--mute)"')+'>'+n+'</text><line x1="'+x(55)+'" x2="'+x(v)+'" y1="'+y+'" y2="'+y+'" stroke="'+(m?'var(--mus)':'var(--dim)')+'" stroke-width="'+(m?3:2)+'"/><circle cx="'+x(v)+'" cy="'+y+'" r="5" fill="'+(m?'var(--mus)':'var(--mute)')+'"/><text x="'+(x(v)+8)+'" y="'+(y+4)+'" font-size="11">'+v+(c?' · $'+c.toFixed(2):'')+'</text>'});
      s+='<text x="'+((pl+W-50)/2)+'" y="'+(H-1)+'" font-size="11" text-anchor="middle" fill="var(--mute)">Intelligence Index at release (version before v4.2), 0 to 100</text>';
      $('aaSvg').innerHTML=svgEl(W,H,s,'Release-time index scores');$('aaLeg').innerHTML='';
      $('aaNote').innerHTML='Artificial Analysis\'s article of 2 September 2026 ('+A('https://artificialanalysis.ai/articles/muse-spark-1-3','Artificial Analysis')+'): only the models it names are shown, with cost per task where it gives one. Not comparable with the v4.3 panel.';return}
    const pl=narrow?40:48,pr=narrow?12:20,pt=14,pb=38;const fr=logFrame({W,H,pl,pr,pt,pb,x:[0.01,10],y:[5,62],xt:[[0.01,'$0.01'],[0.1,'$0.10'],[1,'$1'],[10,'$10']],yt:[],xl:'Cost per Intelligence Index task (log scale)'});
    const ly=v=>pt+(H-pt-pb)*(1-(v-5)/(62-5));let s=fr.s;[10,20,30,40,50,60].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(ly(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="12" y="'+((pt+H-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+H-pb)/2)+')">Intelligence Index v4.3</text>';
    const meta=[],lab=[];AA43.forEach(([n,l,v,c,o])=>{const X=fr.lx(c),Y=ly(v),m=l==='Meta';const col=m?'var(--mus)':(o?'var(--open)':'var(--closed)');
      const sh=o?'<circle cx="'+X+'" cy="'+Y+'" r="'+(m?6:4)+'" fill="'+col+'" fill-opacity="'+(m?1:.55)+'"><title>'+n+': '+v+', $'+c.toFixed(2)+'</title></circle>':'<circle cx="'+X+'" cy="'+Y+'" r="'+(m?5.5:3.6)+'" fill="var(--bg)" stroke="'+col+'" stroke-width="'+(m?2.5:1.5)+'" stroke-opacity="'+(m?1:.7)+'"><title>'+n+': '+v+', $'+c.toFixed(2)+'</title></circle>';
      (m?meta:lab).push(sh);if(m)lab.push('<text x="'+(X+9)+'" y="'+(Y+4)+'" font-size="11" font-weight="600" fill="var(--mus)">'+n.replace(' (high)','')+' '+v+'</text>')});
    // label a few reference points
    [['Claude Opus 5.5 (max with fallback)','Opus 5.5 max'],['GPT-6.1 Sol (max)','GPT-6.1 Sol'],['MiMo-V2.6-Pro','MiMo-V2.6-Pro']].forEach(([k,t])=>{const r=AA43.find(a=>a[0]===k);if(r&&!narrow)lab.push('<text x="'+(fr.lx(r[3])+7)+'" y="'+(ly(r[2])-6)+'" font-size="10.5" fill="var(--mute)">'+t+'</text>')});
    s+=lab.filter(x=>x.startsWith('<circle')).join('')+meta.join('')+lab.filter(x=>x.startsWith('<text')).join('');
    $('aaSvg').innerHTML=svgEl(W,H,s,'Intelligence Index v4.3 against cost per task');
    $('aaLeg').innerHTML='<span><i style="background:var(--mus);height:10px;width:10px;border-radius:50%"></i>Meta</span><span><i style="background:var(--open);height:10px;width:10px;border-radius:50%"></i>open weights (filled)</span><span><i style="border:2px solid var(--closed);height:10px;width:10px;border-radius:50%;background:none"></i>closed (ring)</span>';
    $('aaNote').innerHTML='All 42 runs with a measured v4.3 score and a price, read 1 October 2026 ('+A('https://artificialanalysis.ai/leaderboards/models','leaderboard')+', '+A('https://artificialanalysis.ai/models/muse-spark-1-3','Muse Spark 1.3')+', '+A('https://artificialanalysis.ai/models/muse-glimmer','Muse Glimmer')+'). Glimmer\'s price is Artificial Analysis\'s median across third-party hosts; Muse Spark\'s is Meta\'s API. Hover a point for its name.'}
  segBind('aaV',m=>{mode=m;draw()});draw();let rw=$('aa').clientWidth<560;addEventListener('resize',()=>{const w=$('aa').clientWidth<560;if(w!==rw){rw=w;draw()}});
})();
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
