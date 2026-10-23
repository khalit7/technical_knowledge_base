// ---- Reading: the static figures added on 2026-10-23 (hero, PJRT, duplicate-or-store, TPU tile padding, the two caches) ----
(function(){
  if(!document.getElementById('xp-hero'))return;
  const D=XP.D, n=D.n, esc=XP.esc, f=XP.f, T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'"'+(o.dash?' stroke-dasharray="4 3"':'')+(o.sw?' stroke-width="'+o.sw+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,c)=>{c=c||'var(--mute)';const a=Math.atan2(y2-y1,x2-x1),h=6;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="1.3"/><path d="M'+x2+','+y2+' L'+(x2-h*Math.cos(a-0.45)).toFixed(1)+','+(y2-h*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-h*Math.cos(a+0.45)).toFixed(1)+','+(y2-h*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+c+'"/>'};
  const lines=(x,y,arr,o)=>arr.map((s,i)=>T(x,y+i*14,s,o)).join('');

  // 1. hero: the stages, their counts, and the levers
  const kb=v=>f(v);
  const ROWS=[
    {o:'JAX',n:'Python train_step',d:'runs once, on tracers',c:'1 function',l:['shapes, static args:','the cache key (8, 10)']},
    {o:'JAX',n:'jaxpr',d:'one equation per primitive',c:kb(n.step_jaxpr)+' eqns',l:[]},
    {o:'JAX',n:'StableHLO',d:'lowering rules, one module',c:kb(n.step_shlo)+' ops',l:['jax.export','ships this (9)']},
    {o:'PJRT',n:'PJRT',d:'the plug to a device plugin',c:'C API 0.'+n.pjrt_minor,l:['install the plugin','for your jaxlib (2)']},
    {o:'XLA',n:'HLO',d:'XLA\'s form, before any pass',c:kb(n.step_hlo)+' instrs',l:[]},
    {o:'XLA',n:'Passes',d:'simplify, CSE, layout, fuse',c:n.pass_step_changed+' changed',l:['XLA_FLAGS (12)','--xla_dump_to (3)']},
    {o:'XLA',n:'Optimised HLO',d:n.step_fusions+' fusions, '+n.step_dots+' matmuls',c:kb(n.step_kernels)+' kernels',l:['what fuses (4)','layouts (5)']},
    {o:'XLA',n:'Schedule, buffers',d:'planned peak, every byte placed',c:n.xla_peak_mb+' MB',l:['donate_argnums (6)','jax.checkpoint (7)']},
    {o:'backend',n:'Executable',d:'LLVM, PTX or libtpu',c:'1 per key',l:['two caches (8)','profile it (11)']}];
  const OC={JAX:'var(--c1)',PJRT:'var(--c6)',XLA:'var(--c2)',backend:'var(--c3)'};
  function hero(){
    const host=document.getElementById('xp-hero'), W=RD.width(host), narrow=W<560;
    const ox=20, bx=ox+8, bw=Math.round((W-bx)*(narrow?0.58:0.56)), lx=bx+bw+(narrow?10:18), lw=W-lx-2;
    const rh=narrow?38:36, gap=11, top=4;
    let s='';
    // owner bands
    const groups=[['JAX',0,2],['PJRT',3,3],['XLA',4,7],['backend',8,8]];
    groups.forEach(([g,a,b])=>{const y1=top+a*(rh+gap),y2=top+b*(rh+gap)+rh;
      s+='<rect x="2" y="'+y1+'" width="5" height="'+(y2-y1)+'" rx="2" fill="'+OC[g]+'"/>';
      const my=(y1+y2)/2;s+='<text transform="translate('+(ox-3)+','+my+') rotate(-90)" text-anchor="middle" font-size="11" fill="var(--mute)">'+(g==='backend'?'device':g)+'</text>'});
    ROWS.forEach((r,i)=>{const y=top+i*(rh+gap);
      s+=box(bx,y,bw,rh,{stroke:OC[r.o]});
      s+=T(bx+8,y+15,esc(r.n),{w:600,fs:12})+T(bx+bw-7,y+15,esc(r.c),{a:'end',fs:11.5,w:600,fill:OC[r.o]});
      s+=T(bx+8,y+30,esc(r.d),{fs:11,fill:'var(--mute)'});
      if(i<ROWS.length-1)s+=arrow(bx+bw/2,y+rh+1,bx+bw/2,y+rh+gap-1);
      if(r.l.length){s+='<line x1="'+(bx+bw+1)+'" y1="'+(y+rh/2)+'" x2="'+(lx-1)+'" y2="'+(y+rh/2)+'" stroke="var(--acc)" stroke-dasharray="3 3"/>';
        s+=box(lx,y+2,lw,rh-4,{fill:'var(--bg)',stroke:'var(--acc)'});s+=lines(lx+7,y+15,r.l.map(esc),{fs:11,fill:'var(--acc)'})}
    });
    const H=top+ROWS.length*(rh+gap)-gap+4;
    host.innerHTML=RD.svg(W,H,s,'The train step from Python to executable, with the levers at each stage');
  }

  // 2. PJRT structure
  function pjrt(){
    const host=document.getElementById('xp-pjrt-svg'); if(!host)return;
    const W=RD.width(host), narrow=W<560, cw=Math.min(W-4,420), cx=(W-cw)/2;
    let s='',y=2;
    const lay=[['jax, jaxlib (Python)','jax.Array: one buffer per device'],['IFRT','the layer above PJRT'],['PJRT C API','major 0, minor '+n.pjrt_minor+'; compile, buffers, execute']];
    lay.forEach((L,i)=>{s+=box(cx,y,cw,34,{stroke:i===2?'var(--acc)':'var(--line)'});s+=T(cx+8,y+14,esc(L[0]),{w:600,fs:12})+T(cx+8,y+28,esc(L[1]),{fs:11,fill:'var(--mute)'});
      y+=34;s+=arrow(W/2,y+1,W/2,y+11);y+=12});
    const P=[['CPU client','built into jaxlib','the only one here',true],['CUDA plugin','jax-cuda12 or','jax-cuda13-plugin',false],['TPU plugin','libtpu, with the','closed TPU compiler',false]];
    const ph=48;
    if(narrow){P.forEach((p,i)=>{s+=box(cx,y,cw,ph,{fill:p[3]?'var(--acc2)':'var(--soft)',stroke:p[3]?'var(--acc)':'var(--line)',dash:!p[3]});
        s+=T(cx+8,y+15,esc(p[0]),{w:600,fs:12})+T(cx+8,y+30,esc(p[1]+' '+p[2]),{fs:11,fill:'var(--mute)'});y+=ph+6});}
    else{const pw=(W-16)/3;P.forEach((p,i)=>{const x=4+i*(pw+4);s+=box(x,y,pw,ph+4,{fill:p[3]?'var(--acc2)':'var(--soft)',stroke:p[3]?'var(--acc)':'var(--line)',dash:!p[3]});
        s+=T(x+8,y+15,esc(p[0]),{w:600,fs:12})+lines(x+8,y+30,[esc(p[1]),esc(p[2])],{fs:11,fill:'var(--mute)'});});y+=ph+8}
    host.innerHTML=RD.svg(W,y,s,'PJRT between JAX and the device plugins');
  }

  // 3. one producer, two consumers: duplicate or store
  const B=k=>D.fuse.breakers.find(b=>b.key===k).s.default;
  let dupMode='mul_two_users';
  const opsOf=k=>(k[2]||k[0]).split(' ').filter(o=>o!=='constant'&&o!=='broadcast').map(o=>o==='exponential'?'exp':o);
  function dup(){
    const host=document.getElementById('xp-dup-svg'), W=RD.width(host), S=B(dupMode), L=S.l, exp=dupMode==='exp_two_users';
    const cw=Math.min(W-4,520), cx=(W-cw)/2, kw=(cw-12)/2;
    let s='',y=2;
    s+=box(cx+cw/2-95,y,190,32,{fill:'var(--bg)'})+T(cx+cw/2,y+14,'x: 256 x 512 float32',{a:'middle',w:600,fs:12})+T(cx+cw/2,y+27,'512 KiB in memory',{a:'middle',fs:11,fill:'var(--mute)'});
    y+=32;
    const kbox=(x,yy,w,k,j)=>box(x,yy,w,40,{fill:k[1]==='kCustom'?'var(--soft)':'var(--acc2)',stroke:'var(--acc)',dash:k[1]==='kCustom'})+T(x+8,yy+15,'kernel '+j+(k[1]==='kCustom'?' (library)':' (loop)'),{w:600,fs:11.5})+T(x+8,yy+31,esc(opsOf(k).join(', ')),{fs:11});
    if(!exp){
      const y2=y+26;s+=arrow(cx+cw/2,y+1,cx+kw/2,y2-1)+arrow(cx+cw/2,y+1,cx+cw-kw/2,y2-1);
      s+=kbox(cx,y2,kw,L[0],1)+kbox(cx+kw+12,y2,kw,L[1],2);y=y2+40;
    }else{
      const y2=y+18;s+=arrow(cx+cw/2,y+1,cx+cw/2,y2-1);s+=kbox(cx+cw/2-kw/2,y2,kw,L[0],1);
      const y3=y2+40+14;s+=arrow(cx+cw/2,y2+41,cx+cw/2,y3-1);
      s+=box(cx+cw/2-95,y3,190,32,{fill:'var(--bg)',stroke:'var(--bad)'})+T(cx+cw/2,y3+14,'e = exp(x), stored',{a:'middle',w:600,fs:12,fill:'var(--bad)'})+T(cx+cw/2,y3+27,'512 KiB written, read twice',{a:'middle',fs:11,fill:'var(--mute)'});
      const y4=y3+32+26;s+=arrow(cx+cw/2,y3+33,cx+kw/2,y4-1)+arrow(cx+cw/2,y3+33,cx+cw-kw/2,y4-1);
      s+=kbox(cx,y4,kw,L[1],2)+kbox(cx+kw+12,y4,kw,L[2],3);y=y4+40;
    }
    y+=8;s+=T(cx+kw/2,y+12,'sum: 256 values',{a:'middle',fs:11})+T(cx+cw-kw/2,y+12,'max: 256 values',{a:'middle',fs:11});y+=18;
    host.innerHTML=RD.svg(W,y,s,'Kernels for one producer with two consumers');
    document.getElementById('xp-dup-cap').innerHTML='<b>'+S.k+' kernels, '+XP.mb(S.b)+' moved.</b> '+(exp?'<code>exp</code> is on the expensive list, so it runs once as its own kernel; x is read once, e is written once and read twice (4 x 512 KiB).':'<code>x * 2</code> is cheap, so each reduction recomputes it inside its own kernel and e never exists in memory; x is read twice (2 x 512 KiB).');
  }
  RD.seg(document.getElementById('xp-dup-seg'),m=>{dupMode=m;dup()});

  // 4. TPU tile padding
  const R=128, TR=8, TC=128;
  function pad(){
    const host=document.getElementById('xp-pad-svg'), c=+document.getElementById('xp-pad-c').value, W=RD.width(host);
    const pr=Math.ceil(R/TR)*TR, pc=Math.ceil(c/TC)*TC, ratio=pr*pc/(R*c);
    const maxC=384, sx=(W-50)/maxC, ah=128, sy=ah/pr, x0=44, y0=6;
    let s='';
    s+='<rect x="'+x0+'" y="'+y0+'" width="'+(pc*sx)+'" height="'+(pr*sy)+'" fill="var(--soft)" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    s+='<rect x="'+x0+'" y="'+y0+'" width="'+(c*sx)+'" height="'+(R*sy)+'" fill="var(--acc)" opacity=".55"/>';
    for(let r=TR;r<pr;r+=TR)s+='<line x1="'+x0+'" x2="'+(x0+pc*sx)+'" y1="'+(y0+r*sy)+'" y2="'+(y0+r*sy)+'" stroke="var(--bg)" stroke-width=".6" opacity=".7"/>';
    for(let k=TC;k<pc;k+=TC)s+='<line x1="'+(x0+k*sx)+'" x2="'+(x0+k*sx)+'" y1="'+y0+'" y2="'+(y0+pr*sy)+'" stroke="var(--ink)" stroke-width="1.2"/>';
    s+=T(x0-4,y0+11,'128',{a:'end',fs:11})+T(x0-4,y0+26,'rows',{a:'end',fs:11,fill:'var(--mute)'});
    s+=T(x0,y0+ah+16,'0',{fs:11});[128,256,384].forEach(v=>{s+=T(x0+v*sx,y0+ah+16,String(v),{a:'end',fs:11})});
    s+=T(x0+Math.min(c,pc)*sx/2,y0+ah/2+4,c>=24?'data':'',{a:'middle',fs:11,w:600});
    if(pc-c>=30)s+=T(x0+(c+(pc-c)/2)*sx,y0+ah/2+4,'padding',{a:'middle',fs:11,fill:'var(--bad)'});
    host.innerHTML=RD.svg(W,y0+ah+22,s,'An array padded to whole tiles');
    document.getElementById('xp-pad-v').textContent='['+R+', '+c+'] pads to ['+pr+', '+pc+']: '+ratio.toFixed(2)+'x';
    document.getElementById('xp-pad-cap').innerHTML='Real bytes in bf16: '+f(R*c*2)+'; padded: '+f(pr*pc*2)+' ('+ratio.toFixed(2)+' times, '+(100*(1-1/ratio)).toFixed(0)+'% of the allocation is padding). Each column band is one 128-wide tile column; each thin row line marks 8 rows.';
  }
  document.getElementById('xp-pad-c').addEventListener('input',pad);

  // 5. the two caches
  function cache(){
    const host=document.getElementById('xp-cache-svg'), W=RD.width(host), narrow=W<560;
    const lw=Math.round(W*(narrow?0.6:0.56)), rx=lw+(narrow?10:18), rw=W-rx-2;
    const L=[
      {t:'call f(x)',d:[],h:24},
      {t:'in-memory cache',d:['key: function object, shapes,','dtypes, weak types, pytree,','static values, tracing context'],h:62,hit:['hit: run the cached','executable']},
      {t:'miss: trace and lower',d:['jaxpr, then StableHLO'],h:36},
      {t:'persistent cache (disk)',d:['key: SHA-256 over 8','ingredients, module first'],h:50,hit:['hit: load it, '+n.cache_warm_cpu+' s CPU','here']},
      {t:'miss: XLA compiles',d:[n.cache_cold_cpu+' s CPU here'],h:36,hit:['written if compile','took 1 s or more']}];
    let s='',y=2;
    L.forEach((r,i)=>{const miss=i===2||i===4;
      s+=box(2,y,lw-2,r.h,{stroke:i===1||i===3?'var(--acc)':'var(--line)',fill:miss?'var(--bg)':'var(--soft)',dash:miss});
      s+=T(10,y+15,esc(r.t),{w:600,fs:12,fill:miss?'var(--bad)':'var(--ink)'})+lines(10,y+30,r.d.map(esc),{fs:11,fill:'var(--mute)'});
      if(r.hit){const hy=y+Math.max(2,r.h/2-17),hh=34;s+=arrow(lw+1,y+r.h/2,rx-1,y+r.h/2,i===4?'var(--mute)':'var(--good)');
        s+=box(rx,hy,rw,hh,{fill:'var(--bg)',stroke:i===4?'var(--line)':'var(--good)'})+lines(rx+7,hy+14,r.hit.map(esc),{fs:11,fill:i===4?'var(--mute)':'var(--good)'})}
      y+=r.h;if(i<L.length-1){s+=arrow(lw/2,y+1,lw/2,y+13);y+=14}});
    host.innerHTML=RD.svg(W,y+2,s,'The in-memory and persistent compilation caches');
  }

  function all(){hero();pjrt();dup();pad();cache()}
  all();RD.onRender(all);RD.onResize(all);
})();
