// ---- Pipeline lab: URL filter bars, the same page through three extractors (animated), extraction aggregates ----
(function(){
  const C=window.DCP,D=C.D;if(!D||!C.$('pip-ex-card'))return;
  const esc=C.esc,n0=C.n0;
  const SN={'1b_extract':'extraction','2_lid':'language ID','3_gopher_rep':'Gopher repetition','4_gopher_qual':'Gopher quality','5_c4':'C4 rules','6_fineweb_qual':'FineWeb rules'};
  const RN={gopher_below_alpha_threshold:'too few words with a letter',line_punct_ratio:'too few lines end in punctuation',char_dup_ratio:'duplicated-line characters',short_line_ratio:'mostly short lines',gopher_short_doc:'under 50 words',top_4_gram:'top 4-gram',top_3_gram:'top 3-gram',dup_line_frac:'duplicate lines',no_text:'no text returned',too_few_sentences:'fewer than 5 sentences',curly_bracket:'curly bracket'};
  const verdict=o=>o[0]==='kept'?'kept':'dropped at '+(SN[o[0]]||o[0])+(o[1]&&o[1]!=='n/a'?' ('+(RN[o[1]]||o[1].replace(/_/g,' '))+')':'');
  // URL filter
  const U=D.url,RNU={domain:'blocklisted domain',hard_blacklisted:'banned word in URL',blacklisted_subword:'banned substring',subdomain:'blocklisted host name',soft_blacklisted:'two soft words'};
  function url(){
    C.bars(C.$('pip-url-bars'),Object.entries(U.reasons).map(([k,v])=>({name:RNU[k]||k,v,color:'var(--c4)'})),110,v=>n0(v));
    const lb=U.labels;C.bars(C.$('pip-url-lab'),[{name:'right drop (adult or spam)',v:lb.R||0,color:'var(--good)'},{name:'wrong drop',v:lb.W||0,color:'var(--bad)'},{name:'unclear',v:lb.U||0,color:'var(--mute)'}],77,v=>n0(v));
  }
  C.$('pip-url-wrong').innerHTML='The '+U.wrong.length+' wrong drops, all from the hard word list: '+U.wrong.map(w=>esc(w.what)+' ('+esc(w.host)+')').join('; ')+'. RefinedWeb\'s authors made the same observation about blocklists: they "include many false positives, such as popular blogging platforms or even pop culture websites" and "word-based rules (like the one used in C4) can easily result in medical and legal pages being blocked" (RefinedWeb paper, arXiv 2306.01116, section 3.1).';
  // extraction pages
  const PG=D.pages,sel=C.$('pip-ex-page');let pi=0;
  sel.innerHTML=PG.map((p,i)=>'<option value="'+i+'">'+esc(p.host)+': '+esc(p.title)+'</option>').join('');
  const STEPS=['Raw HTML in the WARC','Common Crawl\'s WET text','trafilatura against WET','trafilatura\'s output','resiliparse against WET','resiliparse\'s output','Side by side'];
  const view=C.$('pip-ex-view'),cap=C.$('pip-ex-cap'),cnt=C.$('pip-ex-cnt');
  const st=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div>'+(d?'<div class="d">'+d+'</div>':'')+'</div>';
  const lines=t=>t.split('\n').filter(l=>l.trim()).map(l=>'<div class="pip-ln">'+esc(l)+'</div>').join('');
  const pct=x=>x==null?'n/a':(100*x).toFixed(0)+'%';
  function side(p,x){const s=p[x];return st(({wet:'WET',traf:'trafilatura',res:'resiliparse'})[x]+' characters',n0(s.chars),s.lines+' lines')+st('English (lid.176)',s.en==null?'n/a':s.en.toFixed(2),s.top?'top label '+s.top:'')+st('Lines ending in . ! ? quotes',pct(s.punct_lines))+st('Filter chain',verdict(s.out))}
  function draw(i){
    const p=PG[pi];let c='',v='',k='';
    if(i===0){c='The WARC stores the server\'s response as it was: '+n0(p.html_chars)+' characters of HTML with '+n0(p.html_tags)+' tags (scripts and styles are removed from this excerpt). Nothing has been decided yet.';
      v='<div class="pip-html">'+esc(p.html_excerpt).replace(/&lt;(\/?[a-zA-Z!][^&]*?)&gt;/g,'<span>&lt;$1&gt;</span>').replace(/&lt;/g,'&lt;')+'</div>';k=st('HTML characters',n0(p.html_chars))+st('Tags',n0(p.html_tags));}
    else if(i===1){c='WET keeps every visible string, one block per line: navigation, widgets and footers included. Verdict of the same filters on this text: '+verdict(p.wet.out)+'.';v='<div class="pip-doc">'+lines(p.wet.text)+'</div>';k=side(p,'wet');}
    else if(i===2||i===4){const x=i===2?'traf':'res',kp=p.keep[x],nk=kp.filter(z=>z).length;
      c=(x==='traf'?'trafilatura':'resiliparse')+' keeps '+nk+' of the '+kp.length+' WET lines (struck lines were dropped as boilerplate or not found).';
      v='<div class="pip-doc">'+p.wet_lines.map((l,j)=>'<div class="pip-ln'+(kp[j]?'':' x')+'">'+esc(l)+'</div>').join('')+'</div>';k=side(p,x);}
    else if(i===3||i===5){const x=i===3?'traf':'res',s=p[x];
      c='The output exactly as '+(x==='traf'?'trafilatura':'resiliparse')+' returns it, with its own line breaks (they matter: three FineWeb rules count lines). Verdict: '+verdict(s.out)+'.';
      v=s.text.trim()?'<div class="pip-doc">'+lines(s.text)+'</div>':'<p class="pip-small">No text returned.</p>';k=side(p,x);}
    else{c='Same page, three texts, three verdicts. Extraction decides what the filters see, so it decides what is kept.';
      v='<div class="tw"><table class="pip-t"><tr><th></th><th class="num">Characters</th><th class="num">Lines</th><th class="num">English</th><th class="num">Lines ending in punctuation</th><th>Filter chain</th></tr>'+['wet','traf','res'].map(x=>{const s=p[x];return '<tr><td>'+({wet:'WET',traf:'trafilatura',res:'resiliparse'})[x]+'</td><td class="num">'+n0(s.chars)+'</td><td class="num">'+s.lines+'</td><td class="num">'+(s.en==null?'n/a':s.en.toFixed(2))+'</td><td class="num">'+pct(s.punct_lines)+'</td><td>'+esc(verdict(s.out))+'</td></tr>'}).join('')+'</table></div>';
      k=st('Page',esc(p.host));}
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+esc(STEPS[i])+'</div><p style="margin:2px 0">'+esc(c)+'</p>';view.innerHTML=v;cnt.innerHTML=k;
  }
  const A=C.anim({card:'pip-ex-card',ctl:'pip-ex-ctl',n:STEPS.length,draw,ms:3200,label:'Extraction step'});
  sel.addEventListener('change',()=>{pi=+sel.value;A.go(0)});
  // aggregates
  const PE=D.derived.per_extractor,NM={traf:'trafilatura',res:'resiliparse',wet:'WET'};
  function agg(){
    C.bars(C.$('pip-ex-agg'),['traf','res','wet'].map(x=>({name:NM[x]+': median characters',v:PE[x].chars_median,color:'var(--c1)'})).concat(['traf','res','wet'].map(x=>({name:NM[x]+': English docs kept by the filters',v:PE[x].kept,color:'var(--good)'}))),Math.max(PE.wet.chars_median,PE.traf.kept),v=>n0(v));
    const S=D.derived.struct_english,T=D.derived.tex_visible;
    C.$('pip-ex-struct').innerHTML='<div class="tw"><table class="pip-t"><tr><th>Element (English pages)</th><th class="num">Pages</th><th class="num">trafilatura</th><th class="num">resiliparse</th><th class="num">WET</th></tr>'+
      ['table','code'].map(k=>'<tr><td>'+(k==='table'?'Words inside &lt;table&gt;':'Words inside &lt;pre&gt; or &lt;code&gt;')+'</td><td class="num">'+n0(S[k].traf.pages)+'</td>'+['traf','res','wet'].map(x=>'<td class="num">'+(100*S[k][x].mean_recall).toFixed(0)+'%</td>').join('')+'</tr>').join('')+
      '<tr><td>TeX source visible on the page (pages that keep it)</td><td class="num">'+T.pages+'</td><td class="num">'+T.traf+'</td><td class="num">'+T.res+'</td><td class="num">'+T.pages+'</td></tr></table></div>';
  }
  C.onRender(()=>{url();agg()});url();agg();
  const tm=D.timing,ex=D.extract_timing,rc=D.derived.traf_recovered,ts=D.derived.traf_status;
  C.$('pip-ex-agg-note').textContent='All 20,280 pages that passed the URL filter. Empty: trafilatura '+n0(PE.traf.empty)+' (run0, including 199 timeouts), resiliparse '+n0(PE.res.empty)+', WET '+n0(PE.wet.empty)+'. Of the documents each path keeps, '+n0(PE.traf.kept_in_fineweb)+', '+n0(PE.res.kept_in_fineweb)+' and '+n0(PE.wet.kept_in_fineweb)+' are also in FineWeb (which used trafilatura).';
  C.$('pip-ex-struct-note').textContent='Share of the words inside each element type that appear anywhere in the extractor\'s output (recall only: a table flattened into one line still counts as kept). Pages whose WET text is English with probability above 0.5. Main-content extractors drop about half of table text: often navigation tables, but also data tables like the railway page above. Maths written as TeX is almost always lost.';
  C.$('pip-ex-pred-ans').textContent='Far fewer: '+n0(PE.wet.kept)+' against '+n0(PE.traf.kept)+' with trafilatura and '+n0(PE.res.kept)+' with resiliparse. WET keeps more text, but the extra text is menus and widgets, which make the repetition and line rules fire ('+n0(D.funnel_ext.wet.by_step['3_gopher_rep'])+' repetition drops against '+n0(D.funnel_ext.traf.by_step['3_gopher_rep'])+'; '+n0(D.funnel_ext.wet.by_step['6_fineweb_qual'])+' FineWeb-rule drops against '+n0(D.funnel_ext.traf.by_step['6_fineweb_qual'])+'). This is the mechanism behind FineWeb\'s published finding that WET text trains worse models.';
  C.$('pip-ex-time').innerHTML='<div class="t">Cost: how long extraction takes (rough timing)</div><p>On the same 500 random pages, one core, low priority, load average about '+Math.round(tm.load_avg_1min)+' (another topic\'s jobs): trafilatura '+tm.trafilatura_mb_per_s+' MB of HTML per second, resiliparse '+tm.resiliparse_mb_per_s+' MB/s, '+tm.speedup+' times faster. DCLM published 0.56 against 4.55 MB/s per core (8.1 times; DCLM Table 16, different settings and machine), so the ratio, not the absolute speed, is what transfers. At crawl scale the gap is the difference between a CPU budget of days and of weeks. trafilatura\'s median page took '+tm.trafilatura_p50_ms+' ms here and its slowest 1% over '+tm.trafilatura_p99_ms+' ms.</p><p><b>Timeouts are a measurement trap.</b> datatrove runs trafilatura in a sandboxed subprocess with a 1 s wall-clock limit per page (<span class="mono">pipeline/extractors/trafilatura.py:26</span>). In run0, on a loaded machine, '+199+' pages hit it. Re-run without the limit, '+n0(ts.rerun_text)+' of the '+n0(ts.rerun_text+ts.rerun_empty)+' pages that returned nothing produced text; '+rc.kept+' of them pass every filter and '+rc.kept_in_fineweb+' of those are in FineWeb. So a busy machine silently changes the dataset: the timeout makes the output depend on load.</p>';
})();
