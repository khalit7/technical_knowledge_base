// ---- The paper tab: memory calculator, the split demo, logit communication, GPU groups, Figure 5, LayerNorm placement ----
const T=PAPER.tables,RC=PAPER.rc;
function segOn(id,cb){const el=$(id);if(!el)return;el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});cb(b.dataset.m)}))}
const segVal=id=>{const b=$(id)&&$(id).querySelector('button.on');return b?b.dataset.m:null};
// memory per GPU, the same accounting as recompute.py
function gptParams(h,l){return 51200*h+1024*h+l*(12*h*h+13*h)+2*h}
function memGPU(r,t,b){b=b||8;const s=1024,P=gptParams(r.h,r.l);const st=16*P/t,ck=r.l*2*s*b*r.h,ly=s*b*r.h*(10+24/t+5*r.a*s/(r.h*t));return {st,ck,ly,tot:st+ck+ly}}
(function(){if(!$('memx'))return;const TS=[1,2,4,8,16];
  function draw(){const r=T.t1.rows[+$('memM').value],ti=+$('memT').value,t=TS[ti];$('memTv').textContent=t;
    const M=TS.map(x=>memGPU(r,x)),mx=Math.max(40e9,M[0].tot)*1.04,fitT=TS.find((x,i)=>M[i].tot<32e9);
    fit($('memSvg'),w=>{const pl=58,pr=10,rowH=26,top=26,H=top+TS.length*rowH+30,X=v=>pl+(w-pl-pr)*v/mx;let s='';
      for(let g=0;g<=mx/1e9;g+=g<40?(mx>100e9?20:10):20){s+=ln2(X(g*1e9),top-4,X(g*1e9),H-26,'var(--line)')+tx(X(g*1e9),H-14,g,{fs:11,a:'middle',c:'var(--mute)'})}
      s+=tx((pl+w-pr)/2,H+2,'GB per GPU',{fs:11,a:'middle',c:'var(--mute)'});
      TS.forEach((x,i)=>{const m=M[i],y=top+i*rowH,on=x===t;let x0=X(0);
        [[m.st,'var(--c1)'],[m.ck,'var(--c3)'],[m.ly,'var(--c5)']].forEach(([v,c])=>{s+=rc(x0,y,X(v)-X(0),rowH-8,c,{r:2,op:on?1:.45});x0+=X(v)-X(0)});
        s+=tx(pl-6,y+rowH/2,'t = '+x,{fs:11,a:'end',w:on?600:null});
        const lab=(m.tot/1e9).toFixed(1)+' GB';s+=x0+70<w?tx(x0+4,y+rowH/2,lab,{fs:11,c:on?null:'var(--mute)'}):tx(x0-4,y+rowH/2,lab,{fs:11,a:'end',c:'var(--bg)',w:600})});
      s+=ln2(X(32e9),top-10,X(32e9),H-26,'var(--bad)',{sw:2,da:'4 3'})+tx(X(32e9)+4,top-12,'32 GB V100',{fs:11,c:'var(--bad)'});
      const lg=[['optimizer state, weights, gradients','var(--c1)'],['checkpointed inputs','var(--c3)'],['one layer recomputed','var(--c5)']];let lx=pl,ly=12,ls='';
      lg.forEach(([n,c])=>{const lw=n.length*6.1+22;if(lx+lw>w&&lx>pl){lx=pl;ly+=15}ls+=rc(lx,ly-9,10,10,c,{r:2})+tx(lx+14,ly,n,{fs:11});lx+=lw});
      const sh=ly+4;$('memSvg').innerHTML=svgW(w,H+sh+6,ls+'<g transform="translate(0,'+sh+')">'+s+'</g>','Memory per GPU against the number of GPUs')});
    const m=M[ti];$('memO').innerHTML=stat('Per GPU at t = '+t,(m.tot/1e9).toFixed(1)+' GB',m.tot<32e9?'<span class="ok">fits</span> in 32 GB':'<span class="no">does not fit</span> in 32 GB')+
      stat('Of which optimizer and weights',(m.st/1e9).toFixed(1)+' GB','16 B × '+(gptParams(r.h,r.l)/1e9).toFixed(2)+'B parameters ÷ '+t)+
      stat('Fewest GPUs that fit',fitT||'more than 16','paper used '+r.mp+' ('+(fitT===r.mp?'same':'different')+')')}
  $('memM').addEventListener('change',draw);$('memT').addEventListener('input',draw);onTab('t-read',draw)})();

