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
    {s:con([]),run:'none',wait:'A, B (C next)',use:[0,0]},
    {s:con([['A',0,21,5],['B',21,23,7]]),run:'A, B',wait:'none',use:[12,44]},
    {s:con([['A',0,21,5],['B',21,23,7]]),run:'A, B',wait:'C',use:[12,44]},
    {s:con([['A',0,21,8,1],['B',21,23,10]]),run:'A, B',wait:'C',use:[18,44]},
    {s:con([['B',21,23,10]]),run:'B',wait:'C',use:[10,23]},
    {s:con([['B',21,23,16,1]]),run:'none',wait:'C (admitted next step)',use:[16,23]}];
  const fb=BKS.fromBlocks,E=null;
  const PAG=[
    {s:fb([E,E,E,E,E,E,E,E,E,E,E,E]),run:'none',wait:'A, B (C next)',use:[0,0]},
    {s:fb([['A',4],['A',1],['B',4],['B',3],E,E,E,E,E,E,E,E]),run:'A, B',wait:'none',use:[12,16]},
    {s:fb([['A',4],['A',1],['B',4],['B',3],['C',4],['C',2],E,E,E,E,E,E]),run:'A, B, C',wait:'none',use:[18,24]},
    {s:fb([['A',4],['A',4],['B',4],['B',4],['C',4],['C',4],['B',2],['C',1],E,E,E,E]),run:'A, B, C',wait:'none',use:[27,32]},
    {s:fb([E,E,['B',4],['B',4],['C',4],['C',4],['B',2],['C',1],E,E,E,E]),run:'B, C',wait:'none',use:[19,24]},
    {s:fb([E,E,['B',4],['B',4],['C',4],['C',4],['B',4],['C',2],['B',4],E,E,E]),run:'none',wait:'none',use:[26,28]}];
  let mode='con';
  function draw(i){
    const F=(mode==='con'?CON:PAG)[i];
    BKS.draw(el,F.s,{blocks:mode==='pag',label:'cache slots, '+(mode==='con'?'contiguous':'paged')});
    const u=F.use;
    document.getElementById('bk-pg-cnt').innerHTML=RD.stat('Running',F.run)+RD.stat('Waiting',F.wait)+RD.stat('Slots holding tokens / slots taken',u[1]?u[0]+' / '+u[1]+' ('+Math.round(100*u[0]/u[1])+'%)':'0 / 0');
  }
  const an=RD.anim({card:'bk-pg-card',ctl:'bk-pg-ctl',n:6,draw:draw,ms:4200,label:'Step',list:'sx-pg-con'});
  RD.seg(document.getElementById('bk-pg-mode'),m=>{mode=m;['con','pag'].forEach(k=>document.getElementById('sx-pg-'+k).hidden=k!==m);an.reset(6,'sx-pg-'+m)});
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
      {b:full,mk:null,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0},
      {b:full,mk:R1,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0},
      {b:without('R3',2,1),mk:new Set([2]),rd:null,run:'R1, R2',wait:'R3, R4',pre:1,rc:13},
      {b:back('R3',[5,8,11,0],13),mk:null,rd:new Set([5,8,11,0]),run:'R2, R3',wait:'R4',pre:1,rc:13}],
    sgl:[
      {b:full,mk:null,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0},
      {b:full,mk:R1,rd:null,run:'R1, R2, R3',wait:'R4',pre:0,rc:0},
      {b:without('R2',1,1),mk:new Set([1]),rd:null,run:'R1, R3',wait:'R2, R4',pre:1,rc:14},
      {b:back('R2',[4,7,10,0],14),mk:null,rd:new Set([4,7,10,0]),run:'R2, R3',wait:'R4',pre:1,rc:14}],
    trt:[
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',0],['R1',0],['R1',0],E,E,E,E,E],mk:null,rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0},
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',1],['R1',0],['R1',0],E,E,E,E,E],mk:new Set([4]),rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0},
      {b:[['R1',4],['R1',4],['R1',4],['R1',4],['R1',1],['R1',0],['R1',0],E,E,E,E,E],mk:null,rd:null,run:'R1',wait:'R2, R3, R4',pre:0,rc:0},
      {b:[['R2',4],['R2',4],['R2',4],['R2',1],['R2',0],['R2',0],['R2',0],['R2',0],E,E,E,E],mk:null,rd:null,run:'R2',wait:'R3, R4',pre:0,rc:0}]};
  let mode='vllm';
  function draw(i){
    const F=M[mode][i];
    BKS.draw(el,fb(F.b),{blocks:true,mark:F.mk,redo:F.rd,label:'preemption, '+mode});
    document.getElementById('bk-pe-cnt').innerHTML=RD.stat('Running',F.run)+RD.stat('Waiting',F.wait)+RD.stat('Preemptions',String(F.pre))+RD.stat('Tokens to recompute',String(F.rc));
  }
  const an=RD.anim({card:'bk-pe-card',ctl:'bk-pe-ctl',n:4,draw:draw,ms:4600,label:'Step',list:'sx-pe-vllm'});
  RD.seg(document.getElementById('bk-pe-mode'),m=>{mode=m;['vllm','sgl','trt'].forEach(k=>document.getElementById('sx-pe-'+k).hidden=k!==m);an.reset(4,'sx-pe-'+m)});
  RD.onResize(()=>an.redraw());
})();
