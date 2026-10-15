// ---- Reading tab, sections 6 to 12: language ID, rules, traps, lines, URL, toxicity, cost ----
(function(){
  const H=EFH,E=window.EF,$=H.$;
  // threshold curves (lid.176 and GlotLID English)
  (function(){const L=E.lid,el=$('ef-lid-mini');if(!el)return;
    if(!L){el.innerHTML='<div class="ef-pend">Language-ID run still pending.</div>';return}
    function draw(){const W=RD.width(el),h=200,m={l:44,r:10,t:10,b:30},w=W-m.l-m.r,ih=h-m.t-m.b,th=L.thresholds,mx=L.n;
      const x=t=>m.l+w*t,y=v=>m.t+ih*(1-v/mx);
      const path=a=>a.map((v,i)=>(i?'L':'M')+x(th[i]).toFixed(1)+','+y(v).toFixed(1)).join('');
      let g='';for(let v=0;v<=mx;v+=5000)g+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(m.l-4,y(v)+4,H.n(v),{a:'end',fs:10,fill:'var(--mute)'});
      for(let t=0;t<=1.001;t+=0.25)g+=RD.t(x(t),h-10,t.toFixed(2),{a:'middle',fs:10,fill:'var(--mute)'});
      g+='<line x1="'+x(0.65)+'" x2="'+x(0.65)+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(x(0.65)+4,m.t+12,'0.65',{fs:10,fill:'var(--bad)'});
      g+='<path d="'+path(L.ft_kept)+'" fill="none" stroke="var(--c1)" stroke-width="2"/><path d="'+path(L.gl_kept)+'" fill="none" stroke="var(--c3)" stroke-width="2"/><path d="'+path(L.both_kept)+'" fill="none" stroke="var(--c5)" stroke-width="1.5" stroke-dasharray="3 3"/>';
      el.innerHTML=RD.svg(W,h,g,'English documents kept against the threshold')+'<div class="ef-leg"><span><i style="background:var(--c1)"></i>lid.176 English score above threshold</span><span><i style="background:var(--c3)"></i>GlotLID eng_Latn above threshold</span><span><i style="background:var(--c5)"></i>both</span></div>';
      $('ef-lid-mini-note').innerHTML='Documents (of '+H.n(L.n)+' extracted) whose English probability is above each threshold <span class="ef-lbl meas">measured</span>. Most documents sit near 0 or near 1, so the count changes slowly in the middle: moving the threshold from 0.5 to 0.8 changes lid.176\'s count from '+H.n(L.ft_kept[50])+' to '+H.n(L.ft_kept[80])+'.'}
    draw();RD.onRender(draw);RD.onResize(draw);
  })();

  // rules table with labels
  (function(){const S=E.labels.summary,W=E.wb,el=$('ef-rt');if(!S||!el)return;
    const R=[['dup_line_frac','Duplicate lines over 30% of lines','Gopher repetition'],['dup_line_char_frac','Characters in duplicate lines over 20%','Gopher repetition'],['top_2_gram','Top 2-gram over 20% of characters','Gopher repetition'],['top_3_gram','Top 3-gram over 18%','Gopher repetition'],['top_4_gram','Top 4-gram over 16%','Gopher repetition'],['duplicated_5_n_grams','Repeated 5-grams over 15%','Gopher repetition'],['duplicated_6_n_grams','Repeated 6-grams over 14%','Gopher repetition'],['duplicated_7_n_grams','Repeated 7-grams over 13%','Gopher repetition'],['duplicated_8_n_grams','Repeated 8-grams over 12%','Gopher repetition'],['duplicated_9_n_grams','Repeated 9-grams over 11%','Gopher repetition'],['duplicated_10_n_grams','Repeated 10-grams over 10%','Gopher repetition'],
      ['gopher_short_doc','Fewer than 50 words','Gopher quality'],['gopher_above_avg_threshold','Mean word length over 10','Gopher quality'],['gopher_too_many_ellipsis','Ellipses over 0.1 per word','Gopher quality'],['gopher_too_many_bullets','Bullet lines over 90%','Gopher quality'],['gopher_too_many_end_ellipsis','Lines ending in an ellipsis over 30%','Gopher quality'],['gopher_below_alpha_threshold','Words with a letter under 80% (spaCy tokens)','Gopher quality'],['gopher_enough_stop_words','Fewer than 2 of 8 stop words','Gopher quality'],
      ['too_few_sentences','Fewer than 5 sentences after line edits (paper: 3)','C4'],['curly_bracket','A curly bracket','C4'],['lorem_ipsum','"lorem ipsum"','C4'],
      ['line_punct_ratio','Lines ending in punctuation under 12%','FineWeb'],['short_line_ratio','Lines of 30 characters or fewer over 67%','FineWeb'],['char_dup_ratio','Characters in duplicated lines over 1% (paper: 10%)','FineWeb']];
    const rows=R.map((r,i)=>{const s=S['drop:'+r[0]]||{R:0,W:0,U:0,n:0};return {k:r[0],nm:r[1],fam:r[2],i,n:(W.reasons||{})[r[0]]||0,s}});
    function draw(m){const a=rows.slice();if(m==='wrong')a.sort((x,y)=>(y.s.wrong_share||0)-(x.s.wrong_share||0));else if(m==='n')a.sort((x,y)=>y.n-x.n);
      el.innerHTML='<div class="tw"><table><tr><th>Rule (first one to fire in run0)</th><th>Family</th><th class="n">Drops</th><th class="n">Labelled R / W / U</th><th style="min-width:9em">Wrong-drop share, 95% interval</th></tr>'+a.map(r=>{const s=r.s,ci=s.wrong_ci||[0,0],w=s.wrong_share||0;
        return '<tr><td>'+r.nm+'</td><td>'+r.fam+'</td><td class="n">'+H.n(r.n)+'</td><td class="n">'+s.R+' / '+s.W+' / '+s.U+'</td><td><div class="ef-bar" style="grid-template-columns:minmax(0,1fr) 3.4em;margin:0"><div class="tr"><span class="fl" style="width:'+(100*w)+'%;background:var(--bad)"></span><span class="ci" style="left:'+(100*ci[0])+'%;width:'+Math.max(0.5,100*(ci[1]-ci[0]))+'%"></span></div><div class="v">'+H.p(s.W,s.n,0)+'</div></div></td></tr>'}).join('')+'</table></div>';
      const k=S.kept;$('ef-rt-note').innerHTML='Drops: documents for which this was the first rule to fire in run0, out of 6,971 English documents. Labels: up to 8 from the root\'s Pipeline lab (seed 0) and up to 20 from this page (seed 1); 6- to 10-gram rows are this page\'s only (the lab labelled them as one group, '+((S['drop:duplicated_6_to_10_n_grams']||{}).W||0)+' wrong of '+((S['drop:duplicated_6_to_10_n_grams']||{}).n||0)+'). Kept documents: '+k.K+' worth keeping, '+k.J+' junk, '+k.U+' unclear of '+k.n+' <span class="ef-lbl lab">hand-labelled</span>.'}
    draw('order');H.chips($('ef-rt-sort'),draw);
  })();

  // traps
  (function(){const el=$('ef-traps');if(!el)return;const S=E.labels.summary,P=E.pipe||{},V=P.variants_vs_fineweb||{},A=P.as_shipped||{},T=E.traf||{},C=E.c4var||{},rec=P.traf_recovered||{};
    const lab=g=>{const s=S[g];return s?H.p(s.W,s.n,0)+' ('+s.W+' of '+s.n+')':'n/a'};
    const c4w=C.s5_w5?('With 5 words per line (and 5 sentences) the chain keeps '+H.n(C.s5_w5.kept)+' ('+H.n(C.s5_w5.kept_in_fineweb)+' in FineWeb) against '+H.n(C.s5_w3.kept)+'; with the paper\'s pair (3 sentences, 5 words) '+H.n(C.s3_w5.kept)+' ('+H.n(C.s3_w5.kept_in_fineweb)+' in FineWeb).'):'pending';
    const rows=[
      ['LanguageFilter() with no languages','datatrove v0.3.0 (2024-08-28) changed the default from English to None, meaning "any language above 0.65"; <code>examples/fineweb.py:43</code> passes none (<code>filters/language_filter.py:61-65</code>)','The shipped example keeps '+H.n(A.kept)+' documents, '+H.n(A.kept-A.kept_en)+' of them not English','n/a: a language error, not a quality call'],
      ['FineWeb duplicated-line characters 0.01','Paper section 3.6: 0.1. datatrove has had 0.01 since v0.2.0 (<code>fineweb_quality_filter.py</code> default)','At 0.1 the chain keeps '+H.n((V['char_dup_0.1']||{}).extra_kept)+' more documents, '+H.n((V['char_dup_0.1']||{}).extra_in_fineweb)+' of them in FineWeb: FineWeb itself was built with 0.01',lab('trap:chardup_01')],
      ['Gopher 80% rule counts spaCy tokens','Gopher: 80% of words contain a letter. datatrove counts every spaCy token, punctuation included, as a word (<code>gopher_quality_filter.py:114-118</code>; the parameter is still named max_non_alpha_words_ratio, line 56)','466 documents fail only because of this; with whitespace words they pass every rule',lab('trap:alpha_spacy')],
      ['C4 sentence minimum 5','T5 paper and TFDS: 3 sentences (<code>c4_utils.py:42</code>); datatrove: 5 (<code>c4_filters.py:66</code>)','At 3 the chain keeps '+H.n((V.c4_min_sentences_3||{}).extra_kept)+' more documents, '+H.n((V.c4_min_sentences_3||{}).extra_in_fineweb)+' of them in FineWeb',lab('trap:c4_sent_3')],
      ['C4 words-per-line minimum 3','T5 paper and TFDS: 5 words (<code>c4_utils.py:41</code>); datatrove: 3 (<code>c4_filters.py:67</code>)',c4w,'not labelled'],
      ['C4 terminal-punctuation rule off','FineWeb turns it off on purpose (it removed about 30% of tokens in their ablation); C4 had it on','Turning it on drops '+H.n((V.c4_terminal_punct||{}).lost)+' of the kept documents, '+H.n((V.c4_terminal_punct||{}).lost_in_fineweb)+' of them in FineWeb',lab('trap:c4_punct')],
      ['trafilatura deduplicate=True','datatrove\'s default (<code>extractors/trafilatura.py:27</code>); a process-wide cache (section 4)',(T.nodedup_vs_dedup?H.n(T.nodedup_vs_dedup.emptied)+' pages emptied, '+H.n(T.nodedup_vs_dedup.shorter)+' shortened; '+H.n(T.dedup_vs_shuffled.differ)+' change with page order':''),'not labelled'],
      ['Extraction timeout 1 s','datatrove\'s default (<code>extractors/base.py:18</code>), wall-clock time','Run0 timed out on 199 pages; re-run without it, '+H.n(rec.n)+' empty pages get text, '+H.n(rec.kept)+' pass every rule, '+H.n(rec.kept_in_fineweb)+' of those are in FineWeb','n/a'],
      ['FineWeb "list_ratio" check','In datatrove (newline per word over 0.3) but not in the paper','Removed 0 documents here: C4\'s line edits run first and delete the short lines it would count (root\'s Pipeline lab)','n/a']];
    el.innerHTML='<div class="tw"><table><tr><th>Default</th><th>Paper or history</th><th>Effect on our file</th><th>Labelled worth keeping</th></tr>'+rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>').join('')+'</table></div>';
  })();

  // line-level animation
  (function(){const X=E.linesEx,card=$('ef-ln-card');if(!X||!card)return;let mode='fw';
    const Ls=X.lines.filter(l=>l.t);const tot=Ls.reduce((a,l)=>a+l.t.length,0);
    const why={too_few_words:'fewer than 3 words',no_terminal_punct:'no terminal punctuation',javascript:'mentions JavaScript',policy:'cookie or policy phrase',too_long_word:'a word over 1,000 characters',blank:'blank',upper:'mostly upper case',numeric:'only digits',counter:'a counter',one_word:'one word',cta:'call to action'};
    const flag=l=>mode==='fw'?l.c4:mode==='c4'?l.c4p:l.rw;
    const verdict=()=>mode==='fw'?'kept (and it passes the FineWeb rules after the edits: run0 kept it, and so did FineWeb)':mode==='c4'?'dropped by datatrove\'s default: three sentences survive the line edits, under its minimum of 5. C4\'s own minimum of 3 would have kept it: the swapped default decides this page':'dropped: flagged lines hold '+H.p(X.rw_share*1,1,1)+' of its words, over the 5% limit';
    const caps={fw:['<span class="t">The document as trafilatura extracted it.</span> '+Ls.length+' lines.','<span class="t">C4\'s line rules, FineWeb settings.</span> Lines of fewer than 3 words go; "LOCATION", "Strathpine" and "QLD 4500" vanish and the street address is left without its label.','<span class="t">Document decision.</span> '],
      c4:['<span class="t">The same document.</span>','<span class="t">C4\'s line rules with terminal punctuation.</span> Every line not ending in . ! ? or a quote goes: dates, times, the address, the headings; two lines, three sentences, remain.','<span class="t">Document decision.</span> '],
      rw:['<span class="t">The same document.</span>','<span class="t">RefinedWeb-style line flags (reconstruction).</span> Upper-case headings and one-word lines are flagged.','<span class="t">Document decision.</span> ']};
    function draw(s){let rm=0,ch=0;const out=Ls.map(l=>{const f=s>0?flag(l):null;if(f)rm++;else ch+=l.t.length;
        return '<div class="ef-ln'+(f?(mode==='rw'?' f':' x'):'')+(s===2&&mode!=='fw'?' x':'')+'">'+H.esc(l.t)+(f?'<span class="why">'+why[f]+'</span>':'')+'</div>'}).join('');
      $('ef-ln-doc').innerHTML=out;$('ef-ln-cap').innerHTML=caps[mode][s]+(s===2?verdict():'');
      const dropped=s===2&&mode!=='fw';
      $('ef-ln-cnt').innerHTML=H.stat('Lines',Ls.length,'')+H.stat(mode==='rw'?'Lines flagged':'Lines deleted',s>0?rm:0,'')+H.stat('Characters left',dropped?0:H.n(s>0&&mode!=='rw'?ch:tot),'of '+H.n(tot))+H.stat('Document',s<2?'...':(dropped?'dropped':'kept'),'');}
    const A=RD.anim({card:'ef-ln-card',ctl:'ef-ln-ctl',n:3,draw,ms:2600,label:'Line-filter step'});
    H.chips($('ef-ln-mode'),m=>{mode=m;A.reset(3);A.play()});
  })();

  // URL lists
  (function(){const U=E.url,el=$('ef-url');if(!U||!el)return;const c=U.dt_in_ut1_cat,N=U.datatrove_domains;
    const ks=[['adult','adult'],['phishing','phishing'],['malware','malware'],['jobsearch','jobsearch'],['download','download'],['cryptojacking','cryptojacking'],['agressif','agressif (hate)'],['dating','dating']];
    H.bars(el,ks.map(([k,nm])=>({name:'UT1 '+nm,v:c[k]||0,color:k==='adult'?'var(--bad)':'var(--c4)',txt:H.n(c[k]||0)})),{max:N});
    $('ef-url-note').innerHTML='How many of datatrove\'s '+H.n(N)+' blocked domains appear in each category of today\'s UT1 list (a domain can be in several) <span class="ef-lbl meas">measured</span>. The bar length is the share of datatrove\'s list. On our file, run0\'s URL filter removed 183 pages: '+Object.entries(U.ut1_cat_vs_run0_reason).map(([k,v])=>H.n(v)+' '+k.replace('|',' by ')).join(', ')+' (category | datatrove reason).';
  })();

  // toxicity
  (function(){const T=E.tox,L=E.toxLabels,el=$('ef-tox');if(!el)return;if(!T){el.innerHTML='<div class="ef-pend">Toxicity run pending.</div>';return}
    const a=T.english,f=T.final;
    el.innerHTML='<div class="ef-cnt">'+H.stat('C4 bad-word match',H.n(f.badword_docs),'of '+H.n(f.docs)+' kept ('+H.n(a.badword_docs)+' of '+H.n(a.docs)+' English)')+H.stat('Dolma, sentences over 0.4',H.n(f.dolma_04_docs_touched)+' docs',(100*f.dolma_04_char_share).toFixed(1)+'% of their characters on average')+H.stat('Dolma, over 0.0004',H.n(f.dolma_00004_docs_touched)+' docs',(100*f.dolma_00004_char_share).toFixed(1)+'% of characters')+(L?H.stat('Labelled bad-word matches',L.W+' of '+L.n,'ordinary text'):'')+'</div>'+
      (L?'<p class="small"><b>What the word list matched in ordinary documents</b> (matched word, then where): '+L.examples.map(x=>'"'+H.esc(x.word)+'": '+H.esc(x.what)).join('; ')+'.</p>':'');
    $('ef-tox-note').innerHTML='C4 rule exactly as TFDS applies it; Dolma\'s Jigsaw fastText models run per sentence (a simple splitter here, not BlingFire), a sentence removed when either model scores it above the threshold; the share is the mean, over the documents, of characters that would be removed <span class="ef-lbl meas">measured</span>. Labels from 30 random matches <span class="ef-lbl lab">hand-labelled</span>; no matched text is shown.';
  })();

  // cost per stage
  (function(){const C=E.cost,T=E.timing,el=$('ef-cost');if(!el||!C)return;
    const rows=[['URL filter (lists in memory)',C.url_filter],['trafilatura 1.11 extraction',T&&T.traf111.ms_per_page*1000],['readability-lxml extraction',T&&T.readability.ms_per_page*1000],['jusText extraction',T&&T.justext.ms_per_page*1000],['Language ID (lid.176)',C.lid176],['Gopher repetition',C.gopher_repetition],['Gopher quality (spaCy words)',C.gopher_quality],['C4 (NLTK sentences)',C.c4],['FineWeb rules',C.fineweb]];
    H.bars(el,rows.map(r=>({name:r[0],v:r[1],color:/extraction/.test(r[0])?'var(--c2)':'var(--c1)',txt:(r[1]>=1000?(r[1]/1000).toFixed(1)+' ms':Math.round(r[1])+' µs')})));
    $('ef-cost-note').innerHTML='Mean time per document, each stage alone, one process at low priority on a shared machine (load 20 to 90) <span class="ef-lbl rough">rough</span>: '+H.n(C.docs.url)+' URLs, '+H.n(C.docs.lid)+' documents for language ID, '+H.n(C.docs.rules)+' English documents for the rules. Ratios are the useful part: extraction costs about as much as everything after it combined, which is why it is the step to parallelise and why resiliparse\'s speed matters.';
  })();
})();
