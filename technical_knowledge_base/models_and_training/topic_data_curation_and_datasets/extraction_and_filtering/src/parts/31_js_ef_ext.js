// ---- Extraction comparer tab ----
(function(){
  const H=EFH,E=window.EF,$=H.$,P=E.pages||[];if(!$('ef-c-page'))return;
  const sel=$('ef-c-page'),sa=$('ef-c-a'),sb=$('ef-c-b');
  sel.innerHTML=P.map((p,i)=>'<option value="'+i+'">'+H.esc(p.host)+(p.src==='targeted'?' (fetched)':'')+': '+H.esc(p.why)+'</option>').join('');
  const norm=s=>s.toLowerCase().replace(/\s+/g,' ').trim();
  function opts(p){const ks=Object.keys(p.x);return ks.map(k=>'<option value="'+k+'">'+H.esc(H.XN[k]||k)+'</option>').join('')}
  function render(){const p=P[+sel.value];if(!p)return;
    const a=sa.value,b=sb.value,ta=p.x[a]||'',tb=p.x[b]||'';
    $('ef-c-why').innerHTML='<b>'+H.esc(p.host)+'</b> '+H.esc(p.path)+': '+H.esc(p.why)+(p.html_chars?' ('+H.n(p.html_chars)+' characters of HTML).':'.');
    $('ef-c-ha').textContent=H.XN[a]||a;$('ef-c-hb').textContent=H.XN[b]||b;
    const setA=new Set(ta.split('\n').map(norm).filter(Boolean));const mark=$('ef-c-diff').checked;
    $('ef-c-ta').innerHTML=ta?H.esc(ta):'<span class="mute">(no text)</span>';
    $('ef-c-tb').innerHTML=tb?tb.split('\n').map(l=>{const only=mark&&l.trim()&&!setA.has(norm(l));return only?'<span class="ef-ln f">'+H.esc(l)+'</span>':H.esc(l)}).join('\n'):'<span class="mute">(no text)</span>';
    $('ef-c-cnt').innerHTML=H.stat(H.XN[a]||a,H.n(p.n[a]),'characters, full output')+H.stat(H.XN[b]||b,H.n(p.n[b]),'characters, full output')+H.stat('Lines only on the right',tb.split('\n').filter(l=>l.trim()&&!setA.has(norm(l))).length,'in the shown part');
    const st=p.struct;
    if(st){const ks=Object.keys(st);const r0=st[ks[0]];
      const cell=(x,a,b)=>x[b]?H.p(x[a],x[b],0)+' <span class="mute">('+x[a]+'/'+x[b]+')</span>':'<span class="mute">none</span>';
      $('ef-c-struct').innerHTML='<h4>Structure on this page</h4><div class="tw"><table><tr><th>Extractor</th><th>Table rows as rows</th><th>Code lines verbatim</th><th>Indentation kept</th><th>TeX formulas whole</th></tr>'+ks.map(k=>'<tr><td>'+H.esc(H.XN[k]||k)+'</td><td>'+cell(st[k],'rows_struct','rows')+'</td><td>'+cell(st[k],'code_verbatim','code')+'</td><td>'+cell(st[k],'code_indent_kept','code_indented')+'</td><td>'+cell(st[k],'tex_whole','tex')+'</td></tr>').join('')+'</table></div>'}
    else $('ef-c-struct').innerHTML='';
    H.store.set('cmp',sel.value+'|'+a+'|'+b)}
  function setPage(keep){const p=P[+sel.value];const prevA=sa.value,prevB=sb.value;sa.innerHTML=opts(p);sb.innerHTML=opts(p);
    const ks=Object.keys(p.x);const da=ks.includes(prevA)&&keep?prevA:(ks.includes('traf111')?'traf111':ks[0]);
    const db=ks.includes(prevB)&&keep?prevB:(ks.includes('res')?'res':ks[1]);sa.value=da;sb.value=db;render()}
  sel.addEventListener('change',()=>setPage(true));sa.addEventListener('change',render);sb.addEventListener('change',render);$('ef-c-diff').addEventListener('change',render);
  const saved=(H.store.get('cmp','')||'').split('|');if(saved[0]&&P[+saved[0]])sel.value=saved[0];
  sa.innerHTML=opts(P[+sel.value]);sb.innerHTML=opts(P[+sel.value]);if(saved[1])sa.value=saved[1];if(saved[2])sb.value=saved[2];setPage(true);
  // all extractors table
  (function(){const C=E.chain;const ks=[['traf111','trafilatura 1.11 (run0, 1 s timeout)'],['traf111_nodedup','trafilatura 1.11, no timeout, cache off'],['traf111_dedup','trafilatura 1.11, no timeout, cache on'],['traf111_shuffled','trafilatura 1.11, no timeout, cache on, shuffled'],['traf231','trafilatura 2.3.1'],['res','resiliparse (Dolma settings)'],['readability','readability-lxml'],['justext','jusText (English)'],['wet','Common Crawl WET']].filter(k=>C[k[0]]);
    $('ef-c-all').innerHTML='<div class="tw"><table><tr><th>Extractor</th><th class="n">Pages with text</th><th class="n">Characters (M)</th><th class="n">English</th><th class="n">Kept</th><th class="n">Kept and in FineWeb</th><th class="n">Characters kept (M)</th></tr>'+ks.map(([k,nm])=>{const c=C[k];return '<tr><td>'+nm+'</td><td class="n">'+H.n(c.with_text)+'</td><td class="n">'+(c.chars/1e6).toFixed(1)+'</td><td class="n">'+H.n(c.english)+'</td><td class="n"><b>'+H.n(c.kept)+'</b></td><td class="n">'+H.n(c.kept_in_fineweb)+'</td><td class="n">'+(c.kept_chars/1e6).toFixed(2)+'</td></tr>'}).join('')+'</table></div>'})();
})();
