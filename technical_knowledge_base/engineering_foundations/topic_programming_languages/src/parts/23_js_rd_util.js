// ---- Reading tab: code highlighter, the four-language code panels (.quad), small fills (bench numbers, versions, glossary, reading time) ----
window.RDH=(function(){
  const D=window.RDD||{};const esc=RD.esc;
  const KW={
    py:'def return for in if not and or import from class with as try except raise None True False lambda global del while is pass elif else',
    cpp:'include int long bool char auto const return for if else struct class template typename concept requires unsigned void using namespace static size_t uint64_t uint32_t int64_t true false nullptr',
    rs:'fn let mut for in if else return struct impl trait use pub match Some None Ok Err move as where dyn Box const loop while true false',
    ts:'function const let return for if else async await import from interface type new of number string boolean unknown export true false undefined null'
  };
  const KS={};for(const k in KW)KS[k]=new Set(KW[k].split(' '));KS.js=KS.ts;KS.mjs=KS.ts;
  const LN={py:'Python',cpp:'C++',rs:'Rust',ts:'TypeScript',js:'JavaScript'};
  // highlight source code; hl: array of 1-based line numbers to mark
  function hl(code,lang,hlines){
    const kw=KS[lang]||new Set();const cm=lang==='py'?'#':'//';
    const re=lang==='py'?/(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g
      :/(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])'|`(?:\\.|[^`\\])*`)|(\b\d[\d_']*(?:\.\d+)?(?:u32|u64|i64|ull|n)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
    const lines=code.replace(/\n$/,'').split('\n');const H=new Set(hlines||[]);
    return lines.map((ln,i)=>{let out='',last=0,m;re.lastIndex=0;
      while((m=re.exec(ln))){out+=esc(ln.slice(last,m.index));
        if(m[1])out+='<span class="c">'+esc(m[1])+'</span>';else if(m[2])out+='<span class="s">'+esc(m[2])+'</span>';
        else if(m[3])out+='<span class="n">'+esc(m[3])+'</span>';else out+=kw.has(m[4])?'<span class="k">'+m[4]+'</span>':esc(m[4]);
        last=re.lastIndex}
      out+=esc(ln.slice(last));return H.has(i+1)?'<span class="hl">'+out+'</span>':out}).join('\n');
  }
  // plain output: mark error lines
  function outHtml(t){return t.replace(/\n$/,'').split('\n').map(l=>{const e=esc(l);
    return /^(error|Traceback|\w*Error:|thread '|==\d+==ERROR|WARNING: ThreadSanitizer|SUMMARY|.*runtime error:|libc\+\+abi|.*error TS\d+|.*: error:|.*\berror\[)/.test(l)?'<span class="er">'+e+'</span>':e}).join('\n')}
  const pre=(html,cls)=>'<pre class="cd'+(cls?' '+cls:'')+'">'+html+'</pre>';
  function quad(el){
    const q=D[el.dataset.q];if(!q){el.textContent='(data missing)';return}
    const langs=(el.dataset.l||'py,cpp,rs,ts').split(',').filter(l=>q[l]);
    const hlmap={};(el.dataset.hl||'').split(';').filter(Boolean).forEach(s=>{const [l,n]=s.split(':');hlmap[l]=n.split(',').map(Number)});
    const verdict={};el.querySelectorAll('[data-l]').forEach(p=>{verdict[p.dataset.l]=p.innerHTML});
    el.innerHTML='<div class="seg">'+langs.map((l,i)=>'<button data-m="'+l+'"'+(i===0?' class="on"':'')+'>'+LN[l]+'</button>').join('')+'</div><div class="qbody"></div>';
    const body=el.querySelector('.qbody');
    function show(l){const x=q[l];
      body.innerHTML=(verdict[l]?'<div class="qv lang-'+l+'">'+verdict[l]+'</div>':'')+'<div class="fname">'+esc(x.src)+'</div>'+pre(hl(x.code,l,hlmap[l]))+
        x.runs.map(r=>'<div class="cmd">'+esc(r.cmd)+'</div>'+pre(outHtml(r.out),'out')).join('')}
    RD.seg(el.querySelector('.seg'),show);show(langs[0]);RD.tabLinks(body);
  }
  function fmtS(t){return t<1?(t*1000).toFixed(0)+' ms':t.toFixed(2)+' s'}
  function fills(){
    document.querySelectorAll('#t-read .quad').forEach(quad);
    const B=D.bench&&D.bench.v||{};
    document.querySelectorAll('#t-read .bn').forEach(s=>{const v=B[s.dataset.b];s.textContent=v?fmtS(v.t):'(pending)';if(v)s.title=v.label});
    document.querySelectorAll('#rd-bdate,#t-read .bdate2').forEach(bd=>bd.textContent=D.bench&&D.bench.date?D.bench.date.slice(0,10):'pending');
    const vv=document.getElementById('rd-vers');if(vv&&D.versions){const L=D.versions.split('\n');
      vv.textContent=[L[1],'Python 3.14.8 free-threaded build',L[3]&&L[3].replace(/ \(clang-[^)]*\)/,''),'LLVM clang 23.1.2 for the sanitizers',L[5]&&L[5].replace(/ \([^)]*\)/,''),'TypeScript '+(L[6]||'').replace('tsc Version ',''),'Node '+(L[7]||'').replace('node v',''),'macOS '+L[8],L[9]].filter(Boolean).join(', ')+'; run on '+L[0].replace('date ','')}
    const lc=D.llama&&D.llama.commit?D.llama.commit.slice(0,12):'';document.querySelectorAll('#t-read .lc').forEach(s=>s.textContent=lc);
    const rd=document.getElementById('rd-repo-date');if(rd&&D.repos)rd.textContent=D.repos.fetched_utc.slice(0,10);
    // glossary from every <dfn data-g>
    const gl=document.getElementById('rd-gl');if(gl){const seen={};const items=[];
      document.querySelectorAll('#t-read dfn[data-g]').forEach((d,i)=>{const k=d.textContent.trim();if(seen[k.toLowerCase()])return;seen[k.toLowerCase()]=1;
        if(!d.id)d.id='g-'+k.toLowerCase().replace(/[^a-z0-9]+/g,'-');items.push([k,d.id,d.dataset.g])});
      items.sort((a,b)=>a[0].localeCompare(b[0]));
      gl.innerHTML=items.map(([k,id,g])=>'<div><b><a href="#'+id+'">'+esc(k)+'</a></b>: '+esc(g)+'</div>').join('')}
    // reading time from the prose (code panels and tables excluded)
    const t=document.getElementById('rd-time');if(t){let w=0;document.querySelectorAll('#t-read section').forEach(s=>{s.querySelectorAll('p,li,.co,.cost').forEach(p=>{if(!p.closest('.quad,.card,table,.ff li .cd'))w+=(p.textContent.match(/\S+/g)||[]).length})});
      t.textContent='About '+Math.round(w/230/5)*5+' minutes to read ('+(Math.round(w/100)*100).toLocaleString('en-US')+' words), plus the optional animations and code panels.'}
  }
  return {hl,outHtml,pre,quad,fills,LN,fmtS};
})();
RDH.fills();
