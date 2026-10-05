// ---- Launch planner tab: occupancy (port of cuda_occupancy.h), suggestion, waves ----
window.PMOCC=(function(){
  const ARCH={sm_80:{cc:80,maxW:64,maxB:32,smemSM:164*1024,smemBlock:163*1024},
    sm_90a:{cc:90,maxW:64,maxB:32,smemSM:228*1024,smemBlock:227*1024},
    sm_100a:{cc:100,maxW:64,maxB:32,smemSM:228*1024,smemBlock:227*1024},
    sm_120:{cc:120,maxW:48,maxB:24,smemSM:100*1024,smemBlock:99*1024}};
  const ru=(x,y)=>Math.ceil(x/y)*y,BIG=1e9;
  function blocks(arch,regs,smem,block,bars,maxT){
    if(block>maxT)return {n:0,lim:'launch bounds'};
    const a=ARCH[arch],wc=Math.ceil(block/32);
    const limW=Math.floor(a.maxW/wc);
    const rpw=ru(regs*32,256);let limR;
    if(rpw*ru(wc,4)>65536||rpw*wc>65536||regs>256)limR=0;else if(rpw>0)limR=Math.floor(Math.floor(16384/rpw)*4/wc);else limR=BIG;
    const per=ru(smem+1024,128);let limS=Math.floor(a.smemSM/per);if(smem>a.smemBlock)limS=0;
    let lims={registers:limR,'shared memory':limS,'warps':limW,'block slots':a.maxB};
    if(bars){const k=(a.cc===80||a.cc===90||a.cc===100)?2:1;lims.barriers=Math.floor(a.maxB*k/bars)}
    let n=BIG,lim='';Object.keys(lims).forEach(k=>{if(lims[k]<n){n=lims[k];lim=k}});
    return {n,lim,lims,wc}}
  function suggest(arch,regs,smem,bars,maxT,sms){const limit=ARCH[arch].maxW*32,top=Math.min(1024,maxT);let best=[0,0,0];
    for(let b=ru(top,32);b>0;b-=32){const bt=Math.min(top,b),r=blocks(arch,regs,smem,bt,bars,maxT).n;
      if(bt*r>best[0])best=[bt*r,bt,r];if(best[0]===limit)break}
    return {block:best[1],minGrid:best[2]*sms}}
  return {ARCH,blocks,suggest};
})();
(function(){
  const P=window.PM,O=window.PMOCC,$=id=>document.getElementById(id);
  if(!$('pl-gpu'))return;
  const KN={scale_1d:'scale (one per element)',scale_stride:'scale (grid-stride)',block_sum:'block_sum (shared memory)',hist_shared:'hist_shared (shared atomics)',
    two_phase:'two_phase (grid sync)',cluster_exchange:'cluster_exchange (sm_90+)',heavy_plain:'heavy_plain (128 regs)',heavy_lb1024:'heavy_lb1024',heavy_lb256x8:'heavy_lb256x8'};
  const LC={registers:'var(--c2)','shared memory':'var(--c4)',warps:'var(--c1)','block slots':'var(--c3)',barriers:'var(--c5)','launch bounds':'var(--dim)'};
  $('pl-gpu').innerHTML=P.gpus.map((g,i)=>'<option value="'+i+'"'+(g.arch==='sm_90a'?' selected':'')+'>'+g.name+' ('+g.arch+', '+g.sms+' SMs)</option>').join('');
  $('pl-k').innerHTML=Object.keys(KN).map(k=>'<option value="'+k+'">'+KN[k]+'</option>').join('')+'<option value="custom">Custom</option>';
  $('pl-chk').textContent=P.occ_check.cases.toLocaleString('en-US')+' of '+P.occ_check.cases.toLocaleString('en-US')+' values ('+P.occ_check.mismatches+' mismatches; '+P.occ_check.kernels+' kernel and GPU pairs, every block size from 32 to 1,024 plus the suggestion)';
  $('pl-leg').innerHTML=Object.keys(LC).map(k=>'<span style="--sw:'+LC[k]+'">limited by '+k+'</span>').join('');
  const S={g:1,k:'scale_1d',regs:10,smem:0,bars:0,maxT:1024};
  function loadPreset(){const g=P.gpus[S.g],r=P.occ[g.arch][S.k];
    if(S.k==='custom'){S.missing=false;return}
    if(!r){S.missing=true;return}S.missing=false;S.regs=r.regs;S.smem=r.smem;S.bars=r.bars;S.maxT=r.maxT;
    $('pl-reg').value=S.regs;$('pl-sm').value=S.smem;$('pl-bar').value=String(Math.min(1,S.bars));$('pl-maxt').value=String(S.maxT)}
  function render(){
    const g=P.gpus[S.g],a=O.ARCH[g.arch],B=+$('pl-b').value,n=Math.max(1,+$('pl-n').value||1),mode=$('pl-mode').value;
    $('pl-regv').textContent=S.regs;$('pl-smv').textContent=S.smem.toLocaleString('en-US');$('pl-bv').textContent=B;
    const ctlOff=S.k!=='custom';['pl-reg','pl-sm','pl-bar','pl-maxt'].forEach(id=>{$(id).disabled=ctlOff});
    if(S.missing){$('pl-out').innerHTML=RD.stat('Not compiled for '+g.arch,'n/a','clusters need compute capability 9.0 or later: nvcc refused sm_80');$('pl-fig').innerHTML='';$('pl-note').textContent='';return}
    const r=O.blocks(g.arch,S.regs,S.smem,B,S.bars,S.maxT),occ=r.n*Math.ceil(B/32)/a.maxW;
    const sg=O.suggest(g.arch,S.regs,S.smem,S.bars,S.maxT,g.sms);
    const perWave=r.n*g.sms;
    let grid=mode==='elem'?Math.ceil(n/B):(mode==='rows'?n:perWave);
    const waves=perWave?Math.ceil(grid/perWave):Infinity,last=perWave?grid-(waves-1)*perWave:0;
    let o=RD.stat('Blocks per SM',r.n,r.n?'limited by '+r.lim:'does not fit: '+r.lim)+RD.stat('Occupancy',Math.round(occ*1000)/10+'%',(r.n*Math.ceil(B/32))+' of '+a.maxW+' warps')+
      RD.stat('Suggested block size',sg.block||'none','CUDA occupancy API; min grid '+sg.minGrid.toLocaleString('en-US'))+
      RD.stat('Grid',grid.toLocaleString('en-US')+' blocks',mode==='stride'?'= '+g.sms+' SMs &times; '+r.n:(mode==='elem'?'ceil(n / block)':'one per row'))+
      RD.stat('Waves',isFinite(waves)?waves.toLocaleString('en-US'):'none',perWave?perWave.toLocaleString('en-US')+' blocks per wave':'')+
      RD.stat('Last wave',perWave?Math.round(1000*last/perWave)/10+'% full':'n/a',perWave&&waves>1?'tail cost: '+Math.round(1000*(1-last/perWave)/waves)/10+'% of the run idle':'')+
      RD.stat('Cooperative launch max',perWave.toLocaleString('en-US')+' blocks','grid.sync() needs grid &le; this');
    if(mode==='stride')o+=RD.stat('Elements per thread',grid?Math.ceil(n/(grid*B)).toLocaleString('en-US'):'n/a',grid?'grid-stride iterations, at most':'nothing fits');
    $('pl-out').innerHTML=o;
    // occupancy for every block size
    const W=Math.min(RD.width($('pl-fig')),860),h=170,l=34,bt=30,pw=W-l-6,ph=h-bt-8,bw=pw/32;
    let b='';[0,50,100].forEach(p=>{const y=8+ph-ph*p/100;b+='<line x1="'+l+'" x2="'+(l+pw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"></line>'+RD.t(l-4,y+4,p+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    for(let k=0;k<32;k++){const bs=32*(k+1),q=O.blocks(g.arch,S.regs,S.smem,bs,S.bars,S.maxT),oc=q.n*(k+1)/a.maxW,y=8+ph-ph*oc;
      b+='<rect x="'+(l+k*bw+1)+'" y="'+y+'" width="'+Math.max(1,bw-2)+'" height="'+Math.max(0,ph*oc)+'" style="fill:'+LC[q.lim]+';opacity:'+(bs===B?1:0.55)+'"'+(bs===B?' stroke="var(--ink)" stroke-width="1.5"':'')+'></rect>';
      if(bs===sg.block)b+=RD.t(l+k*bw+bw/2,y-3,'▼',{a:'middle',fs:10,fill:'var(--ink)'});
      if(k%4===3||k===0)b+=RD.t(l+k*bw+bw/2,8+ph+13,bs,{a:'middle',fs:9.5,fill:'var(--mute)'})}
    b+=RD.t(l+pw/2,h-3,'block size (threads); ▼ = suggested; outlined = chosen',{a:'middle',fs:10,fill:'var(--mute)'});
    $('pl-fig').innerHTML=RD.svg(W,h,b,'Occupancy for every block size');
    const rr=P.occ[g.arch][S.k];
    $('pl-note').innerHTML=S.k==='custom'?'Custom values: same rules, not run through the header.':
      'Preset from ptxas: '+rr.regs+' registers, '+rr.smem+' B static shared memory, '+rr.bars+' barrier'+(rr.bars===1?'':'s')+(rr.spill_st?', '+rr.spill_st.toLocaleString('en-US')+' B of spill stores':'')+(rr.maxT<1024?', launch bounds '+rr.maxT+' threads':'')+'. NVIDIA\'s header gives '+rr.blocks[B/32-1]+' blocks per SM at this block size.'}
  $('pl-gpu').addEventListener('change',e=>{S.g=+e.target.value;loadPreset();render()});
  $('pl-k').addEventListener('change',e=>{S.k=e.target.value;loadPreset();render()});
  $('pl-reg').addEventListener('input',e=>{S.regs=+e.target.value;render()});
  $('pl-sm').addEventListener('input',e=>{S.smem=+e.target.value;render()});
  $('pl-bar').addEventListener('change',e=>{S.bars=+e.target.value;render()});
  $('pl-maxt').addEventListener('change',e=>{S.maxT=+e.target.value;render()});
  ['pl-b','pl-n'].forEach(id=>$(id).addEventListener('input',render));$('pl-mode').addEventListener('change',render);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-plan']=window.TAB_RENDER['t-plan']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-plan').hidden)render()});
  loadPreset();render();
})();
