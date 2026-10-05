// ---- Config explorer tab (t-cfg) ----
// occupancy: port of NVIDIA's cuda_occupancy.h rules as in the parent page (src/compile/occ/occ.py); checked against
// src/code/recompute.py by src/check/check_js.mjs
window.TG_ARCH={sm_80:{cc:80,maxW:64,maxB:32,smemSM:164*1024,smemBlock:163*1024},sm_90a:{cc:90,maxW:64,maxB:32,smemSM:228*1024,smemBlock:227*1024},
  sm_100a:{cc:100,maxW:64,maxB:32,smemSM:228*1024,smemBlock:227*1024},sm_120:{cc:120,maxW:48,maxB:24,smemSM:100*1024,smemBlock:99*1024}};
window.TG_occ=function(arch,regs,smem,warps){
  const a=TG_ARCH[arch],ru=(x,y)=>Math.ceil(x/y)*y;
  const limW=Math.floor(a.maxW/warps),rpw=ru(regs*32,256);
  const limR=(rpw*ru(warps,4)>65536||rpw*warps>65536||regs>256)?0:Math.floor(Math.floor(Math.floor(65536/4)/rpw)*4/warps);
  const limS=smem>a.smemBlock?0:Math.floor(a.smemSM/ru(smem+1024,128));
  let lim=Math.min(limR,limS,limW,a.maxB);
  lim=Math.min(lim,a.maxB*([80,90,100].includes(a.cc)?2:1));
  return {blocks:lim,limR,limS,limW,limB:a.maxB};
};
window.TG_smem=(asyncmma,ns,bm,bn,bk,b)=>(asyncmma?ns:Math.max(ns-1,1))*(bm*bk+bk*bn)*b;
(function(){
  const D=window.TGD,$=id=>document.getElementById(id);
  let selKey=null;
  const kb=b=>(b/1024).toFixed(b%1024?1:0)+' KB';
  function label(r){const c=r.cx;return c.BM+' x '+c.BN+' x '+c.BK+', '+r.nw+' warp'+(r.nw>1?'s':'')+', '+r.ns+' stage'+(r.ns>1?'s':'')}
  function render(){
    const t=$('cf-t').value,set=$('cf-set').value,A=TG_ARCH[t];
    const rows=D.sweep.filter(r=>r.t===t&&r.k.startsWith(set)&&r.ok);
    let h='<table><thead><tr><th>Configuration</th><th class="num">Registers</th><th class="num">Stack (spills)</th><th class="num">Shared</th><th>Launches?</th><th class="num">Programs per SM</th><th>MMA</th></tr></thead><tbody>';
    rows.forEach(r=>{const fits=r.smem<=A.smemBlock,o=TG_occ(t,r.regs,r.smem,r.nw);
      h+='<tr data-k="'+r.k+'"'+(r.k===selKey?' class="sel"':'')+'><td>'+label(r)+'</td><td class="num">'+r.regs+'</td><td class="num'+(r.stack?' bad':'')+'">'+(r.stack?r.stack.toLocaleString('en-US')+' B':'0')+'</td><td class="num">'+kb(r.smem)+'</td><td class="'+(fits?'ok':'bad')+'">'+(fits?'yes':'no, over '+kb(A.smemBlock))+'</td><td class="num">'+o.blocks+'</td><td>'+r.nmma+' '+r.mma+'</td></tr>'});
    $('cf-tbl').innerHTML=h+'</tbody></table>';
    const fitN=rows.filter(r=>r.smem<=A.smemBlock).length;
    if(!rows.some(r=>r.k===selKey))selKey=rows[0]&&rows[0].k;
    detail(t);
    $('cf-tbl').querySelector('table').insertAdjacentHTML('beforebegin','<p class="small">'+fitN+' of '+rows.length+' fit '+t+'\'s per-block limit of '+kb(A.smemBlock)+'. Click a row for details.</p>');
  }
  function detail(t){
    const r=D.sweep.find(x=>x.k===selKey&&x.t===t);if(!r){$('cf-detail').innerHTML='';return}
    const A=TG_ARCH[t],o=TG_occ(t,r.regs,r.smem,r.nw),lim=Math.min(o.limR,o.limS,o.limW,o.limB);
    const why=[['registers',o.limR],['shared memory',o.limS],['warp slots',o.limW],['block slots',o.limB]].filter(x=>x[1]===lim).map(x=>x[0]).join(' and ');
    const m=(v,max,c)=>'<div class="meter"><span style="width:'+Math.min(100,v/max*100).toFixed(1)+'%;background:'+c+'"></span></div>';
    $('cf-detail').innerHTML='<div class="detail"><h3>'+label(r)+' on '+t+'</h3>'+
      '<div class="small">Registers per thread: '+r.regs+' of 255</div>'+m(r.regs,255,'var(--c1)')+
      '<div class="small">Shared memory: '+kb(r.smem)+' of '+kb(A.smemBlock)+' per block</div>'+m(r.smem,A.smemBlock,r.smem>A.smemBlock?'var(--bad)':'var(--c2)')+
      '<div class="out">'+RD.stat('Programs per SM',o.blocks,lim===0?'cannot launch':'limited by '+why)+RD.stat('Warps per SM',o.blocks*r.nw,'of '+A.maxW)+RD.stat('Async copy instructions',r.ldgsts,'LDGSTS in the listing')+RD.stat('Tensor-core instructions',r.nmma+' '+r.mma,'static count')+'</div>'+
      '<p class="small">'+(r.smem>A.smemBlock?'This configuration compiles, and Triton raises OutOfResources when it loads it on this GPU; autotuning times it as infinitely slow and moves on.':r.stack?'The compiler spilled: the accumulator and operand fragments do not fit in 255 registers per thread at this warp count.':'Fits. Whether it is fast depends on the shape and needs a timing on the GPU.')+'</p></div>';
  }
  $('cf-tbl').addEventListener('click',e=>{const tr=e.target.closest('tr[data-k]');if(!tr)return;selKey=tr.dataset.k;render()});
  $('cf-t').addEventListener('change',render);$('cf-set').addEventListener('change',()=>{selKey=null;render()});
  function pred(){
    const v=id=>+$(id).value,bm=v('cf-bm'),bn=v('cf-bn'),bk=v('cf-bk'),ns=v('cf-ns'),b=v('cf-dt');
    const rows=Object.keys(TG_ARCH).map(t=>{const am=t==='sm_90a'||t==='sm_100a',s=TG_smem(am,ns,bm,bn,bk,b),fit=s<=TG_ARCH[t].smemBlock;
      return '<tr><td><b>'+t+'</b></td><td>'+(am?'wgmma / tcgen05: '+ns+' buffer'+(ns>1?'s':''):'mma.sync: '+Math.max(ns-1,1)+' buffer'+(Math.max(ns-1,1)>1?'s':''))+'</td><td class="num">'+kb(s)+'</td><td class="'+(fit?'ok':'bad')+'">'+(fit?'fits':'over '+kb(TG_ARCH[t].smemBlock))+'</td></tr>'});
    $('cf-pred').innerHTML='<p class="small">One stage = ('+bm+' x '+bk+' + '+bk+' x '+bn+') x '+b+' B = '+kb((bm*bk+bk*bn)*b)+'.</p><div class="tw"><table><thead><tr><th>GPU</th><th>Path (with 4 or more warps)</th><th class="num">Predicted shared</th><th></th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div><p class="small mute">The MMA path assumes 4 or more warps (Hopper and Blackwell fall back to mma.sync below 4, and Blackwell did so at 16 warps here too) and adds nothing for epilogue buffers or barriers (Blackwell adds 8 to 16 bytes). Other kernels (attention, TMA, warp-specialised) allocate differently.</p>';
  }
  ['cf-bm','cf-bn','cf-bk','cf-ns','cf-dt'].forEach(id=>$(id).addEventListener('change',pred));
  render();pred();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cfg']=window.TAB_RENDER['t-cfg']||[]).push(render);
})();
