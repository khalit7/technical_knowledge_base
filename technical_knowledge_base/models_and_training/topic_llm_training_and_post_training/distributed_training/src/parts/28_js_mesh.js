// ---- Reading: two published layouts as nested groups, with bytes and seconds per GPU per step per axis (numbers from the Layout calculator's core, window.LAY) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('meshSvg'))return;
  const NEST={
    l405_8k_16k:[['DP 128 replicas','network'],['PP 16, a server per stage','network'],['TP 8 inside one server','NVLink']],
    dsv3:[['DP 128, ZeRO-1','network'],['PP 16 stages of 128 GPUs','network'],['EP 64 over 8 servers','network'],['server: 4 experts per GPU','NVLink']]};
  const CAP={
    l405_8k_16k:'TP moves twelve times the bytes DP does, but on a link nine times faster and inside the server; PP sends almost nothing, so it can span servers. All three together take under a sixth of the compute time, before any overlap.',
    dsv3:'No TP at all. The 64-way expert all-to-all crosses InfiniBand and is the largest term, close to the compute time: the "approximately 1:1" that DualPipe hides by overlapping one micro-batch\'s communication with another\'s computation.'};
  let pre='l405_8k_16k';
  function draw(){const L=window.LAY;if(!L)return;const r=L.layout(L.PRESETS[pre]),el=$('meshSvg'),w=Math.max(260,RD.width(el)),t=RD.t;
    let s='',y=0;const nest=NEST[pre],pad=8,lh=18;
    // nested boxes, outermost first
    nest.forEach((n,i)=>{const x=i*pad,bw=w-2*i*pad,bh=(nest.length-i)*lh+pad*(nest.length-i)+30;
      s+='<rect x="'+x+'" y="'+(i*(lh+pad/2))+'" width="'+bw+'" height="'+(bh)+'" rx="7" fill="'+(i===nest.length-1?'var(--acc2)':'none')+'" stroke="'+(n[1]==='NVLink'?'var(--c6)':'var(--ib)')+'" stroke-width="1.3"/>';
      s+=t(x+8,i*(lh+pad/2)+14,n[0]+' · '+n[1],{fill:n[1]==='NVLink'?'var(--c6)':'var(--ib)',w:600})});
    const iy=(nest.length-1)*(lh+pad/2)+22,ix=(nest.length-1)*pad+8,gw=Math.min(26,(w-2*ix-7*4)/8);
    for(let g=0;g<8;g++)s+='<rect x="'+(ix+g*(gw+4)).toFixed(1)+'" y="'+iy+'" width="'+gw.toFixed(1)+'" height="14" rx="2" fill="var(--c1)" fill-opacity="0.8"/>';
    y=nest.length*(lh+pad)+40;
    // per-axis bars: seconds per step on the axis's link, against compute
    const rows=[];['TP','CP','EP','PP','DP'].forEach(a=>{if(r.comm[a]>0)rows.push([a+(r.link[a]==='nv'?' · NVLink':' · network'),r.t[a],r.comm[a].toFixed(r.comm[a]>=100?0:r.comm[a]>=10?1:2)+' GB',r.link[a]==='nv'?'var(--c6)':'var(--ib)'])});
    rows.push(['compute',r.t_comp,'',"var(--c3)"]);
    const mx=Math.max(...rows.map(q=>q[1])),lx=Math.min(120,w*0.34),bw=w-lx-4;
    rows.forEach(q=>{const bl=Math.max(1,bw*q[1]/mx);
      s+=t(0,y+11,q[0])+'<rect x="'+lx+'" y="'+(y+2)+'" width="'+bl.toFixed(1)+'" height="11" rx="2" fill="'+q[3]+'"/>';
      const lab=(q[2]?q[2]+', ':'')+q[1].toFixed(q[1]<0.1?3:2)+' s';
      s+=t(bl+lx+4>w-100?lx+bl-4:lx+bl+4,y+11,lab,{a:bl+lx+4>w-100?'end':null,fill:bl+lx+4>w-100?'var(--bg)':'var(--ink)'});
      y+=18});
    el.innerHTML=RD.svg(w,y+2,s,'Nested parallel groups and seconds per step per axis');
    $('meshCap').innerHTML=CAP[pre]+' Bars: seconds per GPU per step at peak link bandwidth, against compute at '+Math.round(100*(L.PRESETS[pre].mfu))+'% MFU.'}
  RD.seg($('meshSeg'),m=>{pre=m;draw()});
  RD.onRender(draw);RD.onResize(draw);setTimeout(draw,0);
})();
