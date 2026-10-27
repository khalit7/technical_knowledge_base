// ---- Huawei roadmap: Huawei Connect 2025 dates (rings) against 2026 dates (dots) ----
(function(){
  const box=$('rmPlot');if(!box)return;
  // [part, old quarter index or null, new quarter index or [yearStart, yearEnd] for year-only]; index: 2026-Q1 = 0
  const q=(y,n)=>(y-2026)*4+(n-1);
  const R=[['Ascend 960DT (training)',q(2027,4),q(2027,1)],['Ascend 960PR (inference)',q(2027,4),q(2027,3)],['Atlas 960 SuperPoD',q(2027,4),q(2027,3)],['Atlas 860 SuperPoD (new)',null,q(2027,2)],['Ascend 970',q(2028,4),[q(2028,1),q(2028,4)]],['Ascend 980 (new)',null,[q(2029,1),q(2029,4)]]];
  function draw(){
    const W=Math.max(300,box.clientWidth||340),narrow=W<560,pl=narrow?100:170,pr=12,pt=24,rh=28,H=pt+R.length*rh+16;
    const X=i=>pl+(W-pl-pr)*(i+0.5)/16;
    let s='';
    [2026,2027,2028,2029].forEach((y,k)=>{const x0=pl+(W-pl-pr)*k*4/16;s+='<line x1="'+x0+'" x2="'+x0+'" y1="'+(pt-6)+'" y2="'+(H-10)+'" stroke="var(--line)"/><text x="'+(x0+(W-pl-pr)*2/16)+'" y="'+(pt-10)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>'});
    R.forEach(([n,o,nw],i)=>{const y=pt+i*rh+rh/2;s+='<text x="'+(pl-6)+'" y="'+(y+4)+'" font-size="11" text-anchor="end">'+(narrow?n.replace('Ascend ','').replace(' SuperPoD',' PoD').replace(' (training)',' train').replace(' (new)','*').replace(' (inference)',' infer'):n)+'</text>';
      if(Array.isArray(nw)){s+='<rect x="'+(X(nw[0])-4)+'" y="'+(y-4)+'" width="'+(X(nw[1])-X(nw[0])+8)+'" height="8" rx="4" fill="var(--c2)" opacity=".55"/>';if(o!=null)s+='<circle cx="'+X(o)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.6"/><text x="'+(X(o)+8)+'" y="'+(y+4)+'" font-size="11" fill="var(--mute)">Q4</text>';return}
      if(o!=null&&o!==nw){s+='<line x1="'+(X(o)-6)+'" x2="'+(X(nw)+7)+'" y1="'+y+'" y2="'+y+'" stroke="var(--c2)" stroke-width="1.6" marker-end="MARK"/>';
        s+='<circle cx="'+X(o)+'" cy="'+y+'" r="5" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.6"/>';
        s+='<text x="'+((X(o)+X(nw))/2)+'" y="'+(y-7)+'" font-size="11" text-anchor="middle" fill="var(--c2)">'+(o-nw)+' q earlier</text>'}
      s+='<circle cx="'+X(nw)+'" cy="'+y+'" r="5.5" fill="var(--c2)"/>'});
    box.innerHTML=svgEl(W,H,s,'Huawei roadmap dates')+'<div class="lgd"><span>○ Huawei Connect 2025</span><span style="color:var(--c2)">● Huawei Connect 2026</span><span>bar: year only</span><span>* new in 2026</span><span>* new in 2026</span></div>';
  }
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
