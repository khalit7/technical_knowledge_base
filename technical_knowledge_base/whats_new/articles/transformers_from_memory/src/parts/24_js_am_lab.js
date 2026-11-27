// ---- The live ingredient: store M random memories in d dimensions, query with stored keys, measure interference / signal. ----
// The same experiment as the article's Figures (and as src/recompute.py, with the same random numbers: mulberry32 plus
// Box-Muller, seeds sd*1000003 + d*101 + M), computed in the browser when the figure first comes into view, a few grid
// points per frame. check_page.mjs compares window.AM.res with inputs/recompute.json. One variable: the key size d.
(function(){
  if(!window.RD||!document.getElementById('am-lab-svg'))return;
  const el=document.getElementById('am-lab-svg'), st=document.getElementById('am-lab-st'), tab=document.getElementById('am-lab-tab');
  const MS=[];for(let p=2;p<=14;p++)MS.push(1<<p);
  const SEEDS=[1,2,3], XMAX=1<<21;
  const S=[
    {k:'lin',  n:'outer product',     c:'var(--c1)', f:s=>s},
    {k:'lsq',  n:'optimal linear',    c:'var(--c6)'},
    {k:'relu', n:'ReLU MLP',          c:'var(--c5)', f:s=>s>0?s:0},
    {k:'relu2',n:'squared ReLU',      c:'var(--c2)', f:s=>s>0?s*s:0},
    {k:'swish',n:'shared-gate SwiGLU',c:'var(--c3)', f:s=>s*s/(1+Math.exp(-s))},
    {k:'relu3',n:'cubed ReLU',        c:'var(--c4)', f:s=>s>0?s*s*s:0},
    {k:'exp',  n:'softmax, β = √d',   c:'var(--ink)'}
  ];
  function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function units(n,d,seed){const r=mb(seed),x=new Float64Array(n*d);
    for(let i=0;i<n*d;i+=2){const u1=r()||1e-12,u2=r(),rr=Math.sqrt(-2*Math.log(u1));x[i]=rr*Math.cos(2*Math.PI*u2);if(i+1<n*d)x[i+1]=rr*Math.sin(2*Math.PI*u2)}
    for(let i=0;i<n;i++){let s=0;for(let j=0;j<d;j++)s+=x[i*d+j]*x[i*d+j];s=Math.sqrt(s);for(let j=0;j<d;j++)x[i*d+j]/=s}
    return x}
  const med=a=>{const b=Array.from(a).sort((x,y)=>x-y),n=b.length;return n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2};
  // one grid point: every store's median ratio over Q stored-key queries, for one seed
  function point(M,d,seed){
    const K=units(M,d,seed),V=units(M,d,seed+7),Q=Math.min(48,M),out={};
    const Sim=new Float64Array(Q*M);
    for(let q=0;q<Q;q++)for(let i=0;i<M;i++){let s=0;for(let j=0;j<d;j++)s+=K[q*d+j]*K[i*d+j];Sim[q*M+i]=s}
    const ratioOf=W=>{const r=new Float64Array(Q),acc=new Float64Array(d);
      for(let q=0;q<Q;q++){acc.fill(0);for(let i=0;i<M;i++){if(i===q)continue;const w=W[q*M+i];if(w===0)continue;for(let j=0;j<d;j++)acc[j]+=w*V[i*d+j]}
        let n=0;for(let j=0;j<d;j++)n+=acc[j]*acc[j];r[q]=Math.sqrt(n)/Math.abs(W[q*M+q])}
      return med(r)};
    const W=new Float64Array(Q*M);
    S.forEach(s=>{
      if(s.k==='lsq'){
        if(M<=d){out.lsq=0;return}
        // G = K^T K, Cholesky, a = G^-1 k_q, weights K a
        const G=new Float64Array(d*d);for(let i=0;i<M;i++)for(let a=0;a<d;a++){const ka=K[i*d+a];for(let b=a;b<d;b++)G[a*d+b]+=ka*K[i*d+b]}
        for(let a=0;a<d;a++)for(let b=0;b<a;b++)G[a*d+b]=G[b*d+a];
        const L=new Float64Array(d*d);
        for(let i=0;i<d;i++)for(let j=0;j<=i;j++){let s=G[i*d+j];for(let k=0;k<j;k++)s-=L[i*d+k]*L[j*d+k];L[i*d+j]=i===j?Math.sqrt(s):s/L[j*d+j]}
        const a=new Float64Array(d),y=new Float64Array(d);
        for(let q=0;q<Q;q++){
          for(let i=0;i<d;i++){let s=K[q*d+i];for(let k=0;k<i;k++)s-=L[i*d+k]*y[k];y[i]=s/L[i*d+i]}
          for(let i=d-1;i>=0;i--){let s=y[i];for(let k=i+1;k<d;k++)s-=L[k*d+i]*a[k];a[i]=s/L[i*d+i]}
          for(let i=0;i<M;i++){let s=0;for(let j=0;j<d;j++)s+=K[i*d+j]*a[j];W[q*M+i]=s}}
        out.lsq=ratioOf(W);return}
      const f=s.k==='exp'?(x=>Math.exp(Math.sqrt(d)*(x-1))):s.f;
      for(let i=0;i<Q*M;i++)W[i]=f(Sim[i]);
      out[s.k]=ratioOf(W)});
    return out}
  // the Gaussian estimate the article uses: ratio = sqrt(M E[sigma(s)^2]) / sigma(1), s ~ N(0, 1/d) (Simpson's rule)
  function e2(f,d){const sd=1/Math.sqrt(d),n=4000,a=-10*sd,h=20*sd/n;let s=0;
    for(let i=0;i<=n;i++){const x=a+i*h,w=(i===0||i===n)?1:(i%2?4:2),p=Math.exp(-x*x/(2*sd*sd))/(sd*Math.sqrt(2*Math.PI));const v=f(x);s+=w*v*v*p}return s*h/3}
  function theory(s,d,M){
    if(s.k==='lsq')return M<=d?0:Math.sqrt(M/d-1);
    if(s.k==='exp'){const b=Math.sqrt(d);return Math.sqrt(M)*Math.exp(b*b/d-b)}
    return Math.sqrt(M*e2(s.f,d))/s.f(1)}
  function thCap(s,d){if(s.k==='lsq')return 2*d;if(s.k==='exp'){const b=Math.sqrt(d);return Math.exp(2*b*(1-b/d))}return s.f(1)*s.f(1)/e2(s.f,d)}
  function cross(ms,rs){for(let i=1;i<ms.length;i++){const a=rs[i-1],b=rs[i];if(a==null||b==null)return null;
    if(a<1&&b>=1){if(a===0)return ms[i-1]+(1-a)/(b-a)*(ms[i]-ms[i-1]);const t=-Math.log(a)/(Math.log(b)-Math.log(a));return Math.exp(Math.log(ms[i-1])+t*(Math.log(ms[i])-Math.log(ms[i-1])))}}return null}
  const AM=window.AM={res:{},done:{},live:{}};
  // d = 64 opens on the curves recorded by src/recompute.py (the same code and random numbers), so the page does no work
  // until asked; the button below the chart, or choosing another d, computes live in the browser
  if(window.AMD)Object.keys(window.AMD).forEach(k=>{AM.res[k]=window.AMD[k];AM.done[k]=true});
  let D=64, busy=false;
  function run(d,force){
    if((AM.done[d]&&!force)||busy)return;busy=true;AM.done[d]=false;const cur={};S.forEach(s=>cur[s.k]=[]);AM.res[d]=cur;let mi=0,sd=0,acc={};S.forEach(s=>acc[s.k]=[]);
    function step(){const t0=performance.now();
      while(mi<MS.length&&performance.now()-t0<30){
        const M=MS[mi],r=point(M,d,SEEDS[sd]*1000003+d*101+M);S.forEach(s=>acc[s.k].push(r[s.k]));sd++;
        if(sd===SEEDS.length){S.forEach(s=>{cur[s.k].push(Math.round(acc[s.k].reduce((a,b)=>a+b,0)/SEEDS.length*1e9)/1e9);acc[s.k]=[]});sd=0;mi++;if(D===d)draw()}}
      if(mi<MS.length){if(st)st.textContent='computing d = '+d+': '+MS[mi].toLocaleString('en-GB')+' memories ...';setTimeout(step,0)}
      else{AM.done[d]=true;AM.live[d]=true;busy=false;if(st)st.textContent='computed live in this browser: d = '+d+', M = 4 to 16,384, 3 seeds, 48 stored-key queries each (median).';if(D===d)draw();
        if(D!==d)run(D)}}
    step()}
  const fmt=v=>v==null?'beyond 16,384':v>=1e5?(v/1e6).toFixed(2).replace(/0$/,'')+' million':Math.round(v).toLocaleString('en-GB');
  const ART={lin:'64',lsq:'128',relu:'128',relu2:'about 2,700',swish:'about 2,900',relu3:'about 35,000',exp:'about 1.2 million'};
  function draw(){
    const W=RD.width(el),nar=W<480,H=nar?340:400,ml=nar?44:50,mr=nar?92:128,mt=12,mb=40,pw=W-ml-mr,ph=H-mt-mb;
    const lx=m=>ml+(Math.log2(m)-2)/(Math.log2(XMAX)-2)*pw, Y0=-3,Y1=Math.log10(400), ly=r=>mt+(Y1-Math.log10(Math.max(r,1e-3)))/(Y1-Y0)*ph;
    let s='';
    // grid
    [-3,-2,-1,0,1,2].forEach(e=>{const y=ly(Math.pow(10,e));s+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(ml-5,y+4,['0.001','0.01','0.1','1','10','100'][e+3],{fs:11,a:'end',fill:'var(--mute)'})});
    [4,64,1024,16384,262144,XMAX].forEach(m=>{const x=lx(m);s+='<line x1="'+x+'" x2="'+x+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(x,mt+ph+15,m>=1e6?'2M':m>=1e5?'262k':m>=1e4?'16k':String(m),{fs:11,a:'middle',fill:'var(--mute)'})});
    s+='<rect x="'+lx(16384)+'" y="'+mt+'" width="'+(lx(XMAX)-lx(16384))+'" height="'+ph+'" fill="var(--soft)" opacity=".55"/>';
    s+=RD.t(lx(16384)+6,mt+14,nar?'theory only':'theory only (dashed)',{fs:11,fill:'var(--mute)'});
    s+=RD.t(ml+pw/2,H-6,'memories stored, M (log scale)',{fs:12,a:'middle',fill:'var(--mute)'});
    s+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+ly(1)+'" y2="'+ly(1)+'" stroke="var(--bad)" stroke-width="1.6"/>';
    s+=RD.t(lx(16384)+6,ly(1)+16,nar?'= signal':'interference = signal',{fs:11.5,fill:'var(--bad)',w:600}).replace('<text','<text paint-order="stroke" stroke="var(--card)" stroke-width="4"');
    const cur=AM.res[D]||{},ends=[];
    S.forEach(sp=>{
      // theory, dashed, over the whole axis
      let p='';for(let i=0;i<=80;i++){const m=4*Math.pow(XMAX/4,i/80),r=theory(sp,D,m);if(r<=0)continue;p+=(p?'L':'M')+lx(m).toFixed(1)+' '+ly(r).toFixed(1)}
      s+='<path d="'+p+'" fill="none" stroke="'+sp.c+'" stroke-width="1.2" stroke-dasharray="4 4" opacity=".7"/>';
      const v=cur[sp.k]||[];let q='';v.forEach((r,i)=>{if(r<=0)return;q+=(q?'L':'M')+lx(MS[i]).toFixed(1)+' '+ly(r).toFixed(1)});
      if(q)s+='<path d="'+q+'" fill="none" stroke="'+sp.c+'" stroke-width="2.4"/>';
      v.forEach((r,i)=>{if(r>0)s+='<circle cx="'+lx(MS[i]).toFixed(1)+'" cy="'+ly(r).toFixed(1)+'" r="2.4" fill="'+sp.c+'"/>'});
      const c=v.length===MS.length?cross(MS,v):null;
      if(c)s+='<circle cx="'+lx(c).toFixed(1)+'" cy="'+ly(1)+'" r="5" fill="var(--card)" stroke="'+sp.c+'" stroke-width="2.2"/>';
      ends.push({y:ly(theory(sp,D,XMAX)),n:sp.n,c:sp.c});
    });
    // right-hand labels at the theory lines' ends, pushed apart
    ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y<ends[i-1].y+14)ends[i].y=ends[i-1].y+14;
    const over=ends.length?ends[ends.length-1].y-(mt+ph):0;if(over>0)ends.forEach(e=>e.y-=over);
    ends.forEach(e=>{s+=RD.t(ml+pw+5,e.y+4,nar?e.n.replace('shared-gate ','').replace(', β = √d',''):e.n,{fs:11.5,fill:e.c,w:600})});
    s+=RD.t(14,mt+ph/2,'interference / signal',{fs:12,a:'middle',fill:'var(--mute)'}).replace('<text','<text transform="rotate(-90 14 '+(mt+ph/2)+')"');
    el.innerHTML=RD.svg(W,H,s,'Interference over signal against the number of stored memories at key size '+D+', one line per memory store, measured to 16,384 memories and extended by the Gaussian estimate');
    // the table under the chart
    if(tab){let h='<table><thead><tr><th>store</th><th>capacity, theory</th><th>measured here</th>'+(D===64?'<th>article (d = 64)</th>':'')+'</tr></thead><tbody>';
      S.forEach(sp=>{const v=cur[sp.k]||[],c=v.length===MS.length?cross(MS,v):null;
        h+='<tr><td><span style="color:'+sp.c+';font-weight:600">'+sp.n+'</span></td><td>'+fmt(thCap(sp,D))+'</td><td>'+(v.length===MS.length?fmt(c):'...')+'</td>'+(D===64?'<td>'+ART[sp.k]+'</td>':'')+'</tr>'});
      tab.innerHTML=h+'</tbody></table>'}
  }
  RD.seg(document.getElementById('am-lab-d'),m=>{D=+m;draw();run(D)});
  const btn=document.getElementById('am-lab-run');
  if(btn)btn.addEventListener('click',()=>run(D,true));
  if(st&&AM.done[D])st.textContent='d = 64: curves recorded by src/recompute.py (identical to a live run); choose another d, or recompute, to run it in this browser (a second or two).';
  RD.onRender(draw);RD.onResize(draw);draw();
})();
