// ---- Part 2 Reading (t-tb-read): erasure animation, timings from the recorded hyperfine runs, section nav ----
(function(){
  if(!window.TB||!document.getElementById('t-tb-read'))return;
  const esc=TBX.esc;
  // hyperfine text -> [{name, mean_ms, sd_ms}]
  function hf(txt){const out=[];const re=/Benchmark \d+: (.*)\n\s+Time \(mean ± σ\):\s+([\d.]+) (ms|s) ±\s+([\d.]+) (ms|s)/g;let m;
    while((m=re.exec(txt)))out.push({name:m[1],mean:+m[2]*(m[3]==='s'?1000:1),sd:+m[4]*(m[5]==='s'?1000:1)});return out}
  const load=txt=>{const m=txt.match(/load before: \{ ([\d.]+)/);return m?m[1]:'n/a'};
  // start-up table
  const st=hf(TB.bench.startup);
  [['tb-st-node','node '],['tb-st-tsx','tsx '],['tb-st-bun','bun ']].forEach(([id,p])=>{const r=st.find(x=>x.name.startsWith(p));const el=document.getElementById(id);if(r&&el)el.textContent=Math.round(r.mean)+' ms'});
  // tsc 7 vs 6 bars
  const tb=hf(TB.bench.tsc);const bars=document.getElementById('tb-ts7-bars');
  if(bars&&tb.length){const M=Math.max(...tb.map(r=>r.mean));const base=tb.find(r=>r.name==='tsc 7.0.2');
    bars.innerHTML=tb.slice().sort((a,b)=>a.mean-b.mean).map(r=>'<div class="row"><span class="nm">'+esc(r.name)+'</span><span class="track"><span class="fill" style="width:'+(100*r.mean/M).toFixed(1)+'%;background:'+(r.name.startsWith('tsc 6')?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+(r.mean>=1000?(r.mean/1000).toFixed(2)+' s':Math.round(r.mean)+' ms')+'</span></div>').join('');
    const six=tb.find(r=>r.name.startsWith('tsc 6')),one=tb.find(r=>r.name.includes('--checkers 1'));
    const files=(TB.bench.tsc.match(/zod src: (.*)/)||[])[1]||'';
    document.getElementById('tb-ts7-note').textContent='Type-checking zod 4.6.5’s sources ('+files+', tests and benchmarks removed), strict, no emit. hyperfine, 10 runs after 2 warm-ups, mean ± sd: tsc 7.0.2 '+Math.round(base.mean)+' ± '+Math.round(base.sd)+' ms, tsc 6.0.3 '+(six.mean/1000).toFixed(2)+' ± '+(six.sd/1000).toFixed(2)+' s, ratio '+(six.mean/base.mean).toFixed(1)+'x; tsc 7 with one checker thread '+Math.round(one.mean)+' ms ('+(six.mean/one.mean).toFixed(1)+'x faster than 6.0.3). Load average '+load(TB.bench.tsc)+' at the start (laptop in use). Raw: src/tb/outputs/tsc_bench.txt.'}

  // ---- erasure animation: the same demo.ts through node's type stripping and through tsc's emit ----
  const s3=TB.snip['03_strip'],s4=TB.snip['04_emit'];
  const card=document.getElementById('tb-erase-card');
  if(!card||!s3||!s4)return;
  const src=s3.helpers[0].code.split('\n');
  const outLines=s=>s.out.split('\n').filter(l=>!/^\$ /.test(l));
  const stripped=outLines(s3).filter(l=>!/ExperimentalWarning|--trace-warnings/.test(l)).slice(0,src.length);
  const emitted=outLines(s4);
  // which characters of each source line are type syntax: where the stripped line has a space instead
  const masks=src.map((l,i)=>{const s=stripped[i]||'';return [...l].map((c,k)=>c!==' '&&s[k]===' ')});
  const typeChars=masks.reduce((a,m)=>a+m.filter(Boolean).length,0);
  let mode='strip';
  const codeEl=document.getElementById('tb-erase-code'),cap=document.getElementById('tb-erase-cap');
  function lineHTML(n,l,mask,cls){
    let h='',inT=false;
    for(let k=0;k<l.length;k++){const t=mask&&mask[k];if(t&&!inT){h+='<span class="ty-p'+(cls||'')+'">';inT=true}if(!t&&inT){h+='</span>';inT=false}h+=esc(l[k])}
    if(inT)h+='</span>';
    return '<span class="ln"><i>'+n+'</i>'+(h||' ')+'</span>'}
  const CAP={
    strip:['<b>1/3 The source.</b> demo.ts: an interface, annotations on parameters, variables and the return type, and an <code>as</code>.',
      '<b>2/3 Find the type syntax.</b> '+typeChars+' characters are types: they mean something to tsc and nothing to JavaScript.',
      '<b>3/3 Replace them with spaces.</b> What remains is plain JavaScript that V8 runs. Every line and column is where it was, so an error message points at the same line and column of your source. This is <code>node file.ts</code> (real output of <code>stripTypeScriptTypes</code>).'],
    emit:['<b>1/3 The source.</b> The same demo.ts.',
      '<b>2/3 Find the type syntax.</b> tsc removes the same '+typeChars+' characters.',
      '<b>3/3 Write a new file.</b> tsc prints fresh JavaScript: the interface line is gone, the loop is reformatted onto two lines and <code>export {};</code> is added (the file is a module), so line numbers no longer match the source. That is why <code>tsc --init</code> turns on <code>sourceMap</code>: a map from output positions back to the .ts file. Highlighted lines are not in the source.']};
  function draw(i){
    let h='';
    if(i<2)h=src.map((l,k)=>lineHTML(k+1,l,i===1?masks[k]:null)).join('');
    else if(mode==='strip')h=src.map((l,k)=>lineHTML(k+1,l,masks[k],' gone')).join('');
    else{const set=new Set(src.map(x=>x.trim()));h=emitted.map((l,k)=>{const raw=lineHTML(k+1,l,null);return set.has(l.trim())?raw:raw.replace('class="ln"','class="ln new"')}).join('')}
    codeEl.innerHTML=h;cap.innerHTML=CAP[mode][i];
  }
  const an=RD.anim({card:'tb-erase-card',ctl:'tb-erase-ctl',n:3,ms:2200,draw,label:'Erasure step'});
  RD.seg(document.getElementById('tb-erase-mode'),m=>{mode=m;an.reset(3);an.play()});
  TBX.onTab('t-tb-read',()=>an.redraw());
})();
// section nav highlight for Part 2
(function(){const nav=document.getElementById('tb-nav');if(!nav||!('IntersectionObserver' in window))return;
  const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)});})();
