// ---- Reading: how many items, how much noise (binomial error bars, with simulated re-runs) ----
window.RD_ERR=(function(){
  const PRE=[['AIME (one year)',30],['GPQA Diamond',198],['SWE-bench Verified',500],['HLE',2500]];
  const Z=1.959964;
  const se=(p,n)=>Math.sqrt(p*(1-p)/n);
  let n=30,p=0.8,runs=[],last=null,seed=7;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  const nEl=document.getElementById('rd-err-n'),pEl=document.getElementById('rd-err-p'),pv=document.getElementById('rd-err-pv');
  const grid=document.getElementById('rd-err-grid'),box=document.getElementById('rd-err-svg'),out=document.getElementById('rd-err-out');
  nEl.innerHTML=PRE.map(([k,v],i)=>'<button data-m="'+v+'"'+(i===0?' class="on"':'')+'>'+k+' ('+v.toLocaleString('en-US')+')</button>').join('');
  function run(){const r=[];let k=0;for(let i=0;i<n;i++){const y=rnd()<p;r.push(y);if(y)k++}last=r;runs.push(100*k/n);if(runs.length>60)runs.shift()}
  function stats(){const s=100*se(p,n);return {se:s,half:Z*s,diff:Z*Math.SQRT2*s,item:100/n}}
  function draw(){
    const st=stats();pv.textContent=Math.round(p*100)+'%';
    // grid of the last run
    const sz=n<=30?18:n<=200?10:n<=500?7:4;
    grid.style.gap=(sz>=7?2:1)+'px';
    grid.innerHTML=last?last.map(y=>'<i'+(y?' class="y"':'')+' style="width:'+sz+'px;height:'+sz+'px"></i>').join(''):'<span class="small mute">Press "Run the benchmark once": each square will be one item, green if solved.</span>';
    // number line
    const W=Math.max(260,Math.min(860,RD.width(box))),H=74,ml=10,mr=10,pw=W-ml-mr,X=v=>ml+pw*v/100,y0=34;
    let g='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y0+'" y2="'+y0+'" stroke="var(--mute)"/>';
    [0,25,50,75,100].forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(y0-3)+'" y2="'+(y0+3)+'" stroke="var(--mute)"/>'+RD.t(X(v),y0+16,v+'%',{a:v===0?'start':v===100?'end':'middle',fs:10,fill:'var(--mute)'})});
    const lo=Math.max(0,100*p-st.half),hi=Math.min(100,100*p+st.half);
    g+='<rect x="'+X(lo)+'" y="'+(y0-12)+'" width="'+Math.max(1,X(hi)-X(lo))+'" height="24" fill="var(--acc)" opacity=".18"/>';
    g+='<line x1="'+X(100*p)+'" x2="'+X(100*p)+'" y1="'+(y0-14)+'" y2="'+(y0+14)+'" stroke="var(--acc)" stroke-width="2"/>';
    runs.forEach((v,j)=>{const isL=j===runs.length-1;g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(y0-9)+'" y2="'+(y0+9)+'" stroke="'+(isL?'var(--bad)':'var(--ink)')+'" stroke-width="'+(isL?2.5:1.2)+'" opacity="'+(isL?1:.55)+'"/>'});
    const lab='95% band '+lo.toFixed(1)+' to '+hi.toFixed(1)+'%';
    const cx=X(100*p),right=cx<W/2;
    g+=RD.t(right?Math.max(ml,X(lo)):Math.min(W-mr,X(hi)),y0-17,lab,{a:right?'start':'end',fs:11,fill:'var(--acc)'});
    box.innerHTML=RD.svg(W,H,g,'Scores of simulated runs against the 95% band');
    const mn=runs.length?Math.min(...runs):null,mx=runs.length?Math.max(...runs):null;
    out.innerHTML=RD.stat('One item is worth',st.item.toFixed(2)+' pts','100 / '+n.toLocaleString('en-US'))+
      RD.stat('Standard error',st.se.toFixed(1)+' pts','√(p(1−p)/n)')+
      RD.stat('95% interval','±'+st.half.toFixed(1)+' pts','1.96 standard errors')+
      RD.stat('Gap that is not noise','> '+st.diff.toFixed(1)+' pts','two models, different items')+
      RD.stat('Your runs',runs.length?runs.length+' runs':'none yet',runs.length?'last '+runs[runs.length-1].toFixed(1)+'%, range '+mn.toFixed(1)+' to '+mx.toFixed(1)+'%':'press a button');
  }
  RD.seg(nEl,m=>{n=+m;runs=[];last=null;draw()});
  pEl.addEventListener('input',()=>{p=+pEl.value/100;runs=[];last=null;draw()});
  document.getElementById('rd-err-run1').addEventListener('click',()=>{run();draw()});
  document.getElementById('rd-err-run20').addEventListener('click',()=>{for(let i=0;i<20;i++)run();draw()});
  document.getElementById('rd-err-clr').addEventListener('click',()=>{runs=[];last=null;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
  return {stats,set:(nn,pp)=>{n=nn;p=pp;draw();return stats()}};
})();
