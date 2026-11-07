// ---- The lab topology drawer (used by the host-key and host-certificate steppers in sections 3 and 4),
// recorded logs (pre[data-log]) and small tables built from SSHD.
window.TOPO=(function(){
  const esc=RD.esc;
  const NODES={lap:{t:'laptop',s:'OpenSSH 10.3p1 client'},bas:{t:'bastion',s:'10.5p1, 127.0.0.1:30922'},n1:{t:'gpu-node-01',s:'10.5p1, notebook'},n2:{t:'gpu-node-02',s:'9.7p1, old node'}};
  function layout(w){
    if(w>=560){const W=Math.min(w,820),H=250;return{W,H,wide:1,bw:Math.min(150,W*0.2),bh:48,
      p:{lap:[W*0.11,125],bas:[W*0.44,125],n1:[W*0.84,62],n2:[W*0.84,192]},zone:[W*0.33,12,W*0.66,226]}}
    const W=Math.max(300,w),H=400;return{W,H,wide:0,bw:Math.min(140,W*0.42),bh:48,
      p:{lap:[W/2,36],bas:[W/2,176],n1:[W*0.27,340],n2:[W*0.73,340]},zone:[6,126,W-12,268]};
  }
  // o: {hl:{id:'on'|'bad'|'good'}, paths:[{a,b,c,label,dash,off}], badges:{id:text}, notes:[{id,text,c}]}
  function draw(el,o){
    o=o||{};const L=layout(RD.width(el)),p=L.p;let s='';
    const z=L.zone;s+='<rect class="tp-zone" x="'+z[0]+'" y="'+z[1]+'" width="'+z[2]+'" height="'+z[3]+'" rx="10"/>';
    s+=L.wide?RD.t(z[0]+8,z[1]+z[3]-8,'cluster network (internal: no route from the laptop)',{fs:10.5,fill:'var(--mute)'}):RD.t(z[0]+8,z[1]+14,'cluster network (internal)',{fs:10.5,fill:'var(--mute)'});
    // base links
    [['lap','bas'],['bas','n1'],['bas','n2']].forEach(([a,b])=>{s+='<line class="tp-link" x1="'+p[a][0]+'" y1="'+p[a][1]+'" x2="'+p[b][0]+'" y2="'+p[b][1]+'"/>'});
    if(!L.wide)s+=RD.t(p.lap[0]-10,(p.lap[1]+p.bas[1])/2+14,'internet / VPN',{fs:10.5,fill:'var(--mute)',a:'end'});else s+=RD.t((p.lap[0]+p.bas[0])/2,p.lap[1]-30,'internet / VPN',{fs:10.5,fill:'var(--mute)',a:'middle'});
    // highlighted paths
    (o.paths||[]).forEach(q=>{const a=p[q.a],b=p[q.b];const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;const off=(q.off||0)*7;const nx=-dy/len*off,ny=dx/len*off;
      s+='<line x1="'+(a[0]+nx)+'" y1="'+(a[1]+ny)+'" x2="'+(b[0]+nx)+'" y2="'+(b[1]+ny)+'" stroke="'+(q.c||'var(--acc)')+'" stroke-width="'+(q.w||4)+'" stroke-linecap="round"'+(q.dash?' stroke-dasharray="7 5"':'')+' opacity=".9"/>';
      if(q.label){const mx=(a[0]+b[0])/2+nx*2.2,my=(a[1]+b[1])/2+ny*2.2-6;s+='<text x="'+mx+'" y="'+my+'" text-anchor="middle" font-size="10.5" fill="'+(q.c||'var(--acc)')+'" font-weight="600" paint-order="stroke" stroke="var(--bg)" stroke-width="4">'+esc(q.label)+'</text>'}});
    // nodes
    Object.keys(NODES).forEach(id=>{const [x,y]=p[id],w=L.bw,h=L.bh,cls=(o.hl&&o.hl[id])||'';
      s+='<g class="tp-node '+cls+'"><rect x="'+(x-w/2)+'" y="'+(y-h/2)+'" width="'+w+'" height="'+h+'" rx="8"/>'+
        RD.t(x,y-4,NODES[id].t,{a:'middle',fs:12.5,w:600})+RD.t(x,y+12,NODES[id].s,{a:'middle',fs:10.5,fill:'var(--mute)'})+'</g>';
      const bd=o.badges&&o.badges[id];if(bd){const bw=Math.min(w+30,bd.length*6+14);s+='<g><rect x="'+(x-bw/2)+'" y="'+(y+h/2+3)+'" width="'+bw+'" height="17" rx="8" fill="'+(o.bc&&o.bc[id]||'var(--hl)')+'"/>'+RD.t(x,y+h/2+15,esc(bd),{a:'middle',fs:10.5,w:600})+'</g>'}});
    el.innerHTML=RD.svg(L.W,L.H,s,o.label||'Lab topology');
  }
  return {draw,layout};
})();
// recorded logs: <pre class="blk" data-log="name"> is filled from SSHD.logs; long ones scroll
(function(){
  document.querySelectorAll('pre[data-log]').forEach(pre=>{const k=pre.dataset.log;const t=SSHD.logs[k];
    pre.classList.add('log');pre.textContent=t==null?'(log '+k+' missing)':t;});
})();
