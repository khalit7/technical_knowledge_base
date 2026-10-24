// ---- Reading sections 8 and 9: the 2-D quantizer toy (illustrative, computed in the page); moved from the old Quantizer playground tab ----
// 600 fixed "encoder outputs" in 2-D (a seeded mixture of 7 Gaussians, frozen), and four ways to quantize them:
// VQ with 16 codes initialised uniformly in +-1/16 (diffusers' default init) and trained by moving each code to the
// mean of the points assigned to it (what the codebook loss does in the limit of a large step; k-means), with or
// without dead-code restarts every 3 steps; FSQ with levels [4, 4] (16 codes, fixed grid after a tanh bound, the
// paper's bound() at L = 4); LFQ with 2 bits (sign of each coordinate: 4 codes, the most a 2-D LFQ can have).
(function(){
  const el=document.getElementById('avq-toy');if(!el)return;
  let s=12345;const rnd=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648};
  const gauss=()=>{const u=Math.max(1e-9,rnd()),v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const centres=[[-2,-1.6],[-1.2,1.8],[0.3,0.2],[1.8,1.5],[2.1,-1.4],[-2.3,0.6],[0.6,-2.2]];
  const P=[];for(let i=0;i<600;i++){const c=centres[i%7];P.push([c[0]+0.38*gauss(),c[1]+0.38*gauss()])}
  const K=16,STEPS=25;
  function vqRun(restart){
    let s2=777;const r2=()=>{s2=(s2*1103515245+12345)%2147483648;return s2/2147483648};
    let C=[];for(let k=0;k<K;k++)C.push([(r2()*2-1)/K,(r2()*2-1)/K]);
    const hist=[];
    for(let t=0;t<=STEPS;t++){
      const a=P.map(p=>{let b=0,bd=1e9;C.forEach((c,k)=>{const d=(p[0]-c[0])**2+(p[1]-c[1])**2;if(d<bd){bd=d;b=k}});return b});
      const n=new Array(K).fill(0),sx=new Array(K).fill(0),sy=new Array(K).fill(0);let err=0;
      a.forEach((k,i)=>{n[k]++;sx[k]+=P[i][0];sy[k]+=P[i][1];err+=(P[i][0]-C[k][0])**2+(P[i][1]-C[k][1])**2});
      hist.push({C:C.map(c=>c.slice()),a,used:n.filter(v=>v>0).length,err:err/P.length});
      C=C.map((c,k)=>n[k]?[sx[k]/n[k],sy[k]/n[k]]:c);
      if(restart&&t%3===2){const dead=[];n.forEach((v,k)=>{if(!v)dead.push(k)});dead.forEach(k=>{const p=P[Math.floor(r2()*P.length)];C[k]=[p[0]+0.01,p[1]]})}
    }
    return hist;
  }
  // FSQ bound for L = 4 (even): half_l = 3*(1-1e-3)/2, offset 0.5, shift = tan(offset/half_l); codes q in {-2,-1,0,1}
  const hl=3*(1-1e-3)/2,off=0.5,sh=Math.tan(off/hl);
  const bound=z=>Math.tanh(z+sh)*hl-off;
  function fsqRun(){
    const a=P.map(p=>{const q=p.map(z=>Math.round(bound(z)));return (q[0]+2)+4*(q[1]+2)});
    // the point in z-space each code stands for: where bound(z) equals the integer (decoder sees q / 2)
    // drawn at the middle of each code's cell in bounded units (the end cells are cut by the tanh range)
    const inv=q=>{const lo=Math.max(q-0.5,-hl-off+1e-3),hi=Math.min(q+0.5,hl-off-1e-3);return Math.atanh(((lo+hi)/2+off)/hl)-sh};
    const C=[];for(let k=0;k<16;k++){const qx=k%4-2,qy=Math.floor(k/4)-2;C.push([inv(qx),inv(qy)])}
    let err=0;a.forEach((k,i)=>{err+=(P[i][0]-C[k][0])**2+(P[i][1]-C[k][1])**2});
    const used=new Set(a).size;
    return [{C,a,used,err:err/P.length,bounded:true}];
  }
  function lfqRun(){
    const C=[[-1,-1],[1,-1],[-1,1],[1,1]];
    const a=P.map(p=>(p[0]>0?1:0)+(p[1]>0?2:0));
    let err=0;a.forEach((k,i)=>{err+=(P[i][0]-C[k][0])**2+(P[i][1]-C[k][1])**2});
    return [{C,a,used:new Set(a).size,err:err/P.length}];
  }
  const runs={plain:vqRun(false),restart:vqRun(true),fsq:fsqRun(),lfq:lfqRun()};
  const pal=['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac','#1f77b4','#d62728','#2ca02c','#9467bd','#8c564b','#17becf'];
  let mode='plain';
  const svgBox=document.getElementById('avq-toy-svg'),cap=document.getElementById('avq-toy-cap'),cnt=document.getElementById('avq-toy-cnt');
  const texts={
    plain:i=>i===0?'Step 0. Sixteen codes start in a tiny square at the origin (uniform in &plusmn;1/16, the usual default). Every point is assigned to its nearest code; with every code bunched in the middle, only the few codes on the outside of the bunch win any point.':'Step '+i+'. Each code that won points moves to their mean (the codebook loss pulls it there); a code that won nothing gets no gradient and stays put. Dead codes stay dead: the effective codebook is the codes used, not 16.',
    restart:i=>i===0?'Step 0. The same start as plain VQ.':'Step '+i+'. As plain VQ, and every 3 steps each code that won no point is re-seeded on a random encoder output (Jukebox\'s restart). Dead codes come back where the data is, so usage climbs towards 16.',
    fsq:()=>'FSQ has no codebook to learn. Each coordinate is squashed by tanh into a fixed range and rounded to one of L = 4 levels, so the 16 codes form a fixed grid (crosses, drawn where each level sits in the encoder\'s units). A code is unused only if the encoder never sends a point there; the encoder learns to spread its outputs over the grid.',
    lfq:()=>'LFQ keeps only the sign of each coordinate: in 2-D that is 4 codes, the quadrants (a real LFQ uses log2 K channels: 18 channels for 2^18 codes). Like FSQ there is nothing to learn in the quantizer; MAGVIT-v2 adds an entropy penalty so every sign pattern gets used.'};
  function draw(i){
    const h=runs[mode],f=h[Math.min(i,h.length-1)];
    const W=RD.width(svgBox),S=Math.min(W,420),m=6,sc=(S-2*m)/7,X=x=>m+(x+3.5)*sc,Y=y=>S-m-(y+3.5)*sc;
    let b='<rect x="0" y="0" width="'+S+'" height="'+S+'" fill="var(--soft)"/>';
    b+='<line x1="'+X(0)+'" y1="'+Y(-3.5)+'" x2="'+X(0)+'" y2="'+Y(3.5)+'" stroke="var(--line)"/><line x1="'+X(-3.5)+'" y1="'+Y(0)+'" x2="'+X(3.5)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
    P.forEach((p,j)=>{b+='<circle cx="'+X(p[0]).toFixed(1)+'" cy="'+Y(p[1]).toFixed(1)+'" r="2" fill="'+pal[f.a[j]%16]+'" opacity=".75"/>'});
    const n=new Array(f.C.length).fill(0);f.a.forEach(k=>n[k]++);
    f.C.forEach((c,k)=>{const x=X(c[0]),y=Y(c[1]),col=n[k]?'var(--ink)':'var(--bad)';
      b+='<path d="M'+(x-5)+' '+(y-5)+'L'+(x+5)+' '+(y+5)+'M'+(x-5)+' '+(y+5)+'L'+(x+5)+' '+(y-5)+'" stroke="'+col+'" stroke-width="2.2"/>'});
    svgBox.innerHTML=RD.svg(S,S,b,'Encoder outputs coloured by their code; crosses are codes, red crosses unused');
    cap.innerHTML='<div class="t">'+({plain:'VQ, plain',restart:'VQ with dead-code restarts',fsq:'FSQ, levels [4, 4]',lfq:'LFQ, 2 bits'})[mode]+'</div><p>'+texts[mode](i)+'</p>';
    const K2=f.C.length;
    cnt.innerHTML=RD.stat('Codes in the codebook',K2)+RD.stat('Codes used',f.used+' of '+K2)+RD.stat('Mean squared quantization error',f.err.toFixed(3),'distance from each point to its code, squared');
  }
  const an=RD.anim({card:'avq-toy',ctl:'avq-toy-ctl',n:STEPS+1,draw,ms:900,label:'Training step'});
  RD.seg(document.getElementById('avq-toy-mode'),v=>{mode=v;an.reset(runs[v].length)});
  RD.onResize(()=>an.redraw());
  window.AVQ_TOY=runs;
})();
