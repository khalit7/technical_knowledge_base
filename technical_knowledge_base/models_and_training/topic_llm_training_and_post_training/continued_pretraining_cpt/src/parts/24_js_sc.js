// ---- Reading: three learning-rate schedules across two datasets (Ibrahim et al. Eq. 1 to 4, Table 14 values) ----
(function(){
  const plot=document.getElementById('scPlot');if(!plot)return;
  const MX=3e-4,MN=3e-5,CO=1.65e-4,WU=0.01;let mode='cos';
  const cos=(p,a,b)=>b+(a-b)*0.5*(1+Math.cos(Math.PI*p));
  // t in [0,2]: dataset 1 is [0,1], dataset 2 is [1,2]
  function lr(t,m,branch){
    if(t<=1){
      if(t<WU)return MX*t/WU;
      if(m!=='inf')return cos((t-WU)/(1-WU),MX,MN);
      if(t<0.6)return cos((t-WU)/(0.6-WU),MX,CO);           // cooldown to the constant (Eq. 3 form)
      if(branch&&t>0.75)return CO*Math.pow(MN/CO,(t-0.75)/0.25); // a branch anneal for a model released after dataset 1
      return CO}
    const u=t-1;
    if(m==='cos'){if(u<WU)return MN+(MX-MN)*u/WU;return cos((u-WU)/(1-WU),MX,MN)}
    if(m==='const')return MN;
    if(u>0.75)return CO*Math.pow(MN/CO,(u-0.75)/0.25);       // final anneal (exponential, Eq. 2's annealing phase)
    return CO}
  const CAP={cos:'<b>Cosine, then re-warm</b> (Ibrahim et al.\'s main recipe): the second dataset re-warms to the original peak over 1% of its steps and decays again. Adapts best; the jump back up is where the old-data loss spikes.',
    const:'<b>Cosine, then stay at the minimum</b> (their no-re-warm baseline): smooth, least forgetting, but adapts slowly: on German its loss ended at 1.21 against 1.11 for the re-warmed run (Table 12).',
    inf:'<b>Infinite schedule</b>: warm up, cool down once to a constant 1.65e-4, and stay there across datasets; anneal only the copy you release (dashed branch). The next dataset continues from the constant phase, so there is nothing to re-warm.'};
  function draw(){
    const w=Math.min(RD.width(plot),860),h=Math.max(170,Math.min(230,w*0.33));
    const F=PL.frame({w,h,x:[0,2],y:[0,3.3e-4],xt:[0,0.5,1,1.5,2],xf:t=>t===0?'0':t===1?'dataset 2 starts':t===2?'end':'',yt:[0,1e-4,2e-4,3e-4],yf:v=>v?v.toExponential(0):'0',ylab:'learning rate',m:{l:46,r:12,t:10,b:28}});
    let s=F.open()+F.axes;
    s+='<rect x="'+F.sx(1)+'" y="'+F.m.t+'" width="'+(F.sx(2)-F.sx(1))+'" height="'+F.ih+'" fill="var(--soft)"/>';
    s+=F.axes;
    ['cos','const','inf'].filter(m=>m!==mode).forEach(m=>{const p=[];for(let i=0;i<=400;i++){const t=i/200;p.push([t,lr(t,m)])}
      s+='<path d="'+PL.path(p,F.sx,F.sy)+'" fill="none" stroke="var(--dim)" stroke-width="1.5"/>'});
    const p=[];for(let i=0;i<=800;i++){const t=i/400;p.push([t,lr(t,mode)])}
    s+='<path d="'+PL.path(p,F.sx,F.sy)+'" fill="none" stroke="var(--acc)" stroke-width="2.4"/>';
    if(mode==='inf'){const q=[];for(let i=300;i<=400;i++){const t=i/400;q.push([t,lr(t,'inf',true)])}
      s+='<path d="'+PL.path(q,F.sx,F.sy)+'" fill="none" stroke="var(--acc)" stroke-width="1.6" stroke-dasharray="4 3"/>';
      s+='<circle cx="'+F.sx(1)+'" cy="'+F.sy(CO)+'" r="4" fill="var(--c3)"/><text x="'+(F.sx(1)-6)+'" y="'+(F.sy(CO)-8)+'" text-anchor="end" font-size="10.5" fill="var(--c3)">continue from here</text>'}
    if(mode==='cos')s+='<text x="'+(F.sx(1)+6)+'" y="'+(F.sy(MX)+12)+'" font-size="10.5" fill="var(--bad)">re-warm</text>';
    plot.innerHTML=s+F.close();
    document.getElementById('scCap').innerHTML=CAP[mode]}
  document.querySelectorAll('#scMode button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#scMode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;draw()}));
  RD.onRender(draw);addEventListener('resize',draw);draw();
})();
