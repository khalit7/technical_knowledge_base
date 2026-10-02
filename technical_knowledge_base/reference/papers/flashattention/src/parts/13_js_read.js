// ---- The paper tab: memory hierarchy, Figure 2 bars, online softmax demo, Theorem 2 curve ----
(function(){
const RC=PAPER.rc;
// filled-in numbers
$('rdMM').textContent=fmt(RC.fig2.std_matmul_gflops)+' and '+fmt(RC.fig2.fa_matmul_gflops);
$('rdExact').textContent='over 20 random 32 × 4 inputs, the largest difference is '+sci(RC.exact.max_abs_diff,1)+' (recompute.py, float64)';

// memory hierarchy, log scales (section 2.1)
function hier(){const host=$('hierSvg');fit(host,W=>{const lw=Math.min(150,W*.34),bw=W-lw-12,H=150;let s='';
  const cap=[['SRAM, all 108 SMs',108*192*1024,'20.25 MiB'],['HBM',40e9,'40 to 80 GB']],bwd=[['SRAM',19e12,'~19 TB/s'],['HBM',1.5e12,'1.5 to 2.0 TB/s']];
  const lx=(v,lo,hi)=>bw*(Math.log10(v)-Math.log10(lo))/(Math.log10(hi)-Math.log10(lo));
  s+=tx(0,12,'Capacity (log scale, 1 MB to 1 TB)',{fs:11,c:'var(--mute)',w:600});
  cap.forEach((c,i)=>{const y=20+i*24,w=lx(c[1],1e6,1e12);s+=tx(lw-6,y+13,c[0],{fs:11,a:'end'})+rc(lw,y+2,w,15,i?'var(--c2)':'var(--acc)',{op:.85})+tx(Math.min(lw+w+4,W-70),y+13,c[2],{fs:11})});
  s+=tx(0,84,'Bandwidth (log scale, 1 to 30 TB/s)',{fs:11,c:'var(--mute)',w:600});
  bwd.forEach((c,i)=>{const y=92+i*24,w=Math.max(4,lx(c[1],1e12,3e13));s+=tx(lw-6,y+13,c[0],{fs:11,a:'end'})+rc(lw,y+2,w,15,i?'var(--c2)':'var(--acc)',{op:.85})+tx(Math.min(lw+w+4,W-90),y+13,c[2],{fs:11})});
  host.innerHTML=svgW(W,H,s,'A100 memory hierarchy')})}
hier();

// Figure 2 left, as printed
PRED_REVEAL['pr-flops']=function(){const host=$('f2Svg'),t=PAPER.tables.f2;fit(host,W=>{const lw=Math.min(120,W*.3),bw=W-lw-60;let s='';
  t.rows.forEach((r,i)=>{const a=+r[1],b=+r[2],mx=Math.max(a,b),y=i*58;s+=tx(0,y+12,r[0],{fs:12,w:600});
    [['Standard',a,'var(--c2)'],['FlashAttention',b,'var(--acc)']].forEach((q,j)=>{const yy=y+18+j*18;s+=tx(lw-6,yy+12,q[0],{fs:11,a:'end'})+rc(lw,yy+2,bw*q[1]/mx,14,q[2],{op:.85})+tx(lw+bw*q[1]/mx+4,yy+13,String(q[1]),{fs:11})})});
  host.innerHTML=svgW(W,3*58,s,'Figure 2 left: GFLOPs, HBM traffic and runtime')})};

// online softmax, one row
let osSeed=11;
function os(){const B=+$('osB').value,skip=$('osSkip').checked,rng=mulberry32(osSeed);
  const x=[],v=[];for(let i=0;i<8;i++){x.push(+(rng()*6-2).toFixed(2));v.push(+(rng()*2-1).toFixed(2))}
  // direct
  const M=Math.max(...x),e=x.map(a=>Math.exp(a-M)),Ls=e.reduce((a,b)=>a+b,0),wd=e.map(a=>a/Ls),od=wd.reduce((a,w,i)=>a+w*v[i],0);
  // online
  let m=-Infinity,l=0,o=0,rows='';const fac=new Array(8).fill(1),bm=[];
  for(let b0=0;b0<8;b0+=B){const xs=x.slice(b0,b0+B),mt=Math.max(...xs),p=xs.map(a=>Math.exp(a-mt)),lt=p.reduce((a,c)=>a+c,0),pv=p.reduce((a,c,t)=>a+c*v[b0+t],0);
    const mn=skip?mt:Math.max(m,mt),a=skip?1:Math.exp(m-mn),bb=skip?1:Math.exp(mt-mn);
    for(let t=0;t<b0;t++)fac[t]*=a;for(let t=b0;t<b0+B;t++)fac[t]=bb*Math.exp(x[t]-mt);
    const ln=a*l+bb*lt;o=(l*a*o+bb*pv)/ln;
    rows+='<tr><td>'+(b0/B+1)+'</td><td class="mono">'+xs.join(', ')+'</td><td class="num">'+mt.toFixed(2)+'</td><td class="num">'+(skip?'(not tracked)':mn.toFixed(2))+'</td><td class="num">'+(m===-Infinity||skip?'1':'<b>'+a.toFixed(4)+'</b>')+'</td><td class="num">'+ln.toFixed(4)+'</td><td class="num">'+o.toFixed(4)+'</td></tr>';
    m=mn;l=ln}
  const wo=fac.map(f=>f/l);
  $('osT').innerHTML='<tr><th>block</th><th>scores x</th><th class="num">block max m̃</th><th class="num">running m</th><th class="num">rescale e^(m_old − m_new)</th><th class="num">running ℓ</th><th class="num">running output o</th></tr>'+rows+
    '<tr><td colspan="3"><b>Plain softmax over all 8</b></td><td class="num">'+M.toFixed(2)+'</td><td></td><td class="num">'+Ls.toFixed(4)+'</td><td class="num">'+od.toFixed(4)+'</td></tr>';
  const diff=Math.max(...wo.map((w,i)=>Math.abs(w-wd[i])));
  const host=$('osSvg');fit(host,W=>{const H=128,pl=28,bw=(W-pl-8)/8;let s=tx(pl,11,'Weights: plain softmax (outline), by blocks (fill)',{fs:11,c:'var(--mute)'});
    const mx=Math.max(...wd,...wo,0.01);for(let i=0;i<8;i++){const x0=pl+i*bw+3,h1=80*wo[i]/mx,h0=80*wd[i]/mx;s+=rc(x0,104-Math.min(80,h1),bw-6,Math.min(80,h1),skip&&diff>1e-9?'var(--bad)':'var(--acc)',{r:2,op:.75})+rc(x0,104-h0,bw-6,h0,'none',{s:'var(--ink)',sw:1.4,r:2})+tx(x0+(bw-6)/2,120,'x'+(i+1),{fs:11,a:'middle',c:'var(--mute)'})}
    host.innerHTML=svgW(W,H,s,'Online softmax weights against the plain softmax')});
  $('osRep').innerHTML=skip?'<span class="no">Without the rescale</span> each block\'s exponentials stay relative to their own maximum, so blocks with a small maximum are overweighted: the largest weight error is '+diff.toFixed(4)+' and the output is '+o.toFixed(4)+' instead of '+od.toFixed(4)+(B===8?' (with a single block there is nothing to rescale, so it happens to be right)':'')+'.':
    '<span class="ok">Exact:</span> block by block gives output '+o.toFixed(4)+' against '+od.toFixed(4)+' for the plain softmax; the largest weight difference is '+(diff<1e-15?'0':sci(diff,1))+', rounding only. Only two numbers per row (m, ℓ) were carried between blocks.'}
PRED_REVEAL['pr-resc']=os;
$('osB').addEventListener('change',os);$('osSkip').addEventListener('change',os);$('osNew').addEventListener('click',()=>{osSeed=osSeed*7+3;os()});

// Theorem 2: HBM accesses against SRAM size, one head, forward pass
function th(){const N=+$('thN').value,d=+$('thD').value,host=$('thSvg');
  const std=FA.stdF(N,d),fa=M=>FA.faF(N,d,Math.ceil(M/(4*d))),Ms=[];for(let k=10;k<=Math.log2(4*N*d)+.01;k+=.125)Ms.push(2**k);
  const a100=192*1024/2;const lo=Math.min(...Ms.map(fa),std)/3,hi=Math.max(std,fa(Ms[0]))*2;
  fit(host,W=>{const H=230,ex=[];for(let e=Math.floor(Math.log10(lo));e<=Math.ceil(Math.log10(hi));e++)ex.push([10**e,exp10(e)]);
    const f=logFrame({W,H,pl:50,pr:14,pt:14,pb:36,x:[Ms[0],4*N*d],y:[lo,hi],xt:[[1024,'1K'],[8192,'8K'],[65536,'64K'],[524288,'512K'],[4194304,'4M'],[33554432,'32M']].filter(t=>t[0]>=Ms[0]&&t[0]<=4*N*d),yt:ex,xl:'SRAM size M (values)',yl:'HBM accesses'});let s=f.s;
    s+=ln2(f.lx(Ms[0]),f.ly(std),f.lx(4*N*d),f.ly(std),'var(--c2)',{sw:2.2});s+=tx(W-16,f.ly(std)-6,'standard, Θ(Nd + N²)',{fs:11,a:'end',c:'var(--c2)'});
    let p='';Ms.forEach(M=>{p+=(p?'L':'M')+f.lx(M).toFixed(1)+' '+f.ly(fa(M)).toFixed(1)});s+='<path d="'+p+'" fill="none" stroke="var(--acc)" stroke-width="2.2"/>';
    let q='';Ms.forEach(M=>{q+=(q?'L':'M')+f.lx(M).toFixed(1)+' '+f.ly(N*N*d*d/M).toFixed(1)});s+='<path d="'+q+'" fill="none" stroke="var(--acc)" stroke-width="1.2" stroke-dasharray="4 3"/>';
    s+=ln2(f.lx(Ms[0]),f.ly(4*N*d),f.lx(4*N*d),f.ly(4*N*d),'var(--mute)',{da:'2 3'})+tx(f.lx(Ms[0])+4,f.ly(4*N*d)+14,'floor: read Q, K, V, write O (4Nd)',{fs:11,c:'var(--mute)'});
    if(a100<=4*N*d){s+=ln2(f.lx(a100),14,f.lx(a100),H-36,'var(--good)',{da:'3 3'})+tx(f.lx(a100)+4,28,'A100',{fs:11,c:'var(--good)'})}
    s+=tx(f.lx(Ms[2]),f.ly(fa(Ms[2]))+16,'FlashAttention, Algorithm 1',{fs:11,c:'var(--acc)'});
    host.innerHTML=svgW(W,H,s,'Theorem 2: HBM accesses against SRAM size')});
  const fM=fa(a100);$('thRep').innerHTML='The green line is the A100: 192 KB = 98,304 fp16 values. Solid blue: Algorithm 1 counted exactly, with B<sub>c</sub> = ⌈M / 4d⌉ (it steps because T<sub>c</sub> is a whole number of passes). Dashed blue: the Θ(N²d²/M) term alone. At the A100\'s M, one head of N = '+fmt(N)+', d = '+d+' moves '+fmt(fM)+' values against standard attention\'s '+fmt(std)+' ('+(std/fM).toFixed(1)+'× fewer). Doubling M from there: '+fmt(fa(2*a100))+' ('+(fM/fa(2*a100)).toFixed(2)+'× fewer again). The halving holds while the passes over Q dominate, that is while M is small against Nd; near the floor (short sequences, or M close to Nd) each doubling buys less, as with N = 1,024.'}
PRED_REVEAL['pr-sram']=th;$('thN').addEventListener('change',th);$('thD').addEventListener('change',th);
})();
