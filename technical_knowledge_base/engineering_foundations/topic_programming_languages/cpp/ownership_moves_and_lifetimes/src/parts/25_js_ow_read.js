// ---- Reading: the hero, the address map, the owner-cost bars and the four lifetime replays (data: window.CA_DATA from src/ca/gen.py) ----
(function(){
  if(!window.CA_DATA||!window.CA||!CA.life)return;
  const D=window.CA_DATA,$=id=>document.getElementById(id),esc=RD.esc;
  const T=(x,y,s,o)=>RD.t(x,y,esc(s),o);
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.rx||5)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--ink)')+'" stroke-width="'+(o.w||1.6)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+' L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+' Z" fill="'+(o.c||'var(--ink)')+'"/>'};

  // Hero, left: three Python names, one counted object
  function heroPy(){const el=$('ow-hero-py');if(!el)return;const w=Math.max(280,RD.width(el)),h=204;let s='';
    s+=T(8,16,'Python',{w:600,fs:13});
    const nw=Math.min(118,w*0.34),ys=[38,86,134],names=['a','b',"cache['k']"];
    const ox=Math.round(w*0.52),ow=w-ox-8,oy=56,oh=88;
    names.forEach((n,i)=>{s+=box(8,ys[i],nw,30);s+=T(16,ys[i]+19,n,{fs:12.5});s+=arrow(8+nw,ys[i]+15,ox-2,oy+oh/2+(i-1)*18,{c:'var(--mute)'})});
    s+=box(ox,oy,ow,oh,{stroke:'var(--mute)'});
    s+=T(ox+10,oy+22,'list object (heap)',{fs:12,w:600});
    s+=T(ox+10,oy+46,'refcount 3',{fs:12.5,fill:'var(--acc)',w:600});
    s+=T(ox+10,oy+70,'[1, 2, 3]',{fs:12});
    s+=T(8,h-10,'freed when the count reaches 0',{fs:12,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,s,'Python: three names, one object with reference count 3')}
  // Hero, right: one owner on the stack, its buffer on the heap, an observer, the closing brace
  function heroCpp(){const el=$('ow-hero-cpp');if(!el)return;const w=Math.max(280,RD.width(el)),h=204;let s='';
    s+=T(8,16,'C++',{w:600,fs:13});
    const sw=Math.round(w*0.47)-8,hx=Math.round(w*0.53),hw=w-hx-8;
    s+=box(8,26,sw,138,{fill:'none',dash:'4 3',stroke:'var(--mute)'})+T(14,40,'stack',{fs:11,fill:'var(--mute)'});
    s+=box(hx,26,hw,138,{fill:'none',dash:'4 3',stroke:'var(--mute)'})+T(hx+6,40,'heap',{fs:11,fill:'var(--mute)'});
    const vx=16,vw=sw-16;
    s+=box(vx,48,vw,52,{stroke:'var(--acc)',sw:1.6});
    s+=T(vx+7,63,'v, the owner (24 B)',{fs:12,w:600,fill:'var(--acc)'});
    const cw=(vw-14)/3,cells=['size 3','cap 3','data'];
    cells.forEach((c,i)=>{s+=box(vx+7+i*cw,70,cw-3,22,{rx:3,fill:'var(--bg)'});s+=T(vx+7+i*cw+(cw-3)/2,85,c,{fs:11,a:'middle'})});
    s+=box(vx,122,vw,30,{fill:'var(--bg)',dash:'3 3'});
    s+=T(vx+7,141,'r, a const& (observes)',{fs:11.5});
    s+=arrow(vx+vw/2,122,vx+vw/2,103,{c:'var(--mute)',dash:'3 3',w:1.3});
    const bw=hw-16,bx=hx+8,by=70;
    ['1.0','2.0','3.0'].forEach((c,i)=>{s+=box(bx+i*bw/3,by,bw/3-3,24,{rx:3,stroke:'var(--acc)'});s+=T(bx+i*bw/3+(bw/3-3)/2,by+16,c,{fs:11.5,a:'middle'})});
    s+=T(bx,by+40,'its buffer, 12 B',{fs:11,fill:'var(--mute)'});
    s+=arrow(vx+7+2*cw+(cw-3)/2+12,81,bx-3,by+12,{c:'var(--acc)',w:1.8});
    s+=T(bx,by-8,'owned by v',{fs:11.5,fill:'var(--acc)',w:600});
    s+=box(8,172,w-16,26,{fill:'var(--acc2)',stroke:'var(--acc)'});
    s+=T(16,189,'}  ends the scope: ~vector() frees the buffer',{fs:12});
    el.innerHTML=RD.svg(w,h,s,'C++: v owns a heap buffer; r observes v; the closing brace runs the destructor')}

  // Address map from stack_heap.cpp's real output
  function addr(){const el=$('ow-addr');if(!el||!D.addr)return;const w=Math.max(290,RD.width(el));
    const reg=l=>/static/.test(l)?'static':(/heap|elements/.test(l)?'heap':'stack');
    const groups=[['stack','Stack'],['heap','Heap'],['static','Static']];
    const rh=22,gx=Math.min(64,w*0.17),lx=gx+16;let y=8,s='',pos={};
    groups.forEach(([k,name])=>{const rows=D.addr.filter(r=>reg(r[0])===k);if(!rows.length)return;
      const top=y;s+=box(4,top,w-8,rows.length*rh+10,{fill:k==='heap'?'var(--acc2)':'var(--soft)'});
      s+=T(12,top+19,name,{fs:12,w:600});
      rows.forEach((r,i)=>{const yy=top+20+i*rh;pos[r[0]]=yy;
        s+='<text x="'+lx+'" y="'+yy+'" font-size="11.5">'+esc(r[0])+'</text>';
        s+='<text x="'+(w-12)+'" y="'+yy+'" font-size="11.5" text-anchor="end" font-family="ui-monospace,Menlo,monospace">'+esc(r[1])+'</text>'});
      y=top+rows.length*rh+18});
    const a=pos['&v (the vector object)'],b=pos['v.data() (its elements)'];
    if(a&&b){const x=lx-7;s+='<path d="M'+(x+4)+' '+(a-4)+' C '+(x-10)+' '+(a-4)+', '+(x-10)+' '+(b-4)+', '+(x+1)+' '+(b-4)+'" fill="none" stroke="var(--acc)" stroke-width="1.6"/>';
      s+=arrow(x-2,b-4,x+3,b-4,{c:'var(--acc)'})}
    el.innerHTML=RD.svg(w,y-6,s,'Printed addresses grouped by region; the vector object on the stack points at its elements on the heap')}

  // Owner-cost bars (log scale), from ptr_cost.cpp's output
  function cost(){const el=$('ow-cost');if(!el||!D.cost)return;
    const rows=D.cost.rows.filter(r=>!/1 thread/.test(r[0]));
    const lo=Math.log10(0.3),hi=Math.log10(600),pct=v=>Math.max(2,100*(Math.log10(v)-lo)/(hi-lo));
    const col=r=>/4 threads/.test(r[0])?'var(--bad)':(/by value/.test(r[0])?'var(--c2)':'var(--c1)');
    const name=r=>/4 threads/.test(r[0])?'shared_ptr by value, 4 threads at once':r[0];
    el.innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+esc(name(r))+'</div><div class="track"><div class="fill" style="width:'+pct(r[1]).toFixed(1)+'%;background:'+col(r)+'"></div></div><div class="val">'+r[1].toFixed(2)+' ns</div></div>').join('')}

  function draw(){heroPy();heroCpp();addr()}
  cost();draw();RD.onRender(draw);RD.onResize(draw);

  // The four replays of lifetime.cpp, each beside the section it proves
  CA.life.mount({el:'ow-a1',card:'ow-a1-card',ctl:'ow-a1-ctl',key:'scope',seg:'ow-a1-seg'});
  CA.life.mount({el:'ow-a2',card:'ow-a2-card',ctl:'ow-a2-ctl',key:'unique',seg:'ow-a2-seg'});
  CA.life.mount({el:'ow-a3',card:'ow-a3-card',ctl:'ow-a3-ctl',key:'copymove',seg:'ow-a3-seg'});
  CA.life.mount({el:'ow-a4',card:'ow-a4-card',ctl:'ow-a4-ctl',key:'growth',seg:'ow-a4-seg'});
})();
