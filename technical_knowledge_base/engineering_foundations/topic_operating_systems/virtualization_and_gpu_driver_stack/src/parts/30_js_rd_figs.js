// ---- Reading: static annotated figures (VMs against containers, GSP off and on, image against host); the hero, the exit, the IOMMU and GPU sharing are 3D stages since 2026-11-07 ----
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


  const all=()=>Object.values(F).forEach(f=>{try{f()}catch(e){console.error(e)}});
  RD.onRender(all);RD.onResize(all);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',all);else all();
})();
