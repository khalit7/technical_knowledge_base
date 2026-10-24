// ---- Reading: static annotated figures (hero stacks, VMs against containers, a VM exit, the IOMMU, GPU sharing, GSP, image against host) ----
// Every figure is drawn at the container's measured width and redrawn on resize; text wraps by measured characters, never scaled down.
(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // wrap a string into lines that fit maxPx at font size fs (approximate glyph width)
  function wrap(s,maxPx,fs,bold){const cw=fs*(bold?0.6:0.55),n=Math.max(6,Math.floor(maxPx/cw));const out=[];let cur='';
    String(s).split(' ').forEach(w=>{if(!cur)cur=w;else if((cur+' '+w).length<=n)cur+=' '+w;else{out.push(cur);cur=w}});if(cur)out.push(cur);return out}
  function tl(x,y,lines,o){o=o||{};const fs=o.fs||11.5,lh=o.lh||fs*1.3;return lines.map((l,i)=>'<text x="'+x+'" y="'+(y+i*lh)+'" font-size="'+fs+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+'>'+esc(l)+'</text>').join('')}
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.r==null?6:o.r)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+(o.op?' fill-opacity="'+o.op+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.col||'var(--mute)')+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  function arrow(x1,y1,x2,y2,o){o=o||{};const col=o.col||'var(--acc)',a=Math.atan2(y2-y1,x2-x1),h=7;
    return line(x1,y1,x2-Math.cos(a)*h*0.8,y2-Math.sin(a)*h*0.8,{col,sw:o.sw||2.2,dash:o.dash})+'<polygon points="'+x2+','+y2+' '+(x2-h*Math.cos(a-0.45))+','+(y2-h*Math.sin(a-0.45))+' '+(x2-h*Math.cos(a+0.45))+','+(y2-h*Math.sin(a+0.45))+'" fill="'+col+'"/>'}
  const svg=(w,h,b,lab)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(lab)+'">'+b+'</svg>';

  // rows of boxes with marks between them. spec: {title, rows:[[cell]], marks:[{after, text, kind}], hot:{from,to,label}}
  // cell: {t, sub, err, col, hl}; kind: cross (a boundary crossing), bound (the isolation boundary), group (a heading)
  function rows(el,sp){if(!el)return;const W=RD.width(el),narrow=W<430,gut=sp.hot?34:0,bw=W-gut-2,x0=1;let y=2,b='';
    if(sp.title){const L=wrap(sp.title,W-4,12.5,true);b+=tl(2,y+13,L,{fs:12.5,w:600});y+=L.length*16+6}
    const ys=[];
    const markAt=i=>sp.marks?sp.marks.filter(m=>m.after===i):[];
    function marks(i){markAt(i).forEach(m=>{
      if(m.kind==='group'){const L=wrap(m.text,bw-4,11.5,true);b+=tl(x0+2,y+12,L,{fs:11.5,w:600,fill:'var(--mute)'});y+=L.length*15+4;return}
      const L=wrap(m.text,bw-24,11.5);const h=L.length*15+8,col=m.kind==='bound'?'var(--bad)':'var(--mute)';
      b+=line(x0,y+h/2,x0+bw,y+h/2,{col,dash:'5 4',sw:m.kind==='bound'?2:1.3});
      b+=rect(x0+10,y+1,Math.min(bw-20,Math.max(...L.map(l=>l.length))*11.5*0.55+12),h-2,{fill:'var(--bg)',stroke:'none',r:3});
      b+=tl(x0+16,y+15,L,{fs:11.5,fill:m.kind==='bound'?'var(--bad)':'var(--ink)',w:m.kind==='bound'?600:null});y+=h+2})}
    marks(-1);
    sp.rows.forEach((r,i)=>{const n=r.length,gap=6,cw=(bw-gap*(n-1))/n;let hmax=0;const cells=r.map((c,k)=>{
        const tx=cw-18,T=wrap(c.t,tx,12.5,true),S=c.sub?wrap(c.sub,tx,11.5):[];let E=[];
        const errSide=c.err&&!narrow&&n===1&&W>620;if(c.err)E=wrap(c.err,errSide?Math.min(230,W*0.34):tx,11.5);
        const tw=errSide?tx-Math.min(230,W*0.34)-10:tx;const T2=errSide?wrap(c.t,tw,12.5,true):T,S2=errSide&&c.sub?wrap(c.sub,tw,11.5):S;
        const h=10+T2.length*16+S2.length*14.5+(E.length&&!errSide?E.length*14.5+2:0)+4;const hh=errSide?Math.max(h,10+E.length*14.5+6):h;hmax=Math.max(hmax,hh);return {c,T:T2,S:S2,E,errSide,x:x0+k*(cw+gap)}});
      ys.push([y,y+hmax]);
      cells.forEach(o=>{const c=o.c;b+=rect(o.x,y,cw,hmax,{fill:c.hl?'var(--acc2)':'var(--soft)',stroke:c.hl?'var(--acc)':'var(--line)',dash:c.dashed?'4 3':null});
        b+='<rect x="'+o.x+'" y="'+y+'" width="4" height="'+hmax+'" fill="'+(c.col||'var(--c1)')+'"/>';
        let yy=y+16;b+=tl(o.x+12,yy,o.T,{fs:12.5,w:600});yy+=o.T.length*16-2;
        if(o.S.length){b+=tl(o.x+12,yy,o.S,{fs:11.5,fill:'var(--mute)'});yy+=o.S.length*14.5}
        if(o.E.length){if(o.errSide){const ex=o.x+cw-Math.min(230,W*0.34)-6;b+=tl(ex,y+16,o.E,{fs:11.5,fill:'var(--bad)',w:600})}else b+=tl(o.x+12,yy+1,o.E,{fs:11.5,fill:'var(--bad)',w:600})}});
      y+=hmax+4;marks(i);y+=2});
    if(sp.hot&&ys.length){const h=sp.hot,ya=ys[h.from][0]+6,yb=ys[h.to][1]-2,xa=W-gut/2;
      b+=arrow(xa,ya,xa,yb,{col:'var(--acc)',sw:3});
      const my=(ya+yb)/2;b+='<text x="'+(xa-6)+'" y="'+my+'" font-size="11.5" font-weight="600" fill="var(--acc)" text-anchor="middle" transform="rotate(-90 '+(xa-6)+' '+my+')">'+esc(h.label)+'</text>'}
    el.innerHTML=svg(W,y+4,b,sp.label||sp.title||'diagram')}

  const F={};
  F.heroV=()=>rows($('fg-hero-v'),{title:'The VM: a whole kernel as a guest',label:'Virtualization stack: process, guest kernel, hypervisor, CPU, with VM exits as the only crossing',
    rows:[[{t:'Your process (EL0)',sub:'a container on the guest kernel',col:'var(--c1)'}],[{t:'Guest kernel (EL1)',sub:'Linux 5.10: virtio devices, a GICv2, a timer',col:'var(--c1)'}],
      [{t:'Hypervisor (EL2, plus QEMU)',sub:'Hypervisor.framework and QEMU 5.2; in a cloud KVM or Nitro',col:'var(--c2)'}],[{t:'CPU and memory',sub:'M1 Pro: EL2 and stage-2 page tables',col:'var(--c3)'}]],
    marks:[{after:1,text:'VM exit: device register, idle, interrupt (0.92 µs)',kind:'cross'}],hot:{from:0,to:3,label:'runs directly'}});
  F.heroC=()=>rows($('fg-hero-c'),{title:'One CUDA call: the driver in three parts',label:'GPU driver stack: PyTorch, CUDA runtime, user-mode driver, kernel driver, GSP firmware, GPU',
    rows:[[{t:'PyTorch',sub:'y = x @ w picks a cuBLAS kernel',col:'var(--c1)'}],[{t:'CUDA runtime libcudart.so.13',sub:'from your image or wheel',col:'var(--c4)'}],
      [{t:'User-mode driver libcuda.so.1',sub:'from the host; builds command buffers',col:'var(--c4)'}],[{t:'Kernel driver nvidia.ko',sub:'ioctls on /dev/nvidia*',col:'var(--c2)'}],
      [{t:'GSP firmware (GSP-RM)',sub:'resource manager on the GPU, Turing and later',col:'var(--c5)'}],[{t:'GPU engines',sub:'fetch commands by DMA',col:'var(--c3)'}]],
    marks:[{after:2,text:'ioctl: start-up, allocation, errors',kind:'cross'},{after:3,text:'RPC to the GSP',kind:'cross'}],hot:{from:2,to:5,label:'launch: stores + doorbell'}});
  F.vmctC=()=>rows($('fg-vmct-c'),{title:'Containers: one kernel for all',label:'Containers share one host kernel',
    rows:[[{t:'Job A',col:'var(--c1)'},{t:'Job B',col:'var(--c4)'}],[{t:'One host kernel',sub:'namespaces and cgroups keep A and B apart',col:'var(--c2)'}],[{t:'Hardware',col:'var(--c3)'}]],
    marks:[{after:0,text:'boundary: the kernel\'s own checks; a kernel bug reaches both',kind:'bound'}]});
  F.vmctV=()=>rows($('fg-vmct-v'),{title:'VMs: a kernel each',label:'VMs each have their own kernel on a hypervisor',
    rows:[[{t:'Job A',col:'var(--c1)'},{t:'Job B',col:'var(--c4)'}],[{t:'Guest kernel A',col:'var(--c1)'},{t:'Guest kernel B',col:'var(--c4)'}],[{t:'Hypervisor',sub:'KVM, Nitro, Hypervisor.framework',col:'var(--c2)'}],[{t:'Hardware',col:'var(--c3)'}]],
    marks:[{after:1,text:'boundary: the CPU\'s virtualization hardware (EL2, VT-x)',kind:'bound'}]});
  F.gspOff=()=>rows($('fg-gsp-off'),{title:'GSP off: the resource manager on the CPU',label:'With GSP disabled the resource manager runs in nvidia.ko on the CPU',
    rows:[[{t:'libcuda.so.1',col:'var(--c4)'}],[{t:'nvidia.ko with the resource manager',sub:'objects, memory, channels: on the host CPU',col:'var(--c2)',hl:1}],[{t:'GPU engines',col:'var(--c3)'}]],
    marks:[{after:0,text:'ioctl',kind:'cross'},{after:1,text:'register writes over PCIe',kind:'cross'}]});
  F.gspOn=()=>rows($('fg-gsp-on'),{title:'GSP on (the default): the resource manager on the GPU',label:'With GSP the kernel module forwards resource-manager calls to firmware on the GPU',
    rows:[[{t:'libcuda.so.1',col:'var(--c4)'}],[{t:'nvidia.ko, a thinner layer',sub:'boots the firmware, forwards calls',col:'var(--c2)'}],[{t:'GSP-RM firmware',sub:'gsp_*.bin, on the GPU\'s own processor',col:'var(--c5)',hl:1}],[{t:'GPU engines',col:'var(--c3)'}]],
    marks:[{after:0,text:'ioctl',kind:'cross'},{after:1,text:'RPC through shared message queues',kind:'cross'}]});
  F.img=()=>rows($('fg-img'),{label:'What a GPU container gets from its image and from the host, with the error each missing piece causes',
    rows:[[{t:'PyTorch and the CUDA runtime libcudart.so.13',sub:'torch.version.cuda says which',col:'var(--c1)'}],
      [{t:'Optional: cuda-compat, a newer libcuda',sub:'forward compatibility, data-centre GPUs only',col:'var(--c1)',dashed:1}],
      [{t:'libcuda.so.1, the host\'s user-mode driver',sub:'bind-mounted; the toolkit\'s stub must never be found instead',err:'missing: error 35 (case 1); stub: error 34 (case 2)',col:'var(--c4)'}],
      [{t:'/dev/nvidiactl, /dev/nvidia0, /dev/nvidia-uvm',sub:'and a device cgroup that allows major 195',err:'absent or forbidden: error 100, EPERM (case 3)',col:'var(--c4)'}],
      [{t:'nvidia.ko and the GSP firmware',sub:'the same version as libcuda',err:'no module: error 100, ENXIO (case 4); versions differ: "NVRM: API mismatch"',col:'var(--c2)'}]],
    marks:[{after:-1,text:'From your image',kind:'group'},{after:1,text:'From the host, lent by the NVIDIA Container Toolkit',kind:'group'},{after:3,text:'In the host kernel',kind:'group'}]});

  // a VM exit against a system call: privilege levels over time
  F.exit=()=>{const el=$('fg-exit');if(!el)return;const W=RD.width(el),lx=narrowW(W)?34:110,top=8,lh=34,R=W-6;let b='';
    const lanes=[['EL0','your process'],['EL1','guest kernel'],['EL2','hypervisor']];
    lanes.forEach((l,i)=>{const y=top+i*lh;b+=rect(lx,y,R-lx,lh-6,{fill:i===2?'var(--soft)':'var(--bg)',r:4});b+=tl(4,y+18,[l[0]],{fs:12,w:600});if(!narrowW(W))b+=tl(36,y+18,[l[1]],{fs:11.5,fill:'var(--mute)'})});
    const X=f=>lx+(R-lx)*f,Y=i=>top+i*lh+(lh-6)/2;
    const P=[[0,0],[0.14,0],[0.14,1],[0.24,1],[0.24,0],[0.42,0],[0.42,1],[0.56,1],[0.56,2],[0.76,2],[0.76,1],[0.86,1],[0.86,0],[1,0]];
    let d='';P.forEach((p,i)=>{d+=(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)});
    b+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="3" stroke-linejoin="round"/>';
    b+='<rect x="'+X(0.56)+'" y="'+(Y(2)-9)+'" width="'+(X(0.76)-X(0.56))+'" height="18" fill="var(--bad)" fill-opacity=".18" stroke="var(--bad)"/>';
    let y=top+3*lh+6;const half=(R-lx)/2-6;
    const A=wrap('1. getpid(): EL0 to EL1 and back. No exit, the same as bare metal.',narrowW(W)?R-lx:half,11.5),B=wrap('2. The guest driver stores to a device register: VM exit to EL2, the hypervisor emulates the device, resume. 0.92 µs measured.',narrowW(W)?R-lx:half,11.5);
    if(narrowW(W)){b+=tl(lx,y+12,A,{fs:11.5});y+=A.length*15+4;b+=tl(lx,y+12,B,{fs:11.5,fill:'var(--bad)'});y+=B.length*15}
    else{b+=tl(lx,y+12,A,{fs:11.5});b+=tl(lx+half+12,y+12,B,{fs:11.5,fill:'var(--bad)'});y+=Math.max(A.length,B.length)*15}
    b+=tl(lx,y+16,['time →'],{fs:11,fill:'var(--mute)'});
    el.innerHTML=svg(W,y+22,b,'Privilege levels over time: a system call stays in the guest, an MMIO store exits to the hypervisor')};
  const narrowW=W=>W<470;

  // the IOMMU: one DMA allowed, one blocked
  F.iommu=()=>{const el=$('fg-iommu');if(!el)return;const W=RD.width(el),bw=Math.min(W-4,560),x=(W-bw)/2;let b='',y=2;
    const box=(t,s,col,hl)=>{const T=wrap(t,bw-20,12.5,true),S=s?wrap(s,bw-20,11.5):[];const h=12+T.length*16+S.length*14.5;b+=rect(x,y,bw,h,{fill:hl?'var(--acc2)':'var(--soft)',stroke:hl?'var(--acc)':'var(--line)'});b+='<rect x="'+x+'" y="'+y+'" width="4" height="'+h+'" fill="'+col+'"/>';b+=tl(x+12,y+17,T,{fs:12.5,w:600});b+=tl(x+12,y+17+T.length*16,S,{fs:11.5,fill:'var(--mute)'});y+=h};
    box('GPU, passed through to VM A','the guest driver gave it guest-physical addresses','var(--c3)');
    b+=arrow(x+bw*0.3,y+2,x+bw*0.3,y+30,{col:'var(--acc)'});b+=arrow(x+bw*0.72,y+2,x+bw*0.72,y+30,{col:'var(--bad)',dash:'5 4'});
    b+=tl(x+bw*0.3+8,y+20,['DMA to 0x1000'],{fs:11.5,fill:'var(--acc)',w:600});b+=tl(x+bw*0.72+8,y+20,['DMA to 0x9000'],{fs:11.5,fill:'var(--bad)',w:600});y+=34;
    box('IOMMU: the page table of VM A\'s domain','0x1000 maps to a host page of VM A; 0x9000 has no entry, so that DMA is blocked','var(--c2)',1);
    b+=arrow(x+bw*0.3,y+2,x+bw*0.3,y+30,{col:'var(--acc)'});const bx=x+bw*0.72;b+=line(bx-8,y+8,bx+8,y+24,{col:'var(--bad)',sw:2.5})+line(bx+8,y+8,bx-8,y+24,{col:'var(--bad)',sw:2.5});y+=34;
    const n=narrowW(W)?8:12,cw=bw/n,own=['A','B','host','A','B','A','host','B','A','B','host','A'];b+=tl(x,y+12,['Host RAM, page by page'],{fs:11.5,fill:'var(--mute)'});y+=18;
    for(let k=0;k<n;k++){const o=own[k],hit=k===Math.min(n-1,Math.round((bw*0.3)/cw-0.5));b+=rect(x+k*cw+1,y,cw-2,28,{r:3,fill:o==='A'?'color-mix(in srgb,var(--c1) 28%,var(--bg))':o==='B'?'color-mix(in srgb,var(--c4) 28%,var(--bg))':'var(--soft)',stroke:hit?'var(--acc)':'var(--line)',sw:hit?2.5:1});b+=tl(x+k*cw+cw/2,y+18,[o],{fs:11.5,a:'middle',w:600})}
    y+=34;b+=tl(x,y+12,wrap('A: pages backing VM A; B: another guest\'s; host: the hypervisor\'s own. Addresses illustrative.',bw,11.5),{fs:11.5,fill:'var(--mute)'});y+=30;
    el.innerHTML=svg(W,y,b,'The IOMMU translates a passed-through GPU\'s DMA into VM A\'s pages and blocks addresses outside them')};

  // three ways to share a GPU: SMs over time, memory below
  function sharePanel(id,kind){const el=$(id);if(!el)return;const W=RD.width(el),pw=W-4,x=2;let b='',y=2;
    const T={t:'Time slicing',m:'MPS',g:'MIG'}[kind],sub={t:'one context at a time',m:'both at once, merged',g:'separate hardware'}[kind];
    b+=tl(x,y+14,[T],{fs:13,w:600});b+=tl(x,y+30,wrap(sub,pw,11.5),{fs:11.5,fill:'var(--mute)'});y+=40;
    const gh=84,cA='color-mix(in srgb,var(--c1) 55%,var(--bg))',cB='color-mix(in srgb,var(--c4) 55%,var(--bg))';
    b+=rect(x,y,pw,gh,{fill:'var(--bg)',r:4});
    if(kind==='t'){const n=6,w=pw/n;for(let k=0;k<n;k++){b+=rect(x+k*w+1,y+2,w-2,gh-4,{r:3,fill:k%2?cB:cA,stroke:'none'});b+=tl(x+k*w+w/2,y+gh/2+4,[k%2?'B':'A'],{fs:12,a:'middle',w:600})}}
    else if(kind==='m'){const n=6,w=pw/n,sp=[0.6,0.45,0.7,0.5,0.35,0.6];for(let k=0;k<n;k++){const ha=(gh-4)*sp[k];b+=rect(x+k*w+1,y+2,w-2,ha,{r:2,fill:cA,stroke:'none'});b+=rect(x+k*w+1,y+2+ha,w-2,gh-4-ha,{r:2,fill:cB,stroke:'none'})}
      b+=tl(x+8,y+16,['A'],{fs:12,w:600});b+=tl(x+8,y+gh-8,['B'],{fs:12,w:600})}
    else{const ha=(gh-4)*4/7;b+=rect(x+1,y+2,pw-2,ha-1,{r:3,fill:cA,stroke:'none'});b+=rect(x+1,y+2+ha+1,pw-2,gh-5-ha,{r:3,fill:cB,stroke:'none'});b+=line(x,y+2+ha,x+pw,y+2+ha,{col:'var(--ink)',sw:2});
      b+=tl(x+8,y+2+ha/2+4,['A: 4 of 7 compute slices'],{fs:11.5,w:600});b+=tl(x+8,y+2+ha+(gh-4-ha)/2+5,['B: 3 of 7'],{fs:11.5,w:600})}
    b+=tl(x,y-4+gh+18,['SMs (up) over time (across)'],{fs:11,fill:'var(--mute)'});y+=gh+24;
    const mh=26;
    if(kind==='g'){const w1=pw*4/8;b+=rect(x,y,w1-2,mh,{r:3,fill:cA,stroke:'none'});b+=rect(x+w1+2,y,pw-w1-2,mh,{r:3,fill:cB,stroke:'none'});b+=tl(x+6,y+17,['A memory'],{fs:11.5,w:600});b+=tl(x+w1+8,y+17,['B memory'],{fs:11.5,w:600})}
    else{b+=rect(x,y,pw,mh,{r:3,fill:'var(--soft)'});b+=tl(x+6,y+17,[kind==='t'?'one pool: A and B mixed':'one pool, separate address spaces'],{fs:11.5,w:600})}
    y+=mh+4;const iso={t:'no memory limit, no fault isolation',m:'shared bandwidth; no full error isolation',g:'own memory, bandwidth and faults'}[kind];
    b+=tl(x,y+12,wrap(iso,pw,11.5),{fs:11.5,fill:kind==='g'?'var(--good)':'var(--bad)',w:600});y+=wrap(iso,pw,11.5).length*15+4;
    el.innerHTML=svg(W,y,b,T+': how jobs A and B share the GPU\'s SMs and memory')}
  F.share=()=>{sharePanel('fg-share-t','t');sharePanel('fg-share-m','m');sharePanel('fg-share-g','g')};

  const all=()=>Object.values(F).forEach(f=>{try{f()}catch(e){console.error(e)}});
  RD.onRender(all);RD.onResize(all);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);else all();
})();
