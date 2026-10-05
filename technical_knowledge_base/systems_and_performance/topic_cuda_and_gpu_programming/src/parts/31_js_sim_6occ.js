// ---- GPU simulator: 4 occupancy calculator and the register-file animation ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-occ-card'))return;
  const AR=C.ARCH,KEYS=Object.keys(AR);
  const opt=k=>'<option value="'+k+'">'+k+' (cc '+AR[k].cc+': '+AR[k].name+')</option>';
  $('sim-occ-arch').innerHTML=KEYS.map(opt).join('');$('sim-occ-arch').value='sm_90a';
  $('sim-rf-arch').innerHTML=KEYS.map(opt).join('');$('sim-rf-arch').value='sm_90a';
  const PRE=(D&&D.ptxas)||[];
  const DESC={vadd:'vector add',matmul_naive:'naive matmul',matmul_tiled:'tiled matmul, 32 x 32 tiles',reduce_sum:'warp-shuffle sum',softmax_rows:'row softmax',acc16:'register ladder, 16 sums',acc32:'register ladder, 32 sums',acc64:'register ladder, 64 sums',acc128:'register ladder, 128 sums',acc192:'register ladder, 192 sums',acc256:'register ladder, 256 sums'};
  $('sim-occ-pre').innerHTML='<option value="">your own numbers</option>'+PRE.map((p,j)=>'<option value="'+j+'">'+p.fn+' ('+(DESC[p.fn]||'')+')</option>').join('');
  const S={arch:'sm_90a',b:256,r:32,s:0,bars:1,pre:'',x:'r'};
  function fromPreset(){
    if(S.pre==='')return null;const p=PRE[+S.pre];
    const a=p.by_arch[S.arch]||p.by_arch.sm_80;
    return {p,a,exact:!!p.by_arch[S.arch]};
  }
  function applyPreset(){
    const f=fromPreset();if(!f)return;
    S.b=f.p.block;S.r=f.a.regs;S.s=f.a.smem;S.bars=Math.max(1,f.a.bars||0);
    $('sim-occ-b').value=S.b;$('sim-occ-r').value=S.r;$('sim-occ-s').value=Math.min(S.s,+$('sim-occ-s').max);
  }
  const kb=b=>b>=1024?U.fmt(b/1024,b%1024?1:0)+' KB':b+' B';
  const fig=$('sim-occ-fig');
  function draw(){
    const a=AR[S.arch];
    $('sim-occ-s').max=a.smemBlock;if(S.s>a.smemBlock)S.s=a.smemBlock;
    $('sim-occ-bv').textContent=S.b+' ('+Math.ceil(S.b/32)+' warps)';$('sim-occ-rv').textContent=S.r;$('sim-occ-sv').textContent=kb(S.s);
    const f=fromPreset();
    $('sim-occ-src').innerHTML=f?'<span class="sim-tag doc">ptxas</span>'+f.p.fn+': '+f.a.regs+' registers, '+kb(f.a.smem)+' shared memory, '+(f.a.bars||0)+' barrier'+((f.a.bars||0)===1?'':'s')+(f.exact?' from <code>ptxas -v</code> for '+S.arch:' (ptxas was run for sm_80, sm_90a, sm_100a and sm_120 only; showing the sm_80 numbers)')+', CUDA 13.4, in the {{Compiler explorer|#t-compile}}; block of '+f.p.block+' threads as the kernel is written.'+((f.p.spill[S.arch]||0)>0?' It spills '+f.p.spill[S.arch]+' bytes per thread.':''):'Move the sliders, or pick a kernel compiled in the Compiler explorer tab.';
    const o=C.occupancy(S.arch,S.r,S.s,S.b,S.bars);
    const lims=[['registers',o.lim_reg],['shared memory',o.lim_smem],['warp slots',o.lim_warps],['block slots',o.lim_blocks]];
    const bar=Math.floor(o.lim_blocks*a.bar/Math.max(1,S.bars));if(S.bars)lims.push(['barriers',bar]);
    const minL=Math.min(...lims.map(l=>l[1])),lim=lims.filter(l=>l[1]===minL).map(l=>l[0]);
    $('sim-occ-out').innerHTML=U.stat('Blocks per SM',o.blocks,'of '+o.lim_blocks+' block slots')+U.stat('Warps per SM',o.warps,'of '+a.maxW)+
      '<div class="stat'+(o.occ<0.5?' lim':'')+'"><div class="k">Theoretical occupancy</div><div class="v">'+U.pct(o.occ)+'</div><div class="d">warps / max warps</div></div>'+
      U.stat('Limited by',lim.join(', '),o.blocks===0?'the block does not fit at all':'')+U.stat('Threads per SM',o.warps*32,'of '+a.maxW*32);
    const mxL=Math.max(...lims.map(l=>Math.min(l[1],64)),1);
    $('sim-occ-lims').innerHTML='<p class="small mute" style="margin:6px 0 2px">Blocks each resource allows on one SM (the smallest wins):</p>'+lims.map(l=>'<div class="row"><span class="nm">'+l[0]+'</span><span class="track"><span class="fill" style="width:'+(100*Math.min(l[1],64)/mxL)+'%;background:'+(l[1]===minL?'var(--bad)':'var(--c1)')+'"></span></span><span class="val">'+(l[1]>=1e9?'no limit':l[1])+'</span></div>').join('');
    // sweep chart
    const W=U.width(fig),H=190,ml=40,mr=10,mt=12,mb=34,pw=W-ml-mr,ph=H-mt-mb;
    let xs,xl,xv;
    if(S.x==='r'){xs=[];for(let r=8;r<=255;r++)xs.push(r);xl='registers per thread';xv=S.r}
    else if(S.x==='s'){xs=[];for(let s=0;s<=a.smemBlock;s+=512)xs.push(s);xl='shared memory per block (KB)';xv=S.s}
    else{xs=[];for(let b=32;b<=1024;b+=32)xs.push(b);xl='threads per block';xv=S.b}
    const val=x=>S.x==='r'?C.occupancy(S.arch,x,S.s,S.b,S.bars).occ:S.x==='s'?C.occupancy(S.arch,S.r,x,S.b,S.bars).occ:C.occupancy(S.arch,S.r,S.s,x,S.bars).occ;
    const x0=xs[0],x1=xs[xs.length-1],X=x=>ml+pw*(x-x0)/(x1-x0),Y=v=>mt+ph*(1-v);
    let b='';
    [0,.25,.5,.75,1].forEach(v=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.t(ml-4,Y(v)+3.5,(100*v)+'%',{fs:10,a:'end',fill:'var(--mute)'})});
    let d='';xs.forEach((x,j)=>{const v=val(x);d+=(j?'L':'M')+X(x).toFixed(1)+' '+Y(v).toFixed(1)});
    b+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    const ticks=S.x==='r'?[8,32,64,96,128,160,192,224,255]:S.x==='s'?[0,32,64,96,128,160,192,224].map(k=>k*1024).filter(s=>s<=a.smemBlock):[32,128,256,384,512,640,768,896,1024];
    ticks.forEach(tk=>{if(W<420&&ticks.indexOf(tk)%2)return;b+=U.t(X(tk),H-mb+14,S.x==='s'?tk/1024:tk,{fs:10,a:'middle',fill:'var(--mute)'})});
    b+=U.t(ml+pw/2,H-4,xl,{fs:11,a:'middle',fill:'var(--mute)'});
    const cv=val(xv);b+='<circle cx="'+X(Math.min(x1,Math.max(x0,xv)))+'" cy="'+Y(cv)+'" r="5" fill="var(--bad)"/>';
    fig.innerHTML=U.svg(W,H,b,'Theoretical occupancy as one input varies');
  }
  $('sim-occ-arch').addEventListener('change',e=>{S.arch=e.target.value;applyPreset();draw()});
  $('sim-occ-pre').addEventListener('change',e=>{S.pre=e.target.value;applyPreset();draw()});
  $('sim-occ-b').addEventListener('input',e=>{S.b=+e.target.value;S.pre='';$('sim-occ-pre').value='';draw()});
  $('sim-occ-r').addEventListener('input',e=>{S.r=+e.target.value;S.pre='';$('sim-occ-pre').value='';draw()});
  $('sim-occ-s').addEventListener('input',e=>{S.s=+e.target.value;S.pre='';$('sim-occ-pre').value='';draw()});
  U.seg($('sim-occ-x'),m=>{S.x=m;draw()});
  // default: the tiled matmul preset if present
  {const j=PRE.findIndex(p=>p.fn==='matmul_tiled');if(j>=0){S.pre=String(j);$('sim-occ-pre').value=S.pre;applyPreset()}}
  $('sim-occ-valid').innerHTML='<span class="sim-tag sim">VALIDATED</span>This JavaScript and its Python reference agree with NVIDIA\'s own <code>cuda_occupancy.h</code> (CUDA 13.4.2, compiled and run in a container without a GPU) on all 5,292 combinations of 6 targets x 9 register counts x 7 shared-memory sizes x 7 block sizes x 0 or 1 barriers: blocks per SM and every individual limit.';
  U.onRender(draw);U.onResize(draw);

  // ---------- register file animation ----------
  const acc=PRE.find(p=>p.fn==='acc128');
  let rfMode=0,rfArch='sm_90a';
  const rfFig=$('sim-rf-fig');
  function rfRegs(){const a=acc&&(acc.by_arch[rfArch]||acc.by_arch.sm_80);const r=a?a.regs:168;return rfMode?Math.min(128,r):r}
  function plan(){
    const regs=rfRegs(),a=AR[rfArch],o=C.occupancy(rfArch,regs,0,128,0);
    const units=Math.ceil(regs*32/256);
    const warps=[];for(let w=0;w<o.warps;w++)warps.push({blk:Math.floor(w/4),sp:w%4,slot:Math.floor(w/4)});
    return {regs,units,o,warps,a};
  }
  let P=plan();
  function rfDraw(i){
    const W=U.width(rfFig),lw=W<480?28:92,cw=Math.max(3,Math.floor((W-lw-4)/64)),rh=Math.max(16,Math.min(24,cw*2.2));
    let b='';
    const placed=P.warps.slice(0,i);
    for(let sp=0;sp<4;sp++){
      const y=4+sp*(rh+6);
      b+=U.t(lw-6,y+rh*0.68,W<480?'SP'+sp:'sub-partition '+sp,{fs:10.5,a:'end',fill:'var(--mute)'});
      for(let u=0;u<64;u++)b+=U.rect(lw+u*cw,y,cw-.6,rh,'var(--soft)',{st:'var(--line)',sw:.5});
      placed.filter(w=>w.sp===sp).forEach(w=>{const x=lw+w.slot*P.units*cw;
        b+=U.rect(x+.5,y+1,P.units*cw-1.6,rh-2,w.blk%2?'var(--c4)':'var(--c1)',{rx:2,tip:'block '+w.blk+', warp '+(4*w.blk+sp)+': '+P.units*256+' registers'});
        if(P.units*cw>34)b+=U.t(x+P.units*cw/2,y+rh*0.68,'B'+w.blk,{fs:10,a:'middle',fill:'var(--bg)'})});
    }
    const H=4+4*(rh+6)+16;
    b+=U.t(lw,H-3,W<480?'one cell = 256 registers':'one cell = 256 registers; 64 cells = 16,384 registers per sub-partition',{fs:10,fill:'var(--mute)'});
    rfFig.innerHTML=U.svg(W,H,b,'The SM register file filling with warps');
    const used=placed.length*P.units,left=64-P.units*Math.ceil(P.warps.length/4);
    let cap;
    if(i===0)cap=P.regs+' registers per thread x 32 lanes = '+(P.regs*32).toLocaleString('en-US')+' per warp, rounded up to '+(P.units*256).toLocaleString('en-US')+' ('+P.units+' cells). A block of 128 threads is 4 warps, one per sub-partition.';
    else if(i<P.warps.length){const w=P.warps[i-1];cap='Block '+w.blk+', warp '+(i-1)+' takes '+P.units+' cells in sub-partition '+w.sp+'.'}
    else cap='Full: '+P.o.blocks+' blocks, '+P.o.warps+' warps. The next warp needs '+P.units+' cells and each sub-partition has '+(64-P.units*(P.o.warps/4))+' left. Occupancy '+P.o.warps+' / '+P.a.maxW+' = '+U.pct(P.o.occ)+'.';
    $('sim-rf-cap').textContent=cap;
    $('sim-rf-out').innerHTML=U.stat('Registers per thread',P.regs,rfMode?'capped':'ptxas -v, '+rfArch)+U.stat('Warps placed',placed.length,'max '+P.a.maxW+' warp slots')+U.stat('Registers in use',(used*256).toLocaleString('en-US'),'of 65,536')+U.stat('Occupancy',U.pct(placed.length/P.a.maxW),'when full: '+U.pct(P.o.occ));
  }
  const RA=U.anim({card:'sim-rf-card',ctl:'sim-rf-ctl',n:P.warps.length+1,draw:rfDraw,ms:450,label:'Warp placed'});
  function rfUpdate(){P=plan();RA.reset(P.warps.length+1)}
  U.seg($('sim-rf-mode'),m=>{rfMode=+m;rfUpdate();RA.play()});
  $('sim-rf-arch').addEventListener('change',e=>{rfArch=e.target.value;rfUpdate()});
  document.querySelectorAll('#t-sim .sim-acc-r').forEach(e=>{if(acc)e.textContent=acc.by_arch.sm_90a.regs});
  U.onResize(()=>RA.redraw());
})();
