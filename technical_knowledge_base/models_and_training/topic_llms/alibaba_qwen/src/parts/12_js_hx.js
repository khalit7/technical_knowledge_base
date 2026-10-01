// ---- Hybrid attention explainer: one decoded token through one block of four layers, animated ----
// Three modes on Qwen3.8-Flash-Next's dimensions (config.json): every layer full attention (counterfactual),
// the 3:1 Gated DeltaNet hybrid it was pretrained with, and the hybrid with QSA it ships with.
(function(){
  const card=$('hx');if(!card)return;
  const DUR=3600,MOVE=0.62;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const KVT=2*2*256;            // numbers per token per full-attention layer: K and V, 2 KV heads of 256
  const ST=48*128*128;          // numbers in one Gated DeltaNet layer's state: 48 value heads of 128 x 128
  const IDX=128/4;              // indexer: one 128-dim key per 4-token block, i.e. 32 numbers per token (assumed cached compressed)
  const BUD=2048, NC=512;       // QSA token budget; cells per lane
  const TS=[4096,32768,262144,1000000];
  const st={m:'hyb',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:'',ti:1};
  const T=()=>TS[st.ti];
  const H=(t,c)=>({t,c});
  const tk=()=>fmt(T());
  const SF=()=>[
    H('A token arrives','Token <i>t</i> enters one block of four layers (Flash-Next has 12 such blocks, 48 layers). In this counterfactual all four layers are ordinary softmax attention with Flash-Next\'s head shape, 2 key-value heads of 256, so every earlier token holds 2 × 2 × 256 = 1,024 numbers in every layer. Each grid is one layer\'s memory at '+tk()+' tokens of context, to scale: one square holds '+fmt(T()/NC,T()<NC*10?1:0)+' tokens of cache.'),
    H('Layer 1: append, then read everything','The layer writes the new token\'s key and value, then its query is scored against every earlier key and the values are summed: all '+tk()+' entries, '+fmt(T()*KVT)+' numbers moved from memory for one token in one layer. This read grows with context and is what makes long-context decoding slow.'),
    H('Layers 2 to 4: the same again','Each layer keeps and reads its own full cache. Nothing is shared between layers, so the block reads four times as much.'),
    H('The bill for one block','4 × '+tk()+' × 1,024 = '+fmt(4*T()*KVT)+' numbers read per decoded token per block, and a cache of 48 layers × 1,024 numbers per token for the whole model: 96 KiB per token in 16-bit. Switch to the hybrid to see what three Gated DeltaNet layers do to both numbers.')];
  const SH=()=>[
    H('A token arrives','The same token, the same block, but three of the four layers are now <b>Gated DeltaNet</b>. Each holds a fixed state of 48 value heads × 128 × 128 = 786,432 numbers, drawn in green at the same scale: the cache of 768 tokens. The dashed outline is what a full-attention layer would hold at '+tk()+' tokens.'),
    H('Layer 1, Gated DeltaNet: decay, erase, write','The whole state is multiplied by the learned decay <i>α<sub>t</sub></i>; the delta rule subtracts what the state currently returns for key <b>k</b><sub><i>t</i></sub> and writes the new value <b>v</b><sub><i>t</i></sub> with strength <i>β<sub>t</sub></i>. A write replaces an association instead of piling on top of it, and the state does not grow.'),
    H('Read the state','The output is <b>o</b><sub><i>t</i></sub> = <i>S<sub>t</sub></i><b>q</b><sub><i>t</i></sub>: 786,432 numbers read, whatever the context length. The price is that the state is a lossy summary: exact recall of one early token degrades.'),
    H('Layers 2 and 3: the same, each with its own state','Two more fixed reads of 786,432 numbers. Three layers of four now cost the same at 4K tokens as at 1M.'),
    H('Layer 4, gated attention: append and read every key','The fourth layer keeps exact recall: ordinary softmax attention over all '+tk()+' cached tokens, '+fmt(T()*KVT)+' numbers, with a sigmoid gate multiplied onto each head\'s output. This is the path retrieval and copying travel through.'),
    H('The bill for one block','3 × 786,432 + '+tk()+' × 1,024 = '+fmt(3*ST+T()*KVT)+' numbers read per token per block. The stored cache is a quarter of the all-attention stack\'s (12 layers instead of 48), plus a fixed 54 MiB of states. A state beats the cache it replaces from 786,432 / 1,024 = 768 tokens of context on.')];
  const SQ=()=>[
    H('A token arrives','The model as shipped: the same three Gated DeltaNet layers, and the fourth layer is now <b>Qwen Sparse Attention</b> (QSA), swapped in for full attention at continued pretraining. It stores exactly what the hybrid\'s attention layer stores: every key is kept, because the indexer may pick any of them.'),
    H('Layers 1 to 3: Gated DeltaNet, as before','Three fixed state reads, 3 × 786,432 = 2,359,296 numbers, independent of context.'),
    H('Layer 4 appends its key and value','The new token\'s 1,024 numbers join the cache, plus a 128-number indexer key that is averaged with its three neighbours into one compressed key per micro-block of 4 tokens.'),
    H('Indexer pass: score every micro-block','A small multi-query attention (4 query heads, 1 shared key head of 128) scores all '+fmt(Math.floor(T()/4))+' compressed blocks: '+fmt(T()/4*128)+' numbers, a thirty-second of the cache per token. This pass still grows with context, which is why the measured speedup is far below the selection ratio.'),
    H('Keep the top 512 blocks','The 512 highest-scoring blocks (the budget <i>K</i> = 2,048 tokens over <i>r</i> = 4) are expanded back to their tokens, plus the tokens of the last, unfinished block, which are always kept. At '+tk()+' tokens that is '+(T()>BUD?(100*BUD/T()).toFixed(T()>100000?2:1)+'% of the context':'all of it')+'.'),
    H('Attention reads only those tokens','Core attention (24 query heads, 2 KV heads of 256) reads '+fmt(Math.min(T(),BUD))+' tokens × 1,024 = '+fmt(Math.min(T(),BUD)*KVT)+' numbers instead of '+fmt(T()*KVT)+'. The read no longer grows with context; the indexer pass is now the part that does.'),
    H('The bill for one block','2,359,296 + '+fmt(T()/4*128)+' + '+fmt(Math.min(T(),BUD)*KVT)+' = '+fmt(readQ())+' numbers read, against '+fmt(readH())+' for the hybrid and '+fmt(readF())+' with full attention. Storage is the hybrid\'s: QSA cuts reads and arithmetic, not the cache. Measured at 1M tokens the attention module is 7.6 times faster in prefill and 4.9 times in decode, not the read ratio, because selection and gathering also cost time.')];
  const steps=()=>st.m==='full'?SF():st.m==='hyb'?SH():SQ();
  const readF=()=>4*T()*KVT,readH=()=>3*ST+T()*KVT,readQ=()=>3*ST+T()/4*128+Math.min(T(),BUD)*KVT;
  const storeF=()=>48*T()*KVT,storeH=()=>12*T()*KVT+36*ST,storeQ=()=>storeH()+12*T()*IDX;
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v);
  const T2=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11.5)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.w?' font-weight="600"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+op.toFixed(3)+'">'+s+'</g>';
  // a lane: cols x rows grid; draws cells i in [a,b) with fill
  function cellsRange(L,x,y,a,b,fill,op,hfrac){let d='';const P=L.P,C=L.C;for(let i=a;i<b;i++){const cx=x+(i%L.cols)*P,cy=y+Math.floor(i/L.cols)*P;d+='M'+cx+' '+cy+'h'+C+'v'+C+'h-'+C+'z'}
    let s=d?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':'';
    if(hfrac>0){const i=b,cx=x+(i%L.cols)*P,cy=y+Math.floor(i/L.cols)*P,h=Math.max(1,C*hfrac);s+='<rect x="'+cx+'" y="'+(cy+C-h)+'" width="'+C+'" height="'+h.toFixed(2)+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>'}
    return s}
  function cellList(L,x,y,list,fill,op){let d='';const P=L.P,C=L.C;list.forEach(i=>{const cx=x+(i%L.cols)*P,cy=y+Math.floor(i/L.cols)*P;d+='M'+cx+' '+cy+'h'+C+'v'+C+'h-'+C+'z'});return d?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':''}
  const WIDE={W:660,H:372,cols:64,P:6,C:5,gx:176,lane0:44,lh:66,bx:8,bw:156,bars:322,cnt:'right'};
  const NAR={W:360,H:420,cols:64,P:5.2,C:4.4,gx:13,lane0:50,lh:76,bx:12,bw:336,bars:368,cnt:'below'};
  let selCache={};
  function selected(n){const key=st.ti;if(selCache[key])return selCache[key];const r=mulberry32(7+key),out=new Set([NC-1]);const want=Math.max(1,Math.round(n));let g=0;while(out.size<Math.min(NC,want)&&g<100000){g++;
      // favour a few recent cells and scattered earlier ones, as an indexer would (illustrative positions)
      const u=r();out.add(u<.25?NC-1-Math.floor(r()*24):Math.floor(r()*NC))}
    return selCache[key]=[...out]}
  function draw(){
    const L=card.clientWidth<560?NAR:WIDE,k=st.k,e=RM?1:ease(cl(st.t/MOVE)),m=st.m;
    const cC='var(--c2)',cS='var(--good)',cR='var(--acc)',cI='var(--c6)';
    const lanes=m==='full'?['att','att','att','att']:['gdn','gdn','gdn',m==='qsa'?'qsa':'att'];
    const tpc=T()/NC,stateCells=ST/KVT/tpc,selCells=Math.min(NC,BUD/tpc);
    // which lane is active at this step
    let act=-1;
    if(m==='full')act=k===1?0:k===2?9:-1;
    if(m==='hyb')act=k===1||k===2?0:k===3?8:k===4?3:-1;
    if(m==='qsa')act=k===1?7:k>=2&&k<=5?3:-1;
    let s='';
    s+=T2(L.bx,16,'One block of four layers, one decoded token',{fs:11.5,w:1})+T2(L.bx,31,'context '+tk()+' tokens · one square = '+fmt(tpc,tpc<10?1:0)+' tokens'+(L.cnt==='right'?' of cache in one layer':''),{fs:10.5,c:'var(--mute)'});
    for(let li=0;li<4;li++){
      const ly=L.lane0+li*L.lh,gx=L.gx,gy=L.cnt==='right'?ly+6:ly+22,kind=lanes[li];
      const on=act===li||(act===9&&li>0)||(act===8&&(li===1||li===2))||(act===7&&li<3);
      // layer label box
      const name=kind==='gdn'?'Gated DeltaNet':kind==='qsa'?'QSA':(m==='hyb'?'Gated attention':'Full attention');
      const sub=kind==='gdn'?'fixed state':kind==='qsa'?'indexer, then top blocks':(m==='hyb'?'softmax, every key':'softmax, every key');
      if(L.cnt==='right')s+=bx(L.bx,ly+4,L.bw,44,on?'boxa':'box',['Layer '+(li+1)+': '+name,sub],11.5);
      else s+=T2(L.bx,ly+12,'<tspan font-weight="600">Layer '+(li+1)+': '+name+'</tspan> · '+sub,{fs:11.5,c:on?'var(--acc)':null});
      // outline of a full cache at this context
      const gw=L.cols*L.P-1,gh=(NC/L.cols)*L.P-1;
      s+='<rect x="'+(gx-2)+'" y="'+(gy-2)+'" width="'+(gw+3)+'" height="'+(gh+3)+'" rx="2" fill="none" stroke="var(--mute)" stroke-opacity=".5" stroke-dasharray="'+(kind==='gdn'?'3 3':'0')+'"/>';
      if(kind==='gdn'){
        const n=Math.floor(Math.min(NC,stateCells)),fr=Math.min(NC,stateCells)-n;
        // decay/erase/write pulse on the state while this layer is active
        let op=.85;if(on&&m==='hyb'&&k===1)op=.35+.5*Math.abs(Math.cos(e*Math.PI*2));
        s+=cellsRange(L,gx,gy,0,n,cS,op,fr);
        if(on&&((m==='hyb'&&(k===2||k===3))||(m==='qsa'&&k===1)))s+=cellsRange(L,gx,gy,0,Math.round(n*e),cR,.9,0);
        if(L.cnt==='right')s+=T2(gx+gw+8,gy+12,'state',{fs:10.5,c:cS})+T2(gx+gw+8,gy+25,'786,432',{fs:10.5,c:'var(--mute)'})+T2(gx+gw+8,gy+38,'numbers',{fs:10.5,c:'var(--mute)'});
        else s+=T2(gx+gw,ly+12,'state 786,432',{fs:10.5,c:cS,a:'end'});
      }else{
        s+=cellsRange(L,gx,gy,0,NC,cC,.32,0);
        // new entry appended
        const app=(m==='full'&&on)||(m==='hyb'&&k===4)||(m==='qsa'&&k===2);
        if(app)s+=cellList(L,gx,gy,[NC-1],cC,cl(e*2));
        // reads
        if(kind==='att'&&on){const n=Math.round(NC*(m==='full'&&li>0&&k===2?e:e));s+=cellsRange(L,gx,gy,0,n,cR,.85,0)}
        if(m==='full'&&k===3)s+=cellsRange(L,gx,gy,0,NC,cR,.55,0);
        if(m==='hyb'&&k===5&&kind==='att')s+=cellsRange(L,gx,gy,0,NC,cR,.55,0);
        if(kind==='qsa'){
          if(k===3){const x=gx+gw*e;s+='<rect x="'+gx+'" y="'+gy+'" width="'+(gw*e).toFixed(1)+'" height="'+gh+'" fill="'+cI+'" fill-opacity=".22"/><line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+(gy-3)+'" y2="'+(gy+gh+3)+'" stroke="'+cI+'" stroke-width="2"/>'}
          if(k>=4){const sel=selected(selCells);const n=k===4?Math.round(sel.length*e):sel.length;s+=cellList(L,gx,gy,sel.slice(0,Math.max(1,n)),cR,k===6?.7:.95);
            if(selCells<1)s+=T2(gx+gw,gy-5,'budget = '+(selCells).toFixed(2)+' of a square',{fs:10,c:cR,a:'end'})}
          if(k===3)s+=G(cl(e*2),T2(gx+4,gy+gh/2+4,'scoring '+fmt(Math.floor(T()/4))+' blocks',{fs:11,c:'var(--ink)'}));
        }
        if(L.cnt==='right'){const lab=kind==='qsa'?(k>=4?'reads '+fmt(Math.min(T(),BUD)):'cache'):'cache';s+=T2(gx+gw+8,gy+12,lab,{fs:10.5,c:k>=4&&kind==='qsa'?cR:cC})+T2(gx+gw+8,gy+25,fmt(T()),{fs:10.5,c:'var(--mute)'})+T2(gx+gw+8,gy+38,'tokens',{fs:10.5,c:'var(--mute)'})}
        else s+=T2(gx+gw,ly+12,'cache '+fmt(T())+' tokens',{fs:10.5,c:cC,a:'end'});
      }
    }
    // to-scale bars: numbers read for this token in this block
    const b=L.bars,x0=L.bx+92,x1=L.W-10,wB=x1-x0,mx=readF();
    const isEnd=k===steps().length-1;
    s+=T2(L.bx,b-6,'Read for this token in this block, to scale',{fs:11,c:'var(--mute)'});
    const row=(y,name,val,col,op)=>G(op,T2(L.bx,y+9,name,{fs:11})+'<rect x="'+x0+'" y="'+y+'" width="'+wB+'" height="10" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+Math.max(val?1.2:0,wB*val/mx).toFixed(1)+'" height="10" rx="2" fill="'+col+'"/>'+T2(Math.min(x1-4,x0+Math.max(4,wB*val/mx)+6),y+9,val?fmtN(val):'',{fs:10.5,a:wB*val/mx>wB-70?'end':null,c:wB*val/mx>wB-70?'var(--bg)':null}));
    const cur=cntNow();
    s+=row(b,'Full attention',m==='full'?cur:(isEnd?readF():0),cC,m==='full'||isEnd?1:.35);
    s+=row(b+15,'3:1 hybrid',m==='hyb'?cur:(isEnd&&m!=='full'?readH():0),cS,m==='hyb'||(isEnd&&m!=='full')?1:.35);
    s+=row(b+30,'Hybrid + QSA',m==='qsa'?cur:0,cR,m==='qsa'?1:.35);
    $('hxSvg').innerHTML=svgEl(L.W,L.H,s,'One decoded token through one block of four layers: '+(m==='full'?'full attention':m==='hyb'?'Gated DeltaNet hybrid':'hybrid with Qwen Sparse Attention')+', step '+(k+1));
    if(st.lk!==k||st.lm!==m+st.ti){const S=steps()[k];$('hxStep').innerHTML='Step '+(k+1)+' of '+steps().length+': '+S.t;$('hxCap').innerHTML=S.c;st.lk=k;st.lm=m+st.ti}
    const store=m==='full'?storeF():m==='hyb'?storeH():storeQ();
    $('hxCnt').innerHTML=stat('Read so far, this token, this block',fmtN(cur),fmtBytes(cur*2)+' in 16-bit')+stat('Against full attention',m==='full'?'1 ×':isEnd?(readF()/(m==='full'?readF():m==='hyb'?readH():readQ())).toFixed(1)+' times fewer':'at the last step',m==='full'?'the baseline':'numbers read per block')+stat('Stored for this request, whole model',fmtBytes(store*2),m==='qsa'?'incl. compressed indexer keys (assumed)':'48 layers, 16-bit');
    const n=steps().length,sc=$('hxScrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('hxPlay'),end=k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  function fmtN(v){return v>=1e9?(v/1e9).toFixed(2)+' billion':v>=1e6?(v/1e6).toFixed(v>=1e8?0:1)+' million':fmt(Math.round(v))}
  function cntNow(){const k=st.k,e=RM?1:ease(cl(st.t/MOVE)),m=st.m,t=T(),A=t*KVT;
    if(m==='full')return k===0?0:k===1?A*e:k===2?A+3*A*e:4*A;
    if(m==='hyb')return k<2?0:k===2?ST*e:k===3?ST+2*ST*e:k===4?3*ST+A*e:3*ST+A;
    const ix=t/4*128,core=Math.min(t,BUD)*KVT;return k===0?0:k===1?3*ST*e:k===2?3*ST:k===3?3*ST+ix*e:k===4?3*ST+ix:k===5?3*ST+ix+core*e:3*ST+ix+core}
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=steps().length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('hxPlay').addEventListener('click',()=>{if(st.play){pause()}else{const n=steps().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('hxFwd').addEventListener('click',()=>{pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $('hxBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('hxScrub').addEventListener('input',e=>{pause();const n=steps().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl(v/100-st.k);draw()});
  $('hxSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('hxT').addEventListener('change',e=>{st.ti=+e.target.value;st.lk=-1;draw()});
  const seg=$('hxM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM&&!st.play){st.play=true}draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth<560;if(w!==rw){rw=w;draw()}});rw=card.clientWidth<560;
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
