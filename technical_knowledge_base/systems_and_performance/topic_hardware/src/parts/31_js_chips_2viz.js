// ---- Chip atlas (t-chips): headline peel, timeline, growth animation, ridge chart, capacity, measured, prices, drills ----
(function(){
  const X=window.CHIPX,{D,BY,esc,sig,fF,fGB,fBW,FN}=X;
  const svg=(w,h,b,l)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(l||'')+'">'+b+'</svg>';
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const lg=Math.log10;
  const st=window.CHIPSTATE;

  // ================= 1. Headline peel (before/after on the same normalisation) =================
  // head: the vendor's printed headline in TFLOPS; n: chips it covers; f: the format of the headline; sparse: printed with sparsity
  const PAIRS={
    gb200_vs_h100:{a:{lab:'GB200 NVL72 rack',head:1440000,n:72,f:'fp4',fl:'FP4',sparse:true,chip:'gb200',src:'nv_gb200'},b:{lab:'H100 SXM',head:3958,n:1,f:'fp8',fl:'FP8',sparse:true,chip:'h100',src:'nv_h100'}},
    gb300_vs_dgxb200:{a:{lab:'GB300 NVL72 rack',head:1440000,n:72,f:'fp4',fl:'FP4',sparse:true,chip:'gb300',src:'nv_gb300'},b:{lab:'DGX B200 (8 GPUs)',head:144000,n:8,f:'fp4',fl:'FP4',sparse:true,chip:'b200',src:'nv_dgxb200'}},
    v7pod_vs_gb300:{a:{lab:'TPU7x pod',head:42500000,n:9216,f:'fp8',fl:'FP8',sparse:false,chip:'tpu7x',src:'g_v7_blog'},b:{lab:'GB300 NVL72 rack',head:1440000,n:72,f:'fp4',fl:'FP4',sparse:true,chip:'gb300',src:'nv_gb300'}},
    helios_vs_vr:{a:{lab:'AMD Helios rack',head:2900000,n:72,f:'fp4',fl:'MXFP4',sparse:false,chip:'mi455x',src:'amd_helios'},b:{lab:'Vera Rubin NVL72',head:3600000,n:72,f:'fp4',fl:'NVFP4 "inference"',sparse:true,chip:'rubin',src:'nv_vr'}}
  };
  function peelVals(s){const c=BY[s.chip],per=s.head/s.n,dense=c.peaks[s.f];return [s.head,per,dense,c.peaks.bf16]}
  window.CHIPPEEL=function(k){const p=PAIRS[k];return {a:peelVals(p.a),b:peelVals(p.b)}}; // for check_page.mjs
  let pair='gb200_vs_h100',pv=null;
    function peelCap(i,p,A,B){const a=p.a,b=p.b,ca=BY[a.chip],cb=BY[b.chip];
    const r=(x,y)=>sig(x/y)+'x';
    if(i===0)return '<b>Step 1, as printed.</b> '+esc(a.lab)+': '+fF(A[0])+' '+esc(a.fl)+(a.sparse?' with sparsity':'')+' ('+X.srcA(a.src,'source')+'). '+esc(b.lab)+': '+fF(B[0])+' '+esc(b.fl)+(b.sparse?' with sparsity':'')+' ('+X.srcA(b.src,'source')+'). Read naively, the first is '+r(A[0],B[0])+' the second.';
    if(i===1)return '<b>Step 2, per chip.</b> Divide by the chips each figure covers: '+a.n.toLocaleString('en-US')+' and '+b.n.toLocaleString('en-US')+'. Now '+fF(A[1])+' against '+fF(B[1])+': '+r(A[1],B[1])+'.';
    if(i===2){const ha=a.sparse?A[1]/A[2]:1,hb=b.sparse?B[1]/B[2]:1;
      return '<b>Step 3, dense.</b> Replace each sparse figure with the vendor’s own dense figure in the same format: '+fF(A[2])+' and '+fF(B[2])+' ('+r(A[2],B[2])+').'+
        ((a.sparse&&Math.abs(ha-2)>.05)||(b.sparse&&Math.abs(hb-2)>.05)?' Note: here the sparse figure is not twice the dense one ('+(a.sparse?esc(ca.short)+' '+sig(ha)+'x':'')+(a.sparse&&b.sparse?', ':'')+(b.sparse?esc(cb.short)+' '+sig(hb)+'x':'')+'), so "halve it" would have been wrong: always look for the printed dense value.':' Dense is exactly half of sparse here.')}
    if(i===3)return '<b>Step 4, the same format.</b> Training runs mostly in BF16, so use each chip’s BF16 dense rate: '+fF(A[3])+' and '+fF(B[3])+'. '+esc(ca.short)+' / '+esc(cb.short)+' = '+r(A[3],B[3])+'.';
    return '<b>What changed.</b> The headline ratio was '+r(A[0],B[0])+'; per chip, at equal format and without sparsity, it is '+r(A[3],B[3])+'. Memory bandwidth per chip: '+fBW(ca.bw)+' against '+fBW(cb.bw)+' ('+r(ca.bw,cb.bw)+'), often the number that decides speed.'}
  function peelDraw(i){const p=PAIRS[pair],A=peelVals(p.a),B=peelVals(p.b),k=Math.min(i,3);
    const host=document.getElementById('chip-peelplot'),W=X.width(host)-12,H=150,l=8,rr=8,x0=l,x1=W-rr,lo=2,hi=8;
    const xs=v=>x0+(x1-x0)*(Math.max(lo,Math.min(hi,lg(v)))-lo)/(hi-lo);
    const target=[A[k],B[k]];
    X.tween(pv,target,550,v=>{let b='';
      [[2,'100 TFLOPS'],[3,'1 PFLOPS'],[4,'10 PF'],[5,'100 PF'],[6,'1 EFLOPS'],[7,'10 EF'],[8,'100 EF']].forEach(t=>{const x=xs(Math.pow(10,t[0]));b+='<line x1="'+x+'" x2="'+x+'" y1="18" y2="'+(H-20)+'" stroke="var(--line)"/>'+((W>500||t[0]%2===0)?T(x,H-6,t[1],{a:t[0]===2?'start':t[0]===8?'end':'middle',fs:10,fill:'var(--mute)'}):'')});
      [[p.a,v[0],'var(--c3)',30],[p.b,v[1],'var(--c1)',80]].forEach(o=>{const w=Math.max(2,xs(o[1])-x0);b+=T(x0,o[3]-6,esc(o[0].lab)+(k>0?' → per chip':''),{fs:12,w:600})+'<rect x="'+x0+'" y="'+o[3]+'" width="'+w.toFixed(1)+'" height="22" rx="3" fill="'+o[2]+'"/>';
        const lab=fF(o[1]),inside=w>90;b+=T(inside?x0+w-6:x0+w+6,o[3]+15,lab,{a:inside?'end':'start',fs:12,w:600,fill:inside?'var(--bg)':'var(--ink)'})});
      host.innerHTML=svg(W,H,b,'Headline compute of two systems, normalised step by step, log scale')});
    pv=target;
    document.getElementById('chip-peelcap').innerHTML='<span class="mute">'+(i+1)+' / 5.</span> '+peelCap(i,p,A,B);
    const ratio=A[k]/B[k];
    document.getElementById('chip-peelcnt').innerHTML=['<div class="stat"><div class="k">Ratio now</div><div class="v">'+sig(ratio)+'x</div><div class="d">'+esc(p.a.lab)+' / '+esc(p.b.lab)+'</div></div>',
      '<div class="stat"><div class="k">Headline ratio</div><div class="v">'+sig(A[0]/B[0])+'x</div><div class="d">as printed</div></div>',
      '<div class="stat"><div class="k">BF16 dense per chip</div><div class="v">'+sig(A[3]/B[3])+'x</div><div class="d">the like-for-like answer</div></div>'].join('')}
  const peelA=X.anim({card:'chip-peelcard',ctl:'chip-peelctl',n:5,draw:peelDraw,ms:2600,label:'Normalisation step'});
  document.getElementById('chip-peelpair').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pair=b.dataset.m;pv=null;
    document.querySelectorAll('#chip-peelpair button').forEach(x=>x.classList.toggle('on',x===b));peelA.reset(5)});

  // ================= 2. Timeline =================
  let tlSel=null;
  function metric(c,m){if(m==='bf16')return c.peaks.bf16;if(m==='low')return X.low(c)[0];if(m==='bw')return c.bw;if(m==='mem')return c.mem;if(m==='ridge')return X.ridge(c,'bf16');return null}
  function shortLab(m,v){if(m==='bf16'||m==='low')return v>=1e6?v/1e6+'E':v>=1e3?v/1e3+'P':v>=1?v+'T':v*1e3+'G';if(m==='bw')return v>=1?v+'TB/s':v*1e3+'GB/s';if(m==='mem')return v>=1e3?v/1e3+'TB':v+'GB';return String(v)}
  const MU={bf16:fF,low:fF,bw:fBW,mem:fGB,ridge:v=>sig(v)+' FLOPs/byte'};
  function timeline(){const host=document.getElementById('chip-tl'),m=document.getElementById('chip-tlm').value;
    const pts=D.chips.filter(c=>c.rel&&metric(c,m)!=null&&metric(c,m)>0);
    const W=X.width(host)-12,H=Math.max(260,Math.min(380,W*.55)),l=42,r=10,t=12,b=26;
    const t0=Date.UTC(2020,0,1),t1=Date.UTC(2027,0,1),tx=s=>{const d=Date.parse(s+'T00:00:00Z');return l+(W-l-r)*(d-t0)/(t1-t0)};
    const vs=pts.map(c=>metric(c,m)),lo=Math.floor(lg(Math.min.apply(null,vs))),hi=Math.ceil(lg(Math.max.apply(null,vs))+.05);
    const ty=v=>t+(H-t-b)*(1-(lg(v)-lo)/(hi-lo));
    let s='';for(let e=lo;e<=hi;e++){const y=ty(Math.pow(10,e));s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+T(l-4,y+4,shortLab(m,Math.pow(10,e)),{a:'end',fs:10,fill:'var(--mute)'})}
    for(let yr=2020;yr<=2026;yr++){const x=tx(yr+'-01-01');s+='<line x1="'+x+'" x2="'+x+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--line)"/>'+T(x+2,H-8,String(yr),{fs:10,fill:'var(--mute)'})}
    const placed=pts.map(c=>{const x=tx(c.rel),y=ty(metric(c,m));return [x-6,y-6,x+6,y+6]});const order=pts.slice().sort((a,b)=>metric(b,m)-metric(a,m));
    order.forEach(c=>{const x=tx(c.rel),y=ty(metric(c,m)),col=X.VC[c.vendor]||'var(--mute)',an=c.status==='announced';
      s+='<circle data-id="'+c.id+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(tlSel===c.id?7:5)+'" fill="'+(an?'var(--bg)':col)+'" stroke="'+col+'" stroke-width="2" style="cursor:pointer"/>';
      const lw=c.short.length*5.8,lx=x+8,ly=y+4,box=[lx,ly-9,lx+lw,ly+2];
      if(lx+lw<W-2&&!placed.some(p=>!(box[2]<p[0]||box[0]>p[2]||box[3]<p[1]||box[1]>p[3]))){placed.push(box);s+=T(lx,ly,esc(c.short),{fs:10})}});
    host.innerHTML=svg(W,H,s,'Chips by release date against '+m+', log scale');
    host.querySelectorAll('circle[data-id]').forEach(el=>el.addEventListener('click',()=>{tlSel=el.dataset.id;timeline()}));
    const cap=document.getElementById('chip-tlcap');
    if(tlSel&&BY[tlSel]){const c=BY[tlSel],v=metric(c,m);cap.innerHTML='<b>'+esc(c.name)+'</b>, '+esc(c.reltxt)+': '+(v==null?'not published':MU[m](v))+(m==='low'?' ('+FN[X.low(c)[1]]+')':'')+'. <a href="#" data-sel="'+c.id+'">Open in the table</a>.'}
    document.getElementById('chip-tlleg').innerHTML=Object.keys(X.VC).map(k=>'<span><i style="background:'+X.VC[k]+'"></i>'+k+'</span>').join('')+'<span><i class="h"></i>announced (hollow)</span>'}
  document.getElementById('chip-tlm').addEventListener('change',timeline);
  document.getElementById('chip-tlcap').addEventListener('click',e=>{const a=e.target.closest('a[data-sel]');if(!a)return;e.preventDefault();st.sel=a.dataset.sel;window.CHIPTAB.rows();window.CHIPTAB.detail();document.getElementById('chip-det').scrollIntoView({block:'nearest'})});

  // ================= 3. Compute against bandwidth over generations (animated) =================
  const GEN=['a100','h100','h200','b200','b300','rubin'];
  function growth(){const a=BY.a100;return GEN.map(id=>{const c=BY[id],lw=X.low(c);return {id,c,bf:c.peaks.bf16/a.peaks.bf16,lo:lw[0]/a.peaks.bf16,lf:lw[1],bw:c.bw/a.bw,mem:c.mem/a.mem,ridge:c.peaks.bf16/c.bw}})}
  window.CHIPGROWTH=growth;
  function grDraw(i){const G=growth(),host=document.getElementById('chip-gr'),W=X.width(host)-12,H=240,l=34,r=8,t=10,b=34,lo=0,hi=lg(150);
    const ty=v=>t+(H-t-b)*(1-(lg(v)-lo)/(hi-lo)),gw=(W-l-r)/GEN.length,bw=Math.min(18,gw/4.2);
    let s='';[1,2,5,10,20,50,100].forEach(v=>{const y=ty(v);s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+T(l-4,y+4,v+'x',{a:'end',fs:10,fill:'var(--mute)'})});
    G.forEach((g,j)=>{const cx=l+gw*(j+.5),on=j<=i;
      [[g.bf,'var(--c1)'],[g.lo,'var(--c2)'],[g.bw,'var(--c3)']].forEach((o,q)=>{const x=cx+(q-1.5)*bw*1.1,y=ty(Math.max(1,o[0]));
        s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,ty(1)-y).toFixed(1)+'" fill="'+o[1]+'" opacity="'+(on?1:.12)+'"/>';
        if(on&&j===i)s+=T(x+bw/2,y-3,sig(o[0],2),{a:'middle',fs:9.5,w:600})});
      s+=T(cx,H-18,esc(g.c.short),{a:'middle',fs:10.5,w:j===i?600:400})+T(cx,H-6,g.c.rel.slice(0,4),{a:'middle',fs:9.5,fill:'var(--mute)'})});
    host.innerHTML=svg(W,H,s,'Compute and bandwidth relative to A100, log scale');
    const g=G[i],cap=[
      '<b>A100 (2020) is the baseline:</b> 312 TFLOPS BF16 dense against 2.04 TB/s, so a kernel must do about '+sig(G[0].ridge)+' FLOPs per byte it reads to keep the tensor cores busy.',
      '<b>H100 (2022):</b> BF16 compute 3.2x, FP8 (new) 6.3x, but bandwidth only 1.6x. The ridge almost doubles to '+sig(G[1].ridge)+': kernels that were compute-bound on A100 become memory-bound.',
      '<b>H200 (2023):</b> the same compute with HBM3e: bandwidth 2.4x the A100 and memory 1.8x. The only generation here where the ridge falls ('+sig(G[2].ridge)+'): NVIDIA spent the step on memory, because inference was memory-bound.',
      '<b>B200 (2024):</b> two dies; BF16 7.2x, FP4 (new) 29x, bandwidth 3.9x. In BF16 the ridge is '+sig(G[3].ridge)+'; in FP4 it is '+sig(BY.b200.peaks.fp4/BY.b200.bw)+'.',
      '<b>B300 (2025):</b> BF16 unchanged from B200, FP4 1.5x, memory 288 GB. Compute in the lowest format is now 43x the A100 while bandwidth is 3.9x.',
      '<b>Rubin (announced 2026):</b> BF16 13x, NVFP4 112x, and HBM4 at 22 TB/s, 11x. Bandwidth caught up in BF16 (ridge '+sig(G[5].ridge)+'), not in the low formats (FP4 ridge '+sig(BY.rubin.peaks.fp4/BY.rubin.bw)+'). The lesson for kernels and batch sizes: the cheaper the arithmetic, the more reuse per byte you need.'][i];
    document.getElementById('chip-grcap').innerHTML=cap;
    document.getElementById('chip-grcnt').innerHTML=['<div class="stat"><div class="k"><span style="color:var(--c1)">&#9632;</span> BF16 compute</div><div class="v">'+sig(g.bf,3)+'x</div><div class="d">'+fF(g.c.peaks.bf16)+'</div></div>',
      '<div class="stat"><div class="k"><span style="color:var(--c2)">&#9632;</span> Lowest format</div><div class="v">'+sig(g.lo,3)+'x</div><div class="d">'+fF(X.low(g.c)[0])+' '+FN[g.lf]+'</div></div>',
      '<div class="stat"><div class="k"><span style="color:var(--c3)">&#9632;</span> Bandwidth</div><div class="v">'+sig(g.bw,3)+'x</div><div class="d">'+fBW(g.c.bw)+'</div></div>',
      '<div class="stat"><div class="k">Ridge, BF16</div><div class="v">'+sig(g.ridge)+'</div><div class="d">FLOPs per byte</div></div>'].join('')}
  X.anim({card:'chip-grcard',ctl:'chip-grctl',n:GEN.length,draw:grDraw,ms:3200,label:'Generation'});

  // ================= 4. Ridge point of every chip =================
  // arithmetic intensity of an M x K x N matmul reading A, B and writing C once, s bytes per element
  const AI=(M,K,N,s)=>2*M*K*N/(s*(M*K+K*N+M*N));
  window.CHIPAI=AI;
  function ridgeChart(){const f=document.getElementById('chip-rfmt').value,host=document.getElementById('chip-ridge'),s=f==='bf16'?2:f==='fp8'?1:.5;
    const rows=D.chips.map(c=>({c,r:X.ridge(c,f)})).filter(o=>o.r!=null).sort((a,b)=>b.r-a.r);
    const W=X.width(host)-12,rh=19,l=Math.min(112,W*.3),r=46,t=20,H=t+rows.length*rh+24,lo=0,hi=4;
    const xs=v=>l+(W-l-r)*(Math.max(lo,Math.min(hi,lg(v)))-lo)/(hi-lo);
    const lines=[[AI(1,8192,8192,s),'decode, 1 sequence'],[AI(64,8192,8192,s),'decode, batch 64'],[AI(4096,4096,4096,s),'training matmul 4096³']];
    let g='';[1,10,100,1000,10000].forEach(v=>{const x=xs(v);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(t-4)+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+T(x,H-6,v.toLocaleString('en-US'),{a:'middle',fs:10,fill:'var(--mute)'})});
    lines.forEach((o,j)=>{const x=xs(o[0]);g+='<line x1="'+x+'" x2="'+x+'" y1="'+(t-6)+'" y2="'+(H-20)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+T(x,t-9,'abc'.charAt(j),{a:'middle',fs:11,w:600,fill:'var(--bad)'})});
    document.getElementById('chip-ridgekey').innerHTML=lines.map((o,j)=>'<b style="color:var(--bad)">'+'abc'.charAt(j)+'</b> '+esc(o[1])+': about '+sig(o[0],2)+' FLOPs per byte').join('; ')+' (in '+FN[f]+').';
    rows.forEach((o,j)=>{const y=t+j*rh,w=xs(o.r)-l,col=X.VC[o.c.vendor]||'var(--mute)';
      g+=T(l-5,y+13,esc(o.c.short),{a:'end',fs:10.5})+'<rect x="'+l+'" y="'+(y+3)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(rh-6)+'" rx="2" fill="'+col+'" opacity="'+(o.c.status==='announced'?.55:.9)+'"/>'+T(l+w+4,y+13,sig(o.r),{fs:10})});
    host.innerHTML=svg(W,H,g,'Ridge point in FLOPs per byte for every chip, '+f+', log scale')}
  document.getElementById('chip-rfmt').addEventListener('change',ridgeChart);

  // ================= 5. Memory capacity against model sizes =================
  const msel=document.getElementById('chip-model');msel.innerHTML=D.models.map((m,i)=>'<option value="'+i+'"'+(m.name==='Llama 3.1 70B'?' selected':'')+'>'+esc(m.name)+' ('+(m.p>=1000?sig(m.p/1000)+'T':m.p+'B')+')</option>').join('');
  function capChart(){const m=D.models[+msel.value],bpp=+document.getElementById('chip-bpp').value,need=m.p*bpp,sc=st.sc;
    const host=document.getElementById('chip-cap2');
    const rows=D.chips.filter(c=>c.mem>=4).map(c=>{const n=X.scaleN(c,sc),cap=c.mem*n;return {c,cap,k:Math.ceil(need/cap-1e-9)}}).sort((a,b)=>b.cap-a.cap);
    const W=X.width(host)-12,rh=19,l=Math.min(112,W*.3),r=W<480?64:118,t=26,H=t+rows.length*rh+8,lo=1,hi=Math.max(5,Math.ceil(lg(Math.max(need,rows[0].cap))+.01));
    const xs=v=>l+(W-l-r)*(Math.max(lo,Math.min(hi,lg(v)))-lo)/(hi-lo);
    let g='';for(let e=lo;e<=hi;e++){const x=xs(Math.pow(10,e));g+='<line x1="'+x+'" x2="'+x+'" y1="'+(t-4)+'" y2="'+(H-6)+'" stroke="var(--line)"/>'+T(x,t-8,fGB(Math.pow(10,e)),{a:'middle',fs:10,fill:'var(--mute)'})}
    const nx=xs(need);
    rows.forEach((o,j)=>{const y=t+j*rh,w=xs(o.cap)-l,ok=o.k<=1;
      g+=T(l-5,y+13,esc(o.c.short),{a:'end',fs:10.5})+'<rect x="'+l+'" y="'+(y+3)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+(rh-6)+'" rx="2" fill="'+(ok?'var(--good)':'var(--dim)')+'"/>'+
        T(W-r+6,y+13,ok?'fits':(W<480?'':'needs ')+o.k.toLocaleString('en-US')+(W<480?'x':(sc==='chip'?' chips':sc==='node'?' servers':' domains')),{fs:10.5,fill:ok?'var(--good)':'var(--ink)'})});
    g+='<line x1="'+nx+'" x2="'+nx+'" y1="'+(t-4)+'" y2="'+(H-6)+'" stroke="var(--bad)" stroke-width="2"/>';
    host.innerHTML=svg(W,H,g,'Memory per '+sc+' against the bytes a model needs');
    document.getElementById('chip-capnote').innerHTML='<b>'+esc(m.name)+'</b>: '+sig(m.p)+'B parameters ('+esc(m.note)+', '+'<a href="'+esc(m.src)+'" target="_blank" rel="noopener noreferrer">source</a>) x '+bpp+' bytes = <b>'+fGB(need)+'</b> (red line), at '+(sc==='chip'?'chip':sc==='node'?'server':'scale-up domain')+' scale (the toggle at the atlas). '+
      (bpp===16?'16 bytes per parameter is the mixed-precision Adam count of the ZeRO paper (<a href="https://arxiv.org/abs/1910.02054" target="_blank" rel="noopener noreferrer">Rajbhandari et al. 2019, section 3.1</a>): BF16 weights and gradients (2 + 2) plus FP32 master weights, momentum and variance (4 + 4 + 4). Activations come on top. ':'Weights only: the KV cache and activations come on top, and an MoE model must hold all its experts even though each token uses few. ')+
      '"Needs k" is the bytes divided by memory, rounded up, the floor before any overhead. The {{Performance calculator|#t-calc}} adds KV cache, activations and sharding.'.replace('{{Performance calculator|#t-calc}}','<a href="#" data-tab="t-calc">Performance calculator</a>')}
  msel.addEventListener('change',capChart);document.getElementById('chip-bpp').addEventListener('change',capChart);
  X.tabLinks(document.getElementById('chip-capnote'));

  // ================= 6. Vendor peak against measurement =================
  function measChart(){const host=document.getElementById('chip-measp');const rows=[];
    D.chips.forEach(c=>(c.meas||[]).forEach(m=>{const pk=m.vs==='bw'?c.bw:c.peaks[m.vs];rows.push({c,m,pk,r:m.val/pk})}));
    const W=X.width(host)-12,rh=34,l=Math.min(150,W*.36),r=44,t=8,H=t+rows.length*rh+18,xs=v=>l+(W-l-r)*Math.min(1.05,v)/1.05;
    let g='';[0,.25,.5,.75,1].forEach(v=>{const x=xs(v);g+='<line x1="'+x+'" x2="'+x+'" y1="'+t+'" y2="'+(H-14)+'" stroke="var(--line)"/>'+T(x,H-3,Math.round(v*100)+'%',{a:'middle',fs:10,fill:'var(--mute)'})});
    rows.forEach((o,j)=>{const y=t+j*rh,u=o.m.unit,vs=o.m.vs==='bw'?fBW(o.pk):fF(o.pk);
      g+=T(l-5,y+12,esc(o.c.short),{a:'end',fs:10.5,w:600})+T(l-5,y+24,esc(o.m.what.length>24&&W<480?o.m.what.slice(0,22)+'…':o.m.what),{a:'end',fs:9.5,fill:'var(--mute)'})+
        '<rect x="'+l+'" y="'+(y+4)+'" width="'+(xs(o.r)-l).toFixed(1)+'" height="18" rx="2" fill="var(--good)"/>'+T(xs(o.r)+4,y+17,Math.round(o.r*100)+'%',{fs:10.5,w:600})});
    host.innerHTML=svg(W,H,g,'Measured throughput as a share of vendor dense peak')+
      '<ul class="tight small">'+rows.map(o=>'<li><b>'+esc(o.c.short)+'</b>, '+esc(o.m.what)+': '+esc(o.m.txt)+' against a dense peak of '+(o.m.vs==='bw'?fBW(o.pk):fF(o.pk))+' ('+X.srcA(o.m.src)+')</li>').join('')+'</ul>'}

  // ================= 7. Prices =================
  function prices(){const t=document.getElementById('chip-price');const rows=[];
    D.chips.forEach(c=>(c.price||[]).forEach(p=>rows.push({c,p})));
    t.tHead.innerHTML='<tr><th>Chip and offer</th><th class="num">Price</th><th class="num">Peak BF16 PFLOP-h per $</th></tr>';
    t.tBodies[0].innerHTML=rows.map(o=>{const hr=/hour/.test(o.p.unit),pf=hr&&o.c.peaks.bf16?o.c.peaks.bf16/1000/o.p.usd:null;
      return '<tr><td><b>'+esc(o.c.short)+'</b><br><span class="small mute">'+esc(o.p.what)+', '+esc(o.p.date)+' ('+X.srcA(o.p.src,'source')+')</span></td><td class="num">$'+o.p.usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'<br><span class="small mute">per '+esc(o.p.unit)+'</span></td><td class="num">'+(pf==null?'':sig(pf,3))+'</td></tr>'}).join('')}

  // ================= 8. Drills =================
  const DR=[
    {q:'NVIDIA’s H100 page lists BF16 at 1,979 TFLOPS. What does a large BF16 matrix multiply actually reach?',o:['About 1,900','About 990','About 720','About 400'],a:2,
     e:'1,979 is the sparse figure; dense peak is 989.5. SemiAnalysis measured about 720 TFLOP/s on large BF16 GEMMs (December 2024), 73% of dense peak, 36% of the printed headline.'},
    {q:'Which needs more arithmetic per byte to be compute-bound in BF16: an A100 or a B200?',o:['A100','B200','About the same'],a:1,
     e:'Ridge = dense BF16 FLOP/s / bandwidth: A100 312 TF / 2.04 TB/s = '+sig(X.ridge(BY.a100,'bf16'))+' FLOPs per byte; B200 2,250 / 8 = '+sig(X.ridge(BY.b200,'bf16'))+'. A kernel needs almost twice the reuse to keep a B200 busy.'},
    {q:'A TPU7x pod (42.5 EF) is 29.5x a GB300 NVL72 rack (1.44 EF). Per chip, in BF16 dense, which is faster?',o:['TPU7x, by about 30x','TPU7x, by a little','The GB300 GPU, by a little','They are identical'],a:2,
     e:'The pod has 9,216 chips and its 42.5 EF is FP8 without sparsity; the rack has 72 GPUs and its 1.44 EF is FP4 with sparsity. Per chip in BF16 dense: TPU7x 2,307 TF, GB300 GPU 2,500 TF, so the GPU is 8% faster. The "Read the headline" animation above walks through it.'},
    {q:'How many H100 80 GB GPUs just to hold Llama 3.1 405B’s weights in BF16?',o:['2','6','11','32'],a:2,
     e:'405 billion x 2 bytes = 810 GB; 810 / 80 = 10.1, so 11 GPUs before any KV cache or activations. In practice two 8-GPU servers, or FP8 weights (405 GB) on one H200 server (8 x 141 = 1,128 GB). The capacity chart above does this for every chip.'}];
  function drills(){const host=document.getElementById('chip-drills');
    host.innerHTML=DR.map((d,i)=>'<div class="chip-pr" data-i="'+i+'"><div class="q">'+esc(d.q)+'</div><div class="opts">'+d.o.map((o,j)=>'<button data-j="'+j+'">'+esc(o)+'</button>').join('')+'</div><div class="ans" hidden></div></div>').join('');
    host.addEventListener('click',e=>{const b=e.target.closest('button[data-j]');if(!b)return;const box=b.closest('.chip-pr'),d=DR[+box.dataset.i],j=+b.dataset.j;
      box.querySelectorAll('button').forEach((x,k)=>{x.classList.toggle('right',k===d.a);x.classList.toggle('wrong',k===j&&j!==d.a)});
      const an=box.querySelector('.ans');an.hidden=false;an.innerHTML=(j===d.a?'<b>Yes.</b> ':'<b>Not quite.</b> ')+esc(d.e)})}

  // ================= 9. Unconfirmed and sources =================
  const UNC=['First-generation GroqChip figures (230 MB SRAM, 750 INT8 TOPS, 188 FP16 TFLOPS as often quoted): no primary page found that still states them.',
    'B200 and B300 SM counts and L2 sizes (148 SMs and 126 MB are widely quoted): not on any fetched NVIDIA page; Blackwell Ultra is "up to 160 SMs".',
    'HGX B200 per-GPU power (1,000 W is widely quoted): NVIDIA’s fetched pages give only "up to 1,200 W" for Blackwell and ~14.3 kW for a DGX B200.',
    'Rubin per-GPU power, process node and tensor-core generation: not in the fetched NVIDIA sources.',
    'MI455X process node and whether AMD’s 40 / 20 / 5 PF figures are dense: AMD compares them with Rubin’s dense figures but does not say.',
    'TPU process nodes and power per chip: Google does not publish them.',
    'Trainium2 general-availability date (December 2024): AWS’s announcement page returned 404 when fetched; the date on the timeline is unconfirmed.',
    'RTX PRO 6000 Blackwell release date: not in the fetched datasheet.',
    'Cerebras WSE-3 dense FLOPS: only a sparse figure (125 PF) is published.'];
  document.getElementById('chip-unconfl').innerHTML='<ul class="tight">'+UNC.map(u=>'<li>'+esc(u)+'</li>').join('')+'</ul><p class="small mute">The same list, with what was tried, is in the page source (src/chips/unconfirmed.md).</p>';
  document.getElementById('chip-srcl').innerHTML=Object.keys(D.src).filter(k=>D.src[k].u.charAt(0)!=='#').map(k=>'<li>'+X.srcA(k)+'</li>').join('')+'<li>Model sizes: '+D.models.map(m=>'<a href="'+esc(m.src)+'" target="_blank" rel="noopener noreferrer">'+esc(m.name)+'</a>').join(', ')+'</li><li>All fetched 2026-10-05.</li>';

  function redraw(){const tab=document.getElementById('t-chips');if(!tab||tab.hidden)return;peelA.redraw();timeline();ridgeChart();capChart();measChart()}
  window.CHIPVIZ={redraw};
  prices();drills();
  X.onRender(()=>{timeline();ridgeChart();capChart();measChart()});
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(redraw,80)});
  // first paint if the tab is already open
  if(!document.getElementById('t-chips').hidden){timeline();ridgeChart();capChart();measChart()}
})();
