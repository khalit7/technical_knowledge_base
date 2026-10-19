// ---- Reading tab: lightning stepper, layer strip, recomputed claims ----
(function(){ // lightning toy: token by token against blocks of B = 2
  if(!$('lt'))return;
  const q=[1,2,1,3],k=[1,1,2,1],v=[2,1,1,3],kv=k.map((x,i)=>x*v[i]);
  const run=[];kv.reduce((s,x,i)=>(run[i]=s+x),0);const o=q.map((x,i)=>x*run[i]);
  const intra=[2,6,2,15],inter=[0,0,3,9];
  const CAP={tok:['Token 1: the running sum is k₁v₁ = 2, so o₁ = 1 × 2 = 2.','Token 2 must wait for token 1\'s sum: 2 + 1 = 3, so o₂ = 2 × 3 = 6.','Token 3 waits for token 2: 3 + 2 = 5, so o₃ = 1 × 5 = 5.','Token 4 waits for token 3: 5 + 3 = 8, so o₄ = 3 × 8 = 24. Four dependent steps for four tokens: on a GPU that serial chain is the bottleneck.'],
    blk:['Block 1 (tokens 1 and 2) computes both outputs at once with the masked product inside the block: o₁ = 1 × 2 = 2, o₂ = 2 × (2 + 1) = 6. There is no earlier state yet.','Only the state crosses the boundary: S₁ = k₁v₁ + k₂v₂ = 3 (green). Nothing else from block 1 is kept.','Block 2 computes both outputs at once: the intra-block part (1 × 2 = 2 and 3 × (2 + 3) = 15) plus the inter-block part q × S₁ (1 × 3 = 3 and 3 × 3 = 9). So o₃ = 5 and o₄ = 24, the same as token by token, in two block steps instead of four token steps.']};
  const st={m:'tok',s:0};
  function draw(){const tok=st.m==='tok',n=tok?4:3,s=st.s;
    const shown=i=>tok?i<=s:(s>=2?true:(i<2));
    const cell=(val,i,cls)=>'<td class="'+(cls||'')+'">'+val+'</td>';
    let h='<tr><th></th>'+[1,2,3,4].map(t=>'<th>t = '+t+(tok?'':(t<3?' (block 1)':' (block 2)'))+'</th>').join('')+'</tr>';
    h+='<tr><th>q</th>'+q.map(x=>cell(x)).join('')+'</tr><tr><th>k</th>'+k.map(x=>cell(x)).join('')+'</tr><tr><th>v</th>'+v.map(x=>cell(x)).join('')+'</tr><tr><th>k·v</th>'+kv.map(x=>cell(x)).join('')+'</tr>';
    if(tok){h+='<tr><th>running sum</th>'+run.map((x,i)=>cell(i<=s?x:'',i,i===s?'hl':'')).join('')+'</tr>';
      h+='<tr><th>o</th>'+o.map((x,i)=>cell(i<=s?x:'',i,i===s?'hl':'')).join('')+'</tr>'}
    else{const cur=i=>(s===0&&i<2)||(s===2&&i>=2);
      h+='<tr><th>intra-block</th>'+intra.map((x,i)=>cell(shown(i)?x:'',i,cur(i)?'in':'')).join('')+'</tr>';
      h+='<tr><th>q × state</th>'+inter.map((x,i)=>cell(shown(i)?x:'',i,cur(i)&&i>=2?'st':'')).join('')+'</tr>';
      h+='<tr><th>state handed on</th>'+[0,1,2,3].map(i=>cell(i===1&&s>=1?'S₁ = 3':(i===3&&s>=2?'S₂ = 8':''),i,(i===1&&s===1)?'st':'')).join('')+'</tr>';
      h+='<tr><th>o</th>'+o.map((x,i)=>cell(shown(i)?x:'',i,cur(i)?'hl':'')).join('')+'</tr>'}
    $('ltTab').innerHTML=h;$('ltCap').textContent=CAP[st.m][s];
    $('ltCnt').textContent='Step '+(s+1)+' of '+n+(tok?' · dependent steps so far: '+(s+1):' · block steps so far: '+(s===0?1:2));
    $('ltBack').disabled=s===0;$('ltFwd').disabled=s===n-1}
  segBind('ltM',m=>{st.m=m;st.s=0;draw()});
  $('ltFwd').addEventListener('click',()=>{st.s=Math.min((st.m==='tok'?4:3)-1,st.s+1);draw()});
  $('ltBack').addEventListener('click',()=>{st.s=Math.max(0,st.s-1);draw()});
  draw();
})();

