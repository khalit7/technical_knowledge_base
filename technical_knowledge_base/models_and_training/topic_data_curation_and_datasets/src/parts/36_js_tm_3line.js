// ---- Tool map: corpus lineage (animated by year; "as released" vs "today"), corpus table, licences ----
(function(){
  const {D,$,esc,fd,link,toolLink,anim,onRender,onResize,width}=TM;
  const C=D.corpora,byId=Object.fromEntries(C.map(c=>[c.id,c]));
  const KIND={web:['Filtered web','var(--c1)'],mixed:['Mix of sources','var(--c4)'],code:['Code','var(--c2)'],math:['Maths','var(--c5)'],synthetic:['Synthetic','var(--c6)'],pdf:['PDF','var(--c3)'],'open-licence':['Openly licensed','var(--good)']};
  const now=c=>c.avail==='data-removed'||c.avail==='unreachable'?['gone','Not downloadable at its address','var(--mute)']
    :c.avail==='gated'?['gated','Gated: accept terms first','var(--bad)']
    :c.lc==='permissive'?['perm','Open, permissive compilation licence','var(--good)']:['terms','Open, under terms or per-subset licences','var(--c4)'];
  const SHORT={redpajama1:'RedPajama v1',redpajama2:'RedPajama v2',dclm_baseline:'DCLM-baseline',smollm_corpus:'SmolLM-Corpus',olmo2_mix:'OLMo 2 mix',nemotron_cc_v2:'Nemotron-CC v2',dolma3:'Dolma 3',dolma:'Dolma 1.x',stack_v2:'The Stack v2',common_pile:'Common Pile',common_corpus:'Common Corpus',proofpile2:'Proof-Pile-2',pile:'The Pile'};
  const sn=c=>SHORT[c.id]||c.name;
  const lane4=c=>c.kind==='web'?0:c.kind==='mixed'?1:c.kind==='open-licence'?3:2;
  const LANES4=['Filtered web','Mixes','Code, maths, PDF, synthetic','Openly licensed'];
  const LANES3=['Filtered web','Mixes','Domain and open'];
  const tnum=d=>{const p=d.split('-');return +p[0]+((+p[1]||1)-1)/12+((+p[2]||1)-1)/365};
  const T0=2019.6,T1=2026.9;
  const YEARS=[2019,2020,2021,2022,2023,2024,2025,2026];
  const CAP={2019:'<b>2019.</b> C4 (from the T5 paper): one crawl\'s WET text cleaned with simple rules. CCNet, published days later, buckets web text by the perplexity of a Wikipedia language model.',
    2020:'<b>2020.</b> The Pile: 22 curated sources (web, papers, code, books) mixed with hand-set weights. The multi-source mix becomes the standard.',
    2021:'<b>2021.</b> No new corpus on this map, but two methods every later pipeline uses: exact-substring and MinHash dedup (Lee et al., July) and the Gopher quality and repetition rules (DeepMind, December).',
    2022:'<b>2022.</b> No new corpus on this map. BigCode releases The Stack v1 (November, arXiv 2211.15533), permissively licensed code, the ancestor of The Stack v2.',
    2023:'<b>2023.</b> RedPajama v1 replicates LLaMA\'s mix in the open and SlimPajama deduplicates it; RefinedWeb argues that well-filtered web alone beats curated mixes; Dolma documents every step; RedPajama v2 ships a pool with quality signals instead of a filter.',
    2024:'<b>2024.</b> The busiest year: FineWeb ablates every step, FineWeb-Edu and DCLM-baseline add a model-based quality filter, Zyda and Zyda-2 mix the mixes, Nemotron-CC keeps more tokens and rephrases the weak ones, and Common Corpus shows trillions of openly licensed tokens exist.',
    2025:'<b>2025.</b> New sources and cleaner rights: FinePDFs mines PDFs, Common Pile trains a 7B model on openly licensed text only, Nemotron-CC v2 arrives gated, and Dolma 3 publishes a fully documented 104-crawl pipeline.',
    2026:'<b>2026 so far.</b> No new corpus on this map; existing ones keep changing on the Hub (latest edits: '};
  const upd=C.filter(c=>c.h&&c.h.lastModified&&c.h.lastModified>='2026').sort((a,b)=>a.h.lastModified<b.h.lastModified?1:-1);
  CAP[2026]+=upd.map(c=>esc(sn(c))+' '+fd(c.h.lastModified.slice(0,7))).join(', ')+'). Common Crawl still publishes a crawl about every month: '+D.cc.n+' crawls listed, the newest '+esc(D.cc.newest.id||'')+'.';
  let mode='rel',sel=null,step=YEARS.length-1;
  function layout(W){
    const four=W>=640,nl=four?4:3,ax=34,lw=(W-ax-4)/nl,top=46;
    const laneOf=c=>four?lane4(c):Math.min(2,lane4(c));
    // piecewise time scale: each year gets room for its busiest lane, so dense years are not crushed
    const ys={};let acc=top;for(let y=2019;y<=2026;y++){const cnt=Math.max(0,...Array.from({length:nl},(_,l)=>C.filter(c=>c.id!=='commoncrawl'&&laneOf(c)===l&&Math.floor(tnum(c.date))===y).length));
      const h=y===2019?40:26+21*cnt;ys[y]=[acc,h];acc+=h}
    const Y=t=>{const y=Math.max(2019,Math.min(2026,Math.floor(t)));const [a,h]=ys[y];return y===2019?a+Math.max(0,(t-T0))/(2020-T0)*h:a+(t-y)*h};
    const H=acc+20,yr=0,pos={};
    for(let l=0;l<nl;l++){
      const L=C.filter(c=>c.id!=='commoncrawl'&&laneOf(c)===l).sort((a,b)=>tnum(a.date)-tnum(b.date));
      // within a year, nodes sit in date order one row apart, so every year's nodes stay between its tick lines
      const rank={};L.forEach(c=>{const y=Math.floor(tnum(c.date));const r=rank[y]=(rank[y]||0)+1;
        pos[c.id]={x:ax+l*lw+9,y:y===2019?ys[2019][0]+12:ys[y][0]+14+(r-1)*21}});
    }
    const maxY=Math.max(...Object.values(pos).map(p=>p.y));
    return {four,nl,ax,lw,top,Y,H:Math.max(H,maxY+16),pos};
  }
  function draw(){
    const host=$('tm-lplot'),W=Math.max(300,Math.floor(width(host)));
    const G=layout(W),yrEnd=YEARS[step]+1,vis=c=>tnum(c.date)<yrEnd;
    let s='';
    // CC band
    s+='<rect x="0" y="2" width="'+W+'" height="24" rx="5" fill="var(--soft)" stroke="var(--line)"/>'+
      '<text x="8" y="18" font-size="12" font-weight="600">Common Crawl</text><text x="'+(W-8)+'" y="18" font-size="11" text-anchor="end" fill="var(--mute)">monthly crawls since 2008 ('+D.cc.n+' listed)</text>';
    // year ticks
    for(let y=2020;y<=2026;y++){const yy=G.Y(y);s+='<line x1="0" x2="'+W+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)" stroke-dasharray="2 4"/><text x="2" y="'+(yy-3)+'" font-size="11" fill="var(--mute)">'+y+'</text>'}
    // lane headers
    (G.four?LANES4:LANES3).forEach((n,i)=>{s+='<text x="'+(G.ax+i*G.lw+4)+'" y="'+(G.top-8)+'" font-size="11" font-weight="600" fill="var(--mute)">'+n+'</text>'});
    // edges
    C.forEach(c=>{if(!G.pos[c.id]||!vis(c))return;c.parents.forEach(p=>{if(p==='commoncrawl'||!G.pos[p])return;const a=G.pos[p],b=G.pos[c.id];
      const hl=sel&&(sel===c.id||sel===p);const mx=(a.x+b.x)/2;
      s+='<path d="M'+a.x+' '+a.y+' C'+(a.x+(b.x===a.x?24:0))+' '+((a.y+b.y)/2)+','+(b.x+(b.x===a.x?24:0))+' '+((a.y+b.y)/2)+','+b.x+' '+b.y+'" fill="none" stroke="'+(hl?'var(--acc)':'var(--dim)')+'" stroke-width="'+(hl?2.2:1.3)+'"/>'})});
    // nodes
    C.forEach(c=>{const p=G.pos[c.id];if(!p)return;const on=vis(c);const col=mode==='rel'?KIND[c.kind][1]:now(c)[2];const gone=mode==='now'&&now(c)[0]==='gone';
      const isNew=on&&tnum(c.date)>=YEARS[step]&&step<YEARS.length-1;
      const maxch=Math.floor((G.lw-16)/6.4);let lab=sn(c);if(lab.length>maxch)lab=lab.slice(0,maxch-1)+'.';
      s+='<g data-c="'+c.id+'" style="cursor:pointer;opacity:'+(on?1:0.08)+';transition:opacity .4s" role="button" tabindex="'+(on?0:-1)+'" aria-label="'+esc(c.name)+', '+fd(c.date)+'">'+
        '<circle cx="'+p.x+'" cy="'+p.y+'" r="'+(sel===c.id?7:5.5)+'" fill="'+(gone?'var(--bg)':col)+'" stroke="'+col+'" stroke-width="2"/>'+
        (c.parents.includes('commoncrawl')?'<text x="'+(p.x-8)+'" y="'+(p.y+3)+'" font-size="8" text-anchor="end" fill="var(--mute)">CC</text>':'')+
        '<text x="'+(p.x+10)+'" y="'+(p.y+4)+'" font-size="11.5"'+(isNew||sel===c.id?' font-weight="700"':'')+(gone?' fill="var(--mute)" text-decoration="line-through"':'')+'>'+esc(lab)+'</text></g>'});
    host.innerHTML='<svg viewBox="0 0 '+W+' '+G.H+'" width="'+W+'" height="'+G.H+'" role="img" aria-label="Corpus lineage from 2019 to 2026">'+s+'</svg>';
    // legend and caption
    $('tm-lleg').innerHTML=mode==='rel'?Object.values(KIND).map(k=>'<span><i style="background:'+k[1]+'"></i>'+k[0]+'</span>').join('')
      :[['perm'],['terms'],['gated'],['gone']].map(k=>{const x={perm:['Open, permissive compilation licence','var(--good)'],terms:['Open, terms or per-subset licences','var(--c4)'],gated:['Gated','var(--bad)'],gone:['Not downloadable at its address (hollow)','var(--mute)']}[k[0]];
        return '<span><i style="background:'+x[1]+'"></i>'+x[0]+' ('+C.filter(c=>c.id!=='commoncrawl'&&now(c)[0]===k[0]).length+')</span>'}).join('');
    if(mode==='rel')$('tm-lcap').innerHTML=CAP[YEARS[step]]+' <span class="mute small">('+C.filter(c=>c.id!=='commoncrawl'&&vis(c)).length+' corpora by end of '+YEARS[step]+')</span>';
    else{const n=k=>C.filter(c=>c.id!=='commoncrawl'&&vis(c)&&now(c)[0]===k).length;
      $('tm-lcap').innerHTML='<b>Today ('+fd(D.asof)+').</b> Of the corpora released by end of '+YEARS[step]+': '+n('perm')+' open under a permissive compilation licence, '+n('terms')+' open under terms or per-subset licences, '+n('gated')+' gated, and '+n('gone')+' no longer downloadable at their original address (The Pile\'s repository holds only a loader; SlimPajama answers HTTP 401). Only the compilation is licensed: the pages inside keep their own copyright.'}
  }
  function det(id){sel=id;const c=byId[id];draw();
    if(!c){return}
    const h=c.h||{};const rows=[['Released',fd(c.date)+' ('+(c.dsrc==='paper'?'first arXiv version':c.dsrc==='hub'?'Hugging Face repository created':link('source',c.dsrc))+')'],['Owner',esc(c.owner)],['Kind',KIND[c.kind][0]],['Size',esc(c.tok)+' <span class="tm-lbl p">published</span>'],
      ['Licence',esc(c.lic)+(h.gated?' (gated: '+esc(h.gated)+')':'')],['Availability',now(c)[1]+(h.lastModified?'; card last modified '+fd(h.lastModified):'')],
      ['Built from',c.parents.length?c.parents.map(p=>'<a href="#" data-tm-corp="'+p+'">'+esc(byId[p].name)+'</a>').join(', '):'original sources'],
      ['Tools',c.built.length?c.built.map(toolLink).join(', '):'not stated on this map'],['What it is',esc(c.what)],['Verdict','<span class="tm-lbl j">judgement</span> '+esc(c.verdict)],
      ['Sources',c.src.map(s=>link(s[0],s[1])).join('; ')+(c.paperUrl?'; paper: '+link(c.paperTitle||'arXiv',c.paperUrl):'')]];
    $('tm-ldet').innerHTML='<h3>'+esc(c.name)+'</h3><dl class="kv">'+rows.map(r=>'<dt>'+r[0]+'</dt><dd>'+r[1]+'</dd>').join('')+'</dl>';
  }
  $('tm-lplot').addEventListener('click',e=>{const g=e.target.closest('g[data-c]');if(g)det(g.dataset.c)});
  $('tm-lplot').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const g=e.target.closest('g[data-c]');if(g){e.preventDefault();det(g.dataset.c)}}});
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#t-map a[data-tm-corp]');if(!a)return;e.preventDefault();det(a.dataset.tmCorp);$('tm-lcard').scrollIntoView({block:'start'})});
  const A=anim({card:'tm-lcard',ctl:'tm-lctl',n:YEARS.length,ms:2200,label:'Year',draw:i=>{step=i;draw()}});
  A.go(YEARS.length-1);
  $('tm-lmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('tm-lmode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  onRender(draw);onResize(draw);
  // corpus table
  let sk='date',sd=1;
  const COLS=[['name','Corpus',c=>c.name],['date','Released',c=>c.date],['kind','Kind',c=>c.kind],['tok','Size (as stated)',c=>c.tokT||0],['lic','Licence',c=>c.lic],['avail','Availability',c=>now(c)[0]]];
  function ctab(){const L=C.slice().sort((a,b)=>{const g=COLS.find(x=>x[0]===sk)[2],x=g(a),y=g(b);return (x>y?1:x<y?-1:0)*sd});
    $('tm-ctab').innerHTML='<thead><tr>'+COLS.map(c=>'<th data-k="'+c[0]+'" scope="col">'+c[1]+(sk===c[0]?(sd>0?' &#9650;':' &#9660;'):'')+'</th>').join('')+'</tr></thead><tbody>'+
      L.map(c=>'<tr data-k="'+c.id+'"><td>'+esc(c.name)+'</td><td class="n">'+fd(c.date)+'</td><td>'+KIND[c.kind][0]+'</td><td>'+esc(c.tok)+'</td><td>'+esc(c.lic)+'</td><td>'+now(c)[1]+'</td></tr>').join('')+'</tbody>'}
  $('tm-ctab').addEventListener('click',e=>{const th=e.target.closest('th');if(th){sd=sk===th.dataset.k?-sd:1;sk=th.dataset.k;ctab();return}
    const tr=e.target.closest('tr[data-k]');if(tr){det(tr.dataset.k);$('tm-lcard').scrollIntoView({block:'start'})}});
  ctab();
  // licence table
  let lf='';
  function lic(){const L=C.filter(c=>!lf||now(c)[0]===lf||(lf==='custom'&&now(c)[0]==='terms')||(lf==='permissive'&&now(c)[0]==='perm'));
    $('tm-lictab').innerHTML='<thead><tr><th>Corpus</th><th>Licence (card metadata, verbatim)</th><th>Gated</th><th>Status today</th><th>Read before use</th></tr></thead><tbody>'+
      L.map(c=>{const h=c.h||{};return '<tr><td>'+esc(c.name)+'</td><td>'+esc(c.lic)+(h.license_name?' ('+esc(h.license_name)+')':'')+'</td><td>'+(h.gated?esc(h.gated):'no')+'</td><td>'+now(c)[1]+'</td><td>'+c.src.slice(0,1).map(s=>link(s[0],s[1])).join('')+'</td></tr>'}).join('')+'</tbody>'}
  $('tm-licf').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;lf=b.dataset.v;$('tm-licf').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));lic()});
  lic();
  $('tm-traps').innerHTML='<b>1. Model files carry their own licence.</b> '+toolLink('lid176')+'\'s code is MIT but its model is CC-BY-SA 3.0; '+toolLink('nllb_lid')+' is CC-BY-NC 4.0 (non-commercial); NVIDIA\'s classifiers use the NVIDIA Open Model License. '+
    '<b>2. Gated means a contract.</b> Nemotron-CC v2 asks you to accept the NVIDIA Data Agreement for Model Training and to use the data for model training only; The Stack v2 asks you to honour each file\'s original licence and attribution. '+
    '<b>3. A compilation licence is not a content licence.</b> ODC-By and CC-BY on FineWeb, Dolma or DCLM-baseline cover the dataset as a compilation; the pages inside keep their copyright, which is why licence-clean corpora (Common Corpus, Common Pile) exist.';
})();
