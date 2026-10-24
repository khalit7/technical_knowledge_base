// ---- Reading: static annotated figures (hero, namespaces, cgroup rule, user namespace, the three gates, runtimes, sandboxes, GPUs) ----
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

  // ---- Hero: a container is processes on the shared kernel, with four restrictions ----
  draw('ct-hero',el=>{
    const W=Math.min(RD.width(el),920),nar=W<620,aw=nar?W:Math.round(W*0.64),bx=aw+12,bw=W-bx;
    let s=defs('ct-ah-h'),y=0;
    const rowsA=[['SEE','namespaces: its own PID numbers, mount table, network stack, hostname, IPC, user IDs, cgroup path and clocks (sections 1 to 3)'],
      ['USE','cgroup v2: memory.max, cpu.max, io.max and pids.max cap the whole group, workers included (sections 4, 5)'],
      ['HAVE','an image: read-only layers plus one writable layer, merged by overlayfs into its / (section 3)']];
    const rowsB=[['SEE','its own namespaces'],['USE','its own cgroup'],['HAVE','its own image']];
    function container(x,w,title,pills,rows,dim){let t='',yy=y+8;
      t+=T(x+8,yy+12,title,{w:700,fs:12});yy+=22;
      const pw=Math.min(190,(w-24)/pills.length);
      pills.forEach((p,i)=>{t+=rect(x+8+i*(pw+8),yy,pw,24,{fill:'var(--bg)',stroke:'var(--ink)',rx:12})+T(x+8+i*(pw+8)+pw/2,yy+16,p,{a:'middle',fs:11})});yy+=32;
      rows.forEach(r=>{const tag=nar||dim?44:52;const b=para(x+8+tag,yy+16,r[1],w-24-tag,{fill:'var(--ink)'});const h=Math.max(26,b.h+12);
        t+=rect(x+8,yy,w-16,h,{fill:'var(--bg)'})+T(x+14,yy+16,r[0],{w:700,fill:'var(--acc)',fs:11.5})+b.s;yy+=h+5});
      return {t,h:yy-y+4}}
    const A=container(0,aw,'container A: a training job',nar?['python train.py','2 workers']:['python train.py (PID 1 inside)','2 DataLoader workers'],rowsA);
    let B=null;if(!nar)B=container(bx,bw,'container B: a notebook',['jupyter'],rowsB,true);
    const H=Math.max(A.h,B?B.h:0);
    s+=rect(0,y,aw,H,{fill:'none',stroke:'var(--acc)',sw:1.8})+A.t;
    if(B)s+=rect(bx,y,bw,H,{fill:'none',stroke:'var(--acc)',sw:1.2,dash:'5 4'})+B.t;
    y+=H;
    // system calls down through the gate
    const gy=y+26;
    [aw*0.3,aw*0.7].concat(B?[bx+bw/2]:[]).forEach(x=>{s+=arrow(x,y+2,x,gy-2,'ct-ah-h')});
    s+=T(aw*0.3+8,y+17,'system calls',{fill:'var(--mute)'});
    const g=card(0,gy,W,'DO: capabilities, seccomp, LSM','checked on each system call before the kernel acts (sections 6 to 8)',{fill:'var(--acc2)',stroke:'var(--acc)',hfill:'var(--acc)',bfill:'var(--ink)'});
    s+=g.s;y=gy+g.h;
    const ky=y+22;[W*0.3,W*0.7].forEach(x=>{s+=arrow(x,y+2,x,ky-2,'ct-ah-h')});
    const k=card(0,ky,W,'one host Linux kernel, shared by every container','no second kernel in between: a kernel bug reachable through an allowed call is a way out, so hostile code needs a sandbox (section 10)',{fill:'var(--soft)',stroke:'var(--ink)',sw:1.4});
    s+=k.s;y=ky+k.h+2;
    el.innerHTML=RD.svg(W,Math.ceil(y),s,'A container: processes in namespaces and a cgroup, with an image as root, making system calls through capability, seccomp and LSM checks into the one shared host kernel');
  });

  // ---- Section 1: the nsproxy pointers before and after, real inode numbers ----
  draw('ct-ns',el=>{
    const W=Math.min(RD.width(el),640),m0=D.mini[0].kv,m8=D.mini[8].kv;
    const kinds=[['mnt','mount'],['uts','UTS'],['ipc','IPC'],['pid','PID'],['net','network'],['cgroup','cgroup'],['user','user'],['time','time']];
    const lc=W<420?64:86,cw=(W-lc-8)/2,rh=26;let s='',y=0;
    const h1=para(lc,y+12,'outer process (step 0)',cw-6,{w:600}),h2=para(lc+cw+8,y+12,'inside the built container (step 8)',cw-6,{w:600});
    s+=h1.s+h2.s+T(2,y+12,'nsproxy',{w:600,fill:'var(--mute)'});y+=Math.max(h1.h,h2.h)+6;
    let shared=0;
    kinds.forEach(([k,lab])=>{const a=m0['ns_'+k],b=m8['ns_'+k];s+=T(2,y+17,lab,{});
      if(a===b){shared++;s+=rect(lc,y,2*cw+8,rh-4,{fill:'var(--soft)'})+T(lc+cw+4,y+15,a+'  shared',{a:'middle',fill:'var(--mute)'})}
      else{s+=rect(lc,y,cw,rh-4,{fill:'var(--bg)'})+T(lc+cw/2,y+15,a,{a:'middle',fill:'var(--mute)'})+rect(lc+cw+8,y,cw,rh-4,{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.4})+T(lc+cw+8+cw/2,y+15,b,{a:'middle',w:600})}
      y+=rh});
    el.innerHTML=RD.svg(W,y,s,'Namespace inode numbers of the outer process and of the built container: six differ, user and time are shared');
    const n=$('ct-ns-n');if(n)n.textContent=(kinds.length-shared)+' of '+kinds.length;
  });

  // ---- Section 4: the no-internal-processes rule, before and after (measured) ----
  draw('ct-cg',el=>{
    const W=Math.min(RD.width(el),860),nar=W<600,pw=nar?W:(W-14)/2;let s=defs('ct-ah-c');
    function panel(x,y0,title,ok){let t='',y=y0;const hd=para(x,y+12,title,pw,{w:700,fill:ok?'var(--good)':'var(--bad)'});t+=hd.s;y+=hd.h+6;
      const r=card(x,y,pw,'/ (the container\'s cgroup)',ok?'cgroup.procs: empty. subtree_control: cpu io memory pids':'cgroup.procs: 4 processes. subtree_control: empty',{fill:'var(--bg)',stroke:ok?'var(--good)':'var(--bad)',sw:1.4});t+=r.s;y+=r.h;
      if(ok){const cx=x+pw*0.18,cy=y+18;t+='<line x1="'+Math.round(cx)+'" y1="'+Math.round(y)+'" x2="'+Math.round(cx)+'" y2="'+Math.round(cy+12)+'" stroke="var(--line)"/>';
        const c=card(x+pw*0.12,cy,pw*0.88,'init/ (a leaf)','the 4 processes, moved here first; it now has memory.*, pids.*, io.*, cpu.* files',{fill:'var(--soft)'});t+=c.s;y=cy+c.h}
      const w=para(x,y+18,ok?'echo "+memory +pids +io +cpu" > cgroup.subtree_control: accepted':'echo +memory > cgroup.subtree_control: write error, Device or resource busy (EBUSY)',pw,{fill:ok?'var(--good)':'var(--bad)',w:600});t+=w.s;y+=18+w.h;
      return {t,h:y-y0}}
    const a=panel(0,0,'Before: processes in the parent',false),b=panel(nar?0:pw+14,nar?a.h+16:0,'After: processes in a leaf',true);
    s+=a.t+b.t;const H=nar?a.h+16+b.h:Math.max(a.h,b.h);
    el.innerHTML=RD.svg(W,Math.ceil(H+4),s,'Enabling the memory controller fails while the cgroup holds processes and succeeds after they move into a child');
  });

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

  // ---- Section 7: three gates on every system call, four measured calls ----
  draw('ct-gate',el=>{
    const W=Math.min(RD.width(el),820),nar=W<480,lc=nar?58:150,cw=(W-lc)/4;let s='',y=0;
    const calls=nar?[['getpid','root'],['nice -5','root'],['perf_event _open','root'],['cat /etc /shadow','userns root']]:[['getpid','root, defaults'],['nice -5','root, defaults'],['perf_event_open','root, defaults'],['cat /etc/shadow','root of a user ns']];
    const st=nar?[['1 seccomp',''],['2 capa- bility',''],['3 object','']]:[['1 at entry','seccomp filter: the call number and argument values'],['2 in the kernel code','capability check: capable(CAP_...)'],['3 at the object','file permissions and LSM hooks, on the resolved file']];
    // result per call per stage: p pass, x stopped (text), - not reached
    const R=nar?[[['p'],['p'],['p']],[['p'],['x','no CAP_SYS_ NICE'],['-']],[['x','EPERM, not allowed'],['-'],['-']],[['p','(unconfined)'],['p','own ns only'],['x','EACCES, real root\'s file']]]:[[['p'],['p'],['p']],[['p'],['x','Permission denied: no CAP_SYS_NICE'],['-']],[['x','EPERM: not in Docker\'s allowlist'],['-'],['-']],[['p','(that run: unconfined)'],['p','all caps, but only over its own namespace'],['x','Permission denied: owned by the real root']]];
    calls.forEach((c,i)=>{const a=para(lc+i*cw+cw/2,y+12,c[0],cw-6,{a:'middle',w:700}),b=para(lc+i*cw+cw/2,y+12+a.h,c[1],cw-6,{a:'middle',fill:'var(--mute)'});s+=a.s+b.s;
      R[i].hy=a.h+b.h});
    y+=Math.max(...R.map(r=>r.hy))+8;
    st.forEach((g,j)=>{const lab=para(0,y+14,g[0],lc-6,{w:700,fill:'var(--acc)'}),sub=g[1]?para(0,y+14+lab.h,g[1],lc-6,{fill:'var(--mute)'}):{s:'',h:0};
      let h=lab.h+sub.h+8;const cells=R.map((r,i)=>{const v=r[j],x=lc+i*cw+3,w=cw-6;
        const t=v[0]==='p'?'passes':v[0]==='x'?'stopped':(nar?'-':'not reached');const sub2=v[1]?para(x+w/2,y+30,v[1],w-6,{a:'middle',fill:v[0]==='x'?'var(--bad)':'var(--mute)'}):{s:'',h:0};
        h=Math.max(h,sub2.h+28);return {x,w,t,v:v[0],sub2}});
      s+=lab.s+sub.s;
      cells.forEach(c=>{s+=rect(c.x,y+2,c.w,h-4,{fill:c.v==='x'?'var(--bg)':c.v==='p'?'var(--soft)':'none',stroke:c.v==='x'?'var(--bad)':'var(--line)',sw:c.v==='x'?1.6:1,dash:c.v==='-'?'3 3':''})+
        T(c.x+c.w/2,y+18,c.t,{a:'middle',w:600,fill:c.v==='x'?'var(--bad)':c.v==='p'?'var(--good)':'var(--mute)'})+c.sub2.s});
      y+=h+2});
    el.innerHTML=RD.svg(W,Math.ceil(y),s,'Where four measured calls stop: perf_event_open at the seccomp filter, nice -5 at the capability check, /etc/shadow at the permission check, getpid nowhere');
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

  // ---- Section 10: what untrusted code talks to, three designs ----
  draw('ct-sb',el=>{
    const W=Math.min(RD.width(el),900),nar=W<640,cw=nar?W:(W-24)/3;let s=defs('ct-ah-s'),H=0,y0=0;
    const cols=[['Container (runc)',[['untrusted code',''],['seccomp, capabilities, LSM','about 340 allowed calls'],['the host kernel','every allowed call runs host kernel code',1]]],
      ['gVisor (runsc)',[['untrusted code',''],['the Sentry','a Linux kernel in Go, in user space: every call implemented again',1],['seccomp on the Sentry','a small, enumerated set of host calls'],['the host kernel','']]],
      ['microVM (Firecracker, Kata)',[['untrusted code',''],['a guest Linux kernel','its own, inside the VM'],['KVM, virtio net and block','hardware virtualization',1],['the VMM process','under seccomp and a jailer'],['the host kernel','']]]];
    cols.forEach((c,i)=>{const x=nar?0:i*(cw+12);let y=nar?y0:0;const hd=para(x+cw/2,y+13,c[0],cw,{a:'middle',w:700});s+=hd.s;y+=hd.h+6;
      c[1].forEach((b,j)=>{if(j){s+=arrow(x+cw/2,y,x+cw/2,y+16,'ct-ah-s');y+=18}
        const bx=card(x,y,cw,b[0],b[1]||null,{fill:b[2]?'var(--acc2)':j===0?'var(--bg)':'var(--soft)',stroke:b[2]?'var(--acc)':j===0?'var(--bad)':'var(--line)',sw:b[2]?1.8:1});s+=bx.s;
        if(b[2])s+=T(x+cw-6,y+13,'the boundary',{a:'end',fill:'var(--acc)',w:700,fs:11});y+=bx.h});
      if(nar)y0=y+20;H=Math.max(H,y)});
    el.innerHTML=RD.svg(W,Math.ceil(H+2),s,'A container lets untrusted code call the host kernel directly; gVisor puts a user-space kernel in between; a microVM puts a guest kernel behind hardware virtualization');
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
// ---- Section 3: overlayfs stepper, one image, five operations (times measured in a Docker container) ----
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id);if(!$('ct-ov'))return;
  const T=(x,y,s,o)=>RD.t(Math.round(x),Math.round(y),E(s),o||{});
  const wrapT=(s,w)=>{const n=Math.max(5,Math.floor(w/6.3)),o=[];let c='';s.split(' ').forEach(t=>{if(c&&(c+' '+t).length>n){o.push(c);c=t}else c=c?c+' '+t:t});if(c)o.push(c);return o.slice(0,3)};
  const m=/create a new file: ([\d.]+) ms/.exec(D.image_txt),tnew=m?m[1]:'?';
  const cu=D.copyup;
  // state of the upper layer after each step: lib (none, copy), motd (none, wh), new (none, file)
  const S=[{lib:0,motd:0,nw:0,hl:'',t:'Start',c:'Three read-only layers drawn of the image\'s six; the upper layer is empty. Each name in the merged view comes from the topmost layer that has it.',ms:'',up:'0'},
    {lib:1,motd:0,nw:0,hl:'lib',t:'First 1-byte write to libtorch_cpu.so',c:'Copy-up: overlayfs copies the whole 264 MB file into the upper layer before the write goes ahead. Measured: '+cu[0]+' ms.',ms:cu[0]+' ms',up:'264 MB'},
    {lib:1,motd:0,nw:0,hl:'lib',t:'Second write',c:'The file is already in the upper layer: the write goes to that private copy. Measured: '+cu[1]+' ms.',ms:cu[1]+' ms',up:'264 MB'},
    {lib:1,motd:1,nw:0,hl:'motd',t:'rm /etc/motd',c:'A lower layer cannot change, so overlayfs writes a whiteout (a character device 0, 0) with the same name in the upper layer; the merged view hides it. docker diff shows D /etc/motd.',ms:'',up:'264 MB'},
    {lib:1,motd:1,nw:1,hl:'nw',t:'Create /work/new.txt',c:'A new file goes straight to the upper layer, no copy: '+tnew+' ms. It vanishes with the container: write checkpoints to a volume. docker diff shows A /work/new.txt.',ms:tnew+' ms',up:'264 MB'}];
  function draw(i){
    const st=S[i],el=$('ct-ov'),W=Math.min(RD.width(el),760),nar=W<520,lc=nar?92:200,cw=(W-lc)/3,rh=nar?62:46;
    const cols=nar?['libtorch','motd','new.txt']:['libtorch_cpu.so','/etc/motd','/work/new.txt'];
    const rows=[['merged: the container\'s /','merged'],['upper: writable, this container','upper'],['image layer: venv and PyTorch, 853 MB','venv'],['image layer: Debian base, 139 MB','base']];
    let s='',y=0;
    cols.forEach((c,k)=>{s+=T(lc+k*cw+cw/2,14,c,{a:'middle',w:700})});y=24;
    rows.forEach(([lab,key],r)=>{
      const L=lab.split(': ');s+=T(2,y+18,L[0],{w:700,fill:key==='merged'?'var(--acc)':'var(--ink)'});wrapT(L[1],lc-8).forEach((l,q)=>{s+=T(2,y+32+q*13,l,{fill:'var(--mute)'})});
      s+='<line x1="'+lc+'" x2="'+W+'" y1="'+(y+rh-2)+'" y2="'+(y+rh-2)+'" stroke="var(--line)"'+(key==='merged'?' stroke-width="2"':'')+'/>';
      ['lib','motd','nw'].forEach((f,k)=>{let txt='',sub='',kind='';
        if(key==='venv'&&f==='lib'){txt='file';sub='264 MB'}
        if(key==='base'&&f==='motd'){txt='file';sub=''}
        if(key==='upper'){if(f==='lib'&&st.lib){txt='copy';sub='264 MB';kind='new'}if(f==='motd'&&st.motd){txt='whiteout';sub='c 0, 0';kind='wh'}if(f==='nw'&&st.nw){txt='file';sub='new';kind='new'}}
        if(key==='merged'){if(f==='lib'){txt=st.lib?'from upper':'from venv';sub=''}if(f==='motd'){txt=st.motd?'hidden':'from base';kind=st.motd?'gone':''}if(f==='nw'&&st.nw){txt='from upper'}}
        if(!txt)return;
        const on=st.hl===f&&(key==='upper'||key==='merged'),x=lc+k*cw+4,w=cw-8;
        s+='<rect x="'+Math.round(x)+'" y="'+(y+5)+'" width="'+Math.round(w)+'" height="'+(rh-14)+'" rx="5" fill="'+(on?'var(--hl)':kind==='gone'?'none':'var(--soft)')+'" stroke="'+(on?'var(--acc)':kind==='wh'||kind==='gone'?'var(--bad)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"'+(kind==='gone'?' stroke-dasharray="3 3"':'')+'/>';
        s+=T(x+w/2,y+19,txt,{a:'middle',w:600,fill:kind==='wh'||kind==='gone'?'var(--bad)':'var(--ink)'});if(sub)s+=T(x+w/2,y+33,sub,{a:'middle',fill:'var(--mute)'})});
      y+=rh});
    el.innerHTML=RD.svg(W,y+2,s,'overlayfs layers: merged view, writable upper layer and two read-only image layers for three files');
    $('ct-ov-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+E(st.t)+'</div><p>'+E(st.c)+'</p>';
    $('ct-ov-cnt').innerHTML=RD.stat('this operation',st.ms||'...','measured')+RD.stat('upper layer holds',st.up,'this container only');
  }
  const a=RD.anim({card:'ct-ov-card',ctl:'ct-ov-ctl',n:S.length,draw,ms:1800,label:'overlay step'});
  RD.onResize(()=>a.redraw());
})();
