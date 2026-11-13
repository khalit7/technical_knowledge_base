// ---- Run tab: what the router saved (the replay itself is the 3D stage in 32_js_sc_rt.js), the router walker, the FrontierCS graph ----
const SQ=512; // bytes per square
// What the router saved: the session's library reads against two loading strategies it avoided, as squares of 512 bytes on one scale
(function(){if(!$('rpcSvg'))return;
  const R=LIB.reads.filter(r=>r[3]),S=LIB.session,desc=LIB.meta.description_chars_total,vs=LIB.repos.filter(r=>r[0]==='vllm-project/vllm'||r[0]==='sgl-project/sglang');
  const T=t=>R.filter(r=>r[0]>=t).reduce((a,r)=>a+r[2],0),rb=T(0),graphFiles=T(64.8);
  const ST=[{n:'Router (what the agent did)',parts:[['router pages',R.filter(r=>r[1].includes('router')).reduce((a,r)=>a+r[2],0),'var(--c3)'],['graph files read',graphFiles,'var(--c1)']]},
    {n:'Every description up front',parts:[['1,000 descriptions',desc,'var(--mute)'],['the same graph files',graphFiles,'var(--c1)']]},
    {n:'Both graphs whole',parts:[['router SKILL.md',R[0][2],'var(--c3)'],['vLLM and SGLang graphs, every file',vs.reduce((a,r)=>a+r[3],0),'var(--mute)']]}];
  ST.forEach(s=>s.t=s.parts.reduce((a,p)=>a+p[1],0));
  window.R2S_CMP=ST.map(s=>s.t);
  fit($('rpcSvg'),w=>{const cs=w<520?5:6,gap=1,per=Math.floor((w-2)/(cs+gap));let y=0,s='';
    ST.forEach(st=>{s+=tx(0,y+13,st.n,{fs:12.5,w:'700'})+tx(w,y+13,st.t.toLocaleString('en-GB')+' bytes',{fs:12,a:'end',c:'var(--mute)'});y+=20;let q=0;
      st.parts.forEach(([n,b,c])=>{const m=Math.max(1,Math.round(b/SQ));for(let j=0;j<m;j++,q++)s+='<rect x="'+((q%per)*(cs+gap))+'" y="'+(y+Math.floor(q/per)*(cs+gap))+'" width="'+cs+'" height="'+cs+'" fill="'+c+'"/>'});
      y+=Math.ceil(q/per)*(cs+gap)+6;
      let lx=0;st.parts.forEach(([n,b,c])=>{const t=n+' '+b.toLocaleString('en-GB');if(lx+t.length*6.5+16>w&&lx>0){lx=0;y+=15}s+=rc(lx,y+3,9,9,c,{r:2})+tx(lx+13,y+12,t,{fs:11.5});lx+=t.length*6.5+30});y+=26});
    s+=tx(0,y+4,'One square = '+SQ+' bytes (about 128 tokens).',{fs:11.5,c:'var(--mute)'});
    $('rpcSvg').innerHTML=svgW(w,y+10,s,'Bytes in context for three loading strategies')});
  $('rpOut').innerHTML='<b>Same scale, three strategies:</b> router '+rb.toLocaleString('en-GB')+' bytes; every description up front '+ST[1].t.toLocaleString('en-GB')+' ('+(ST[1].t/rb).toFixed(1)+'×); both graphs whole '+ST[2].t.toLocaleString('en-GB')+' ('+(ST[2].t/rb).toFixed(1)+'×). Against the whole library ('+LIB.meta.library_bytes.toLocaleString('en-GB')+' bytes) the routed reads are '+(LIB.meta.library_bytes/rb).toFixed(0)+' times smaller. vLLM\'s graph alone is '+(vs.find(r=>r[0].startsWith('vllm'))[3]/1000).toFixed(0)+' KB, mostly references; the session read '+(100*R.filter(r=>r[1].includes('/vllm/')).reduce((a,r)=>a+r[2],0)/vs.find(r=>r[0].startsWith('vllm'))[3]).toFixed(0)+'% of it. The session itself sent '+S.uncached_input_tokens.toLocaleString('en-GB')+' uncached input tokens and wrote '+S.output_tokens.toLocaleString('en-GB')+' output tokens over '+S.assistant_turns+' turns, so the skill reads are a small part of what it spent.';
  onTab('t-run',()=>refit($('rpcSvg')));
})();

