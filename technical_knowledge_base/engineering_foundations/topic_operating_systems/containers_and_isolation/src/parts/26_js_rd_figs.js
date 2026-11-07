// ---- Reading: static annotated figures (user namespace, runtimes, GPUs) ----
// 2026-11-07: the hero, nsproxy, cgroup rule, three gates, sandboxes and overlay stepper became 3D stages (30a to 30f).
// Every figure is drawn at its container's measured width and redrawn on resize; nothing moves.
// Labels are short; the explaining sentences are in the HTML beside each figure.
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id);
  const T=(x,y,s,o)=>RD.t(Math.round(x),Math.round(y),E(s),o||{});
  function wrap(s,w,fs){const n=Math.max(5,Math.floor(w/((fs||11)*0.57)));const out=[];let cur='';
    String(s).split(' ').forEach(t=>{if(cur&&(cur+' '+t).length>n){out.push(cur);cur=t}else cur=cur?cur+' '+t:t});if(cur)out.push(cur);return out}
  // wrapped lines; returns {s, h}
  function para(x,y,s,w,o){o=o||{};const fs=o.fs||11,lh=o.lh||Math.round(fs*1.34),L=wrap(s,w,fs);
    return {s:L.map((l,i)=>T(x,y+i*lh,l,o)).join(''),h:L.length*lh,n:L.length}}
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+Math.round(x)+'" y="'+Math.round(y)+'" width="'+Math.max(1,Math.round(w))+'" height="'+Math.max(1,Math.round(h))+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.op?' opacity="'+o.op+'"':'')+'/>'};
  const defs=id=>'<defs><marker id="'+id+'" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="var(--mute)"/></marker></defs>';
  const arrow=(x1,y1,x2,y2,id,o)=>{o=o||{};return '<line x1="'+Math.round(x1)+'" y1="'+Math.round(y1)+'" x2="'+Math.round(x2)+'" y2="'+Math.round(y2)+'" stroke="'+(o.stroke||'var(--mute)')+'" stroke-width="'+(o.sw||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+' marker-end="url(#'+id+')"/>'};
  // a box with a bold head and wrapped body; returns {s, h}
  function card(x,y,w,head,body,o){o=o||{};const pad=7;let s='',yy=y+pad+11;
    const hd=head?para(x+pad,yy,head,w-2*pad,{w:700,fs:o.hfs||11.5,fill:o.hfill||'var(--ink)'}):{s:'',h:0};yy+=hd.h;
    const bd=body?para(x+pad,yy+(head?1:0),body,w-2*pad,{fill:o.bfill||'var(--mute)'}):{s:'',h:0};
    const h=Math.max(o.minh||0,pad*2+hd.h+bd.h-3+(head&&body?1:0));
    s+=rect(x,y,w,h,o)+hd.s+bd.s;return {s,h}}
  const draw=(id,f)=>{const el=$(id);if(!el)return;const go=()=>{try{f(el)}catch(e){el.textContent='figure error: '+e.message}};go();RD.onRender(go);RD.onResize(go)};

  // ---- Section 6: one user namespace, two numberings (measured as UID 1000) ----
  draw('ct-uid',el=>{
    const W=Math.min(RD.width(el),760),mid=W<460?66:110,cw=(W-mid)/2;let s=defs('ct-ah-u'),y=0;
    const h1=para(cw/2,14,'inside the user namespace',cw,{a:'middle',w:700});s+=h1.s+T(cw+mid+cw/2,14,'on the host',{a:'middle',w:700});y=h1.h+10;
    const rows=[['the process','uid 0 (root), CapEff: all 41 capabilities','uid 1000, CapEff: none','uid_map 0 1000 1',true],
      ['a file it creates','owner 0','owner 1000','mapped',true],
      ['/etc/shadow','owner 65534 (unmapped, shown as nobody): cat says Permission denied','owner 0, the real root','not mapped',false],
      ['the host\'s hostname','hostname x: must be root','belongs to the host\'s user namespace','not its own',false],
      ['its own new UTS and mount namespaces','hostname set, tmpfs mounted','invisible to the host','owned by it',true]];
    rows.forEach(r=>{const a=card(0,y,cw,r[0],r[1],{fill:r[4]?'var(--acc2)':'var(--bg)',stroke:r[4]?'var(--acc)':'var(--line)'}),b=card(cw+mid,y,cw,null,r[2],{fill:'var(--bg)',bfill:'var(--ink)'});
      const h=Math.max(a.h,b.h);s+=card(0,y,cw,r[0],r[1],{fill:r[4]?'var(--acc2)':'var(--bg)',stroke:r[4]?'var(--acc)':'var(--line)',minh:h}).s+card(cw+mid,y,cw,null,r[2],{fill:'var(--bg)',bfill:'var(--ink)',minh:h}).s;
      const yy=y+h/2,ml=para(cw+mid/2,0,r[3],mid-6,{a:'middle',fill:'var(--mute)'});s+=arrow(cw+4,yy,cw+mid-4,yy,'ct-ah-u',{dash:r[4]?'':'3 3'})+'<g transform="translate(0,'+Math.round(yy-6-ml.h+11)+')">'+ml.s+'</g>';
      y+=h+6});
    el.innerHTML=RD.svg(W,Math.ceil(y),s,'Root inside a user namespace maps to UID 1000 on the host; it has every capability only over its own namespaces');
  });

  // ---- Section 9: who makes the calls ----
  draw('ct-rt',el=>{
    const W=Math.min(RD.width(el),720),nar=W<520;let s=defs('ct-ah-r'),y=0;
    const tw=nar?(W-10)/2:(W-20)/3;
    const a=card(0,y,tw,'docker CLI, dockerd','the REST API',{fill:'var(--bg)'}),b=card(nar?tw+10:W-tw,y,tw,'kubelet','talks CRI (gRPC)',{fill:'var(--bg)'});
    const h0=Math.max(a.h,b.h);s+=card(0,y,tw,'docker CLI, dockerd','the REST API',{fill:'var(--bg)',minh:h0}).s+card(nar?tw+10:W-tw,y,tw,'kubelet','talks CRI (gRPC)',{fill:'var(--bg)',minh:h0}).s;
    y+=h0;const cy=y+24;s+=arrow(tw/2,y+2,W*0.42,cy-2,'ct-ah-r')+arrow((nar?tw+10:W-tw)+tw/2,y+2,W*0.58,cy-2,'ct-ah-r');
    const c=card(W*0.1,cy,W*0.8,'containerd (or CRI-O)','pulls and stores images, unpacks layers into snapshots, writes the OCI bundle: a root file system plus config.json',{fill:'var(--soft)'});s+=c.s;y=cy+c.h;
    const sy=y+24;s+=arrow(W/2,y+2,W/2,sy-2,'ct-ah-r')+T(W/2+8,y+16,'one per container',{fill:'var(--mute)'});
    const sh=card(W*0.1,sy,W*0.8,'containerd-shim-runc-v2','the container\'s parent: holds its stdio, collects its exit status, so containerd can restart without killing it',{fill:'var(--soft)'});s+=sh.s;y=sy+sh.h;
    const ry=y+24,rw=W*0.8;s+=arrow(W/2,y+2,W/2,ry-2,'ct-ah-r');
    const r=card(W*0.1,ry,rw,'runc (or crun, youki)','reads config.json, makes the system calls of section 0, starts the process, then exits',{fill:'none',dash:'5 4'});s+=r.s;y=ry+r.h;
    const py=y+24;s+=arrow(W/2,y+2,W/2,py-2,'ct-ah-r');
    const p=card(W*0.1,py,W*0.8,'your process','PID 1 inside its namespace; a child of the shim on the host',{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.6});s+=p.s;y=py+p.h+2;
    el.innerHTML=RD.svg(W,Math.ceil(y),s,'docker or kubelet call containerd, which starts one shim per container; runc creates the container and exits; the process is the shim child');
  });

  // ---- Section 11: what comes from where in a GPU container ----
  draw('ct-gpu',el=>{
    const W=Math.min(RD.width(el),820),mid=W<480?50:90,cw=(W-mid)/2;let s=defs('ct-ah-g'),y=0;
    s+=T(cw/2,14,'inside the container',{a:'middle',w:700})+T(cw+mid+cw/2,14,'on the host',{a:'middle',w:700});y=24;
    const rows=[['from the image','CUDA runtime (libcudart), cuDNN, PyTorch','',''],
      ['bind-mounted','libcuda.so, libnvidia-ml.so, nvidia-smi','the driver\'s user-space libraries: must match nvidia.ko','mount'],
      ['bind-mounted','/dev/nvidia0, /dev/nvidiactl, /dev/nvidia-uvm','device nodes, character major 195 (and nvidia-uvm\'s own)','mount'],
      ['allowed','a BPF program on the container\'s cgroup lets it open them','runc attaches it (cgroup v2 has no devices.allow file)','attach'],
      ['not in the container','no kernel module of its own','nvidia.ko, loaded in the one host kernel','']];
    rows.forEach(r=>{const a=card(0,y,cw,r[0],r[1],{fill:r[3]?'var(--acc2)':'var(--bg)',stroke:r[3]?'var(--acc)':'var(--line)'});const b=r[2]?card(cw+mid,y,cw,null,r[2],{fill:'var(--soft)',bfill:'var(--ink)'}):{h:0};
      const h=Math.max(a.h,b.h);s+=card(0,y,cw,r[0],r[1],{fill:r[3]?'var(--acc2)':'var(--bg)',stroke:r[3]?'var(--acc)':'var(--line)',minh:h}).s;
      if(r[2])s+=card(cw+mid,y,cw,null,r[2],{fill:'var(--soft)',bfill:'var(--ink)',minh:h}).s;
      if(r[3])s+=arrow(cw+mid-4,y+h/2,cw+4,y+h/2,'ct-ah-g')+T(cw+mid/2,y+h/2-5,r[3],{a:'middle',fill:'var(--mute)'});
      y+=h+6});
    el.innerHTML=RD.svg(W,Math.ceil(y),s,'A GPU container: CUDA runtime from the image; driver libraries and device nodes bind-mounted from the host; a cgroup BPF program allows the devices; the kernel module stays on the host');
  });
})();
