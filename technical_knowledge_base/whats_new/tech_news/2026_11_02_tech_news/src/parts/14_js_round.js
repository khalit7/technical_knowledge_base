// ---- Fair Cast: round-to-nearest against stochastic-rounding export of one fp32 master weight to bf16 ----
(function(){
  const card=$('v-round');if(!card)return;
  $('rdAnim').innerHTML=animCtl('rd',[['rtn','Round to nearest'],['sr','Stochastic rounding']]);
  const ULP=Math.pow(2,-13),G0=246*ULP,U=1e-6,N=150;
  const master=t=>G0+U*t;
  const rtn=t=>Math.round(master(t)/ULP)*ULP;
  const rnd=mulberry32(20261029),draws=[];for(let t=0;t<=N;t++)draws.push(rnd());
  const sr=t=>{const m=master(t),lo=Math.floor(m/ULP+1e-12)*ULP,p=(m-lo)/ULP;return draws[t]<p?lo+ULP:lo};
  const STALE=Math.ceil((ULP/2)/U);  // first step at which round-to-nearest moves: 62
  const RT=[{t:'Same start',c:'At step 0 the fp32 master and its bf16 copy hold the same value, which sits on the bf16 grid.',n:0},
    {t:'The master moves, the served copy does not',c:'Each step adds 0.000001 to the master. Rounded to the nearest grid value, the copy the sampler receives does not change: every one of these updates is lost to the sampler.',n:40},
    {t:'The sampler is serving an old policy',c:'By step '+(STALE-1)+' the master has moved '+(STALE-1)+' updates, and the sampler still serves the step-0 weight. Importance ratios computed between two copies that were both rounded the same way cannot see this gap.',n:STALE-1},
    {t:'One jump, then frozen again',c:'At step '+STALE+' the master crosses the midpoint and the copy jumps a whole grid step at once; then it freezes again. The served weight is a staircase that trails the master.',n:N}];
  const SR=[{t:'Same start',c:'Same weight, same updates. Now each export rounds up with a probability equal to how far the master has moved toward the next grid value.',n:0},
    {t:'Small updates show up as more frequent jumps',c:'Early on the master is close to the lower value, so the copy rarely rounds up; as the master climbs, up-rounds become more frequent. No single export is exact.',n:40},
    {t:'On average the copy equals the master',c:'The expected value of each export is exactly the master: the further the master has climbed between two grid values, the more often the copy rounds up. The sampler sees the policy the optimiser has, plus noise, not one that is '+(STALE-1)+' steps old.',n:STALE-1},
    {t:'Unbiased, so nothing is silently dropped',c:'Over 150 steps every update reaches the sampler in expectation. Fair Cast pairs this with computing the loss on the served copy; in the paper, unbiased export alone was not enough.',n:N}];
  const MODES={rtn:{name:'Round to nearest',steps:RT},sr:{name:'Stochastic rounding',steps:SR}};
  function draw(st){
    const g=st.m==='sr',steps=MODES[st.m].steps,box=$('rdSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560,H=narrow?250:270;
    const prev=st.k?steps[st.k-1].n:0,upto=Math.round(prev+(steps[st.k].n-prev)*Math.max(0,Math.min(1,st.t)));
    const pl=narrow?58:70,pr=12,pt=14,pb=34,y0=G0-ULP*0.35,y1=G0+ULP*1.6;
    const X=t=>pl+(W-pl-pr)*t/N,Y=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));
    let s='';
    [0,1].forEach(k=>{const v=G0+k*ULP;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--mute)" stroke-dasharray="2 3"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v.toFixed(6)+'</text>'});
    s+='<text x="'+(pl-6)+'" y="'+(Y(G0+ULP/2)+4)+'" font-size="10" text-anchor="end" fill="var(--mute)">midpoint</text><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(G0+ULP/2)+'" y2="'+Y(G0+ULP/2)+'" stroke="var(--line)"/>';
    [0,50,100,150].forEach(t=>{s+='<text x="'+X(t)+'" y="'+(H-pb+15)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">RL step</text>';
    let pm='',ps='';
    for(let t=0;t<=upto;t++){pm+=(t?'L':'M')+X(t).toFixed(1)+','+Y(master(t)).toFixed(1);
      if(!g){const v=rtn(t);ps+=(t?'L'+X(t).toFixed(1)+','+Y(rtn(t-1)).toFixed(1)+'L':'M')+X(t).toFixed(1)+','+Y(v).toFixed(1)}
      else{const v=sr(t);ps+='<circle cx="'+X(t).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2" fill="var(--closed)"/>'}}
    s+='<path d="'+pm+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+=g?ps:'<path d="'+ps+'" fill="none" stroke="var(--closed)" stroke-width="2.4"/>';
    const lx=X(Math.min(upto,N))-4;s+='<text x="'+Math.max(pl+90,lx)+'" y="'+(Y(master(upto))-8)+'" font-size="11" text-anchor="end" fill="var(--acc)">fp32 master</text>';
    s+='<text x="'+(pl+6)+'" y="'+(Y(G0)+16)+'" font-size="11" fill="var(--closed)">'+(g?(narrow?'bf16 copy, rounded at random':'bf16 copy, rounded at random each step (dots)'):'bf16 copy the sampler serves')+'</text>';
    box.innerHTML=svgEl(W,H,s,'Master weight against served bf16 copy: '+MODES[st.m].name);
    const changed=t=>t>0&&(g?sr(t)!==sr(t-1):rtn(t)!==rtn(t-1));let nc=0;for(let t=1;t<=upto;t++)if(changed(t))nc++;
    const lag=g?0:(rtn(upto)===G0?upto:upto-STALE);
    $('rdCnt').innerHTML=stat('Steps shown',String(upto),'of '+N)+stat('Exports that changed the served weight',String(nc),upto?Math.round(100*nc/upto)+'% of steps':'')+stat(g?'Served weight, on average':'Steps since the served weight last changed',g?'equals the master':String(Math.max(0,lag)),g?'unbiased by construction':'each one an update the sampler missed');
  }
  makeAnim({card,pre:'rd',modes:MODES,start:'rtn',dur:1600,draw});
})();
