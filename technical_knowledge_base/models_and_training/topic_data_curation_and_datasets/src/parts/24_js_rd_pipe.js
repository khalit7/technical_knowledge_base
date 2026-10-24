// ---- Reading tab, section 3: a real Common Crawl page through the pipeline (rules computed live, verdicts and scores measured). The funnel bars were retired on 2026-10-24: the hero lists the counts, Extraction and filtering's hero draws them ----
(function(){
  const esc=RD.esc,P=window.RDP.page;
  const card=document.getElementById('rd-page-card');if(!card)return;
  const WET=P.wet_lines,KEEP={traf:P.keep_traf,res:P.keep_res};
  const TXT={traf:P.traf,res:P.res,wet:P.wet},NAME={traf:'trafilatura',res:'resiliparse',wet:'Common Crawl WET text'};
  const STOP=['the','be','to','of','and','that','have','with'];
  const PUNCT='.!?"\'”';
  // words as datatrove's tokenizer roughly splits them: punctuation marks count as words
  const toks=t=>t.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*|[^\s\p{L}\p{N}]/gu)||[];
  const linesOf=t=>t.split('\n').map(l=>l.replace(/ /g,' ').trim()).filter(Boolean);
  function rules(t){
    const lines=linesOf(t),w=toks(t),nw=w.length;
    const nonSym=w.filter(x=>/[\p{L}\p{N}]/u.test(x));
    const mean=nonSym.reduce((a,x)=>a+x.length,0)/Math.max(1,nonSym.length);
    const sym=(t.split('#').length-1+t.split('...').length-1+t.split('…').length-1)/Math.max(1,nw);
    const alpha=w.filter(x=>/\p{L}/u.test(x)).length/Math.max(1,nw);
    const stops=new Set(w.map(x=>x.toLowerCase()).filter(x=>STOP.includes(x))).size;
    const punct=lines.filter(l=>PUNCT.includes(l.slice(-1))).length/lines.length;
    const short=lines.filter(l=>l.length<=30).length/lines.length;
    const seen=new Set();let dup=0;lines.forEach(l=>{if(seen.has(l))dup+=l.length;else seen.add(l)});const dupR=dup/t.replace(/\n/g,'').length;
    return [
      ['Words (Gopher: 50 to 100,000)',nonSym.length,nonSym.length>=50&&nonSym.length<=100000,v=>v],
      ['Mean word length (3 to 10)',mean,mean>=3&&mean<=10,v=>v.toFixed(2)],
      ['Symbols per word (at most 0.1)',sym,sym<=0.1,v=>v.toFixed(3)],
      ['Words with a letter (Gopher: at least 0.8)',alpha,alpha>=0.8,v=>v.toFixed(3)],
      ['Stop words present (at least 2)',stops,stops>=2,v=>v],
      ['Lines ending in punctuation (FineWeb: drop if below 0.12)',punct,punct>=0.12,v=>v.toFixed(2)],
      ['Lines of 30 characters or fewer (FineWeb: drop if 0.67 or more)',short,short<0.67,v=>v.toFixed(2)],
      ['Characters in duplicated lines (datatrove default: drop above 0.01)',dupR,dupR<=0.01,v=>v.toFixed(3)]
    ];
  }
  // word 5-gram shingles, exact Jaccard, MinHash with 112 seeded hashes in 14 bands of 8
  function sh(t){const w=toks(t.toLowerCase()).filter(x=>/[\p{L}\p{N}]/u.test(x));const s=new Set();for(let i=0;i+5<=w.length;i++)s.add(w.slice(i,i+5).join(' '));return s}
  function fnv(str,seed){let h=(2166136261^seed)>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>15;h=Math.imul(h,0x2c1b3c6d)>>>0;h^=h>>>12;return h>>>0}
  function sig(S){const out=[];for(let k=0;k<112;k++){let m=4294967295;S.forEach(x=>{const v=fnv(x,k*0x9e3779b1);if(v<m)m=v});out.push(m)}return out}
  function compare(a,b){const A=sh(a),B=sh(b);let inter=0;A.forEach(x=>{if(B.has(x))inter++});const sa=sig(A),sb=sig(B);let eq=0,bands=0;
    for(let k=0;k<112;k++)if(sa[k]===sb[k])eq++;for(let i=0;i<14;i++){let ok=true;for(let r=0;r<8;r++)if(sa[i*8+r]!==sb[i*8+r])ok=false;if(ok)bands++}
    return {J:inter/(A.size+B.size-inter),est:eq/112,bands}}
  const PII=/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
  let mode='traf';
  const STEPS=['Raw WARC record','Extraction','URL filter','Language ID','Heuristic filters','Quality model','Deduplication','PII scrubbing','Result'];
  const cnt=document.getElementById('rd-page-cnt'),cap=document.getElementById('rd-page-cap'),view=document.getElementById('rd-page-view');
  const doc=(lines,mark)=>'<div class="rd-doc">'+lines.map(mark).join('\n')+'</div>';
  function draw(i){
    const txt=TXT[mode],R=rules(txt),fail=R.find(r=>!r[2]),V=P.verdict[mode],dead=V[0]!=='kept'&&i>4;
    let c,v='';
    if(i===0){c=['Raw WARC record','The HTTP response exactly as the server sent it: '+P.html_chars.toLocaleString('en-US')+' characters of HTML with '+P.html_tags+' tags, of which the first part is shown. The article is in there somewhere; nothing has been decided yet.'];
      v='<div class="rd-doc">'+esc(P.html_excerpt).replace(/&lt;(\/?[a-z!][^&]*?)&gt;/g,'<span class="tag">&lt;$1&gt;</span>')+' …</div>';}
    else if(i===1){const k=KEEP[mode];
      c=mode==='wet'?['Extraction: Common Crawl\'s WET text','WET keeps every visible string, one block per line: the title bar, the Tweet button, the archive links and a whole calendar widget, '+WET.filter((l,j)=>!KEEP.traf[j]).length+' of its '+WET.length+' lines.']:
        ['Extraction: '+NAME[mode],NAME[mode]+' keeps the '+k.filter(Boolean).length+' lines of the article and drops the other '+k.filter(x=>!x).length+' (struck through): title bar, share button, archive links and the calendar.'];
      v=doc(WET,(l,j)=>mode!=='wet'&&!KEEP[mode][j]?'<span class="x">'+esc(l)+'</span>':esc(l));}
    else if(i===2){c=['URL filter','The host is not on FineWeb\'s blocklist of adult domains, so the page goes on (datatrove\'s URLFilter removed 183 of the file\'s 20,463 pages).'];v=doc(linesOf(txt),esc);}
    else if(i===3){c=['Language ID','fastText lid.176 gives English '+P.lid[mode].toFixed(4)+' on this text, above FineWeb\'s 0.65 threshold (measured in the Pipeline lab).'];v=doc(linesOf(txt),esc);}
    else if(i===4){c=fail?['Heuristic filters: dropped','The page fails "'+fail[0]+'": the calendar\'s bare numbers and the punctuation tokens push the share of words containing a letter below 0.8. The article is fine; the extraction choice lost it. datatrove\'s own run gave the same verdict: removed by '+V[1]+'.']:
      ['Heuristic filters: passed','Every rule passes, the letters rule by a hair (0.801 against 0.8 with datatrove-style tokens). datatrove\'s own run kept it too. Switch to WET to see the same article fail.'];
      v='<div class="rd-checks">'+R.map(r=>'<div><span class="'+(r[2]?'ok':'no')+'">'+(r[2]?'pass':'FAIL')+'</span> '+esc(r[0])+': <b>'+r[3](r[1])+'</b></div>').join('')+'</div>';}
    else if(i===5){if(dead){c=['Quality model: never reached','Dropped at the heuristic filters, so no compute is spent scoring it.']}else{
      c=['Quality model: the two published classifiers disagree','FineWeb-Edu\'s classifier scores it '+P.edu_score.toFixed(2)+' (rounded to '+P.edu_int+'), so it is kept at threshold 3, and it is indeed in FineWeb-Edu (stored score '+P.fineweb_edu_stored_score+'). DCLM\'s fastText gives it a probability of '+P.dclm_p+' of looking like its reference set, below DCLM-baseline\'s cut-off of '+P.dclm_cut.toFixed(4)+': DCLM would drop it. A civic explainer reads as educational, not as instruction-style text.'];
      v='<div class="an-cnt">'+RD.stat('FineWeb-Edu classifier',P.edu_score.toFixed(3),'kept (3 or more after rounding)')+RD.stat('DCLM fastText',String(P.dclm_p),'dropped (cut-off '+P.dclm_cut.toFixed(4)+')')+'</div><p class="small mute">Scored on trafilatura\'s text by the Quality lab\'s scorers (resiliparse\'s text is nearly identical).</p>';}}
    else if(i===6){if(dead){c=['Deduplication: never reached','Dropped earlier.']}else{
      const o=Object.keys(TXT).filter(k=>k!==mode),cs=o.map(k=>[k,compare(txt,TXT[k])]);
      c=['Deduplication','MinHash inside this WARC file found no near copy of the page, and FineWeb\'s dedup over the whole crawl kept it too (it is in FineWeb). Below, the same machinery compares this text with the other two extractions of the same page: a real near-duplicate pair.'];
      v='<div class="rd-checks">'+cs.map(([k,r])=>'<div>Against '+esc(NAME[k])+': Jaccard <b>'+r.J.toFixed(2)+'</b>, MinHash estimate <b>'+r.est.toFixed(2)+'</b>, bands matching <b>'+r.bands+' of 14</b> ('+(r.bands?'a candidate pair':'not a candidate')+')</div>').join('')+'</div>';}}
    else if(i===7){if(dead){c=['PII scrubbing: never reached','Dropped earlier.']}else{const m=txt.match(PII)||[];
      c=['PII scrubbing',m.length?m.length+' email or IP address found and replaced.':'The email and IP-address patterns find nothing on this page, so the text is unchanged. The Pipeline lab shows what the patterns catch and miss on the whole file.'];v=doc(linesOf(txt),esc);}}
    else {c=dead?['Result: dropped','Lost at the Gopher rules because of how the text was extracted. Across the four WARC files of the running example, the pipeline on WET text kept 3,526 pages; on trafilatura\'s text, 10,955.']:
      ['Result: kept','A training document in FineWeb and FineWeb-Edu. It would not be in DCLM-baseline: same page, three corpora, two verdicts.'];v=dead?'':doc(linesOf(txt),esc);}
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+esc(c[0])+'</div><p>'+esc(c[1])+'</p>';
    view.innerHTML=v;
    const cur=i===0?P.html_excerpt:txt;
    const status=i<4?'in progress':(V[0]!=='kept'?'dropped (step 5)':(i===8?'kept':'passing'));
    cnt.innerHTML=RD.stat('Text',NAME[mode])+RD.stat(i===0?'HTML characters':'Characters',(i===0?P.html_chars:cur.length).toLocaleString('en-US'))+RD.stat('Words',i===0?'n/a':toks(cur).filter(x=>/[\p{L}\p{N}]/u.test(x)).length)+RD.stat('Lines',i===0?'n/a':linesOf(cur).length)+RD.stat('Status',status);
  }
  const A=RD.anim({card:'rd-page-card',ctl:'rd-page-ctl',n:STEPS.length,draw,ms:2800,label:'Pipeline step'});
  RD.seg(document.getElementById('rd-page-mode'),m=>{mode=m;A.redraw()});
})();