// Router walker
(function(){const A=LIB.areas;let ai=A.findIndex(a=>a.n==='Model Deployment and Optimization'),fi=0,ri=0;
  const selA=$('wkA'),selF=$('wkF'),selR=$('wkR');
  selA.innerHTML=A.map((a,i)=>'<option value="'+i+'">'+a.n+'</option>').join('');selA.value=ai;
  function fillF(){const F=A[ai].f;selF.innerHTML=F.map((f,i)=>'<option value="'+i+'">'+f.n+' ('+f.m.length+')</option>').join('');fi=Math.min(fi,F.length-1);selF.value=fi;fillR()}
  function fillR(){const M=A[ai].f[fi].m.slice().sort((x,y)=>LIB.repos[x][0].localeCompare(LIB.repos[y][0]));selR.innerHTML=M.map(i=>'<option value="'+i+'">'+LIB.repos[i][0]+'</option>').join('');
    const pick=M.find(i=>LIB.repos[i][0]==='vllm-project/vllm');ri=pick!=null?pick:M[0];selR.value=ri;refit($('wkSvg'))}
  selA.addEventListener('change',()=>{ai=+selA.value;fi=0;fillF()});selF.addEventListener('change',()=>{fi=+selF.value;fillR()});selR.addEventListener('change',()=>{ri=+selR.value;refit($('wkSvg'))});
  function draw(w){const a=A[ai],f=a.f[fi],r=LIB.repos[ri];
    const parts=[['router SKILL.md',LIB.router.skill,'var(--c3)'],['area page',a.p,'var(--c3)'],['family page',f.p,'var(--c3)'],['entry SKILL.md',r[1],'var(--c1)']];
    const tot=parts.reduce((s,p)=>s+p[1],0),mx=Math.max(tot,LIB.meta.description_chars_total);
    const bw=w-4,sc=bw/mx;let y=0,s='',x=0;
    s+=tx(0,y+12,'Routed path: '+tot.toLocaleString('en-GB')+' bytes',{fs:12,w:'700'});y+=18;
    parts.forEach(p=>{s+='<g><title>'+p[0]+': '+p[1]+' bytes</title>'+rc(x,y,Math.max(1,p[1]*sc-1),20,p[2],{r:2})+'</g>';x+=p[1]*sc});y+=38;
    let lx=0;parts.forEach(p=>{const t=p[0]+' '+p[1].toLocaleString('en-GB');if(lx+t.length*6.6>w){lx=0;y+=16}s+=rc(lx,y-9,10,10,p[2],{r:2})+tx(lx+14,y,t,{fs:11});lx+=t.length*6.6+28});y+=14;
    s+=tx(0,y+12,'Every repository description up front: '+LIB.meta.description_chars_total.toLocaleString('en-GB')+' characters',{fs:12,w:'700'});y+=18;
    s+=rc(0,y,LIB.meta.description_chars_total*sc,20,'var(--mute)',{r:2,op:.6});y+=28;
    $('wkSvg').innerHTML=svgW(w,y,s,'Bytes read along the route');
    $('wkScope').innerHTML='<b>'+f.n+'</b>: '+f.s;
    $('wkOut').innerHTML='<b>'+r[0]+'</b>: '+r[2]+' skills, '+r[3].toLocaleString('en-GB')+' bytes in its graph. Opening the entry skill leaves '+(r[3]-r[1]).toLocaleString('en-GB')+' bytes ('+(100*(1-r[1]/r[3])).toFixed(1)+'%) in '+(r[2]-1)+' sub-skills, references and scripts unopened until a step needs them. This family lists '+f.m.length+' repositories; the router says to open only the one or two that fit. '+(a.f.length)+' families in this area.'}
  fillF();fit($('wkSvg'),draw)})();

