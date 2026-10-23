// ---- Reading sections 2 and 6: 48 cache slots in 12 blocks of 4. BKS.draw draws them; the paging stepper (contiguous
// against paged, the same three requests) and the preemption stepper (vLLM, SGLang, TensorRT-LLM rules on one full pool)
// use it. Illustrative inputs, stated in each card's note. ----
window.BKS=(function(){
  const COL={A:'var(--c1)',B:'var(--c3)',C:'var(--c2)',R1:'var(--c1)',R2:'var(--c3)',R3:'var(--c2)'};
  // slots: 48 items {o: owner or null, k: 't' token | 'r' reserved, empty | 'w' never used}; o.blocks: draw block borders and numbers;
  // o.mark: set of block indexes to outline; o.redo: set of block indexes to outline as recomputed
  function draw(el,slots,o){
    const W=Math.max(300,Math.min(860,RD.width(el))),bpr=W>=600?12:6,gap=o.blocks?6:0,cell=Math.min(17,Math.floor((W-4-(bpr-1)*gap)/(bpr*4)));
    const bw=4*cell,rowsH=cell+20;let b='';
    for(let k=0;k<12;k++){
      const r=Math.floor(k/bpr),c=k%bpr,x=2+c*(bw+gap),y=16+r*(rowsH+6);
      if(o.blocks)b+=RD.t(x+bw/2,y-4,String(k),{a:'middle',fs:11,fill:'var(--mute)'});
      for(let j=0;j<4;j++){const s=slots[4*k+j],cx=x+j*cell;
        if(!s.o){b+='<rect x="'+cx+'" y="'+y+'" width="'+(cell-1)+'" height="'+cell+'" fill="none" stroke="var(--line)" stroke-dasharray="2 2"/>';continue}
        const f=COL[s.o];
        if(s.k==='t')b+='<rect x="'+cx+'" y="'+y+'" width="'+(cell-1)+'" height="'+cell+'" fill="'+f+'"/>';
        else if(s.k==='r')b+='<rect x="'+cx+'" y="'+y+'" width="'+(cell-1)+'" height="'+cell+'" fill="'+f+'" fill-opacity="0.22" stroke="'+f+'" stroke-width="0.8"/>';
        else b+='<rect x="'+cx+'" y="'+y+'" width="'+(cell-1)+'" height="'+cell+'" fill="var(--bad)" fill-opacity="0.18" stroke="var(--bad)" stroke-dasharray="2 1.5"/>';
        const i=4*k+j;if(s.k==='t'&&(i===0||slots[i-1].o!==s.o)&&cell>=12)b+=RD.t(cx+(cell-1)/2,y+cell/2+4,s.o.replace('R',''),{a:'middle',fs:11,fill:'var(--bg)',w:600});
      }
      if(o.blocks)b+='<rect x="'+(x-1)+'" y="'+(y-1)+'" width="'+(bw+1)+'" height="'+(cell+2)+'" fill="none" stroke="'+(o.mark&&o.mark.has(k)?'var(--bad)':o.redo&&o.redo.has(k)?'var(--acc)':'var(--ink)')+'" stroke-width="'+((o.mark&&o.mark.has(k))||(o.redo&&o.redo.has(k))?2.4:1)+'"'+(o.redo&&o.redo.has(k)?' stroke-dasharray="4 2"':'')+'/>';
    }
    const H=16+Math.ceil(12/bpr)*(rowsH+6)-14;
    el.innerHTML=RD.svg(W,H,b,o.label||'cache slots');
  }
  // blocks: 12 items [owner, tokens, reserved slots] (owner null = free)
  function fromBlocks(bl){const s=[];bl.forEach(x=>{for(let j=0;j<4;j++)s.push(!x||!x[0]?{o:null}:{o:x[0],k:j<x[1]?'t':(j<x[1]+(x[2]||0)?'r':'r')})});return s}
  return {draw,fromBlocks,COL};
})();
// ---- section 2: contiguous reservation against paging ----
(function(){
  const el=document.getElementById('bk-pg-svg');if(!el)return;
  function con(runs){const s=[];for(let i=0;i<48;i++)s.push({o:null});runs.forEach(r=>{for(let i=0;i<r[2];i++)s[r[1]+i]={o:r[0],k:i<r[3]?'t':(r[4]?'w':'r')}});return s}
  // [owner, start, reserved length, tokens, finished]
  const CON=[
    {s:con([]),run:'none',wait:'A, B (C next)',use:[0,0],cap:['Three requests, 48 free slots','A (5-token prompt), B (7) and C (6) will arrive. Each may write up to max_tokens = 16 more tokens, so a contiguous scheme reserves prompt + 16 slots in one piece.']},
    {s:con([['A',0,21,5],['B',21,23,7]]),run:'A, B',wait:'none',use:[12,44],cap:['A and B reserve 21 and 23 slots','Their prompts fill 12 slots; the other 32 are held for answers that may never come (reservation). 4 slots remain.']},
    {s:con([['A',0,21,5],['B',21,23,7]]),run:'A, B',wait:'C',use:[12,44],cap:['C arrives and must wait','C needs 22 contiguous slots and only 4 are free. Memory holding 12 tokens turns a request away.']},
    {s:con([['A',0,21,8,1],['B',21,23,10]]),run:'A, B',wait:'C',use:[18,44],cap:['Three decode steps: A ends','A wrote its 3 answer tokens and stopped at 8 of its 21 slots: 13 were reserved for nothing (internal fragmentation, red). B holds 10 of 23.']},
    {s:con([['B',21,23,10]]),run:'B',wait:'C',use:[10,23],cap:['A is released, C still waits','25 slots are free, but in two pieces of 21 and 4, and C needs 22 in one piece (external fragmentation).']},
    {s:con([['B',21,23,16,1]]),run:'none',wait:'C (admitted next step)',use:[16,23],cap:['B ends after 9 answer tokens','B used 16 of its 23 slots; 7 were never used. Only now can C start, five steps late. At the peak, 18 tokens filled 44 slots taken: 41%.']}];
  const fb=BKS.fromBlocks,E=null;
  const PAG=[
    {s:fb([E,E,E,E,E,E,E,E,E,E,E,E]),run:'none',wait:'A, B (C next)',use:[0,0],cap:['Three requests, 12 blocks of 4 slots','The same requests. Nothing is reserved for answers: a request takes a block only when its last block is full.']},
    {s:fb([['A',4],['A',1],['B',4],['B',3],E,E,E,E,E,E,E,E]),run:'A, B',wait:'none',use:[12,16],cap:['A and B take 2 blocks each','A\'s 5 prompt tokens fill blocks 0 and 1 (one slot of the second), B\'s 7 fill blocks 2 and 3. 16 slots taken, 12 hold tokens.']},
    {s:fb([['A',4],['A',1],['B',4],['B',3],['C',4],['C',2],E,E,E,E,E,E]),run:'A, B, C',wait:'none',use:[18,24],cap:['C arrives and is admitted at once','C\'s 6 tokens take blocks 4 and 5. Three requests run where the contiguous scheme ran two.']},
    {s:fb([['A',4],['A',4],['B',4],['B',4],['C',4],['C',4],['B',2],['C',1],E,E,E,E]),run:'A, B, C',wait:'none',use:[27,32],cap:['Three decode steps: A ends','A filled its second block; B and C each needed a third and took blocks 6 and 7 from the free list. The only waste is each request\'s unfilled last block: 5 slots.']},
    {s:fb([E,E,['B',4],['B',4],['C',4],['C',4],['B',2],['C',1],E,E,E,E]),run:'B, C',wait:'none',use:[19,24],cap:['A\'s blocks go back to the free list','Blocks 0 and 1 are free again; with prefix caching they stay cached until the space is needed (section 3).']},
    {s:fb([E,E,['B',4],['B',4],['C',4],['C',4],['B',4],['C',2],['B',4],E,E,E]),run:'none',wait:'none',use:[26,28],cap:['B and C end','B needed a fourth block and took block 8: its block table is 2, 3, 6, 8, scattered, and the attention kernel follows it. At the peak, 27 tokens filled 32 slots taken: 84%.']}];
  let mode='con';
  function draw(i){
    const F=(mode==='con'?CON:PAG)[i];
    BKS.draw(el,F.s,{blocks:mode==='pag',label:'cache slots, '+(mode==='con'?'contiguous':'paged')});
    document.getElementById('bk-pg-cap').innerHTML='<div class="t">'+(i+1)+'. '+F.cap[0]+'</div><p>'+F.cap[1]+'</p>';
    const u=F.use;
    document.getElementById('bk-pg-cnt').innerHTML=RD.stat('Running',F.run)+RD.stat('Waiting',F.wait)+RD.stat('Slots holding tokens / slots taken',u[1]?u[0]+' / '+u[1]+' ('+Math.round(100*u[0]/u[1])+'%)':'0 / 0');
  }
  const an=RD.anim({card:'bk-pg-card',ctl:'bk-pg-ctl',n:6,draw:draw,ms:2400,label:'Step'});
  RD.seg(document.getElementById('bk-pg-mode'),m=>{mode=m;an.reset(6)});
  RD.onResize(()=>an.redraw());
})();
// ---- section 6: one full pool under three engines' rules ----
(function(){
  const el=document.getElementById('bk-pe-svg');if(!el)return;
  const fb=BKS.fromBlocks,E=null;
  // interleaved layout: R1 in blocks 0,3,6,9; R2 in 1,4,7,10; R3 in 2,5,8,11
  const full=[['R1',4],['R2',4],['R3',4],['R1',4],['R2',4],['R3',4],['R1',4],['R2',4],['R3',4],['R1',4],['R2',2],['R3',1]];
  const R1=new Set([0,3,6,9]);
  const without=(own,give,tok)=>full.map((b,k)=>b[0]===own?(k===give?['R1',tok]:E):b);
  // after the victim was freed and R1 ended: start from the pool with R1's and the victim's blocks free, put the victim back in the given blocks
  const back=(own,blocks,tok)=>{const a=full.map(b=>b[0]==='R1'||b[0]===own?E:b.slice());let t=tok;blocks.forEach(k=>{a[k]=[own,Math.min(4,t)];t-=Math.min(4,t)});return a};
  const M={
    vllm:[
      {b:full,mk:null,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0,cap:['The pool is full','Three requests hold all 12 blocks. R1 (the oldest) has just filled its fourth block; R3 arrived last.']},
      {b:full,mk:R1,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0,cap:['R1 needs a fifth block, and none is free','Admission reserved nothing for answers, so the engine must take memory from someone.']},
      {b:without('R3',2,1),mk:new Set([2]),rd:null,run:'R1, R2',wait:'R3, R4',pre:1,rc:13,cap:['vLLM preempts the newest request, R3','R3\'s 4 blocks are freed and its cache dropped; R3 goes to the front of the waiting queue. R1 takes a freed block (2) and continues.']},
      {b:back('R3',[5,8,11,0],13),mk:null,rd:new Set([5,8,11,0]),run:'R2, R3',wait:'R4',pre:1,rc:13,cap:['R1 ends; R3 comes back and recomputes','R3\'s 10 prompt and 3 generated tokens are computed again as a prompt chunk in the token budget, or loaded from a host tier if one is on (section 4).']}],
    sgl:[
      {b:full,mk:null,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0,cap:['The pool is full','The same three requests: R1 has 7 output tokens, R2 1, R3 3.']},
      {b:full,mk:R1,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0,cap:['R1 needs a fifth block, and none is free','SGLang admitted with an estimate of each request\'s future tokens, and the estimate was low.']},
      {b:without('R2',1,1),mk:new Set([1]),rd:null,run:'R1, R3',wait:'R2, R4',pre:1,rc:14,cap:['SGLang retracts the request with the fewest output tokens, R2','Least work generated is lost: R2 had 1 output token (ties go to the longest prompt). Its 4 blocks are freed and R1 takes block 1.']},
      {b:back('R2',[4,7,10,0],14),mk:null,rd:new Set([4,7,10,0]),run:'R2, R3',wait:'R4',pre:1,rc:14,cap:['R1 ends; R2 comes back and recomputes','R2\'s 13 prompt tokens and 1 output token are computed again. SGLang then raises its estimate of future tokens, admitting less optimistically.']}],
    trt:[
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',0],['R1',0],['R1',0],E,E,E,E,E],mk:null,rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0,cap:['Admission reserved the worst case','R1 was admitted with prompt + max_tokens = 25 slots, 7 blocks. R2 needs 29 slots (8 blocks) and R3 26 (7): only 5 blocks are free, so both wait.']},
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',1],['R1',0],['R1',0],E,E,E,E,E],mk:new Set([4]),rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0,cap:['R1 needs a fifth block: it already has it','Its reservation covers any answer up to max_tokens, so no allocation can fail.']},
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',1],['R1',0],['R1',0],E,E,E,E,E],mk:null,rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0,cap:['No preemption, ever','The price is concurrency: one request runs where vLLM and SGLang ran three, and 7 of the 12 blocks hold nothing.']},
      {b:[['R2',4],['R2',4],['R2',4],['R2',1],['R2',0],['R2',0],['R2',0],['R2',0],E,E,E,E],mk:null,rd:null,run:'R2',wait:'R3, R4',pre:0,rc:0,cap:['R1 ends; R2 is admitted with its full reservation','R3 still waits for 7 free blocks. In the simulation below, this rule served 1,785 tokens per second against 2,364 for optimistic admission.']}]};
  let mode='vllm';
  function draw(i){
    const F=M[mode][i];
    BKS.draw(el,fb(F.b),{blocks:true,mark:F.mk,redo:F.rd,label:'preemption, '+mode});
    document.getElementById('bk-pe-cap').innerHTML='<div class="t">'+(i+1)+'. '+F.cap[0]+'</div><p>'+F.cap[1]+'</p>';
    document.getElementById('bk-pe-cnt').innerHTML=RD.stat('Running',F.run)+RD.stat('Waiting',F.wait)+RD.stat('Preemptions',String(F.pre))+RD.stat('Tokens to recompute',String(F.rc));
  }
  const an=RD.anim({card:'bk-pe-card',ctl:'bk-pe-ctl',n:4,draw:draw,ms:2600,label:'Step'});
  RD.seg(document.getElementById('bk-pe-mode'),m=>{mode=m;an.reset(4)});
  RD.onResize(()=>an.redraw());
})();
