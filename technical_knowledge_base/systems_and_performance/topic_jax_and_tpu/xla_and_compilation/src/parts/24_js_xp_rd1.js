// ---- Reading sections 1 to 3: lowering source walk, four forms, expansion table, PJRT, the pass staircase, the pass table ----
(function(){
  const D=XP.D, esc=XP.esc, f=XP.f;
  // 1. source walk
  const st=document.getElementById('xp-low-src');
  st.innerHTML='<thead><tr><th>Step</th><th>Where</th><th>Line</th></tr></thead><tbody>'+D.low.src.map(s=>'<tr><td>'+esc(s.step)+'</td><td>'+XP.src(s)+'</td><td class="xp-q">'+esc(s.quote.split('\n')[0].trim().slice(0,110))+'</td></tr>').join('')+'</tbody>';
  // 1. four forms
  const fc=D.low.fcounts, names={jaxpr:'jaxpr',stablehlo:'StableHLO',hlo:'HLO before XLA',opt_hlo:'Optimised HLO'};
  const cnt=document.getElementById('xp-forms-cnt'), txt=document.getElementById('xp-forms-txt');
  function form(m){
    txt.textContent=D.low.forms[m];
    const n={jaxpr:fc.jaxpr_eqns+' equations',stablehlo:fc.stablehlo_ops+' operations',hlo:fc.hlo_instructions+' instructions',opt_hlo:fc.opt_kernels+' kernels'}[m];
    cnt.innerHTML=RD.stat('Form',names[m])+RD.stat('Size',XP.kb(fc.bytes[m]),'of text')+RD.stat('Count',n.split(' ')[0],m==='opt_hlo'?'kernels, of which '+fc.opt_fusions+' fusions (bodies listed first)':n.split(' ').slice(1).join(' '));
  }
  RD.seg(document.getElementById('xp-forms-seg'),form);form('jaxpr');
  // 1. expansion table
  const et=document.getElementById('xp-low-exp');
  et.innerHTML='<thead><tr><th>Primitive</th><th class="num">jaxpr eqns</th><th class="num">StableHLO ops</th><th class="num">HLO instrs</th><th>Main StableHLO ops</th></tr></thead><tbody>'+
    D.low.rows.slice(0,16).map(r=>'<tr><td><code>'+esc(r[0])+'</code></td><td class="num">'+f(r[1])+'</td><td class="num">'+f(r[2])+'</td><td class="num">'+f(r[3])+'</td><td class="xp-q">'+Object.entries(r[4]).slice(0,3).map(([k,v])=>esc(k)+' '+v).join(', ')+'</td></tr>').join('')+'</tbody>';
  // 2. PJRT
  const pj=D.low.pjrt;
  document.getElementById('xp-pjrt').innerHTML=RD.stat('Platform',esc(pj.platform),'device '+esc(pj.device))+RD.stat('Backend factories',esc(pj.backend_factories.join(', ')),'registered')+RD.stat('Initialised',esc(pj.backends_initialised.join(', ')),'backends')+RD.stat('Plugins found',pj.jax_plugins_entry_points.length?esc(pj.jax_plugins_entry_points.join(', ')):'none','jax_plugins entry points');
  // 3. pass table
  const pt=document.getElementById('xp-pass-tab');
  const rows=D.pipe.cat.filter(c=>c[6]||c[7]||c[0]==='rematerialization'||c[0]==='cpu_multi_output_fusion');
  const lines=a=>a&&a.length?a.slice(0,4).map(x=>typeof x==='number'?x:esc(String(x).replace('fusion_pipeline.cc:','fp:'))).join(', ')+(a.length>4?' ...':''):'<span class="mute">none</span>';
  pt.innerHTML='<thead><tr><th>Pass (class)</th><th>name() at</th><th>CPU lines</th><th>GPU lines</th><th class="num">Changed attn / step</th><th>What it does</th></tr></thead><tbody>'+
    rows.map(c=>'<tr><td data-h=""><code>'+esc(c[0])+'</code><br><span class="xp-note">'+esc(c[1])+'</span></td><td data-h="name() at"><a href="https://github.com/openxla/xla/blob/'+D.meta.xla+'/'+c[2]+'#L'+c[3]+'" target="_blank" rel="noopener noreferrer"><code>'+esc(c[2].split('/').pop())+':'+c[3]+'</code></a></td><td data-h="CPU">'+lines(c[4])+'</td><td data-h="GPU">'+lines(c[5])+'</td><td data-h="Changed" class="num">'+c[6]+' / '+c[7]+'</td><td data-h="">'+esc(XP.pdesc(c[0])||(c[0]==='rematerialization'?'Recomputes values to fit a memory limit (section 7). GPU only.':c[0]==='cpu_multi_output_fusion'?'Multi-output fusion on CPU: only added when a backend option asks for it.':''))+'</td></tr>').join('')+'</tbody>';
  document.getElementById('xp-gpu-only').innerHTML=D.pipe.gpu_only.map(g=>'<code>'+esc(g[0])+'</code> ('+g[1].slice(0,2).map(x=>esc(String(x))).join(', ')+')').join(', ');
  // cse numbers for the predict
  const ss=D.pass.step.steps;const ci=ss.findIndex(s=>s[2]==='cse');
  if(ci>0){document.getElementById('xp-cse-from').textContent=f(ss[ci-1][3]);document.getElementById('xp-cse-to').textContent=f(ss[ci][3])}
  // layouts numbers (section 5) from the step's pass deltas
  const lay=ss.find(s=>s[2]==='layout-assignment'), rd=ss.find(s=>s[2]==='reshape-decomposer');
  document.getElementById('xp-lay-copies').textContent=lay?f(lay[7].copy||0):'?';
  document.getElementById('xp-lay-bitcasts').textContent=rd?f(rd[7].bitcast||0):'?';

  // 3. the staircase: same program, pass by pass, stepped in seven explained stretches (#sx-stair), never one step per pass (the long-replay rule)
  const host=document.getElementById('xp-stair-svg'), cn=document.getElementById('xp-stair-cnt');
  let prog='step';
  // stretch boundaries by pass name, so both programs split the same way
  function stretches(S){const at=(nm,from)=>{for(let k=from||0;k<S.length;k++)if(S[k][2]===nm)return k;return -1};
    const b1=at('algsimp'),b2=at('transpose-folding'),b3=at('cse',b2)+1,b4=at('dot-library-rewriter'),b5=at('fusion',b4),b6=at('fusion-wrapper',b5)+1;
    return [[0,b1],[b1,b2],[b2,b3],[b3,b4],[b4,b4+1],[b5,b6],[b6,S.length]]}
  function draw(g){
    const P=D.pass[prog], S=P.steps, G=stretches(S), W=RD.width(host), H=200, padL=44, padB=26, padT=10;
    const n=S.length, maxI=Math.max(P.start,...S.map(s=>s[3])), bw=(W-padL-8)/(n+1), lo=G[g][0], hi=G[g][1];
    const y=v=>H-padB-(H-padB-padT)*v/maxI;
    let s='';
    for(let t=0;t<=4;t++){const v=maxI*t/4;s+='<line x1="'+padL+'" x2="'+(W-4)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(padL-4,y(v)+3,f(Math.round(v)),{a:'end',fs:11})}
    s+='<rect x="'+(padL+1)+'" y="'+y(P.start)+'" width="'+Math.max(1,bw-2)+'" height="'+(H-padB-y(P.start))+'" fill="var(--dim)"><title>start: '+P.start+'</title></rect>';
    let path='';
    S.forEach((st,k)=>{const x=padL+(k+1)*bw, on=k>=lo&&k<hi, past=k<lo, fut=k>=hi;
      s+='<rect class="'+(on?'rd-new':'')+'" x="'+(x+1)+'" y="'+y(st[3])+'" width="'+Math.max(1,bw-2)+'" height="'+(H-padB-y(st[3]))+'" fill="'+(on?'var(--c2)':past?'var(--acc)':'var(--acc2)')+'" opacity="'+(fut?.45:1)+'"><title>'+esc(st[2])+': '+st[3]+'</title></rect>';
      if(k<hi)path+=(path?'L':'M')+(x+bw/2).toFixed(1)+','+y(st[4]).toFixed(1)});
    if(path)s+='<path d="'+path+'" fill="none" stroke="var(--c3)" stroke-width="1.6"/>';
    s+=RD.t(padL,H-8,'start',{fs:11})+RD.t(W-6,H-8,'end of pipeline',{a:'end',fs:11});
    host.innerHTML=RD.svg(W,H,s,'Instructions after each pass');
    const first=S[lo], last=S[hi-1], prev=lo?S[lo-1][3]:P.start;
    cn.innerHTML=RD.stat('Stretch',(g+1)+' of '+G.length,esc(first[2])+(hi-lo>1?' to '+esc(last[2]):''))+RD.stat('Instructions',f(prev)+' to '+f(last[3]),(last[3]-prev>=0?'+':'')+f(last[3]-prev)+' in this stretch')+RD.stat('Fusions',f(last[4]),'top-level, after it')+RD.stat('Passes',String(hi-lo),'that changed the text');
  }
  const an=RD.anim({card:'xp-stair-card',ctl:'xp-stair-ctl',n:7,draw,ms:4200,label:'Stretch',list:'sx-stair'});
  RD.seg(document.getElementById('xp-stair-seg'),m=>{prog=m;an.reset(7)});
  RD.onResize(()=>an.redraw());
})();
