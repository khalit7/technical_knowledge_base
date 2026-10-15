// ---- Reading section 6: one matmul's copies and block matmuls on two lanes, serial against double-buffered.
// Segments and times come from src/runs/pk_pipeline.py (calculated with v5e's published 819 GB/s and 197 TFLOP/s).
(function(){
  const U=PKU,P=window.PK,$=id=>document.getElementById(id);
  let cs='toy',mode='serial';
  const svg=$('pk-pipe-svg'),cap=$('pk-pipe-cap'),cnt=$('pk-pipe-cnt');
  const C=()=>P.PL.cases[cs];
  function draw(i){
    const c=C(),segs=c[mode],n=c.steps.length,W=Math.min(U.width(svg),860),x0=W<520?46:58,H=96,tmax=c.t_serial;
    const sx=t=>x0+(W-x0-8)*t/tmax;
    const done=segs.filter(s=>s[3]<=i||(i===n-1));
    const mm=segs.find(s=>s[0]==='mxu'&&s[3]===i);
    const tnow=i===n-1?(mode==='serial'?c.t_serial:c.t_overlap):(mm?mm[2]:0);
    let s='';
    [['dma','DMA (HBM to VMEM and back)',18],['mxu','MXU (block matmul)',54]].forEach(([k,lab,y])=>{
      s+='<text x="0" y="'+(y-4)+'" font-size="10" fill="var(--mute)">'+(W<520?(k==='dma'?'DMA':'MXU'):lab)+'</text>';
      s+='<rect x="'+x0+'" y="'+y+'" width="'+(W-x0-8)+'" height="20" fill="var(--soft)" stroke="var(--line)"/>'});
    const col={in:'var(--c1)',out:'var(--c2)',mm:'var(--c3)'};
    segs.forEach(sg=>{const y=sg[0]==='dma'?18:54,show=done.includes(sg);if(!show)return;
      const x=sx(sg[1]),w=Math.max(0.8,sx(sg[2])-sx(sg[1]));s+='<rect x="'+x+'" y="'+(y+1)+'" width="'+w+'" height="18" fill="'+col[sg[4]]+'" opacity="'+(sg[3]===i?1:.55)+'"/>'});
    s+='<line x1="'+sx(tnow)+'" x2="'+sx(tnow)+'" y1="12" y2="80" stroke="var(--ink)" stroke-width="1.2"/>';
    for(let k=0;k<=4;k++){const t=tmax*k/4;s+='<text x="'+sx(t)+'" y="92" font-size="9.5" text-anchor="'+(k===0?'start':k===4?'end':'middle')+'" fill="var(--mute)">'+U.comma(t,1)+' &#181;s</text>'}
    svg.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Pipeline timeline">'+s+'</svg>';
    const st=c.steps[i];const dma=segs.filter(x=>x[0]==='dma'&&done.includes(x)).reduce((a,x)=>a+x[2]-x[1],0),mx=segs.filter(x=>x[0]==='mxu'&&done.includes(x)).reduce((a,x)=>a+x[2]-x[1],0);
    cap.innerHTML='<div class="t">Grid step '+(i+1)+' of '+n+' (i, j, k) = ('+st.g.join(', ')+')</div><p>'+(st.in_bytes?'Copies in '+U.bytes(st.in_bytes)+' of changed blocks ('+U.comma(st.in_us,3)+' &#181;s)':'No new input block (same indices as the step before)')+
      '; block matmul of '+U.comma(st.flops/1e6,1)+' MFLOP ('+U.comma(st.mxu_us,3)+' &#181;s)'+(st.out_us?'; then the finished output block goes back ('+U.comma(st.out_us,3)+' &#181;s)':'')+'. '+
      (mode==='serial'?'Serial: the MXU waits for every copy.':'Double-buffered: this step\'s copy was issued while the previous step computed.')+(i===n-1?' Total: '+U.comma(mode==='serial'?c.t_serial:c.t_overlap,2)+' &#181;s.':'')+'</p>';
    cnt.innerHTML=U.stat('Elapsed',U.comma(tnow,2)+' &#181;s',mode==='serial'?'serial':'double-buffered')+U.stat('DMA lane busy',U.comma(dma,2)+' &#181;s','of '+U.comma(c.dma_total,2)+' in all')+
      U.stat('MXU busy',U.comma(mx,2)+' &#181;s','of '+U.comma(c.mxu_total,2)+' in all')+U.stat('MXU idle so far',tnow>0?U.comma(100*(1-mx/tnow),0)+'%':'&#8211;','the cost of waiting for copies');
  }
  const A=U.anim({card:'pk-pipe-card',ctl:'pk-pipe-ctl',tab:'t-read',n:C().steps.length,ms:700,label:'Grid step',draw});
  U.seg($('pk-pipe-case'),m=>{cs=m;A.reset(C().steps.length)});
  U.seg($('pk-pipe-mode'),m=>{mode=m;A.redraw()});
  addEventListener('resize',()=>{if(!$('t-read').hidden)A.redraw()});
})();