(function(){ // layer strip: which layers grow with context
  if(!$('ls'))return;
  const T=[4096,32768,131072,196608,204800,524288,1048576,2097152,4194304];
  const mk=(id,types)=>{const el=$(id);el.style.gridTemplateColumns='repeat('+types.length+',minmax(0,1fr))';el.innerHTML=types.map((t,i)=>'<span class="'+t+'" data-i="'+i+'" title="layer '+(i+1)+'"></span>').join('')};
  const A=[...Array(80)].map((_,i)=>(i%8===7)?'sm':'lin'),B=[...Array(62)].map(()=>'sm'),C=[...Array(60)].map((_,i)=>i<3?'fa':'msa');
  mk('lsA',A);mk('lsB',B);mk('lsC',C);
  const per=(t,n)=>t==='lin'?64*128*128*2:t==='sm'?2*8*128*2*n:t==='fa'?2*4*128*2*n:2*4*128*2*n+128*2*n;
  const NAME={lin:'lightning layer: one 64 × 128 × 128 state, fixed',sm:'softmax GQA layer, 8 KV heads: 4 KiB per token',fa:'full-attention GQA layer, 4 KV heads: 2 KiB per token',msa:'MSA layer: 2 KiB of keys and values plus 256 bytes of index key per token (BF16 assumed)'};
  let sel=null;
  function draw(){const n=T[+$('lsT').value];$('lsTv').textContent=fmt(n)+' tokens';
    const rows=[['lsA',A,'MiniMax-01',4194304],['lsB',B,'M2',196608],['lsC',C,'M3',1048576]];
    let mx=0;rows.forEach(r=>r[1].forEach(t=>mx=Math.max(mx,per(t,n))));
    rows.forEach(r=>{$(r[0]).querySelectorAll('span').forEach((s,i)=>{const b=per(r[1][i],n);s.style.opacity=(0.35+0.65*Math.sqrt(b/mx)).toFixed(2);s.classList.toggle('on',sel&&sel[0]===r[0]&&sel[1]===i)})});
    const tot=r=>r[1].reduce((s,t)=>s+per(t,n),0);
    $('lsOut').innerHTML=rows.map(r=>stat(r[2]+' per sequence',fmtBytes(tot(r)),n>r[3]?'beyond its '+(r[2]==='MiniMax-01'?'4M claimed':fmt(r[3]))+' window':(r[2]==='MiniMax-01'?'KV cache of 10 layers + 140 MiB state':r[2]==='M2'?'62 layers × 4 KiB per token':'60 × 2 KiB + 57 × 256 B per token'))).join('');
    if(sel){const r=rows.find(x=>x[0]===sel[0]),t=r[1][sel[1]];$('lsCap').innerHTML='<b>'+r[2]+', layer '+(sel[1]+1)+'</b>: '+NAME[t]+'. At this context it holds '+fmtBytes(per(t,n))+'.'}
    else $('lsCap').textContent='Shade shows each layer\'s memory at this context relative to the largest layer shown (square-root scale). Click a layer for its formula.'}
  ['lsA','lsB','lsC'].forEach(id=>$(id).addEventListener('click',e=>{const s=e.target.closest('span');if(!s)return;sel=[id,+s.dataset.i];draw()}));
  $('lsT').addEventListener('input',draw);draw();
})();

