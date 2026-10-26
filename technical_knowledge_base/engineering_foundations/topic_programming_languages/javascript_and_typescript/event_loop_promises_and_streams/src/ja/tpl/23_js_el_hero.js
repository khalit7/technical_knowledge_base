// ---- hero: the queues around one thread (static diagram; a row on wide screens, a column on phones) ----
(function(){
  const el=document.getElementById('el-hero');if(!el)return;
  const B=[
    {k:'stack',t:'Call stack',b:'your code runs to completion; nothing interrupts it'},
    {k:'tick',t:'1. nextTick queue',b:'process.nextTick callbacks (Node only)'},
    {k:'micro',t:'2. Microtask queue',b:'.then callbacks, code after await, queueMicrotask: drained until empty'},
    {k:'macro',t:'3. One macrotask',b:'by loop phase: timers, then poll (I/O callbacks), then check (setImmediate)'}];
  const UV={t:'libuv and the OS',b:'sockets watched by epoll or kqueue; files, DNS, some crypto on a thread pool'};
  function wrap(s,chars){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if((l+' '+x).trim().length>chars&&l){out.push(l);l=x}else l=(l+' '+x).trim()});if(l)out.push(l);return out}
  function box(x,y,w,o,fs){const lines=wrap(o.b,Math.max(12,Math.floor((w-14)/(fs*0.56)))),h=26+lines.length*(fs+3)+6;
    const hi=o.k==='micro';
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(hi?'var(--acc2)':'var(--soft)')+'" stroke="'+(hi?'var(--acc)':'var(--line)')+'" stroke-width="'+(hi?2:1)+'"/>';
    s+=RD.t(x+8,y+17,o.t,{fs:fs+1.5,w:600,fill:hi?'var(--acc)':null});
    lines.forEach((l,i)=>{s+=RD.t(x+8,y+34+i*(fs+3),RD.esc(l),{fs,fill:'var(--mute)'})});
    return {s,h}}
  const arrow=(x1,y1,x2,y2,c)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.6" marker-end="url(#el-ah)"/>';
  function draw(){
    const W=Math.min(860,RD.width(el)),fs=W<560?11:11.5;let s='<defs><marker id="el-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>',H;
    if(W>=560){const g=26,top=30,w=(W-10-3*g)/4;
      // measure heights first so the row lines up
      const hs=B.map(o=>box(0,0,w,o,fs).h),h=Math.max(...hs);
      B.forEach((o,i)=>{const x=5+i*(w+g);const r=box(x,top,w,o,fs);s+=r.s.replace(/height="\d+(\.\d+)?"/,'height="'+h+'"');
        if(i<3)s+=arrow(x+w+2,top+h/2,x+w+g-2,top+h/2)});
      const xs=5+w/2,xm=5+3*(w+g)+w/2;
      s+='<path d="M'+xm+','+top+' V'+(top-14)+' H'+xs+' V'+(top-3)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#el-ah)"/>';
      s+=RD.t((xs+xm)/2,top-19,'run that one callback on the stack, then drain both queues again',{a:'middle',fs:fs,fill:'var(--mute)'});
      const ux=5+2*(w+g),uw=2*w+g,uy=top+h+34,ur=box(ux,uy,uw,UV,fs);s+=ur.s;
      s+=arrow(xm,uy-2,xm,top+h+3);s+=RD.t(xm+6,top+h+22,'completions',{fs:fs,fill:'var(--mute)'});
      H=uy+ur.h+6;
    }else{const x=5,w=W-48,g=24;let y=8;const ys=[];
      B.forEach((o,i)=>{const r=box(x,y,w,o,fs);s+=r.s;ys.push([y,r.h]);if(i<3)s+=arrow(x+w/2,y+r.h+2,x+w/2,y+r.h+g-2);y+=r.h+g});
      const [y0,h0]=ys[0],[y3,h3]=ys[3],xr=W-14;
      s+='<path d="M'+(x+w)+','+(y3+h3/2)+' H'+xr+' V'+(y0+h0/2)+' H'+(x+w+3)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#el-ah)"/>';
      s+='<text x="'+(xr+4)+'" y="'+((y0+y3+h3)/2)+'" font-size="'+fs+'" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 '+(xr+4)+' '+((y0+y3+h3)/2)+')">then drain again</text>';
      const uy=y+4,ur=box(x,uy,w,UV,fs);s+=ur.s;s+=arrow(x+w/2,uy-2,x+w/2,y3+h3+3);s+=RD.t(x+w/2+6,uy-10,'completions',{fs:fs,fill:'var(--mute)'});
      H=uy+ur.h+6;
    }
    el.innerHTML=RD.svg(W,H,s,'The event loop: the call stack, then the nextTick queue, then the microtask queue drained to empty, then one macrotask by loop phase, fed by libuv and the operating system');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
