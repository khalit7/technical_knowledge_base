// ---- Section 1: popularity skew of one real hour of Wikipedia traffic (share curve and rank-frequency on log scales) ----
(function(){
  const S=CA.skew,box=document.getElementById('rd-skew-svg'),cnt=document.getElementById('rd-skew-cnt');if(!box)return;
  let mode='lorenz';
  const pct=v=>(v*100).toFixed(v<0.1?1:0)+'%';
  function draw(){
    const W=Math.min(RD.width(box),760),H=Math.round(Math.min(300,Math.max(220,W*0.5))),L=48,R=14,T=12,B=40,w=W-L-R,h=H-T-B;let g='';
    if(mode==='lorenz'){
      // x: share of pages on a log scale from 0.001% to 100%; y: share of views
      const xs=v=>L+(Math.log10(Math.max(v,1e-6))+6)/6*w,ys=v=>T+h-v*h;
      for(let e=-6;e<=0;e++){const x=xs(Math.pow(10,e));g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(T+h)+'" stroke="var(--line)"/>'+RD.t(x,T+h+14,(e>=-2?(Math.pow(10,e)*100)+'%':'1e'+(e+2)+'%'),{a:'middle',fs:10,fill:'var(--mute)'})}
      for(let i=0;i<=4;i++){const y=ys(i/4);g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-6,y+4,(i*25)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
      const pts=S.lorenz.filter(p=>p[0]>0);let d='';
      // the first ideal-hit point is the top 1000 pages; draw from the smallest measured share
      pts.forEach(p=>{d+=(d?' L':'M')+xs(p[0]).toFixed(1)+','+ys(p[1]).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2.5"/>';
      pts.forEach(p=>{g+='<circle cx="'+xs(p[0]).toFixed(1)+'" cy="'+ys(p[1]).toFixed(1)+'" r="3" fill="var(--c1)"><title>top '+pct(p[0])+' of pages: '+pct(p[1])+' of views</title></circle>'});
      // equal-popularity reference: share of views = share of pages
      let dd='';for(let e=-6;e<=0.001;e+=0.1){const v=Math.pow(10,e);dd+=(dd?' L':'M')+xs(v).toFixed(1)+','+ys(v).toFixed(1)}
      g+='<path d="'+dd+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/>'+RD.t(L+6,T+12,'dashed: every page equally popular',{fs:10,fill:'var(--mute)'});
      g+=RD.t(L+w/2,H-4,'share of pages, most popular first (log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
      g+='<text transform="translate(12,'+(T+h/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">share of views</text>';
    }else{
      const R0=S.rank_views,maxr=R0[R0.length-1][0],maxv=R0[0][1];
      const xs=v=>L+Math.log10(v)/Math.log10(maxr)*w,ys=v=>T+h-Math.log10(v)/Math.log10(maxv)*h;
      for(let e=0;e<=Math.floor(Math.log10(maxr));e++){const x=xs(Math.pow(10,e));g+='<line x1="'+x+'" x2="'+x+'" y1="'+T+'" y2="'+(T+h)+'" stroke="var(--line)"/>'+RD.t(x,T+h+14,e<3?String(Math.pow(10,e)):'1e'+e,{a:'middle',fs:10,fill:'var(--mute)'})}
      for(let e=0;e<=Math.floor(Math.log10(maxv));e++){const y=ys(Math.pow(10,e));g+='<line x1="'+L+'" x2="'+(L+w)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-6,y+4,e<4?String(Math.pow(10,e)):'1e'+e,{a:'end',fs:10,fill:'var(--mute)'})}
      let d='';R0.forEach(p=>{d+=(d?' L':'M')+xs(p[0]).toFixed(1)+','+ys(Math.max(1,p[1])).toFixed(1)});
      g+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="2.5"/>';
      // fitted Zipf line on ranks 10..100,000, anchored at rank 10's measured value
      const a=S.zipf_alpha_fit,fp=R0.filter(p=>p[0]>=10&&p[0]<=1e5);
      // intercept of the least-squares line with the published slope, over the fitted ranks
      const lc=fp.reduce((t,p)=>t+Math.log(p[1])+a*Math.log(p[0]),0)/fp.length,f=r=>Math.exp(lc)*Math.pow(r,-a);g+='<path d="M'+xs(10)+','+ys(f(10))+' L'+xs(1e5)+','+ys(f(1e5))+'" stroke="var(--c2)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>';
      g+=RD.t(xs(30),ys(f(30))-10,'Zipf fit, α = '+a.toFixed(2),{fs:11,fill:'var(--c2)'});
      g+=RD.t(L+w/2,H-4,'popularity rank (log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
      g+='<text transform="translate(12,'+(T+h/2)+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">views in the hour (log)</text>';
    }
    box.innerHTML=RD.svg(W,H,g,mode==='lorenz'?'Share of views against share of pages':'Views by rank on log scales');
    cnt.innerHTML=RD.stat('Views in the hour',S.views.toLocaleString('en-US'),'English Wikipedia, '+S.hour)+RD.stat('Distinct pages',S.pages.toLocaleString('en-US'),'')+
      RD.stat('Top 1% of pages get',pct(S.share_top['1%']),'of all views')+RD.stat('Viewed exactly once',pct(S.once_share),'of pages: always a miss');
  }
  RD.seg(document.getElementById('rd-skew-mode'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