// ---- The split demo: real matrices, three ways ----
(function(){if(!$('splSvg'))return;let seed=7,X,A;
  function gen(){const r=mulberry32(seed),n=()=>{let u=0,v=0;while(!u)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
    X=[...Array(3)].map(()=>[...Array(8)].map(n));A=[...Array(8)].map(()=>[...Array(16)].map(()=>n()*.5))}
  const F={gelu:x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x))),relu:x=>Math.max(0,x),id:x=>x};
  const mm=(P,Q,r0,r1)=>P.map(row=>Q[0].map((_,j)=>{let s=0;for(let k=r0;k<r1;k++)s+=row[k]*Q[k][j];return s}));
  function compute(){const m=segVal('splS'),f=F[segVal('splF')],t=+$('splT').value;
    const ref=mm(X,A,0,8).map(r=>r.map(f));let out,parts=[];
    if(m==='col'){out=mm(X,A,0,8).map(r=>r.map(f));}// each GPU computes its own columns: identical arithmetic per column
    else{for(let i=0;i<t;i++)parts.push(mm(X,A,i*8/t,(i+1)*8/t));
      if(m==='row')out=ref.map((r,a)=>r.map((_,j)=>parts.reduce((s,P)=>s+f(P[a][j]),0)));
      else out=ref.map((r,a)=>r.map((_,j)=>f(parts.reduce((s,P)=>s+P[a][j],0))))}
    let err=0,mag=0;ref.forEach((r,a)=>r.forEach((v,j)=>{err=Math.max(err,Math.abs(v-out[a][j]));mag=Math.max(mag,Math.abs(v))}));return {m,t,ref,out,err,mag}}
  function draw(){const R=compute();
    fit($('splSvg'),w=>{const pl=8,cw=Math.min(30,(w-pl-8)/16),ch=Math.min(22,cw),gw=cw*16;let s='',y=0;
      const mx=Math.max(1e-9,...R.ref.flat().map(Math.abs),...R.out.flat().map(Math.abs));
      const heat=(M,y0,ttl,dif)=>{let q=tx(pl,y0+12,ttl,{fs:12,w:600});const yy=y0+18;M.forEach((r,a)=>r.forEach((v,j)=>{const op=Math.min(1,Math.abs(v)/(dif?Math.max(R.mag,1e-9):mx));q+=rc(pl+j*cw,yy+a*ch,cw-1.5,ch-1.5,v>=0?'var(--c1)':'var(--c2)',{r:2,op:Math.max(.06,op)})}));
        if(!dif&&R.m==='col'&&ttl.indexOf('split')>=0)for(let i=0;i<=R.t;i++)q+=ln2(pl+i*gw/R.t-.75,yy-3,pl+i*gw/R.t-.75,yy+3*ch+2,'var(--ink)',{sw:1.5});
        if(!dif&&R.m==='col'&&ttl.indexOf('split')>=0)for(let i=0;i<R.t;i++)q+=tx(pl+(i+.5)*gw/R.t,yy+3*ch+15,'GPU '+(i+1),{fs:11,a:'middle',c:'var(--mute)'});
        return {q,h:18+3*ch+(R.m==='col'&&ttl.indexOf('split')>=0?22:8)}};
      let o=heat(R.ref,y,'One device: f(XA), 3 tokens × 16 outputs');s+=o.q;y+=o.h+6;
      const lab=R.m==='col'?'The split: each GPU computes its own '+16/R.t+' output columns':R.m==='row'?'The split: f applied to each of '+R.t+' partial sums, then added':'The split: '+R.t+' partial sums all-reduced, then f';
      o=heat(R.out,y,lab);s+=o.q;y+=o.h+6;
      const D=R.ref.map((r,a)=>r.map((v,j)=>R.out[a][j]-v));o=heat(D,y,'Difference (same colour scale as the values)',1);s+=o.q;y+=o.h;
      $('splSvg').innerHTML=svgW(w,y+4,s,'Split matrix multiply demo')});
    const sync=R.m==='rowsync',ok=R.err<1e-9;
    $('splO').innerHTML=stat('Largest error',R.err<1e-12?'0':R.err.toExponential(2),'largest value '+R.mag.toFixed(2)+(ok?' · <span class="ok">exact</span>':' · <span class="no">wrong</span>'))+
      stat('Synchronisations before f',sync?'1 all-reduce':'none',sync?'of the full 3 × 16 partial output':(R.m==='col'?'each column is complete on one GPU':'skipped, so the answer is wrong'))+
      stat('Elements each GPU sends',sync?fmt(2*(R.t-1)/R.t*48,0):'0',sync?'ring all-reduce: 2(t − 1)/t × 48':'')}
  ['splS','splF'].forEach(id=>segOn(id,draw));$('splT').addEventListener('change',draw);$('splR').addEventListener('click',()=>{seed++;gen();draw()});
  gen();PRED_REVEAL['pr-split']=draw})();

