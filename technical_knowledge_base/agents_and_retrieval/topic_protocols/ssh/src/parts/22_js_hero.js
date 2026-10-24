// ---- Hero: one login to a GPU node behind a bastion. The outer session (laptop to bastion) carries the inner,
// end-to-end session (laptop to node) as one direct-tcpip channel; the inner session carries the channels you use.
// Static annotated diagram, drawn at the measured width: horizontal from 560 px, vertical below.
(function(){
  const el=document.getElementById('hero-fig');if(!el)return;
  const T=RD.t,esc=RD.esc;
  const rect=(x,y,w,h,o)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||8)+'" fill="'+(o.fill||'var(--bg)')+'"'+(o.op!=null?' fill-opacity="'+o.op+'"':'')+' stroke="'+(o.st||'var(--line)')+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="6 4"':'')+'/>';
  // wrap a short phrase into lines of at most n characters
  const wrap=(s,n)=>{const out=[];let l='';s.split(' ').forEach(w=>{if((l+' '+w).trim().length>n&&l){out.push(l);l=w}else l=(l+' '+w).trim()});if(l)out.push(l);return out};
  const lines=(x,y,arr,o)=>arr.map((s,i)=>T(x,y+i*(o.lh||14),esc(s),o)).join('');
  function draw(){
    const w=Math.min(RD.width(el),860);let s='',W,H;
    if(w>=560){
      W=w;H=300;const bw=Math.round(W*0.17),bx=Math.round(W*0.43),bxw=Math.round(W*0.15),nx=Math.round(W*0.83),nw=W-nx;
      // boxes
      s+=rect(0,20,bw,272,{})+rect(bx,20,bxw,272,{})+rect(nx,20,nw,272,{});
      s+=T(bw/2,40,'laptop',{a:'middle',fs:13,w:600})+T(bx+bxw/2,40,'bastion',{a:'middle',fs:13,w:600})+T(nx+nw/2,40,'gpu-node-01',{a:'middle',fs:13,w:600});
      // outer pipe laptop to bastion
      s+=rect(bw,86,bx-bw,124,{fill:'var(--c1)',op:.10,st:'var(--c1)',rx:4});
      s+=T(bw+8,80,'outer SSH session: bastion’s host key, your key',{fs:11,fill:'var(--c1)',w:600});
      // inner pipe laptop to node (drawn across the bastion)
      s+=rect(bw,106,nx-bw,88,{fill:'var(--acc)',op:.16,st:'var(--acc)',sw:2,rx:4});
      s+=T(bw+8,122,'inner SSH session to gpu-node-01, end to end',{fs:11,w:600});
      s+=T(bw+8,136,'(node’s host key checked by the laptop)',{fs:11,fill:'var(--mute)'});
      // channels inside the inner pipe
      const ch=[['shell (session channel)',152],['rsync (session channel)',168],['-L 8888: notebook (direct-tcpip)',184]];
      ch.forEach(c=>{s+='<line x1="'+(bw+6)+'" y1="'+c[1]+'" x2="'+(nx-6)+'" y2="'+c[1]+'" stroke="var(--acc)" stroke-width="1.4"/>'+T(bx+bxw+6,c[1]-3,esc(c[0]),{fs:11})});
      // annotations in the boxes
      s+=lines(bx+6,228,wrap('relays the inner session as one channel; reads none of it',Math.max(12,Math.floor((bxw-10)/6))),{fs:11,fill:'var(--mute)',lh:13});
      s+=lines(6,228,wrap('ControlMaster socket: later commands open channels on this pipe',Math.max(12,Math.floor((bw-10)/6))),{fs:11,fill:'var(--mute)',lh:13});
      s+=lines(nx+6,228,wrap('notebook on 127.0.0.1:8888',Math.max(12,Math.floor((nw-10)/6))),{fs:11,fill:'var(--mute)',lh:13});
      s+=T((bw+bx)/2,232,'TCP 22 via the internet or VPN',{a:'middle',fs:11,fill:'var(--mute)'});
      s+=T((bx+bxw+nx)/2,232,'cluster network',{a:'middle',fs:11,fill:'var(--mute)'});
    }else{
      W=Math.max(300,w);H=470;const lx=W*0.44,rx=W-12;
      s+=rect(0,0,W,52,{})+rect(0,196,W,66,{})+rect(0,410,W,56,{});
      s+=T(8,18,'laptop',{fs:13,w:600})+lines(8,34,wrap('ControlMaster socket: later commands open channels on this pipe',Math.floor((W-16)/6.2)),{fs:11,fill:'var(--mute)',lh:13});
      s+=T(8,214,'bastion',{fs:13,w:600})+lines(8,230,wrap('relays one channel; reads none of it',Math.floor((lx-14)/6.2)),{fs:11,fill:'var(--mute)',lh:13});
      s+=T(8,428,'gpu-node-01',{fs:13,w:600})+T(8,444,'notebook on 127.0.0.1:8888',{fs:11,fill:'var(--mute)'});
      // outer pipe (laptop to bastion), inner pipe (laptop to node) on the right
      s+=rect(4,52,W-8,144,{fill:'var(--c1)',op:.10,st:'var(--c1)',rx:4});
      s+=lines(10,72,wrap('outer SSH session: bastion’s host key, your key',Math.floor((lx-20)/6.2)),{fs:11,fill:'var(--c1)',w:600,lh:13});
      s+=rect(lx,52,rx-lx,358,{fill:'var(--acc)',op:.16,st:'var(--acc)',sw:2,rx:4});
      s+=lines(10,284,wrap('inner SSH session to gpu-node-01, end to end (its host key checked by the laptop)',Math.floor((lx-20)/6.2)),{fs:11,w:600,lh:13});
      const cw=(rx-lx),xs=[lx+cw*0.2,lx+cw*0.5,lx+cw*0.8],nm=['shell','rsync','-L 8888'];
      xs.forEach((x,i)=>{s+='<line x1="'+x+'" y1="56" x2="'+x+'" y2="406" stroke="var(--acc)" stroke-width="1.4"/>'+T(x-4,330+i*18,nm[i],{fs:11,a:'end'})});
      s+=lines(10,150,['TCP 22,','internet or VPN'],{fs:11,fill:'var(--mute)',lh:13});
      s+=T(10,398,'cluster network',{fs:11,fill:'var(--mute)'});
    }
    el.innerHTML=RD.svg(W,H,s,'The outer SSH session from laptop to bastion carries an inner end-to-end session to gpu-node-01, which carries a shell, rsync and a port forward');
  }
  draw();RD.onResize(draw);RD.onRender(draw);
})();
