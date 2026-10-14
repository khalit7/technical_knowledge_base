// ---- Reading sections 3 and 5: DCLM filter bars, the all-corpora table, the published-study viewer ----
(function(){
  const P=window.PC,esc=RD.esc;
  const bars=(rows,opt)=>{opt=opt||{};const lo=opt.lo!=null?opt.lo:0,mx=Math.max(...rows.map(r=>r[1])),d=v=>opt.dec!=null?v.toFixed(opt.dec):String(v);
    return '<div class="bars">'+rows.map(r=>{const hl=opt.hl&&opt.hl(r[0]);return '<div class="row'+(hl?' hl':'')+'"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+Math.max(1,100*(r[1]-lo)/(mx-lo)).toFixed(1)+'%;background:'+(hl?'var(--c2)':'var(--c1)')+'"></span></span><span class="val">'+d(r[1])+'</span></div>'}).join('')+'</div>'};
  const study=id=>(P.ablations||[]).find(s=>s.id===id);
  function dclm(){const el=document.getElementById('pc-dclm');if(!el)return;const s=study('dclm_t4');
    el.innerHTML='<div class="small mute">Core score, axis from 25 (differences are a few points)</div>'+bars(s.rows,{lo:25,dec:1,hl:n=>/fastText/.test(n)})}

  // table of every corpus
  let gk='all';
  const KN={raw:'raw crawl',web:'English web',mix:'mixture',pool:'pool',code:'code',math:'math',papers:'papers, books, PDFs',books:'books',pdf:'PDFs',multi:'multilingual',open:'openly licensed'};
  const fmtTok=b=>b==null?'':b>=1000?(b/1000).toFixed(b>=10000?0:1).replace(/\.0$/,'')+'T':Math.round(b)+'B';
  function gen(){const el=document.getElementById('pc-gen-tab');if(!el)return;const C=(P.corpora||[]).slice().sort((a,b)=>a.date<b.date?-1:1);
    const ch=document.getElementById('pc-gen-chips');
    if(!ch.dataset.done){ch.dataset.done=1;const ks=['all',...new Set(C.map(c=>c.kind))];ch.innerHTML=ks.map(k=>'<button data-k="'+k+'"'+(k===gk?' class="on"':'')+'>'+(k==='all'?'All':KN[k]||k)+'</button>').join('');
      ch.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gk=b.dataset.k;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));gen()})}
    const rows=C.filter(c=>gk==='all'||c.kind===gk);
    el.innerHTML='<table><thead><tr><th>Corpus</th><th>Released</th><th class="num">Tokens</th><th>Counted with</th><th>Licence field</th></tr></thead><tbody>'+rows.map(c=>'<tr><td><a href="#" data-pcsel="'+c.id+'">'+esc(c.name)+'</a></td><td>'+esc(c.date)+'</td><td class="num">'+fmtTok(c.tokens_b)+'</td><td class="small">'+esc((c.tok||'').split(/[(;,]/)[0])+'</td><td><span class="pc-lic '+(c.lic_cls==='open'?'open':c.lic_cls==='res'?'res':'mid')+'">'+esc(c.lic.split(' (')[0])+'</span></td></tr>').join('')+'</tbody></table>';
  }
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-pcsel]');if(!a)return;e.preventDefault();window.PC_SELECT&&window.PC_SELECT(a.dataset.pcsel)});

  // published studies viewer (section 5)
  let sid='nem_t5',alt=false;
  function studies(){const el=document.getElementById('pc-st');if(!el)return;const S=P.ablations||[];
    const ch=document.getElementById('pc-st-chips');
    if(!ch.dataset.done){ch.dataset.done=1;ch.innerHTML=S.filter(s=>s.id!=='dclm_t4').map(s=>'<button data-s="'+s.id+'"'+(s.id===sid?' class="on"':'')+'>'+esc(s.title.split(':')[0])+'</button>').join('');
      ch.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sid=b.dataset.s;alt=false;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));studies()})}
    const s=study(sid),useAlt=alt&&s.alt,rows=useAlt?s.alt.rows:s.rows,metric=useAlt?s.alt.metric:s.metric;
    const ownRe=s.own&&s.own[0]!=='('?new RegExp('^'+s.own.split(' (')[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')):null;
    const vals=rows.map(r=>r[1]),mn=Math.min(...vals),dec=vals.some(v=>v<1)?(vals.some(v=>String(v).split('.')[1]&&String(v).split('.')[1].length>2)?3:2):(vals.some(v=>!Number.isInteger(v*10))?2:1);
    el.innerHTML='<h4 style="margin:4px 0">'+esc(s.title)+'</h4><div class="small">'+esc(s.who)+', '+esc(s.date)+'. '+esc(s.setup)+'. Metric: <b>'+esc(metric)+'</b>. '+(ownRe?'<span class="pub">vendor</span> for '+esc(s.own)+', <span class="pubi">independent</span> for the rest.':'<span class="pubi">independent</span> of every corpus shown.')+'</div>'+
      bars(rows,{lo:mn*0.9,dec:dec,hl:n=>ownRe&&ownRe.test(n)})+
      (s.alt?'<button id="pc-st-alt" class="'+(useAlt?'on':'')+'">'+(useAlt?'Back to '+esc(s.metric):'Show '+esc(s.alt.metric))+'</button>':'')+
      '<p class="small">'+esc(s.note)+' <a href="'+esc(s.src)+'" target="_blank" rel="noopener noreferrer">Source</a>. Bars start at 90% of the smallest value, so short differences look long: read the numbers.</p>';
    const b=document.getElementById('pc-st-alt');if(b)b.addEventListener('click',()=>{alt=!alt;studies()});
  }
  function all(){dclm();gen();studies()}
  RD.onRender(all);RD.onResize(all);all();
})();
