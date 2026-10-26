// ---- Hero (a list of float objects against one NumPy buffer, with the measured times), the speed-up ladder, and the object-layout figure of section 2. Static figures drawn at the measured width ----
(function(){
  const $=id=>document.getElementById(id),T=RD.t,esc=RD.esc;
  const np=window.PA&&PA.np;if(!np)return;
  const big=np[np.length-1];                 // [n, loop us, map+fsum us, numpy us, np.array(list) us]
  const LOOP=big[1]/1000,NPY=big[3]/1000;
  function hero(){
    const el=$('ci-hero');if(!el)return;
    const W=Math.min(860,RD.width(el)),nar=W<520,L=4,R=W-4;
    let s='',y=16;
    // lane 1: the Python loop
    s+=T(L,y,nar?'Python loop':'Python loop: for x in xs: s += math.exp(x - m)',{w:600,fs:12.5,fill:'var(--ink)'});
    s+=T(L,y+16,nar?'list: 8-byte pointers':'list: one 8-byte pointer per element',{fs:11,fill:'var(--mute)'});
    y+=24;const n=Math.max(6,Math.min(12,Math.floor((R-L-70)/40))),cw=Math.min(40,(R-L-70)/n);
    for(let i=0;i<n;i++){const x=L+i*cw;s+='<rect x="'+x+'" y="'+y+'" width="'+(cw-2)+'" height="16" fill="var(--soft)" stroke="var(--line)"></rect>';
      s+='<circle cx="'+(x+cw/2-1)+'" cy="'+(y+8)+'" r="2.5" fill="var(--ink)"></circle>'}
    s+=T(L+n*cw+4,y+12,'…',{fs:12,fill:'var(--mute)'});
    const oy=y+34;
    for(let i=0;i<n;i++){const x0=L+i*cw+cw/2-1,xo=L+i*cw+((i*37)%11)-4,yo=oy+((i*53)%3)*9;
      s+='<line x1="'+x0+'" y1="'+(y+16)+'" x2="'+(xo+cw/2-2)+'" y2="'+yo+'" stroke="var(--mute)" stroke-width="1"></line>';
      s+='<rect x="'+xo+'" y="'+yo+'" width="'+(cw-6)+'" height="14" rx="2" fill="var(--c2)" opacity=".8"></rect>'}
    s+=T(L,oy+44,nar?'a 24-byte float object each':'a separate 24-byte float object per element (refcount, type, value)',{fs:11,fill:'var(--mute)'});
    const ly=oy+54;
    s+='<rect x="'+L+'" y="'+ly+'" width="'+(R-L)+'" height="22" rx="4" fill="none" stroke="var(--acc)"></rect>';
    s+=T(L+6,ly+15,nar?'C eval loop: bytecode + 3 new floats per element':'C evaluation loop: the body\'s bytecode once per element, 3 new floats each time',{fs:11,fill:'var(--ink)'});
    const by=ly+30,bw=R-L-62;
    s+='<rect x="'+L+'" y="'+by+'" width="'+bw+'" height="12" fill="var(--c2)"></rect>'+T(L+bw+4,by+10,LOOP.toFixed(1)+' ms',{fs:11.5,w:600,fill:'var(--ink)'});
    // lane 2: NumPy
    y=by+38;
    s+=T(L,y,nar?'NumPy':'NumPy: np.exp(a - a.max()).sum()',{w:600,fs:12.5,fill:'var(--ink)'});
    y+=8;const m=Math.max(12,Math.min(40,Math.floor((R-L-20)/14))),dw=(R-L-20)/m;
    s+='<rect x="'+L+'" y="'+y+'" width="'+(m*dw)+'" height="16" fill="var(--c1)" opacity=".85"></rect>';
    for(let i=1;i<m;i++)s+='<line x1="'+(L+i*dw)+'" x2="'+(L+i*dw)+'" y1="'+y+'" y2="'+(y+16)+'" stroke="var(--bg)" stroke-width="1"></line>';
    s+=T(L+m*dw+4,y+12,'…',{fs:12,fill:'var(--mute)'});
    s+=T(L,y+30,nar?'one buffer, 8 bytes per double':'one contiguous buffer, 8 bytes per double, no object per element',{fs:11,fill:'var(--mute)'});
    const ly2=y+38;
    s+='<rect x="'+L+'" y="'+ly2+'" width="'+(R-L)+'" height="22" rx="4" fill="none" stroke="var(--acc)"></rect>';
    s+=T(L+6,ly2+15,nar?'one call: 3 C loops over the buffer':'one Python call: three tight C loops over the buffer (subtract, exp, sum)',{fs:11,fill:'var(--ink)'});
    const by2=ly2+30,bw2=Math.max(2,bw*NPY/LOOP);
    s+='<rect x="'+L+'" y="'+by2+'" width="'+bw2+'" height="12" fill="var(--c1)"></rect>'+T(L+bw2+4,by2+10,NPY.toFixed(1)+' ms ('+(LOOP/NPY).toFixed(1)+'x faster)',{fs:11.5,w:600,fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,by2+18,s,'A Python list of pointers to separate float objects, looped over by the interpreter, against one NumPy buffer looped over in C; 47.6 ms against 3.2 ms');
  }
  function ladder(){
    const el=$('ci-ladder');if(!el||!window.PB||!window.PB.jit)return;
    const J=PB.jit.runs,jit=J['3.15|char_loop|0'].median_s/J['3.15|char_loop|1'].median_s,P=PA.prof;
    CIU.bars(el,[
      {name:'JIT on, 3.15 (character loop, section 5)',v:jit,label:jit.toFixed(2)+'x',col:'var(--c5)'},
      {name:'Profile, then regex and a dict (section 3)',v:P.slow_ms/P.fast_ms,label:(P.slow_ms/P.fast_ms).toFixed(1)+'x',col:'var(--c3)'},
      {name:'Loop moved into NumPy, 1,000,000 floats (section 4)',v:LOOP/NPY,label:(LOOP/NPY).toFixed(1)+'x',col:'var(--c1)'}]);
  }
  // section 2: what an object holds
  function obj(){
    const el=$('ci-obj');if(!el)return;
    const W=Math.min(760,RD.width(el)),nar=W<520,u=Math.min(nar?9:12,(W-130)/40);   // px per byte
    const rows=[
      ['C int64',[['value',8,'var(--c1)']],'8 B'],
      ['float 1.5',[['refcount',8,'var(--dim)'],['type',8,'var(--dim)'],['double',8,'var(--c2)']],'24 B'],
      ['int 1',[['refcount',8,'var(--dim)'],['type',8,'var(--dim)'],['size',8,'var(--c5)'],['digit',4,'var(--c2)']],'28 B'],
      ['int 2**60',[['refcount',8,'var(--dim)'],['type',8,'var(--dim)'],['size',8,'var(--c5)'],['3 digits',12,'var(--c2)']],'36 B']];
    const L=nar?66:84;let s='',y=6;
    rows.forEach(r=>{let x=L;s+=T(0,y+14,r[0],{fs:11.5,fill:'var(--ink)'});
      r[1].forEach(c=>{const w=c[1]*u;s+='<rect x="'+x+'" y="'+y+'" width="'+(w-1)+'" height="20" fill="'+c[2]+'" opacity=".85"></rect>';
        if(w>(nar?44:52))s+=T(x+w/2,y+14,c[0],{a:'middle',fs:11,fill:c[2]==='var(--dim)'?'var(--ink)':'var(--bg)'});x+=w});
      s+=T(x+5,y+14,r[2],{fs:11.5,w:600,fill:'var(--ink)'});y+=28});
    el.innerHTML=RD.svg(W,y,s,'Object layouts: a C int64 is 8 bytes; a Python float 24 bytes; an int 28 bytes plus 4 per 30 bits')+
      '<div class="leg"><span><i style="background:var(--dim)"></i>header every object has (16 B)</span><span><i style="background:var(--c5)"></i>int size field</span><span><i style="background:var(--c2)"></i>the value</span></div>';
  }
  function all(){hero();ladder();obj()}
  all();RD.onRender(all);RD.onResize(all);
})();
