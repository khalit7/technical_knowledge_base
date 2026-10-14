// ---- Pipeline lab: the funnel animation (three extractors, documents or characters) and the published comparison ----
(function(){
  const C=window.DCP,D=C.D;if(!D||!C.$('pip-fun-card'))return;
  const esc=C.esc,n0=C.n0,R0=D.run0;
  const COL={'1_url':'var(--mute)','1b_extract':'var(--dim)','2_lid':'var(--c6)','3_gopher_rep':'var(--c2)','4_gopher_qual':'var(--c5)','5_c4':'var(--c3)','6_fineweb_qual':'var(--closed)','7_minhash':'var(--ink)','8_pii':'var(--dim)'};
  const NAMES={'1_url':['URL filter','blocklists'],'1b_extract':['Text extraction','HTML to text'],'2_lid':['Language ID','lid.176, English > 0.65'],'3_gopher_rep':['Gopher repetition','repeated lines, n-grams'],'4_gopher_qual':['Gopher quality','length, words, stop words'],'5_c4':['C4 rules','sentences, braces, lorem ipsum'],'6_fineweb_qual':['FineWeb rules','punctuation, short and duplicate lines'],'7_minhash':['MinHash dedup','inside this file'],'8_pii':['PII scrubbing','edits text, removes nothing']};
  const ORDER=['1_url','1b_extract','2_lid','3_gopher_rep','4_gopher_qual','5_c4','6_fineweb_qual','7_minhash','8_pii'];
  const RN={dup_line_frac:'duplicate lines',top_4_gram:'top 4-gram',duplicated_5_n_grams:'repeated 5-grams',top_3_gram:'top 3-gram',dup_line_char_frac:'chars in duplicate lines',top_2_gram:'top 2-gram',dup_para_frac:'duplicate paragraphs',dup_para_char_frac:'chars in duplicate paragraphs',gopher_below_alpha_threshold:'too few words with a letter',gopher_short_doc:'under 50 words',gopher_too_many_end_ellipsis:'lines ending in ...',gopher_enough_stop_words:'fewer than 2 stop words',gopher_too_many_bullets:'bullet lines',too_few_sentences:'fewer than 5 sentences',curly_bracket:'curly bracket',lorem_ipsum:'lorem ipsum',line_punct_ratio:'few lines end in punctuation',char_dup_ratio:'duplicated-line characters',short_line_ratio:'mostly short lines',no_text:'no text returned',domain:'blocklisted domain',hard_blacklisted:'banned word in URL',blacklisted_subword:'banned substring',subdomain:'blocklisted host',soft_blacklisted:'two soft words'};
  const rn=r=>RN[r]||(r||'').replace(/^duplicated_(\d+)_n_grams$/,'repeated $1-grams').replace(/_/g,' ');
  let ext='traf',unit='docs';
  // stage table for the current extractor: [{key,in,out,reasons:[[name,n]]}]
  function stages(){
    const fe=D.funnel_ext[ext],rows=[];let cur=R0.url_kept;
    rows.push({key:'1_url',in:R0.html_read,out:R0.url_kept,reasons:Object.entries(D.url.reasons)});
    ORDER.slice(1,7).forEach(k=>{const n=fe.by_step[k]||0;const rs=Object.entries(fe.by_reason).filter(([kk])=>kk.split('|')[0]===k).map(([kk,v])=>[kk.split('|')[1],v]).sort((a,b)=>b[1]-a[1]);
      rows.push({key:k,in:cur,out:cur-n,reasons:rs});cur-=n});
    if(ext==='traf'){rows.push({key:'7_minhash',in:cur,out:R0.minhash,reasons:[['near-duplicate cluster',cur-R0.minhash]]});rows.push({key:'8_pii',in:R0.minhash,out:R0.pii,reasons:[]})}
    else{rows.push({key:'7_minhash',in:null,out:null,reasons:[]});rows.push({key:'8_pii',in:null,out:null,reasons:[]})}
    if(unit==='chars'){const ch=D.derived.chars_into_stage[ext];const html=D.extract_timing.resiliparse_html_mb*1e6;
      const m={'1b_extract':[html,ch.in_2_lid],'2_lid':[ch.in_2_lid,ch.in_3_gopher_rep],'3_gopher_rep':[ch.in_3_gopher_rep,ch.in_4_gopher_qual],'4_gopher_qual':[ch.in_4_gopher_qual,ch.in_5_c4],'5_c4':[ch.in_5_c4,ch.in_6_fineweb_qual],'6_fineweb_qual':[ch.in_6_fineweb_qual,ch.in_kept]};
      rows.forEach(r=>{const v=m[r.key];if(v){r.in=v[0];r.out=v[1];r.reasons=[]}else{r.in=null;r.out=null;r.reasons=[]}})}
    return rows;
  }
  const fmt=v=>v==null?'n/a':(unit==='chars'?(v>=1e9?(v/1e9).toFixed(2)+' G':(v/1e6).toFixed(1)+' M'):n0(v));
  const CAP={'1_url':'The cheapest check: the URL against 4.6 million blocklisted domains and three word lists. No page content is read.',
    '1b_extract':'The HTML becomes text. Pages where the extractor finds no main text leave here. Switch the extractor to see how much each one returns.',
    '2_lid':'fastText lid.176 scores the text; only documents with English probability above 0.65 go on. In a multilingual crawl this is the largest cut.',
    '3_gopher_rep':'Repetition rules from DeepMind\'s Gopher paper: too many repeated lines, paragraphs or n-grams, typical of menus, listings and spam.',
    '4_gopher_qual':'Gopher quality rules: length, mean word length, symbols, bullets, ellipses, words with a letter, and at least two English stop words.',
    '5_c4':'C4\'s rules (without its terminal-punctuation rule): drop short lines, cookie and javascript lines, then the page if fewer than 5 sentences remain, or any curly bracket or lorem ipsum.',
    '6_fineweb_qual':'FineWeb\'s own three rules: lines ending in punctuation, short lines, characters in duplicated lines.',
    '7_minhash':'MinHash with FineWeb\'s settings (5-grams, 14 bands of 8 hashes) finds near copies; one per cluster is kept. Inside one file there are few copies: see the Dedup lab.',
    '8_pii':'Email addresses and public IP addresses are replaced by placeholders. Nothing is removed; 101 documents are edited.'};
  const rowsEl=C.$('pip-fun-rows'),capEl=C.$('pip-fun-cap'),cntEl=C.$('pip-fun-cnt');
  function draw(i){
    const S=stages(),max=Math.max(...S.filter(r=>r.in!=null).map(r=>r.in));
    rowsEl.innerHTML=S.map((r,j)=>{
      if(r.in==null)return '<div class="pip-fr'+(j>i?' fut':'')+'"><span class="nm">'+esc(NAMES[r.key][0])+'<small>'+esc(NAMES[r.key][1])+'</small></span><span class="tr"></span><span class="v pip-small">n/a</span></div>';
      const shown=j<=i,kw=100*r.out/max,dw=100*(r.in-r.out)/max;
      const tip=r.reasons.slice(0,6).map(([a,b])=>rn(a)+': '+n0(b)).join('; ');
      return '<div class="pip-fr'+(j===i?' cur':'')+(j>i?' fut':'')+'"><span class="nm">'+esc(NAMES[r.key][0])+'<small>'+esc(NAMES[r.key][1])+'</small></span><span class="tr"><span class="k" style="width:'+(shown?kw:100*r.in/max).toFixed(2)+'%"></span><span class="d" title="'+esc(tip)+'" style="left:'+kw.toFixed(2)+'%;width:'+(shown?dw:0).toFixed(2)+'%;background:'+COL[r.key]+'"></span></span><span class="v">'+(shown?fmt(r.out):fmt(r.in))+'</span></div>'}).join('');
    const r=S[i];
    let extra='';
    if(r.in!=null&&r.reasons.length)extra=' Removed here: '+r.reasons.slice(0,3).map(([a,b])=>rn(a)+' '+n0(b)).join(', ')+'.';
    capEl.innerHTML='<div class="t">Stage '+(i+1)+' of '+S.length+': '+esc(NAMES[r.key][0])+'</div><p style="margin:2px 0">'+esc(CAP[r.key])+(r.in!=null?' In '+fmt(r.in)+', out '+fmt(r.out)+'.':' Not run on this path.')+esc(extra)+'</p>';
    const first=S.find(x=>x.in!=null),last=[...S.slice(0,i+1)].reverse().find(x=>x.out!=null);
    const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
    cntEl.innerHTML=st('Extractor',{traf:'trafilatura',res:'resiliparse',wet:'WET'}[ext])+st(unit==='chars'?'Characters now':'Documents now',last?fmt(last.out):'n/a')+
      st('Kept so far',last&&first?(100*last.out/first.in).toFixed(1)+'%':'n/a','of '+fmt(first.in)+(unit==='chars'?' HTML characters':' HTML pages'))+
      st('Removed at this stage',r.in!=null?fmt(r.in-r.out):'n/a');
  }
  const A=C.anim({card:'pip-fun-card',ctl:'pip-fun-ctl',n:9,draw,ms:2200,label:'Funnel stage'});
  C.seg(C.$('pip-fun-ext'),v=>{ext=v;A.redraw()});C.seg(C.$('pip-fun-unit'),v=>{unit=v;A.redraw()});
  C.$('pip-fun-leg').innerHTML='<span><i style="background:var(--acc)"></i>goes on</span>'+ORDER.map(k=>'<span><i style="background:'+COL[k]+'"></i>'+esc(NAMES[k][0])+'</span>').join('');
  // published comparison
  const tk=D.derived.gpt2_tokens,tv=Object.values(tk);
  const ours=(a,b)=>b/a;
  const rows=[
    {name:'Heuristic stage, documents: ours (LID plus all rules)',v:R0.fineweb/R0.extracted,color:'var(--acc)'},
    {name:'Heuristic stage, documents: Dolma 3 (85% removed, published)',v:0.15,color:'var(--c2)'},
    {name:'C4 and FineWeb rules, GPT-2 tokens: ours',v:ours(tv[0],tv[1]),color:'var(--acc)'},
    {name:'C4 and FineWeb rules, GPT-2 tokens: FineWeb (20T to 15T, published)',v:15/20,color:'var(--c2)'},
    {name:'MinHash, tokens: ours, one file',v:ours(tv[1],tv[2]),color:'var(--acc)'},
    {name:'MinHash, tokens: FineWeb, each whole crawl (36T to 20T, published)',v:20/36,color:'var(--c2)'},
    {name:'Exact plus MinHash dedup, documents: Dolma 3 (keeps 33% then 77%, published)',v:0.33*0.77,color:'var(--c2)'}];
  function cmp(){const el=C.$('pip-cmp');el.className='bars';C.bars(el,rows,1,v=>(100*v).toFixed(1)+'%')}
  C.onRender(cmp);cmp();
  C.$('pip-cmp-note').textContent='Ours: measured here on one WARC, 2026-10-14 (GPT-2 tokens '+n0(tv[0])+' after the Gopher rules, '+n0(tv[1])+' after the C4 and FineWeb rules, '+n0(tv[2])+' after MinHash). FineWeb: paper section 3 (36T base filtered, about 20T after per-crawl MinHash, 15T final; FineWeb applies MinHash before the C4 and custom rules, we after). Dolma 3: the dolma3 pool README (heuristics remove 85% of documents, exact dedup 67% of the rest, MinHash 23%). The heuristic shares agree closely (14.0% against 15%) if Dolma\'s heuristic stage, like ours, includes language ID (its README lists lid.176 English >= 0.65 among the steps); the dedup bars differ because one file has almost no copies of itself.';
})();
// ---- Pipeline lab: the same measurements on four WARC files (widening) ----
(function(){
  const C=window.DCP,D=C.D,el=C.$('pip-wide');if(!el)return;
  const W=D.wide;if(!W){el.hidden=true;return}
  const t=W.total,n0=C.n0,f=Object.keys(W.files).length,pc=(a,b)=>b?(100*a/b).toFixed(1)+'%':'n/a';
  const row=(x,nm)=>'<tr><td>'+nm+'</td><td class="num">'+n0(t[x+'|kept']||0)+'</td><td class="num">'+n0(t[x+'|kept_in_fineweb']||0)+'</td><td class="num">'+pc(t[x+'|kept_in_fineweb']||0,t[x+'|kept_fwfiles']||0)+'</td></tr>';
  const v=k=>'<tr><td>'+k[1]+'</td><td class="num">+'+n0(t['var|'+k[0]+'|extra']||0)+'</td><td class="num">'+n0(t['var|'+k[0]+'|extra_in_fineweb']||0)+' of '+n0(t['var|'+k[0]+'|extra_fwfiles']||0)+'</td><td class="num">-'+n0(t['var|'+k[0]+'|lost']||0)+'</td><td class="num">'+n0(t['var|'+k[0]+'|lost_in_fineweb']||0)+' of '+n0(t['var|'+k[0]+'|lost_fwfiles']||0)+'</td></tr>';
  el.innerHTML='<div class="t" style="font-weight:600;font-size:14px">The same measurements on '+f+' WARC files ('+n0(t.html_pages)+' HTML pages)</div>'+
    '<p class="pip-small" style="margin-top:2px">Files 00000 to 0000'+(f-1)+' of the same segment, FineWeb\'s own rows ('+n0(t.fineweb_rows)+', for '+t.files_with_fineweb+' of the '+f+' files) joined by WARC-Record-ID; FineWeb shares count only files with FineWeb rows. trafilatura without the 1 s timeout here (see section 3). Measured 2026-10-14.</p>'+
    '<div class="tw"><table class="pip-t"><tr><th>Extraction</th><th class="num">Kept by the filters</th><th class="num">Also in FineWeb</th><th class="num">Share</th></tr>'+row('traf','trafilatura')+row('res','resiliparse')+row('wet','Common Crawl WET')+'</table></div>'+
    '<div class="tw"><table class="pip-t"><tr><th>Change to the chain (trafilatura text)</th><th class="num">Gained</th><th class="num">of which in FineWeb</th><th class="num">Lost</th><th class="num">of which in FineWeb</th></tr>'+
    [['char_dup_0.1','Duplicated-line characters 0.1 (paper) instead of 0.01'],['c4_min_sentences_3','C4 minimum 3 sentences (T5 paper) instead of 5'],['c4_terminal_punct','C4 terminal-punctuation rule on']].map(v).join('')+'</table></div>';
})();
