// ---- The paper tab: numbers from recompute.json, the inline charts and the block-table animation ----
const RC=PAPER.rc,FG=PAPER.figs,SC=PAPER.simchk,TB=PAPER.tables;
const f1=(v,d)=>fmt(v,d==null?1:d);
// a linear chart frame: o={W,H,pl,pr,pt,pb,x:[a,b],y:[a,b],xt:[[v,l]],yt:[[v,l]],xl,yl,xlog}
function frame(o){const lx=o.xlog?(v=>o.pl+(o.W-o.pl-o.pr)*(Math.log2(v)-Math.log2(o.x[0]))/(Math.log2(o.x[1])-Math.log2(o.x[0]))):(v=>o.pl+(o.W-o.pl-o.pr)*(v-o.x[0])/(o.x[1]-o.x[0]));
  const ly=v=>o.pt+(o.H-o.pt-o.pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));let s='';
  o.yt.forEach(([v,l])=>{s+=ln2(o.pl,ly(v),o.W-o.pr,ly(v),'var(--line)',{sw:1})+tx(o.pl-5,ly(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
  o.xt.forEach(([v,l])=>{s+=ln2(lx(v),o.H-o.pb,lx(v),o.H-o.pb+4,'var(--mute)',{sw:1})+tx(lx(v),o.H-o.pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=ln2(o.pl,o.H-o.pb,o.W-o.pr,o.H-o.pb,'var(--mute)',{sw:1});
  if(o.xl)s+=tx((o.pl+o.W-o.pr)/2,o.H-3,o.xl,{fs:11,a:'middle',c:'var(--mute)'});
  if(o.yl)s+='<text x="11" y="'+((o.pt+o.H-o.pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 '+((o.pt+o.H-o.pb)/2)+')">'+o.yl+'</text>';
  return {s,lx,ly}}
const poly=(pts,lx,ly,c,o)=>{o=o||{};return '<polyline fill="none" stroke="'+c+'" stroke-width="'+(o.sw||2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+' points="'+pts.map(p=>lx(p[0]).toFixed(1)+','+ly(p[1]).toFixed(1)).join(' ')+'"/>'};
const dots=(pts,lx,ly,c,r)=>pts.map(p=>'<circle cx="'+lx(p[0]).toFixed(1)+'" cy="'+ly(p[1]).toFixed(1)+'" r="'+(r||2.6)+'" fill="'+c+'"/>').join('');
const longest=a=>a.reduce((x,y)=>y.length>x.length?y:x,[]);
// numbers in the prose
(function(){const S=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  S('rdKv',fmt(RC.kv_per_token_bytes['OPT-13B']));S('rdKv2',RC.kv_2048_gib.toFixed(4));S('rdSlots',fmt(RC.slots_13b,1)+' slots');
  S('rdF3a',fmt(RC.fig3.a_never_used));S('rdF3b',fmt(RC.fig3.b_never_used));
  S('rdR1',RC.fig13_ratios.ShareGPT.vs_oracle.toFixed(2)+'×');S('rdR2',RC.fig13_ratios.ShareGPT.vs_max.toFixed(2)+'×')})();
// Figure 1 (right): memory and throughput against batch size
fit($('batchSvg'),w=>{const H1=150,H2=130,W=w;const top=FG.fig1_batch[1].series,bot=FG.fig1_batch[0].series;
  const A=frame({W,H:H1,pl:44,pr:12,pt:10,pb:22,x:[0,40],y:[20,40],xt:[[0,''],[10,''],[20,''],[30,''],[40,'']],yt:[[20,'20'],[30,'30'],[40,'40 GB']],yl:'memory'});
  const srt=a=>longest(a).slice().sort((x,y)=>x[0]-y[0]||x[1]-y[1]);const ex=srt(top['Existing systems']),vl=srt(top['vLLM']);
  let s=A.s+poly(ex,A.lx,A.ly,'var(--c2)')+dots(ex,A.lx,A.ly,'var(--c2)')+poly(vl,A.lx,A.ly,'var(--c1)')+dots(vl,A.lx,A.ly,'var(--c1)');
  s+=tx(A.lx(9),A.ly(37),'existing systems',{fs:11,c:'var(--c2)'})+tx(A.lx(26),A.ly(30.5),'vLLM',{fs:11,c:'var(--c1)'})+tx(A.lx(1.2),A.ly(24.2),'parameters: 26 GB',{fs:11,c:'var(--mute)'});
  const B=frame({W,H:H2,pl:44,pr:12,pt:8,pb:34,x:[0,40],y:[0,1200],xt:[[0,'0'],[10,'10'],[20,'20'],[30,'30'],[40,'40']],yt:[[0,'0'],[400,'400'],[800,'800'],[1200,'1.2k']],xl:'batch size (requests)',yl:'tokens/s'});
  const th=srt(bot['Throughput']);let s2=B.s+poly(th,B.lx,B.ly,'var(--c3)')+dots(th,B.lx,B.ly,'var(--c3)');
  const at=x=>{for(let i=1;i<th.length;i++)if(th[i][0]>=x){const a=th[i-1],b=th[i];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}return th[th.length-1][1]};
  const xe=ex[ex.length-1][0],xv=vl[vl.length-1][0];
  [[xe,'var(--c2)'],[xv,'var(--c1)']].forEach(([x,c])=>{s2+=ln2(B.lx(x),B.ly(0),B.lx(x),B.ly(at(x)),c,{da:'3 3'})+ln2(44,B.ly(at(x)),B.lx(x),B.ly(at(x)),c,{da:'3 3'})+tx(48,B.ly(at(x))-4,fmt(at(x))+' tokens/s',{fs:11,c})});
  s+='';$('batchSvg').innerHTML=svgW(W,H1,s,'Figure 1 right, memory against batch size')+svgW(W,H2,s2,'Figure 1 right, throughput against batch size');
  $('batchCap').innerHTML='Figure 1 (right), redrawn from the points in its vector graphics (%F1%). Memory hits 40 GB at a batch of '+fmt(xe)+' requests for "existing systems" (about '+RC.fig1.existing_gb_per_req.toFixed(2)+' GB more per request) and at '+fmt(xv,1)+' for vLLM (about '+RC.fig1.vllm_gb_per_req.toFixed(2)+' GB per request); the throughput curve turns that into about '+fmt(at(xe))+' against '+fmt(at(xv))+' tokens/s, read where the dotted lines meet it. The figure does not say which model, trace or system "existing systems" is; its parameter size, 26 GB, is OPT-13B\'s.';
  $('batchCap').innerHTML=$('batchCap').innerHTML.replace('%F1%',A_(PAPER.meta.ax+'#S1.F1','Figure 1'))});
function A_(u,t){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>'}
// Figure 2 against the simulator (revealed by the first predict question)
const CAT=[['token','token states','var(--good)'],['resv','reservation','var(--c5)'],['internal','internal fragmentation','var(--frag)'],['external','external fragmentation and others','var(--dim)']];
function stackChart(host,rows,W){// rows: [{n, sub, v:{token,resv,internal,external}}]
  const pl=Math.min(150,W*.36),bh=16,gap=6;let y=8,s='';
  rows.forEach(r=>{if(r.head){s+=tx(0,y+12,r.head,{fs:12,w:600});y+=18;return}
    s+=tx(pl-6,y+bh-4,r.n,{fs:11,a:'end',c:r.sim?'var(--mute)':'var(--ink)'});let x=pl;const sc=(W-pl-8)/100;
    CAT.forEach(([k,,c])=>{const v=r.v[k]||0;if(v>0){s+=rc(x,y,v*sc,bh,c,{r:0});if(v*sc>26)s+=tx(x+v*sc/2,y+bh-4,f1(v),{fs:11,a:'middle',c:k==='external'?'var(--ink)':'#fff'})}x+=v*sc});
    y+=bh+gap});
  let lx=0;const lg=[];CAT.forEach(([,n,c])=>{lg.push('<span class="legend-i"><i style="background:'+c+'"></i>'+n+'</span>')});
  host.innerHTML=svgW(W,y+4,s,'KV cache memory by use')+'<div class="small">'+lg.join('')+'</div>'}
const SYS=[['max','Orca (Max)'],['pow2','Orca (Pow2)'],['oracle','Orca (Oracle)'],['vllm','vLLM']];
// Figure 2 as printed; vLLM's unlabelled slivers from the vector graphics
function paperF2(n){const p=TB.fig2.rows.find(r=>r.sys===n);const pv={token:p.token,resv:p.resv||0,internal:p.internal||0,external:p.external==null?100-p.token:p.external};
  if(n==='vLLM'){const vb=RC.fig2_vector_vllm;const g=t=>{const b=vb.find(x=>x[0]===t);return b?b[2]-b[1]:0};pv.resv=g('reservation');pv.internal=g('internal');pv.external=g('external')}return pv}
function drawF2(){fit($('f2Svg'),W=>{const rows=[];SYS.forEach(([k,n])=>{const pv=paperF2(n);
    rows.push({n:n+', paper',v:pv});const sv=SC['sharegpt_'+k];rows.push({n:'simulated',sim:1,v:sv})});
  stackChart($('f2Svg'),rows,W)});
  const s=SC.sharegpt_oracle,v=SC.sharegpt_vllm,m=SC.sharegpt_max;
  $('f2Rep').innerHTML='Top bar of each pair: Figure 2 as printed (vLLM\'s three unlabelled slivers are read from the vector graphics: '+RC.fig2_vector_vllm.filter(b=>b[0]!=='token states').map(b=>b[0]+' '+(b[2]-b[1]).toFixed(1)+'%').join(', ')+'). Bottom bar: this page\'s simulator on ShareGPT-like traffic (the %RUN% tab), which knows only Table 1\'s 12 GB, the length histograms of Figure 11 and the allocation rules of §6.1: Orca (Oracle) '+f1(s.token)+'% token states against the paper\'s 38.2%, vLLM '+f1(v.token)+'% against 96.3%, Orca (Max) '+f1(m.token)+'% against 20.4%. The reproduction is independent: nothing was tuned to Figure 2.';
  $('f2Rep').innerHTML=$('f2Rep').innerHTML.replace('%RUN%','<a href="#" data-tab-go="t-run">Simulate the KV cache</a>');wireTabLinks($('f2Rep'))}
function wireTabLinks(el){el.querySelectorAll('a[data-tab-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t='+a.dataset.tabGo+']');if(b)b.click()}))}
PRED_REVEAL['pr-oracle']=drawF2;
// Figure 15 against the simulator
function drawF15(){fit($('f15Svg'),W=>{const pl=Math.min(170,W*.4),bh=14,sc=(W-pl-40)/60;let y=6,s='';
  const row=(n,v,c,sim)=>{s+=tx(pl-6,y+bh-3,n,{fs:11,a:'end',c:sim?'var(--mute)':'var(--ink)'})+rc(pl,y,v*sc,bh,c,{r:2})+tx(pl+v*sc+4,y+bh-3,v.toFixed(2)+'%',{fs:11});y+=bh+4};
  [2,4,6].forEach((n,i)=>{row('parallel, '+n+' samples',TB.fig15.parallel[i],'var(--c1)');row('simulated',SC['alpaca_vllm_n'+n].saving,'var(--c6)',1);y+=4});
  [2,4,6].forEach((n,i)=>row('beam search, width '+n,TB.fig15.beam[i],'var(--c4)'));
  $('f15Svg').innerHTML=svgW(W,y+2,s,'Figure 15, memory saving from sharing')});
  $('f15Rep').innerHTML='Figure 15 as printed (OPT-13B, Alpaca), with this page\'s simulator for parallel sampling under the authors\' released benchmark rule (every sample runs to the trace\'s output length): '+[2,4,6].map(n=>f1(SC['alpaca_vllm_n'+n].saving,2)+'%').join(', ')+' against 6.09%, 8.53%, 9.79%. The simulator cannot run beam search: which beams survive depends on the model\'s probabilities.'}
PRED_REVEAL['pr-par']=drawF15;
// Figure 18b and the simulator's memory side
function drawBS(){fit($('bsSvg'),W=>{const two=W>=600,w1=two?Math.floor(W/2)-6:W,H=200;
  const A=frame({W:w1,H,pl:40,pr:10,pt:12,pb:34,x:[1,256],xlog:1,y:[0,18],xt:[1,2,4,8,16,32,64,128,256].map(v=>[v,String(v)]),yt:[[0,'0'],[5,'5'],[10,'10'],[15,'15']],xl:'block size',yl:'normalized latency (s/token)'});
  const S=FG.fig18b_blocksize[0].series;const sg=longest(S.ShareGPT),al=longest(S.Alpaca);
  let s=A.s+poly(sg,A.lx,A.ly,'var(--c1)')+dots(sg,A.lx,A.ly,'var(--c1)')+poly(al,A.lx,A.ly,'var(--c2)')+dots(al,A.lx,A.ly,'var(--c2)')+tx(A.lx(1.2),A.ly(16),'Alpaca',{fs:11,c:'var(--c2)'})+tx(A.lx(1.2),A.ly(13.5),'ShareGPT',{fs:11,c:'var(--c1)'})+tx(A.lx(1),11,'Figure 18b (paper)',{fs:11,w:600});
  const bs=[1,4,8,16,32,64,128,256],g=b=>b===16?SC.alpaca_vllm:SC['alpaca_vllm_b'+b];
  const B=frame({W:w1,H,pl:40,pr:10,pt:12,pb:34,x:[1,256],xlog:1,y:[0,100],xt:bs.map(v=>[v,String(v)]),yt:[[0,'0'],[50,'50'],[100,'100%']],xl:'block size',yl:'simulated, Alpaca'});
  const tok=bs.map(b=>[b,g(b).token]),bat=bs.map(b=>[b,g(b).batch/2]);
  let s2=B.s+poly(tok,B.lx,B.ly,'var(--good)')+dots(tok,B.lx,B.ly,'var(--good)')+poly(bat,B.lx,B.ly,'var(--c4)',{da:'4 3'})+dots(bat,B.lx,B.ly,'var(--c4)')+tx(B.lx(1),11,'This page\'s simulator',{fs:11,w:600})+tx(B.lx(2),B.ly(93),'% of memory holding tokens',{fs:11,c:'var(--good)'})+tx(B.lx(2),B.ly(bat[2][1])+16,'batch ÷ 2',{fs:11,c:'var(--c4)'});
  $('bsSvg').innerHTML=two?'<div style="display:flex;gap:12px">'+svgW(w1,H,s,'Figure 18b')+svgW(w1,H,s2,'simulated memory by block size')+'</div>':svgW(w1,H,s,'Figure 18b')+svgW(w1,H,s2,'simulated memory by block size')});
  $('bsRep').innerHTML='Left: Figure 18b read from its vector graphics. Right: the simulator (OPT-13B memory, Alpaca lengths, saturated queue): the share of memory holding tokens falls from '+f1(SC.alpaca_vllm_b1.token)+'% at block size 1 to '+f1(SC.alpaca_vllm.token)+'% at 16 and '+f1(SC.alpaca_vllm_b256.token)+'% at 256, and the batch from '+f1(SC.alpaca_vllm_b1.batch,0)+' to '+f1(SC.alpaca_vllm.batch,0)+' to '+f1(SC.alpaca_vllm_b256.batch,0)+' requests. The simulator has no kernel cost, so it shows only why large blocks hurt, not why small ones do.'}
PRED_REVEAL['pr-bs']=drawBS;

// ---- Block tables, step by step (Figures 6 to 9) ----
(function(){
  const PA=['Four','score','and','seven','years','ago','our'];
  const cA='var(--c5)',cB='var(--c3)',cA2='var(--c6)';
  // a state: {phys:{id:[[word,color,gen]...]}, ref:{id:n}, seqs:[{n,c,blocks:[id...],fill:[...]}], hi:{id:1}, freed:{id:1}, copy:[from,to]}
  const one=[
    {t:'Request A arrives',c:'The prompt is "Four score and seven years ago our", 7 tokens. Nothing is reserved for the 2,048-token maximum: vLLM will allocate blocks only as tokens arrive.',s:{phys:{},seqs:[{n:'A',c:cA,blocks:[],fill:[]}]}},
    {t:'Prefill: two blocks, anywhere',c:'The prompt needs two blocks of 4. Logical block 0 maps to physical block 7, logical block 1 to physical block 1 (Figure 6, step 1); the prompt\'s KV cache is written into them and the first output token, "fathers", is generated. One slot of block 1 stays free for it.',s:{phys:{7:PA.slice(0,4).map(w=>[w,cA]),1:PA.slice(4).map(w=>[w,cA])},seqs:[{n:'A',c:cA,blocks:[7,1],fill:[4,3]}],hi:{7:1,1:1}}},
    {t:'Decode: fill the last slot',c:'The first decoding step runs PagedAttention over blocks 7 and 1 and stores the KV cache of "fathers" in the free slot; the block table\'s fill count for logical block 1 goes from 3 to 4 (step 2). "brought" is generated.',s:{phys:{7:PA.slice(0,4).map(w=>[w,cA]),1:PA.slice(4).map(w=>[w,cA]).concat([['fathers',cA,1]])},seqs:[{n:'A',c:cA,blocks:[7,1],fill:[4,4]}],hi:{1:1}}},
    {t:'Decode: a new block on demand',c:'The last block is full, so the next token needs a new logical block 2; vLLM allocates physical block 3 for it and records the mapping (step 3). At most one block per request is ever partly empty: here 3 slots.',s:{phys:{7:PA.slice(0,4).map(w=>[w,cA]),1:PA.slice(4).map(w=>[w,cA]).concat([['fathers',cA,1]]),3:[['brought',cA,1]]},seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]}],hi:{3:1}}}];
  const Aend=one[3].s.phys;
  const B0=[['It',cB],['was',cB],['the',cB]];
  const two=[
    {t:'Request A, as Figure 6 left it',c:'Request A holds physical blocks 7, 1 and 3. The rest of the pool is free; the block engine cut it from one contiguous chunk of GPU memory.',s:{phys:Aend,seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]}]}},
    {t:'Request B arrives: block 5',c:'Request B\'s prompt "It was the" fits one block. The block manager gives it physical block 5, which is not next to anything of B\'s, and need not be (Figure 7). A is held still here for clarity; in vLLM both advance every step.',s:{phys:Object.assign({},Aend,{5:B0}),seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]},{n:'B',c:cB,blocks:[5],fill:[3]}],hi:{5:1}}},
    {t:'B decodes "best"',c:'B\'s first generated token fills its block\'s last slot.',s:{phys:Object.assign({},Aend,{5:B0.concat([['best',cB,1]])}),seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]},{n:'B',c:cB,blocks:[5],fill:[4]}],hi:{5:1}}},
    {t:'B needs a second block: block 2',c:'B\'s next token gets physical block 2, between A\'s blocks 1 and 3. Neighbouring logical blocks of both requests are scattered, and every block in the pool is usable by either request.',s:{phys:Object.assign({},Aend,{5:B0.concat([['best',cB,1]]),2:[['of',cB,1]]}),seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]},{n:'B',c:cB,blocks:[5,2],fill:[4,1]}],hi:{2:1}}},
    {t:'"of times"',c:'B continues in block 2. Two requests, five blocks, 15 tokens, and the waste is the two partly filled last blocks: 5 slots. A contiguous system would have reserved each request\'s maximum length.',s:{phys:Object.assign({},Aend,{5:B0.concat([['best',cB,1]]),2:[['of',cB,1],['times',cB,1]]}),seqs:[{n:'A',c:cA,blocks:[7,1,3],fill:[4,4,1]},{n:'B',c:cB,blocks:[5,2],fill:[4,2]}],hi:{2:1}}}];
  const pr=PA.slice(0,4).map(w=>[w,'var(--c1)']),pr2=PA.slice(4).map(w=>[w,'var(--c1)']);
  const par=[
    {t:'Two samples, one prompt',c:'Parallel sampling asks for two outputs, A1 and A2, from the same prompt. Only one copy of the prompt\'s KV cache is stored: both samples\' logical blocks 0 and 1 map to physical blocks 7 and 1, whose reference counts are 2 (Figure 8).',s:{phys:{7:pr,1:pr2},ref:{7:2,1:2},seqs:[{n:'A1',c:cA,blocks:[7,1],fill:[4,3]},{n:'A2',c:cA2,blocks:[7,1],fill:[4,3]}],hi:{7:1,1:1}}},
    {t:'A1 writes: copy-on-write',c:'A1 sampled "fathers" and must write it into its last logical block, physical block 1, whose reference count is 2. vLLM allocates block 3, the block engine copies block 1 into it, block 1\'s count drops from 2 to 1, and A1 writes into its own copy.',s:{phys:{7:pr,1:pr2,3:pr2.concat([['fathers',cA,1]])},ref:{7:2,1:1,3:1},seqs:[{n:'A1',c:cA,blocks:[7,3],fill:[4,4]},{n:'A2',c:cA2,blocks:[7,1],fill:[4,3]}],hi:{3:1},copy:[1,3]}},
    {t:'A2 writes in place',c:'A2 sampled "mothers". Block 1\'s reference count is already 1, so A2 writes straight into it: no copy. Block 7 stays shared. Only the prompt\'s last, partly filled block was ever copied.',s:{phys:{7:pr,1:pr2.concat([['mothers',cA2,1]]),3:pr2.concat([['fathers',cA,1]])},ref:{7:2,1:1,3:1},seqs:[{n:'A1',c:cA,blocks:[7,3],fill:[4,4]},{n:'A2',c:cA2,blocks:[7,1],fill:[4,4]}],hi:{1:1}}}];
  const bm=(tabs,ref,freed,hi)=>({beam:1,tabs,ref,freed:freed||{},hi:hi||{}});
  const beam=[
    {t:'Four beams, before the iteration',c:'Beam width k = 4, each candidate four blocks long (Figure 9, left of the dotted line). All share block 0, the prompt; candidates 0 to 2 share blocks 1 and 3 and diverge at the fourth; candidate 3 split off at the second block.',s:bm([[0,1,3,5],[0,1,3,6],[0,1,3,7],[0,2,4,8]],{0:4,1:3,3:3,2:1,4:1,5:1,6:1,7:1,8:1})},
    {t:'The new top 4 all descend from candidates 1 and 2',c:'Candidates 0 and 3 drop out of the beam. Their logical blocks are freed and the reference counts of their physical blocks fall; blocks 2, 4, 5 and 8 reach 0 and return to the pool.',s:bm([[0,1,3,6],[0,1,3,6],[0,1,3,7],[0,1,3,7]],{0:4,1:4,3:4,6:2,7:2,2:0,4:0,5:0,8:0},{2:1,4:1,5:1,8:1})},
    {t:'New blocks 9 to 12',c:'The four new candidates write their new tokens into newly allocated blocks 9 to 12. Now all share blocks 0, 1 and 3; candidates 0 and 1 share block 6, candidates 2 and 3 share block 7. A contiguous system would have had to copy most of candidate 2\'s cache to continue the new candidate 3; here at most one block is ever copied.',s:bm([[0,1,3,6,9],[0,1,3,6,10],[0,1,3,7,11],[0,1,3,7,12]],{0:4,1:4,3:4,6:2,7:2,9:1,10:1,11:1,12:1},{},{9:1,10:1,11:1,12:1})}];
  const MODES={one,two,par,beam};
  function cntOf(m,k){const S=MODES[m][k].s;
    if(S.beam){const used=Object.keys(S.ref).filter(b=>S.ref[b]>0).length,noshare=S.tabs.reduce((a,t)=>a+t.length,0);
      return stat('physical blocks in use',used,'of 13')+stat('without sharing',noshare+' blocks','one copy per candidate')+stat('saved by sharing',Math.round(100*(1-used/noshare))+'%','of the blocks')}
    const ids=Object.keys(S.phys),tok=ids.reduce((a,b)=>a+S.phys[b].length,0),alloc=ids.length*4,noshare=S.seqs.reduce((a,q)=>a+q.blocks.length,0);
    return stat('physical blocks in use',ids.length,'of 9, 4 slots each')+stat('slots holding a token',tok,'of '+alloc+' allocated')+stat('slots wasted',alloc-tok,'only in last blocks')+(m==='par'?stat('without sharing',noshare+' blocks',k>0?'one block copied':'no copies yet'):stat('reserved for future tokens','0','beyond the last block'))}
  function draw(m,k,e,W){const S=MODES[m][k].s,P=k>0?MODES[m][k-1].s:null;
    if(S.beam)return drawBeam(S,e,W);
    const wide=W>=640,cw=wide?Math.min(52,(W*.42-50)/4):Math.min(56,(W-60)/4),ch=24,lab=48;
    let s='',y0=18;
    // logical blocks, one table per sequence
    const lw=lab+4*cw,tw=wide?150:0;let ly=y0;const out=[];
    s+=tx(0,12,'Logical KV blocks',{fs:12,w:600});
    S.seqs.forEach(q=>{s+=tx(0,ly+14,q.n,{fs:12,w:700,c:q.c});ly+=20;const nL=Math.max(q.blocks.length+1,2);
      for(let j=0;j<nL;j++){s+=tx(lab-6,ly+ch/2+4,'Block '+j,{fs:11,a:'end',c:'var(--mute)'});
        const pid=q.blocks[j];const cells=pid!=null?(S.phys[pid]||[]):[];
        for(let i=0;i<4;i++){const x=lab+i*cw;s+=rc(x,ly,cw,ch,'none',{r:0,s:'var(--line)'});const c=cells[i];
          if(c&&i<(q.fill[j]||0)){const own=c[1]===q.c||m!=='par';s+=rc(x+1,ly+1,cw-2,ch-2,c[1],{r:2,op:c[2]?.85:.45});s+=tx(x+cw/2,ly+ch/2+4,c[0],{fs:11,a:'middle'})}}
        out.push({y:ly+ch/2,pid,x:lw});ly+=ch}
      ly+=8});
    // block table
    let bt='';if(wide){const bx=lw+18;bt+=tx(bx,12,'Block table',{fs:12,w:600});let by=y0;
      S.seqs.forEach(q=>{bt+=tx(bx,by+14,q.n+': physical, #filled',{fs:11,c:q.c});by+=20;q.blocks.forEach((b,j)=>{bt+=rc(bx,by+2,tw-20,ch-4,'var(--soft)',{r:3,s:'var(--line)'})+tx(bx+8,by+ch/2+4,'logical '+j+' → '+b+', '+q.fill[j],{fs:11});by+=ch});by+=ch+8+(Math.max(q.blocks.length+1,2)-q.blocks.length-1)*ch})}
    // physical pool
    const px=wide?lw+18+tw:lab,py=wide?y0:ly+14,N=9;let ps=tx(px-(wide?0:lab),py-6,'Physical KV blocks (GPU memory)',{fs:12,w:600});
    for(let b=0;b<N;b++){const yy=py+b*ch;ps+=tx(px-6+(wide?lab:0),yy+ch/2+4,String(b),{fs:11,a:'end',c:'var(--mute)'});const cells=S.phys[b]||[];const X0=px+(wide?lab:0);
      for(let i=0;i<4;i++){const x=X0+i*cw;ps+=rc(x,yy,cw,ch,'none',{r:0,s:'var(--line)'});const c=cells[i];
        if(c){const isNew=S.hi&&S.hi[b]&&(!P||!(P.phys[b]&&P.phys[b][i]&&P.phys[b][i][0]===c[0]));const op=isNew?e:1;ps+=G(op,rc(x+1,yy+1,cw-2,ch-2,c[1],{r:2,op:c[2]?.85:.45})+tx(x+cw/2,yy+ch/2+4,c[0],{fs:11,a:'middle'}))}}
      if(S.ref&&S.ref[b]!=null)ps+=tx(X0+4*cw+6,yy+ch/2+4,'ref '+S.ref[b],{fs:11,c:S.ref[b]>1?'var(--acc)':'var(--mute)',w:S.ref[b]>1?600:null});
      if(S.hi&&S.hi[b])ps+=rc(X0-1,yy-1,4*cw+2,ch+2,'none',{r:2,s:'var(--acc)',sw:2,op:e})}
    if(S.copy){const X0=px+(wide?lab:0)-4,a=py+S.copy[0]*ch+ch/2,b=py+S.copy[1]*ch+ch/2;ps+=G(e,'<path d="M'+X0+','+a+' C'+(X0-22)+','+a+' '+(X0-22)+','+b+' '+X0+','+b+'" fill="none" stroke="var(--bad)" stroke-width="2" marker-end="MARK"/>'+tx(X0-24,(a+b)/2+4,'copy',{fs:11,a:'end',c:'var(--bad)'}))}
    // arrows logical -> physical (wide only)
    let ar='';if(wide){const X0=px+lab;out.forEach(o=>{if(o.pid==null)return;const yy=py+o.pid*ch+ch/2;ar+='<line x1="'+(o.x+2)+'" y1="'+o.y+'" x2="'+(X0-26)+'" y2="'+yy+'" stroke="var(--mute)" stroke-width="1" opacity=".55" marker-end="MARK"/>'})}
    const H=wide?Math.max(ly,py+N*ch)+8:py+N*ch+8;
    return svgEl(W,H,s+bt+ps+ar,'block tables')}
  function drawBeam(S,e,W){const cw=Math.min(64,(W-90)/5),ch=26;let s=tx(0,12,'Block table of each beam candidate',{fs:12,w:600});const y0=22;
    S.tabs.forEach((t,r)=>{const y=y0+r*(ch+6);s+=tx(0,y+ch/2+4,'cand. '+r,{fs:11,c:'var(--mute)'});
      t.forEach((b,j)=>{const x=70+j*(cw+4);const shared=S.ref[b]>1;const nw=S.hi[b];s+=G(nw?e:1,rc(x,y,cw,ch,shared?'var(--acc2)':'var(--soft)',{r:3,s:shared?'var(--acc)':'var(--line)'})+tx(x+cw/2,y+ch/2+4,'block '+b,{fs:11,a:'middle'}))})});
    const py=y0+4*(ch+6)+22;s+=tx(0,py-6,'Physical blocks and reference counts',{fs:12,w:600});const bw=Math.min(52,(W-4)/7);
    for(let b=0;b<13;b++){const x=(b%7)*bw,y=py+Math.floor(b/7)*(ch+20);const r=S.ref[b];const fr=S.freed[b];
      s+=rc(x+1,y,bw-4,ch,r>0?(r>1?'var(--acc2)':'var(--soft)'):'none',{r:3,s:fr?'var(--bad)':'var(--line)',da:r>0?null:'3 3'})+tx(x+bw/2-1,y+ch/2+4,String(b),{fs:11,a:'middle',c:r>0?'var(--ink)':'var(--mute)'})+tx(x+bw/2-1,y+ch+13,r>0?'ref '+r:fr?'freed':'free',{fs:11,a:'middle',c:fr?'var(--bad)':'var(--mute)'});
      if(fr)s+=G(e,ln2(x+5,y+4,x+bw-8,y+ch-4,'var(--bad)',{sw:2})+ln2(x+bw-8,y+4,x+5,y+ch-4,'var(--bad)',{sw:2}))}
    return svgEl(W,py+2*(ch+20)+4,s,'beam search block tables')}
  const modes={};Object.keys(MODES).forEach(m=>modes[m]=MODES[m].map(x=>({t:x.t,c:x.c})));
  makeAnim({id:'bt',modes,mode:'one',dur:3200,draw:(m,k,e,w)=>draw(m,k,e,w),counters:(m,k)=>cntOf(m,k)});
})();
