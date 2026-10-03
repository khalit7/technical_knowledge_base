// ---- Reading: the CMR law as a calculator (Gu et al. Table 5) and D-CPT usage 1 (Que et al. Table 5) ----
(function(){
  const plot=document.getElementById('cmPlot');if(!plot)return;
  const C=CPT.cmr,P=CPT.cmrPub,SIZES=['460M','940M','1.6B','3.1B'],COL=['var(--c6)','var(--c3)','var(--c4)','var(--c2)'];
  const cmr=(k,tokB)=>{const [a,s,b]=C[k];return a*Math.pow(tokB/0.2,s)+b};  // T in units of 0.2B tokens
  const sz=document.getElementById('cmSize'),sl=document.getElementById('cmT');
  function draw(){
    const k=sz.value,tok=+sl.value,r=cmr(k,tok);
    document.getElementById('cmTv').textContent=tok+'B';
    const pct=v=>(100*v).toFixed(1)+'%';
    document.getElementById('cmOut').innerHTML=
      RD.stat('Critical mixture ratio',r<=0?'none':pct(r),r<=0?'the fit falls below zero here: no feasible domain share':'largest domain share that keeps general loss within 0.05')+
      RD.stat('General share',r<=0?'n/a':pct(1-r),'the replay part of the mix')+
      RD.stat('Domain tokens',r<=0?'n/a':(r*tok).toFixed(1)+'B','of '+tok+'B in total')+
      RD.stat('Published at 20B',P[k]+'%','recomputed: '+pct(cmr(k,20))+(Math.abs(100*cmr(k,20)-P[k])<0.05?' <span class="ok">match</span>':''))+
      (tok>20?RD.stat('Status','<span class="warn">extrapolated</span>','fitted on runs up to 20B tokens'):'');
    const w=Math.min(RD.width(plot),860),h=Math.max(200,Math.min(280,w*0.42));
    const F=PL.frame({w,h,x:[4,60],y:[0,0.7],xt:[4,10,20,30,40,50,60],xf:v=>v+'B',yt:[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7],yf:v=>Math.round(v*100)+'%',xlab:'CPT tokens',ylab:'domain share (CMR)',m:{l:44,r:18,t:10,b:34}});
    let s=F.open()+'<rect x="'+F.sx(20)+'" y="'+F.m.t+'" width="'+(F.sx(60)-F.sx(20))+'" height="'+F.ih+'" fill="var(--soft)"/>'+F.axes;
    s+='<text x="'+(F.sx(20)+5)+'" y="'+(F.m.t+12)+'" font-size="10.5" fill="var(--mute)">extrapolation</text>';
    SIZES.forEach((z,i)=>{const p=[];for(let t=4;t<=60;t+=0.5){const v=cmr(z,t);if(v>=0)p.push([t,Math.min(v,0.7)])}
      s+='<path d="'+PL.path(p,F.sx,F.sy)+'" fill="none" stroke="'+COL[i]+'" stroke-width="'+(z===k?2.8:1.4)+'" opacity="'+(z===k?1:.6)+'"/>';
      s+='<circle cx="'+F.sx(20)+'" cy="'+F.sy(P[z]/100)+'" r="'+(z===k?4.5:3)+'" fill="'+COL[i]+'"/>';
    });
    if(r>0)s+='<line x1="'+F.sx(tok)+'" x2="'+F.sx(tok)+'" y1="'+F.m.t+'" y2="'+(F.m.t+F.ih)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><circle cx="'+F.sx(tok)+'" cy="'+F.sy(Math.min(r,0.7))+'" r="5" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    plot.innerHTML=s+F.close()+'<div class="lg" style="padding:0 8px 6px">'+SIZES.map((z,i)=>'<span><i style="background:'+COL[i]+'"></i>'+z+(z===k?' (selected)':'')+'</span>').join('')+'<span>dots: published CMR at 20B</span></div>'}
  sz.addEventListener('change',draw);sl.addEventListener('input',draw);
  RD.onRender(draw);addEventListener('resize',draw);draw();

  // D-CPT usage 1: general-loss rise against domain share, with a movable tolerance
  const dp=document.getElementById('dcPlot'),dsl=document.getElementById('dcT'),D=CPT.dcpt;
  function cross(tol){const lim=D.lg0*(1+tol/100);for(let i=0;i<D.rd.length-1;i++){if(D.lg[i]<=lim&&lim<D.lg[i+1])return D.rd[i]+(D.rd[i+1]-D.rd[i])*(lim-D.lg[i])/(D.lg[i+1]-D.lg[i])}return null}
  function drawD(){
    const tol=+dsl.value,c=cross(tol);document.getElementById('dcTv').textContent=tol.toFixed(1)+'%';
    const w=Math.min(RD.width(dp),860),h=Math.max(190,Math.min(250,w*0.38));
    const pts=D.rd.map((r,i)=>[r,100*(D.lg[i]/D.lg0-1)]).filter(p=>p[0]<=0.94);
    const F=PL.frame({w,h,x:[0.9,0.94],y:[1,5],xt:[0.9,0.91,0.92,0.93,0.94],xf:v=>v.toFixed(2),yt:[1,2,3,4,5],yf:v=>v+'%',xlab:'domain share of the CPT mix (chemistry)',ylab:'general-loss rise',m:{l:40,r:12,t:10,b:34}});
    let s=F.open()+F.axes;
    s+='<line x1="'+F.m.l+'" x2="'+(F.W-F.m.r)+'" y1="'+F.sy(tol)+'" y2="'+F.sy(tol)+'" stroke="var(--bad)" stroke-dasharray="5 4"/><text x="'+(F.m.l+4)+'" y="'+(F.sy(tol)-5)+'" font-size="10.5" fill="var(--bad)">allowed: '+tol.toFixed(1)+'%</text>';
    s+='<path d="'+PL.path(pts,F.sx,F.sy)+'" fill="none" stroke="var(--c1)" stroke-width="2"/>';
    pts.forEach(p=>{s+='<circle cx="'+F.sx(p[0])+'" cy="'+F.sy(p[1])+'" r="3.5" fill="var(--c1)"/>'});
    if(c!=null)s+='<line x1="'+F.sx(c)+'" x2="'+F.sx(c)+'" y1="'+F.m.t+'" y2="'+(F.m.t+F.ih)+'" stroke="var(--ink)" stroke-dasharray="3 3"/><text x="'+(F.sx(c)+(F.sx(c)>F.W-110?-5:5))+'" y="'+(F.m.t+F.ih-6)+'" text-anchor="'+(F.sx(c)>F.W-110?'end':'start')+'" font-size="11" fill="var(--ink)">best share '+c.toFixed(3)+'</text>';
    dp.innerHTML=s+F.close();
    document.getElementById('dcOut').innerHTML=c==null?'No crossing inside the measured shares (0.90 to 0.94).':
      'Largest domain share whose measured general loss stays within '+tol.toFixed(1)+'% of 2.8602: <b>'+c.toFixed(3)+'</b>, i.e. <b>'+(100*(1-c)).toFixed(1)+'%</b> general replay <i class="nl d">derived</i>. With no general data at all (share 1.0, off the chart) general loss rose '+D.no_replay_rise_pct+'%.'}
  dsl.addEventListener('input',drawD);RD.onRender(drawD);addEventListener('resize',drawD);drawD();
})();