// FrontierCS graph
(function(){const N=LIB.fcs.nodes,E=LIB.fcs.edges,SZ=LIB.fcs.sizes;let sel=0;
  const short={'algorithmic-problem-solving':'entry: recovery router','checker-and-local-evaluation':'checker and evaluation','contest-solver-engineering':'solver engineering','interactive-problem-solving':'interactive','model-and-route-algorithms':'model and route','plateau-escape':'plateau escape','reactive-online-decision-problem-solving':'reactive online','testlib-cpp-judging':'testlib judging','validation-and-experiments':'validation'};
  const host=$('fgSvg');
  function draw(w){const narrow=w<560,H=narrow?380:400,cx=w/2,cy=H/2,Rr=narrow?Math.min(w/2-86,H/2-40):Math.min(w/2-150,H/2-40);
    const P=N.map((n,i)=>i===0?{x:cx,y:cy}:{x:cx+Rr*Math.cos(-Math.PI/2+(i-1)*2*Math.PI/8),y:cy+Rr*Math.sin(-Math.PI/2+(i-1)*2*Math.PI/8)});
    const mxs=Math.max(...N.map(n=>SZ[n])),rad=n=>(narrow?5:7)+(narrow?7:11)*Math.sqrt(SZ[n]/mxs);let s='';const nm=N[sel];
    E.forEach(([a,b])=>{const i=N.indexOf(a),j=N.indexOf(b),p=P[i],q=P[j],out=a===nm,inn=b===nm;
      const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,ox=-uy*4,oy=ux*4,r1=rad(a),r2=rad(b)+3;
      const c=out?'var(--c1)':inn?'var(--c2)':'var(--line)';
      s+='<line x1="'+(p.x+ux*r1+ox)+'" y1="'+(p.y+uy*r1+oy)+'" x2="'+(q.x-ux*r2+ox)+'" y2="'+(q.y-uy*r2+oy)+'" stroke="'+c+'" stroke-width="'+(out||inn?2:1)+'" marker-end="url(#fgA'+(out?'o':inn?'i':'n')+')"'+(out||inn?'':' opacity=".7"')+'/>'});
    N.forEach((n,i)=>{const p=P[i],r_=rad(n);let lx=p.x,ly=p.y+r_+14,la='middle';
      if(i>0){const ux=(p.x-cx)/Rr,uy=(p.y-cy)/Rr;lx=p.x+ux*(r_+6);ly=p.y+uy*(r_+8)+4+(uy>0.5?8:uy<-0.5?-4:0);la=ux>0.3?'start':ux<-0.3?'end':'middle'}else{ly=p.y-r_-8}
      s+='<g data-i="'+i+'" style="cursor:pointer" role="button" tabindex="0" aria-label="'+short[n]+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+r_+'" fill="'+(i===sel?'var(--c1)':'var(--bg)')+'" stroke="var(--ink)" stroke-width="1.2"/>'+tx(lx,ly,short[n],{fs:11,a:la,w:i===sel?'700':'400'})+'</g>'});
    const mk=(id,c)=>'<marker id="fgA'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="'+c+'"/></marker>';
    host.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="FrontierCS skill graph" style="max-width:100%;height:auto"><defs>'+mk('o','var(--c1)')+mk('i','var(--c2)')+mk('n','var(--line)')+'</defs>'+s+'</svg>';
    host.querySelectorAll('g[data-i]').forEach(g=>{const go=()=>{sel=+g.dataset.i;refit(host)};g.addEventListener('click',go);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();go()}})});
    const o=E.filter(e=>e[0]===nm).map(e=>short[e[1]]),inn=E.filter(e=>e[1]===nm).map(e=>short[e[0]]);
    $('fgOut').innerHTML='<b>'+short[nm]+'</b> (<code>'+nm+'</code>, '+SZ[nm].toLocaleString('en-GB')+' bytes): links to '+o.length+' ('+(o.join(', ')||'none')+'); linked from '+inn.length+' ('+(inn.join(', ')||'none')+'). <span class="mute">Arrows in the selected node\'s colour go out of it; arrows in the second colour come into it. '+E.length+' links in all.</span>'}
  fit(host,draw)})();
