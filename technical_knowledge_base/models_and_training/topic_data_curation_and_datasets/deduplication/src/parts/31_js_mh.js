// ---- MinHash: the 2,000-family histograms and candidate rates (Reading section 3, closed block); the step-by-step is the 3D stage 41_js_sc_mh.js ----
(function(){
  const U=DPU;
  U.onTab('t-read',()=>{hist();cand()});
  // ---- 2,000 hash families ----
  const S=DP.seeds,sel=document.getElementById('dp-sd-pair');
  sel.innerHTML=S.pairs.map((p,i)=>'<option value="'+i+'"'+(Math.abs(p.j-0.75)<0.01?' selected':'')+'>J = '+p.j.toFixed(3)+'</option>').join('');
  sel.addEventListener('change',hist);
  function hist(){const el=document.getElementById('dp-sd-hist'),p=S.pairs[+sel.value],w=Math.min(720,RD.width(el)),h=220;
    const H=p.hist112,mx=Math.max(...H,...H.map((_,x)=>S.n_seeds*U.binom(112,x,p.j)));
    const lo=Math.max(0,Math.floor(112*p.j-5*Math.sqrt(112*p.j*(1-p.j))-2)),hi=Math.min(112,Math.ceil(112*p.j+5*Math.sqrt(112*p.j*(1-p.j))+2));
    const F=U.frame(w,h,[lo/112,(hi+1)/112],[0,mx*1.08],{xt:[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1].filter(v=>v>=lo/112&&v<=(hi+1)/112),xf:v=>v.toFixed(1),yt:[0,Math.round(mx/2),Math.round(mx)],xl:'estimate (equal minimums / 112)',yl:'families'});
    let g=F.g;const bw=Math.max(1,F.X((lo+1)/112)-F.X(lo/112)-1);
    for(let x=lo;x<=hi;x++)g+='<rect x="'+F.X(x/112).toFixed(1)+'" y="'+F.Y(H[x]).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(F.Y(0)-F.Y(H[x])).toFixed(1)+'" fill="var(--acc)" opacity=".75"/>';
    const pts=[];for(let x=lo;x<=hi;x++)pts.push([F.X(x/112)+bw/2,F.Y(S.n_seeds*U.binom(112,x,p.j))]);
    g+='<path d="'+U.path(pts)+'" fill="none" stroke="var(--bad)" stroke-width="2"/><line x1="'+F.X(p.j)+'" x2="'+F.X(p.j)+'" y1="'+F.m.t+'" y2="'+(h-F.m.b)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    el.innerHTML=RD.svg(w,h,g,'Histogram of 2,000 MinHash estimates for one pair');
    const pr=k=>Math.sqrt(p.j*(1-p.j)/k);
    document.getElementById('dp-sd-note').innerHTML='Bars: <span class="lbl me">measured</span> estimates from 2,000 hash families at 112 functions; red line: <span class="lbl der">derived</span> binomial(112, J); dashed: the true J. Spread (standard deviation) measured against &radic;(J(1&minus;J)/k): k = 16: '+p.sd['16'].toFixed(3)+' vs '+pr(16).toFixed(3)+'; k = 112: '+p.sd['112'].toFixed(3)+' vs '+pr(112).toFixed(3)+'; k = 1,024: '+p.sd['1024'].toFixed(3)+' vs '+pr(1024).toFixed(3)+'. Ten times more hashes buy about three times less noise (&radic;10).'}
  let set=S.settings[0];
  const segs=document.getElementById('dp-sd-set');segs.innerHTML=S.settings.map((s,i)=>'<button data-m="'+s+'"'+(i?'':' class="on"')+'>'+s.replace('x',' &times; ')+'</button>').join('');
  RD.seg(segs,m=>{set=m;cand()});
  function cand(){const el=document.getElementById('dp-sd-cand'),w=Math.min(720,RD.width(el)),h=230,[b,r]=set.split('x').map(Number);
    const F=U.frame(w,h,[0.25,1],[0,1],{xt:[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1],xf:v=>v.toFixed(1),yt:[0,0.25,0.5,0.75,1],yf:v=>Math.round(v*100)+'%',xl:'true Jaccard similarity of the pair',yl:'candidate rate'});
    let g=F.g;const pts=[];for(let i=0;i<=150;i++){const s=Math.min(1,0.25+0.005*i);pts.push([F.X(s),F.Y(U.P(s,b,r))])}
    g+='<path d="'+U.path(pts)+'" fill="none" stroke="var(--bad)" stroke-width="2"/>';
    S.pairs.forEach(p=>{g+='<circle cx="'+F.X(p.j).toFixed(1)+'" cy="'+F.Y(p.cand[set]).toFixed(1)+'" r="4" fill="var(--acc)"><title>J '+p.j.toFixed(3)+': measured '+U.pct(p.cand[set])+', formula '+U.pct(p.formula[set])+'</title></circle>'});
    const err=Math.max(...S.pairs.map(p=>Math.abs(p.cand[set]-p.formula[set])));
    g+=RD.t(F.m.l+6,F.m.t+14,'largest gap measured vs formula: '+(100*err).toFixed(1)+' points',{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,g,'Measured candidate rate against the S-curve')}
})();
