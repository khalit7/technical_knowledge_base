// ---- Pipeline lab: language-ID histogram, the heuristic rule explorer, the label table ----
(function(){
  const C=window.DCP,D=C.D;if(!D||!C.$('pip-rx-card'))return;
  const esc=C.esc,n0=C.n0,T=C.T;
  // ---------------- language ID
  const LD=D.derived.lid,ls=C.$('pip-lid-t');
  function lid(){
    const t=(+ls.value)*0.05,el=C.$('pip-lid-hist'),W=C.width(el),H=170,L=8,R=8,Tp=8,B=26,iw=W-L-R,ih=H-Tp-B;
    const h=LD.hist50,mx=Math.sqrt(Math.max(...h)),bw=iw/50;let s='';
    h.forEach((v,i)=>{const bh=ih*Math.sqrt(v)/mx,x=L+i*bw,keep=(i+0.5)/50>t;s+='<rect x="'+(x+0.5).toFixed(1)+'" y="'+(Tp+ih-bh).toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+(keep?'var(--acc)':'var(--dim)')+'"><title>English '+(i/50).toFixed(2)+' to '+((i+1)/50).toFixed(2)+': '+n0(v)+' documents</title></rect>'});
    const tx=L+t*iw;s+='<line x1="'+tx.toFixed(1)+'" x2="'+tx.toFixed(1)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--bad)" stroke-width="2"/>';
    [0,0.25,0.5,0.75,1].forEach(v=>{s+=T(L+v*iw,H-B+14,v.toFixed(2),{a:v===0?'start':v===1?'end':'middle',fs:10,fill:'var(--mute)'})});
    s+=T(L+iw*0.3,Tp+10,'bar height: square root of count',{a:'middle',fs:10,fill:'var(--mute)'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Histogram of English probability">'+s+'</svg>';
    C.$('pip-lid-tv').textContent=t.toFixed(2);
    const kept=LD.kept_by_threshold[t.toFixed(2)];
    const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
    C.$('pip-lid-cnt').innerHTML=st('Kept as English',n0(kept),(100*kept/LD.n).toFixed(1)+'% of '+n0(LD.n))+st('Change against 0.65',(kept-LD.kept_by_threshold['0.65']>=0?'+':'')+n0(kept-LD.kept_by_threshold['0.65']))+st('Top label English but at most 0.65',n0(LD.en_top_but_below_065),'dropped at 0.65');
  }
  ls.addEventListener('input',lid);
  C.bars(C.$('pip-lid-langs'),LD.top_langs.slice(0,10).map(([k,v])=>({name:k,v,color:k==='en'?'var(--acc)':'var(--c6)'})),LD.top_langs[0][1],v=>n0(v));
  C.$('pip-lid-ex').innerHTML=D.lid_examples.map(e=>'<div class="pip-ex"><div class="h"><b>'+e.en.toFixed(2)+'</b><span>'+esc(e.host)+'</span><span>'+esc(e.kind)+'</span><span class="pip-lb '+(e.en>0.65?'K':'U')+'">'+(e.en>0.65?'kept':'dropped')+'</span></div><div class="tx">'+esc(e.t)+'</div></div>').join('');
  const AS=D.as_shipped;
  C.$('pip-lid-trap').innerHTML='datatrove 0.10.1\'s <span class="mono">examples/fineweb.py:43</span> calls <span class="mono">LanguageFilter()</span> with no arguments. Up to v0.2.0 (released 2024-04-22, the FineWeb release month) the default was <span class="mono">languages=(Languages.english,)</span>; from v0.3.0 (2024-08-28) it is <span class="mono">None</span>, which keeps a document in <i>any</i> language whose top score exceeds 0.65 (checked in the source of each tag, <span class="mono">filters/language_filter.py</span>). The example was not updated. Run as shipped on our file, '+n0(AS.lid_pass)+' documents pass language ID instead of 6,971, and then the Gopher stop-word rule ("at least 2 of: the, be, to, of, and, that, have, with") quietly does the language filtering: it drops '+n0(AS.stop_word_drops)+' documents, only '+AS.stop_word_drops_en+' of them English. The output still holds '+n0(AS.kept-AS.kept_en)+' non-English documents ('+AS.kept_other_top.map(([k,v])=>k+' '+v).join(', ')+') next to the same '+n0(AS.kept_en)+' English ones. Gopher\'s authors meant the stop-word rule for "ostensibly English documents that contain no coherent English text" (Gopher paper, appendix A); here it is an accidental language filter. Lesson: pin versions and pass every argument a result depends on.';
  // ---------------- rule explorer
  const RL=D.rules,rs=C.$('pip-rx-rule'),rt=C.$('pip-rx-t');let ri=RL.findIndex(r=>r.k==='char_dup');
  const SRC={dup_line_frac:'gopher_repetition_filter.py:122-127',dup_line_char_frac:'gopher_repetition_filter.py:122-127',dup_para_frac:'gopher_repetition_filter.py:115-118',
    top_2_gram:'gopher_repetition_filter.py:131-137',top_3_gram:'gopher_repetition_filter.py:131-137',top_4_gram:'gopher_repetition_filter.py:131-137',dup_5_gram:'gopher_repetition_filter.py:57-70, 139-142',dup_10_gram:'gopher_repetition_filter.py:57-70, 139-142',
    n_words:'gopher_quality_filter.py:72-80',alpha_words:'gopher_quality_filter.py:113-119',alpha_words_ws:'not in datatrove: the same rule with words split on whitespace',stop_words:'gopher_quality_filter.py:121-123',end_ellipsis_lines:'gopher_quality_filter.py:106-111',bullet_lines:'gopher_quality_filter.py:100-105',
    c4_sentences:'c4_filters.py:88-133',line_punct:'fineweb_quality_filter.py:34-40',short_lines:'fineweb_quality_filter.py:42-44',char_dup:'fineweb_quality_filter.py:46-49',list_ratio:'fineweb_quality_filter.py:51-54'};
  rs.innerHTML=RL.map((r,i)=>'<option value="'+i+'">'+esc(r.stage)+': '+esc(r.label)+'</option>').join('');rs.value=ri;
  const fv=(r,v)=>r.note==='integer'?String(Math.round(v)):(+v).toFixed(v<0.05&&v>0?4:2).replace(/0+$/,'').replace(/\.$/,'');
  function setRule(){const r=RL[ri];rt.max=r.grid.length-1;rt.value=r.grid.indexOf(r.dft);rule()}
  function rule(){
    const r=RL[ri],k=+rt.value,t=r.grid[k],di=r.grid.indexOf(r.dft);
    C.$('pip-rx-tv').textContent=(r.dir==='gt'?'drop if above ':'drop if below ')+fv(r,t);
    C.$('pip-rx-dft').textContent='(datatrove default '+fv(r,r.dft)+')';
    const st=(a,v,d)=>'<div class="stat"><div class="k">'+a+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
    const dm=r.marg[k]-r.marg[di];
    C.$('pip-rx-cnt').innerHTML=st('Dropped by this rule alone',n0(r.iso[k]),'of 6,971 English documents')+st('Dropped among docs passing all other rules',n0(r.marg[k]),'of '+n0(r.n_pass_others)+(k!==di?'; '+(dm>=0?'+':'')+n0(dm)+' against the default':''))+st('Of those, kept by FineWeb',n0(r.fw[k]),r.marg[k]?(100*r.fw[k]/r.marg[k]).toFixed(0)+'% of the chain drops':'');
    const el=C.$('pip-rx-hist'),W=C.width(el),H=150,L=8,R=8,Tp=8,B=26,iw=W-L-R,ih=H-Tp-B,lo=r.grid[0],hi=r.grid[r.grid.length-1];
    const ha=r.hist_all,ho=r.hist_others,mx=Math.sqrt(Math.max(...ha)),bw=iw/20;let s='';
    ha.forEach((v,i)=>{const x=L+i*bw,b1=ih*Math.sqrt(v)/mx,b2=ih*Math.sqrt(ho[i])/mx;
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+(Tp+ih-b1).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+b1.toFixed(1)+'" fill="var(--dim)"><title>'+n0(v)+' documents</title></rect>';
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+(Tp+ih-b2).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+b2.toFixed(1)+'" fill="var(--acc)"><title>'+n0(ho[i])+' passing all other rules</title></rect>'});
    const X=v=>L+(v-lo)/(hi-lo)*iw,tx=X(t);
    s+='<line x1="'+tx.toFixed(1)+'" x2="'+tx.toFixed(1)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--bad)" stroke-width="2"/>';
    if(k!==di)s+='<line x1="'+X(r.dft).toFixed(1)+'" x2="'+X(r.dft).toFixed(1)+'" y1="'+Tp+'" y2="'+(Tp+ih)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    s+=T(L,H-B+14,fv(r,lo),{fs:10,fill:'var(--mute)'})+T(L+iw,H-B+14,fv(r,hi)+(r.k==='n_words'||r.k==='c4_sentences'?' or more':''),{a:'end',fs:10,fill:'var(--mute)'})+T(L+iw/2,H-B+14,(r.dir==='gt'?'dropped to the right':'dropped to the left')+' of the red line',{a:'middle',fs:10,fill:'var(--mute)'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Histogram of the rule value">'+s+'</svg><div class="pip-leg"><span><i style="background:var(--dim)"></i>all 6,971 English documents</span><span><i style="background:var(--acc)"></i>those passing every other rule</span><span>bar height: square root of count</span></div>';
    C.$('pip-rx-src').innerHTML='Source: <span class="mono">datatrove/pipeline/filters/'+esc(SRC[r.k]||'')+'</span> (v0.10.1).';
    const E=(D.examples[r.k]||[]),fx=e=>'<div class="pip-ex"><div class="h"><b>'+fv(r,e.v)+'</b><span>'+esc(e.host)+'</span>'+(e.label?'<span class="pip-lb '+e.label+'">'+({R:'right',W:'wrong',U:'unclear'})[e.label]+'</span>':'')+(e.note?'<span>'+esc(e.note)+'</span>':'')+'</div><div class="tx">'+esc(e.t)+'</div></div>';
    const dr=E.filter(e=>e.side==='dropped'),kp=E.filter(e=>e.side==='kept');
    C.$('pip-rx-drop').innerHTML=dr.length?dr.map(fx).join(''):'<p class="pip-small">This rule fired first on no labelled document (another rule removed them earlier in the chain).</p>';
    C.$('pip-rx-keep').innerHTML=kp.map(fx).join('');
  }
  rs.addEventListener('change',()=>{ri=+rs.value;setRule()});rt.addEventListener('input',rule);
  C.onRender(()=>{lid();rule()});setRule();lid();
  // details and prediction answer
  const V=D.derived.variants_vs_fineweb,F=x=>RL.find(r=>r.k===x),aw=F('alpha_words'),ws=F('alpha_words_ws'),at=i=>i.grid.indexOf(i.dft),LS=D.label_summary;
  C.$('pip-rx-pred-ans').textContent='About 150: '+n0(V['char_dup_0.1'].extra_kept)+' more documents survive (2,692 becomes '+n0(2692+V['char_dup_0.1'].extra_kept)+', +'+(100*V['char_dup_0.1'].extra_kept/2692).toFixed(1)+'%). And none of them, 0 of '+n0(V['char_dup_0.1'].extra_kept)+', is in FineWeb, although FineWeb holds 2,404 of the 2,692 documents our default chain keeps (89%): if FineWeb had used 0.1, about 137 of them would be expected there. FineWeb\'s released data therefore agrees with the code\'s 0.01, not with the paper\'s 0.1. Of 8 documents this rule removed (labelled), '+LS.char_dup_ratio.W+' were coherent prose such as a concert article and a recipe whose one repeated heading was enough.';
  C.$('pip-rx-details').innerHTML='<div class="t">Five details that change the output, measured</div><ul class="tight">'+
    '<li><b>Duplicated-line characters, 0.01 (code) against 0.1 (paper).</b> The FineWeb paper says documents are removed when "the fraction of characters in duplicated lines is &gt;= 0.1" (section 3.6); datatrove\'s <span class="mono">FineWebQualityFilter</span> defaults to 0.01 (<span class="mono">fineweb_quality_filter.py:19</span>), already in v0.2.0. At 0.1 the chain keeps '+n0(V['char_dup_0.1'].extra_kept)+' more documents, none of them in FineWeb: the dataset was built with 0.01.</li>'+
    '<li><b>"Words" are spaCy tokens.</b> The Gopher rule "80% of words contain at least one alphabetic character" counts punctuation marks as words in datatrove (a sentence like "opens at 9 a.m., closes at 5 p.m.; members (and guests) may borrow up to 10 books, DVDs, or CDs." scores 0.66). Among documents passing every other rule, the rule drops '+n0(aw.marg[at(aw)])+'; with whitespace words it would drop '+n0(ws.marg[at(ws)])+'. It is the largest Gopher quality reason here ('+n0(D.run0.removed['4_gopher_qual'].reasons.gopher_below_alpha_threshold)+' first-fired drops), and '+LS.gopher_below_alpha_threshold.W+' of 8 labelled drops were wrong.</li>'+
    '<li><b>C4 needs 5 sentences in datatrove, 3 in the T5 paper.</b> With 3 the chain keeps '+n0(V.c4_min_sentences_3.extra_kept)+' more documents, '+V.c4_min_sentences_3.extra_in_fineweb+' of them in FineWeb: FineWeb used 5 (<span class="mono">c4_filters.py:66</span>).</li>'+
    '<li><b>C4\'s terminal-punctuation rule is off</b> in FineWeb (<span class="mono">examples/fineweb.py:57</span>; the paper: it "removes around 30% of all tokens"). Turning it on here loses '+n0(V.c4_terminal_punct.lost)+' kept documents, '+n0(V.c4_terminal_punct.lost_in_fineweb)+' of them in FineWeb, and gains '+n0(V.c4_terminal_punct.extra_kept)+' that the line edit rescues from later rules.</li>'+
    '<li><b>C4 rewrites the text before the FineWeb rules see it.</b> It deletes lines with fewer than 3 words, cookie-policy lines and javascript lines (<span class="mono">c4_filters.py:110-127, 135</span>). So FineWeb\'s "list ratio" check (more than 0.3 newlines per word) can almost never fire after it: it removed 0 documents here, and removing it changes nothing.</li></ul>';
  // ---------------- labels table
  const GN={gopher_below_alpha_threshold:'Gopher: too few words with a letter',gopher_short_doc:'Gopher: under 50 words',dup_line_frac:'Gopher: duplicate lines',top_4_gram:'Gopher: top 4-gram',duplicated_5_n_grams:'Gopher: repeated 5-grams',top_3_gram:'Gopher: top 3-gram',dup_line_char_frac:'Gopher: duplicate-line characters',top_2_gram:'Gopher: top 2-gram',duplicated_6_to_10_n_grams:'Gopher: repeated 6- to 10-grams',gopher_too_many_end_ellipsis:'Gopher: lines ending in ...',gopher_enough_stop_words:'Gopher: fewer than 2 stop words',gopher_too_many_bullets:'Gopher: bullet lines',gopher_above_avg_threshold:'Gopher: mean word length over 10',gopher_too_many_ellipsis:'Gopher: ellipses per word',too_few_sentences:'C4: fewer than 5 sentences',curly_bracket:'C4: curly bracket',lorem_ipsum:'C4: lorem ipsum',line_punct_ratio:'FineWeb: lines ending in punctuation',char_dup_ratio:'FineWeb: duplicated-line characters (0.01)',short_line_ratio:'FineWeb: short lines'};
  const rowsL=Object.entries(LS).filter(([g])=>g!=='kept').sort((a,b)=>b[1].n_in_group-a[1].n_in_group);
  C.$('pip-lab-t').innerHTML='<tr><th>Rule (first to fire)</th><th class="num">Removed</th><th class="num">Labelled</th><th class="num">Right</th><th class="num">Wrong</th><th class="num">Unclear</th></tr>'+
    rowsL.map(([g,s])=>{const n=s.R+s.W+s.U;return '<tr><td>'+esc(GN[g]||g)+'</td><td class="num">'+n0(s.n_in_group)+'</td><td class="num">'+n+'</td><td class="num">'+s.R+'</td><td class="num"'+(s.W>=n/3?' style="color:var(--bad);font-weight:600"':'')+'>'+s.W+'</td><td class="num">'+s.U+'</td></tr>'}).join('')+
    (()=>{const s=LS.kept;return '<tr><td><b>Kept by the whole chain</b> (24 drawn)</td><td class="num">'+n0(s.n_in_group)+'</td><td class="num">24</td><td class="num" colspan="3">worth keeping '+s.K+', junk '+s.J+', unclear '+s.U+'</td></tr>'})();
  let tR=0,tW=0,tU=0;rowsL.forEach(([g,s])=>{tR+=s.R;tW+=s.W;tU+=s.U});
  C.$('pip-lab-note').innerHTML='<div class="t">What the labels say</div><p>Over all '+(tR+tW+tU)+' labelled drops: '+tR+' right, '+tW+' wrong, '+tU+' unclear. The rules aimed at boilerplate (under 50 words, teasers ending in "...", lines without punctuation, top 2-grams) were right every time in the sample. The wrong drops cluster in four places: FineWeb\'s duplicated-line rule at 0.01 ('+LS.char_dup_ratio.W+' of 8), the Gopher bullet rule ('+LS.gopher_too_many_bullets.W+' of 8: informative lists such as a hiking-grade glossary), the Gopher letter rule with spaCy tokens ('+LS.gopher_below_alpha_threshold.W+' wrong and '+LS.gopher_below_alpha_threshold.U+' unclear of 8), and the C4 document rules that fire on one character ('+LS.curly_bracket.W+' of 8 curly-bracket drops were real prose such as API documentation and a developer diary; '+LS.lorem_ipsum.W+' of 6 lorem-ipsum drops were real articles with one leftover template block). The other side matters as much: '+LS.kept.J+' of 24 kept documents are junk (casino and cracked-software spam, product pages, boilerplate) that no rule here can see. That is the job of a model-based quality filter: see the {{Quality lab|#t-qual}}.</p>';
})();
