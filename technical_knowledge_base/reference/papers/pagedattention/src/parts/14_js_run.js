// ---- Simulate the KV cache: the toy animation and the paper-scale runs ----
const TOY={reqs:[[7,[6]],[3,[9]],[12,[4]],[5,[14]],[9,[3]],[4,[8]],[10,[7]],[6,[5]]],slots:64,block:4,maxLen:32};
const LET='ABCDEFGH',RCOL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)','var(--c8)'];
const SYSN={max:'Orca (Max)',pow2:'Orca (Pow2)',oracle:'Orca (Oracle)',vllm:'vLLM'};
const toyRuns={};
['max','pow2','oracle','vllm'].forEach(s=>{toyRuns[s]=SIM.run({system:s,reqs:TOY.reqs,slots:TOY.slots,block:TOY.block,maxLen:TOY.maxLen,watermark:0,maxTokens:1e9,maxSeqs:1e9,warm:0,steps:400,trace:true,F:{}}).trace});
// classify every slot of a snapshot: 0 free, 1 token, 2 reserved (will be used), 3 internal (never used), 4 buddy rounding
function layout(sys,S){const N=TOY.slots,kind=new Array(N).fill(0),own=new Array(N).fill(-1),blk=new Array(N).fill(0);
  S.run.forEach(r=>{const ci=r.id-1;r.outs.forEach((o,i)=>{if(r.done[i])return;const F=r.p+o,st=r.st[i];
    if(sys==='vllm'){const L=r.sb.concat(r.pb[i]);L.forEach((b,j)=>{for(let q=0;q<TOY.block;q++){const pos=j*TOY.block+q,x=b*TOY.block+q;own[x]=ci;blk[x]=1;kind[x]=pos<st?1:pos<F?2:3}})}
    else{const R=r.R[i],A=SIM.pow2(R),off=r.off[i];for(let q=0;q<A;q++){const x=off+q;own[x]=ci;kind[x]=q<st?1:q<Math.min(R,F)?2:q<R?3:4}}})});
  return {kind,own,blk}}
function shares(sys,S){const L=layout(sys,S),c=[0,0,0,0,0];L.kind.forEach(k=>c[k]++);const N=TOY.slots;return {token:100*c[1]/N,resv:100*c[2]/N,internal:100*c[3]/N,external:100*(c[4]+c[0])/N}}
const toyModes={};
['max','pow2','oracle','vllm'].forEach(s=>{const T=toyRuns[s];const steps=[{t:'Eight requests wait',c:'Nothing is allocated yet. '+(s==='vllm'?'vLLM will hand out 4-slot blocks as tokens arrive.':s==='max'?'Orca (Max) will reserve the 32-slot maximum for every request.':s==='pow2'?'Orca (Pow2) will reserve prompt + the output rounded up to a power of two (at most 2×).':'Orca (Oracle) will reserve exactly prompt + output: it is told the output lengths.')+' The buddy allocator'+(s==='vllm'?' is not used: every block has the same size.':' rounds every chunk up to a power of two.')}];
  let seen={};
  T.forEach((S,k)=>{const ad=S.ev.filter(e=>e[0]==='adm').map(e=>LET[e[1]-1]),fi=S.ev.filter(e=>e[0]==='fin').map(e=>LET[e[1]-1]),pre=S.ev.filter(e=>e[0]==='pre').map(e=>LET[e[1]-1]),bl=S.ev.filter(e=>e[0]==='blk');
    const parts=[];
    if(pre.length)parts.push('<b>Preempted '+pre.join(', ')+'</b>: a running request needed a new block and none was free, so the latest-arrived request gives up all its blocks and goes back to the front of the queue, to be recomputed in one prefill when memory frees up');
    if(fi.length)parts.push('finished: '+fi.join(', ')+' (memory freed)');
    if(ad.length)parts.push('admitted: '+ad.join(', ')+(s==='vllm'?' (prompt blocks only)':' (a whole chunk each)'));
    if(bl.length)parts.push('new blocks: '+bl.map(e=>LET[e[1]-1]+' → '+e[2]).join(', '));
    const w=S.wait.length,run=S.run.map(r=>LET[r.id-1]).join(' ');
    if(!parts.length)parts.push('every running request appends one token');
    const full=w&&!ad.length?' The next request in line, '+LET[S.wait[0]-1]+', does not fit.':'';
    steps.push({t:(S.run.length?S.run.length+' running':'all done')+(w?', '+w+' waiting':''),c:parts.join('; ')+'.'+full+(S.run.length?' Running: '+run+'.':' All eight requests finished in '+T.length+' steps.')})});
  toyModes[s]=steps});
