// ---- Compile lab tab (t-comp), part 1: helpers, head, pipeline, fusion animation. Reads window.CMP (32_cmp_data.js) ----
(function(){
const C=window.CMP,$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const ms=v=>(v>=100?Math.round(v).toLocaleString('en-US'):v>=10?v.toFixed(1):v.toFixed(2))+' ms';
const sec=v=>(v/1000).toFixed(1)+' s';
const MiB=b=>b>=1048576?(b/1048576).toFixed(b%1048576?2:0)+' MiB':(b/1024).toFixed(b%1024?1:0)+' KiB';
const MB=b=>(b/1e6).toFixed(2)+' MB';
const renders=[];const onR=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-comp']=window.TAB_RENDER['t-comp']||[]).push(f)};
let rt=0;addEventListener('resize',()=>{const t=$('t-comp');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){}}),80)});
const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
const seg=(el,f)=>RD.seg(el,f);
const U=window.CMPU={esc,fmt,ms,sec,MiB,MB,onR,W,seg,fill:{}};
// derived numbers shared by both parts, also written into the prose (data-cmp)
const S=C.step,Fz=C.fus;
const kinds=L=>({f:L.filter(l=>l[1]==='g').length,e:L.filter(l=>l[1]==='e').length,b:L.filter(l=>l[1]==='b').length});
U.kinds=kinds;
const cold=C.first.cold.slice().sort((a,b)=>a-b),warm=C.first.warm.slice().sort((a,b)=>a-b);
const rng=a=>a[0]===a[a.length-1]?sec(a[0]):(a[0]/1000).toFixed(1)+' to '+sec(a[a.length-1]);
const gel=Fz.new_gelu,gelE=gel.ops.reduce((s,o)=>s+o[1]+o[2],0),gelC=gel.cr+gel.cw;
// ---------- head ----------
const ic=C.ind.cpu[0].L,im=C.ind.mps[0].L;
$('cmp-head').innerHTML=RD.stat('Training step, CPU',ms(S.cpu.eager.med)+' / '+ms(S.cpu.compiled.med),'eager / compiled, 4 threads: no gain')+
 RD.stat('Training step, MPS',ms(S.mps.eager.med)+' / '+ms(S.mps.compiled.med),'eager / compiled: '+(S.mps.eager.med/S.mps.compiled.med).toFixed(2)+'x')+
 RD.stat('Forward, calls to launches',fmt(C.eager.cpu.fwd)+' to '+ic.length,'eager dispatcher calls to compiled launches (CPU); MPS '+C.eager.mps.fwd+' to '+im.length)+
 RD.stat('First call, compiled step',rng(cold),'empty cache; '+rng(warm)+' with a warm cache');
// ---------- 1. pipeline ----------
(function(){
  const a=C.aot,ib=C.ind.cpu[1].L,kf=kinds(ic),kb=kinds(ib);
  const box=[['cmp-s3','1. Dynamo','Python bytecode to an FX graph + guards',C.dyn.graphs+' graph, '+C.dyn.ops+' operations, '+C.dyn.breaks+' graph breaks; '+C.guards.total+' guards'],
   ['cmp-s6','2. AOTAutograd','one joint forward + backward graph, partitioned',fmt(a.fwd_calls)+' ATen calls forward, '+fmt(a.bwd_calls)+' backward; '+a.saved.filter(x=>x[0]!=='primals_54').length+' activations saved for backward'],
   ['cmp-s7','3. Inductor','fusion and code generation',(kf.f+kb.f)+' generated C++ kernel launches + '+(kf.e+kb.e)+' library matmuls + '+(kf.b+kb.b)+' fallbacks per step, against '+fmt(C.eager.cpu.fwd+C.eager.cpu.bwd)+' eager calls'],
   ['cmp-s8','4. Every call after','check guards, run the wrapper','guards checked in about '+Math.round(Math.min(...C.guards.lat_us))+' to '+Math.round(Math.max(...C.guards.lat_us))+' microseconds; a failed guard means a recompile']];
  $('cmp-flow').innerHTML=box.map(b=>'<button data-go="'+b[0]+'"><b>'+b[1]+'</b><span>'+b[2]+'</span><em>'+b[3]+'</em></button>').join('');
  $('cmp-flow').addEventListener('click',e=>{const b=e.target.closest('button');if(b){const s=$(b.dataset.go);if(s)s.scrollIntoView({behavior:RD.RM?'auto':'smooth',block:'start'})}});
})();
// ---------- 2. fusion animation ----------
const EXPR={new_gelu:[['a = 0.5 * x',['x']],['b = x ** 3',['x']],['c = 0.044715 * b',['b']],['d = x + c',['x','c']],['e = 0.79788 * d',['d']],['f = tanh(e)',['e']],['g = 1 + f',['f']],['out = a * g',['a','g']]],
  add_ln:[['s = x + r',['x','r']],['out, mean, rstd = native_layer_norm(s, w, b)',['s','w','b']]]};
