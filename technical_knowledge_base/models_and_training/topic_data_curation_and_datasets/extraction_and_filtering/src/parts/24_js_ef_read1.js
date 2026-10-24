// ---- Reading tab, sections 2 to 5: extraction widgets ----
(function(){
  const H=EFH,E=window.EF,$=H.$;
  // predictions
  H.pred('ef-pred-1','jusText: '+H.n(E.chain.justext&&E.chain.justext.kept)+' documents survive the filters, against '+H.n(E.chain.traf111.kept)+' from trafilatura, '+H.n(E.chain.res.kept)+' from resiliparse and '+H.n(E.chain.wet.kept)+' from WET. But only '+H.n(E.chain.justext&&E.chain.justext.kept_in_fineweb)+' of jusText\'s are documents FineWeb kept: it keeps different text, not just more.');
  H.pred('ef-pred-2','The curly-bracket rule drops the whole document, so code in C-family languages, CSS, JSON and every LaTeX formula with an argument ("\\frac{a}{b}") disappears; in FineWeb\'s 50,000-document sample not one document contains "{".');

  // jusText animation
  (function(){const J=E.jt;if(!J||!$('ef-jt-card'))return;
    const P=J.paras,S=J.snaps,np=P.length;let mode='jt';
    const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    // align an extractor's output lines to the blocks, in order; a link-only block (a table-of-contents entry with the
    // same words as a heading) is used only when no other block matches
    const same=(t,l)=>{const a=norm(t).slice(0,40),b=norm(l).slice(0,40);return a.length>1&&b.length>1&&(a.startsWith(b)||b.startsWith(a))};
    function align(list){const hit=P.map(()=>false);let cur=0;
      list.forEach(l=>{let j=-1;for(let i=cur;i<np;i++){if(P[i].ld<0.9&&same(P[i].t,l)){j=i;break}}
        if(j<0){for(let i=cur;i<np;i++){if(same(P[i].t,l)){j=i;break}}}
        if(j>=0){hit[j]=true;cur=j+1}});return hit}
    const inTraf=align(J.traf),inRes=align(J.res);
    const capJ=['<span class="t">Step 1: blocks.</span> jusText splits the cleaned page at block-level tags into '+np+' blocks: menu items, the title, headings, paragraphs, sidebar links, the footer. Nothing is classified yet.',
      '<span class="t">Step 2: context-free classes</span> (core.py:243-275). Each block on its own: link density over 0.2 or a copyright sign makes it bad; under 70 characters short; otherwise its stop-word density decides good, near-good or bad. The headings are short; the long paragraphs good; the sidebar links bad.',
      '<span class="t">Step 3: pass 1, "good headings"</span> (core.py:313-326). Meant to promote a short heading followed by a good block. Nothing changes: the blocks after each heading still have an empty class when it looks at them (issue #45).',
      '<span class="t">Step 4: pass 2, short blocks</span> (core.py:328-346). A short block between two good ones becomes good; between two bad ones, bad; mixed cases look one step further. The headings between paragraphs become good; the short sidebar items bad.',
      '<span class="t">Step 5: pass 3, near-good</span> (core.py:348-357). A near-good block becomes bad only when both nearest good-or-bad neighbours are bad. This page has no near-good blocks, so nothing changes.',
      '<span class="t">Step 6: pass 4, "more good headings"</span> (core.py:359-370). A heading that ended bad but was not bad on its own becomes good if a good block follows within 200 characters. This is what rescues the first heading, the one pass 1 should have caught. Dimmed blocks are dropped as boilerplate.'];
    const capC=['<span class="t">The same page, jusText\'s final choice.</span> Good blocks are kept. Note the page title is dropped: its stop-word density is 0.',
      '<span class="t">trafilatura on the same page.</span> Blocks whose text appears in trafilatura 1.11\'s output stay bright. A completely different method lands on exactly the same twelve blocks: the six headings and six paragraphs, title dropped.',
      '<span class="t">resiliparse on the same page.</span> Blocks whose text appears in resiliparse\'s output (Dolma settings) stay bright: the same twelve plus the page title, which no class name marks as boilerplate (it also leaves a stray "by" from the byline whose author link it dropped).'];
    function cls(i,s){return mode==='jt'?(s===0?'none':S[s-1][i]):S[S.length-1][i]}
    function draw(s){
      const rows=[];let good=0,chars=0,chg=0;
      for(let i=0;i<np;i++){let c,keep,changed=false;
        if(mode==='jt'){c=s===0?null:S[s-1][i];changed=s>1&&S[s-1][i]!==S[s-2][i];keep=s<5||c==='good'}
        else{c=S[S.length-1][i];keep=s===0?c==='good':s===1?inTraf[i]:inRes[i]}
        if(changed)chg++;
        const on=(mode==='jt'?(c==='good'):keep);if(on){good++;chars+=P[i].len}
        const k=c?'<span class="k ef-k-'+c+'">'+(c==='neargood'?'near-good':c)+'</span>':'<span class="k" style="background:var(--soft);color:var(--mute)">block</span>';
        const out=(mode==='jt'?(s===5&&c!=='good'):!keep);
        rows.push('<div class="ef-para'+(changed?' chg':'')+(out?' out':'')+'" title="length '+P[i].len+', stop-word density '+P[i].sw+', link density '+P[i].ld+(P[i].h?', heading':'')+'">'+k+'<span class="x">'+(P[i].h?'<b>':'')+H.esc(P[i].t)+(P[i].h?'</b>':'')+'</span></div>')}
      $('ef-jt-body').innerHTML='<div class="ef-paras">'+rows.join('')+'</div>';
      $('ef-jt-cap').innerHTML=(mode==='jt'?capJ:capC)[s];
      $('ef-jt-cnt').innerHTML=H.stat('Blocks',np,'on '+H.esc(J.host))+H.stat(mode==='jt'?'Good now':'Kept',good,'blocks')+H.stat('Characters kept',H.n(chars),'')+(mode==='jt'?H.stat('Changed at this step',chg,''):H.stat('Extractor',['jusText','trafilatura 1.11','resiliparse'][s],''));
    }
    const A=RD.anim({card:'ef-jt-card',ctl:'ef-jt-ctl',n:capJ.length,draw,ms:2600,label:'jusText step'});
    H.chips($('ef-jt-mode'),m=>{mode=m;A.reset(m==='jt'?capJ.length:capC.length)});
  })();

  // six extractors, same filters
  (function(){if(!$('ef-x-bars'))return;const C=E.chain;
    const ks=['traf111','traf231','res','justext','readability','wet'].filter(k=>C[k]);
    function draw(m){const rows=ks.map(k=>({name:H.XN[k],v:C[k][m]||0,color:H.XC[k],hl:k==='traf111',txt:(m==='chars'||m==='kept_chars')?(C[k][m]/1e6).toFixed(1)+' M':H.n(C[k][m])}));
      H.bars($('ef-x-bars'),rows);
      $('ef-x-note').innerHTML='The same 20,280 pages, then lid.176 English &gt; 0.65 and run0\'s heuristic chain (datatrove 0.10.1) <span class="ef-lbl meas">measured</span>. Of the kept documents, how many FineWeb also kept from this file: '+ks.map(k=>H.XN[k].split(' (')[0]+' '+H.n(C[k].kept_in_fineweb)).join(', ')+' (FineWeb kept 2,425 in all). trafilatura 1.11 here is run0\'s own text, with its 1 s timeouts; without the timeout it keeps '+H.n(C.traf111_dedup&&C.traf111_dedup.kept)+'.'}
    draw('kept');H.chips($('ef-x-metric'),draw);
  })();

  // WCEB
  (function(){const W=E.wceb,P=E.wcebPub;if(!W||!$('ef-wceb'))return;
    const map={traf111:'Trafilatura',traf231:'Trafilatura',resiliparse:'Resiliparse',justext:'jusText',readability:'Readability',alltext:'inscriptis'};
    const nm={traf111:'trafilatura 1.11 (FineWeb settings)',traf231:'trafilatura 2.3.1',resiliparse:'resiliparse 1.0.9 (Dolma settings)',justext:'jusText 3.0.2',readability:'readability-lxml 0.9',alltext:'all visible text (resiliparse, main content off)'};
    const pub=k=>P.find(r=>r.name===map[k]);
    const rows=Object.keys(nm).filter(k=>W[k]).map(k=>{const w=W[k],q=pub(k);
      return '<tr><td>'+nm[k]+'</td><td class="n">'+H.f(w.p,3)+'</td><td class="n">'+H.f(w.r,3)+'</td><td class="n"><b>'+H.f(w.f1,3)+'</b></td><td class="n">'+H.f(w.median_f1,3)+'</td><td class="n">'+H.n(w.empty)+'</td><td>'+(q?q.name+(k==='alltext'?' (nearest: every visible string)':'')+'</td><td class="n">'+H.f(q.p,3)+'</td><td class="n">'+H.f(q.r,3)+'</td><td class="n">'+H.f(q.f1,3):'</td><td></td><td></td><td>')+'</td></tr>'}).join('');
    $('ef-wceb').innerHTML='<div class="tw"><table><tr><th>This page\'s run (3,985 pages)</th><th class="n">Precision</th><th class="n">Recall</th><th class="n">F1</th><th class="n">Median F1</th><th class="n">Empty outputs</th><th>Paper\'s row (2023 versions)</th><th class="n">P</th><th class="n">R</th><th class="n">F1 (ROUGE-LSum)</th></tr>'+rows+'</table></div>';
  })();

  // timing
  (function(){const T=E.timing;if(!T||!$('ef-time'))return;
    const ks=['traf111','traf231','readability','justext'];
    H.bars($('ef-time'),ks.map(k=>({name:H.XN[k],v:T[k].ms_per_page,color:H.XC[k],txt:H.f(T[k].ms_per_page,0)+' ms'})));
    const pt=E.pipe&&E.pipe.timing;
    $('ef-time-note').innerHTML='Mean milliseconds per page over the 20,280 pages, the four Python extractors run at the same time on the same machine at low priority, load average 20 to 90 <span class="ef-lbl rough">rough</span>; medians '+ks.map(k=>H.f(T[k].p50_ms,0)).join(', ')+' ms. Pages over 1 second (datatrove\'s default timeout): '+ks.map(k=>H.n(T[k].over_1s)).join(', ')+'. resiliparse is compiled code and not in this run: the root\'s Pipeline lab measured it at '+(pt?H.f(pt.resiliparse_mb_per_s,0)+' MB/s of HTML against trafilatura\'s '+H.f(pt.trafilatura_mb_per_s,2)+' ('+H.f(pt.speedup,0)+' times)':'about 28 times trafilatura\'s speed')+' <span class="ef-lbl rough">rough</span>; DCLM\'s Table 16 says 4.55 against 0.56 MB/s per core <span class="ef-lbl pub">published</span>.';
  })();

  // trafilatura cache
  (function(){const t=E.traf;if(!t||!$('ef-cache'))return;const a=t.nodedup_vs_dedup,b=t.dedup_vs_shuffled,c=t.chars_total,w=t.pages_with_text;
    $('ef-cache').innerHTML='<div class="tw"><table><tr><th>Run (trafilatura 1.11, one process, no timeout)</th><th class="n">Pages with text</th><th class="n">Characters</th></tr>'+
      '<tr><td>deduplicate=False</td><td class="n">'+H.n(w.nodedup)+'</td><td class="n">'+H.n(c.nodedup)+'</td></tr>'+
      '<tr><td>deduplicate=True (datatrove default), WARC order</td><td class="n">'+H.n(w.dedup)+'</td><td class="n">'+H.n(c.dedup)+'</td></tr>'+
      '<tr><td>deduplicate=True, shuffled order (seed 0)</td><td class="n">'+H.n(w.shuffled)+'</td><td class="n">'+H.n(c.shuffled)+'</td></tr></table></div>';
    $('ef-cache-note').innerHTML='With the cache on, '+H.n(a.differ)+' pages change: '+H.n(a.emptied)+' lose all their text (their whole body had been seen three times before), '+H.n(a.shorter)+' lose paragraphs, '+H.n(a.longer)+' come out longer (a different fallback wins once paragraphs are missing); '+H.p(c.nodedup-c.dedup,c.nodedup,2)+' of characters go. Shuffling the order changes '+H.n(b.differ)+' more pages. Against run0 (the same settings inside datatrove\'s sandbox, 1 s timeout), the single-process run differs on '+H.n(t.dedup_vs_run0.differ)+' of the pages both extracted <span class="ef-lbl meas">measured</span>.';
  })();

  // tables, code, maths
  (function(){const S=E.struct;if(!S||!$('ef-st-bars'))return;
    const ks=['traf111','traf231','resiliparse','readability','justext','alltext'];const nm={resiliparse:'res',alltext:'all'};
    const def={code:{g:['code'],num:'code_indent_kept',den:'code_indented',t:'indented code lines kept with their indentation'},
      codev:{g:['code','mathjax'],num:'code_verbatim',den:'code',t:'code lines (8+ characters) found verbatim as an output line'},
      tex:{g:['wiki_math','mathjax','arxiv_abs'],num:'tex_whole',den:'tex',t:'TeX formulas found whole in the output (spaces ignored)'},
      rows:{g:['wiki_tables','data_tables'],num:'rows_struct',den:'rows',t:'table rows whose cells appear in order on one output line'}};
    function draw(m){const d=def[m];const rows=ks.filter(k=>S[k]).map(k=>{let a=0,b=0;const per=[];d.g.forEach(g=>{const x=S[k][g];if(!x)return;a+=x[d.num];b+=x[d.den];per.push(g)});
        return {name:H.XN[nm[k]||k],v:b?a/b:0,max:1,color:H.XC[nm[k]||k],txt:H.p(a,b,0)}});
      H.bars($('ef-st-bars'),rows,{max:1});
      const g0=S.alltext;let den=0,pages=0;d.g.forEach(g=>{if(g0[g]){den+=g0[g][d.den];pages+=g0[g].pages}});
      let extra='';if(m==='tex'){const w=S.alltext.wiki_math,q=S.alltext.mathjax;extra=' Wikipedia alone: '+ks.filter(k=>S[k]).map(k=>H.XN[nm[k]||k].split(' (')[0]+' '+H.p(S[k].wiki_math.tex_whole,w.tex,0)).join(', ')+' of '+H.n(w.tex)+' formulas; Stack Exchange alone: '+ks.filter(k=>S[k]).map(k=>H.XN[nm[k]||k].split(' (')[0]+' '+H.p(S[k].mathjax.tex_whole,q.tex,0)).join(', ')+' of '+H.n(q.tex)+'.'}
      $('ef-st-note').innerHTML='Share of '+H.n(den)+' '+d.t+', on '+H.n(pages)+' targeted pages from CC-MAIN-2024-30 <span class="ef-lbl meas">measured</span>.'+extra+' Same settings as everywhere on this page; "all visible text" stands in for WET, which the targeted pages do not have.'}
    draw('code');H.chips($('ef-st-kind'),draw);
  })();
})();
