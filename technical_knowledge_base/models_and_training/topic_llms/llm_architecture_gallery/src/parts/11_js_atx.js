// ---- Attention ladder: one token through one layer, the same shape and context for every variant ----
(function(){
  const card=$('atx');if(!card)return;
  const DUR=3600,MOVE=0.6,NE=16,TK=131072;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // per: numbers stored per token per layer; c: cells (256 numbers) per row; lin: fixed state instead of a cache
  const VAR={mha:{per:8192,c:32,col:'var(--c2)'},gqa:{per:2048,c:8,col:'var(--c2)'},mqa:{per:256,c:1,col:'var(--c2)'},mla:{per:576,c:2.25,col:'var(--good)'},
    swa:{per:2048,c:8,col:'var(--c2)',win:8},gdn:{per:0,lin:1,col:'var(--c5)'},kda:{per:0,lin:1,col:'var(--c5)'}};
  const ST=32*128*128;
  const I='<i>',E='</i>';
  const S1='Token '+I+'t'+E+' enters one attention layer and is projected to 32 query heads of 128 numbers (the squares on top). ';
  const CAP={
   mha:[['A token arrives',S1+'Behind it, the cache already holds the keys and values of 16 earlier tokens, one row each.'],
    ['Project a key and a value per head','Multi-head attention gives every query head its own key and value: 32 × (128 + 128) = 8,192 numbers, 32 cells.'],
    ['Write 8,192 numbers','All of it is appended: the cache grows by one 32-cell row per token in every layer, 16 KiB per token per layer in BF16.'],
    ['Decode: each head reads its own column','Query head '+I+'i'+E+' reads KV head '+I+'i'+E+' of every earlier token: 17 × 8,192 = 139,264 numbers moved for this one token in this one layer. Decode speed is bound by this read.'],
    ['At 128K tokens','The row repeats 131,072 times: 2 GiB per layer in BF16. This footprint is the baseline, drawn dashed behind every other variant.']],
   gqa:[['A token arrives',S1+'The query heads are coloured by group: 8 groups of 4.'],
    ['Project 8 KV heads','Each group of 4 query heads shares one key and one value: 8 × 256 = 2,048 numbers, 8 cells (Llama 3.1 8B\'s shape).'],
    ['Write 2,048 numbers','The row is 8 cells where MHA\'s is 32 (dashed): 4 KiB per token per layer in BF16.'],
    ['Decode: four heads share a column','Query heads 0 to 3 read KV head 0, heads 4 to 7 read KV head 1, and so on: '+I+'g'+E+'('+I+'i'+E+') = ⌊'+I+'i'+E+' / 4⌋. 17 × 2,048 = 34,816 numbers read.'],
    ['At 128K tokens','512 MiB per layer, a quarter of MHA, for a small expressivity loss: why GQA became the default.']],
   mqa:[['A token arrives',S1],
    ['Project one shared key and value','Multi-query attention keeps a single KV head for all 32 query heads: 256 numbers, one cell.'],
    ['Write 256 numbers','The row is a single cell: 512 bytes per token per layer.'],
    ['Decode: every head reads the same column','All 32 query heads read the one KV head: 17 × 256 = 4,352 numbers.'],
    ['At 128K tokens','64 MiB per layer, 32 times less than MHA, at the largest quality loss of the three (GQA paper).']],
   mla:[['A token arrives',S1],
    ['Project into a latent','The down-projection makes one 512-number latent '+I+'c<sub>t</sub>'+E+', plus a 64-number decoupled RoPE key that carries position: 576 numbers, 2.25 cells, shared by all heads (DeepSeek V3\'s sizes).'],
    ['Write 576 numbers','1,152 bytes per token per layer: 14 times less than MHA at this 32-head shape (8,192 / 576), 57 times less at DeepSeek V3\'s own 128 heads.'],
    ['Decode: every head reads the latent','With the up-projections folded into the query and output projections, all 32 heads score directly against the same 576-number entry, like MQA but wider: 17 × 576 = 9,792 numbers.'],
    ['At 128K tokens','144 MiB per layer: between MQA and GQA, at a quality DeepSeek reports at or above MHA.']],
   swa:[['A token arrives',S1+'This layer keeps only the most recent '+I+'W'+E+' tokens; here '+I+'W'+E+' = 8 (illustrative), so 8 of the 16 earlier tokens have already been evicted (dashed).'],
    ['Project as GQA','A windowed layer stores the same row as its base variant: 8 KV heads, 2,048 numbers.'],
    ['Write and evict','The new row is appended and the oldest kept row leaves the window: the cache stays at 8 rows however long the context grows.'],
    ['Decode reads only the window','8 × 2,048 = 16,384 numbers, at any context length. Anything older reaches this token only through a global layer.'],
    ['At 128K tokens','A 4,096-token window (OLMo 3\'s) caps this layer at 16 MiB whatever the context, while the global layers keep growing. The gallery\'s per-token figure counts this layer at full cost.']],
   gdn:[['A token arrives',S1+'A Gated DeltaNet layer keeps no cache: earlier tokens live only in a fixed state of 32 heads × 128 × 128 numbers (Qwen3-Next\'s shape), drawn to the same scale, 2,048 cells.'],
    ['Project keys, values and gates','Per head a key and a value of 128 each (8,192 numbers, as much as MHA projects) plus a decay '+I+'α<sub>t</sub>'+E+' and a write strength '+I+'β<sub>t</sub>'+E+'. None of it is kept as such.'],
    ['Update the state in place',I+'S'+E+' ← '+I+'α<sub>t</sub> S'+E+'('+I+'I'+E+' − '+I+'β<sub>t</sub>'+E+' '+I+'k k'+E+'<sup>⊤</sup>) + '+I+'β<sub>t</sub> v k'+E+'<sup>⊤</sup>: the whole state fades by '+I+'α<sub>t</sub>'+E+', the slot under '+I+'k<sub>t</sub>'+E+' is erased and '+I+'v<sub>t</sub>'+E+' written there (highlighted row). The state does not grow.'],
    ['Decode reads the state','Each query head multiplies its own 128 × 128 block: 524,288 numbers, the same at token 17 or token one million. At 17 tokens that is more than MHA\'s cache (dashed); the state equals MHA\'s cache at 64 tokens and GQA\'s at 256.'],
    ['At 128K tokens','Still 1 MiB per layer, against 2 GiB for MHA. The price is a lossy summary, which is why hybrids keep about one full-attention layer in four.']],
   kda:[['A token arrives',S1+'A Kimi Delta Attention layer, like Gated DeltaNet, keeps a fixed state: 32 heads × 128 × 128 (Kimi Linear\'s shape), 2,048 cells.'],
    ['Project keys, values and a gate vector','The same projections as Gated DeltaNet, except the decay is a vector '+I+'α<sub>t</sub>'+E+' with one rate per key channel, not one scalar per head.'],
    ['Update with a channel-wise gate',I+'S'+E+' ← '+I+'S'+E+' Diag('+I+'α<sub>t</sub>'+E+')('+I+'I'+E+' − '+I+'β<sub>t</sub> k k'+E+'<sup>⊤</sup>) + '+I+'β<sub>t</sub> v k'+E+'<sup>⊤</sup>: each column of every head\'s block fades at its own rate (uneven shading), so some channels hold long-range memory while others refresh quickly.'],
    ['Decode reads the state','524,288 numbers, as for Gated DeltaNet: the gate changes what the state remembers, not its size.'],
    ['At 128K tokens','1 MiB per layer. Kimi Linear interleaves 3 KDA layers per MLA layer and reports beating full MLA with up to 75% less KV cache.']]};
  const WIDE={W:720,H:452,P:7,C:6,cx:130,cy:84,qy:44,stg:[400,84+16*7],lstg:[600,84,4],bars:364};
  const NAR={W:360,H:400,P:5,C:4,cx:20,cy:70,qy:40,stg:[20,70+17*5+10],lstg:[20,70+32*5+34,32],bars:300};
  const st={m:'gqa',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+(+op).toFixed(3)+'">'+s+'</g>';
  function row(L,x,y,n,fill,op){let d='';const f=Math.floor(n),P=L.P,C=L.C;for(let i=0;i<f;i++)d+='M'+(x+i*P)+' '+y+'h'+C+'v'+C+'h-'+C+'z';
    const fr=n-f;if(fr>0)d+='M'+(x+f*P)+' '+y+'h'+(C*fr).toFixed(2)+'v'+C+'h-'+(C*fr).toFixed(2)+'z';
    return d?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':''}
  const dashRow=(L,x,y,n,col)=>'<rect x="'+(x-.5)+'" y="'+(y-.5)+'" width="'+(n*L.P-L.P+L.C+1)+'" height="'+(L.C+1)+'" fill="none" stroke="'+col+'" stroke-dasharray="2 2" stroke-width=".8"/>';
  const KD=[];{let a=7;for(let i=0;i<8;i++){a=(a*1103515245+12345)%2147483648;KD.push(.25+.7*(a/2147483648))}}
  function draw(){
    const L=card.clientWidth<560?NAR:WIDE,k=st.k,e=RM?1:ease(cl(st.t/MOVE)),ph=RM?-1:(st.t*2.2)%1,v=VAR[st.m],P=L.P,C=L.C;
    let s='';const cx=L.cx,cy=L.cy,qc='var(--acc)';
    // query heads
    const qOp=k===0?.35+.65*e:.9,nq=32;
    for(let i=0;i<nq;i++){const g=st.m==='gqa'||st.m==='swa'?Math.floor(i/4)%2:0;s+='<rect x="'+(cx+i*P)+'" y="'+L.qy+'" width="'+C+'" height="'+C+'" rx="1" fill="'+(g?'var(--c6)':qc)+'" opacity="'+qOp+'"/>'}
    s+=T(cx,L.qy-6,'h<tspan font-size="8">t</tspan> → 32 query heads (1 square = 1 head)',{fs:10.5,c:'var(--mute)'});
    // MHA footprint, dashed, behind every other variant
    let held=0;
    if(!v.lin){
      for(let r=0;r<NE;r++){const y=cy+r*P;
        if(v.win){const lo=NE-v.win;if(r<lo){s+=dashRow(L,cx,y,v.c,'var(--mute)');continue}
          if(r===lo){const op=k<2?1:k===2?1-e:0;if(op>0){s+=row(L,cx,y,v.c,v.col,.55*op);held+=op}else s+=dashRow(L,cx,y,v.c,'var(--mute)');continue}}
        s+=row(L,cx,y,v.c,v.col,.55);held++}
      // the new entry: projected at the staging spot, then written into its row
      const ny=cy+NE*P;
      if(k>=1){const u=k===2?e:(k>2?1:0),x=lerp(L.stg[0],cx,u),y=lerp(L.stg[1],ny,u),n=k===1?v.c*cl((e-.2)/.8):v.c;
        s+=row(L,x,y,n,v.col,1);if(k===1)s+=T(L.stg[0],L.stg[1]+C+12,'new entry: '+fmt(v.per)+' numbers',{fs:10.5,c:v.col});
        if(k>=2)held+=k===2?e:1}
      s+=T(cx-6,ny+C,'t',{a:'end',fs:10,c:'var(--mute)'})+T(cx-6,cy+C,'1',{a:'end',fs:10,c:'var(--mute)'});
      if(v.win)s+=T(cx+v.c*P+6,cy+5*P,'evicted',{fs:10,c:'var(--mute)'})+T(cx+v.c*P+6,cy+12*P,'window W = 8',{fs:10,c:v.col});
      if(st.m==='mla')s+=T(cx+3*P+4,cy+12*P,'512 latent + 64 RoPE key',{fs:10,c:v.col});
    }else{
      // fixed state: 32 head blocks of 8 x 8 cells (128 x 128 numbers each)
      const bw=8*P+2;let paths=Array(8).fill('');const kd=st.m==='kda';
      const amp=k===2?cl(e*1.6):0,dec=1-.4*amp;
      for(let b=0;b<32;b++){const bx0=cx+(b%8)*bw,by0=cy+Math.floor(b/8)*bw;
        for(let c=0;c<8;c++)for(let r=0;r<8;r++){paths[c]+='M'+(bx0+c*P)+' '+(by0+r*P)+'h'+(C-.5)+'v'+(C-.5)+'h-'+(C-.5)+'z'}}
      paths.forEach((d,c)=>{const f=kd?lerp(1,KD[c],amp):dec;s+='<path d="'+d+'" fill="'+v.col+'" fill-opacity="'+(.5*f).toFixed(3)+'"/>'});
      if(k===2&&e>.45){let d='';const rr=3;for(let b=0;b<32;b++){const bx0=cx+(b%8)*bw,by0=cy+Math.floor(b/8)*bw;d+='M'+bx0+' '+(by0+rr*P)+'h'+(8*P-1)+'v'+C+'h-'+(8*P-1)+'z'}s+=G(cl((e-.45)*3),'<path d="'+d+'" fill="var(--c2)"/>')}
      s+=T(cx,cy+32*P+(P<6?14:18),'fixed state: 32 heads × 128 × 128 = 524,288 numbers (2,048 cells)',{fs:10.5,c:v.col});
      if(k>=1&&k<=2){const n=32,cols=L.lstg[2],u=k===2?e:0,x0=L.lstg[0],y0=L.lstg[1],tx=cx+4*bw,ty=cy+2*bw;let d='';const shown=k===1?Math.round(n*cl((e-.2)/.8)):n;
        for(let i=0;i<shown;i++){const x=lerp(x0+(i%cols)*P,tx,u),y=lerp(y0+Math.floor(i/cols)*P,ty,u);d+='M'+x.toFixed(1)+' '+y.toFixed(1)+'h'+C+'v'+C+'h-'+C+'z'}
        s+=G(k===2?1-e:1,'<path d="'+d+'" fill="var(--c2)"/>'+(k===1?T(x0,y0-6,'k, v: 8,192',{fs:10,c:'var(--c2)'}):''))}
    }
    if(st.m!=='mha')s+='<rect x="'+(cx-1.5)+'" y="'+(cy-1.5)+'" width="'+(32*P+2)+'" height="'+(17*P+2)+'" fill="none" stroke="'+(v.lin?'var(--ink)':'var(--mute)')+'" stroke-dasharray="4 3"/>'+(v.lin?'':T(cx+32*P+4,cy+8,'MHA: 17 × 32 cells',{fs:10,c:'var(--mute)'}));
    // decode: who reads what
    if(k===3){const op=cl(e*2);let ln='';
      for(let i=0;i<32;i++){const x1=cx+i*P+C/2,y1=L.qy+C;let tx,ty=cy-3;
        if(v.lin){const b=i;tx=cx+(b%8)*(8*P+2)+4*P;ty=cy+Math.floor(b/8)*(8*P+2)}
        else{const col=st.m==='mha'?i:(st.m==='gqa'||st.m==='swa')?Math.floor(i/4):0;tx=st.m==='mla'?cx+1.1*P:cx+col*P+C/2}
        ln+='<line x1="'+x1+'" y1="'+y1+'" x2="'+tx.toFixed(1)+'" y2="'+ty.toFixed(1)+'" stroke="'+qc+'" stroke-width=".9" opacity="'+(v.lin?.3:.55)+'"/>';
        if(ph>=0)ln+='<circle cx="'+lerp(x1,tx,ph).toFixed(1)+'" cy="'+lerp(y1,ty,ph).toFixed(1)+'" r="1.8" fill="'+qc+'"/>'}
      if(!v.lin){const r0=v.win?NE-v.win+1:0;ln+='<rect x="'+(cx-2)+'" y="'+(cy+r0*P-2)+'" width="'+(Math.ceil(v.c)*P+2)+'" height="'+((17-r0)*P+2)+'" fill="none" stroke="'+qc+'" stroke-width="1.4" rx="2"/>'}
      else ln+='<rect x="'+(cx-2)+'" y="'+(cy-2)+'" width="'+(64*P+16)+'" height="'+(32*P+8)+'" fill="none" stroke="'+qc+'" stroke-width="1.4" rx="2"/>';
      s+=G(op,ln)}
    // to-scale bars: bytes per layer at 128K
    const bars=[['MHA',2*GiB,'mha'],['GQA (8)',512*MiB,'gqa'],['MLA',144*MiB,'mla'],['MQA',64*MiB,'mqa'],['Window 4,096',16*MiB,'swa'],['Recurrent state',1*MiB,'lin']];
    const by=L.bars,x0=cx<60?L.cx+96:118,x1=L.W-70,wb=x1-x0,cur=v.lin?'lin':st.m;
    s+=T(L.cx<60?L.cx:14,by-8,'This layer at 128K tokens (BF16), to scale',{fs:11,c:'var(--mute)'});
    bars.forEach((b,i)=>{const y=by+i*13,on=b[2]===cur,op=k===4?(on?1:.45):(on?.85:.3);
      s+=G(op,T(L.cx<60?L.cx:14,y+9,b[0],{fs:10.5})+'<rect x="'+x0+'" y="'+y+'" width="'+wb+'" height="9" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+Math.max(1.2,wb*b[1]/(2*GiB)).toFixed(1)+'" height="9" rx="2" fill="'+(on?VAR[st.m].col:'var(--mute)')+'"/>'+T(x0+Math.max(1.2,wb*b[1]/(2*GiB))+5,y+8.5,fmtBytes(b[1]),{fs:10}))});
    $('atxSvg').innerHTML=svgEl(L.W,L.H,s,'One token through one '+st.m+' attention layer, step '+(k+1));
    if(st.lk!==k||st.lm!==st.m){const S=CAP[st.m][k];$('atxStep').innerHTML='Step '+(k+1)+' of 5: '+S[0];$('atxCap').innerHTML=S[1];st.lk=k;st.lm=st.m}
    const wrote=k<2?0:k===2?e:1,per=v.per,rowsHeld=v.lin?0:(v.win?v.win:NE+wrote);
    const at128=v.lin?ST*2:(v.win?per*2*4096:per*2*TK);
    $('atxCnt').innerHTML=stat('Stored for this token, this layer',v.lin?'0':fmt(Math.round(per*wrote)),v.lin?'the state is updated in place':fmt(per)+' numbers, '+fmtBytes(per*2)+' in BF16')+
      stat('Held by this layer now',fmt(Math.round(v.lin?ST:per*(v.win?v.win:(NE+wrote)))),v.lin?'numbers (fixed state)':'numbers, '+(v.win?'8 tokens':'17 tokens at most')+' in the picture')+
      stat('Read by this token at decode',k>=3?fmt(v.lin?ST:per*(v.win?v.win:17)):'…','numbers, this layer')+
      stat('This layer at 128K',fmtBytes(at128),v.lin?'fixed, any context':v.win?'capped by a 4,096 window':fmt(per)+' × 131,072 × 2 bytes');
    const sc=$('atxScrub');sc.value=Math.round((k+st.t)*100);
    const pb=$('atxPlay'),end=k===4&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;if(st.t>=1){if(st.k<4){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('atxPlay').addEventListener('click',()=>{if(st.play){pause()}else{if(st.k===4&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<4){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('atxFwd').addEventListener('click',()=>{pause();st.k=Math.min(4,st.k+1);st.t=1;draw()});
  $('atxBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('atxScrub').addEventListener('input',e=>{pause();const v=+e.target.value;st.k=Math.min(4,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('atxSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('atxM');seg.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false');b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM)st.play=true;draw();kick()})});
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  onTab('t-read',()=>{draw();kick()});
  let rw=card.clientWidth<560;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});
  draw();
})();
