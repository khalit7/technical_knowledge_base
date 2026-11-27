// ---- The live ingredient: how often a no-op plan is scored as a win or a loss, on job-13b's 20 real runs (128 MB shared_buffers,
// from the article's median-draw figure). Exact, no sampling: a line-by-line port of joint() and fooled() in src/recompute.py;
// check_page.mjs compares every k and tie zone with inputs/recompute.json (shipped as window.ARTICLE.recompute).
(function(){
  if(!window.RD||!window.ARTICLE||!document.getElementById('qp-toy'))return;
  const $=id=>document.getElementById(id), t=RD.t, RUNS=ARTICLE.recompute.runs, S=RUNS.slice().sort((a,b)=>a-b), N=S.length;
  function comb(n,k){if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r}
  function* combos(n,k,st=0,acc=[]){if(acc.length===k){yield acc.slice();return}for(let i=st;i<=n-(k-acc.length);i++){acc.push(i);yield* combos(n,k,i+1,acc);acc.pop()}}
  const cache={};
  function joint(k){
    if(cache[k])return cache[k];
    const h=(k-1)/2, J=Array.from({length:N},()=>new Array(N).fill(0)), n1=comb(N,k);
    for(const c of combos(N,k)){
      const inC=new Set(c),rest=[];for(let i=0;i<N;i++)if(!inC.has(i))rest.push(i);
      const m=rest.length;
      for(let r=0;r<m;r++){const p=comb(r,h)*comb(m-1-r,h)/comb(m,k);if(p)J[c[h]][rest[r]]+=p/n1}}
    return cache[k]=J}
  function fooled(k,z){const J=joint(k);let w=0,l=0;
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){const r=Math.log(S[j]/S[i]);if(r>z)w+=J[i][j];else if(r<-z)l+=J[i][j]}
    return[w,l]}
  window.QP_TOY={fooled};  // for check_page.mjs
  let k=1,z=0.05;
  const pc=v=>(100*v).toFixed(1)+'%';
  function draw(){
    const el=$('qp-toysvg'),W=RD.width(el),J=joint(k),[w,l]=fooled(k,z);
    // top: the 20 runs as dots; bottom: distribution of ln(default median / candidate median) for a no-op
    const L=10,R=W-10,lo=-0.32,hi=0.32,X=v=>L+(v-lo)/(hi-lo)*(R-L),bins=32,bw=(hi-lo)/bins,hist=new Array(bins).fill(0);
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){if(!J[i][j])continue;const v=Math.log(S[j]/S[i]);const b=Math.min(bins-1,Math.max(0,Math.floor((v-lo)/bw)));hist[b]+=J[i][j]}
    const mx=Math.max(...hist), y0=96, hH=150;
    let s=t(L,14,'job-13b, its 20 runs (ms)',{fs:12,fill:'var(--mute)'});
    const mlo=180,mhi=260,MX=v=>L+(v-mlo)/(mhi-mlo)*(R-L);
    [180,200,220,240,260].forEach(v=>{s+=t(MX(v),62,v,{fs:11,a:'middle',fill:'var(--mute)'})});
    const seen={};RUNS.forEach(v=>{const key=Math.round(MX(v)/7);seen[key]=(seen[key]||0)+1;
      s+='<circle cx="'+MX(v)+'" cy="'+(44-(seen[key]-1)*8)+'" r="3.6" fill="'+(v>215?'var(--c2)':'var(--c1)')+'"/>'});
    s+=t(L,y0-10,'measured speedup of a plan identical to the default',{fs:12,fill:'var(--mute)'});
    s+='<rect x="'+X(-z)+'" y="'+y0+'" width="'+Math.max(1,X(z)-X(-z))+'" height="'+hH+'" fill="var(--soft)" stroke="var(--line)"/>';
    hist.forEach((p,b)=>{if(!p)return;const x=X(lo+b*bw),h=p/mx*(hH-18),c=lo+(b+0.5)*bw;
      const out=Math.abs(c)>z;s+='<rect x="'+(x+1)+'" y="'+(y0+hH-h)+'" width="'+Math.max(1,(R-L)/bins-2)+'" height="'+h+'" fill="'+(out?(c>0?'var(--c3)':'var(--bad)'):'var(--mute)')+'"'+(out?'':' opacity=".55"')+'/>'});
    [0.75,0.85,1,1.15,1.3].forEach(v=>{const x=X(Math.log(v));s+='<line x1="'+x+'" x2="'+x+'" y1="'+(y0+hH)+'" y2="'+(y0+hH+4)+'" stroke="var(--mute)"/>'+t(x,y0+hH+16,v.toFixed(2)+'x',{fs:11,a:'middle',fill:'var(--mute)'})});
    s+=t(X(0),y0+12,'tie',{fs:11.5,a:'middle',fill:'var(--ink)'});
    s+=t(R,y0+12,'phantom win',{fs:11.5,a:'end',fill:'var(--c3)'})+t(L,y0+12,'phantom loss',{fs:11.5,fill:'var(--bad)'});
    el.innerHTML=RD.svg(W,y0+hH+24,s,'Distribution of the measured speedup of a no-op plan on job-13b');
    $('qp-toyout').innerHTML=RD.stat('scored as different',pc(w+l),'the reward is fooled')+RD.stat('phantom wins',pc(w),'')+RD.stat('phantom losses',pc(l),'');
    $('qp-kv').textContent=k; $('qp-zv').textContent='±'+(100*z).toFixed(1)+'%';
  }
  RD.seg($('qp-k'),m=>{k=+m;draw()});
  $('qp-z').addEventListener('input',e=>{z=+e.target.value;draw()});
  // the closed table: every k at the article's 5% zone
  const tb=$('qp-ktab'); if(tb)tb.innerHTML='<tr><th>timings per side</th><th>fooled</th><th>phantom wins</th><th>phantom losses</th></tr>'+[1,3,5,7].map(q=>{const[a,b]=fooled(q,0.05);return '<tr><td>'+q+'</td><td>'+pc(a+b)+'</td><td>'+pc(a)+'</td><td>'+pc(b)+'</td></tr>'}).join('');
  RD.onRender(draw); RD.onResize(draw);
})();