const toyAnim=makeAnim({id:'kv',modes:toyModes,mode:'max',dur:1500,
  draw:(m,k,e,W)=>{const T=toyRuns[m],S=k>0?T[k-1]:{run:[],wait:[1,2,3,4,5,6,7,8],ev:[]},P=k>1?T[k-2]:null;
    const per=W>=600?16:8,cw=Math.floor((W-2)/per),ch=Math.min(30,cw),rows=TOY.slots/per;const L=layout(m,S),PL=P?layout(m,P):null;
    const COL=['none','','','var(--frag)','var(--dim)'];let s='';
    for(let x=0;x<TOY.slots;x++){const r=Math.floor(x/per),c=x%per,X=1+c*cw,Y=r*ch+1,k2=L.kind[x],o=L.own[x];
      s+=rc(X,Y,cw-2,ch-2,'none',{r:3,s:'var(--line)'});
      if(k2){const fresh=PL&&!(PL.kind[x]===k2&&PL.own[x]===o);const op=fresh?e:1;const cc=k2<=2?RCOL[o]:COL[k2];
        s+=G(op,rc(X,Y,cw-2,ch-2,cc,{r:3,op:k2===1?.9:k2===2?.28:k2===3?.75:.6})+(k2===1&&cw>=18?tx(X+cw/2-1,Y+ch/2+3,LET[o],{fs:11,a:'middle',c:'#fff',w:600}):'')+(k2===2?rc(X,Y,cw-2,ch-2,'none',{r:3,s:RCOL[o],sw:1.2,da:'3 2'}):''))}}
    if(m==='vllm')for(let b=0;b<TOY.slots/TOY.block;b++){const x=b*TOY.block,r=Math.floor(x/per),c=x%per;s+=rc(c*cw,r*ch,TOY.block*cw,ch,'none',{r:4,s:'var(--mute)',sw:1.2})+tx(c*cw+3,r*ch+ch-3,'',{fs:11})}
    let y=rows*ch+16;s+=tx(0,y,m==='vllm'?'GPU KV memory: 16 physical blocks of 4 slots':'GPU KV memory: 64 slots, one contiguous chunk per request',{fs:11,c:'var(--mute)'});
    // the request strip
    y+=10;const bw=Math.max(30,Math.floor((W-28)/8));let x0=0;const fin=new Set();for(let j=0;j<k;j++)T[j].ev.forEach(ev=>{if(ev[0]==='fin')fin.add(ev[1])});
    for(let i=0;i<8;i++){const id=i+1,rr=S.run.find(r=>r.id===id),st=rr?'run':fin.has(id)?'done':'wait';if(x0+bw>W){x0=0;y+=40}
      s+=rc(x0,y,bw,34,st==='run'?RCOL[i]:'var(--soft)',{r:5,op:st==='run'?.9:1,s:st==='wait'?'var(--line)':'none'})+tx(x0+bw/2,y+14,LET[i],{fs:12,a:'middle',w:700,c:st==='run'?'#fff':'var(--ink)'})+tx(x0+bw/2,y+28,st==='run'?(rr.st[0]+'/'+(rr.p+rr.outs[0])):st,{fs:11,a:'middle',c:st==='run'?'#fff':'var(--mute)'});
      x0+=bw+4}
    y+=40;
    if(m==='vllm'&&S.run.length){const ent=S.run.map(r=>LET[r.id-1]+': '+r.sb.concat(r.pb[0]).join(', '));const mc=Math.floor(W/6.4);const lines=[];let cur='block tables (logical order):';
      ent.forEach(t=>{if((cur+'   '+t).length>mc){lines.push(cur);cur=t}else cur+=(cur?'   ':'')+t});lines.push(cur);
      lines.forEach(l=>{s+=tx(0,y+8,l,{fs:11,c:'var(--mute)'});y+=16})}
    return svgW(W,y+4,s,'KV cache memory, '+SYSN[m])},
  counters:(m,k)=>{const T=toyRuns[m],S=k>0?T[k-1]:{run:[],wait:[1,2,3,4,5,6,7,8]};const sh=shares(m,S);let done=0;for(let j=0;j<k;j++)T[j].ev.forEach(ev=>{if(ev[0]==='fin')done++});
    const pre=T.slice(0,k).reduce((a,S2)=>a+S2.ev.filter(e=>e[0]==='pre').length,0);
    return stat('iterations run',k+' of '+T.length,'to finish all eight')+stat('running / waiting / done',S.run.length+' / '+S.wait.length+' / '+done,pre?pre+' preemption'+(pre>1?'s':'')+' so far':'')+
      stat('<span style="color:var(--good)">■</span> slots holding a token',f1(sh.token,0)+'%','of 64')+stat('<span style="color:var(--c5)">■</span> reserved, to be used',f1(sh.resv,0)+'%','held empty meanwhile')+
      stat('<span style="color:var(--frag)">■</span> internal fragmentation',f1(sh.internal,0)+'%','reserved, never used')+stat('<span style="color:var(--mute)">■</span> '+(m==='vllm'?'free blocks':'rounding and free'),f1(sh.external,0)+'%',m==='vllm'?'unallocated':'buddy rounding + unallocated')}});

