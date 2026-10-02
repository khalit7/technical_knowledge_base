// ---- The same ternary weights packed two ways: five-trit bytes against the BITCOS bitmap + sign vector ----
(function(){
  const card=$('v-tern');if(!card)return;
  const T=window.TERN||{};               // paper figures, set in 11c_tern_data.js
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const N=128,G=5,CH=16,NG=Math.ceil(N/G); // one block of 128 weights (the paper's block size); 26 five-trit bytes; BITCOS drawn in chunks of 16
  const TB=T.trit_bpw||1.625;            // five-trit cost per weight in 128-weight blocks: 26 x 8 / 128
  const st={m:'trit',z:0.515,p:0,play:!RM,spd:1,vis:false,raf:0,last:0};
  let W=[];
  function sample(){ // exactly round(z*N) zeros, placed by a seeded shuffle; signs random
    const rnd=mulberry32(20260914),nz=Math.round(st.z*N),idx=[...Array(N).keys()];
    for(let i=N-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
    W=Array(N).fill(0);const sg=mulberry32(77);
    idx.forEach((k,r)=>{W[k]=r<nz?0:(sg()<.5?1:-1)});
  }
  const H=z=>{const a=z>0?-z*Math.log2(z):0,b=z<1?-(1-z)*Math.log2((1-z)/2):0;return a+b}; // entropy, + and - equally likely
  const steps=()=>st.m==='trit'?NG:N/CH+1;
  // bits written after progress p (fractional steps)
  function bits(p){
    if(st.m==='trit'){const g=Math.min(NG,Math.floor(p+1e-9)),f=Math.min(1,p-g);
      const out=[];for(let k=0;k<g;k++)out.push(...byteOf(k));
      if(g<NG&&f>0){const b=byteOf(g);out.push(...b.slice(0,Math.floor(8*f)))}
      return {bm:out,sg:[],w:Math.min(N,g*G+(f>0&&g<NG?Math.floor(G*f):0))}}
    const c=Math.min(N/CH,Math.floor(p+1e-9)),f=Math.min(1,p-c);
    const upto=Math.min(N,c*CH+(c<N/CH?Math.floor(CH*f):0));
    const bm=W.slice(0,upto).map(v=>v?1:0),sg=W.slice(0,upto).filter(v=>v).map(v=>v>0?0:1);
    return {bm,sg,w:upto}}
  function byteOf(k){ // five trits -> one base-3 number -> 8 bits (0 -> 0, +1 -> 1, -1 -> 2)
    let v=val(k);
    const b=[];for(let i=7;i>=0;i--)b.push((v>>i)&1);return b}
  function val(k){let v=0;for(let i=G-1;i>=0;i--){const t=k*G+i<N?W[k*G+i]:0;v=v*3+(t===0?0:t>0?1:2)}return v}
  const box=$('tnSvg');
  function draw(){
    const narrow=box.clientWidth<560,Wd=narrow?Math.max(300,box.clientWidth):760;
    const perRow=narrow?16:32,cw=(Wd-16)/perRow,ch=Math.min(22,cw*1.05);
    const bitsPerRow=narrow?52:104,bw=(Wd-16)/bitsPerRow,bh=7;
    const S=steps(),p=st.p,B=bits(p);
    let s='',y=16;
    s+='<text x="8" y="'+(y-4)+'" font-size="12" fill="var(--mute)">weights (illustrative sample, '+W.filter(v=>!v).length+' of '+N+' zero)</text>';
    const cur=st.m==='trit'?Math.min(NG-1,Math.floor(p+1e-9)):Math.min(N/CH-1,Math.floor(p+1e-9));
    const grpSize=st.m==='trit'?G:CH,active=p<S-(st.m==='trit'?0:1)-1e-9;
    W.forEach((v,i)=>{const r=Math.floor(i/perRow),c=i%perRow,x=8+c*cw,yy=y+4+r*(ch+4);
      const inCur=active&&Math.floor(i/grpSize)===cur,done=i<B.w;
      s+='<rect x="'+(x+1)+'" y="'+yy+'" width="'+(cw-2)+'" height="'+ch+'" rx="3" fill="'+(v?(v>0?'var(--c1)':'var(--c2)'):'var(--soft)')+'" fill-opacity="'+(done||inCur?1:.45)+'" stroke="'+(inCur?'var(--ink)':'var(--line)')+'" stroke-width="'+(inCur?1.6:1)+'"/>';
      s+='<text x="'+(x+cw/2)+'" y="'+(yy+ch/2+4)+'" font-size="11" text-anchor="middle" fill="'+(v?'var(--bg)':'var(--mute)')+'">'+(v>0?'+':v<0?'−':'0')+'</text>'});
    const wRows=Math.ceil(N/perRow);y+=4+wRows*(ch+4)+18;
    // bit strips, to scale: one square per stored bit
    function strip(label,arr,col,yy,maxBits){
      let t='<text x="8" y="'+(yy-4)+'" font-size="12" fill="var(--mute)">'+label+'</text>';
      const rows=Math.max(1,Math.ceil(maxBits/bitsPerRow));
      for(let i=0;i<maxBits;i++){const r=Math.floor(i/bitsPerRow),c=i%bitsPerRow,x=8+c*bw,y2=yy+r*(bh+3);
        const on=i<arr.length;t+='<rect x="'+(x+.5)+'" y="'+y2+'" width="'+Math.max(1,bw-1.2)+'" height="'+bh+'" fill="'+(on?(arr[i]?col:'var(--dim)'):'none')+'" stroke="'+(on?'none':'var(--line)')+'" stroke-dasharray="'+(on?'':'2 2')+'"/>'}
      return {t,h:rows*(bh+3)}}
    if(st.m==='trit'){
      const a=strip(narrow?'stored bytes: '+B.bm.length+' of '+NG*8+' bits':'stored bytes: '+B.bm.length+' of '+NG*8+' bits (dark 1, grey 0, dashed still to write)',B.bm,'var(--ink)',y,NG*8);s+=a.t;y+=a.h+10;
      if(active){const v=val(cur),tr=W.slice(cur*G,cur*G+G).map(t=>t===0?0:t>0?1:2);
        s+='<text x="8" y="'+(y+8)+'" font-size="12">byte '+(cur+1)+': trits '+tr.join(',')+(narrow?'':' (0 = 0, + = 1, − = 2)')+' in base 3 = '+v+(tr.length<G?' ('+tr.length+' left)':'')+'</text>';y+=18}
    }else{
      const nnz=W.filter(v=>v).length;
      const a=strip('presence bitmap: '+B.bm.length+' bits'+(narrow?'':' (dark = non-zero)'),B.bm,'var(--ink)',y,N);s+=a.t;y+=a.h+18;
      const b=strip((narrow?'signs, non-zero only: ':'sign vector, non-zero weights only: ')+B.sg.length+' bits'+(narrow?'':' (dark = −)'),B.sg,'var(--c2)',y,nnz);s+=b.t;y+=b.h+10;
      if(p>=S-1-1e-9){const i=W.findIndex((v,k)=>v&&k>=40)>=0?W.findIndex((v,k)=>v&&k>=40):W.findIndex(v=>v);const pc=W.slice(0,i).filter(v=>v).length;
        s+='<text x="8" y="'+(y+8)+'" font-size="12">'+(narrow?'weight '+(i+1)+': bit set, so sign entry '+(pc+1):'decode weight '+(i+1)+': its bitmap bit is set, so its sign is sign entry '+(pc+1))+'</text><text x="8" y="'+(y+24)+'" font-size="12" fill="var(--mute)">('+pc+' set bits come before it)</text>';y+=34}
    }
    // a fixed-height scale bar comparing both totals for this sample
    const tritBits=NG*8,bcBits=N+W.filter(v=>v).length,mx=Math.max(tritBits,bcBits,1);
    y+=8;const sc=(Wd-16-150)/mx;
    [['five-trit',tritBits,'var(--c4)',st.m==='trit'],['BITCOS',bcBits,'var(--c3)',st.m==='bitcos']].forEach(([l,v,c,on],k)=>{
      const yy=y+k*16;s+='<text x="8" y="'+(yy+10)+'" font-size="11.5" fill="var(--mute)">'+l+' total</text><rect x="80" y="'+yy+'" width="'+(v*sc)+'" height="11" rx="2" fill="'+c+'" opacity="'+(on?1:.45)+'"/><text x="'+(84+v*sc)+'" y="'+(yy+10)+'" font-size="11.5">'+v+' bits</text>'});
    y+=36;
    box.innerHTML=svgEl(Wd,y,s,'A block of 128 ternary weights and the bits that store them');
    // caption
    let t,c;const nnz=W.filter(v=>v).length,nz=N-nnz;
    if(st.m==='trit'){const g=Math.floor(p+1e-9);
      if(g===0&&p<1e-9){t='Five-trit packing, before the first byte';c='There are 3⁵ = 243 ways to fill five ternary weights and a byte has 256 values, so five weights fit in 8 bits: 1.6 bits per weight. But weights are quantised in blocks of 128, and 128 is not a multiple of 5, so a block needs 26 bytes. The packing ignores what the weights are: a zero costs as much as a sign.'}
      else if(g<NG){t='Byte '+(g+1)+' of '+NG;c=(g===NG-1?'The last byte holds only the 3 weights left over (128 = 25 x 5 + 3), so part of it is wasted. ':'Five weights become one base-3 number between 0 and 242, written as one byte. ')+'Whatever the share of zeros, every byte costs 8 bits.'}
      else{t='Done: '+tritBits+' bits for '+N+' weights';c='26 x 8 / 128 = '+(tritBits/N).toFixed(3)+' bits per weight, the paper\'s figure for five-trit packing as deployed, against the log₂3 = 1.585 bound. The '+nz+' zeros cost exactly as much as the '+nnz+' signs. Switch to BITCOS.'}}
    else{const k=Math.floor(p+1e-9);
      if(k===0&&p<1e-9){t='BITCOS, before the first chunk';c='Two arrays instead of one: a bitmap with one bit per weight saying whether it is non-zero, then a compacted vector with one sign bit for each non-zero weight only. Cost: 1 + (1 − z) = 2 − z bits per weight.'}
      else if(k<N/CH){t='Weights '+(k*CH+1)+' to '+Math.min(N,(k+1)*CH);c='Every weight adds one bitmap bit; only the non-zero ones add a sign bit. Zeros are now cheaper than signs: one bit instead of two.'}
      else if(k<N/CH+1-1e-9&&p<S){t='All '+N+' weights written';c='Bitmap '+N+' bits plus '+nnz+' sign bits = '+bcBits+' bits, '+(bcBits/N).toFixed(3)+' per weight on this sample (formula: 2 − z = '+(2-st.z).toFixed(3)+'). To decode a weight, read its bitmap bit; if set, its sign is the entry whose index is the number of set bits before it, a population count that CPUs and GPUs do in one instruction.'}
      else{t='Decode: one population count per weight';c='Five-trit packing needs a division by 3 (or a table) to unpack each byte; BITCOS needs a bit test and a population count, which is why the paper reports faster kernels as well as smaller weights: up to 1.28x on matrix-vector products, 1.18x end to end on CPUs and 1.27x on GPUs.'}}
    $('tnStep').textContent=t;$('tnCap').textContent=c;
    $('tnCnt').innerHTML=stat('weights stored',fmt(B.w)+' / '+N,'one block')+stat('bits written',fmt(B.bm.length+B.sg.length))+stat('bits per weight so far',B.w?((B.bm.length+B.sg.length)/B.w).toFixed(2):'0')+
      stat('long-run rate',(st.m==='trit'?TB:(2-st.z).toFixed(3))+' bits','five-trit: '+TB+' · BITCOS: 2 − z = '+(2-st.z).toFixed(3))+stat('entropy bound at this z',H(st.z).toFixed(3)+' bits','derived: −z log₂ z − (1 − z) log₂((1 − z)/2)');
    $('tnScrub').value=Math.round(1000*p/S);
    const end=p>=S-1e-9,pb=$('tnPlay');pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
    $('tnZv').textContent=st.z.toFixed(3)+' ('+Math.round(st.z*N)+' of 128 in the sample)';
  }
  // ---- static chart: bits per weight against z ----
  const pbox=$('tnPlot');
  function plot(){
    const narrow=pbox.clientWidth<560,Wd=narrow?Math.max(300,pbox.clientWidth):760,Hh=narrow?250:290,pl=narrow?40:48,pr=narrow?12:20,pt=14,pb=narrow?46:40;
    const z0=0.15,z1=0.65,b0=1.3,b1=1.9;
    const X=z=>pl+(Wd-pl-pr)*(z-z0)/(z1-z0),Y=b=>pt+(Hh-pt-pb)*(1-(b-b0)/(b1-b0));
    let s='';
    [1.3,1.4,1.5,1.6,1.7,1.8,1.9].forEach(b=>{s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+Y(b)+'" y2="'+Y(b)+'" stroke="var(--line)"/><text x="'+(pl-5)+'" y="'+(Y(b)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+b.toFixed(1)+'</text>'});
    [0.2,0.3,0.4,0.5,0.6].forEach(z=>{s+='<text x="'+X(z)+'" y="'+(Hh-pb+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+z.toFixed(1)+'</text>'});
    s+='<text x="'+((pl+Wd-pr)/2)+'" y="'+(Hh-6)+'" font-size="11" text-anchor="middle" fill="var(--mute)">share of weights that are zero, z</text>';
    s+='<text x="12" y="'+((pt+Hh-pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((pt+Hh-pb)/2)+')">bits per weight</text>';
    // log2(3)
    const l3=Math.log2(3);s+='<line x1="'+pl+'" x2="'+(Wd-pr)+'" y1="'+Y(l3)+'" y2="'+Y(l3)+'" stroke="var(--mute)" stroke-dasharray="2 4"/>';
    // entropy curve
    let d='';for(let z=z0;z<=z1+1e-9;z+=0.005)d+=(d?'L':'M')+X(z).toFixed(1)+' '+Y(H(z)).toFixed(1);
    s+='<path d="'+d+'" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="5 4"/>';
    // five-trit and BITCOS
    s+='<line x1="'+X(z0)+'" x2="'+X(z1)+'" y1="'+Y(TB)+'" y2="'+Y(TB)+'" stroke="var(--c4)" stroke-width="2.4"/>';
    s+='<line x1="'+X(z0)+'" x2="'+X(z1)+'" y1="'+Y(2-z0)+'" y2="'+Y(2-z1)+'" stroke="var(--c3)" stroke-width="2.4"/>';
    const zc=2-TB;s+='<circle cx="'+X(zc)+'" cy="'+Y(TB)+'" r="4" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/>';
    // model dots on the BITCOS line, if the paper's table was transcribed
    (T.models||[]).forEach(m=>{s+='<circle cx="'+X(m.z)+'" cy="'+Y(2-m.z)+'" r="3" fill="'+(2-m.z<TB?'var(--c3)':'var(--bad)')+'" opacity=".85"><title>'+m.n+': z = '+m.z+'</title></circle>'});
    // reader's z
    s+='<line x1="'+X(st.z)+'" x2="'+X(st.z)+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--acc)" stroke-width="1.2"/>';
    s+='<circle cx="'+X(st.z)+'" cy="'+Y(2-st.z)+'" r="4.5" fill="var(--acc)"/>';
    // labels, placed where they do not collide
    const lab=(x,y,t,c,a)=>'<text x="'+x+'" y="'+y+'" font-size="11.5" fill="'+c+'" text-anchor="'+(a||'start')+'">'+t+'</text>';
    s+=lab(X(z1)-2,Y(TB)-6,'five-trit, '+TB,'var(--c4)','end');
    s+=lab(X(z0)+14,Y(2-z0)+2,'BITCOS, 2 − z','var(--c3)');
    s+=lab(Wd-pr-2,Y(l3)+14,'log₂3 = 1.585','var(--mute)','end');
    s+=lab(X(0.2),Y(H(0.2))+15,'entropy','var(--mute)','middle');
    s+='<line x1="'+X(zc)+'" x2="'+X(zc)+'" y1="'+Y(TB)+'" y2="'+(Hh-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3"/>'+lab(X(zc)+4,Hh-pb-5,'crossover '+zc.toFixed(3),'var(--ink)');
    if(T.best)s+=lab(X(T.best.z)-6,Y(T.best.b)+16,T.best.b+' (sparsest)','var(--ink)','end');
    pbox.innerHTML=svgEl(Wd,Hh,s,'Bits per weight against zero share');
  }
  // ---- animation plumbing (as in the DiffusionGemma lanes) ----
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.p+=dt/1000*steps()/12*st.spd;const S=steps();if(st.p>=S){st.p=S;st.play=false}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('tnPlay').addEventListener('click',()=>{if(st.play)pause();else{if(st.p>=steps()-1e-9)st.p=0;st.play=true;kick()}draw()});
  $('tnFwd').addEventListener('click',()=>{pause();st.p=Math.min(steps(),Math.floor(st.p+1e-9)+1);draw()});
  $('tnBack').addEventListener('click',()=>{pause();st.p=Math.max(0,Math.ceil(st.p-1e-9)-1);draw()});
  $('tnScrub').addEventListener('input',e=>{pause();st.p=steps()*(+e.target.value)/1000;draw()});
  $('tnSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  $('tnZ').addEventListener('input',e=>{st.z=+e.target.value;sample();draw();plot()});
  const pre=$('tnPre');const PRE=[['uniform, z = 1/3',1/3],['crossover, z = '+(2-TB).toFixed(3).replace(/0+$/,''),2-TB],[(T.best?'sparsest model, z = '+T.best.z:'z = 0.515'),T.best?T.best.z:0.515]];
  pre.innerHTML=PRE.map((q,i)=>'<button data-i="'+i+'">'+q[0]+'</button>').join('');
  pre.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{st.z=PRE[+b.dataset.i][1];$('tnZ').value=st.z;sample();draw();plot()}));
  const seg=$('tnM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.p=0;if(!RM){st.play=true}draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw();plot()}});
  if(T.default_z)st.z=T.default_z;$('tnZ').value=st.z;
  sample();
  onTab(card.closest('.tab').id,()=>{rw=box.clientWidth;draw();plot();kick()});
})();
