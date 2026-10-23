// ---- Reading section 4: one message hop by hop, two routes stepped together (moved from the Message path tab, 2026-10-24) ----
(function(){const CA=window.CA,esc=RD.esc,$=id=>document.getElementById(id);if(!$('mp-svg'))return;
  const RM=RD.RM,fmt=(v,d)=>v==null?'n/a':(+v).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  // positions: x in [0,1], row index
  const P={'A.g0':[.07,5],'A.g3':[.19,5],'A.p0':[.07,4],'A.p3':[.19,4],'A.n0':[.07,3],'A.n3':[.19,3],'A.nvs':[.13,6],
    'B.g0':[.37,5],'B.g3':[.49,5],'B.p0':[.37,4],'B.p3':[.49,4],'B.n0':[.37,3],'B.n3':[.49,3],'B.nvs':[.43,6],
    'C.g0':[.81,5],'C.g3':[.93,5],'C.p0':[.81,4],'C.p3':[.93,4],'C.n0':[.81,3],'C.n3':[.93,3],'C.nvs':[.87,6],
    'L1r0':[.20,2],'L1r3':[.38,2],'S1':[.29,1],'L2r0':[.81,2],'L2r3':[.93,2],'S2':[.87,1],'CO':[.58,0]};
  const NM={g0:'GPU 0',g3:'GPU 3',p0:'PCIe switch',p3:'PCIe switch',n0:'NIC 0',n3:'NIC 3',nvs:'NVSwitch',L1r0:'leaf, rail 0 (pod 1)',L1r3:'leaf, rail 3 (pod 1)',S1:'spine (pod 1)',L2r0:'leaf, rail 0 (pod 2)',L2r3:'leaf, rail 3 (pod 2)',S2:'spine (pod 2)',CO:'core (top layer)'};
  const nm=k=>{const p=k.split('.');return p.length>1?NM[p[1]]+' of node '+p[0]:NM[k]};
  const R={node:{nm:'Same node: GPU 0 to GPU 3',h:['A.g0','A.nvs','A.g3']},
    rail:{nm:'Same rail, other node: GPU 0 to GPU 0',h:['A.g0','A.p0','A.n0','L1r0','B.n0','B.p0','B.g0']},
    xrail:{nm:'Other rail, other node: GPU 0 to GPU 3',h:['A.g0','A.p0','A.n0','L1r0','S1','L1r3','B.n3','B.p3','B.g3']},
    pxn:{nm:'Other rail via NVLink first (NCCL PXN)',h:['A.g0','A.nvs','A.g3','A.p3','A.n3','L1r3','B.n3','B.p3','B.g3']},
    pod:{nm:'Other pod: GPU 0 to GPU 0',h:['A.g0','A.p0','A.n0','L1r0','S1','CO','S2','L2r0','C.n0','C.p0','C.g0']}};
  // NVSwitch drawn below GPUs: routes via nvs show as GPU -> NVSwitch -> GPU (the data model's hop lists list the same parts)
  const kind=k=>{if(k==='CO')return 'core';if(/^S/.test(k))return 'spine';if(/^L/.test(k))return 'leaf';const t=k.split('.')[1];return {g0:'gpu',g3:'gpu',p0:'pcie',p3:'pcie',n0:'nic',n3:'nic',nvs:'nvs'}[t]};
  function linkBw(a,b,o){const s=[kind(a),kind(b)].sort().join('-');
    if(s==='gpu-nvs')return [CA.links.nvl4.bw,'NVLink 4'];if(s==='gpu-pcie'||s==='nic-pcie')return [CA.links.pcie5.bw,'PCIe 5.0 x16'];
    if(s==='leaf-nic')return [CA.links.ib_leaf.bw,'400 Gb/s NIC to leaf'];if(s==='leaf-spine')return [50,'leaf to spine, 1:1 inside a pod'];
    if(s==='core-spine')return [50/o,'spine to core, '+o+':1 shared'];return [null,'?']}
  function stats(id,o){const r=R[id],C=CA.routes[id];let mn=1e9,why='';
    for(let i=0;i+1<r.h.length;i++){const b=linkBw(r.h[i],r.h[i+1],o);if(b[0]<mn){mn=b[0];why=b[1]}}
    const lat=C.lat;const t=(lat==null?0:lat*1e-6)+1/mn;return {bw:mn,why,lat,ms:t*1e3,sw:C.switches,nsw:C.nsw,n:r.h.length}}
  let ra='node',rb='pod';const ids=Object.keys(R);
  const seg=(el,cur)=>{el.innerHTML=ids.map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+esc(R[k].nm)+'</button>').join('')};
  seg($('mp-a'),ra);seg($('mp-b'),rb);
  const maxN=()=>Math.max(R[ra].h.length,R[rb].h.length);
  function draw(i){const box=$('mp-svg');const W=Math.max(300,Math.min(860,box.clientWidth||RD.width(box)));const narrow=W<560;
    const rowY=[16,56,96,140,176,212,248],H=268,X=x=>8+x*(W-16);const o=+$('mp-o').value;const fs=narrow?10.5:11;
    let s='';
    // node frames and pod frames
    [['A',.13],['B',.43],['C',.87]].forEach(n=>{s+='<rect x="'+X(n[1]-.115).toFixed(1)+'" y="126" width="'+(.23*(W-16)).toFixed(1)+'" height="134" rx="6" fill="none" stroke="var(--line)"/>'+RD.t(X(n[1]).toFixed(1),272-4,'node '+n[0]+(n[0]==='C'?' (pod 2)':' (pod 1)'),{a:'middle',fs:fs,fill:'var(--mute)'})});
    // links (all edges of all routes, faint)
    const E=new Set();ids.forEach(k=>{const h=R[k].h;for(let j=0;j+1<h.length;j++)E.add(h[j]+'|'+h[j+1])});
    E.forEach(e=>{const [a,b]=e.split('|');s+='<line x1="'+X(P[a][0]).toFixed(1)+'" y1="'+rowY[P[a][1]]+'" x2="'+X(P[b][0]).toFixed(1)+'" y2="'+rowY[P[b][1]]+'" stroke="var(--dim)" stroke-width="1"/>'});
    // highlight travelled segments
    [[ra,'var(--c1)',-2],[rb,'var(--c2)',2]].forEach(q=>{const h=R[q[0]].h;const k=Math.min(i,h.length-1);
      for(let j=0;j<k;j++){const a=h[j],b=h[j+1];s+='<line x1="'+(X(P[a][0])+q[2]).toFixed(1)+'" y1="'+(rowY[P[a][1]]+q[2])+'" x2="'+(X(P[b][0])+q[2]).toFixed(1)+'" y2="'+(rowY[P[b][1]]+q[2])+'" stroke="'+q[1]+'" stroke-width="3" stroke-linecap="round"/>'}});
    // parts
    Object.keys(P).forEach(k=>{const x=X(P[k][0]),y=rowY[P[k][1]];const kd=kind(k);const w=kd==='nvs'?.2*(W-16):narrow?36:48,h=18;
      const fill={gpu:'var(--open2)',nic:'var(--closed2)',pcie:'var(--soft)',nvs:'var(--closed2)',leaf:'var(--acc2)',spine:'var(--acc2)',core:'var(--acc2)'}[kd];
      const lab={gpu:narrow?(k.split('.')[1]==='g0'?'G0':'G3'):(k.split('.')[1]==='g0'?'GPU0':'GPU3'),nic:narrow?(k.split('.')[1]==='n0'?'N0':'N3'):(k.split('.')[1]==='n0'?'NIC0':'NIC3'),pcie:'PCIe',nvs:narrow?'NVS':'NVSwitch',leaf:narrow?'leaf':'leaf r'+k.slice(-1),spine:'spine',core:'core'}[kd];
      s+='<rect x="'+(x-w/2).toFixed(1)+'" y="'+(y-h/2)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="var(--line)"/>'+RD.t(x.toFixed(1),y+3.5,lab,{a:'middle',fs:fs})});
    // packets
    [[ra,'var(--c1)',-3],[rb,'var(--c2)',3]].forEach(q=>{const h=R[q[0]].h;const k=h[Math.min(i,h.length-1)];
      s+='<circle cx="'+(X(P[k][0])+q[2]).toFixed(1)+'" cy="'+(rowY[P[k][1]]-12)+'" r="5.5" fill="'+q[1]+'" stroke="var(--bg)" stroke-width="1.5"/>'});
    box.innerHTML=RD.svg(W,H+8,s,'Message routes through node, leaf, spine and core');
    const cap=[[ra,'a','A'],[rb,'b','B']].map(q=>{const h=R[q[0]].h;const k=Math.min(i,h.length-1);
      if(k===0)return '<span class="'+q[1]+'">'+q[2]+'</span>: starts at '+esc(nm(h[0]))+'.';
      const done=k===h.length-1;const b=linkBw(h[k-1],h[k],o);
      return '<span class="'+q[1]+'">'+q[2]+'</span>: hop '+k+', '+esc(nm(h[k-1]))+' to '+esc(nm(h[k]))+' over '+esc(b[1])+' ('+fmt(b[0],b[0]<10?2:0)+' GB/s).'+(done?' Arrived.':'')}).join('<br>');
    $('mp-cap').innerHTML=cap;
    $('mp-cnt').innerHTML=[[ra,'A','var(--c1)'],[rb,'B','var(--c2)']].map(q=>{const st=stats(q[0],o);const h=R[q[0]].h;const k=Math.min(i,h.length-1);
      return '<div class="card" style="border-left:4px solid '+q[2]+'"><h4>Route '+q[1]+': '+esc(R[q[0]].nm)+'</h4><div class="out" style="margin:4px 0">'+
        RD.stat('Hops done',k+' of '+(h.length-1),'')+RD.stat('Network switches',st.sw,st.nsw?'plus '+st.nsw+' NVSwitch':'')+
        RD.stat('Slowest hop',fmt(st.bw,st.bw<10?2:0)+' GB/s',esc(st.why))+RD.stat('Small-message latency',st.lat==null?'not published':fmt(st.lat,2)+' µs','')+
        RD.stat('1 GB message',fmt(st.ms,1)+' ms','derived')+'</div></div>'}).join('');
  }
  const A=RD.anim({card:'ca-mp-card',ctl:'mp-ctl',n:maxN(),draw,ms:1100,label:'Hop'});
  const re=()=>A.reset(maxN());
  RD.seg($('mp-a'),m=>{ra=m;re()});RD.seg($('mp-b'),m=>{rb=m;re()});
  $('mp-o').addEventListener('change',()=>A.redraw());
  RD.onResize(()=>A.redraw());
})();