// ---- at the paper's scale ----
(function(){let seed=1,busy=0,last=null;
  const P13=TB.fig13,P2=TB.fig2.rows;
  function go(){const d=$('scD').value,B=+$('scB').value,n=+$('scN').value;const key=[d,B,n,seed].join('|');if(key===last)return;last=key;const my=++busy;
    $('scRep').textContent='Running the four systems...';const res={};const sy=['max','pow2','oracle','vllm'];let i=0;
    const step=()=>{if(my!==busy)return;const s=sy[i];res[s]=SIM.run({system:s,data:d,block:B,n,seed});i++;if(i<sy.length)setTimeout(step,0);else show(res,d,B,n)};setTimeout(step,0)}
  function show(res,d,B,n){const W=$('scSvg').clientWidth||600;const rows=[];const def=d==='sharegpt'&&B===16&&n===1&&seed===1;
    ['max','pow2','oracle','vllm'].forEach(s=>{if(d==='sharegpt'&&n===1)rows.push({n:SYSN[s]+', Fig. 2',v:paperF2(SYSN[s])});
      rows.push({n:SYSN[s]+(d==='sharegpt'&&n===1?', simulated':''),sim:d==='sharegpt'&&n===1,v:res[s]})});
    stackChart($('scSvg'),rows,W);
    const ds=d==='sharegpt'?'ShareGPT':'Alpaca';let h='<tr><th>System</th><th class="num">Requests per batch</th><th class="num">Figure 13</th><th class="num">Sequences per batch</th><th class="num">Tokens holding memory</th><th class="num">Preemptions</th>'+(n>1?'<th class="num">Memory saved by sharing</th>':'')+'</tr>';
    ['max','pow2','oracle','vllm'].forEach(s=>{const r=res[s];h+='<tr><td>'+SYSN[s]+(s==='vllm'?' (B = '+B+')':'')+'</td><td class="num">'+f1(r.batch,2)+'</td><td class="num">'+(n===1?P13[ds][SYSN[s]].toFixed(2):'n/a')+'</td><td class="num">'+f1(r.seqs,1)+'</td><td class="num">'+f1(r.token)+'%</td><td class="num">'+fmt(r.preempt)+'</td>'+(n>1?'<td class="num">'+(s==='vllm'?f1(r.saving,2)+'%':'none')+'</td>':'')+'</tr>'});
    $('scT').innerHTML=h;
    const v=res.vllm,o=res.oracle,mx=res.max;let rep='vLLM batches '+(v.batch/o.batch).toFixed(2)+'× as many requests as Orca (Oracle) and '+(v.batch/mx.batch).toFixed(2)+'× Orca (Max)';
    if(n===1)rep+=' (Figure 13: '+(P13[ds].vLLM/P13[ds]['Orca (Oracle)']).toFixed(2)+'× and '+(P13[ds].vLLM/P13[ds]['Orca (Max)']).toFixed(2)+'×).';else rep+='.';
    if(def)rep+=' <b>Defaults reproduce Figure 2 and Figure 13a approximately, independently</b>: nothing in the simulator was fitted to them. Orca (Max) batches exactly 7 because ⌊15,728 / 2,048⌋ = 7 and leaves '+RC.orca_max_free_pct.toFixed(1)+'% of memory free, Figure 2\'s 8.9%. vLLM\'s batch comes out above the paper\'s 30.42, plausibly because at 2 requests/s the real queue was not always full (Figure 12a puts vLLM\'s knee near 2 requests/s).';
    if(d==='alpaca'&&n===1)rep+=' On Alpaca Orca (Oracle) matches Figure 13b ('+f1(o.batch,1)+' against 72.75) but vLLM\'s memory limit, '+f1(v.batch,0)+', is well above the paper\'s 132.44: at 30 requests/s vLLM is near its capacity knee (Figure 12d), so its batch was set by arrivals, not memory. <b>Does not reproduce</b> as a memory limit.';
    if(n>1&&d==='alpaca'&&B===16)rep+=' Figure 15a: '+TB.fig15.parallel[[2,4,6].indexOf(n)].toFixed(2)+'% saved for '+n+' samples.';
    if(n>1&&d==='sharegpt'&&B===16)rep+=' §6.3 reports 16.2% to 30.5% for parallel sampling on ShareGPT (2 to 6 samples).';
    if(d==='sharegpt'&&n===1){const th=longest(FG.fig1_batch[0].series.Throughput).slice().sort((a,b)=>a[0]-b[0]);const at=x=>{if(x>th[th.length-1][0])return null;for(let i=1;i<th.length;i++)if(th[i][0]>=x){const a=th[i-1],b=th[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}};
      const a=at(mx.batch),b=at(v.batch);if(a&&b)rep+=' On Figure 1\'s measured throughput curve, a batch of '+f1(mx.batch,0)+' runs at about '+fmt(a)+' tokens/s and one of '+f1(v.batch,1)+' at about '+fmt(b)+' tokens/s, '+(b/a).toFixed(1)+'×: throughput grows less than the batch, because larger batches start to use the GPU\'s compute.'}
    $('scRep').innerHTML=rep}
  ['scD','scB','scN'].forEach(id=>$(id).addEventListener('change',go));
  $('scSeed').addEventListener('click',()=>{seed++;$('scSeedV').textContent='seed '+seed;go()});
  onTab('t-run',()=>{go();refit($('kvSvg'))});
  window.__scState=()=>({busy,last,rep:$('scRep').textContent});
})();
