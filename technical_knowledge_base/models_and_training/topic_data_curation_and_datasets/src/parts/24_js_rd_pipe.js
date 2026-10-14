// ---- Reading tab, section 3: one illustrative page through the pipeline (rules computed live) and FineWeb's funnel ----
(function(){
  const esc=RD.esc;
  // FineWeb funnel (paper, GPT-2 tokens, 96 crawls)
  const ff=document.getElementById('rd-fw-funnel');
  if(ff)RD.bars(ff,[['Base filtered',36,0],['After MinHash inside each crawl',20,0],['FineWeb (C4 and FineWeb rules)',15,1],['FineWeb-Edu (score 3 or more)',1.3,0,'var(--c3)']],36,v=>v+'T');

  const card=document.getElementById('rd-page-card');if(!card)return;
  // the illustrative page: [text, kept by the main-content extractor]
  const LINES=[['Skip to main content',0],['Home',0],['Catalogue',0],['Events',0],['Kids and teens',0],['Research help',0],['Visit us',0],['Log in',0],
  ['We use cookies to improve your experience. Accept all | Manage',0],
  ['Renew your library card',1],['Updated 3 March 2025',1],
  ['Your library card lasts three years. You can renew it online, by phone or at any branch before or after it expires, and you keep the same card number and borrowing history.',1],
  ['To renew online, sign in to your account, open the Card details page and choose Renew. You will need the email address and the postcode we have on file. If either has changed, update them first, because the renewal confirmation is sent by email.',1],
  ['If your card expired more than a year ago, please visit a branch with proof of address. Staff can renew it while you wait, and any holds you placed before it expired are kept.',1],
  ['Questions? Email [email removed] or ask at the front desk.',1],
  ['Share',0],['Facebook',0],['X',0],['Print',0],['Opening hours',0],['Accessibility',0],['Privacy notice',0],['Site map',0],['© 2025 Riverside City Libraries',0]];
  // the same article on a mirror site, for the dedup step
  const MIRROR=['Renew your library card','Updated 9 April 2025',LINES[11][0],LINES[12][0],LINES[13][0],'Questions? Call the help line or ask at the front desk.'].join('\n');
  const HTML='<!doctype html><html lang="en"><head><title>Renew your library card | Riverside City Libraries</title>\x3c!-- analytics script and stylesheet links --\x3e</head><body><a class="skip" href="#main">Skip to main content</a><header><nav><ul>'+
    ['Home','Catalogue','Events','Kids and teens','Research help','Visit us','Log in'].map(t=>'<li><a href="/'+t.toLowerCase().replace(/ /g,'-')+'">'+t+'</a></li>').join('')+'</ul></nav></header><div id="cookie-banner" role="dialog">We use cookies to improve your experience. <button>Accept all</button> | <button>Manage</button></div><main id="main"><article><h1>Renew your library card</h1><p class="meta">Updated 3 March 2025</p>'+
    [11,12,13,14].map(i=>'<p>'+LINES[i][0].replace('[email removed]','<a href="mailto:[email removed]">[email removed]</a>')+'</p>').join('')+'</article></main><aside class="share"><span>Share</span><a href="#">Facebook</a><a href="#">X</a><a href="#">Print</a></aside><footer><ul><li>Opening hours</li><li>Accessibility</li><li>Privacy notice</li><li>Site map</li></ul><p>&copy; 2025 Riverside City Libraries</p></footer></body></html>';
  const STOP=['the','be','to','of','and','that','have','with'];
  const PUNCT='.!?"\'”';
  function textOf(mode){return LINES.filter(l=>mode==='wet'||l[1]).map(l=>l[0])}
  function words(t){return t.split(/\s+/).filter(w=>w.length)}
  // rule values, thresholds as in the FineWeb paper and datatrove's GopherQualityFilter defaults
  function rules(lines){
    const t=lines.join('\n'),w=words(t),nw=w.length,isP=s=>/^[^\w]+$/.test(s);
    const nonSym=w.filter(x=>!isP(x));
    const mean=nonSym.reduce((a,x)=>a+x.length,0)/Math.max(1,nonSym.length);
    const sym=(t.split('#').length-1+t.split('...').length-1)/Math.max(1,nw);
    const alpha=w.filter(x=>/[a-zA-Z]/.test(x)).length/Math.max(1,nw);
    const stops=new Set(w.map(x=>x.toLowerCase().replace(/[^a-z]/g,'')).filter(x=>STOP.includes(x))).size;
    const punct=lines.filter(l=>PUNCT.includes(l.trim().slice(-1))).length/lines.length;
    const short=lines.filter(l=>l.length<=30).length/lines.length;
    const seen=new Set();let dup=0;lines.forEach(l=>{if(seen.has(l))dup+=l.length;else seen.add(l)});const dupR=dup/t.replace(/\n/g,'').length;
    return [
      ['Words (Gopher: 50 to 100,000)',nonSym.length,nonSym.length>=50&&nonSym.length<=100000,v=>v],
      ['Mean word length (3 to 10)',mean,mean>=3&&mean<=10,v=>v.toFixed(2)],
      ['Symbols per word (at most 0.1)',sym,sym<=0.1,v=>v.toFixed(3)],
      ['Words with a letter (at least 0.8)',alpha,alpha>=0.8,v=>v.toFixed(2)],
      ['Stop words present (at least 2)',stops,stops>=2,v=>v],
      ['Lines ending in punctuation (FineWeb: drop if below 0.12)',punct,punct>=0.12,v=>v.toFixed(2)],
      ['Lines of 30 characters or fewer (FineWeb: drop if 0.67 or more)',short,short<0.67,v=>v.toFixed(2)],
      ['Characters in duplicated lines (FineWeb: drop if 0.1 or more)',dupR,dupR<0.1,v=>v.toFixed(2)]
    ];
  }
  // word 5-gram shingles, exact Jaccard, and MinHash with 112 seeded hashes in 14 bands of 8
  function sh(t){const w=words(t.toLowerCase().replace(/[^a-z0-9@. \n]/g,' '));const s=new Set();for(let i=0;i+5<=w.length;i++)s.add(w.slice(i,i+5).join(' '));return s}
  function fnv(str,seed){let h=(2166136261^seed)>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}h^=h>>>15;h=Math.imul(h,0x2c1b3c6d)>>>0;h^=h>>>12;return h>>>0}
  function sig(S){const out=[];for(let k=0;k<112;k++){let m=4294967295;S.forEach(x=>{const v=fnv(x,k*0x9e3779b1);if(v<m)m=v});out.push(m)}return out}
  const pii=t=>t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'email@example.com');
  let mode='ext';
  const STEPS=['Raw WARC record','Extraction','URL filter','Language ID','Heuristic filters','Quality model','Deduplication','PII scrubbing','Result'];
  function state(){
    const lines=textOf(mode),R=rules(lines),fail=R.find(r=>!r[2]);
    return {lines,R,fail};
  }
  const cnt=document.getElementById('rd-page-cnt'),cap=document.getElementById('rd-page-cap'),view=document.getElementById('rd-page-view');
  function doc(lines,mark){return '<div class="rd-doc">'+lines.map(mark).join('\n')+'</div>'}
  function draw(i){
    const S=state(),dead=S.fail&&i>4;
    const txt=S.lines.join('\n');
    let c='',v='';
    if(i===0){c=['Raw WARC record','A WARC file stores the HTTP response exactly as the server sent it: markup, scripts, menus and the article together. Nothing has been decided yet.'];
      v='<div class="rd-doc">'+esc(HTML).replace(/&lt;(\/?[a-z!][^&]*?)&gt;/g,'<span class="tag">&lt;$1&gt;</span>')+'</div>';}
    else if(i===1){c=mode==='ext'?['Extraction: main content only','The extractor keeps the article\'s title, date and paragraphs and drops the menu, cookie banner, share buttons and footer (struck through). This is what trafilatura or resiliparse aim to do.']:['Extraction: Common Crawl\'s WET text','WET text keeps every visible string on the page, one block per line: '+LINES.filter(l=>!l[1]).length+' of its '+LINES.length+' lines are the menu, the cookie banner, share buttons and footer links.'];
      v=doc(LINES.map(l=>l),l=>mode==='ext'&&!l[1]?'<span class="x">'+esc(l[0])+'</span>':esc(l[0]));}
    else if(i===2){c=['URL filter','The domain is checked against a blocklist of adult and spam domains before any text is read. Not listed, so the page goes on.'];v=doc(S.lines,esc);}
    else if(i===3){c=['Language ID','A fastText language classifier scores the text: English with probability 0.96 (illustrative score), above FineWeb\'s 0.65 threshold. Pages on the boundary are often short or mixed-language; the Pipeline lab shows real ones.'];v=doc(S.lines,esc);}
    else if(i===4){c=S.fail?['Heuristic filters: dropped','The page fails "'+S.fail[0]+'": the menu and footer lines make it look like a list of links. The article was fine; the extraction choice lost it.']:['Heuristic filters: passed','Every rule passes on the extracted text. The same rules on the WET version fail on short lines: switch the toggle above to see it.'];
      v='<div class="rd-checks">'+S.R.map(r=>'<div><span class="'+(r[2]?'ok':'no')+'">'+(r[2]?'pass':'FAIL')+'</span> '+esc(r[0])+': <b>'+r[3](r[1])+'</b></div>').join('')+'</div>';}
    else if(i===5){c=dead?['Quality model: never reached','The page was dropped at the heuristic filters, so no compute is spent scoring it.']:['Quality model','A classifier gives the document a score; corpora keep a top slice (section 5). This step needs a real model, so it is left to the Quality lab.'];
      v=dead?'':'<span class="rd-todo">TODO(qual): the FineWeb-Edu classifier score and the DCLM fastText score of the Pipeline lab\'s real page, from the Quality lab\'s outputs.</span>';}
    else if(i===6){if(dead){c=['Deduplication: never reached','Dropped earlier.'];v='';}else{
      const A=sh(txt),B=sh(MIRROR);let inter=0;A.forEach(x=>{if(B.has(x))inter++});const J=inter/(A.size+B.size-inter);
      const sa=sig(A),sb=sig(B);let eq=0;for(let k=0;k<112;k++)if(sa[k]===sb[k])eq++;
      const bands=[];for(let b=0;b<14;b++){let ok=true;for(let r=0;r<8;r++)if(sa[b*8+r]!==sb[b*8+r])ok=false;bands.push(ok)}
      const hit=bands.some(x=>x);
      c=['Deduplication: a near copy on a mirror site',(hit?'At least one of the 14 bands matches in all 8 hashes, so the two pages become a candidate pair and one is removed.':'No band matches fully, so the pair is not found and both stay.')+' Section 4 explains the bands.'];
      v='<div class="rd-checks"><div>Word 5-grams: <b>'+A.size+'</b> and <b>'+B.size+'</b>, shared <b>'+inter+'</b></div><div>Exact Jaccard similarity: <b>'+J.toFixed(2)+'</b></div><div>MinHash estimate (equal hashes of 112): <b>'+(eq/112).toFixed(2)+'</b></div><div>Bands matching fully: <b>'+bands.filter(x=>x).length+' of 14</b></div></div>'+
        '<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">'+bands.map((b,k)=>'<span title="band '+(k+1)+'" style="width:18px;height:14px;border-radius:2px;background:'+(b?'var(--c3)':'var(--dim)')+'"></span>').join('')+'</div>';}}
    else if(i===7){if(dead){c=['PII scrubbing: never reached','Dropped earlier.'];v='';}else{c=['PII scrubbing','A regular expression finds the email address and replaces it with a placeholder. An organisation\'s help address is not personal data, but the regex cannot tell; this is the usual trade-off of cheap scrubbing.'];
      v=doc(S.lines,l=>esc(l).replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,'<span class="x">$1</span> <span class="p">email@example.com</span>'));}}
    else {c=dead?['Result: dropped','Lost at the heuristic filters because of how the text was extracted. Multiply by billions of pages: this is why extraction is one of the largest published effects.']:['Result: kept','A training document of '+words(pii(txt)).length+' words, with the boilerplate gone and the email replaced, unless the mirror copy was kept instead.'];
      v=dead?'':doc(pii(txt).split('\n'),esc);}
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS.length+': '+esc(c[0])+'</div><p>'+esc(c[1])+'</p>';
    view.innerHTML=v;
    const cur=i===0?HTML:(i>=7&&!dead?pii(txt):txt);
    const status=i<4?'in progress':(S.fail&&i>=4?'dropped (step 5)':(i===8?'kept':'passing'));
    cnt.innerHTML=RD.stat('Mode',mode==='ext'?'extractor':'WET text')+RD.stat(i===0?'Bytes of HTML':'Characters',cur.length.toLocaleString())+RD.stat('Words',i===0?'n/a':words(cur).length)+RD.stat('Lines',i===0?'n/a':S.lines.length)+RD.stat('Status',status);
  }
  const A=RD.anim({card:'rd-page-card',ctl:'rd-page-ctl',n:STEPS.length,draw,ms:2600,label:'Pipeline step'});
  RD.seg(document.getElementById('rd-page-mode'),m=>{mode=m;A.redraw()});
})();