const OUTN={new_gelu:['a','b','c','d','e','f','g','out'],add_ln:['s','out']};
const INS={new_gelu:['x'],add_ln:['x','r','w','b']};
U.EXPR=EXPR;
let fn='new_gelu',md='eager';
const NF=8; // sweep frames for the fused loop
function sizeOf(name,f){const sh=Fz[f].shapes;if(f==='new_gelu')return 4*sh[0].reduce((a,b)=>a*b,1);
  if(name==='w'||name==='b')return 1024;return 4*sh[0].reduce((a,b)=>a*b,1)}
function nSteps(){return md==='eager'?Fz[fn].ops.length+1:NF+1}
function cap(i){
  const F=Fz[fn],ops=F.ops;
  if(md==='eager'){
    if(i===0)return 'Eager: '+ops.length+' operations, each a separate kernel. The input'+(INS[fn].length>1?'s are':' is')+' in memory; nothing has run yet.';
    const o=ops[i-1],e=EXPR[fn][i-1];
    return 'Kernel '+i+' of '+ops.length+', <code>aten::'+esc(o[0])+'</code>: <code>'+esc(e[0])+'</code>. Reads '+e[1].join(' and ')+' from memory ('+MiB(o[1])+'), writes a new full-size result ('+MiB(o[2])+').'+(i===ops.length?' Done: every intermediate made a round trip through memory.':'');
  }
  if(i===0)return 'Fused: one kernel, <code>'+esc(F.kname)+'</code> (Inductor names a kernel after the ATen ops it absorbed). It will sweep the input once.';
  const fr=i/NF;
  return (fn==='new_gelu'?'The loop has covered '+Math.round(fr*100)+'% of the 524,288 elements, 4 at a time: load 4 values of x, do all 8 operations in registers, store 4 results.':'The kernel has covered '+Math.round(fr*100)+'% of the 512 rows: for each row of 256 it adds x and r, takes the mean and variance, and writes the normalised row. The full-size sum s is never stored; rows are re-read between passes from cache, and two small per-row buffers (512 floats each) are written.')+(i===NF?' Done: x read once, out written once.':'');
}
function draw(i){
  const el=$('cmp-fu-svg'),w=W(el),F=Fz[fn],ops=F.ops,eg=md==='eager';
  const names=eg?INS[fn].concat(OUTN[fn]):INS[fn].concat(['out']);
  const lw=Math.min(210,Math.max(118,w*0.32)),bw=w-lw-70,rh=fn==='new_gelu'?21:26,top=18;
  const maxB=Math.max(...names.map(n=>sizeOf(n,fn)));
  const chain=fn==='new_gelu'?['load x','* 0.5','x³','* 0.044715','+ x','* 0.79788','tanh','+ 1','*','store']:['load x, r','add','sum','mean','var','normalise','* w + b','store'];
  const perRow=Math.max(1,Math.min(chain.length,Math.floor((w-8)/64))),cRows=Math.ceil(chain.length/perRow);
  const tot=F.ops.reduce((a,o)=>a+o[1]+o[2],0),ftot=F.cr+F.cw;
  const h=top+names.length*rh+(eg?8:30+cRows*28)+46;
  let s='';
  s+=RD.t(4,12,eg?'tensors in memory (bar length = bytes)':'tensors in memory, and the registers of one loop iteration',{fs:11,fill:'var(--mute)'});
  // which rows are read / written at this step
  let rd={},wr={},done={};
  if(eg){for(let k=0;k<i;k++)done[OUTN[fn][k]]=1;if(i>0){EXPR[fn][i-1][1].forEach(n=>rd[n]=1);wr[OUTN[fn][i-1]]=1}}
  names.forEach((n,r)=>{
    const y=top+r*rh,b=sizeOf(n,fn),L=Math.max(3,bw*b/maxB);
    const isIn=INS[fn].includes(n);
    let lab=isIn?n+' (input)':(eg?EXPR[fn][OUTN[fn].indexOf(n)][0]:(fn==='new_gelu'?'out = gelu(x)':'out = layer_norm(x + r)'));
    if(lab.length*6.2>lw-6)lab=lab.slice(0,Math.floor((lw-6)/6.2)-1)+'…';
    s+=RD.t(4,y+rh*0.62,esc(lab),{fs:11.5,fill:rd[n]?'var(--c1)':wr[n]?'var(--c2)':'var(--ink)',w:(rd[n]||wr[n])?600:400});
    let fill='var(--dim)',op=1,wid=L;
    if(isIn){fill=rd[n]?'var(--c1)':'var(--acc2)'}
    else if(eg){if(wr[n])fill='var(--c2)';else if(done[n])fill='var(--soft)';else{op=0}}
    else{fill='var(--c2)';wid=L*i/NF}
    s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+L+'" height="'+(rh-7)+'" rx="2" fill="none" stroke="var(--line)"/>';
    if(op)s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(0,wid)+'" height="'+(rh-7)+'" rx="2" fill="'+fill+'"'+(done[n]&&!wr[n]?' stroke="var(--mute)" stroke-dasharray="3 2"':'')+'/>';
    if(!eg&&isIn&&i>0)s+='<rect x="'+lw+'" y="'+(y+3)+'" width="'+(L*i/NF)+'" height="'+(rh-7)+'" rx="2" fill="var(--c1)" opacity=".55"/>';
    s+=RD.t(lw+L+5,y+rh*0.62,MiB(b),{fs:10.5,fill:'var(--mute)'});
  });
  if(!eg){const y=top+names.length*rh+10;
    const cw=(w-8)/perRow;
    s+=RD.t(4,y+8,'registers (one loop iteration, never written to memory):',{fs:11,fill:'var(--mute)'});
    chain.forEach((c,k)=>{const x=4+(k%perRow)*cw,yy=y+15+Math.floor(k/perRow)*28;const on=i>0;s+='<rect x="'+x+'" y="'+yy+'" width="'+(cw-3)+'" height="24" rx="4" fill="'+(on?'var(--open2)':'var(--soft)')+'" stroke="var(--line)"/>'+RD.t(x+(cw-3)/2,yy+16,c,{a:'middle',fs:10.5})});
  }
  // the whole function's traffic, eager against fused, to one scale
  {const y0=h-44,bw2=w-lw-100,mx2=Math.max(tot,ftot);
   [['eager, all '+F.ops.length+' kernels',tot,'var(--c1)',eg],['fused, 1 kernel',ftot,'var(--c3)',!eg]].forEach((r,k)=>{const y=y0+k*20;
     s+=RD.t(4,y+13,r[0],{fs:11,w:r[3]?600:400})+'<rect x="'+lw+'" y="'+(y+3)+'" width="'+Math.max(2,bw2*r[1]/mx2)+'" height="13" rx="2" fill="'+r[2]+'" opacity="'+(r[3]?1:.45)+'"/>'+RD.t(lw+Math.max(2,bw2*r[1]/mx2)+5,y+13,MiB(r[1])+' moved',{fs:10.5,fill:'var(--mute)'})})}
  el.innerHTML=RD.svg(w,h,s,'Fusion animation');
  // counters
  let R=0,Wr=0,k=0;
  if(eg){for(let j=0;j<i;j++){R+=ops[j][1];Wr+=ops[j][2]}k=i}else{R=F.cr*i/NF;Wr=F.cw*i/NF;k=i>0?1:0}
  const t=F.t;
  $('cmp-fu-st').innerHTML=RD.stat('Kernels launched',k+' of '+(eg?ops.length:1),eg?'one per op':'one for the whole function')+
   RD.stat('Bytes read from memory',MiB(Math.round(R)),'so far')+RD.stat('Bytes written',MiB(Math.round(Wr)),'so far')+
   RD.stat('Measured, CPU / MPS',ms(t.cpu[eg?'eager':'compiled'].med)+' / '+ms(t.mps[eg?'eager':'compiled'].med),(eg?'eager':'compiled')+', median of 5 x 200 calls');
  $('cmp-fu-cap').innerHTML=cap(i);
}
const an=RD.anim({card:'cmp-fu',ctl:'cmp-fu-ctl',n:nSteps(),draw:draw,ms:1500,label:'Fusion step'});
onR(()=>an.redraw());
seg($('cmp-fu-fn'),v=>{fn=v;an.reset(nSteps())});
seg($('cmp-fu-md'),v=>{md=v;an.reset(nSteps())});
$('cmp-fu-k1').textContent=gel.kernel;$('cmp-fu-k2').textContent=Fz.add_ln.kernel;
// predict 1
(function(){const g=gel.t,al=Fz.add_ln.t;
  const sp=d=>(g[d].eager.med/g[d].compiled.med).toFixed(1)+'x';
  $('cmp-pq1-c').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    [...$('cmp-pq1-c').children].forEach(x=>x.classList.toggle('on',x===b));
    const r=$('cmp-pq1-r');r.hidden=false;
    r.innerHTML='<div class="co '+(b.dataset.a==='1'?'key':'warn')+'"><div class="t">'+(b.dataset.a==='1'?'Right.':'Not quite.')+'</div>CPU: '+ms(g.cpu.eager.med)+' eager, '+ms(g.cpu.compiled.med)+' fused, <b>'+sp('cpu')+'</b>. MPS: '+ms(g.mps.eager.med)+' to '+ms(g.mps.compiled.med)+', <b>'+sp('mps')+'</b>. Bytes fell '+(gelE/gelC).toFixed(0)+'x on both. The fused CPU loop moves '+MiB(gelC)+' in '+ms(g.cpu.compiled.med)+', about '+(gelC/g.cpu.compiled.med/1e6).toFixed(1)+' GB/s, far below what the memory can deliver: it is now limited by the arithmetic (tanh on 4-wide vectors), not by memory (derived: bytes / time). The GPU has far more arithmetic per byte, so removing traffic pays more. And add + LayerNorm, where ATen already had one kernel, got slower: '+ms(al.cpu.eager.med)+' to '+ms(al.cpu.compiled.med)+' on CPU, '+ms(al.mps.eager.med)+' to '+ms(al.mps.compiled.med)+' on MPS.</div>'})})();
// prose fills used in this part
U.fill.gel_ratio=(gelE/gelC).toFixed(0);
U.fill.cold=rng(cold);U.fill.warm=rng(warm);U.fill.cold2=rng(cold);
U.gelE=gelE;U.gelC=gelC;U.rng=rng;
})();
