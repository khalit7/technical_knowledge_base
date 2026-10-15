// ---- Diversity meter: measured sets, detail view, measure-your-own-text ----
(function(){
  const D=window.SY||{},esc=RD.esc,$=id=>document.getElementById(id);if(!$('dm-bars')||!D.sets)return;
  const col=g=>g==='real'?'var(--c3)':g==='rephrased'?'var(--c1)':'var(--c2)';
  const MET=[
    ['distinct2','distinct-2','Different two-word sequences / all two-word sequences in the first 100,000 words. Higher = more varied phrasing.',x=>x.toFixed(3),1],
    ['distinct1','distinct-1','Different words / all words in the first 100,000 words. Higher = larger working vocabulary.',x=>x.toFixed(3),1],
    ['distinct4','distinct-4','Different four-word sequences / all four-word sequences. Close to 1 for most text; low values mean long repeated phrases.',x=>x.toFixed(3),1],
    ['gzip_ratio','gzip ratio','Raw bytes / gzip bytes of the first 100,000 words of text. Higher = more redundant.',x=>x.toFixed(2),0],
    ['openings_top10_share','openings','Share of documents starting with one of the set\'s ten most common three-word openings. Higher = more templated.',x=>(100*x).toFixed(1)+'%',0],
    ['homogeneity','embedding similarity','Mean cosine similarity between all pairs of 300 documents (Snowflake arctic-embed-m [CLS] vectors). Higher = documents more alike.',x=>x.toFixed(2),0],
    ['edu_ge3','edu score 3+','Share of 300 documents the FineWeb-Edu classifier scores 3 or more (FineWeb-Edu\'s threshold).',x=>(100*x).toFixed(0)+'%',1],
    ['llm_phrases_per10k','LLM phrases','FineWeb blog\'s proxy phrases for model-written text ("delve", "it\'s important to note", "rich tapestry", ...) per 10,000 words.',x=>x.toFixed(2),0],
    ['neardup_share','near-duplicates','Share of documents in a MinHash pair with estimated Jaccard 0.8 or more (5-word shingles, 128 permutations).',x=>(100*x).toFixed(1)+'%',0],
    ['bench13_share','benchmark 13-grams','Share of documents sharing a 13-word sequence with MMLU, ARC, HellaSwag or GSM8K test items.',x=>(100*x).toFixed(1)+'%',0],
    ['words_median','words per document','Median document length in words.',x=>Math.round(x).toLocaleString('en-US'),1]];
  let met=0,sel=null;
  $('dm-metric').innerHTML=MET.map((m,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+m[1]+'</button>').join('');
  const GN={real:'Real',rephrased:'Rephrased or transformed',generated:'Generated from seeds'};
  function bars(){const m=MET[met],k=m[0],rows=D.sets.filter(s=>s[k]!=null);const mx=Math.max(...rows.map(s=>s[k]))||1;
    $('dm-def').innerHTML='<b>'+m[1]+'</b>: '+esc(m[2]);
    let h='';['real','rephrased','generated'].forEach(g=>{const rs=rows.filter(s=>s.group===g).sort((a,b)=>b[k]-a[k]);if(!rs.length)return;h+='<div class="dm-grp">'+GN[g]+'</div>';
      h+=rs.map(s=>'<button data-k="'+s.key+'"'+(s.key===sel?' class="sel"':'')+' title="'+esc(s.label)+'"><span class="nm">'+esc(s.label)+'</span><span class="tr"><span style="width:'+(100*s[k]/mx).toFixed(1)+'%;background:'+col(s.group)+'"></span></span><span class="v">'+m[3](s[k])+'</span></button>').join('')});
    $('dm-bars').innerHTML=h}
  function detail(key){sel=key;const s=D.sets.find(x=>x.key===key),el=$('dm-detail');if(!s){el.innerHTML='';return}
    const src=(D.set_sources||{})[key]||'';
    let h='<h3>'+esc(s.label)+' <span class="tag">'+GN[s.group]+'</span></h3><p class="small mute">'+esc(src)+'</p><dl class="kv">'+MET.filter(m=>s[m[0]]!=null).map(m=>'<dt>'+m[1]+'</dt><dd>'+m[3](s[m[0]])+'</dd>').join('')+'</dl>';
    h+='<p class="small"><b>Most common openings:</b> '+s.openings_top3.map(o=>'"'+esc(o[0])+' ..." ('+o[1]+')').join(', ')+'</p>';
    if(s.edu_hist){const mx=Math.max(...s.edu_hist)||1;h+='<p class="small"><b>FineWeb-Edu classifier scores</b> (rounded, 300 documents)</p><div class="hist">'+s.edu_hist.map(v=>'<div style="height:'+(100*v/mx).toFixed(0)+'%" title="'+v+'"></div>').join('')+'</div><div class="hist-l">'+s.edu_hist.map((v,i)=>'<span>'+i+': '+v+'</span>').join('')+'</div>'}
    el.innerHTML=h;bars()}
  RD.seg($('dm-metric'),m=>{met=+m;bars()});
  $('dm-bars').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b)detail(b.dataset.k)});
  bars();detail('cosmo_khan');
  // sampling notes
  $('dm-src').innerHTML=D.sets.map(s=>'<li><b>'+esc(s.label)+'</b>: '+esc((D.set_sources||{})[s.key]||'')+'</li>').join('');

  // measure your own text, compared at the same budget
  const WRE=/[A-Za-z]+(?:'[a-z]+)?|[0-9]+/g;
  async function gz(str){if(!('CompressionStream' in window))return null;try{const cs=new CompressionStream('gzip');const w=cs.writable.getWriter();const b=new TextEncoder().encode(str);w.write(b);w.close();
    const buf=await new Response(cs.readable).arrayBuffer();return b.length/buf.byteLength}catch(e){return null}}
  async function measure(){const t=$('dm-in').value;const docs=t.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
    const words=(t.match(WRE)||[]).map(w=>w.toLowerCase());const n=words.length,out=$('dm-out'),cmp=$('dm-cmp');
    if(n<20){out.innerHTML=RD.stat('Words',n,'paste at least a few hundred');cmp.innerHTML='';return}
    const C=D.curves||{budgets:[]},bud=C.budgets.filter(b=>b<=n).pop();const N=bud||n;const f=words.slice(0,N);
    const dn=k=>{const g=new Set();let c=0;for(let i=0;i+k<=f.length;i++){g.add(f.slice(i,i+k).join(' '));c++}return c?g.size/c:0};
    const d1=dn(1),d2=dn(2),d4=dn(4),z=await gz(f.join(' '));
    const op={};docs.forEach(d=>{const w=(d.match(WRE)||[]).slice(0,3).map(x=>x.toLowerCase());if(w.length===3){const k=w.join(' ');op[k]=(op[k]||0)+1}});
    const top=Object.entries(op).sort((a,b)=>b[1]-a[1]).slice(0,10),ts=docs.length?top.reduce((a,b)=>a+b[1],0)/docs.length:0;
    out.innerHTML=RD.stat('Words',n.toLocaleString('en-US'),bud?'compared at the first '+bud.toLocaleString('en-US'):'below the smallest budget (1,000): no comparison')+RD.stat('distinct-1',d1.toFixed(3),'')+RD.stat('distinct-2',d2.toFixed(3),'')+RD.stat('distinct-4',d4.toFixed(3),'')+RD.stat('gzip ratio',z?z.toFixed(2):'n/a',z?'lowercased words joined by spaces':'CompressionStream not available')+RD.stat('Documents',docs.length,docs.length>1?'top-10 openings cover '+(100*ts).toFixed(0)+'%':'separate documents with a blank line');
    if(!bud){cmp.innerHTML='';return}
    const rows=D.sets.map(s=>({s,c:C.sets[s.key]&&C.sets[s.key][String(bud)]})).filter(r=>r.c).sort((a,b)=>b.c.d2-a.c.d2);
    const you={d2,label:'Your text'};const all=rows.map(r=>({label:r.s.label,d2:r.c.d2,gz:r.c.gz,g:r.s.group})).concat([{label:'Your text',d2,gz:z,g:'you'}]).sort((a,b)=>b.d2-a.d2);
    cmp.innerHTML='<p class="small"><b>distinct-2 at '+bud.toLocaleString('en-US')+' words</b>, your text against the first '+bud.toLocaleString('en-US')+' words of each set (gzip in brackets, same preparation):</p><div class="dm-bars">'+all.map(r=>'<button'+(r.g==='you'?' class="sel"':'')+' tabindex="-1"><span class="nm">'+esc(r.label)+'</span><span class="tr"><span style="width:'+(100*r.d2).toFixed(1)+'%;background:'+(r.g==='you'?'var(--ink)':col(r.g))+'"></span></span><span class="v">'+r.d2.toFixed(3)+(r.gz?' <span class="mute">('+r.gz.toFixed(2)+')</span>':'')+'</span></button>').join('')+'</div>'}
  $('dm-go').addEventListener('click',measure);
  $('dm-ex1').addEventListener('click',()=>{const N=['cat','dog','bird','fish','fox'],A=['happy','small','brave','sleepy'],V=['found','lost','saw','made'];let s=[];
    for(let i=0;i<40;i++)s.push('Once upon a time there was a '+A[i%4]+' '+N[i%5]+'. One day the '+N[i%5]+' '+V[i%4]+' a shiny stone in the park. The '+N[i%5]+' was very happy and showed it to a friend. They played together all day and learned to share.');
    $('dm-in').value=s.join('\n\n');measure()});
  $('dm-ex2').addEventListener('click',()=>{const r=$('t-read');$('dm-in').value=[...r.querySelectorAll('section p')].map(p=>p.textContent).join('\n\n');measure()});
})();
