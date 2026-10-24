// ---- Reading figures drawn at the measured width: the hero (allocator stack plus measured RSS against live data),
// glibc's malloc lookup order (section 3) and pymalloc's arena, pools and blocks (section 7). Static: nothing moves.
(function(){
  const $=id=>document.getElementById(id);if(!window.RD)return;
  const AK=window.AK||{};
  // wrap text to a width in px (approximate glyph width 0.56 em)
  const wrap=(s,px,fs)=>{const n=Math.max(6,Math.floor(px/(fs*0.56)));const out=[];let cur='';
    s.split(' ').forEach(w=>{if((cur+' '+w).trim().length>n&&cur){out.push(cur);cur=w}else cur=(cur+' '+w).trim()});if(cur)out.push(cur);return out};
  const T=(x,y,s,o)=>RD.t(x,y,RD.esc(s),o);
  const box=(x,y,w,h,o)=>'<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o&&o.rx!=null?o.rx:6)+'" fill="'+(o&&o.fill||'var(--bg)')+'" stroke="'+(o&&o.stroke||'var(--line)')+'"'+(o&&o.sw?' stroke-width="'+o.sw+'"':'')+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>';
  const arrow=(x1,y1,x2,y2,col,dash)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+col+'" stroke-width="1.4"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
    (function(){const a=Math.atan2(y2-y1,x2-x1),L=6;return '<path d="M'+x2.toFixed(1)+' '+y2.toFixed(1)+' L'+(x2-L*Math.cos(a-0.45)).toFixed(1)+' '+(y2-L*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-L*Math.cos(a+0.45)).toFixed(1)+' '+(y2-L*Math.sin(a+0.45)).toFixed(1)+' Z" fill="'+col+'"/>'})();
  const hatch=id=>'<defs><pattern id="'+id+'" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--bg)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--c2)" stroke-width="1.6"/></pattern></defs>';

  // ---------- hero ----------
  function hero(){const el=$('rd-hero');if(!el)return;const W=RD.width(el),nar=W<560;
    const A=[['pymalloc','Python objects up to 512 B','returns a 1 MiB arena only when all of it is dead','--c4'],
             ['glibc malloc (or jemalloc, tcmalloc)','NumPy arrays, C extensions, Python objects above 512 B','returns the heap top, whole free pages, big mmapped blocks','--c5'],
             ['mimalloc inside libc10','CPU tensors on arm64 and Windows wheels','keeps freed memory for reuse','--c1'],
             ['CUDA caching allocator','GPU tensors','returns a segment only when nothing in it is live','--c3']];
    const cols=nar?2:4,gap=8,bw=(W-gap*(cols-1))/cols,fs=11;let b=hatch('rd-hero-h');
    // row 0: the job
    b+=box(0,0,W,24,{fill:'var(--soft)'})+T(W/2,16,nar?'Training job: millions of mallocs, ns each':'Training job: millions of malloc and free calls, nanoseconds each',{a:'middle',fs:12,w:600,fill:'var(--ink)'});
    let y0=40;const lines=A.map(a=>[wrap(a[0],bw-12,12),wrap(a[1],bw-12,fs),wrap(a[2],bw-12,fs)]);
    const bh=Math.max(...lines.map(l=>18+l[0].length*15+l[1].length*14+22+l[2].length*14))+6;
    const rows=Math.ceil(A.length/cols);
    A.forEach((a,i)=>{const c=i%cols,r=Math.floor(i/cols),x=c*(bw+gap),y=y0+r*(bh+gap),L=lines[i];
      b+=arrow(x+bw/2,r?y-gap+1:26,x+bw/2,y-1,'var(--mute)');
      b+=box(x,y,bw,bh,{stroke:'var('+a[3]+')',sw:1.5});let yy=y+16;
      L[0].forEach(t=>{b+=T(x+6,yy,t,{fs:12,w:600,fill:'var(--ink)'});yy+=15});
      L[1].forEach(t=>{b+=T(x+6,yy,t,{fs:fs,fill:'var(--mute)'});yy+=14});
      // mini strip: live (allocator colour) and held (hatched orange)
      const sw=bw-12,cells=8;for(let k=0;k<cells;k++){const live=[0,3,6].includes((k+i)%8);
        b+='<rect x="'+(x+6+k*sw/cells).toFixed(1)+'" y="'+(yy-6).toFixed(1)+'" width="'+(sw/cells-2).toFixed(1)+'" height="10" fill="'+(live?'var('+a[3]+')':'url(#rd-hero-h)')+'" stroke="'+(live?'none':'var(--c2)')+'" stroke-width=".8"/>'}
      yy+=20;L[2].forEach(t=>{b+=T(x+6,yy,t,{fs:fs,fill:'var(--c2)'});yy+=14})});
    let y1=y0+rows*(bh+gap)+28;
    // row 2: kernel and driver (narrow: side by side under the second row of boxes)
    const kw=nar?W/2-4:3*bw+2*gap,dw=nar?W/2-4:bw,kh=nar?36:26;
    const ky=y1,dy=y1,dx=nar?W/2+4:3*(bw+gap);
    A.forEach((a,i)=>{const c=i%cols,r=Math.floor(i/cols),x=c*(bw+gap),yb=y0+r*(bh+gap)+bh;
      if(r===rows-1){b+=arrow(x+bw*0.35,yb+1,x+bw*0.35,ky-1,'var(--mute)');b+=arrow(x+bw*0.65,ky-1,x+bw*0.65,yb+1,'var(--c2)',true)}});
    b+=box(0,ky,kw,kh,{fill:'var(--soft)'});
    if(nar)b+=T(kw/2,ky+15,'kernel: 4 KiB pages',{a:'middle',fs:12,w:600,fill:'var(--ink)'})+T(kw/2,ky+29,'brk, mmap, madvise',{a:'middle',fs:11,fill:'var(--mute)'});
    else b+=T(kw/2,ky+17,'kernel: 4 KiB pages, via brk, mmap, munmap, madvise',{a:'middle',fs:12,w:600,fill:'var(--ink)'});
    b+=box(dx,dy,dw,kh,{fill:'var(--soft)'});
    if(nar)b+=T(dx+dw/2,dy+15,'CUDA driver',{a:'middle',fs:12,w:600,fill:'var(--ink)'})+T(dx+dw/2,dy+29,'cudaMalloc, cuMemMap',{a:'middle',fs:11,fill:'var(--mute)'});
    else b+=T(dx+dw/2,dy+17,'CUDA driver: cudaMalloc, cuMemMap',{a:'middle',fs:11,w:600,fill:'var(--ink)'});
    const ly=ky+kh+18;
    if(nar)b+=T(0,ly,'Solid: get memory, rarely, in big pieces.',{fs:11,fill:'var(--mute)'})+T(0,ly+14,'Dashed: give back, only when whole.',{fs:11,fill:'var(--mute)'});
    else b+=T(0,ly,'Solid arrow: get memory, rarely and in big pieces. Dashed: give it back, only when whole.',{fs:11,fill:'var(--mute)'});
    // row 3: measured bars to scale
    let y3=ly+(nar?40:26);const F=(window.AD&&AD.frag&&AD.frag.glibc)||{};
    const live=1562,rss=F['freed all but every 64th']||110524,trim=F['malloc_trim(0) returned 1']||29404,mx=rss;
    if(nar){b+=T(0,y3,'Measured, glibc: 400,000 blocks of 256 B,',{fs:12,w:600,fill:'var(--ink)'})+T(0,y3+15,'then 98% freed (KiB, to scale)',{fs:12,w:600,fill:'var(--ink)'});y3+=23}else{b+=T(0,y3,'Measured, glibc: 400,000 blocks of 256 B, then 98% freed (KiB, to scale)',{fs:12,w:600,fill:'var(--ink)'});y3+=8}
    const lab=nar?92:150,bwid=W-lab-6;
    [['live data',live,live],[nar?'RSS, 98% freed':'RSS after the frees',rss,live],[nar?'after trim':'after malloc_trim(0)',trim,live]].forEach((r,i)=>{const y=y3+i*24;
      b+=T(0,y+14,r[0],{fs:11,fill:'var(--ink)'});
      const lw=Math.max(1.5,bwid*r[2]/mx),hw=bwid*r[1]/mx;
      if(r[1]>r[2])b+='<rect x="'+(lab+lw).toFixed(1)+'" y="'+(y+4)+'" width="'+(hw-lw).toFixed(1)+'" height="14" fill="url(#rd-hero-h)" stroke="var(--c2)" stroke-width=".8"/>';
      b+='<rect x="'+lab+'" y="'+(y+4)+'" width="'+lw.toFixed(1)+'" height="14" fill="var(--c1)"/>';
      const txt=r[1].toLocaleString('en-US'),tx=lab+hw+4,inside=tx+txt.length*6.5>W;
      b+=T(inside?lab+hw-4:tx,y+15,txt,{fs:11,a:inside?'end':null,fill:inside?'var(--ink)':'var(--mute)',w:600})});
    const H=y3+3*24+4;
    el.innerHTML=RD.svg(W,H,b,'Allocator stack of a training job, and measured RSS against live data')}

  // ---------- glibc lookup ladder ----------
  function bins(){const el=$('rd-bins');if(!el)return;const W=RD.width(el),nar=W<560;
    const R=[['tcache','per thread, up to 1,032 B, 7 per size','pop, no lock: about 11 ns a malloc and free'],
             ['fastbin','per arena, up to 128 B','pop under the arena lock; chunks not merged'],
             ['small bin','below 1,024 B, one exact size each','take the first chunk'],
             ['unsorted bin','chunks freed since the last malloc','exact fit taken; the rest sorted into bins'],
             ['large bin','1,024 B and up, size ranges','best fit, then split'],
             ['top chunk','the free end of the heap','split off the end'],
             ['sysmalloc','the kernel','brk grows the heap; at or above the mmap threshold, its own mmap']];
    const bw=nar?Math.min(130,W*0.36):W*0.3,gx=bw+10;let b='',y=0;
    R.forEach((r,i)=>{const last=i===R.length-1,L=wrap(r[1]+': '+r[2],W-gx-4,11),rh=Math.max(30,L.length*13+9);
      b+=box(0,y,bw,rh,{stroke:last?'var(--bad)':'var(--acc)',sw:1.4,fill:last?'var(--soft)':'var(--bg)'});
      b+=T(8,y+rh/2+4,(i+1)+'. '+r[0],{fs:12,w:600,fill:'var(--ink)'});
      L.forEach((t,k)=>{b+=T(gx,y+rh/2+4+(k-(L.length-1)/2)*13,t,{fs:11,fill:'var(--ink)'})});
      if(!last)b+=arrow(bw/2,y+rh+1,bw/2,y+rh+7,'var(--mute)');y+=rh+8});
    el.innerHTML=RD.svg(W,y,b,'Order in which glibc malloc looks for a free chunk')}

  // ---------- pymalloc levels ----------
  function pym(){const el=$('rd-pymd');if(!el)return;const W=RD.width(el),nar=W<560;let b=hatch('rd-pym-h');
    const cols=nar?16:32,rows=64/cols,cw=(W-2)/cols,ch=nar?18:20;
    b+=T(0,12,nar?'one arena: 1 MiB = 64 pools of 16 KiB':'one arena: 1 MiB = 64 pools of 16 KiB, each pool one size class',{fs:12,w:600,fill:'var(--ink)'});
    const live=new Set([5,22,41]);  // illustrative: three pools that still hold one live object
    for(let k=0;k<64;k++){const c=k%cols,r=Math.floor(k/cols),x=1+c*cw,y=20+r*(ch+3);
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+(cw-3).toFixed(1)+'" height="'+ch+'" fill="url(#rd-pym-h)" stroke="var(--c2)" stroke-width=".8"/>';
      if(live.has(k))b+='<circle cx="'+(x+(cw-3)/2).toFixed(1)+'" cy="'+(y+ch/2)+'" r="4.5" fill="var(--c1)"/>'}
    let y=20+rows*(ch+3)+16;
    b+=T(0,y,'Blue dot: one live object. Its pool stays, so the whole arena stays mapped.',{fs:11,fill:'var(--mute)'});
    if(nar){b=b.replace(/<text[^>]*>Blue dot[^<]*<\/text>/,'');b+=T(0,y,'Blue dot: one live object; its pool stays,',{fs:11,fill:'var(--mute)'})+T(0,y+14,'so the whole arena stays mapped.',{fs:11,fill:'var(--mute)'});y+=14}
    y+=22;
    // one pool zoomed: blocks of 48 bytes (a one-element tuple)
    b+=T(0,y,nar?'one pool: equal blocks of one class':'one pool (16 KiB): equal blocks of one class, e.g. 48 B tuples',{fs:12,w:600,fill:'var(--ink)'});y+=8;
    const n=nar?24:48,bwid=(W-2)/n;for(let k=0;k<n;k++){const isLive=k===9;
      b+='<rect x="'+(1+k*bwid).toFixed(1)+'" y="'+y+'" width="'+(bwid-1.5).toFixed(1)+'" height="16" fill="'+(isLive?'var(--c1)':'url(#rd-pym-h)')+'" stroke="'+(isLive?'none':'var(--c2)')+'" stroke-width=".6"/>'}
    y+=30;b+=T(0,y,'Measured: 2,000 survivors of 2,000,000 tuples kept all '+(AK['pym.arenas']||'158')+' arenas ('+(AK['pym.kept']||'163.1')+' MiB).',{fs:11,fill:'var(--c2)',w:600});
    if(nar){b=b.replace(/<text[^>]*>Measured: 2,000[^<]*<\/text>/,'');b+=T(0,y,'Measured: 2,000 survivors of 2,000,000',{fs:11,fill:'var(--c2)',w:600})+T(0,y+14,'tuples kept all '+(AK['pym.arenas']||'158')+' arenas ('+(AK['pym.kept']||'163.1')+' MiB).',{fs:11,fill:'var(--c2)',w:600});y+=14}
    el.innerHTML=RD.svg(W,y+8,b,'pymalloc arena of 64 pools, three pinned by one live object each')}

  const all=()=>{hero();bins();pym()};
  all();RD.onRender(all);RD.onResize(all);
})();
