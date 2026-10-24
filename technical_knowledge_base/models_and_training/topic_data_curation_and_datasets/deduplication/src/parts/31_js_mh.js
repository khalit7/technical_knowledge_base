// ---- MinHash step by step (Reading section 3; was tab t-mh) ----
(function(){
  const D=DP.mhdemo,U=DPU,esc=U.esc;
  let pair='forum',mode='mh',an=null;
  const stage=document.getElementById('dp-mh-stage'),cap=document.getElementById('dp-mh-cap'),cnt=document.getElementById('dp-mh-cnt');
  const NSTEP={mh:13,ex:5};
  function chips(doc,other,opt){opt=opt||{};const os=new Set(other.shingles);
    return '<div class="dp-chips">'+doc.shingles.map((s,i)=>{const sh=os.has(s);
      const v=opt.f!=null?'<i>'+(doc.f8[opt.f][i]/1000).toFixed(3)+'</i>':'';
      return '<span class="'+(opt.hl&&sh?'sh ':'')+(opt.f!=null&&doc.argmin8[opt.f]===i?'mn':'')+'">'+esc(s)+v+'</span>'}).join('')+'</div>'}
  function sigGrid(p,upto){let g='<div class="dp-sigw"><div><div class="dp-h">signature equality, 14 bands &times; 8 rows</div><div class="dp-sig">';
    for(let k=0;k<112;k++){const c=k<upto?(p.eq[k]?'e':'x'):'';g+='<span class="'+c+'" title="hash '+(k+1)+'"></span>'}
    g+='</div></div>';
    if(upto>=112){g+='<div class="dp-bl">'+p.bands.map((b,i)=>'<div>band '+(i+1)+(b?': <b>all 8 equal</b>':'')+'</div>').join('')+'</div>'}
    return g+'</div>'}
  function draw(i){const p=D.pairs[pair],A=p.docs[0],B=p.docs[1];let h='',c='';
    const head=(d,k)=>'<div class="dp-h">'+(k?'B':'A')+': '+esc(d.host)+'</div>';
    if(i===0){c='Two real pages from the running example. Before anything else, datatrove lowercases the text, strips punctuation, normalises numbers and splits it into words with a word tokenizer (spaCy for English).';
      h='<div class="dp-two"><div>'+head(A,0)+'<div class="dp-txt">'+esc(A.text)+'</div></div><div>'+head(B,1)+'<div class="dp-txt">'+esc(B.text)+'</div></div></div>'}
    else if(i===1){c='Each page becomes a set of <b>shingles</b>: every run of 5 consecutive words, each kept once. A has '+A.shingles.length+', B has '+B.shingles.length+'. Shingles both pages share are tinted.';
      h='<div class="dp-two"><div>'+head(A,0)+chips(A,B,{hl:1})+'</div><div>'+head(B,1)+chips(B,A,{hl:1})+'</div></div>'}
    else if(i===2){c='<b>Jaccard similarity</b> = shared shingles / all distinct shingles = '+p.inter+' / '+p.union+' = <b>'+p.j.toFixed(3)+'</b>. '+(mode==='ex'?'Exact dedup by Jaccard means doing this set comparison for every pair of documents.':'MinHash never computes this number; it estimates it from short signatures.');
      h='<div class="dp-two"><div>'+head(A,0)+chips(A,B,{hl:1})+'</div><div>'+head(B,1)+chips(B,A,{hl:1})+'</div></div>'+jbar(p)}
    else if(mode==='ex'){
      if(i===3){c='To find every near-duplicate exactly, each of the n(n&minus;1)/2 pairs needs this comparison. On the running example\'s 2,692 documents that is 3,622,086 pairs; only 19,675 of them share even one shingle, but you only know that after looking.';
        h=jbar(p)}
      else{c='The cost grows with the square of the number of documents: a crawl of 10<sup>9</sup> documents has 5&times;10<sup>17</sup> pairs. That is why every web pipeline uses MinHash with LSH instead: one signature per document, then grouping by band, with no pairwise loop. Switch back to MinHash + LSH.';h=jbar(p)}}
    else if(i>=3&&i<=10){const f=i-3,ma=A.argmin8[f],mb=B.argmin8[f],eq=p.eq[f];
      c='Hash function '+(f+1)+' of 112 gives every shingle a pseudo-random number (shown as a fraction of its range). Keep each page\'s <b>smallest</b> value (outlined): A\'s is '+(A.f8[f][ma]/1000).toFixed(3)+' on "'+esc(A.shingles[ma])+'", B\'s is '+(B.f8[f][mb]/1000).toFixed(3)+' on "'+esc(B.shingles[mb])+'". '+(eq?'<b>Equal</b>: the smallest value over both pages fell on a shared shingle.':'<b>Different</b>: the smallest value over both pages fell on a shingle only one page has.')+' This happens with probability exactly J: the minimum of the union is equally likely to be any of its '+p.union+' shingles, and '+p.inter+' of them are shared.';
      h='<div class="dp-two"><div>'+head(A,0)+chips(A,B,{hl:1,f})+'</div><div>'+head(B,1)+chips(B,A,{hl:1,f})+'</div></div>'+sigGrid(p,f+1)}
    else if(i===11){const ne=p.eq.reduce((a,b)=>a+b,0);
      c='All 112 functions: '+ne+' minimums are equal, so the estimate is '+ne+' / 112 = <b>'+p.est.toFixed(3)+'</b> against a true '+p.j.toFixed(3)+'. Each page is now 112 numbers (896 bytes), whatever its length. The standard error of this estimate is &radic;(J(1&minus;J)/112) = '+Math.sqrt(p.j*(1-p.j)/112).toFixed(3)+' (the closed block on 2,000 hash families shows the histogram).';
      h=sigGrid(p,112)}
    else{const nb=p.bands.reduce((a,b)=>a+b,0),pr=U.P(p.j,14,8);
      c='<b>LSH</b>: cut the signature into 14 bands of 8. Two pages become a <b>candidate pair</b> if all 8 values agree in at least one band; in practice each band\'s 8 values are hashed and sorted, so pages with an equal band end up next to each other, and nothing is compared pairwise. Here '+nb+' band'+(nb===1?'':'s')+' matched: '+(p.candidate?'<b>candidate</b>':'<b>not a candidate</b>')+'. For a pair at J = '+p.j.toFixed(2)+' the chance is 1&minus;(1&minus;J<sup>8</sup>)<sup>14</sup> = '+U.pct(pr)+(pair==='forum'?': this pair was unlucky, and run0 did remove one of the two pages.':'.');
      h=sigGrid(p,112)}
    cap.innerHTML=c;stage.innerHTML=h;counters(i)}
  function jbar(p){const w=Math.min(520,RD.width(stage)),sc=(w-20)/p.union;
    return '<svg viewBox="0 0 '+w+' 48" width="'+w+'" height="48" role="img" aria-label="Shared shingles against all distinct shingles"><rect x="10" y="8" width="'+(p.union*sc)+'" height="16" fill="var(--soft)" stroke="var(--line)"/><rect x="10" y="8" width="'+(p.inter*sc)+'" height="16" fill="var(--acc)"/>'+
      RD.t(10,40,'shared '+p.inter+' of '+p.union+' distinct shingles = '+p.j.toFixed(3),{fs:11.5,fill:'var(--mute)'})+'</svg>'}
  function counters(i){const n=2692,pairs=n*(n-1)/2,N=1e9;
    const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
    if(mode==='ex')cnt.innerHTML=st('pairs to compare, running example',U.fmt(pairs),'2,692 documents')+st('pairs to compare, 10<sup>9</sup> documents',U.big(N*(N-1)/2),'one crawl after filtering, order of magnitude')+st('work per pair','|A| + |B| shingles','a set intersection');
    else cnt.innerHTML=st('signature per document','112 values','896 bytes at 64 bits')+st('signatures for 10<sup>9</sup> documents',U.bytes(N*112*8),'documents &times; 112 &times; 8 bytes')+st('pairwise comparisons','0','14 sorts by band value instead');}
  function reset(){an.reset(NSTEP[mode])}
  RD.seg(document.getElementById('dp-mh-pair'),m=>{pair=m;an.go(an.i>=NSTEP[mode]?0:an.i)});
  RD.seg(document.getElementById('dp-mh-mode'),m=>{mode=m;reset()});
  an=RD.anim({card:'dp-mh-card',ctl:'dp-mh-ctl',n:NSTEP.mh,draw,ms:2600,label:'MinHash step'});
  U.onTab('t-read',()=>{an.redraw();hist();cand()});

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
