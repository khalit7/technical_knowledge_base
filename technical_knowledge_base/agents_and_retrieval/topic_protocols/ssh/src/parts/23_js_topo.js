// ---- The lab topology drawer (used by the one-screen picture, the agent animation and the Cluster lab tab),
// the static diagrams, recorded logs (pre[data-log]) and small tables built from SSHD.
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
        RD.t(x,y-4,NODES[id].t,{a:'middle',fs:12.5,w:600})+RD.t(x,y+12,NODES[id].s,{a:'middle',fs:10,fill:'var(--mute)'})+'</g>';
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
// the one-screen topology and the static diagrams
(function(){
  const one=document.getElementById('one-topo');
  const d1=()=>TOPO.draw(one,{paths:[{a:'lap',b:'bas',label:'SSH (TCP 22)'},{a:'bas',b:'n1',label:'ProxyJump',dash:1}],badges:{n1:'notebook 127.0.0.1:8888'}});
  d1();RD.onResize(d1);RD.onRender(d1);
  // three layers
  const lf=document.getElementById('layers-fig');
  function layers(){const w=Math.min(RD.width(lf),760),rows=[['Connection (RFC 4254)','channels: session (shell, exec, sftp) | direct-tcpip (-L, -D, ProxyJump) | forwarded-tcpip (-R) | agent | x11','var(--c3)'],
    ['User authentication (RFC 4252)','publickey (key or certificate), keyboard-interactive (2FA), password; signature covers the session identifier','var(--c4)'],
    ['Transport (RFC 4253)','banner, KEXINIT, key exchange + host key signature, NEWKEYS, then encrypted packets with a MAC; rekeying','var(--c1)'],
    ['TCP (port 22)','one connection: lose it and every channel goes with it','var(--dim)']];
    const narrow=w<520,rh=narrow?58:40;let s='';rows.forEach((r,i)=>{const y=i*(rh+6);s+='<rect x="0" y="'+y+'" width="'+w+'" height="'+rh+'" rx="7" fill="'+r[2]+'" opacity=".16" stroke="'+r[2]+'"/>'+RD.t(10,y+16,r[0],{fs:12.5,w:600});
      const words=r[1].split(' ');let line='',ly=y+31,maxc=Math.floor((w-20)/6.1);words.forEach(wd=>{if((line+' '+wd).length>maxc){s+=RD.t(10,ly,RD.esc(line.trim()),{fs:11,fill:'var(--mute)'});ly+=13;line=wd}else line+=' '+wd});s+=RD.t(10,ly,RD.esc(line.trim()),{fs:11,fill:'var(--mute)'})});
    lf.innerHTML=RD.svg(w,rows.length*(rh+6),s,'The three SSH layers on TCP')}
  layers();RD.onResize(layers);RD.onRender(layers);
  // forwarding directions
  const ff=document.getElementById('fwd-fig');
  function fwd(){const w=Math.min(RD.width(ff),760),narrow=w<520;const rows=[['-L','laptop:30988','node: 127.0.0.1:8888','var(--c1)','listener on the laptop; the server connects onward'],['-D','laptop:30989 (SOCKS)','any host:port the server can reach','var(--c3)','one listener, destination chosen per request'],['-R','server:30991','laptop: 127.0.0.1:30990','var(--c2)','listener on the server; your laptop connects onward']];
    const rh=narrow?70:46;let s='';const x1=8,x2=w-8;rows.forEach((r,i)=>{const y=i*rh+18;const xa=narrow?x1:x1+30,xb=x2;
      s+=RD.t(x1,y+4,r[0],{fs:13,w:600,fill:r[3]});
      const sx=narrow?x1+28:x1+34;s+='<line x1="'+sx+'" y1="'+y+'" x2="'+(xb-4)+'" y2="'+y+'" stroke="'+r[3]+'" stroke-width="3"/><path d="M'+(xb-4)+' '+(y-5)+' L'+(xb+2)+' '+y+' L'+(xb-4)+' '+(y+5)+'Z" fill="'+r[3]+'"/>';
      s+=RD.t(sx,y-6,'listens: '+r[1],{fs:11});s+=RD.t(xb-2,y+16,'connects to: '+r[2],{fs:11,a:'end'});s+=RD.t(sx,y+(narrow?30:16),narrow?r[4].slice(0,48):'',{fs:10.5,fill:'var(--mute)'})});
    ff.innerHTML=RD.svg(w,rows.length*rh+8,s,'Directions of SSH port forwarding')}
  fwd();RD.onResize(fwd);RD.onRender(fwd);
})();