(function(){ // SWA ablation: hybrid sliding window minus full attention
  if(!$('sw'))return;
  const D={pt:[['HELMET ICL',75.8,72.7],['MMLU',85.5,85.6],['MATH',60.3,60.3],['RULER 128K CWE',90.0,72.0],['RULER 128K MQ',99.0,93.0],['RULER 32K CWE',99.0,99.0],['RULER 32K MQ',99.0,99.0],['MTOB K-e Bleurt',60.0,45.0],['MTOB e-k ChrF',44.8,27.2]],
    sft:[['AIME 2025',86.7,86.7],['ARC-AGI-1',38.9,39.6],['GPQA-Diamond',75.3,72.7],['MMLU-Pro',80.5,80.1],['IFBench',23.1,27.2],['SWE-verified',54.7,50.2],['Terminal-Bench',26.7,23.8],['BrowseComp-zh',32.8,28.7],['GAIA-103',53.4,51.5],['XBench-ds',58.0,63.0],['τ²-Bench retail',62.3,67.5],['τ²-Bench telecom',32.5,21.0]]};
  function draw(m){const rows=D[m],W=vw('swSvg',640,420),rh=24,pt=22,H=pt+rows.length*rh+8,l=W<500?110:150,r=W<500?112:150,fs=W<500?10.5:11.5,cx=l+(W-l-r)/2,sc=(W-l-r)/2/18;
    let s='<line x1="'+cx+'" x2="'+cx+'" y1="'+(pt-6)+'" y2="'+(H-4)+'" stroke="var(--mute)"/>';
    s+='<text x="'+(cx-6)+'" y="12" font-size="10.5" text-anchor="end" fill="var(--mute)">hybrid SWA worse</text><text x="'+(cx+6)+'" y="12" font-size="10.5" fill="var(--mute)">better</text>';
    [-15,-10,-5,5].forEach(t=>s+='<line x1="'+(cx+t*sc)+'" x2="'+(cx+t*sc)+'" y1="'+(pt-4)+'" y2="'+(H-4)+'" stroke="var(--line)"/><text x="'+(cx+t*sc)+'" y="'+(H)+'" font-size="9.5" text-anchor="middle" fill="var(--mute)">'+(t>0?'+':'−')+Math.abs(t)+'</text>');
    rows.forEach((x,i)=>{const y=pt+i*rh,d=+(x[2]-x[1]).toFixed(1),w=Math.abs(d)*sc,c=d<0?'var(--bad)':'var(--good)';
      s+='<text x="'+(l-8)+'" y="'+(y+15)+'" font-size="'+fs+'" text-anchor="end">'+x[0]+'</text>';
      s+='<rect x="'+(d<0?cx-w:cx)+'" y="'+(y+5)+'" width="'+Math.max(w,d?0:1.5)+'" height="13" rx="2" fill="'+(d?c:'var(--mute)')+'"/>';
      s+='<text x="'+(W-r+8)+'" y="'+(y+15)+'" font-size="11" fill="var(--mute)">'+x[1].toFixed(1)+' → '+x[2].toFixed(1)+' <tspan fill="'+(d?c:'var(--mute)')+'" font-weight="600">('+(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(1)+')</tspan></text>'});
    $('swSvg').innerHTML=svgEl(W,H+4,s,'Hybrid sliding-window attention minus full attention, '+(m==='pt'?'pretraining':'after fine-tuning'))}
  segBind('swM',draw);draw('pt');
})();

(function(){ // recomputed claim cells
  if(!$('rpA'))return;const n=1048576;
  $('rpA').innerHTML=eq12(n).toFixed(1)+'×';
  const full=2*4*128*2*n,msa=128*2*n+4*SELT*2*128*2;
  $('rpB').innerHTML=(full/msa).toFixed(1)+'× fewer bytes read per decoded token per layer (2 GiB against 260 MiB); eq. 12 gives '+eq12(n).toFixed(1)+'× in compute, above the 14.2× measured prefill';
  $('rpC').innerHTML=(compB('m2',n)/compB('m3',n)).toFixed(1)+'× (all 60 sparse: '+(compB('m2',n)/compB('m3',n,{all:true})).toFixed(1)+'×)';
})();
