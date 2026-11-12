// ---- Reading: static figures drawn at the measured width (memory to scale, serving-layer map); the hero, the router and the expert-parallel layer are 3D stages since 2026-11-12 (40_js_sc_*.js) ----
// Numbers from window.DDC (recompute.py, the Capacity planner's model). Nothing here moves by itself.
(function(){
  const C=window.DDC;if(!C)return;
  const $=id=>document.getElementById(id);
  const fmt=(x,d)=>(+x).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const T=(x,y,s,o)=>RD.t(x,y,s,Object.assign({fill:'var(--ink)',fs:11.5},o||{}));
  const rect=(x,y,w,h,fill,o)=>'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+h+'" rx="'+((o&&o.rx)||2)+'" fill="'+fill+'"'+(o&&o.stroke?' stroke="'+o.stroke+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'/>';
  const line=(x1,y1,x2,y2,col,o)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+((o&&o.w)||1.6)+'"'+(o&&o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o&&o.end?' marker-end="url(#'+o.end+')"':'')+(o&&o.start?' marker-start="url(#'+o.start+')"':'')+'/>';
  const mk=id=>'<marker id="'+id+'" viewBox="0 0 8 8" refX="6.5" refY="4" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="var(--acc)"/></marker>';
  const MB=b=>fmt(b/1e6,2)+' MB';

  // 2. memory per GPU to scale: one H200 against TP 2
  function mem(){
    const el=$('dd-mem');if(!el||!C.mem)return;
    const W=RD.width(el),L=4,R=6,bw=W-L-R,cap=141,sx=v=>bw*v/cap,rowH=96;
    const rows=[['One H200, the whole model (141 GB)',C.mem['1'],'cache for '+fmt(C.mem['1'].seqs,0)+' conversations'],
      ['Tensor parallel 2: each of two H200s',C.mem['2'],'cache for half of each of '+fmt(C.mem['2'].seqs,0)+' conversations']];
    let b='';
    rows.forEach((r,i)=>{const m=r[1],y=6+i*rowH,yb=y+18,h=26;
      b+=T(L,y+12,r[0],{w:600,fs:12.5});
      const seg=[['weights '+fmt(m.w_gb)+' GB',m.w_gb,'var(--c1)'],['reserved',m.act_gb+m.ovh_gb+m.fixed_gb,'var(--dim)'],['KV cache '+fmt(m.pool_gb)+' GB',m.pool_gb-m.fixed_gb,'var(--c2)'],['8% kept free',cap-m.usable_gb,'var(--soft)']];
      let x=L;const out=[];seg.forEach((s,q)=>{const w=sx(s[1]);b+=rect(x,yb,w,h,s[2],{op:s[2]==='var(--soft)'?1:0.75,rx:0,stroke:s[2]==='var(--soft)'?'var(--line)':null});
        const tw=s[0].length*6.4;if(tw<w-6)b+=T(x+4,yb+17,s[0],{fs:11.5,w:600});else if(q===0)out.push(s[0]);x+=w});
      b+=T(L,yb+h+16,r[2],{fill:'var(--c2)',fs:11.5,w:600});
      if(out.length)b+=T(L,yb+h+31,'left bar: '+out.join('; '),{fill:'var(--mute)',fs:11});
    });
    el.innerHTML=RD.svg(W,6+rows.length*rowH-8,b,'GPU memory to scale, one H200 against tensor parallel 2');
  }

  // 5. serving-layer map
  function stack(){
    const el=$('dd-stack');if(!el)return;
    const cols=['Dynamo','llm-d','KServe','Ray Serve','Triton','TRT-LLM'];
    const rows=[['Runs the model (engine)','RRRRRF'],['HTTP front end','F...FF'],['Routes across engines','FFRF.F'],['Prefill/decode split','FFRFRF'],['Moves the KV cache','FRRR.F'],['Resizes the pools','FFR...'],['KV tiers beyond GPU','FF....'],['Non-LLM models','..F.F.']];
    const W=RD.width(el),narrow=W<560,lab=narrow?124:190,cw=(W-lab-4)/cols.length,hd=narrow?40:24,rh=24;let b='';
    cols.forEach((c,j)=>{const x=lab+j*cw+cw/2;b+=T(j===cols.length-1&&narrow?W-2:x,narrow?(j%2?34:16):16,c,{a:j===cols.length-1&&narrow?'end':'middle',fs:11,w:600})});
    rows.forEach((r,i)=>{const y=hd+i*rh;if(i%2===0)b+=rect(0,y,W,rh,'var(--soft)',{rx:0});b+=T(4,y+16,narrow?r[0].replace(' (engine)',''):r[0],{fs:11});
      [...r[1]].forEach((m,j)=>{const x=lab+j*cw+cw/2;if(m==='F')b+='<circle cx="'+x+'" cy="'+(y+12)+'" r="6" fill="var(--acc)"/>';else if(m==='R')b+='<circle cx="'+x+'" cy="'+(y+12)+'" r="5.2" fill="none" stroke="var(--acc)" stroke-width="1.8"/>'})});
    el.innerHTML=RD.svg(W,hd+rows.length*rh+4,b,'Which serving-layer project does which job');
  }

  function all(){mem();stack()}
  RD.onRender(all);RD.onResize(all);all();
})();
