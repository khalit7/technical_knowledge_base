// ---- Training lab: the same NNX module before and after nnx.split, animated (leaves move; area proportional to elements) ----
(function(){const {$,RM,esc,anim,onRender,onResize,width}=TR;
  const LEAVES=[
    {id:'k1',mod:'fc1',name:'kernel',shape:'(128, 512)',n:65536,kind:'p'},{id:'b1',mod:'fc1',name:'bias',shape:'(512,)',n:512,kind:'p'},
    {id:'k2',mod:'fc2',name:'kernel',shape:'(512, 128)',n:65536,kind:'p'},{id:'b2',mod:'fc2',name:'bias',shape:'(128,)',n:128,kind:'p'},
    {id:'c',mod:'',name:'calls',shape:'()',n:1,kind:'v'}];
  const CAP=[
    '<b>m = MLP(128, 512, rngs=nnx.Rngs(0))</b>: an ordinary Python object, like an nn.Module. Its arrays live inside it: two kernels of 65,536 numbers, two biases (512 and 128) and a counter.',
    '<b>Two kinds of state.</b> The kernels and biases are <code>nnx.Param</code> (blue); <code>calls</code> is a plain <code>nnx.Variable</code> (orange), state that is not trained, like a PyTorch buffer.',
    '<b>graphdef, params, rest = nnx.split(m, nnx.Param, ...)</b>: the filters pick leaves; every <code>nnx.Param</code> moves into the <code>params</code> State, a pytree keyed by path (fc1/kernel, ...).',
    'The <code>...</code> filter takes everything left: the counter goes into <code>rest</code>. Every array has now left the object.',
    'What remains is the <b>graphdef</b>: classes, attribute names, shapes and dtypes, no arrays. It is hashable, so it can be a static argument and part of the compile-cache key.',
    '<b>Inside nnx.jit</b> (or your own <code>jax.jit</code>), only the arrays cross the boundary as pytree leaves; the graphdef stays outside as a constant. That is the whole trick that lets an object-style API run under pure transformations.',
    '<b>m2 = nnx.merge(graphdef, params, rest)</b> puts the arrays back into a new object of the same structure: <code>m2(x) == m(x)</code>. <code>nnx.jit</code> does split before and merge after every call, and writes changed state (the counter) back into <code>m</code>.'];
  let geo=null,built=0;const card='tr-split-card';
  function layout(W){const wide=W>=520,tw=wide?W*0.47:W-20,S=Math.min(60,tw*0.26),rowH=S+30;
    const tree={x:10,y:10,w:tw,h:34+2*(rowH+24)+30},sub=[{x:tree.x+10,y:tree.y+30,w:tw-20,h:rowH+18},{x:tree.x+10,y:tree.y+30+rowH+26,w:tw-20,h:rowH+18}];
    const rx=wide?W*0.53:10,rw=wide?W*0.47-10:W-20,pb={x:rx,y:wide?10:tree.y+tree.h+16,w:rw,h:26+2*rowH+6},rb={x:rx,y:0,w:rw,h:52};
    rb.y=pb.y+pb.h+10;const H=Math.max(tree.y+tree.h,rb.y+rb.h)+20;
    const side=n=>Math.max(3,S*Math.sqrt(n/65536));const P={};
    LEAVES.forEach(l=>{const s=side(l.n);let tx,ty,px,py;
      if(l.mod){const b=sub[l.mod==='fc1'?0:1];tx=b.x+12+(l.name==='bias'?Math.max(S+20,(b.w-24)/2):0);ty=b.y+22;
        const j=['k1','b1','k2','b2'].indexOf(l.id),cw=(rw-20)/2;px=pb.x+10+(j%2)*cw;py=pb.y+26+Math.floor(j/2)*rowH;}
      else{tx=tree.x+20;ty=tree.y+tree.h-26;px=rb.x+12;py=rb.y+24}
      P[l.id]={s,tree:[tx,ty],out:[px,py]}});
    return {W,H,wide,tree,sub,pb,rb,S,P}}
  function build(){const el=$('tr-split-svg'),W=width(el);geo=layout(W);const g=geo;
    let s='<svg viewBox="0 0 '+W+' '+g.H+'" width="'+W+'" height="'+g.H+'" role="img" aria-label="An NNX module split into graphdef, params and rest">';
    s+='<rect id="tr-sp-jit" x="'+(g.pb.x-6)+'" y="'+(g.pb.y-6)+'" width="'+(g.pb.w+12)+'" height="'+(g.rb.y+g.rb.h-g.pb.y+12)+'" rx="10" fill="none" stroke="var(--c5)" stroke-width="2" stroke-dasharray="6 4" opacity="0"/>';
    s+='<text id="tr-sp-jitl" x="'+(g.pb.x+g.pb.w-4)+'" y="'+(g.rb.y+g.rb.h+2)+'" text-anchor="end" font-size="10.5" fill="var(--c5)" opacity="0">inside jax.jit: only these arrays</text>';
    s+='<rect id="tr-sp-tree" x="'+g.tree.x+'" y="'+g.tree.y+'" width="'+g.tree.w+'" height="'+g.tree.h+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
    s+='<text id="tr-sp-tl" x="'+(g.tree.x+10)+'" y="'+(g.tree.y+20)+'" font-size="12" font-weight="600">m: MLP</text>';
    g.sub.forEach((b,i)=>{s+='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="6" fill="var(--bg)" stroke="var(--line)"/><text x="'+(b.x+8)+'" y="'+(b.y+15)+'" font-size="11">'+(i?'fc2: Linear(512, 128)':'fc1: Linear(128, 512)')+'</text>'});
    s+='<rect id="tr-sp-pb" x="'+g.pb.x+'" y="'+g.pb.y+'" width="'+g.pb.w+'" height="'+g.pb.h+'" rx="8" fill="none" stroke="var(--c1)" opacity="0.25"/><text id="tr-sp-pbl" x="'+(g.pb.x+8)+'" y="'+(g.pb.y+16)+'" font-size="11.5" font-weight="600" fill="var(--c1)" opacity="0.25">params: State (nnx.Param)</text>';
    s+='<rect id="tr-sp-rb" x="'+g.rb.x+'" y="'+g.rb.y+'" width="'+g.rb.w+'" height="'+g.rb.h+'" rx="8" fill="none" stroke="var(--c2)" opacity="0.25"/><text id="tr-sp-rbl" x="'+(g.rb.x+8)+'" y="'+(g.rb.y+16)+'" font-size="11.5" font-weight="600" fill="var(--c2)" opacity="0.25">rest: State (everything else)</text>';
    LEAVES.forEach(l=>{const p=g.P[l.id];s+='<g id="tr-sp-'+l.id+'" style="transition:'+(RM?'none':'transform .8s ease')+'"><rect width="'+p.s.toFixed(1)+'" height="'+p.s.toFixed(1)+'" rx="2" fill="var(--dim)"/><text x="0" y="'+(p.s+11).toFixed(1)+'" font-size="10" fill="var(--mute)">'+(l.mod?l.mod+'.':'')+l.name+' '+l.shape+'</text></g>'});
    s+='</svg>';el.innerHTML=s;built=1}
  function draw(i){if(!built||width($('tr-split-svg'))!==geo.W)build();const g=geo;
    LEAVES.forEach(l=>{const e=$('tr-sp-'+l.id),p=g.P[l.id];const out=(l.kind==='p'&&i>=2&&i<6)||(l.kind==='v'&&i>=3&&i<6);
      const xy=out?p.out:p.tree;e.style.transform='translate('+xy[0].toFixed(1)+'px,'+xy[1].toFixed(1)+'px)';
      e.querySelector('rect').setAttribute('fill',i>=1?(l.kind==='p'?'var(--c1)':'var(--c2)'):'var(--dim)')});
    const op=(id,v)=>$(id).setAttribute('opacity',v);
    op('tr-sp-pb',i>=2&&i<6?1:.25);op('tr-sp-pbl',i>=2&&i<6?1:.25);op('tr-sp-rb',i>=3&&i<6?1:.25);op('tr-sp-rbl',i>=3&&i<6?1:.25);
    op('tr-sp-jit',i===5?1:0);op('tr-sp-jitl',i===5?1:0);
    $('tr-sp-tl').textContent=i>=4&&i<6?'graphdef (structure only, no arrays)':i===6?'m2 = nnx.merge(graphdef, params, rest)':'m: MLP';
    $('tr-sp-tree').setAttribute('stroke-dasharray',i>=4&&i<6?'5 4':'');
    $('tr-split-cap').innerHTML=CAP[i]}
  const A=anim({card,ctl:'tr-split-ctl',n:CAP.length,ms:2200,label:'Split step',draw});
  onResize(()=>{built=0;A.redraw()});
})();