// ---- Logits: all-gather against the fused loss ----
(function(){if(!$('lgx'))return;const BS=[1,2,4,8,16,32,64];
  function draw(){const b=BS[+$('lgB').value],s=+$('lgS').value,v=+$('lgV').value;$('lgBv').textContent=b;
    const L=[['All-gather the logits: b × s × v at 2 B',b*s*v*2,'var(--c2)'],['Fused loss, the paper\'s count: b × s at 4 B',b*s*4,'var(--c1)'],['Fused loss, the code: 3 × b × s at 4 B',3*b*s*4,'var(--c3)']];
    fit($('lgSvg'),w=>{const pl=8,lo=Math.log10(512),hi=Math.log10(2**34),X=x=>pl+(w-pl-60)*(Math.log10(x)-lo)/(hi-lo);let q='',y=4;
      L.forEach(([n,x,c])=>{q+=tx(pl,y+12,n,{fs:12});q+=rc(pl,y+18,X(x)-pl,14,c,{r:2});q+=tx(X(x)+4,y+30,fmtBytes(x),{fs:11});y+=42});
      [[2**10,'1 KiB'],[2**20,'1 MiB'],[2**30,'1 GiB']].forEach(([t,l])=>{q+=ln2(X(t),y,X(t),y+4,'var(--mute)')+tx(X(t),y+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
      $('lgSvg').innerHTML=svgW(w,y+22,q,'Bytes communicated for the loss, log scale')});
    $('lgO').innerHTML=stat('All-gather of logits',fmtBytes(b*s*v*2),fmt(b*s*v)+' elements')+stat('Fused, paper\'s count',fmtBytes(b*s*4),fmt(b*s)+' scalar losses')+stat('Reduction in elements',fmt(v)+'×','v; or '+fmt(v/3,0)+'× against the code\'s three tensors')}
  $('lgB').addEventListener('input',draw);$('lgS').addEventListener('change',draw);$('lgV').addEventListener('change',draw);onTab('t-read',draw)})();

// ---- GPU groups of Figure 8 ----
(function(){if(!$('ggx'))return;
  function draw(){const n=+$('ggN').value;$('ggNv').textContent=n;const g=Math.floor((n-1)/8),p=(n-1)%8;
    fit($('ggSvg'),w=>{const c=w>700?11:w>480?10:9,bw=8*c,gap=12,per=Math.max(1,Math.floor((w+gap)/(bw+gap))),bh=2*c+16,rows=Math.ceil(32/per),H=rows*(bh+6)+4;let q='';
      for(let i=0;i<512;i++){const sv=Math.floor(i/16),k=i%16,bx=(sv%per)*(bw+gap),by=Math.floor(sv/per)*(bh+6)+14,x=bx+(k%8)*c,y=by+Math.floor(k/8)*c,me=i===n-1,tp=Math.floor(i/8)===g,dp=i%8===p;
        if(k===0)q+=tx(bx,by-3,'server '+(sv+1),{fs:11,c:'var(--mute)'});
        q+=rc(x,y,c-1.5,c-1.5,me?'var(--c2)':tp?'var(--c1)':dp?'var(--c3)':'var(--soft)',{r:1.5,s:me||tp||dp?null:'var(--line)',op:me?1:tp||dp?.85:1})}
      $('ggSvg').innerHTML=svgW(w,H,q,'512 GPUs in model-parallel and data-parallel groups')});
    $('ggO').innerHTML='<b>GPU '+n+'</b> is in server '+(Math.floor((n-1)/16)+1)+'. Its <span style="color:var(--c1)">model-parallel group</span> is GPUs '+(g*8+1)+' to '+(g*8+8)+' (group '+(g+1)+' of 64), all in that server; its <span style="color:var(--c3)">data-parallel group</span> is GPUs '+(p+1)+', '+(p+9)+', '+(p+17)+', ..., '+(p+505)+' (64 GPUs, one in each model-parallel group, spread over all 32 servers).'}
  $('ggN').addEventListener('input',draw);onTab('t-read',draw)})();

// ---- Figure 5 bars, drawn when the scaling question is answered ----
function drawF5(host){if(!host)return;const f=T.f5,B=f.mp.map(x=>['mp'].concat(x)).concat(f.mpdp.map(x=>['mpdp'].concat(x)));
  fit(host,w=>{const pl=34,pr=6,top=16,H=210,bw=(w-pl-pr)/(B.length+1),Y=v=>top+(H-top-34)*(1-v/100);let q='';
    [0,20,40,60,80,100].forEach(v=>q+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'}));
    B.forEach((b,i)=>{const x=pl+(i+(i>=4?1:0))*bw+bw*.12,c=b[0]==='mp'?'var(--c1)':'var(--c3)';q+=rc(x,Y(b[2]),bw*.76,Y(0)-Y(b[2]),c,{r:2});
      q+=tx(x+bw*.38,Y(b[2])-4,b[2]+'%',{fs:11,a:'middle',w:600});q+=tx(x+bw*.38,H-20,b[1],{fs:11,a:'middle',c:'var(--mute)'})});
    q+=tx(pl+4.5*bw,H-20,'...',{fs:11,a:'middle',c:'var(--mute)'})+tx(pl,H-4,'GPUs · blue: model parallel only',{fs:11,c:'var(--mute)'})+tx(pl,H+10,'green: with 64-way data parallel',{fs:11,c:'var(--mute)'});
    
    host.innerHTML=svgW(w,H+14,q,'Figure 5: weak scaling efficiency')})}
PRED_REVEAL['pr-scale']=()=>drawF5($('f5Svg'));

// ---- LayerNorm placement, (a) original against (b) rearranged ----
(function(){if(!$('lnx'))return;
  const caps={b:[['The input','A token\'s vector enters a stack of four sub-blocks (two layers of attention then MLP), arranged as Figure 7(b).'],
      ['Sub-block 1: self-attention','LayerNorm, then attention. The residual branches off <b>before</b> the LayerNorm, so the input itself is added back untouched: x + Attention(LN(x)).'],
      ['Sub-block 2: MLP','The same pattern. The coloured path from the input to here passes through no LayerNorm at all: it is a plain sum.'],
      ['Sub-blocks 3 and 4','Stack as many as you like: the residual path stays a clean identity, which is what the pre-LN (GPT-2) arrangement gives.'],
      ['Result in the paper','With (b), the 752M BERT trains stably to a lower loss than (a), and the 1.3B and 3.9B models train with monotonic gains (%F7%). GPT-2 adds one more LayerNorm after the last block.']],
    a:[['The input','The same vector, arranged as Figure 7(a): LayerNorm still at the start of each sub-block.'],
      ['Sub-block 1: self-attention','The residual branches off <b>after</b> the LayerNorm: LN(x) + Attention(LN(x)). The input is not carried forward; its normalised version is.'],
      ['Sub-block 2: MLP','Again: the next LayerNorm sits on the residual path itself. Unrolled, this is the original post-LN BERT, where every sub-block\'s output is renormalised (the first LayerNorm plays the role of BERT\'s embedding LayerNorm).'],
      ['Sub-blocks 3 and 4','Every sub-block adds one more LayerNorm to the path from input to output.'],
      ['Result in the paper','At 336M this trains fine; at 752M its loss jumps partway through and does not recover (Figure 7), which is the degradation ALBERT had reported above BERT-large.']]};
  const modes={};['a','b'].forEach(m=>modes[m]=caps[m].map(([t,c])=>({t,c:c.replace('%F7%','<a href="'+PAPER.meta.ax+'#S5.F7" target="_blank" rel="noopener noreferrer">Figure 7</a>')})));
  const NS=[0,1,2,4,4];
  function drawLN(m,k,e,w){const blocks=['Self-attention','MLP','Self-attention','MLP'],bh=78,H=36+4*bh+30,bw=Math.min(150,w-120),cx=Math.max(bw/2+70,Math.min(w/2+20,w-bw/2-8)),rx=cx-bw/2-26;let q='';
    const y0=H-26,n=NS[k],n0=k?NS[k-1]:0,C='var(--c2)';
    q+=rc(cx-bw/2,y0,bw,22,'var(--open2)',{r:4})+tx(cx,y0+15,'input',{fs:12,a:'middle'});
    for(let i=0;i<n;i++){const op=i<n0?1:e;const yb=y0-(i+1)*bh,entry=yb+bh,yLN=yb+bh-26,ySub=yb+bh-56,yAdd=yb+12;let g='';
      const br=m==='b'?entry-5:yLN-6;// where the residual branches off
      g+=ln2(cx,entry,cx,yLN+16,m==='b'?C:'var(--mute)',{sw:m==='b'?2.4:1.2});
      g+=ln2(cx,yLN,cx,ySub+20,m==='a'?C:'var(--mute)',{sw:m==='a'?2.4:1.2})+ln2(cx,ySub,cx,yAdd+7,'var(--mute)');
      g+=rc(cx-bw/2+22,yLN,bw-44,16,'var(--hl)',{r:3,s:m==='a'?C:null,sw:2.4})+tx(cx,yLN+12,'LayerNorm',{fs:11,a:'middle'});
      g+=rc(cx-bw/2,ySub,bw,20,'var(--acc2)',{r:4})+tx(cx,ySub+14,blocks[i],{fs:12,a:'middle'});
      g+='<path d="M'+cx+','+br+' L'+rx+','+br+' L'+rx+','+yAdd+' L'+(cx-7)+','+yAdd+'" fill="none" stroke="'+C+'" stroke-width="2.4"/>';
      g+='<circle cx="'+cx+'" cy="'+yAdd+'" r="7" fill="var(--bg)" stroke="var(--ink)"/>'+tx(cx,yAdd+4,'+',{fs:12,a:'middle',w:700});
      g+=ln2(cx,yAdd-7,cx,yb,C,{sw:2.4});
      if(i===0)g+=tx(rx-4,(br+yAdd)/2,'residual',{fs:11,a:'end',c:C});
      q+=G(op,g)}
    if(n===4)q+=G(k===3?e:1,tx(cx,y0-4*bh-6,'output',{fs:12,a:'middle'}));
    return svgW(w,H,q,'LayerNorm and residual placement')}
  const an=makeAnim({id:'lnx',modes,mode:'b',dur:2600,draw:drawLN,counters:(m,k)=>{const n=NS[k];
    return stat('Sub-blocks stacked',n,'')+stat('LayerNorms on the residual path',m==='a'?n:0,m==='a'?'one per sub-block':'none: x passes straight through')+stat('Equivalent to',m==='a'?'post-LN':'pre-LN',m==='a'?'original BERT':'GPT-2')}});
  PRED_REVEAL['pr-ln']=()=>{if(an){refit($('lnxSvg'));an.draw();an.kick()}}})();
